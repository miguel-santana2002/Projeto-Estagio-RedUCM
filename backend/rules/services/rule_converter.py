import os
import re
import requests
import yaml
import json

from sigma.collection import SigmaCollection
from sigma.exceptions import SigmaError

# Backends pySigma
from sigma.backends.splunk import SplunkBackend
from sigma.backends.kusto import KustoBackend
from sigma.backends.elasticsearch import LuceneBackend, EqlBackend
from sigma.backends.QRadarAQL import QRadarAQLBackend

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
MODEL_NAME = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:3b")


def extract_yaml_from_response(raw_text: str) -> str:
    """Extrai blocos YAML, remove wrappers markdown residuais e sanitiza asteriscos soltos."""
    # 1. Tenta capturar conteúdo dentro de blocos de código markdown (```yaml ... ``` ou ``` ...)
    match = re.search(r"```(?:ya?ml)?\s*\n?(.*?)\n?```", raw_text, re.DOTALL | re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()
    else:
        # Se o modelo abriu ```yaml mas não fechou com ```, remove as marcações residuais
        cleaned = re.sub(r"^```(?:ya?ml)?\s*", "", raw_text.strip(), flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    # 2. Sanitiza wildcards sem aspas que quebram o parser YAML ('sourceip: *' -> 'sourceip: "*"')
    cleaned = re.sub(r'(:\s+)\*(?=\s*($|\n))', r'\1"*"', cleaned)

    return cleaned.strip()

def decompile_to_sigma(source_query: str, source_syntax: str) -> str:
    prompt = get_decompilation_prompt(source_query, source_syntax)

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "format":"json",
        "stream": False,
        "keep_alive": "1h",
        "options": {
            "num_predict": 120,
            "num_ctx": 512,
            "temperature": 0.0,
        },
    }

    try:
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=60)
        response.raise_for_status()
        raw_json = response.json().get("response", "").strip()
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Erro de comunicação com o Ollama: {str(e)}")

    try:
        # Carrega o JSON garantido do LLM diretamente para um dicionário Python
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"O modelo não devolveu um JSON válido: {str(e)}\nOutput bruto: {raw_json}")

    if not isinstance(parsed, dict) or "detection" not in parsed:
        raise ValueError("Estrutura Sigma incompleta gerada pelo LLM.")

    parsed["status"] = "experimental"
    
    # 1. Garante que a condition está dentro do bloco detection
    if "condition" in parsed and "condition" not in parsed["detection"]:
        parsed["detection"]["condition"] = parsed.pop("condition")
        
    # 2. Defesa contra condições alucinadas (ex: 'AND', 'all of them')
    if "detection" in parsed:
        # Extrai os nomes dos blocos reais gerados (exclui a própria chave 'condition')
        det_keys = [k for k in parsed["detection"].keys() if k != "condition"]
        
        if det_keys:
            # Se o modelo gerou "selection", forçamos a condition a apontar para "selection"
            # Se ele chamou o bloco de outra coisa (ex: "filter"), apontamos para esse.
            valid_identifier = "selection" if "selection" in det_keys else det_keys[0]
            parsed["detection"]["condition"] = valid_identifier
        else:
            raise ValueError("O LLM não gerou nenhum bloco de seleção dentro da detection.")

    return yaml.dump(parsed, sort_keys=False, allow_unicode=True)

def enrich_with_aggregations(source_query: str, source_syntax: str, compiled_base: str, target_syntax: str) -> str:
    """Anexa pipes de agregação com injeção dinâmica de contexto alvo."""
    agg_keywords = ["group by", "count(", "stats ", "summarize", "order by", "sort ", "select "]
    if not any(kw in source_query.lower() for kw in agg_keywords):
        return compiled_base

    # Isolamento de sintaxe: O LLM só vê a regra da linguagem final pedida
    if "SPL" in target_syntax:
        rules = "Use '| stats count by field'. Sort descending: '| sort - field'. NEVER use 'summarize'."
    elif "KQL" in target_syntax:
        rules = "Use '| summarize count() by field'. Sort descending: '| order by field desc'."
    else:
        rules = "Append necessary grouping and sorting pipes."

    prompt = f"""Output ONLY raw {target_syntax} query code. No explanations.
Source: {source_query}
Base filter: {compiled_base}
Rules: {rules}
Task: Append aggregation/sorting pipes to the Base filter."""

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "keep_alive": "1h",
        "options": {
            "num_predict": 50, # Reduzido (o output esperado é apenas 1 linha)
            "num_ctx": 256,    # Reduz carga na VRAM
            "temperature": 0.0,
        },
    }

    try:
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=20)
        if response.status_code == 200:
            result = response.json().get("response", "").strip()
            
            clean_result = re.sub(r"^```(?:[a-zA-Z]+)?\s*|\s*```$", "", result, flags=re.MULTILINE).strip()
            clean_result = re.sub(r"^(?:Here is[^\n:]*:?|Result:?|Final query:?)\s*", "", clean_result, flags=re.IGNORECASE).strip()

            lines = [line.strip() for line in clean_result.splitlines() if line.strip()]
            for line in lines:
                base_token = compiled_base.strip().split()[0] if compiled_base.strip() else ""
                if (base_token and base_token in line) or line.startswith("|"):
                    idx = lines.index(line)
                    return "\n".join(lines[idx:])

            if clean_result:
                return clean_result
    except Exception:
        pass

    return compiled_base


def compile_sigma_to_target(sigma_yaml: str, target_syntax: str) -> str:
    try:
        parsed = yaml.safe_load(sigma_yaml)
        if not isinstance(parsed, dict):
            raise ValueError("O conteúdo não é um YAML Sigma válido (deve conter campos como 'title', 'logsource' e 'detection').")

        collection = SigmaCollection.from_dicts([parsed])

    except Exception as e:
        raise ValueError(f"Falha ao validar a regra no motor pySigma: {str(e)}")

    match target_syntax:
        case "SPL (Splunk)":
            backend = SplunkBackend()
        case "KQL (Sentinel)":
            backend = KustoBackend()
        case "AQL (QRadar)":
            backend = QRadarAQLBackend()
        case "Elastic Lucene Rule":
            backend = LuceneBackend()
        case "EQL (Elastic)":
            backend = EqlBackend()
        case "Sigma Rule":
            return sigma_yaml
        case _:
            raise ValueError(f"Sintaxe de destino '{target_syntax}' não suportada.")

    try:
        result = backend.convert(collection)
        target_query = "\n".join(result) if isinstance(result, list) else str(result)

        if target_syntax == "KQL (Sentinel)":
            clean_query = target_query.strip()
            if not clean_query.startswith(("SecurityEvent", "Device", "CommonSecurityLog", "SigninLogs", "AuditLogs")):
                if clean_query.startswith("| where"):
                    target_query = f"DeviceProcessEvents\n{clean_query}"
                elif clean_query.startswith("|"):
                    target_query = f"DeviceProcessEvents\n{clean_query}"
                else:
                    target_query = f"DeviceProcessEvents\n| where {clean_query}"

        return target_query
    except SigmaError as e:
        raise RuntimeError(f"Erro de compilação pySigma ({target_syntax}): {str(e)}")


def convert_rule_pipeline(source_query: str, source_syntax: str, target_syntax: str) -> dict:
    if not source_query:
        raise ValueError("A query original está vazia.")

    # CENÁRIO 1: A Origem é Sigma.
    # BYPASS TOTAL AO LLM. Usa apenas o pySigma para conversão instantânea e determinística.
    if source_syntax == "Sigma Rule":
        final_query = compile_sigma_to_target(source_query, target_syntax)
        return {
            "sigma_rule": source_query,
            "target_query": final_query,
        }

    # CENÁRIO 2: SIEM para SIEM (ex: AQL -> SPL). 
    # Bypass ao pySigma. Usa apenas tradução direta via LLM.
    if target_syntax in ["SPL (Splunk)", "KQL (Sentinel)", "AQL (QRadar)", "EQL (Elastic)"]:
        final_query = direct_llm_translation(source_query, source_syntax, target_syntax)
        return {
            "sigma_rule": "N/A - Conversão direta via LLM (Agregações detetadas)",
            "target_query": final_query,
        }

    # CENÁRIO 3: SIEM para Sigma (ex: AQL -> Sigma).
    # Usa LLM para extrair o JSON/YAML, seguido de compilação de limpeza no pySigma.
    sigma_rule = decompile_to_sigma(source_query, source_syntax)
    
    # O target_syntax aqui será obrigatoriamente "Sigma Rule" (retorna o próprio yaml formatado)
    final_query = compile_sigma_to_target(sigma_rule, target_syntax)

    return {
        "sigma_rule": sigma_rule,
        "target_query": final_query,
    }

def get_decompilation_prompt(source_query: str, source_syntax: str) -> str:
    """Prompt microscópico para poupar tokens e forçar extração restrita."""
    return f"""You are a strict SIEM engineer. Convert to Sigma JSON.
CRITICAL: Output ONLY valid JSON.
- Extract ONLY explicit filter conditions (e.g., WHERE clause).
- NEVER include fields from SELECT, GROUP BY, or ORDER BY.
- DO NOT invent wildcards or nested dictionaries.

Expected Format:
{{
  "title": "Generated Title",
  "status": "experimental",
  "logsource": {{"category": "network_traffic"}},
  "detection": {{
    "selection": {{"field_name": "exact_value"}},
    "condition": "selection"
  }}
}}

Query ({source_syntax}):
{source_query}
"""

def direct_llm_translation(source_query: str, source_syntax: str, target_syntax: str) -> str:
    prompt = f"""Task: Translate the following {source_syntax} query into a production-ready {target_syntax} query.

CRITICAL INSTRUCTIONS:
- The data table already exists (assume it is named 'events'). DO NOT declare it.
- DO NOT use 'datatable', 'let mock', or generate any sample data.
- Output ONLY the query string starting directly with the table name or base command. No markdown, no comments.

Original Query ({source_syntax}):
{source_query}

Translation ({target_syntax}):"""

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "keep_alive": "1h",
        "options": {
            "num_predict": 150, 
            "temperature": 0.0,
            "num_ctx": 512
        }
    }
    
    try:
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json().get("response", "").strip()
        
        # Limpa os blocos de markdown caso o modelo insista em enviá-los
        clean_result = re.sub(r"^```(?:[a-zA-Z]+)?\s*|\s*```$", "", result, flags=re.MULTILINE).strip()
        
        # Última linha de defesa (Hardcode): Se ele ainda assim alucinar o datatable, cortamos a string
        if "datatable" in clean_result and "];" in clean_result:
            clean_result = clean_result.split("];")[-1].strip()
            # Remove o "let filteredEvents = events" ou semelhante e deixa só o pipe
            clean_result = re.sub(r"^let\s+[a-zA-Z_]+\s*=\s*[a-zA-Z_]+\s*\|?", "events\n|", clean_result).strip()

        return clean_result

    except Exception as e:
        return f"Erro na tradução direta via LLM: {str(e)}"
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
from sigma.backends.elasticsearch import EqlBackend

from .aql_backend import AQLBackend

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
    """Anexa pipes de agregação e limiares temporais ao filtro base compilado."""
    agg_keywords = [
        "group by", "group-by", "count(", "stats ", "summarize", 
        "order by", "sort ", "select ", "correlation:", "timespan:"
    ]
    if not any(kw in source_query.lower() for kw in agg_keywords):
        return compiled_base

    # Regras específicas com base na sintaxe de destino
    if "SPL" in target_syntax:
        rules = (
            "Append '| stats count by <field> | where count >= <threshold>'. "
            "Never replace or omit the base filter. No markdown, no commentary."
        )
    elif "KQL" in target_syntax:
        rules = (
            "Append '| summarize count() by <field> | where count_ >= <threshold>'. "
            "Never replace or omit the base filter. No markdown, no commentary."
        )
    else:
        rules = "Append necessary grouping, threshold, and sorting pipes to the base filter."

    prompt = f"""You are a detection engineer.
Base search: {compiled_base}
Rule context / Aggregation requirement:
{source_query}

Task: Output the complete {target_syntax} query.
Rule: Start with '{compiled_base}' and append the correct aggregation/threshold pipes (e.g. stats count, where count >= N).
Rules: {rules}
Output ONLY the raw final query code on a single line or piped lines."""

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "keep_alive": "1h",
        "options": {
            "num_predict": 100,
            "num_ctx": 512,
            "temperature": 0.0,
        },
    }

    try:
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=20)
        if response.status_code == 200:
            result = response.json().get("response", "").strip()
            
            # Limpeza de markdown
            clean_result = re.sub(r"^```(?:[a-zA-Z]+)?\s*|\s*```$", "", result, flags=re.MULTILINE).strip()
            clean_result = re.sub(r"^(?:Here is[^\n:]*:?|Result:?|Final query:?)\s*", "", clean_result, flags=re.IGNORECASE).strip()

            # Se o modelo devolveu apenas os pipes (começa com |), junta com o filtro base
            if clean_result.startswith("|"):
                return f"{compiled_base} {clean_result}"

            # Se o modelo omitiu o filtro base mas gerou pipes dentro das linhas
            if compiled_base not in clean_result and "|" in clean_result:
                pipe_part = clean_result[clean_result.index("|"):]
                return f"{compiled_base} {pipe_part}"

            if clean_result:
                return clean_result
    except Exception:
        pass

    return compiled_base


def compile_sigma_to_target(sigma_yaml: str, target_syntax: str) -> str:
    # 1. Sanitização de múltiplos documentos '---' ou lixo residual
    cleaned_yaml = sigma_yaml.strip()
    
    # Se houver delimitadores múltiplos '---', isola o primeiro bloco não vazio que contenha a estrutura Sigma
    if "---" in cleaned_yaml:
        docs = [d.strip() for d in cleaned_yaml.split("---") if d.strip()]
        # Procura o bloco que realmente contenha a secção de deteção
        target_doc = next((d for d in docs if "detection" in d or "logsource" in d), docs[0] if docs else cleaned_yaml)
        cleaned_yaml = target_doc

    try:
        # Usa o parser nativo do pySigma diretamente sobre a string sanitizada
        collection = SigmaCollection.from_yaml(cleaned_yaml)
    except Exception:
        # Fallback via safe_load_all para garantir compatibilidade se houver streams
        try:
            parsed_docs = [doc for doc in yaml.safe_load_all(cleaned_yaml) if isinstance(doc, dict)]
            if not parsed_docs:
                raise ValueError("O conteúdo não é um YAML Sigma válido.")
            collection = SigmaCollection.from_dicts(parsed_docs)
        except Exception as e:
            raise ValueError(f"Falha ao validar a regra no motor pySigma: {str(e)}")

    match target_syntax:
        case "SPL (Splunk)":
            backend = SplunkBackend()
        case "KQL (Sentinel)":
            backend = KustoBackend()
        case "EQL (Elastic)":
            backend = EqlBackend()
        case "AQL (QRadar)":
            backend = AQLBackend()
        case "Sigma Rule":
            return cleaned_yaml
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

def extract_structured_conditions(sigma_yaml: str) -> str:
    """Usa o parser determinístico do pySigma para extrair campos/valores/condição,
    evitando reescrever a regra Sigma via LLM antes da tradução final."""
    collection = SigmaCollection.from_yaml(sigma_yaml)
    rule = collection.rules[0]

    lines = [f"Rule: {rule.title}"]
    for name, det in rule.detection.detections.items():
        lines.append(f"Block [{name}]:")
        for item in det.detection_items:
            field = item.field or "(keyword match)"
            mods = [m.__name__ for m in item.modifiers] if item.modifiers else []
            lines.append(f"  field={field} modifiers={mods} value={item.value}")
    lines.append(f"Condition: {rule.detection.condition[0]}")
    return "\n".join(lines)

def convert_rule_pipeline(source_query: str, source_syntax: str, target_syntax: str) -> dict:
    if not source_query:
        raise ValueError("A query original está vazia.")

    LLM_ONLY_TARGETS = ["CQL (CrowdStrike)"]

    # 1. Alvos exclusivos via LLM (ex: CQL)
    if target_syntax in LLM_ONLY_TARGETS:
        if source_syntax == "Sigma Rule":
            structured_input = extract_structured_conditions(source_query)
            final_query = direct_llm_translation(structured_input, "Sigma (structured)", target_syntax)
        else:
            final_query = direct_llm_translation(source_query, source_syntax, target_syntax)

        return {
            "sigma_rule": source_query if source_syntax == "Sigma Rule" else "N/A - Tradução direta via LLM",
            "target_query": final_query,
            "engine": "llm",
        }

    # 2. CENÁRIO 1: Origem Sigma -> Target determinístico (pySigma ou Híbrido se tiver correlação)
    if source_syntax == "Sigma Rule":
        final_query = compile_sigma_to_target(source_query, target_syntax)
        engine_used = "pysigma"

        if "correlation:" in source_query:
            final_query = enrich_with_aggregations(
                source_query=source_query,
                source_syntax="Sigma Correlation",
                compiled_base=final_query,
                target_syntax=target_syntax
            )
            engine_used = "hybrid"

        return {
            "sigma_rule": source_query,
            "target_query": final_query,
            "engine": engine_used,
        }

    # 3. CENÁRIO 2: SIEM para SIEM direto via LLM
    if target_syntax in ["SPL (Splunk)", "KQL (Sentinel)", "EQL (Elastic)", "AQL (QRadar)"]:
        final_query = direct_llm_translation(source_query, source_syntax, target_syntax)
        return {
            "sigma_rule": "N/A - Conversão direta via LLM (Agregações detetadas)",
            "target_query": final_query,
            "engine": "llm",
        }

    # 4. CENÁRIO 3: SIEM -> Descompilação para Sigma (LLM) + Compilação pySigma (Híbrido)
    sigma_rule = decompile_to_sigma(source_query, source_syntax)
    
    if target_syntax == "Sigma Rule":
        final_query = sigma_rule
        engine_used = "llm"
    else:
        final_query = compile_sigma_to_target(sigma_rule, target_syntax)
        engine_used = "hybrid"

    return {
        "sigma_rule": sigma_rule,
        "target_query": final_query,
        "engine": engine_used,
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
    # Definição estrita com Few-Shot Learning para evitar repetição de SQL
    if "CQL" in target_syntax:
        system_instruction = (
            "Target: CrowdStrike Falcon LogScale Query Language (LQL/CQL).\n"
            "STRICT RULES:\n"
            "1. Output ONLY filters and pipes. NEVER use SQL ('SELECT', 'FROM', 'WHERE').\n"
            "2. Format filters as: field=\"value\" or field=number.\n"
            "3. Combine multiple conditions with spaces or 'AND'.\n"
            "\n"
            "Example 1:\n"
            "Input: SELECT * FROM events WHERE destinationip = '10.0.0.1' AND sourceport = 80\n"
            "Output: destinationip=\"10.0.0.1\" sourceport=80\n"
            "\n"
            "Example 2:\n"
            "Input: EventID=4625 LogonType=3\n"
            "Output: EventID=4625 LogonType=3\n"    
        )
    elif "KQL" in target_syntax:
        system_instruction = "Target: Microsoft Sentinel KQL. Format: SecurityEvent | where EventID == 4625"
    elif "SPL" in target_syntax:
        system_instruction = "Target: Splunk SPL. Format: index=* EventID=4625"
    elif "AQL" in target_syntax:
        system_instruction = (
            "Target: IBM QRadar AQL (Ariel Query Language).\n"
            "STRICT RULES:\n"
            "1. Always use the form: SELECT * FROM events WHERE <conditions> LAST 24 HOURS\n"
            "2. Translate EVERY field/value pair listed in the input — never skip one, "
            "even if there are multiple blocks.\n"
            "3. Use quotes around field names with spaces: \"Process Name\"\n"
            "4. Modifier 'endswith' -> field ILIKE '%value'; 'contains' -> field ILIKE '%value%'; "
            "'startswith' -> field ILIKE 'value%'.\n"
            "5. Combine multiple blocks/conditions per the given Condition line, using AND/OR accordingly.\n"
            "6. NEVER invent field names not present in the input.\n"
            "7. Preserve the value string EXACTLY as given, including leading/trailing "
            "backslashes, dots, or slashes — these are often significant path separators "
            "and must not be dropped or altered.\n"
            "\n"
            "Example:\n"
            "Input:\n"
            "Block [selection]:\n"
            "  field=Image modifiers=['endswith'] value=['\\\\whoami.exe']\n"
            "Condition: selection\n"
            "Output: SELECT * FROM events WHERE \"Image\" ILIKE '%\\\\whoami.exe' LAST 24 HOURS\n"
        )
    else:
        system_instruction = f"Target: {target_syntax}"

    prompt = f"""You are a cybersecurity SIEM engineer translating queries.
{system_instruction}

Original Query ({source_syntax}):
{source_query}

Output ONLY the translated query string without any markdown, code blocks, or explanations:"""

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "keep_alive": "1h",
        "options": {
            "num_predict": 80,
            "temperature": 0.0,
            "num_ctx": 512,
        },
    }

    try:
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=30)
        response.raise_for_status()

        result = response.json().get("response", "").strip()

        # Limpeza de markdown e textos introdutórios
        clean_result = re.sub(r"^```(?:[a-zA-Z]+)?\s*|\s*```$", "", result, flags=re.MULTILINE).strip()
        clean_result = re.sub(r"^(?:Output:?|Translation:?|Result:?|Final query:?)\s*", "", clean_result, flags=re.IGNORECASE).strip()

        # Higienização de segurança para CQL: se o LLM ainda assim começar com SELECT/FROM, extrai apenas o WHERE
        if "CQL" in target_syntax and ("select " in clean_result.lower() or "from " in clean_result.lower()):
            where_match = re.search(r"where\s+(.+)$", clean_result, re.IGNORECASE | re.DOTALL)
            if where_match:
                where_clause = where_match.group(1).strip()
                # Converte 'field = value' -> 'field="value"'
                clean_result = re.sub(r"(\w+)\s*=\s*['\"]?([^'\"\s]+)['\"]?", r'\1="\2"', where_clause)
                clean_result = re.sub(r"\s+and\s+", " ", clean_result, flags=re.IGNORECASE)

        return clean_result

    except Exception as e:
        return f"Erro na tradução direta para {target_syntax}: {str(e)}"
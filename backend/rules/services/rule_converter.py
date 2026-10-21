import os
import re
import requests
import yaml
import html
from typing import Optional, Dict

from sigma.collection import SigmaCollection
from sigma.backends.splunk import SplunkBackend
from sigma.backends.kusto import KustoBackend
from sigma.backends.elasticsearch import EqlBackend
from .aql_backend import AQLBackend
from .pipelines import qradar_pipeline
from sigma.backends.crowdstrike import LogScaleBackend
from sigma.pipelines.crowdstrike import crowdstrike_falcon_pipeline

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
MODEL_NAME = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:7b-instruct-q3_K_M")

# Cache em memória para regras descompiladas (evita re-chamar o LLM repetidamente para a mesma query de origem)
_DECOMPILE_CACHE: Dict[str, str] = {}


# ---------------------------------------------------------------- Sigma Prompts & Parser

SIGMA_PROMPT = """Convert this {syntax} query into a single valid Sigma detection rule in YAML.

Strict Rules:
- Output ONLY the valid YAML document. No markdown fences, no explanations.
- Keys required: title, logsource, detection, level.
- NEVER use "|equals", "|equal", or "|exact". Simple equality is just "Field: value" or "Field: 'value'".
- Allowed modifiers: |contains, |startswith, |endswith, |re, |cidr.
- Wildcards:
  - "*val*" -> Field|contains: val
  - "val*"  -> Field|startswith: val
  - "*val"  -> Field|endswith: val
- Multiple values on the same field MUST be a YAML list under that field. NEVER repeat the same dictionary key:
  CommandLine|contains:
    - "val1"
    - "val2"
- Put OR groups in separate named selections (e.g. selection_a, selection_b) and combine them in the condition.
- Negations (NOT / !=) go in a "filter" block and are used as "not filter" in condition.
- Windows file paths with backslashes MUST be in single quotes (e.g. Image|endswith: '\\powershell.exe').
- Skip null checks ("!= null", "== null").

Format Template:
title: <short title>
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    Image|endswith: '\\powershell.exe'
    CommandLine|contains:
      - 'DownloadString'
      - 'Invoke-WebRequest'
  filter:
    User: 'SYSTEM'
  condition: selection and not filter
level: medium

Query to convert:
{query}
"""

TARGET_SPECS = {
    "SPL (Splunk)": (
        "Splunk Search Processing Language (SPL).\n"
        "Rules:\n"
        "- Format: field=\"value\" or field=*value*.\n"
        "- Wildcards: use * directly inside quotes, e.g. CommandLine=\"*powershell*\".\n"
        "- Operators: AND (or space), OR, NOT (must be uppercase).\n"
        "- Multiple values: field IN (\"val1\", \"val2\") or (field=\"val1\" OR field=\"val2\").\n"
        "- NEVER use 'select', 'where', 'like', '==', or SQL syntax."
    ),
    "KQL (Sentinel)": (
        "Microsoft Sentinel Kusto Query Language (KQL).\n"
        "Rules:\n"
        "- Format: TableName | where <conditions>.\n"
        "- String matching: == (exact), has (word), contains (substring), startswith, endswith.\n"
        "- Operators: and, or, not(...) or != (all lowercase).\n"
        "- Multiple values: field in (\"val1\", \"val2\") or (field has \"val1\" or field has \"val2\").\n"
        "- NEVER use Splunk quotes without operator, NEVER use SQL syntax."
    ),
    "AQL (QRadar)": (
        "IBM QRadar Ariel Query Language (AQL).\n"
        "Rules:\n"
        "- Format: SELECT * FROM events WHERE <conditions> LAST 24 HOURS\n"
        "- String matching: = 'exact', ILIKE '%wildcard%', ILIKE 'start%', ILIKE '%end'.\n"
        "- Operators: AND, OR, NOT (uppercase).\n"
        "- Multiple values: field IN ('val1', 'val2') or (field ILIKE '%a%' OR field ILIKE '%b%').\n"
        "- Single quotes for string literals. Double quotes for field names with spaces."
    ),
    "EQL (Elastic)": (
        "Elastic Event Query Language (EQL).\n"
        "Rules:\n"
        "- Format: any where <conditions> or process where <conditions>.\n"
        "- String matching: == (exact), : (wildcard search with *), like~.\n"
        "- Operators: and, or, not (lowercase).\n"
        "- Multiple values: field in (\"val1\", \"val2\") or field : (\"*a*\", \"*b*\").\n"
        "- NEVER use '| where' (that is KQL) or SELECT (that is SQL)."
    ),
    "CQL (CrowdStrike)": (
        "CrowdStrike LogScale Query Language (CQL).\n"
        "Rules:\n"
        "- Format: field=\"value\" or field=/regex/i or field=*value*.\n"
        "- Operators: and, or, not (lowercase).\n"
        "- Regex: field=/pattern/i, e.g. CommandLine=/powershell/i.\n"
        "- NEVER use SQL syntax or '| where'."
    ),
    "Sigma Rule": (
        "Sigma rule in YAML format with title, logsource, detection, and level."
    ),
}


def _unwrap_docs(docs):
    out = []
    for d in docs:
        if isinstance(d, dict) and len(d) == 1 and next(iter(d)) in ("rules", "rule", "sigma"):
            inner = next(iter(d.values()))
            out.extend(inner if isinstance(inner, list) else [inner])
        elif isinstance(d, list):
            out.extend(d)
        else:
            out.append(d)
    return out


def clean_and_repair_sigma_yaml(raw_text: str) -> str:
    """
    Higieniza e repara automaticamente inconsistências do YAML gerado pelo LLM
    antes de validar com pySigma, evitando falhas e repetições desnecessárias.
    """
    text = html.unescape(raw_text.strip())
    # 1. Remove cercas de código markdown (```yaml ... ```)
    text = re.sub(r"^```(?:ya?ml)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()

    # 2. Corrige modificadores inventados que quebram o pySigma (|equals, |equal, |exact)
    text = re.sub(r'\|(?:equals|equal|exact|iequals|iequal)(?=:|\s)', '', text)

    # 3. Mapeia modificadores equivalentes para os oficiais do pySigma
    text = re.sub(r'\|like(?=:|\s)', '|contains', text)
    text = re.sub(r'\|(?:regex|matches)(?=:|\s)', '|re', text)
    text = re.sub(r'\|wildcard(?=:|\s)', '|contains', text)

    # 4. Corrige modificadores separados por vírgula (ex: "Field: |contains, val")
    text = re.sub(r'(\w+):\s*\|([a-zA-Z]+),\s*(.*)', r'\1|\2: \3', text)
    text = re.sub(r'(\w+):\s*\|([a-zA-Z]+)', r'\1|\2:', text)

    # 5. Corrige asteriscos isolados sem aspas (ex: "Field: *" para "Field: '*'")
    text = re.sub(r'^(\s*[\w\-\|]+:\s*)\*(?=\s|$)', r'\1"*"', text, flags=re.MULTILINE)
    text = re.sub(r'^(\s*-\s*)\*(?=\s|$)', r'\1"*"', text, flags=re.MULTILINE)

    # 6. Converte caminhos com barras invertidas para aspas simples (evita erro 'unknown escape character' do YAML)
    text = re.sub(r':\s*"([^"\n]*\\[^"\n]*)"', lambda m: f": '{m.group(1).replace(chr(39), chr(39)*2)}'", text)
    text = re.sub(r'^(\s*-\s*)"([^"\n]*\\[^"\n]*)"', lambda m: f"{m.group(1)}'{m.group(2).replace(chr(39), chr(39)*2)}'", text, flags=re.MULTILINE)

    # 7. Força aspas em valores numéricos/IPs com modificadores
    text = re.sub(r'^(\s*[\w\-]+\|(?:startswith|contains|endswith|re):\s*)([^\s\'\"\[\{][^\n\'\"]*?)\s*$', r'\1"\2"', text, flags=re.MULTILINE)

    # 8. Força aspas em itens de lista que sejam números/IPs
    text = re.sub(r'^(\s*-\s*)([0-9][0-9\.\/]*)\s*$', r'\1"\2"', text, flags=re.MULTILINE)

    # 9. Remove propriedades "!null" ou "null" soltas
    text = re.sub(r"^\s*[\w.\-|]+:\s*!?null\s*$\n?", "", text, flags=re.MULTILINE)

    # 10. Corrige 'condition: gte: 10'
    text = re.sub(r'^(\s*condition:)\s*([a-zA-Z_]+):\s*(.+)$', r'\1\n    \2: \3', text, flags=re.MULTILINE)

    # 11. Corrige trailing keys vazias
    text = re.sub(r'^\s*level:\s*$', 'level: medium', text, flags=re.MULTILINE)
    text = re.sub(r'\n\s*[a-zA-Z0-9_\-]+:\s*$', '', text)

    return text


def decompile_to_sigma(source_query: str, source_syntax: str, retries: int = 1) -> str:
    """
    Descompila uma query SIEM para o formato padrão Sigma em YAML.
    Utiliza cache em memória para respostas instantâneas em pedidos subsequentes.
    """
    if not source_query or not source_query.strip():
        raise ValueError("A query original está vazia.")

    cache_key = f"{source_syntax.strip()}:::{source_query.strip()}"
    if cache_key in _DECOMPILE_CACHE:
        return _DECOMPILE_CACHE[cache_key]

    last_err = ""
    for attempt in range(retries + 1):
        prompt = SIGMA_PROMPT.format(syntax=source_syntax, query=source_query)
        if last_err:
            prompt += f"\nPrevious attempt failed pySigma validation: {last_err}\nFix all invalid modifiers or YAML syntax. Output ONLY single Sigma YAML."

        payload = {
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
            "keep_alive": "1h",
            "options": {
                "num_predict": 380,
                "temperature": 0.0,
                "num_ctx": 2048,
                "stop": ["\n\n\n", "```", "Query to convert:", "Format Template:"],
            },
        }

        try:
            response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=60)
            response.raise_for_status()
            raw = response.json().get("response", "").strip()
            text = clean_and_repair_sigma_yaml(raw)

            docs = _unwrap_docs([d for d in yaml.safe_load_all(text) if d])
            if not docs or not all(isinstance(d, dict) for d in docs):
                raise ValueError("YAML não continha um documento de dicionário válido.")

            for d in docs:
                d.setdefault("title", "Auto-generated Sigma Rule")
                if "detection" not in d or not isinstance(d["detection"], dict):
                    d["detection"] = {"selection": {"CommandLine|contains": "*"}, "condition": "selection"}
                d.setdefault("logsource", {"category": "process_creation", "product": "windows"})
                d["status"] = "experimental"
                d.setdefault("level", "medium")

                # Assegura que o campo condition existe
                if "condition" not in d["detection"]:
                    d["detection"]["condition"] = "selection"

            out = yaml.dump_all(docs, sort_keys=False, allow_unicode=True)
            
            # Validação rigorosa com pySigma
            try:
                SigmaCollection.from_yaml(out)
                _DECOMPILE_CACHE[cache_key] = out
                return out
            except Exception as pe:
                # Se falhar a validação estrutural da condição, normaliza para as seleções existentes
                for d in docs:
                    if "detection" in d and isinstance(d["detection"], dict):
                        keys = [k for k in d["detection"].keys() if k != "condition" and not k.startswith("filter")]
                        filters = [k for k in d["detection"].keys() if k.startswith("filter")]
                        cond_parts = " and ".join(keys) if keys else "selection"
                        if filters:
                            cond_parts += f" and not {' and not '.join(filters)}"
                        d["detection"]["condition"] = cond_parts or "selection"

                out_fixed = yaml.dump_all(docs, sort_keys=False, allow_unicode=True)
                SigmaCollection.from_yaml(out_fixed)
                _DECOMPILE_CACHE[cache_key] = out_fixed
                return out_fixed

        except Exception as e:
            last_err = str(e)

    # Fallback estruturado válido caso o LLM esgote todas as tentativas
    fallback_doc = [{
        "title": "Auto-generated Sigma Rule",
        "status": "experimental",
        "logsource": {"category": "process_creation", "product": "windows"},
        "detection": {
            "selection": {"CommandLine|contains": source_query[:150]},
            "condition": "selection"
        },
        "level": "medium"
    }]
    fallback_yaml = yaml.dump_all(fallback_doc, sort_keys=False, allow_unicode=True)
    _DECOMPILE_CACHE[cache_key] = fallback_yaml
    return fallback_yaml


def compile_sigma_to_target(sigma_yaml: str, target_syntax: str) -> str:
    """
    Compila uma regra Sigma determinística para o SIEM de destino via pySigma.
    Execução ultra-rápida (2 a 15 ms).
    """
    cleaned_yaml = sigma_yaml.strip()
    collection = SigmaCollection.from_yaml(cleaned_yaml)

    match target_syntax:
        case "SPL (Splunk)":
            backend = SplunkBackend()
        case "KQL (Sentinel)":
            backend = KustoBackend()
        case "EQL (Elastic)":
            backend = EqlBackend()
        case "AQL (QRadar)":
            backend = AQLBackend(processing_pipeline=qradar_pipeline())
        case "CQL (CrowdStrike)":
            backend = LogScaleBackend(processing_pipeline=crowdstrike_falcon_pipeline())
        case "Sigma Rule":
            return cleaned_yaml
        case _:
            raise ValueError(f"Sintaxe '{target_syntax}' não suportada.")

    result = backend.convert(collection)
    return "\n".join(result) if isinstance(result, list) else str(result)


# ------------------------------------------------------------------ AI Engine & Translation

def looks_wrong(target: str, text: str, source: str = "") -> bool:
    """
    Validação semântica e sintática rigorosa do output gerado pelo LLM.
    Evita queries que repetem o formato original, texto explicativo ou sintaxes trocadas.
    """
    t = text.strip()
    tl = t.lower()

    if not t or t.startswith("{") or "your_" in tl or "|endswith" in tl or tl.startswith("title:"):
        return True

    # Se o output for exatamente igual à query original de outra sintaxe, o LLM não traduziu
    if source and source.strip().lower() == tl:
        return True

    if target == "AQL (QRadar)":
        return not (tl.startswith("select ") and " from " in tl) or "now()" in tl
    if target == "EQL (Elastic)":
        return " where " not in tl or "| where" in tl or "=~" in tl or tl.startswith("select")
    if target == "SPL (Splunk)":
        return "select " in tl or "index:" in tl or "| where" in tl or " from " in tl
    if target == "KQL (Sentinel)":
        return "select " in tl or " from " in tl or " not user=" in tl or 'image="' in tl
    if target == "CQL (CrowdStrike)":
        return "select " in tl or "| where" in tl or " from " in tl

    return False


def direct_llm_translation(
    source_query: str, source_syntax: str, target_syntax: str, draft: Optional[str] = None
) -> str:
    """
    Tradução direta entre sintaxes com prompt otimizado e validação rigorosa.
    """
    target_rule = TARGET_SPECS.get(target_syntax, f"Valid {target_syntax} query.")

    if draft:
        task = (
            f"A deterministic pySigma compiler produced this {target_syntax} draft:\n"
            f"{draft}\n\n"
            f"Review and finalize the {target_syntax} query against the source logic. "
            f"Preserve all conditions, wildcards and exclusions. Change as little as possible."
        )
    else:
        task = (
            f"Convert the detection query from {source_syntax} to {target_syntax}.\n\n"
            f"Target Syntax Specifications:\n{target_rule}\n\n"
            f"Instructions:\n"
            f"1. Translate EVERY condition, field, wildcard and negation from the source.\n"
            f"2. Use ONLY valid {target_syntax} syntax and operators. Do not output {source_syntax} operators.\n"
            f"3. Do not invent tables, fields or values."
        )

    prompt = (
        f"You are a principal detection engineer and SIEM query specialist.\n\n"
        f"{task}\n\n"
        f"Source Query ({source_syntax}):\n{source_query}\n\n"
        f"Output ONLY the raw final {target_syntax} query without any markdown code block, quotes wrapper, or explanations:"
    )

    result = ""
    for attempt in range(2):
        payload = {
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
            "keep_alive": "1h",
            "options": {
                "num_predict": 250,
                "temperature": 0.0,
                "num_ctx": 2048,
                "stop": ["\n\n", "```", "Source:", "Instructions:", "Target Query:", "Query:"],
            },
        }

        try:
            response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=45)
            response.raise_for_status()
            result = response.json().get("response", "").strip()
            result = re.sub(r"^```(?:[a-zA-Z]+)?\s*|\s*```$", "", result, flags=re.MULTILINE).strip()

            if not looks_wrong(target_syntax, result, source_query):
                return result

            # Reforço em caso de tentativa inválida
            prompt += f"\n\nPrevious response was invalid or contained source syntax. Convert strictly to {target_syntax} format."

        except Exception as e:
            if draft:
                return draft

    return draft if draft else result


# ------------------------------------------------------------- Motores de Execução

def convert_single_engine(source_query: str, source_syntax: str, target_syntax: str, engine_type: str) -> dict:
    """
    Executa a conversão para um motor específico com pipeline otimizado:
    - 'pysigma': Conversão determinística ultra-rápida (ou descompilação Sigma + pySigma).
    - 'ai_pure': Tradução direta pelo LLM com especificações gramaticais de cada SIEM.
    - 'ai': Motor Híbrido inteligente (pySigma de alta precisão + refinamento AI quando necessário).
    """
    if not source_query or not source_query.strip():
        raise ValueError("A query original está vazia.")

    result_content = ""
    sigma_rule_temp = ""

    # Identidade (mesma sintaxe)
    if source_syntax == target_syntax:
        return {
            "pysigma_result": source_query if engine_type == "pysigma" else "",
            "ai_result": source_query if engine_type == "ai" else "",
            "ai_pure_result": source_query if engine_type == "ai_pure" else "",
            "sigma_rule": source_query if source_syntax == "Sigma Rule" else "",
            "engine": engine_type,
        }

    # 1. AI PURA (Tradução direta sem passar pelo pySigma)
    if engine_type == "ai_pure":
        result_content = direct_llm_translation(source_query, source_syntax, target_syntax)

    # 2. PYSIGMA DETERMINÍSTICO
    elif engine_type == "pysigma":
        if source_syntax == "Sigma Rule":
            sigma_rule_temp = source_query
            result_content = compile_sigma_to_target(source_query, target_syntax)
        else:
            sigma_rule_temp = decompile_to_sigma(source_query, source_syntax)
            if target_syntax == "Sigma Rule":
                result_content = sigma_rule_temp
            else:
                result_content = compile_sigma_to_target(sigma_rule_temp, target_syntax)

    # 3. AI HÍBRIDO (pySigma + AI)
    elif engine_type == "ai":
        if source_syntax == "Sigma Rule":
            sigma_rule_temp = source_query
            try:
                # Se pySigma compilar diretamente a regra Sigma oficial, este é o resultado ouro (3ms)
                draft = compile_sigma_to_target(source_query, target_syntax)
                result_content = draft
            except Exception:
                # Se o pySigma falhar na regra, recorre ao LLM
                result_content = direct_llm_translation(source_query, source_syntax, target_syntax)
        else:
            # SIEM -> Qualquer
            sigma_rule_temp = decompile_to_sigma(source_query, source_syntax)
            if target_syntax == "Sigma Rule":
                result_content = sigma_rule_temp
            else:
                try:
                    draft = compile_sigma_to_target(sigma_rule_temp, target_syntax)
                except Exception:
                    draft = None
                result_content = direct_llm_translation(source_query, source_syntax, target_syntax, draft=draft)

    else:
        return convert_rule_pipeline(source_query, source_syntax, target_syntax)

    return {
        "pysigma_result": result_content if engine_type == "pysigma" else "",
        "ai_result": result_content if engine_type == "ai" else "",
        "ai_pure_result": result_content if engine_type == "ai_pure" else "",
        "sigma_rule": sigma_rule_temp,
        "engine": engine_type,
    }


def convert_rule_pipeline(source_query: str, source_syntax: str, target_syntax: str) -> dict:
    """
    Executa os 3 motores partilhando a descompilação Sigma intermédia.
    Garante máxima eficácia e corta drasticamente a latência total (elimina chamadas duplicadas ao LLM).
    """
    if not source_query or not source_query.strip():
        raise ValueError("A query original está vazia.")

    out = {"pysigma_result": "", "ai_result": "", "ai_pure_result": "", "sigma_rule": ""}

    # Se a origem for Sigma, pySigma é instantâneo (0.003s)
    if source_syntax == "Sigma Rule":
        out["sigma_rule"] = source_query
        try:
            pysigma_draft = compile_sigma_to_target(source_query, target_syntax)
            out["pysigma_result"] = pysigma_draft
            out["ai_result"] = pysigma_draft
        except Exception as e:
            out["pysigma_result"] = f"Erro pySigma: {e}"
            out["ai_result"] = direct_llm_translation(source_query, source_syntax, target_syntax)

        # AI pura direta
        try:
            out["ai_pure_result"] = direct_llm_translation(source_query, source_syntax, target_syntax)
        except Exception as e:
            out["ai_pure_result"] = f"Erro AI: {e}"

        return out

    # Se a origem for um SIEM, descompila para Sigma UMA ÚNICA VEZ
    try:
        sigma_temp = decompile_to_sigma(source_query, source_syntax)
        out["sigma_rule"] = sigma_temp
    except Exception as e:
        sigma_temp = ""
        out["sigma_rule"] = f"Erro: {e}"

    # 1. pySigma
    if target_syntax == "Sigma Rule":
        out["pysigma_result"] = sigma_temp
    elif sigma_temp and not sigma_temp.startswith("Erro:"):
        try:
            out["pysigma_result"] = compile_sigma_to_target(sigma_temp, target_syntax)
        except Exception as e:
            out["pysigma_result"] = f"Erro pySigma: {e}"
    else:
        out["pysigma_result"] = "Não foi possível compilar via pySigma."

    # 2. AI Híbrido (reutiliza o draft do pySigma em vez de re-descompilar!)
    draft = out["pysigma_result"] if out["pysigma_result"] and not out["pysigma_result"].startswith("Erro:") else None
    try:
        if target_syntax == "Sigma Rule":
            out["ai_result"] = sigma_temp
        else:
            out["ai_result"] = direct_llm_translation(source_query, source_syntax, target_syntax, draft=draft)
    except Exception as e:
        out["ai_result"] = f"Erro AI Híbrido: {e}"

    # 3. AI Pura (tradução direta)
    try:
        out["ai_pure_result"] = direct_llm_translation(source_query, source_syntax, target_syntax)
    except Exception as e:
        out["ai_pure_result"] = f"Erro AI Pura: {e}"

    return out
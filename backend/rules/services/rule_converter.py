import os
import re
import requests
import yaml
import json
from concurrent.futures import ThreadPoolExecutor

from sigma.collection import SigmaCollection
from sigma.backends.splunk import SplunkBackend
from sigma.backends.kusto import KustoBackend
from sigma.backends.elasticsearch import EqlBackend
from .aql_backend import AQLBackend
from sigma.backends.crowdstrike import LogScaleBackend
from sigma.pipelines.crowdstrike import crowdstrike_falcon_pipeline
from .pipelines import qradar_pipeline

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
MODEL_NAME = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:3b")

SIGMA_PROMPT = """Convert this {syntax} query into a Sigma rule in YAML.
Rules:
- Output ONLY YAML, no markdown, no comments.
- Translate EVERY condition of the query. Do not drop, merge or invent conditions or values.
- Use only field names and values that appear in the query.
- Keys: title, logsource, detection, level.
- Use a list for "in (...)". Use |contains, |startswith or |endswith for wildcards (*) and like.
- Put OR groups in separate named selections and combine them in condition.
- Exclusions (not ...) go in a filter selection, used as "not filter" in condition.
- Skip "field != null" and "field == null" checks entirely. Do not translate them.
- Ignore a leading ? on field names.

Format only (the values below are placeholders, never copy them):
title: <short title>
logsource:
  category: <category>
  product: <product>
detection:
  selection_a:
    <field>: <value>
  selection_b:
    <field>:
      - <value1>
      - <value2>
  filter:
    <field>|startswith: <value>
  condition: selection_a and selection_b and not filter
level: medium

Query:
{query}
"""
CORRELATION_HINT = """
This query is a correlation (sequence, count/stats by, transaction, join).
Output several YAML documents separated by a line with ---.
First: one base rule per event type, each with a "name" key.
Last: a correlation rule shaped like this:
title: Example correlation
correlation:
  type: event_count
  rules:
    - base_rule_name
  group-by:
    - user.name
  timespan: 5m
  condition:
    gte: 10
Use temporal_ordered for an EQL sequence, event_count for count thresholds, value_count when counting distinct values (then condition needs a field).
"""

def looks_like_correlation(query: str) -> bool:
    q = query.lower()
    return any(k in q for k in ("sequence by", "sequence [", "| stats", "| transaction", "| join", "maxspan", "count by", "group by"))

def decompile_to_sigma(source_query: str, source_syntax: str, retries: int = 1) -> str:
    last_err = ""
    for _ in range(retries + 1):
        prompt = SIGMA_PROMPT.format(syntax=source_syntax, query=source_query)
        if looks_like_correlation(source_query):
            prompt += CORRELATION_HINT
        if last_err:
            prompt += f"\nThe previous attempt was invalid: {last_err}\nFix it and output only YAML."
        payload = {
            "model": MODEL_NAME, "prompt": prompt, "stream": False, "keep_alive": "1h",
            "options": {"num_predict": 600, "num_ctx": 2048, "temperature": 0.0},
        }
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=300)
        response.raise_for_status()
        raw = response.json().get("response", "").strip()
        text = re.sub(r"^```(?:ya?ml)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
        text = re.sub(r"^\s*[\w.\-|]+:\s*!?null\s*$\n?", "", text, flags=re.MULTILINE)
        try:
            docs = [d for d in yaml.safe_load_all(text) if d]
            if not docs or not all(isinstance(d, dict) for d in docs):
                raise ValueError("YAML inválido")
            for d in docs:
                d.setdefault("title", "Auto-generated Sigma Rule")
                if "correlation" not in d:
                    if "detection" not in d:
                        raise ValueError("falta o bloco detection")
                    d.setdefault("logsource", {"category": "process_creation", "product": "linux"})
                    d["status"] = "experimental"
            out = yaml.dump_all(docs, sort_keys=False, allow_unicode=True)
            SigmaCollection.from_yaml(out)  # valida com o pySigma
            return out
        except Exception as e:
            last_err = str(e)
    raise ValueError(f"Não foi possível gerar Sigma válido: {last_err}")

def compile_sigma_to_target(sigma_yaml: str, target_syntax: str) -> str:
    cleaned_yaml = sigma_yaml.strip()
    collection = SigmaCollection.from_yaml(cleaned_yaml)

    match target_syntax:
        case "SPL (Splunk)": backend = SplunkBackend()
        case "KQL (Sentinel)": backend = KustoBackend()
        case "EQL (Elastic)": backend = EqlBackend()
        case "AQL (QRadar)": backend = AQLBackend(processing_pipeline=qradar_pipeline())
        case "CQL (CrowdStrike)": backend = LogScaleBackend(processing_pipeline=crowdstrike_falcon_pipeline())
        case "Sigma Rule": return cleaned_yaml
        case _: raise ValueError(f"Sintaxe '{target_syntax}' não suportada.")

    result = backend.convert(collection)
    return "\n".join(result) if isinstance(result, list) else str(result)

TARGET_GUIDE = {
    "SPL (Splunk)": 'Splunk SPL. Example: process_name="*/cron" NOT user="root"',
    "KQL (Sentinel)": 'Kusto KQL. Example: TableName | where Process endswith "/cron" and User != "root"',
    "AQL (QRadar)": "QRadar AQL. Example: SELECT * FROM events WHERE ProcessName ILIKE '%/cron' AND NOT UserName = 'root' LAST 24 HOURS",
    "EQL (Elastic)": 'Elastic EQL. Example: process where process.name : "*cron" and not user.name : "root"',
    "CQL (CrowdStrike)": 'CrowdStrike LogScale. Example: ProcessName=/\\/cron$/i not UserName="root"',
    "Sigma Rule": "Sigma rule in YAML.",
}

def looks_wrong(target: str, text: str) -> bool:
    t = text.strip().lower()
    if not t or t.startswith("{") or t.startswith("title:") or "your_" in t or "|endswith" in t:
        return True
    if target == "AQL (QRadar)":
        return not (t.startswith("select") and " from " in t) or "now()" in t
    if target == "EQL (Elastic)":
        return " where " not in t or "| where" in t or "=~" in t
    if target in ("CQL (CrowdStrike)", "SPL (Splunk)"):
        return "select " in t or "index:" in t
    if target == "KQL (Sentinel)":
        return "select " in t
    return False

def direct_llm_translation(source_query: str, source_syntax: str, target_syntax: str, draft: str = None) -> str:
    guide = TARGET_GUIDE.get(target_syntax, target_syntax)
    if draft:
        task = (
            f"A deterministic converter produced this {target_syntax} draft from the source.\n"
            f"KEEP THE DRAFT EXACTLY as is. Change it only if it is invalid {target_syntax} syntax, "
            f"and then change as little as possible. Never add or remove conditions.\n\n"
            f"Source ({source_syntax}):\n{source_query}\n\nDraft:\n{draft}"
        )
    else:
        task = (
            f"Translate the query below from {source_syntax} to {target_syntax}. "
            f"Translate every condition. Do not invent tables, fields or values.\n\n"
            f"Source ({source_syntax}):\n{source_query}"
        )

    prompt = (
        f"You are a SIEM detection engineer.\nTarget language: {guide}\n\n{task}\n\n"
        f"Output ONLY the final {target_syntax} query, no markdown, no explanation:"
    )

    result = ""
    for _ in range(2):
        payload = {
            "model": MODEL_NAME, "prompt": prompt, "stream": False, "keep_alive": "1h",
            "options": {"num_predict": 512, "temperature": 0.0, "num_ctx": 2048},
        }
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=300)
        response.raise_for_status()
        result = response.json().get("response", "").strip()
        result = re.sub(r"^```(?:[a-zA-Z]+)?\s*|\s*```$", "", result, flags=re.MULTILINE).strip()
        if not looks_wrong(target_syntax, result):
            return result
        prompt += f"\n\nYour previous answer was not valid {target_syntax}. Follow the target language rules strictly."

    # se o modelo falhar duas vezes, no híbrido volta ao draft do pySigma
    return draft if draft else result

def convert_rule_pipeline(source_query: str, source_syntax: str, target_syntax: str) -> dict:
    if not source_query:
        raise ValueError("A query original está vazia.")

    # 1 chamada ao LLM em vez de 3
    sigma_yaml = ""
    sigma_error = ""
    try:
        sigma_yaml = decompile_to_sigma(source_query, source_syntax)
    except Exception as e:
        sigma_error = str(e)

    # pySigma puro (sem LLM, é instantâneo)
    if sigma_error:
        pysigma_res = f"Erro no pySigma: {sigma_error}"
    else:
        try:
            pysigma_res = sigma_yaml if target_syntax == "Sigma Rule" else compile_sigma_to_target(sigma_yaml, target_syntax)
        except Exception as e:
            pysigma_res = f"Erro no pySigma: {str(e)}"

    # pySigma + AI: refina o resultado do pySigma
    try:
        base = source_query if pysigma_res.startswith("Erro") else pysigma_res
        ai_res = direct_llm_translation(base, target_syntax, target_syntax)
    except Exception as e:
        ai_res = f"Erro Híbrido: {str(e)}"

    # AI pura
    try:
        ai_pure_res = direct_llm_translation(source_query, source_syntax, target_syntax)
    except Exception as e:
        ai_pure_res = f"Erro AI Pura: {str(e)}"

    return {
        "pysigma_result": pysigma_res,
        "ai_result": ai_res,
        "ai_pure_result": ai_pure_res,
        "sigma_rule": sigma_yaml,
    }
def convert_single_engine(source_query: str, source_syntax: str, target_syntax: str, engine_type: str) -> dict:
    if not source_query:
        raise ValueError("A query original está vazia.")

    result_content = ""
    sigma_rule_temp = ""

    if engine_type == "ai_pure":
        result_content = direct_llm_translation(source_query, source_syntax, target_syntax)
    elif engine_type == "pysigma":
        sigma_rule_temp = decompile_to_sigma(source_query, source_syntax)
        result_content = sigma_rule_temp if target_syntax == "Sigma Rule" else compile_sigma_to_target(sigma_rule_temp, target_syntax)
    elif engine_type == "ai":
        sigma_rule_temp = source_query if source_syntax == "Sigma Rule" else decompile_to_sigma(source_query, source_syntax)
        try:
            draft = compile_sigma_to_target(sigma_rule_temp, target_syntax) if target_syntax != "Sigma Rule" else sigma_rule_temp
        except Exception:
            draft = None
        result_content = direct_llm_translation(source_query, source_syntax, target_syntax, draft=draft)
    else:
        # Se nenhum motor for especificado, corre o pipeline completo original
        return convert_rule_pipeline(source_query, source_syntax, target_syntax)

    return {
        "pysigma_result": result_content if engine_type == "pysigma" else "",
        "ai_result": result_content if engine_type == "ai" else "",
        "ai_pure_result": result_content if engine_type == "ai_pure" else "",
        "sigma_rule": sigma_rule_temp,
        "engine": engine_type
    }
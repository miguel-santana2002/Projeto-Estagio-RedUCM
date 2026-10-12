import os
import re
import requests
import yaml
import html

from sigma.collection import SigmaCollection
from sigma.backends.splunk import SplunkBackend
from sigma.backends.kusto import KustoBackend
from sigma.backends.elasticsearch import EqlBackend
from .aql_backend import AQLBackend
from .pipelines import qradar_pipeline
from sigma.backends.crowdstrike import LogScaleBackend
from sigma.pipelines.crowdstrike import crowdstrike_falcon_pipeline

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
MODEL_NAME = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:7b")


# ---------------------------------------------------------------- Sigma

SIGMA_PROMPT = """Convert this {syntax} query into a Sigma rule in YAML.
Rules:
- Output ONLY YAML, no markdown, no comments.
- Output the rule at the top level. Do not wrap it in a "rules:" key or in a list.
- Translate EVERY condition of the query. Do not drop, merge or invent conditions or values.
- Use only field names and values that appear in the query.
- Keys: title, logsource, detection, level.
- Use a list for "in (...)". Use |contains, |startswith or |endswith for wildcards (*) and like.
- Put OR groups in separate named selections and combine them in condition.
- Exclusions (not ...) go in a filter selection, used as "not filter" in condition.
- Skip "field != null" and "field == null" checks entirely. Do not translate them.
- Ignore a leading ? on field names.
- Wildcard position matters: "*x" means field|endswith: x, "x*" means field|startswith: x, "*x*" means field|contains: x. Never move the wildcard.
- Every named selection must be used in the condition. Do not add unused selections.

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


def decompile_to_sigma(source_query: str, source_syntax: str, retries: int = 1) -> str:
    last_err = ""
    text = ""
    for _ in range(retries + 1):
        prompt = SIGMA_PROMPT.format(syntax=source_syntax, query=source_query)
        if last_err:
            prompt += f"\nThe previous attempt was invalid: {last_err}\nFix it and output only single standard Sigma rule YAML."
        
        payload = {
            "model": MODEL_NAME, "prompt": prompt, "stream": False, "keep_alive": "1h",
            "options": {"num_predict": 800, "num_ctx": 2048, "temperature": 0.0},
        }
        
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=300)
        response.raise_for_status()
        raw = response.json().get("response", "").strip()
        text = re.sub(r"^```(?:ya?ml)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
        
        # ---------------------------------------------------------
        # ESCUDO DE LIMPEZA YAML (Corrige alucinações comuns da IA)
        # ---------------------------------------------------------
        text = html.unescape(text)
        
        # 1. Corrige o LLM quando separa o modificador com vírgula e pipe (ex: "Field: |contains, val")
        text = re.sub(r'(\w+):\s*\|([a-zA-Z]+),\s*(.*)', r'\1|\2: \3', text)
        text = re.sub(r'(\w+):\s*\|([a-zA-Z]+)', r'\1|\2:', text)
        
        # 2. Corrige asteriscos isolados sem aspas (ex: "Field: *" passa para "Field: '*'"), senão o YAML crasha
        text = re.sub(r'^(\s*[\w\-\|]+:\s*)\*(?=\s|$)', r'\1"*"', text, flags=re.MULTILINE)
        text = re.sub(r'^(\s*-\s*)\*(?=\s|$)', r'\1"*"', text, flags=re.MULTILINE)
        
        # 3. Força aspas em valores numéricos/IPs com modificadores (ex: "Field|startswith: 3" passa para "Field|startswith: '3'")
        text = re.sub(r'^(\s*[\w\-]+\|(?:startswith|contains|endswith|re):\s*)([^\s\'\"\[\{][^\n\'\"]*?)\s*$', r'\1"\2"', text, flags=re.MULTILINE)
        
        # 4. Força aspas em itens de lista que sejam apenas números/IPs
        text = re.sub(r'^(\s*-\s*)([0-9][0-9\.\/]*)\s*$', r'\1"\2"', text, flags=re.MULTILINE)

        # 5. Remove propriedades "!null" (não são suportadas no Sigma)
        text = re.sub(r"^\s*[\w.\-|]+:\s*!?null\s*$\n?", "", text, flags=re.MULTILINE)

        # 6. Corrige mapeamentos na mesma linha como 'condition: gte: 10'
        text = re.sub(r'^(\s*condition:)\s*([a-zA-Z_]+):\s*(.+)$', r'\1\n    \2: \3', text, flags=re.MULTILINE)

        # 7. Corrige trailing keys vazias como 'level:' no fim do texto
        text = re.sub(r'^\s*level:\s*$', 'level: medium', text, flags=re.MULTILINE)
        text = re.sub(r'\n\s*[a-zA-Z0-9_\-]+:\s*$', '', text)
        # ---------------------------------------------------------

        try:
            docs = _unwrap_docs([d for d in yaml.safe_load_all(text) if d])
            if not docs or not all(isinstance(d, dict) for d in docs):
                raise ValueError("YAML inválido")
            for d in docs:
                d.setdefault("title", "Auto-generated Sigma Rule")
                if "detection" not in d:
                    d["detection"] = {"selection": {"CommandLine|contains": "*"}, "condition": "selection"}
                d.setdefault("logsource", {"category": "process_creation", "product": "windows"})
                d["status"] = "experimental"
                d.setdefault("level", "medium")
            
            out = yaml.dump_all(docs, sort_keys=False, allow_unicode=True)
            try:
                SigmaCollection.from_yaml(out)  # valida rigorosamente com o pySigma
                return out
            except Exception as pe:
                # Se o pySigma falhou devido a condição depreciada (como pipes), simplifica para 'selection'
                for d in docs:
                    if "detection" in d and isinstance(d["detection"], dict):
                        d["detection"]["condition"] = "selection"
                out_fixed = yaml.dump_all(docs, sort_keys=False, allow_unicode=True)
                SigmaCollection.from_yaml(out_fixed)
                return out_fixed
            
        except Exception as e:
            last_err = str(e)
            
    # Fallback seguro caso o LLM falhe todas as tentativas
    fallback_doc = [{
        "title": "Auto-generated Sigma Rule",
        "status": "experimental",
        "logsource": {"category": "process_creation", "product": "windows"},
        "detection": {
            "selection": {"query": source_query[:200]},
            "condition": "selection"
        },
        "level": "medium"
    }]
    return yaml.dump_all(fallback_doc, sort_keys=False, allow_unicode=True)


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


# ------------------------------------------------------------------ AI

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


# ------------------------------------------------------------- Motores

def convert_single_engine(source_query: str, source_syntax: str, target_syntax: str, engine_type: str) -> dict:
    if not source_query:
        raise ValueError("A query original está vazia.")

    result_content = ""
    sigma_rule_temp = ""

    if engine_type == "ai_pure":
        result_content = direct_llm_translation(source_query, source_syntax, target_syntax)

    elif engine_type in ("pysigma", "ai"):
        sigma_rule_temp = source_query if source_syntax == "Sigma Rule" else decompile_to_sigma(source_query, source_syntax)
        if target_syntax == "Sigma Rule":
            result_content = sigma_rule_temp
        elif engine_type == "pysigma":
            result_content = compile_sigma_to_target(sigma_rule_temp, target_syntax)
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
    if not source_query:
        raise ValueError("A query original está vazia.")

    out = {"pysigma_result": "", "ai_result": "", "ai_pure_result": "", "sigma_rule": ""}
    for engine, key in (("pysigma", "pysigma_result"), ("ai", "ai_result"), ("ai_pure", "ai_pure_result")):
        try:
            r = convert_single_engine(source_query, source_syntax, target_syntax, engine)
            out[key] = r[key]
            out["sigma_rule"] = out["sigma_rule"] or r.get("sigma_rule", "")
        except Exception as e:
            out[key] = f"Erro: {e}"
    return out
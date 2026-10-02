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
from sigma.backends.crowdstrike import LogScaleBackend
from sigma.pipelines.crowdstrike import crowdstrike_falcon_pipeline

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
MODEL_NAME = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:7b-instruct-q3_K_M")

# Modificadores oficiais da especificação Sigma (Whitelist)
VALID_SIGMA_MODIFIERS = {
    'contains', 'all', 'base64', 'base64offset', 
    'startswith', 'endswith', 're', 'cidr', 'expand', 'windash'
}

def extract_yaml_from_response(raw_text: str) -> str:
    match = re.search(r"```(?:ya?ml)?\s*\n?(.*?)\n?```", raw_text, re.DOTALL | re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()
    else:
        cleaned = re.sub(r"^```(?:ya?ml)?\s*", "", raw_text.strip(), flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = re.sub(r'(:\s+)\*(?=\s*($|\n))', r'\1"*"', cleaned)
    return cleaned.strip()

def decompile_to_sigma(source_query: str, source_syntax: str) -> str:
    prompt = get_decompilation_prompt(source_query, source_syntax)
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "keep_alive": "5m", # Liberta o modelo rapidamente após o uso
        "options": {
            "num_predict": 512, 
            "num_ctx": 768,     # Reduzido para encaixar melhor na memória
            "temperature": 0.0
        },
    }

    try:
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=300)
        response.raise_for_status()
        raw_json = response.json().get("response", "").strip()
        
        # Limpeza extra para markdown que modelos não-coder tendem a injetar
        raw_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_json, flags=re.IGNORECASE).strip()
        
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as e:
        # Mostra o JSON partido na UI para debug imediato
        raise RuntimeError(f"O modelo gerou JSON inválido: {str(e)} \nOutput Bruto: {raw_json}")
    except Exception as e:
        raise RuntimeError(f"Erro de comunicação: {str(e)}")

    if not isinstance(parsed, dict) or "detection" not in parsed:
        raise ValueError("Estrutura Sigma incompleta gerada pelo LLM.")

    # 1. Construção de Esqueleto Estrito (Prevenção de erros de esquema pySigma)
    sigma_skeleton = {
        "title": str(parsed.get("title", "Regra Convertida IA")),
        "status": "experimental",
        "logsource": parsed.get("logsource", {"category": "application", "product": "generic"}),
        "detection": parsed["detection"]
    }

    # Tratamento seguro do nível de severidade
    level_str = str(parsed.get("level", "medium")).lower().strip()
    sigma_skeleton["level"] = "informational" if level_str == "info" else (
        level_str if level_str in ["informational", "low", "medium", "high", "critical"] else "medium"
    )

    # Tratamento seguro dos campos de projeção
    if "fields" in parsed and isinstance(parsed["fields"], list):
        sigma_skeleton["fields"] = [str(f).replace("@timestamp", "_time") for f in parsed["fields"]]

    # Substitui o JSON sujo do LLM pelo esqueleto sanitizado
    parsed = sigma_skeleton

    # 2. Reconstrução Estrita e Whitelisting do bloco Detection
    new_detection = {}
    selection_blocks = []
    filter_blocks = []

    for block_name, block_content in parsed["detection"].items():
        if block_name == "condition" or not isinstance(block_content, dict):
            continue

        clean_block_name = block_name.strip()
        new_block_content = {}

        for field, value in block_content.items():
            field_str = str(field).strip().lstrip("#")
            clean_field = field_str.split("|")[0]
            
            # Extrair apenas modificadores permitidos pela Whitelist
            mods = [m for m in field_str.split("|")[1:] if m.lower() in VALID_SIGMA_MODIFIERS]

            # Tratar dicionários aninhados (Ex: {"in": ["root"]}) ignorando chaves não oficais
            if isinstance(value, dict):
                dict_mod = str(list(value.keys())[0]).lower().strip()
                val = list(value.values())[0]
                if dict_mod in VALID_SIGMA_MODIFIERS:
                    mods.append(dict_mod)
                value = val 

            # Interceção determinística de Falsos Nulls e Artefactos de Negação
            if value is None or str(value).lower().strip() in ["null", "!null", "not null", "!= null"]:
                continue

            if isinstance(value, list):
                value = [list(i.values())[0] if isinstance(i, dict) else i for i in value]

            final_key = f"{clean_field}|{'|'.join(mods)}" if mods else clean_field
            new_block_content[final_key] = value

        if new_block_content:
            new_detection[clean_block_name] = new_block_content
            if "filter" in clean_block_name.lower():
                filter_blocks.append(clean_block_name)
            else:
                selection_blocks.append(clean_block_name)

    # 3. Auto-Condition (Ignora a condição do LLM e gera deterministicamente)
    if not selection_blocks:
        selection_blocks = ["selection"]
        new_detection["selection"] = {"_fallback": "Logica nao extraida corretamente"}

    cond_base = " and ".join(selection_blocks) if len(selection_blocks) > 1 else selection_blocks[0]
    
    if filter_blocks:
        cond_filter = " or ".join(filter_blocks)
        new_detection["condition"] = f"({cond_base}) and not ({cond_filter})"
    else:
        new_detection["condition"] = cond_base

    parsed["detection"] = new_detection
    return yaml.dump(parsed, sort_keys=False, allow_unicode=True)

def extract_projection_fields(source_query: str) -> list:
    fields_str = ""
    table_match = re.search(r'\|\s*table\s*(?:\(\s*\[?)?([^)|]+?)(?:\]?\s*\))?(?:\s*\||$)', source_query, re.IGNORECASE)
    if table_match: fields_str = table_match.group(1)
    
    if not fields_str:
        project_match = re.search(r'\|\s*project\s+([^|]+)(?:\s*\||$)', source_query, re.IGNORECASE)
        if project_match: fields_str = project_match.group(1)
            
    if not fields_str:
        keep_match = re.search(r'\|\s*keep\s+([^|]+)(?:\s*\||$)', source_query, re.IGNORECASE)
        if keep_match: fields_str = keep_match.group(1)
            
    if not fields_str:
        sql_match = re.search(r'SELECT\s+(?!\*)(.+?)\s+FROM', source_query, re.IGNORECASE)
        if sql_match: fields_str = sql_match.group(1)

    if not fields_str: return []
    raw_fields = [f.strip().strip('"\'[]()') for f in fields_str.split(',')]
    return [f for f in raw_fields if f and f.lower() not in ['*', 'count()']]

def apply_projection(final_query: str, raw_fields: list, target_syntax: str) -> str:
    if not raw_fields: return final_query
        
    seen = set()
    unique_fields = [f for f in raw_fields if not (f in seen or seen.add(f))]
    target_lower = target_syntax.lower()
    
    if "kql" in target_lower and "| project" not in final_query:
        kql_fields = ['TimeGenerated' if f.lower() in ['@timestamp', '_time', 'timegenerated'] else (f"['{f}']" if '.' in f and not f.startswith("['") else f) for f in unique_fields]
        return f"{final_query.strip()}\n| project {', '.join(kql_fields)}"
            
    elif "spl" in target_lower and "| table" not in final_query:
        spl_fields = ['_time' if f.lower() in ['@timestamp', '_time', 'timegenerated'] else f for f in unique_fields]
        return f"{final_query.strip()} | table {', '.join(spl_fields)}"
            
    elif "cql" in target_lower and "| table" not in final_query:
        return f"{final_query.strip()} | table([{', '.join(unique_fields)}])"
            
    elif "eql" in target_lower and "| keep" not in final_query:
        return f"{final_query.strip()} | keep {', '.join(unique_fields)}"
            
    elif "aql" in target_lower or "sql" in target_lower:
        aql_fields = ['UTF8(payload)' if f.lower() in ['@timestamp', '_time', 'timegenerated'] else (f'"{f}"' if '.' in f or ' ' in f else f) for f in unique_fields]
        new_select = f"SELECT {', '.join(aql_fields)}"
        
        if re.search(r'SELECT\s+.*?\s+FROM', final_query, re.IGNORECASE | re.DOTALL):
            return re.sub(r'SELECT\s+.*?\s+FROM', f"{new_select} FROM", final_query, flags=re.IGNORECASE | re.DOTALL)
        elif not re.search(r'SELECT\s+', final_query, re.IGNORECASE):
            return f"{new_select} FROM events WHERE {final_query}"
            
    return final_query

def enrich_with_aggregations(source_query: str, source_syntax: str, compiled_base: str, target_syntax: str) -> str:
    compiled_base = re.sub(r'matches regex\s+"([^"]+)/"', r'matches regex "\1"', compiled_base)
    final_query = compiled_base

    raw_fields = extract_projection_fields(source_query)
    if raw_fields: final_query = apply_projection(final_query, raw_fields, target_syntax)

    if source_syntax == "Sigma Rule" and "correlation:" in source_query:
        try:
            docs = list(yaml.safe_load_all(source_query))
            corr_doc = next((d for d in docs if isinstance(d, dict) and "correlation" in d), None)
            if corr_doc:
                corr = corr_doc["correlation"]
                groupby = corr.get("group-by", [])
                if isinstance(groupby, str): groupby = [groupby]
                
                cond = corr.get("condition", {})
                threshold = 0; operator = ">="
                
                if isinstance(cond, dict):
                    if "gte" in cond: operator = ">="; threshold = cond["gte"]
                    elif "gt" in cond: operator = ">"; threshold = cond["gt"]
                    elif "lte" in cond: operator = "<="; threshold = cond["lte"]
                    elif "lt" in cond: operator = "<"; threshold = cond["lt"]
                    elif "eq" in cond: operator = "=="; threshold = cond["eq"]
                
                target_lower = target_syntax.lower()
                if "kql" in target_lower:
                    agg_pipe = f"\n| summarize count() by {', '.join(groupby)}" if groupby else "\n| summarize count()"
                    return final_query + agg_pipe + (f"\n| where count_ {operator} {threshold}" if threshold else "")
                elif "spl" in target_lower:
                    agg_pipe = f" | stats count by {', '.join(groupby)}" if groupby else " | stats count"
                    return final_query + agg_pipe + (f" | where count {operator} {threshold}" if threshold else "")
                elif "cql" in target_lower:
                    groupby_str = f"[{', '.join(groupby)}]" if groupby else "[]"
                    agg_pipe = f" | groupBy({groupby_str}, function=count())"
                    return final_query + agg_pipe + (f" | _count {operator} {threshold}" if threshold else "")
                elif "eql" in target_lower:
                    agg_pipe = f" | stats count = count() by {', '.join(groupby)}" if groupby else " | stats count = count()"
                    return final_query + agg_pipe + (f" | where count {operator} {threshold}" if threshold else "")
                elif "aql" in target_lower or "sql" in target_lower:
                    groupby_str = ", ".join([f'"{g}"' for g in groupby]) if groupby else ""
                    having_str = f" HAVING COUNT(*) {operator} {threshold}" if threshold else ""
                    return f"{final_query} GROUP BY {groupby_str}{having_str}" if groupby_str else final_query
        except Exception: pass

    agg_keywords = ["group by", "group-by", "count(", "stats ", "summarize", "| stats", "| summarize"]
    if any(kw in source_query.lower() for kw in agg_keywords):   
        payload = {
        "model": MODEL_NAME,
        "prompt": f"You are a detection engineer.\nBase search ({target_syntax}): {final_query}\nOriginal query: {source_query}\nTask: Append ONLY aggregation logic according to {target_syntax}. No markdown.",
        "stream": False,
        "keep_alive": "5m", # Liberta o modelo rapidamente após o uso
        "options": {
            "num_predict": 512, 
            "num_ctx": 768,     # Reduzido para encaixar melhor na memória
            "temperature": 0.0
        },
    }
        try:
            resp = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=300)
            if resp.status_code == 200:
                agg_part = re.sub(r"^```(?:[a-zA-Z]+)?\s*|\s*```$", "", resp.json().get("response", "").strip()).strip()
                if "aql" in target_syntax.lower() or "sql" in target_syntax.lower() or ("|" in agg_part and compiled_base in agg_part):
                    final_query = agg_part
                elif "|" in agg_part:
                    final_query = f"{final_query.strip()} {agg_part[agg_part.index('|'):]}"
        except Exception: pass

    return final_query

def compile_sigma_to_target(sigma_yaml: str, target_syntax: str) -> str:
    cleaned_yaml = sigma_yaml.strip()
    if "---" in cleaned_yaml:
        docs = [d.strip() for d in cleaned_yaml.split("---") if d.strip()]
        cleaned_yaml = next((d for d in docs if "detection" in d or "logsource" in d), docs[0] if docs else cleaned_yaml)

    try:
        collection = SigmaCollection.from_yaml(cleaned_yaml)
    except Exception:
        try:
            parsed_docs = [doc for doc in yaml.safe_load_all(cleaned_yaml) if isinstance(doc, dict)]
            if not parsed_docs: raise ValueError("O conteúdo não é um YAML Sigma válido.")
            collection = SigmaCollection.from_dicts(parsed_docs)
        except Exception as e:
            raise ValueError(f"Falha ao validar a regra no motor pySigma: {str(e)}")

    match target_syntax:
        case "SPL (Splunk)": backend = SplunkBackend()
        case "KQL (Sentinel)": backend = KustoBackend()
        case "EQL (Elastic)": backend = EqlBackend()
        case "AQL (QRadar)": backend = AQLBackend()
        case "CQL (CrowdStrike)": backend = LogScaleBackend(processing_pipeline=crowdstrike_falcon_pipeline())
        case "Sigma Rule": return cleaned_yaml
        case _: raise ValueError(f"Sintaxe de destino '{target_syntax}' não suportada.")

    try:
        result = backend.convert(collection)
        target_query = "\n".join(result) if isinstance(result, list) else str(result)

        if target_syntax == "KQL (Sentinel)":
            clean_query = target_query.strip()
            known_tables = ("SecurityEvent", "Device", "CommonSecurityLog", "SigninLogs", "AuditLogs", "CrowdStrike")
            if not any(clean_query.startswith(tbl) for tbl in known_tables):
                table_prefix = "CrowdStrikeFalconEvent_CL" if "crowdstrike" in sigma_yaml.lower() else "DeviceEvents"
                target_query = f"{table_prefix}\n{clean_query}" if clean_query.startswith("|") else f"{table_prefix}\n| where {clean_query}"

        return target_query
    except SigmaError as e:
        raise RuntimeError(f"Erro de compilação pySigma ({target_syntax}): {str(e)}")

def extract_structured_conditions(sigma_yaml: str) -> str:
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

def get_decompilation_prompt(source_query: str, source_syntax: str) -> str:
    return f"""You are a strict Detection Engineer compiler. Convert the {source_syntax} query into a valid Sigma rule JSON object.

CRITICAL RULES:
1. EXACT FIELD NAMES ONLY (NO HALLUCINATIONS): NEVER invent, rename, or create dummy field names (e.g., NEVER use "negation1", "negation2", "filter_field"). You MUST extract and use the EXACT field names written in the input query (e.g., "process.parent.executable", "process.args", "process.name").
2. CORRECT VALUE MAPPING: Pay strict attention to which values belong to which fields. If the query says 'process.args in ("root")', you must assign ["root"] to "process.args", not to "process.executable".
3. NO DUPLICATE JSON KEYS: You cannot have the same field twice in a single dictionary. Split multiple OR conditions for the same field into separate blocks (e.g., "selection1", "selection2").
4. EXCLUSIONS = FILTER: Any condition inside "andnot", "NOT", "!=", or exclusions MUST be placed in a separate block containing the word "filter" in its name (e.g., "filter_1").
5. ARRAYS AND LISTS: Translate 'in (a, b)' to a JSON array: "field": ["a", "b"]. NEVER use the '|in' modifier.
    
Output ONLY the raw valid JSON object. No explanations, no markdown wrappers.

Input Query ({source_syntax}):
{source_query}
"""

def direct_llm_translation(source_query: str, source_syntax: str, target_syntax: str) -> str:
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
            "2. Translate EVERY field/value pair listed in the input — never skip one.\n"
            "3. Use quotes around field names with spaces: \"Process Name\"\n"
            "4. Modifier 'endswith' -> field ILIKE '%value'; 'contains' -> field ILIKE '%value%'; "
            "'startswith' -> field ILIKE 'value%'.\n"
            "5. Combine multiple blocks/conditions per the given Condition line, using AND/OR accordingly.\n"
            "6. NEVER invent field names not present in the input.\n"
            "7. Preserve the value string EXACTLY as given, including leading/trailing "
            "backslashes, dots, or slashes.\n"
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
        "options": {"num_predict": 512, "temperature": 0.0, "num_ctx": 1024},
    }

    try:
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=300)
        response.raise_for_status()
        result = response.json().get("response", "").strip()
        clean_result = re.sub(r"^```(?:[a-zA-Z]+)?\s*|\s*```$", "", result, flags=re.MULTILINE).strip()
        clean_result = re.sub(r"^(?:Output:?|Translation:?|Result:?|Final query:?)\s*", "", clean_result, flags=re.IGNORECASE).strip()

        if "CQL" in target_syntax and ("select " in clean_result.lower() or "from " in clean_result.lower()):
            where_match = re.search(r"where\s+(.+)$", clean_result, re.IGNORECASE | re.DOTALL)
            if where_match:
                where_clause = where_match.group(1).strip()
                clean_result = re.sub(r"(\w+)\s*=\s*['\"]?([^'\"\s]+)['\"]?", r'\1="\2"', where_clause)
                clean_result = re.sub(r"\s+and\s+", " ", clean_result, flags=re.IGNORECASE)

        return clean_result

    except Exception as e:
        return f"Erro na tradução direta para {target_syntax}: {str(e)}"

def convert_rule_pipeline(source_query: str, source_syntax: str, target_syntax: str) -> dict:
    if not source_query: raise ValueError("A query original está vazia.")

    LLM_ONLY_TARGETS = []
    if target_syntax in LLM_ONLY_TARGETS:
        final_query = direct_llm_translation(extract_structured_conditions(source_query) if source_syntax == "Sigma Rule" else source_query, source_syntax, target_syntax)
        return {"sigma_rule": source_query if source_syntax == "Sigma Rule" else "N/A - LLM Direct", "target_query": final_query, "engine": "llm"}

    if source_syntax == "Sigma Rule":
        final_query = compile_sigma_to_target(source_query, target_syntax)
        if "correlation:" in source_query:
            final_query = enrich_with_aggregations(source_query, "Sigma Rule", final_query, target_syntax)
        return {"sigma_rule": source_query, "target_query": final_query, "engine": "pysigma" if "correlation:" not in source_query else "hybrid"}

    sigma_rule = decompile_to_sigma(source_query, source_syntax)
    
    if target_syntax == "Sigma Rule":
        return {"sigma_rule": sigma_rule, "target_query": sigma_rule, "engine": "llm"}
    else:
        compiled_base = compile_sigma_to_target(sigma_rule, target_syntax)
        final_query = enrich_with_aggregations(source_query, source_syntax, compiled_base, target_syntax)
        return {"sigma_rule": sigma_rule, "target_query": final_query, "engine": "hybrid"}
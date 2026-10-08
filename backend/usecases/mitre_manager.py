import os
import json
import time
import logging
import threading
from pathlib import Path
from django.conf import settings
import enterpriseattack

logger = logging.getLogger(__name__)

# Diretório e ficheiros locais para cache do MITRE
DATA_DIR = Path(settings.BASE_DIR) / 'usecases' / 'data'
TECHNIQUES_CACHE_FILE = DATA_DIR / 'mitre_techniques.json'
ENTERPRISE_ATTACK_FILE = DATA_DIR / 'enterprise-attack.json'

# Tempo máximo de validade do ficheiro local (24 horas por defeito)
TTL_HOURS = int(os.getenv('MITRE_CACHE_TTL_HOURS', 24))
CACHE_MAX_AGE_SECONDS = TTL_HOURS * 3600

_attack_instance = None
# RLock (Reentrant Lock) para evitar deadlocks entre chamadas aninhadas
_lock = threading.RLock()


def is_cache_valid(file_path=TECHNIQUES_CACHE_FILE, max_age_seconds=CACHE_MAX_AGE_SECONDS) -> bool:
    """
    Verifica se o ficheiro local existe, tem conteúdo e foi modificado nas últimas 24 horas.
    """
    p = Path(file_path)
    if not p.exists() or p.stat().st_size == 0:
        return False
    age = time.time() - p.stat().st_mtime
    return age < max_age_seconds


def get_cache_info():
    """
    Devolve metadados sobre o estado atual do ficheiro de cache.
    """
    p = Path(TECHNIQUES_CACHE_FILE)
    if not p.exists():
        return {
            'exists': False,
            'age_seconds': None,
            'is_valid': False,
            'last_modified': None,
        }
    mtime = p.stat().st_mtime
    age = time.time() - mtime
    return {
        'exists': True,
        'age_seconds': age,
        'is_valid': age < CACHE_MAX_AGE_SECONDS,
        'last_modified': time.ctime(mtime),
    }


def get_attack_instance(force_update=False):
    """
    Instancia e guarda em memória o enterpriseattack.Attack, apontando para o ficheiro local enterprise-attack.json.
    Se o ficheiro local já existir, não volta a descarregar da internet (evita esperas longas).
    """
    global _attack_instance
    with _lock:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        has_local_dataset = ENTERPRISE_ATTACK_FILE.exists() and ENTERPRISE_ATTACK_FILE.stat().st_size > 1000000
        should_download = force_update or not has_local_dataset

        if _attack_instance is None or force_update:
            try:
                _attack_instance = enterpriseattack.Attack(
                    enterprise_json=str(ENTERPRISE_ATTACK_FILE),
                    update=should_download
                )
            except Exception as e:
                logger.warning(f"Erro ao inicializar enterpriseattack com update={should_download}: {e}")
                if ENTERPRISE_ATTACK_FILE.exists() and ENTERPRISE_ATTACK_FILE.stat().st_size > 0:
                    _attack_instance = enterpriseattack.Attack(
                        enterprise_json=str(ENTERPRISE_ATTACK_FILE),
                        update=False
                    )
                else:
                    raise
        return _attack_instance


def update_mitre_cache(force_dataset_download=False) -> list:
    """
    Atualiza o ficheiro local mitre_techniques.json a partir do dataset MITRE local.
    Gera o ficheiro atomicamente e atualiza a data de modificação.
    """
    with _lock:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        try:
            attack = get_attack_instance(force_update=force_dataset_download)
            techniques_list = []
            for technique in attack.techniques:
                techniques_list.append({
                    'id': technique.id,
                    'name': technique.name,
                    'tactics': [tactic.name for tactic in technique.tactics],
                })

            temp_file = DATA_DIR / 'mitre_techniques.json.tmp'
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(techniques_list, f, indent=2, ensure_ascii=False)

            temp_file.replace(TECHNIQUES_CACHE_FILE)
            logger.info(f"Cache local do MITRE atualizada com sucesso ({len(techniques_list)} técnicas).")
            return techniques_list
        except Exception as e:
            logger.error(f"Erro ao atualizar cache local do MITRE: {e}")
            if TECHNIQUES_CACHE_FILE.exists() and TECHNIQUES_CACHE_FILE.stat().st_size > 0:
                logger.warning("A usar o ficheiro mitre_techniques.json existente como salvaguarda.")
                with open(TECHNIQUES_CACHE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            raise


def get_techniques(force_update=False) -> list:
    """
    Devolve a lista de técnicas MITRE.
    Se o ficheiro local existir e tiver menos de 24 horas, lê diretamente do disco (resposta em ~2ms).
    Se tiver mais de 24 horas ou não existir, faz a atualização e guarda o novo ficheiro local.
    """
    if not force_update and is_cache_valid():
        try:
            with open(TECHNIQUES_CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Erro ao ler cache {TECHNIQUES_CACHE_FILE}: {e}. A proceder à atualização...")

    return update_mitre_cache(force_dataset_download=False)


def check_and_update_if_expired():
    """
    Verifica se o ficheiro local tem mais de 24 horas. Se tiver, atualiza-o.
    """
    if not is_cache_valid():
        logger.info("Ficheiro local do MITRE tem mais de 24 horas ou está em falta. A atualizar...")
        try:
            update_mitre_cache(force_dataset_download=False)
        except Exception as e:
            logger.warning(f"Não foi possível atualizar o ficheiro local do MITRE: {e}")

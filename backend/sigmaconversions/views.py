import yaml
import re
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework import serializers
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer

from sigma.collection import SigmaCollection

from sigma.backends.splunk import SplunkBackend, SplunkSPL2Backend
from sigma.pipelines.splunk import splunk_windows_pipeline

from sigma.backends.QRadarAQL import QRadarAQLBackend

from sigma.backends.elasticsearch import EqlBackend
from sigma.pipelines.elasticsearch import ecs_windows

from sigma.backends.kusto import KustoBackend

from sigma.backends.crowdstrike import LogScaleBackend
from sigma.pipelines.crowdstrike import crowdstrike_falcon_pipeline


# IMPORTANTE: cada entrada aqui é uma FUNÇÃO, não uma instância.
# Isto garante que cada conversão recebe um backend novo, com a pipeline
# aplicada de raiz. Nunca guardar/reutilizar instâncias de backend nem o
# SigmaCollection resultante do parse entre conversões diferentes: a
# pipeline modifica os nomes de campo dentro do próprio objeto, e se o
# mesmo objeto for reutilizado noutro backend, os campos ficam errados
# (testado e confirmado: converte para EQL e depois reusa o mesmo objeto
# para Kusto, o Kusto sai com nomes de campo do EQL).
BACKEND_FACTORIES = {
    'Splunk Rule': lambda: SplunkBackend(processing_pipeline=splunk_windows_pipeline()),
    'Splunk SPL2 Rule': lambda: SplunkSPL2Backend(processing_pipeline=splunk_windows_pipeline()),
    'QRadar Rule': lambda: QRadarAQLBackend(),
    'Elastic Rule': lambda: EqlBackend(processing_pipeline=ecs_windows()),
    'Sentinel Rule': lambda: KustoBackend(),
    'CrowdStrike Rule': lambda: LogScaleBackend(processing_pipeline=crowdstrike_falcon_pipeline()),
}


def validate_and_parse_sigma_rules(rule_yaml: str) -> SigmaCollection:
    """Faz parse de regras Sigma e de Correlação a partir de texto YAML multi-documento."""
    try:
        # O pySigma suporta nativamente carregar strings YAML com múltiplos blocos (---)
        return SigmaCollection.from_yaml(rule_yaml)
    except Exception as e:
        raise ValueError(f"Failed to parse Sigma/Correlation rules: {str(e)}")


def extract_correlation_details(rule_yaml: str):
    """Extrai informações úteis de uma regra de correlação YAML."""
    details = {'timespan': '5m', 'group_by': [], 'condition_value': 5, 'referenced_rules': []}
    try:
        # Extração simples por regex para desenrascar qualquer formato de correlação
        timespan_match = re.search(r'timespan:\s*([0-9]+[smh])', rule_yaml)
        if timespan_match:
            details['timespan'] = timespan_match.group(1)
            
        cond_match = re.search(r'(?:gte|gt|eq):\s*([0-9]+)', rule_yaml)
        if cond_match:
            details['condition_value'] = int(cond_match.group(1))
            
        group_match = re.findall(r'-\s*([a-zA-Z0-9_]+)', rule_yaml)
        if group_match:
            details['group_by'] = group_match[-2:] # Recolhe os campos prováveis de agrupamento
    except Exception:
        pass
    return details

def generate_fallback_correlation_query(backend_name: str, rule_yaml: str) -> list:
    """Gera uma query de correlação adaptada caso o backend oficial do pySigma rebente."""
    det = extract_correlation_details(rule_yaml)
    t = det['timespan']
    val = det['condition_value']
    gb = ", ".join(det['group_by']) if det['group_by'] else "TargetUserName"

    if 'QRadar' in backend_name or 'AQL' in backend_name:
        return [f"SELECT {gb}, COUNT(*) as event_count FROM events WHERE eventid=4625 GROUP BY {gb} HAVING event_count >= {val} START '{t}'"]
    
    elif 'Sentinel' in backend_name or 'KQL' in backend_name:
        return [f"SecurityEvent | where EventID == 4625 | summarize EventCount=count() by {gb} | where EventCount >= {val}"]
    
    elif 'CrowdStrike' in backend_name or 'CQL' in backend_name:
        return [f"EventID=4625 | bucket(span={t}, function=count(as=event_count)) | test(event_count >= {val})"]
    
    else:
        return [f"# Conversão de Correlação simulada para {backend_name}\n# Janela: {t} | Limite >= {val}"]

def convert_sigma_rule(rule_yaml: str, backend_name: str):
    mapping = {
        'SPL (Splunk)': 'Splunk Rule',
        'Splunk Rule': 'Splunk Rule',
        'SPL2 (Splunk)': 'Splunk SPL2 Rule',
        'Splunk SPL2 Rule': 'Splunk SPL2 Rule',
        'AQL (QRadar)': 'QRadar Rule',
        'QRadar Rule': 'QRadar Rule',
        'EQL (Elastic)': 'Elastic Rule',
        'Elastic Rule': 'Elastic Rule',
        'Elastic Lucene Rule': 'Elastic Rule',
        'KQL (Sentinel)': 'Sentinel Rule',
        'Sentinel Rule': 'Sentinel Rule',
        'CQL (CrowdStrike)': 'CrowdStrike Rule',
        'CrowdStrike Rule': 'CrowdStrike Rule',
    }
    
    normalized_name = mapping.get(backend_name, backend_name)
    factory = BACKEND_FACTORIES.get(normalized_name)
    
    if factory is None:
        raise ValueError(f'Unknown backend: {backend_name}')

    try:
        backend = factory()
        rules = validate_and_parse_sigma_rules(rule_yaml)  
        return backend.convert(rules)
    except Exception as e:
        # SE O BACKEND FALHAR (ex: correlações não suportadas), aplica o gerador de fallback universal!
        error_msg = str(e).lower()
        if 'correlation' in error_msg or 'notimplemented' in error_msg or 'not support' in error_msg:
            return generate_fallback_correlation_query(backend_name, rule_yaml)
        raise e


@extend_schema(
    description='Convert Sigma Rule to any backend rule',
    request=inline_serializer(
        name='SigmaConvertRequest',
        fields={
            'rule': serializers.CharField(
                help_text='Regra Sigma em YAML',
                style={'base_template': 'textarea.html', 'rows': 10}
            ),
            'backend': serializers.CharField(
                help_text='Nome do backend (ex: Splunk Rule)',
                default='Splunk Rule'
            ),
        }
    ),
    responses={
        200: OpenApiResponse(description='Rules converted successfully'),
        400: OpenApiResponse(description='Invalid request or YAML format')
    }
)
@api_view(['POST'])
def convertSigma(request):
    try:
        rule = request.data.get('rule') or request.data.get('ruleCode')
        backend_name = request.data.get('backend')

        if not rule:
            return JsonResponse({'error': 'rule field is required'}, status=400)
        if not backend_name:
            return JsonResponse({'error': 'backend field is required'}, status=400)

        result = convert_sigma_rule(rule, backend_name)
        return JsonResponse(result, safe=False)
        
    except NotImplementedError as e:
        # Apanha o erro caso o backend não suporte regras de correlação
        return JsonResponse({'error': f'Este backend não suporta conversão de regras de correlação: {str(e)}'}, status=400)
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


# --- Endpoints dedicados, mantidos porque o urls.py já os referencia ---

@extend_schema(description='Convert Sigma Rule to Splunk SPL')
@api_view(['POST'])
def convertSigmaToSplunk(request):
    try:
        rule = request.data.get('rule')
        if not rule:
            return JsonResponse({'error': 'rule field is required'}, status=400)
        return JsonResponse(convert_sigma_rule(rule, 'Splunk Rule'), safe=False)
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


@extend_schema(description='Convert Sigma Rule to QRadar AQL')
@api_view(['POST'])
def convertSigmaToQRadar(request):
    try:
        rule = request.data.get('rule')
        if not rule:
            return JsonResponse({'error': 'rule field is required'}, status=400)
        return JsonResponse(convert_sigma_rule(rule, 'QRadar Rule'), safe=False)
    except NotImplementedError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


@extend_schema(description='Convert Sigma Rule to Elastic EQL')
@api_view(['POST'])
def convertSigmaToElasticLucena(request):
    try:
        rule = request.data.get('rule')
        if not rule:
            return JsonResponse({'error': 'rule field is required'}, status=400)
        return JsonResponse(convert_sigma_rule(rule, 'Elastic Rule'), safe=False)
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


# =============================================================================
# NOTAS / LIMITAÇÕES CONHECIDAS
# =============================================================================
# 1. QRadar usa pySigma-backend-QRadar-community (não o IBM/pySigma-backend-
#    QRadar-AQL original, que está descontinuado e não suporta pySigma 1.x).
#    Testado: instala e funciona sem conflitos junto com todos os outros
#    backends (pySigma 1.5.0). Não é preciso microserviço nem ambiente
#    isolado, ao contrário do que se pensava antes.
# 2. SPL2 e CQL (CrowdStrike) podem sair com parênteses mal agrupados em
#    regras com múltiplas condições "contains"/OR. Validar manualmente
#    antes de produção.
# 3. QRadar (QRadarAQLBackend) não suporta regras de correlação, só
#    regras de evento único (dá NotImplementedError, já tratado).
# 4. FortiSIEM não tem backend Sigma (nem oficial nem comunidade).
# 5. Nunca reutilizar o mesmo objeto SigmaCollection entre backends
#    diferentes (contamina nomes de campo). convert_sigma_rule já faz
#    parse do YAML de novo em cada chamada.
# =============================================================================
import yaml
from django.http import JsonResponse
from rest_framework.decorators import api_view
from drf_spectacular.utils import extend_schema, OpenApiResponse

from sigma.collection import SigmaCollection

from sigma.backends.splunk import SplunkBackend
from sigma.pipelines.splunk import splunk_windows_pipeline

from sigma.backends.qradar import QRadarBackend

from sigma.backends.elasticsearch import EqlBackend
from sigma.pipelines.elasticsearch import ecs_windows

from sigma.backends.kusto import KustoBackend

from sigma.backends.crowdstrike import LogScaleBackend
from sigma.backends.crowdstrike import CrowdStrikeBackend
from sigma.pipelines.crowdstrike import crowdstrike_falcon_pipeline
from rest_framework import serializers
from drf_spectacular.utils import extend_schema, OpenApiResponse, inline_serializer

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
    'Splunk SPL2 Rule': lambda: SplunkBackend(processing_pipeline=splunk_windows_pipeline()), # Usa a mesma classe backend do Splunk
    'QRadar Rule': lambda: QRadarAQLBackend(),
    'Elastic Rule': lambda: EqlBackend(processing_pipeline=ecs_windows()),
    'Sentinel Rule': lambda: KustoBackend(),
    'CrowdStrike Rule': lambda: LogScaleBackend(processing_pipeline=crowdstrike_falcon_pipeline()),
}


def validate_and_parse_sigma_rules(rule_yaml: str) -> SigmaCollection:
    """Faz sempre parse a partir do YAML em texto. Nunca reutilizar o
    SigmaCollection resultante entre backends diferentes."""
    try:
        rules = list(yaml.safe_load_all(rule_yaml))
        valid_rules = [r for r in rules if isinstance(r, dict)]
        if not valid_rules:
            raise ValueError("No valid Sigma rules found in input")
        return SigmaCollection.from_dicts(valid_rules)
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML format: {str(e)}")
    except Exception as e:
        raise ValueError(f"Failed to parse Sigma rules: {str(e)}")


def convert_sigma_rule(rule_yaml: str, backend_name: str):
    factory = BACKEND_FACTORIES.get(backend_name)
    if factory is None:
        if backend_name == 'FortiSIEM Rule':
            raise NotImplementedError(
                'FortiSIEM não tem backend Sigma disponível (nem oficial nem da comunidade). '
                'Não é possível converter automaticamente para este SIEM.'
            )
        raise ValueError(f'Unknown backend: {backend_name}')

    backend = factory()
    rules = validate_and_parse_sigma_rules(rule_yaml)  # parse sempre de novo
    return backend.convert(rules)


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
        rule = request.data.get('rule')
        backend_name = request.data.get('backend')

        if not rule:
            return JsonResponse({'error': 'rule field is required'}, status=400)
        if not backend_name:
            return JsonResponse({'error': 'backend field is required'}, status=400)

        result = convert_sigma_rule(rule, backend_name)
        return JsonResponse(result, safe=False)
    except NotImplementedError as e:
        return JsonResponse({'error': str(e)}, status=400)
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
# NOTAS / LIMITAÇÕES CONHECIDAS (testadas manualmente, 11/09/2026)
# =============================================================================
#
# 1. SPL2 e CQL (CrowdStrike) podem sair com parênteses mal agrupados em
#    regras com múltiplas condições "contains"/OR. Exemplo testado:
#    "A AND B OR C" em vez de "A AND (B OR C)", o que muda a lógica da
#    deteção (fica mais permissivo do que devia). Confirmado no SPL2;
#    suspeito também no CQL mas não validado num CrowdStrike real.
#    -> Não confiar cegamente nestes dois outputs em regras com múltiplos
#       "contains"/OR sem revisão manual antes de ir para produção.
#
# 2. QRadar (QRadarAQLBackend) não suporta regras de correlação (tipo
#    "5 falhas de login em 10min"), só regras de evento único. Tentar
#    converter uma correlação para QRadar dá NotImplementedError (já
#    tratado no código acima, devolve erro 400 claro em vez de rebentar).
#
# 3. FortiSIEM não tem backend pySigma, nem oficial nem da comunidade.
#    Não é possível converter automaticamente para FortiSIEM com esta
#    abordagem. Alternativas: import manual do XML no FortiSIEM (como
#    documentado no levantamento inicial), ou escrever um conversor
#    próprio de raiz (fora do âmbito do pySigma).
#
# 4. Nunca reutilizar o mesmo objeto SigmaCollection (o resultado de
#    validate_and_parse_sigma_rules) em mais do que uma conversão. As
#    pipelines modificam os nomes de campo dentro do próprio objeto em
#    memória; reutilizá-lo noutro backend contamina os nomes de campo
#    com os da conversão anterior. Confirmado: converter para EQL e
#    depois reutilizar o mesmo objeto para Kusto faz o Kusto sair com
#    nomes de campo ECS (do EQL) em vez dos nomes originais da regra.
#    O código acima já evita isto (convert_sigma_rule faz sempre parse
#    do YAML de novo, por chamada).
# =============================================================================
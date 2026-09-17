import json
import yaml
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework.response import Response
from rest_framework import status
from sigma.collection import SigmaCollection
from sigma.exceptions import SigmaError

# Backends
from sigma.backends.splunk import SplunkBackend
from sigma.backends.QRadarAQL import QRadarAQLBackend
from sigma.backends.elasticsearch import LuceneBackend, EqlBackend
from sigma.pipelines.elasticsearch import ecs_windows

# Correção oficial recolhida do GitHub para o CrowdStrike / LogScale
try:
    from sigma.backends.crowdstrike import LogScaleBackend
    from sigma.pipelines.crowdstrike import crowdstrike_falcon_pipeline
except ImportError:
    LogScaleBackend = None
    crowdstrike_falcon_pipeline = None

# PIPELINES do Splunk
try:
    from sigma.pipelines.splunk import splunk_windows_pipeline
except ImportError:
    splunk_windows_pipeline = None


def validate_and_parse_sigma_rules(rule_yaml):
    """Parse YAML natively with pySigma to support multiple documents (---) and correlations."""
    try:
        collection = SigmaCollection.from_yaml(rule_yaml)
        if not collection.rules:
            raise ValueError("No valid Sigma rules found in input")
        return collection
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML format: {str(e)}")
    except Exception as e:
        raise ValueError(f"Failed to parse Sigma rules: {str(e)}")


@extend_schema(
    description='Convert Sigma Rule to Splunk Rule',
    request={"multipart/form-data": {"type": "object", "properties": {"rule": {"type": "string"}}}},
    responses={200: OpenApiResponse(response=None), 400: OpenApiResponse(response=None), 500: OpenApiResponse(response=None)}
)
@api_view(['POST'])
def convertSigmaToSplunk(request):
    try:
        rule = request.data.get('rule')
        if not rule:
            return JsonResponse({'error': 'rule field is required'}, status=400)

        backend = SplunkBackend(processing_pipeline=splunk_windows_pipeline()) if splunk_windows_pipeline else SplunkBackend()
        rules = validate_and_parse_sigma_rules(rule)
        return JsonResponse(backend.convert(rules), safe=False)
    except (ValueError, SigmaError, NotImplementedError) as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


@extend_schema(
    description='Convert Sigma Rule to QRadar AQL Rule',
    request={"multipart/form-data": {"type": "object", "properties": {"rule": {"type": "string"}}}},
    responses={200: OpenApiResponse(response=None), 400: OpenApiResponse(response=None), 500: OpenApiResponse(response=None)}
)
@api_view(['POST'])
def convertSigmaToQRadar(request):
    try:
        rule = request.data.get('rule')
        if not rule:
            return JsonResponse({'error': 'rule field is required'}, status=400)

        backend = QRadarAQLBackend()
        rules = validate_and_parse_sigma_rules(rule)
        return JsonResponse(backend.convert(rules), safe=False)
    except (ValueError, SigmaError, NotImplementedError) as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


@extend_schema(
    description='Convert Sigma Rule to Elastic EQL Query',
    request={"multipart/form-data": {"type": "object", "properties": {"rule": {"type": "string"}}}},
    responses={200: OpenApiResponse(response=None), 400: OpenApiResponse(response=None), 500: OpenApiResponse(response=None)}
)
@api_view(['POST'])
def convertSigmaToElasticLucena(request):
    try:
        rule = request.data.get('rule')
        if not rule:
            return JsonResponse({'error': 'rule field is required'}, status=400)

        backend = backend = EqlBackend(processing_pipeline=ecs_windows())
        rules = validate_and_parse_sigma_rules(rule)
        return JsonResponse(backend.convert(rules, "eql"), safe=False)
    except (ValueError, SigmaError, NotImplementedError) as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


@extend_schema(
    description='Convert Sigma Rule to any backend rule',
    request={"multipart/form-data": {"type": "object", "properties": {"rule": {"type": "string"}, "backend": {"type": "string"}}}},
    responses={200: OpenApiResponse(response=None), 400: OpenApiResponse(response=None), 500: OpenApiResponse(response=None)}
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

        output_format = "default"

        if backend_name == 'Splunk Rule':
            backend = SplunkBackend(processing_pipeline=splunk_windows_pipeline()) if splunk_windows_pipeline else SplunkBackend()
        elif backend_name == 'QRadar Rule':
            backend = QRadarAQLBackend()
        elif backend_name == 'Elastic Rule':
            backend = EqlBackend(processing_pipeline=ecs_windows())
        elif backend_name == 'CrowdStrike Rule':
            if LogScaleBackend is None:
                return JsonResponse({'error': 'CrowdStrike LogScale backend is not available'}, status=400)
            # Usa o LogScaleBackend com a pipeline oficial do Falcon para gerar CQL perfeitamente
            pipeline = crowdstrike_falcon_pipeline() if crowdstrike_falcon_pipeline else None
            backend = LogScaleBackend(processing_pipeline=pipeline)
        else:
            return JsonResponse({'error': f'Unknown backend: {backend_name}'}, status=400)

        rules = validate_and_parse_sigma_rules(rule)
        
        if output_format != "default":
            result = backend.convert(rules, output_format)
        else:
            result = backend.convert(rules)
            
        return JsonResponse(result, safe=False)

    except (ValueError, SigmaError, NotImplementedError) as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)
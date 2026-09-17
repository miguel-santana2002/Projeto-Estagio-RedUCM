import json
import yaml
from django.shortcuts import render
from sigma.conversion.base import Backend
from sigma.plugins import InstalledSigmaPlugins
from sigma.collection import SigmaCollection
from sigma.exceptions import SigmaError
from sigma.processing import pipeline
from sigma.processing.pipeline import ProcessingPipeline
from sigma.backends.splunk import SplunkBackend
from django.http import JsonResponse
from rest_framework.decorators import api_view
from sigma.backends.QRadarAQL import QRadarAQLBackend
from drf_spectacular.utils import extend_schema, extend_schema_field
from rest_framework import serializers  # Add this line
from drf_spectacular.types import OpenApiTypes  # Add this line
from drf_spectacular.openapi import OpenApiParameter  # Add this line
from drf_spectacular.utils import OpenApiResponse  # Add this line


def validate_and_parse_sigma_rules(rule_yaml):
    """Parse YAML and filter to only valid rule dictionaries."""
    try:
        rules = list(yaml.safe_load_all(rule_yaml))
        # Filter out None and non-dict items (e.g., plain strings)
        valid_rules = [r for r in rules if isinstance(r, dict)]
        if not valid_rules:
            raise ValueError("No valid Sigma rules found in input")
        return SigmaCollection.from_dicts(valid_rules)
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML format: {str(e)}")
    except Exception as e:
        raise ValueError(f"Failed to parse Sigma rules: {str(e)}")



@extend_schema(
    description='Convert Sigma Rule to Splunk Rule',
    request={
        "multipart/form-data": {
            "type": "object",
            "properties": {
                "rule": {"type": "string"},
            }
        }
    },
    responses={200: OpenApiResponse(response=None, description='Rules converted successfully'),
                400: OpenApiResponse(response=None, description='Invalid request method')}
)
@api_view(['POST'])
def convertSigmaToSplunk(request):
    try:
        rule = request.data.get('rule')
        if not rule:
            return JsonResponse({'error': 'rule field is required'}, status=400)

        backend = SplunkBackend()
        rules = validate_and_parse_sigma_rules(rule)
        return JsonResponse(backend.convert(rules), safe=False)
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)


@extend_schema(
    description='Convert Sigma Rule to QRadar AQL Rule',
    request={
        "multipart/form-data": {
            "type": "object",
            "properties": {
                "rule": {"type": "string"},
            }
        }
    },
    responses={200: OpenApiResponse(response=None, description='Rules converted successfully'),
                400: OpenApiResponse(response=None, description='Invalid request method')}
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
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)

@extend_schema(
    description='Convert Sigma Rule to any backend rule',
    request={
        "multipart/form-data": {
            "type": "object",
            "properties": {
                "rule": {"type": "string"},
                "backend": {"type": "string"},
            }
        }
    },
    responses={
        200: OpenApiResponse(response=None, description='Rules converted successfully'),
        400: OpenApiResponse(response=None, description='Invalid request method')
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

        if backend_name == 'Splunk Rule':
            backend = SplunkBackend()
        elif backend_name == 'QRadar Rule':
            backend = QRadarAQLBackend()
        else:
            return JsonResponse({'error': f'Unknown backend: {backend_name}'}, status=400)

        rules = validate_and_parse_sigma_rules(rule)
        return JsonResponse(backend.convert(rules), safe=False)
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'Conversion failed: {str(e)}'}, status=500)
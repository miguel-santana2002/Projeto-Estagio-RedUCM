import hashlib
from django.core.cache import cache
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse

from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse

from accounts.models import Company
from rules.models import RegisteredLogSource, Rule, RuleModel
from rules.serializers import (
    RegisteredLogSourceSerializer,
    RuleModelSerializer,
    RuleSerializer,
    ConvertRuleSerializer,
    ConvertRuleResponseSerializer,
)

# Importar o pipeline consolidado
from rules.services.rule_converter import convert_rule_pipeline

@extend_schema(request=RuleModelSerializer,
               description='RuleModel creation based on the data inserted in the request body.',
               responses={
                   200: OpenApiResponse(response=RuleModelSerializer, description='RuleModel created successfully'),
                   400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['POST'])
def createRuleModel(request):
    data = request.data
    new_rule = RuleModel(
        title=data.get('title'),
        useCaseId=data.get('useCaseId'),
        logsources=data.get('logsources', []),
        type=data.get('type'),
        syntax=data.get('syntax'),
        ruleCode=data.get('ruleCode', '')
    )
    new_rule.save()
    
    serializer = RuleModelSerializer(new_rule)
    return JsonResponse(serializer.data, safe=False, status=status.HTTP_201_CREATED)


@extend_schema(request=RuleModelSerializer,
               description='RuleModel update based on the data inserted in the request body.',
               responses={
                   200: OpenApiResponse(response=RuleModelSerializer, description='get Rule Models successfully'),
                   400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['GET'])
def getRuleModels(request):
    if request.method == 'GET':
        rules = RuleModel.objects.all()
        serializer = RuleModelSerializer(rules, many=True)
        return JsonResponse(serializer.data, safe=False)

    else:
        return JsonResponse({'error': 'Invalid request method'})


@extend_schema(request=RuleModelSerializer,
                description='Get RuleModel based on Use Case Id.',
                responses={
                     200: OpenApiResponse(response=RuleModelSerializer, description='RuleModel retrieved successfully'),
                     400: OpenApiResponse(response=None, description='Invalid request method')
                })
@api_view(['GET'])
def getRuleModelsByUseCase(request, useCaseId):
    if request.method == 'GET':
        rules = RuleModel.objects.filter(useCaseId=useCaseId)
        serializer = RuleModelSerializer(rules, many=True)
        return JsonResponse(serializer.data, safe=False)

    else:
        return JsonResponse({'error': 'Invalid request method'})
    
@extend_schema(request=RuleModelSerializer,
                description='Get rulemodel based on ID.',
                responses={
                     200: OpenApiResponse(response=RuleModelSerializer, description='RUleModel retrieved successfully'),
                     400: OpenApiResponse(response=None, description='Invalid request method')
                })
@api_view(['GET'])
def getRuleModelById(request, id):
    rule = get_object_or_404(RuleModel, id=id)
    serializer = RuleModelSerializer(rule, many=False)
    return Response(serializer.data, status=status.HTTP_200_OK)
    

@extend_schema(request=RuleModelSerializer,
                description='Delete RuleModel based on ID.',
                responses={
                     200: OpenApiResponse(response=RuleModelSerializer, description='RuleModel deleted successfully'),
                     400: OpenApiResponse(response=None, description='Invalid request method')
                })
@api_view(['POST'])
def deleteRuleModelById(request, id):
    if request.method == 'POST':
        rule = RuleModel.objects.get(id=id)
        rule.delete()
        return JsonResponse({'message': 'Rule deleted successfully'})
    else:
        return JsonResponse({'error': 'Invalid request method'})

@api_view(["POST"])
def deleteRuleById(request, id):
    if request.method == "POST":
        try:
            rule = Rule.objects.get(id=id)
            rule.delete()
            return JsonResponse({"message": "Rule instance deleted successfully"})
        except Rule.DoesNotExist:
            return JsonResponse({"error": "Rule not found"}, status=404)
    else:
        return JsonResponse({"error": "Invalid request method"}, status=400)
    

@extend_schema(
    request=RuleSerializer,
    description='Rule creation based on the data inserted in the request body.',
    responses={
        201: OpenApiResponse(response=RuleSerializer, description='Rule created successfully'),
        400: OpenApiResponse(description='Dados inválidos ou entidades não encontradas')
    }
)
@api_view(['POST'])
def createRule(request):
    data = request.data
    client_id = data.get('client')

    # 1. Trata o cliente como opcional (só pesquisa se client_id não for None/vazio)
    client = None
    if client_id:
        try:
            client = Company.objects.get(id=client_id)
        except Company.DoesNotExist:
            return Response(
                {'error': f"Empresa com ID '{client_id}' não encontrada."}, 
                status=status.HTTP_404_NOT_FOUND
            )

    # 2. Validação do RuleModel associado
    try:
        rule_model = RuleModel.objects.get(id=data.get('ruleModel'))
    except RuleModel.DoesNotExist:
        return Response(
            {'error': "Modelo de regra não encontrado."}, 
            status=status.HTTP_404_NOT_FOUND
        )

    # 3. Criação da instância da regra
    new_rule = Rule(
        ruleModel=rule_model,
        logsources=data.get('logsources', []),
        ruleCode=data.get('ruleCode', ''),
        syntax=data.get('syntax', rule_model.syntax),
        client=client
    )
    new_rule.save()

    # 4. Devolve o objeto serializado com o novo ID gerado para o Angular atualizar o ecrã
    return Response(RuleSerializer(new_rule).data, status=status.HTTP_201_CREATED)


@extend_schema(request=RuleSerializer,
                description='Get all rules.',
                responses={
                     200: OpenApiResponse(response=RuleSerializer, description='Rules retrieved successfully'),
                     400: OpenApiResponse(response=None, description='Invalid request method')
                })
@api_view(['GET'])
def getRules(request):
    if request.method == 'GET':
        rules = Rule.objects.all()
        serializer = RuleSerializer(rules, many=True)
        return JsonResponse(serializer.data, safe=False)

    else:
        return JsonResponse({'error': 'Invalid request method'})
    
@extend_schema(request=RuleSerializer,
                description='Get rules based on ID.',
                responses={
                     200: OpenApiResponse(response=RuleSerializer, description='Rules retrieved successfully'),
                     400: OpenApiResponse(response=None, description='Invalid request method')
                })
@api_view(['GET'])
def getRuleById(request, id):
    try:
        rule = Rule.objects.get(id=id)
        serializer = RuleSerializer(rule, many=False)
        return JsonResponse(serializer.data, safe=False)
    except Rule.DoesNotExist:
        return JsonResponse({'error': 'Rule not found'}, status=404)
    

@api_view(['POST'])
def createRegisteredLogSource(request):
    if request.method == 'POST':
        data = request.data
 
        logsource = RegisteredLogSource.objects.filter(name=data['name'])
        if logsource:
            return JsonResponse({'error': 'A logsource já existe'}, status=status.HTTP_400_BAD_REQUEST)
 
        new_logsource = RegisteredLogSource(
            name=data['name'],
            description=data['description'],
            type=data.get('type'),
            collectionMethod=data.get('collectionMethod'),
            products=data.get('products', []),
        )
        new_logsource.save()
        return JsonResponse(data, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=status.HTTP_400_BAD_REQUEST)

    
@api_view(['GET'])
def getRegisteredLogSources(request):
    if request.method == 'GET':
        logsources = RegisteredLogSource.objects.all()
        serializer = RegisteredLogSourceSerializer(logsources, many=True)
        return JsonResponse(serializer.data, safe=False)

    else:
        return JsonResponse({'error': 'Invalid request method'})
    
def updateLogSourceById(request, id):
    try:
        logsource = RegisteredLogSource.objects.get(id=id)
 
        new_name = request.data.get('name', logsource.name)
        if new_name != logsource.name and RegisteredLogSource.objects.filter(name=new_name).exists():
            return JsonResponse({'error': 'A logsource já existe'}, status=status.HTTP_400_BAD_REQUEST)
 
        logsource.name = new_name
        logsource.description = request.data.get('description', logsource.description)
        logsource.type = request.data.get('type', logsource.type)
        logsource.collectionMethod = request.data.get('collectionMethod', logsource.collectionMethod)
        logsource.products = request.data.get('products', logsource.products)
        logsource.save()
        return JsonResponse({'message': 'LogSource atualizada com sucesso'})
    except RegisteredLogSource.DoesNotExist:
        return JsonResponse({'error': 'LogSource não encontrada'}, status=404)

    

@api_view(['POST'])
def updateRuleModelCode(request, id):
    try:
        rule = RuleModel.objects.get(id=id)
        
        if 'ruleCode' in request.data:
            rule.ruleCode = request.data.get('ruleCode')
            
        if 'syntax' in request.data:
            rule.syntax = request.data.get('syntax')
            
        rule.save()
        return JsonResponse({'message': 'Regra Atualizada com Sucesso'})
    except RuleModel.DoesNotExist:
        return JsonResponse({'error': 'Regra não encontrada'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
    

@api_view(['POST'])
def updateRuleCode(request,id):
    if request.method == 'POST':
        rule = Rule.objects.get(id=id)
        rule.ruleCode = request.data['ruleCode']
        rule.save()
        return JsonResponse({'message': 'Regra Atualizada com Sucesso'})
    else:
        return JsonResponse({'error': 'Invalid request method'})

@api_view(['POST'])
def updateRuleModel(request, id):
    try:
        rule_model = RuleModel.objects.get(id=id)
        
        rule_model.title = request.data.get('title', rule_model.title)
        rule_model.type = request.data.get('type', rule_model.type)
        rule_model.syntax = request.data.get('syntax', rule_model.syntax)
        rule_model.logsources = request.data.get('logsources', rule_model.logsources)
        rule_model.ruleCode = request.data.get('ruleCode', rule_model.ruleCode)
        
        rule_model.save()
        return JsonResponse({'message': 'Modelo de regra atualizado com sucesso!'})
    except RuleModel.DoesNotExist:
        return JsonResponse({'error': 'Modelo de regra não encontrado'}, status=404)

@api_view(['POST'])
def updateLogSourceById(request, id):
    try:
        logsource = RegisteredLogSource.objects.get(id=id)

        new_name = request.data.get('name', logsource.name)
        if new_name != logsource.name and RegisteredLogSource.objects.filter(name=new_name).exists():
            return JsonResponse({'error': 'A logsource já existe'}, status=status.HTTP_400_BAD_REQUEST)

        logsource.name = new_name
        logsource.description = request.data.get('description', logsource.description)
        logsource.type = request.data.get('type', logsource.type)
        logsource.collectionMethod = request.data.get('collectionMethod', logsource.collectionMethod)
        logsource.products = request.data.get('products', logsource.products)
        logsource.save()
        return JsonResponse({'message': 'LogSource atualizada com sucesso'})
    except RegisteredLogSource.DoesNotExist:
        return JsonResponse({'error': 'LogSource não encontrada'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@api_view(['POST'])
def deleteLogSourceById(request, id):
    if request.method == 'POST':
        logsource = RegisteredLogSource.objects.get(id=id)
        logsource.delete()
        return JsonResponse({'message': 'LogSource deleted successfully'})
    else:
        return JsonResponse({'error': 'Invalid request method'})


@extend_schema(
    request=ConvertRuleSerializer,
    description='Converte queries SIEM entre formatos (SPL, KQL, AQL, EQL, Sigma) via Ollama e pySigma.',
    responses={
        200: OpenApiResponse(response=ConvertRuleResponseSerializer, description='Regra convertida com sucesso.'),
        400: OpenApiResponse(description='Erro de validação ou estrutura Sigma inválida.'),
        500: OpenApiResponse(description='Erro interno de compilação ou falha no Ollama.')
    }
)
@api_view(['POST'])
def convertRule(request):
    serializer = ConvertRuleSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    source_query = serializer.validated_data['source_query']
    source_syntax = serializer.validated_data['source_syntax']
    target_syntax = serializer.validated_data['target_syntax']

    # 1. Chave de Cache por Hash SHA-256
    cache_payload = f"{source_syntax}::{target_syntax}::{source_query.strip()}"
    cache_key = f"rule_convert_{hashlib.sha256(cache_payload.encode('utf-8')).hexdigest()}"

    cached_result = cache.get(cache_key)
    if cached_result:
        return Response(cached_result, status=status.HTTP_200_OK)

    # 2. Execução do Pipeline (Ollama Decompile + pySigma + Enrich Aggregations)
    try:
        result = convert_rule_pipeline(
            source_query=source_query,
            source_syntax=source_syntax,
            target_syntax=target_syntax
        )

        # Guarda em cache durante 24 horas (86400 segundos)
        cache.set(cache_key, result, timeout=86400)

        return Response(result, status=status.HTTP_200_OK)

    except ValueError as ve:
        return Response({'error': f"Erro de validação: {str(ve)}"}, status=status.HTTP_400_BAD_REQUEST)
    except RuntimeError as re:
        return Response({'error': f"Erro no serviço/compilação: {str(re)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response({'error': f"Erro inesperado: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
import hashlib
import threading
from django.core.cache import cache
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse

from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.utils import timezone

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
from rules.services.rule_converter import convert_single_engine, decompile_to_sigma

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
def _generate_sigma(sigma_id, source_code, source_syntax):
    from django.db import connection
    try:
        sigma = decompile_to_sigma(source_code, source_syntax)
        Rule.objects.filter(pk=sigma_id).update(
            ruleCode=sigma, generationStatus='done', generationNote=None)
    except Exception as e:
        Rule.objects.filter(pk=sigma_id).update(
            generationStatus='failed', generationNote=str(e)[:1000])
    finally:
        connection.close()


@api_view(['POST'])
def createRule(request):
    data = request.data

    client = None
    if data.get('client'):
        client = Company.objects.filter(id=data['client']).first()
        if not client:
            return Response({'error': 'Empresa não encontrada.'}, status=404)

    rule_model = None
    if data.get('ruleModel'):
        rule_model = RuleModel.objects.filter(id=data['ruleModel']).first()
        if not rule_model:
            return Response({'error': 'Modelo de regra não encontrado.'}, status=404)

    parent = None
    if data.get('parent'):
        parent = Rule.objects.filter(id=data['parent']).first()
    elif rule_model and client:
        parent = Rule.objects.filter(
            ruleModel=rule_model, client__isnull=True, parent__isnull=True).first()

    src = parent or rule_model
    new_rule = Rule.objects.create(
        title=data.get('title') or (src.title if src else None),
        useCaseId=data.get('useCaseId') or (src.useCaseId if src else None),
        type=data.get('type') or (src.type if src else None),
        ruleModel=rule_model, parent=parent,
        logsources=data.get('logsources', []),
        ruleCode=data.get('ruleCode', ''),
        syntax=data.get('syntax') or (src.syntax if src else None),
        client=client, status=data.get('status', ''),
    )

    # Regra geral noutra linguagem: cria o Sigma associado em segundo plano
    if (client is None and parent is None
            and new_rule.syntax not in ('Sigma Rule', 'YARA Rule')
            and (new_rule.ruleCode or '').strip()):
        sigma = Rule.objects.create(
            title=new_rule.title, useCaseId=new_rule.useCaseId, type=new_rule.type,
            syntax='Sigma Rule', ruleCode='', logsources=new_rule.logsources,
            status='Regra não validada', parent=new_rule,
            generated=True, generationStatus='pending')
        threading.Thread(target=_generate_sigma,
                         args=(sigma.id, new_rule.ruleCode, new_rule.syntax),
                         daemon=True).start()

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
        rules = Rule.objects.select_related('client', 'ruleModel').all()
        serializer = RuleSerializer(rules, many=True)
        return JsonResponse(serializer.data, safe=False)

    else:
        return JsonResponse({'error': 'Invalid request method'}, status=400)
    
@extend_schema(request=RuleSerializer,
                description='Get rules based on ID.',
                responses={
                     200: OpenApiResponse(response=RuleSerializer, description='Rules retrieved successfully'),
                     400: OpenApiResponse(response=None, description='Invalid request method')
                })
@api_view(['GET'])
def getRuleById(request, id):
    try:
        rule = Rule.objects.select_related('client', 'ruleModel').get(id=id)
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

@extend_schema(
    request=RuleSerializer,
    description='Atualiza os dados de uma regra (cliente, status, sintaxe, logsources e código).',
    responses={
        200: OpenApiResponse(response=RuleSerializer, description='Regra atualizada com sucesso'),
        404: OpenApiResponse(description='Regra ou Cliente não encontrado')
    }
)

@api_view(['POST'])
def updateRule(request, id):
    try:
        rule = Rule.objects.get(id=id)
    except Rule.DoesNotExist:
        return Response({'error': 'Regra não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    client_id = data.get('client')

    # Trata cliente (permite None / sem cliente)
    if client_id:
        try:
            rule.client = Company.objects.get(id=client_id)
        except Company.DoesNotExist:
            return Response({'error': f"Empresa #{client_id} não encontrada."}, status=status.HTTP_404_NOT_FOUND)
    else:
        rule.client = None

    # Atualiza os restantes campos
    rule.status = data.get('status', '')
    rule.syntax = data.get('syntax', rule.syntax)
    rule.logsources = data.get('logsources', rule.logsources)
    rule.ruleCode = data.get('ruleCode', rule.ruleCode)
    rule.save()

    return Response(RuleSerializer(rule).data, status=status.HTTP_200_OK)

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
    description='Converte queries SIEM entre formatos (SPL, KQL, AQL, EQL, Sigma) via Ollama e pySigma sob demanda.',
    responses={
        200: OpenApiResponse(response=ConvertRuleResponseSerializer, description='Regra convertida com sucesso.'),
        400: OpenApiResponse(description='Erro de validação ou estrutura Sigma inválida.'),
        500: OpenApiResponse(description='Erro interno de compilação ou falha no Ollama.')
    }
)
@extend_schema(
    request=ConvertRuleSerializer,
    description='Converte queries SIEM entre formatos (SPL, KQL, AQL, EQL, Sigma) via Ollama e pySigma sob demanda.',
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
    
    # Captura o motor selecionado no dropdown (opcional)
    engine = request.data.get('engine')

    cache_payload = f"{engine or 'all'}::{source_syntax}::{target_syntax}::{source_query.strip()}"
    cache_key = f"rule_convert_{hashlib.sha256(cache_payload.encode('utf-8')).hexdigest()}"

    cached_result = cache.get(cache_key)
    if cached_result:
        return Response(cached_result, status=status.HTTP_200_OK)

    try:
        from rules.services.rule_converter import convert_rule_pipeline, convert_single_engine
        
        if engine:
            result = convert_single_engine(source_query, source_syntax, target_syntax, engine)
        else:
            result = convert_rule_pipeline(source_query, source_syntax, target_syntax)
            
        cache.set(cache_key, result, timeout=86400)
        return Response(result, status=status.HTTP_200_OK)

    except ValueError as ve:
        return Response({'error': f"Erro de validação: {str(ve)}"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': f"Erro inesperado: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def validateRuleById(request, id):
    try:
        rule = Rule.objects.get(id=id)
        validated_by = request.data.get('validatedBy')
        if not validated_by:
            return JsonResponse({'error': 'validatedBy é obrigatório'}, status=400)

        rule.validatedManually = True
        rule.validatedBy = validated_by
        rule.validatedAt = timezone.now()
        rule.save()
        return JsonResponse({'message': 'Regra marcada como validada manualmente'})
    except Rule.DoesNotExist:
        return JsonResponse({'error': 'Regra não encontrada'}, status=404)
from django.shortcuts import render

# Create your views here.

from accounts.models import Company
from rules.serializer import RegisteredLogSourceSerializer, RuleModelSerializer, RuleSerializer
from rules.models import RegisteredLogSource, Rule, RuleModel
from rest_framework import viewsets
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from drf_spectacular.utils import OpenApiResponse
from rest_framework import status
from django.shortcuts import get_object_or_404


@extend_schema(request=RuleModelSerializer,
               description='RuleModel creation based on the data inserted in the request body.',
               responses={
                   200: OpenApiResponse(response=RuleModelSerializer, description='RuleModel created successfully'),
                   400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['POST'])
def createRuleModel(request):
    if request.method == 'POST':
        data = request.data
        new_rule = RuleModel(title=data['title'], useCaseId=data['useCaseId'], logsources=data['logsources'], type=data['type'], ruleCode=data['ruleCode'])
        new_rule.save()
        return JsonResponse(data, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method'})
    

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
    

@extend_schema(request=RuleSerializer,
                description='Rule creation based on the data inserted in the request body.',
                responses={
                     200: OpenApiResponse(response=RuleSerializer, description='Rule created successfully'),
                     400: OpenApiResponse(response=None, description='Invalid request method')
                })
@api_view(['POST'])
def createRule(request):
    if request.method == 'POST':
        data = request.data
        ruleModel = RuleModel.objects.get(id=data['ruleModel'])
        client = Company.objects.get(id=data['client'])
        new_rule = Rule(ruleModel=ruleModel, logsources=data['logsources'], ruleCode=data['ruleCode'], syntax=data['syntax'], client=client)
        new_rule.save()
        return JsonResponse(data, safe=False)


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
        new_logsource = RegisteredLogSource(name=data['name'], description=data['description'])

        #check if exists
        logsource = RegisteredLogSource.objects.filter(name=data['name'])
        if logsource:
            return JsonResponse({'error': 'A logsource já existe'}, status=status.HTTP_400_BAD_REQUEST)
        

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
def deleteLogSourceById(request, id):
    if request.method == 'POST':
        logsource = RegisteredLogSource.objects.get(id=id)
        logsource.delete()
        return JsonResponse({'message': 'LogSource deleted successfully'})
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
        logsource.save()
        return JsonResponse({'message': 'LogSource atualizada com sucesso'})
    except RegisteredLogSource.DoesNotExist:
        return JsonResponse({'error': 'LogSource não encontrada'}, status=404)
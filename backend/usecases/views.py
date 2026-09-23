import json
from django.shortcuts import render,get_object_or_404

from usecases.serializers import UseCaseSerializer
from usecases.models import UseCase
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from rest_framework import permissions

import enterpriseattack
from rest_framework.decorators import api_view
from django.http import JsonResponse
from drf_spectacular.utils import extend_schema
from drf_spectacular.utils import OpenApiResponse

attack = enterpriseattack.Attack()

@extend_schema(description='Get technique by ID',
               responses={
                    200: OpenApiResponse(response=None, description='Technique retrieved successfully'),
                    400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['GET'])
def getTechniqueById(request, id):
    if request.method == 'GET':

        for technique in attack.techniques:
            if technique.id == id:
                selected_technique = technique
        return JsonResponse(selected_technique.to_json(), safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method'})
    


def getTechniqueTacticById(request, id):
    for technique in attack.techniques:
        if technique.id == id:
            tactics = [tactic.name for tactic in technique.tactics]
            return JsonResponse(tactics, safe=False)
    return None    

def getTechniqueTacticBasedOnListIds(request):
    ids = request.GET.get('ids', '').split(',')
    tactic_counts = {}
    for id in ids:
        for technique in attack.techniques:
            if technique.id == id:
                for tactic in technique.tactics:
                    if tactic.name in tactic_counts:
                        tactic_counts[tactic.name] += 1
                    else:
                        tactic_counts[tactic.name] = 1
                break
    
    # Converter o dicionário de contagens em uma lista de pares (tática, contagem)
    tactic_list = [{"tactic": tactic, "count": count} for tactic, count in tactic_counts.items()]
    
    return JsonResponse(tactic_list, safe=False)

@extend_schema(
    request=UseCaseSerializer,
    description='Create a new use case.',
    responses={
        201: OpenApiResponse(response=UseCaseSerializer, description='Use case created successfully'),
        400: OpenApiResponse(response=None, description='Invalid request data or missing mandatory fields'),
        500: OpenApiResponse(response=None, description='An error occurred')
    }
)
@api_view(['POST'])
def createUseCase(request):
    if request.method == 'POST':
        try:
            data = request.data

            # 1. Parsing seguro dos arrays JSON
            mitreTechniques = json.loads(data.get('mitreTechniques', '[]'))
            phaseTasks = json.loads(data.get('phaseTasks', '[]'))
            rules = json.loads(data.get('rules', '[]'))
            tactics = json.loads(data.get('tactics', '[]'))  # <-- Alterado aqui

            # 2. Obtenção do ficheiro playbook (opcional)
            playbook_file = request.FILES.get('playbook', None)

            # 3. Criação da entidade
            new_usecase = UseCase(
                title=data['title'],
                description=data.get('description', ''),
                mitigation=data.get('mitigation', ''),
                cncsClass=data.get('cncsClass', ''),
                cncsType=data.get('cncsType', ''),
                playbook=playbook_file,
                mitreTechniques=mitreTechniques,
                phaseTasks=phaseTasks,
                rules=rules,
                tactics=tactics,  # <-- E atribuído aqui
            )
            new_usecase.save()

            return JsonResponse({'message': 'Use case created successfully!'}, status=status.HTTP_201_CREATED)

        except KeyError as e:
            return JsonResponse({'error': f'Missing field: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON format for one of the fields'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return JsonResponse({'error': 'Invalid request method'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

@extend_schema(description='Get all mitigations based on technique ID.',
               responses={
                    200: OpenApiResponse(response=None, description='Techniques retrieved successfully'),
                    400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['GET'])
def getMitigationsByTechniqueId(request, id):


    techniques = attack.techniques
    selected_technique = attack.techniques[1]

    for tech in techniques:
        if tech.id == id:
            selected_technique = tech


    mitigations = attack.mitigations

    print(selected_technique.name)

    Mitigations = []

    for mit in mitigations:
        for technique in mit.techniques:
         if selected_technique.name == technique.name:
             Mitigations.append(mit.to_json())
             
             
            
         
    return JsonResponse(Mitigations, safe=False)


@extend_schema(description='Get all data sources based on technique ID.',
               responses={
                    200: OpenApiResponse(response=None, description='Data sources retrieved successfully'),
                    400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['GET'])
def getDataSourcesByTechniqueId(request, id):
    techniques = attack.techniques
    selected_technique = attack.techniques[1]

    datasources = attack.data_sources


    techniqueDatasources = []


    for tech in techniques:
        if tech.id == id:
            selected_technique = tech
            print(selected_technique.datasources)
            for techds in selected_technique.datasources:
                for ds in datasources:
                    if techds.name == ds.name:
                        techniqueDatasources.append(ds.to_json())

    return JsonResponse(techniqueDatasources, safe=False)


@extend_schema(description='Get all components based on technique ID.',
               responses={
                        200: OpenApiResponse(response=None, description='Components retrieved successfully'),
                        400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['GET'])
def getComponentsByTechniqueId(request, id):
    techniques = attack.techniques
    selected_technique = attack.techniques[1]

    datasources = attack.components


    techniqueDatasources = []


    for tech in techniques:
        if tech.id == id:
            selected_technique = tech
            for techds in selected_technique.components:
                for ds in datasources:
                    if techds.name == ds.name:
                        techniqueDatasources.append(ds.to_json())

    return JsonResponse(techniqueDatasources, safe=False)


@extend_schema(description='Get all UseCases.',
               responses={
                        200: OpenApiResponse(response=None, description='Use Cases retrieved successfully'),
                        400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['GET'])
def getUseCases(request):
    if request.method == 'GET':
        usecases = UseCase.objects.all()
        #use serializer
        serializer = UseCaseSerializer(usecases, many=True)

        
        return JsonResponse(serializer.data, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method'})

@extend_schema(description='Delete UseCase based on ID.',
               responses={
                        200: OpenApiResponse(response=None, description='Use Case deleted successfully'),
                        400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['POST'])
def deleteUseCase(request, id):
    if request.method == 'POST':
        usecase = UseCase.objects.get(id=id)
        usecase.delete()
        return JsonResponse({'message': 'Use case deleted successfully'}, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method'})
    

@extend_schema(description='Get UseCase based on ID.',
               responses={
                        200: OpenApiResponse(response=None, description='Use Case retrieved successfully'),
                        400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['GET'])
def getUseCaseById(request, id):
    try:
        usecase = UseCase.objects.get(id=id)
        serializer = UseCaseSerializer(usecase, many=False)
        return JsonResponse(serializer.data, safe=False)
    except UseCase.DoesNotExist:
        return JsonResponse({'error': 'Use case not found'}, status=404)


@extend_schema(request=UseCaseSerializer,
                description='Update phase tasks based on UseCase ID.',
                responses={
                        200: OpenApiResponse(response=None, description='Phase tasks updated successfully'),
                        400: OpenApiResponse(response=None, description='Invalid request method')
                })
@api_view(['POST'])
def updatePhaseTasks(request, id):
    if request.method == 'POST':
        usecase = UseCase.objects.get(id=id)
        data = request.data
        usecase.phaseTasks = data
        serializer = UseCaseSerializer(usecase, many=False)
        print(serializer.data)
        usecase.save()
        return JsonResponse(serializer.data, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method'})
    


@extend_schema(
    request=UseCaseSerializer,
    description='Update UseCase based on ID.',
    responses={
        200: OpenApiResponse(response=None, description='Use Case updated successfully'),
        400: OpenApiResponse(response=None, description='Invalid request data'),
        404: OpenApiResponse(response=None, description='Use Case not found'),
    }
)
@api_view(['POST'])
def updateUseCase(request, id):
    # 1. Obtenção segura da instância (devolve 404 se o ID não existir)
    usecase = get_object_or_404(UseCase, id=id)
    data = request.data

    # 2. Leitura segura com .get() para evitar MultiValueDictKeyError
    usecase.title = data.get('title', usecase.title)
    usecase.description = data.get('description', usecase.description)
    usecase.mitigation = data.get('mitigation', usecase.mitigation)
    usecase.cncsClass = data.get('cncsClass', usecase.cncsClass)
    usecase.cncsType = data.get('cncsType', usecase.cncsType)

    # 3. Tratamento do Ficheiro Playbook:
    # Apenas atualiza se vier um NOVO ficheiro binário nos ficheiros do pedido
    if 'playbook' in request.FILES:
        usecase.playbook = request.FILES['playbook']

    # 4. Listas / Arrays
    if 'mitreTechniques' in data:
        usecase.mitreTechniques = data.get('mitreTechniques')
    if 'tactics' in data:
        usecase.tactics = data.get('tactics')
    if 'rules' in data:
        usecase.rules = data.get('rules')

    usecase.save()

    serializer = UseCaseSerializer(usecase, many=False)
    return JsonResponse(serializer.data, safe=False, status=status.HTTP_200_OK)
    

@extend_schema(description='Get all MITRE techniques.',
               responses={
                    200: OpenApiResponse(response=None, description='All techniques retrieved successfully'),
                    400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['GET'])
def getAllTechniques(request):
    if request.method == 'GET':
        techniques_list = []
        for technique in attack.techniques:
            techniques_list.append({
                'id': technique.id,
                'name': technique.name
            })
        return JsonResponse(techniques_list, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=400)
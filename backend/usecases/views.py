import json
from django.shortcuts import render

from usecases.serializer import UseCaseSerializer
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

@extend_schema(request=UseCaseSerializer,
               description='Create a new use case.',
               responses={
                   201: OpenApiResponse(response=UseCaseSerializer, description='Use case created successfully'),
                   400: OpenApiResponse(response=None, description='Invalid request method'),
                   500: OpenApiResponse(response=None, description='An error occurred')
               })
@api_view(['POST'])
def createUseCase(request):
    if request.method == 'POST':
        try:
            data = request.data

            mitreTechniques = json.loads(data.get('mitreTechniques', '[]'))

            
            phaseTasks = json.loads(data.get('phaseTasks', '[]'))
            rules = json.loads(data.get('rules', '[]'))
            attackVectors = json.loads(data.get('attackVectors', '[]'))

            new_usecase = UseCase(
                title=data['title'],
                description=data['description'],
                mitigation=data['mitigation'],
                playbook=data['playbook'],
                mitreTechniques=mitreTechniques,
                cncsClass=data['cncsClass'],
                cncsType=data['cncsType'],
                phaseTasks=phaseTasks,
                rules=rules,
                attackVectors=attackVectors,
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
    


@extend_schema(request=UseCaseSerializer,
                description='Update UseCase based on ID.',
                responses={
                        200: OpenApiResponse(response=None, description='Use Case updated successfully'),
                        400: OpenApiResponse(response=None, description='Invalid request method')
                })
@api_view(['POST'])
def updateUseCase(request, id):
    if request.method == 'POST':
        usecase = UseCase.objects.get(id=id)
        data = request.data
        usecase.title = data['title']
        usecase.description = data['description']
        usecase.mitigation = data['mitigation']
        usecase.playbook = data['playbook']
        usecase.mitreTechniques = data['mitreTechniques']
        usecase.cncsClass = data['cncsClass']
        usecase.cncsType = data['cncsType']
        usecase.rules = data['rules']
        usecase.attackVectors = data['attackVectors']
        usecase.save()
        serializer = UseCaseSerializer(usecase, many=False)
        return JsonResponse(serializer.data, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method'})
    

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
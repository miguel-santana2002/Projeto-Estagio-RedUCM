from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.db import IntegrityError
from django.http import JsonResponse
from accounts.models import Company, User  # Alterado para importar User de accounts.models
from accounts.serializer import ChangePasswordSerializer, CompanySerializer, UserSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import get_user_model
from django.core import serializers
from drf_spectacular.utils import extend_schema
from rest_framework import status
from drf_spectacular.utils import OpenApiResponse
from django.urls import reverse
from rest_framework.views import APIView
from django.core.mail import send_mail
from django.conf import settings


# Create your views here.
User = get_user_model()

@extend_schema(description='Endpoint to get logsources based on client ID.',
               responses={
                   200: OpenApiResponse(response=UserSerializer, description='User retrieved successfully'),
                   400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def LoggedInInfo(request):
    if request.method == 'GET':
        user = request.user
        serializer = UserSerializer(user)        
        return JsonResponse(serializer.data, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method'})
    

@extend_schema(request=UserSerializer,     
               description='User creation based on the data inserted in the request body.',
                responses={
                    200: OpenApiResponse(response=None, description='User created successfully'),
                    400: OpenApiResponse(response=None, description='Invalid request method')}
) 
@api_view(['POST'])
def createUser(request):
    print(request.data)
    if request.method == 'POST':
        username = request.data['username']
        email = request.data['email']
        password = request.data['password']
        companies = request.data.get('companies')  
        otpMethod = request.data.get('otpMethod')
        if not companies:
            User.objects.create_superuser(username=username, email=email, password=password, companies=[], otpMethod=otpMethod)
            return JsonResponse({'success': 'Admin created successfully'})
        user = User.objects.create_user(username=username, email=email, password=password, companies=companies, otpMethod=otpMethod)
        user.save()
        return JsonResponse({'success': 'User created successfully'})
    else:
        return JsonResponse({'error': 'Invalid request method'},status=status.HTTP_400_BAD_REQUEST)
    
@extend_schema(description='Endpoint to get a list of all users.',
               responses={
                   200: OpenApiResponse(response=UserSerializer, description='Users retrieved successfully'),
                     400: OpenApiResponse(response=None, description='Invalid request method')}
)
@api_view(['GET'])
def getUsers(request):
    if request.method == 'GET':
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        user_list = serializers.serialize('json', users, indent=2)
        
        return JsonResponse(serializer.data, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method'})
    
@extend_schema(description=' Endpoint to get a list of all clients.',
               responses={
                   200: OpenApiResponse(response=CompanySerializer, description='Companies retrieved successfully'),
                     400: OpenApiResponse(response=None, description='Invalid request method')
               })
@api_view(['GET'])
def getCompanies(request):
    if request.method == 'GET':
        companies = Company.objects.all()
        serializer = CompanySerializer(companies, many=True)
        return JsonResponse(serializer.data, safe=False)
    else:
        return JsonResponse({'error': 'Invalid request method'})
    


@extend_schema(request=CompanySerializer, 
               description=' Endpoint to create a new client based on the data inserted in the request body.',
               responses={
                   200: OpenApiResponse(response=None, description='Company created successfully'),
                     400: OpenApiResponse(response=None, description='Invalid request method')}) 
@api_view(['POST'])
def createCompany(request):
    if request.method == 'POST':
        name = request.data.get('name', '').strip()
        logsources = request.data.get('logsources', [])

        if not name or not logsources:
            return JsonResponse({'error': 'O Nome e as LogSources são de preenchimento obrigatório.'}, status=400)
        
        try:
            company = Company(name=name, logsources=logsources)
            company.save()
            return JsonResponse({'success': 'Company created successfully'}, status=201)
        except IntegrityError:
            # Bloqueia a falha 500 e devolve um erro 400 interpretável pelo Angular
            return JsonResponse({'error': 'Já existe um cliente com este nome.'}, status=400)
    else:
        # Alterado para status 405 (Method Not Allowed) para maior rigor semântico
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    
@extend_schema(description=' Endpoint to delete a user based on the user ID.',
               responses={
                   200: OpenApiResponse(response=None, description='User deleted successfully'),
                   400: OpenApiResponse(response=None, description='Invalid request method')})
@api_view(['POST'])
def deleteUser(request, id):
    user = User.objects.get(id=id)
    user.delete()
    return JsonResponse({'success': 'User deleted successfully'})

@extend_schema(description='Endpoint to delete a client based on the client ID.',
               responses={
                   status.HTTP_200_OK: "Company deleted successfully",
                   status.HTTP_400_BAD_REQUEST: "Invalid request method"})
@api_view(['POST'])
def deleteCompany(request, id):
    company = Company.objects.get(id=id)
    company.delete()
    return JsonResponse({'success': 'Company deleted successfully'})

@extend_schema(description='Endpoint to get logsources based on the client name.',
               responses={200: OpenApiResponse(response=None, description='Logsources retrieved successfully'),
                          400: OpenApiResponse(response=None, description='Invalid request method')})
                          
@api_view(['GET'])
def getLogsourcesByClient(request, clientName):
    company = Company.objects.get(name=clientName)
    return JsonResponse({'logsources': company.logsources})

@api_view(['POST'])
def updateUserInfo(request, id):
    user = User.objects.get(id=id)
    user.username = request.data['username']
    user.email = request.data['email']
    user.companies = request.data['companies']
    user.otpMethod = request.data['otpMethod']
    user.showTotp = True
    user.save()
    return JsonResponse({'success': 'User updated successfully'})




class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user_id = kwargs.get('id')  
        password = request.data.get('password')

        if not password:
            return JsonResponse({'error': 'New password is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        user.set_password(password)
        user.save()
        return JsonResponse({'success': 'Password changed successfully'}, status=status.HTTP_200_OK)

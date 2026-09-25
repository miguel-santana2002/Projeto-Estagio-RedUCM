from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from accounts.models import Company, User  # Alterado para importar User de accounts.models
from accounts.serializers import ChangePasswordSerializer, CompanySerializer, UserSerializer
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
import pyotp

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
    

@extend_schema(
    request=UserSerializer,     
    description='User creation based on the data inserted in the request body.',
    responses={
        200: OpenApiResponse(response=None, description='User created successfully'),
        400: OpenApiResponse(response=None, description='Invalid request method')
    }
) 
@api_view(['POST'])
def createUser(request):
    if request.method == 'POST':
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        companies = request.data.get('companies', [])  
        otpMethod = request.data.get('otpMethod', 'totp')

        # 1. Administrador (Sem empresas associadas)
        # Roles: superuser=True, admin=True, staff=True, active=True
        if not companies:
            user = User.objects.create_superuser(
                username=username, 
                email=email, 
                password=password, 
                companies=[], 
                otpMethod=otpMethod
            )
            user.is_superuser = True
            user.is_admin = True
            user.is_staff = True
            user.is_active = True
            user.showTotp = True
            user.save()
            return JsonResponse({'success': 'Admin created successfully'}, status=status.HTTP_201_CREATED)

        # 2. Operador (Com empresas associadas)
        # Roles: staff=True, active=True | admin=False, superuser=False
        user = User.objects.create_user(
            username=username, 
            email=email, 
            password=password, 
            companies=companies, 
            otpMethod=otpMethod
        )
        user.is_staff = True
        user.is_active = True
        user.is_admin = False
        user.is_superuser = False
        user.showTotp = True
        user.save()

        return JsonResponse({'success': 'User created successfully'}, status=status.HTTP_201_CREATED)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=status.HTTP_400_BAD_REQUEST)
    
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

        if Company.objects.filter(name__iexact=name).exists():
            return JsonResponse({'error': 'Já existe um cliente com este nome.'}, status=400)
        
        try:
            company = Company(name=name, logsources=logsources)
            company.save()
            return JsonResponse({'success': 'Company created successfully'}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
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
    try:
        user = User.objects.get(id=id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Utilizador não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    user.username = request.data.get('username')
    user.email = request.data.get('email')
    user.otpMethod = request.data.get('otpMethod', user.otpMethod)
    
    companies = request.data.get('companies', [])
    user.companies = companies

    # Sincronização de Roles
    if not companies:
        user.is_admin = True
        user.is_superuser = True
        user.is_staff = True
    else:
        user.is_admin = False
        user.is_superuser = False
        user.is_staff = True

    # Forçar reconfiguração do QR Code se solicitado
    if request.data.get('resetTotp', False):
        user.showTotp = True
        user.totp_secret = pyotp.random_base32()

    user.save()
    return JsonResponse({'success': 'User updated successfully'}, status=status.HTTP_200_OK)
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

# 1. GET: Retorna os dados da empresa para preencher o formulário inicial
@api_view(['GET'])
def getCompany(request, id):
    try:
        company = Company.objects.get(pk=id)
        data = {
            'pk': company.pk,
            'name': company.name,
            'logsources': company.logsources,
            'date': company.date
        }
        return JsonResponse(data, status=status.HTTP_200_OK)
    except Company.DoesNotExist:
        return JsonResponse({'error': 'Empresa não encontrada.'}, status=status.HTTP_404_NOT_FOUND)


# 2. POST: Atualiza os dados mantendo a validação de nomes duplicados
@api_view(['POST'])
def updateCompany(request, id):
    try:
        company = Company.objects.get(pk=id)
    except Company.DoesNotExist:
        return JsonResponse({'error': 'Empresa não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    name = request.data.get('name', '').strip()
    logsources = request.data.get('logsources', [])

    if not name or not logsources:
        return JsonResponse({'error': 'O Nome e as LogSources são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

    # Valida duplicados excluindo a própria empresa que está a ser editada
    if Company.objects.filter(name__iexact=name).exclude(pk=id).exists():
        return JsonResponse({'error': 'Já existe outra empresa registada com este nome.'}, status=status.HTTP_400_BAD_REQUEST)

    company.name = name
    company.logsources = logsources
    company.save()

    return JsonResponse({'success': 'Empresa atualizada com sucesso.'}, status=status.HTTP_200_OK)
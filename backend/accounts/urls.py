from email.mime.text import MIMEText
from django.contrib import admin
from django.urls import path
from accounts.views import ChangePasswordView, LoggedInInfo, createCompany, createUser, deleteCompany, deleteUser, getCompanies, getLogsourcesByClient, getUsers, updateUserInfo
from accounts.mailtemplate import otpEmailMessage
from config import settings
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.core.mail import EmailMultiAlternatives
from django.http import JsonResponse
import qrcode
from io import BytesIO
import base64
from .models import User  # import your custom user model

class CustomTokenObtainPairSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        user = authenticate(email=email, password=password)
        if user is None or not user.is_active:
            raise serializers.ValidationError('Invalid credentials')
        
        otpSent = False

        # CASO 1: Autenticação por Email
        if user.otpMethod == 'email':
            user.generate_otp()
            user.save()
            
            subject = 'Código de Verificação - RedUCM'
            message = f'O seu código de verificação é: {user.otp}'
            html_content = otpEmailMessage(user.otp)
            email_from = settings.EMAIL_HOST_USER
            recipient_list = [user.email]
            
            msg = EmailMultiAlternatives(subject, message, email_from, recipient_list)
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            
            otpSent = True

        # CASO 2: Autenticação por App / QR Code (TOTP)
        else:
            # O TOTP não envia código por mail; a validação é feita pela app (Google Authenticator)
            otpSent = False

        return {
            'user': user, 
            'email': user.email, 
            'otpSent': otpSent, 
            'otpMethod': user.otpMethod,
            'showTotp': user.showTotp  # Indica ao Frontend se deve mostrar o QR Code pela primeira vez
        }

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)


class VerifyOTPView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']
        try:
            user = User.objects.get(email=email)
            if user.otpMethod == 'email':
                if timezone.now() > user.otp_time + timedelta(minutes=5):
                    raise serializers.ValidationError('OTP expired')
                if user.otp != otp:
                    raise serializers.ValidationError('Invalid OTP')
            else:
                if not user.verify_totp(otp):
                    raise serializers.ValidationError('Invalid TOTP')
                
            refresh = RefreshToken.for_user(user)
            return Response({'refresh': str(refresh), 'access': str(refresh.access_token), 'otpSent': 'OTP verified successfully'})
        except User.DoesNotExist:
            return Response({'detail': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

class GenerateTOTPView(APIView):
    # Permite acesso ao ecrã do QR code durante o fluxo de login
    permission_classes = []

    def get(self, request, *args, **kwargs):
        email = request.query_params.get('email')
        if not email:
            return JsonResponse({'error': 'Email is required'}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)

        if user.showTotp:
            totp_uri = user.generate_totp_uri()
            
            # Gera a imagem do QR Code em memória
            qr = qrcode.make(totp_uri)
            buffer = BytesIO()
            qr.save(buffer, format="PNG")
            qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            qr_code_url = f"data:image/png;base64,{qr_base64}"

            # Atualiza showTotp para False após a primeira geração
            user.showTotp = False
            user.save()

            return JsonResponse({
                'totp_uri': totp_uri,
                'qr_code': qr_code_url
            })
        else:
            return JsonResponse({'error': 'TOTP already generated'}, status=400)



class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    @classmethod
    def get_token(cls, user):
        return RefreshToken.for_user(user)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token = self.get_token(user)

        response_data = {
            'refresh': str(token),
            'access': str(token.access_token),
        }

        # Inclui os campos no payload da resposta do login
        if 'otpSent' in serializer.validated_data:
            response_data['otpSent'] = serializer.validated_data['otpSent']
        if 'otpMethod' in serializer.validated_data:
            response_data['otpMethod'] = serializer.validated_data['otpMethod']
        if 'showTotp' in serializer.validated_data:
            response_data['showTotp'] = serializer.validated_data['showTotp']  # <--- Retorna para o Angular

        return Response(response_data, status=status.HTTP_200_OK)
    
    

urlpatterns = [
    path('login', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('verify-otp', VerifyOTPView.as_view(), name='verify_otp'),
    path('generate-totp', GenerateTOTPView.as_view(), name='generate_totp'),
    path('refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('loggedInInfo', LoggedInInfo, name='loggedInInfo'),
    path('createUser', createUser, name='createUser'),
    path('getUsers', getUsers, name='getUsers'),
    path('createCompany', createCompany, name='createCompany'),
    path('getCompanies', getCompanies, name='getCompanies'),
    path('deleteUser/<str:id>', deleteUser, name='deleteUser'),
    path('deleteCompany/<str:id>', deleteCompany, name='deleteCompany'),
    path('getLogsourcesByClient/<str:clientName>', getLogsourcesByClient, name='getLogsourcesByClient'),
    path('updateUserInfo/<str:id>', updateUserInfo, name='updateUserInfo'),
    path('change-password/<str:id>/', ChangePasswordView.as_view(), name='change_password'),

]
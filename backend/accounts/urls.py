from email.mime.text import MIMEText
from django.contrib import admin
from django.urls import path
from accounts.views import ChangePasswordView, LoggedInInfo, createCompany, createUser, deleteCompany, deleteUser, getCompanies, getLogsourcesByClient, getUsers, updateUserInfo, getCompany, updateCompany, resetTotp, toggleUserStatus
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
from django.core.cache import cache
from .models import User  # import your custom user model

MAX_FAILED_LOGIN_ATTEMPTS = 5


class CustomTokenObtainPairSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        email = attrs.get('email', '').strip()
        password = attrs.get('password')

        user_obj = User.objects.filter(email__iexact=email).first()

        # 1. Se o utilizador já estiver inativo / bloqueado
        if user_obj and not user_obj.is_active:
            raise serializers.ValidationError({
                'detail': 'Conta bloqueada. Por favor, contacte o administrador do sistema.'
            })

        user = authenticate(email=email, password=password)

        # 2. Se a autenticação falhar (credenciais incorretas)
        if user is None:
            if user_obj:
                cache_key = f"failed_login_attempts_{user_obj.pk}"
                failed_attempts = cache.get(cache_key, 0) + 1
                cache.set(cache_key, failed_attempts, timeout=86400)

                # Se errar mais do que 5 vezes (> 5), bloqueia o utilizador
                if failed_attempts > MAX_FAILED_LOGIN_ATTEMPTS:
                    user_obj.is_active = False
                    user_obj.save(update_fields=['is_active'])
                    cache.delete(cache_key)
                    raise serializers.ValidationError({
                        'detail': f'Conta bloqueada por excesso de tentativas falhadas (errou as credenciais mais de {MAX_FAILED_LOGIN_ATTEMPTS} vezes). Contacte o administrador.'
                    })
                elif failed_attempts == MAX_FAILED_LOGIN_ATTEMPTS:
                    raise serializers.ValidationError({
                        'detail': f'Credenciais inválidas. Atenção: atingiu {MAX_FAILED_LOGIN_ATTEMPTS} tentativas falhadas. Se errar mais uma vez a sua conta será bloqueada.'
                    })
                else:
                    remaining = (MAX_FAILED_LOGIN_ATTEMPTS + 1) - failed_attempts
                    tentativas_str = f"{remaining} tentativa{'s' if remaining > 1 else ''}"
                    raise serializers.ValidationError({
                        'detail': f'Credenciais inválidas. Restam {tentativas_str} antes do bloqueio da conta.'
                    })
            else:
                raise serializers.ValidationError({
                    'detail': 'Credenciais inválidas para início de sessão.'
                })

        # 3. Autenticação bem-sucedida: limpa o contador de tentativas falhadas
        cache_key = f"failed_login_attempts_{user.pk}"
        cache.delete(cache_key)
        
        # 4. Se o método for Email, envia a mensagem com o código OTP
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

        # 5. Define otpSent como True em ambos os métodos para desbloquear o Guard/Navegação do Angular
        otpSent = True

        return {
            'user': user, 
            'email': user.email, 
            'otpSent': otpSent, 
            'otpMethod': user.otpMethod,
            'showTotp': user.showTotp
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
            if not user.is_active:
                return Response({'detail': 'Conta bloqueada. Por favor, contacte o administrador.'}, status=status.HTTP_403_FORBIDDEN)
            
            cache_key_otp = f"failed_otp_attempts_{user.pk}"

            # Validação via Email
            is_valid_otp = False
            if user.otpMethod == 'email':
                if not user.otp_time or timezone.now() > user.otp_time + timedelta(minutes=5):
                    return Response({'detail': 'Código OTP expirado.'}, status=status.HTTP_400_BAD_REQUEST)
                is_valid_otp = (user.otp == otp)
            # Validação via TOTP / App
            else:
                if hasattr(user, 'verify_totp'):
                    is_valid_otp = user.verify_totp(otp)

            if not is_valid_otp:
                failed_otp = cache.get(cache_key_otp, 0) + 1
                cache.set(cache_key_otp, failed_otp, timeout=3600)
                if failed_otp > MAX_FAILED_LOGIN_ATTEMPTS:
                    user.is_active = False
                    user.save(update_fields=['is_active'])
                    cache.delete(cache_key_otp)
                    return Response({
                        'detail': f'Conta bloqueada por excesso de tentativas incorretas de código (mais de {MAX_FAILED_LOGIN_ATTEMPTS} erros). Contacte o administrador.'
                    }, status=status.HTTP_403_FORBIDDEN)
                elif failed_otp == MAX_FAILED_LOGIN_ATTEMPTS:
                    return Response({
                        'detail': f'Código OTP inválido. Atingiu {MAX_FAILED_LOGIN_ATTEMPTS} erros. Se errar mais uma vez a conta será bloqueada.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    remaining = (MAX_FAILED_LOGIN_ATTEMPTS + 1) - failed_otp
                    return Response({
                        'detail': f'Código OTP inválido. Restam {remaining} tentativa(s) antes do bloqueio.'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Sucesso no OTP: limpa o contador de tentativas
            cache.delete(cache_key_otp)

            # Emite os novos tokens após verificação de 2FA com sucesso
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'OTP verified successfully'
            }, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

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
    path('resetTotp/<str:id>', resetTotp, name='resetTotp'),
    path('toggleUserStatus/<str:id>', toggleUserStatus, name='toggleUserStatus'),
    path('change-password/<str:id>/', ChangePasswordView.as_view(), name='change_password'),
    path('getCompany/<int:id>', getCompany, name='getCompany'),
    path('updateCompany/<int:id>', updateCompany, name='updateCompany'),

]
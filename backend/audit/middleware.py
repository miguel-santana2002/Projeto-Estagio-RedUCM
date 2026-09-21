from rest_framework_simplejwt.authentication import JWTAuthentication
from .threadlocal import set_current_user

jwt_auth = JWTAuthentication()

class CurrentUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = None
        try:
            auth_result = jwt_auth.authenticate(request)
            if auth_result is not None:
                user, _ = auth_result
        except Exception:
            user = None

        set_current_user(user)
        response = self.get_response(request)
        set_current_user(None)  # limpa no fim, evita fugas entre pedidos
        return response
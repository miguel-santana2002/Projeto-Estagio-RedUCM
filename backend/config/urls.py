"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.views.generic.base import TemplateView
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularJSONAPIView
from rest_framework import permissions




urlpatterns = [
    path('api/accounts/', include('accounts.urls')),
    path('api/usecases/', include('usecases.urls')),
    path('admin/', admin.site.urls),
    path('api/rules/', include('rules.urls')),
    path('api/sigmaconversions/', include('sigmaconversions.urls')),
    path('api/stats/', include('stats.urls')),
    path('api/audit/', include('audit.urls')),
    path('api/feedback/', include('feedback.urls')),  # <-- Rota adicionada para o sistema de auditoria
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema.json', SpectacularJSONAPIView.as_view(), name='schema-json'),
    path('', TemplateView.as_view(template_name="home.html")),




] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
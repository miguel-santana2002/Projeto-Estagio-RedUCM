from django.contrib import admin

# Register your models here.

from .models import Company, User

admin.site.register(User)
admin.site.register(Company)
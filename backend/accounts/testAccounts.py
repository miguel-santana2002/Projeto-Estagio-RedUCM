import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")


from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

from sqlite3 import IntegrityError
from django.test import TestCase
from django.utils import timezone
from .models import Company, User  # Adjust import based on your app structure
import pyotp
from django.urls import reverse
from rest_framework import status


class UserModelTests(TestCase):
    
    def setUp(self):
        # Set up initial data or any prerequisites for the tests
        self.test_user_data = {
            'email': 'testuser@example.com',
            'username': 'testuser',
            'password': 'testpassword',
            'companies': ['Company1', 'Company2'],
            'otpMethod': 'totp'
        }

        self.test_company_data = {
            'name': 'TestCompany',
            'logsources': ['LogSource1', 'LogSource2']
        }


    def test_company_creation(self):
        company = Company.objects.create(**self.test_company_data)
        self.assertEqual(company.name, self.test_company_data['name'])
        self.assertEqual(list(company.logsources), self.test_company_data['logsources'])

    def test_company_blank_logsources(self):
        # Testar se o campo logsources pode ser vazio ou nulo
        company_data = {
            'name': 'CompanyWithNoLogs',
            'logsources': None
        }
        company = Company.objects.create(**company_data)
        self.assertIsNone(company.logsources)


    def test_company_str_method(self):
        company = Company.objects.create(**self.test_company_data)
        self.assertEqual(str(company), self.test_company_data['name'])


    def test_company_update(self):
        company = Company.objects.create(**self.test_company_data)
        new_logsources = ['NewLogSource1', 'NewLogSource2']
        company.logsources = new_logsources
        company.save()
        updated_company = Company.objects.get(pk=company.pk)
        self.assertEqual(list(updated_company.logsources), new_logsources)

    
    def test_user_creation(self):
        user = User.objects.create_user(**self.test_user_data)
        self.assertEqual(user.email, self.test_user_data['email'])
        self.assertEqual(user.username, self.test_user_data['username'])
        self.assertTrue(user.check_password(self.test_user_data['password']))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_admin)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.companies, self.test_user_data['companies'])
    
    def test_superuser_creation(self):
        superuser = User.objects.create_superuser(
            email='admin@example.com',
            username='admin',
            password='adminpassword'
        )
        self.assertTrue(superuser.is_admin)
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)
    
    def test_generate_otp(self):
        user = User.objects.create_user(**self.test_user_data)
        user.generate_otp()
        self.assertEqual(len(user.otp), 6)
        self.assertIsNotNone(user.otp_time)
    
    
    def test_verify_totp(self):
        user = User.objects.create_user(**self.test_user_data)
        token = pyotp.TOTP(user.totp_secret).now()
        self.assertTrue(user.verify_totp(token))


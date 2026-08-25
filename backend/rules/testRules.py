# test_views.py


import os


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")


from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse
from rules.models import RuleModel, Rule, RegisteredLogSource
from accounts.models import Company

class RuleModelTests(APITestCase):

    def setUp(self):
        self.client = APIClient()
        self.rule_model_url = reverse('createRuleModel')
        self.rule_model_data = {
            'title': 'Test Rule Model',
            'useCaseId': 1,
            'logsources': ['Test Log Source'], 
            'type': 'Test Type',
            'ruleCode': 'Test Code'
        }

    def test_create_rule_model(self):
        response = self.client.post(self.rule_model_url, self.rule_model_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(RuleModel.objects.count(), 1)
        self.assertEqual(RuleModel.objects.get().title, 'Test Rule Model')

    def test_get_rule_models(self):
        RuleModel.objects.create(**self.rule_model_data)
        response = self.client.get(reverse('getRuleModels'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)

    def test_get_rule_model_by_id(self):
        rule_model = RuleModel.objects.create(**self.rule_model_data)
        response = self.client.get(reverse('getRuleModelById', args=[rule_model.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['title'], 'Test Rule Model')

    def test_delete_rule_model_by_id(self):
        rule_model = RuleModel.objects.create(**self.rule_model_data)
        response = self.client.post(reverse('deleteRuleModelById', args=[rule_model.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(RuleModel.objects.count(), 0)

class RuleTests(APITestCase):

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name='Test Company')
        self.rule_model = RuleModel.objects.create(
            title='Test Rule Model', 
            useCaseId=1, 
            logsources=['Test Log Source'], 
            type='Test Type', 
            ruleCode='Test Code'
        )
        self.rule_url = reverse('createRule')
        self.rule_data = {
            'ruleModel': self.rule_model.id,
            'logsources': ['Test Log Source'],
            'ruleCode': 'Test Code',
            'syntax': 'Test Syntax',
            'client': self.company.id
        }

    def test_create_rule(self):
        response = self.client.post(self.rule_url, self.rule_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Rule.objects.count(), 1)
        self.assertEqual(Rule.objects.get().ruleCode, 'Test Code')

    def test_get_rules(self):
        rule_data = {
            'ruleModel': self.rule_model,
            'logsources': ['Test Log Source'],
            'ruleCode': 'Test Code',
            'syntax': 'Test Syntax',
            'client': self.company
        }
        Rule.objects.create(**rule_data)
        response = self.client.get(reverse('getRules'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)

    def test_get_rule_by_id(self):
        rule_data = {
            'ruleModel': self.rule_model,
            'logsources': ['Test Log Source'],
            'ruleCode': 'Test Code',
            'syntax': 'Test Syntax',
            'client': self.company
        }
        rule = Rule.objects.create(**rule_data)
        response = self.client.get(reverse('getRuleById', args=[rule.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['ruleCode'], 'Test Code')

    def test_update_rule_code(self):
        rule_data = {
            'ruleModel': self.rule_model,
            'logsources': ['Test Log Source'],
            'ruleCode': 'Test Code',
            'syntax': 'Test Syntax',
            'client': self.company
        }
        rule = Rule.objects.create(**rule_data)
        update_data = {'ruleCode': 'Updated Code'}
        response = self.client.post(reverse('updateRuleCode', args=[rule.id]), update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Rule.objects.get().ruleCode, 'Updated Code')

class RegisteredLogSourceTests(APITestCase):

    def setUp(self):
        self.client = APIClient()
        self.logsource_url = reverse('createRegisteredLogSource')
        self.logsource_data = {
            'name': 'Test Log Source',
            'description': 'Test Description'
        }

    def test_create_registered_log_source(self):
        response = self.client.post(self.logsource_url, self.logsource_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(RegisteredLogSource.objects.count(), 1)
        self.assertEqual(RegisteredLogSource.objects.get().name, 'Test Log Source')

    def test_get_registered_log_sources(self):
        RegisteredLogSource.objects.create(**self.logsource_data)
        response = self.client.get(reverse('getRegisteredLogSources'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)

    def test_delete_log_source_by_id(self):
        logsource = RegisteredLogSource.objects.create(**self.logsource_data)
        response = self.client.post(reverse('deleteLogSourceById', args=[logsource.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(RegisteredLogSource.objects.count(), 0)

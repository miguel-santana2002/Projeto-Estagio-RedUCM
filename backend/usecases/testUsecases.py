import json
import os
from django.test import TestCase
from django.urls import reverse
from accounts.models import User
from usecases.models import UseCase
from rest_framework import status
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")


class UseCaseTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        
        self.user = User.objects.create_user(username='testuser', password='testpassword', email='usertest@gmail.com')

        self.test_usecase_data = {
            'title': 'Test Use Case',
            'cncsClass': 'Class A',
            'cncsType': 'Type 1',
            'description': 'Test description',
            'mitigation': 'Test mitigation',
            'mitreTechniques': ['T1234', 'T5678'],
            'phaseTasks': [{'phase': 'Phase 1', 'task': 'Task 1'}, {'phase': 'Phase 2', 'task': 'Task 2'}],
            'rules': [{'rule_name': 'Rule 1'}, {'rule_name': 'Rule 2'}],
            'attackVectors': ['Vector 1', 'Vector 2'],
        }

        # Criando um arquivo simulado para o playbook
        self.file_content = b'Test file content'
        self.file = SimpleUploadedFile('test_playbook.jpg', self.file_content, content_type='image/jpeg')




    def test_create_usecase(self):
        url = reverse('createUseCase')


        data = {
            'title': 'Test Use Case',
            'description': 'This is a test use case',
            'mitigation': 'Test mitigation',
            'playbook': 'Test playbook',
            'cncsClass': 'Test CNCs Class',
            'cncsType': 'Test CNCs Type',
        }



        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)



    def test_get_usecases(self):
        url = reverse('getUseCases')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def deleteUseCase(self):
        url = reverse('deleteUseCase', args=[1])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def getMitigationsByTechniqueId(self):
        url = reverse('getMitigationsByTechniqueId', args=['1638'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def getDataSourcesByTechniqueId(self):
        url = reverse('getDataSourcesByTechniqueId', args=['1638'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def getComponentsByTechniqueId(self):
        url = reverse('getComponentsByTechniqueId', args=['1638'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def getTechniqueById(self):
        url = reverse('getTechniqueById', args=['1638'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_usecase_update(self):
        usecase = UseCase.objects.create(**self.test_usecase_data)

        new_title = 'Updated Use Case'
        usecase.title = new_title
        usecase.save()

        updated_usecase = UseCase.objects.get(pk=usecase.pk)
        self.assertEqual(updated_usecase.title, new_title)

    def test_usecase_creation(self):
        usecase = UseCase.objects.create(
            title=self.test_usecase_data['title'],
            cncsClass=self.test_usecase_data['cncsClass'],
            cncsType=self.test_usecase_data['cncsType'],
            description=self.test_usecase_data['description'],
            mitigation=self.test_usecase_data['mitigation'],
            mitreTechniques=self.test_usecase_data['mitreTechniques'],
            phaseTasks=self.test_usecase_data['phaseTasks'],
            rules=self.test_usecase_data['rules'],
            attackVectors=self.test_usecase_data['attackVectors'],
            playbook=self.file,
        )

        self.assertEqual(usecase.title, self.test_usecase_data['title'])
        self.assertEqual(usecase.cncsClass, self.test_usecase_data['cncsClass'])
        self.assertEqual(usecase.cncsType, self.test_usecase_data['cncsType'])
        self.assertEqual(usecase.description, self.test_usecase_data['description'])
        self.assertEqual(usecase.mitigation, self.test_usecase_data['mitigation'])
        self.assertEqual(list(usecase.mitreTechniques), self.test_usecase_data['mitreTechniques'])
        self.assertEqual(list(usecase.phaseTasks), self.test_usecase_data['phaseTasks'])
        self.assertEqual(list(usecase.rules), self.test_usecase_data['rules'])
        self.assertEqual(list(usecase.attackVectors), self.test_usecase_data['attackVectors'])
        self.assertEqual(usecase.playbook.read(), self.file_content)



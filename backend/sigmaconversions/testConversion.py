from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

class ConvertSigmaViewsTestCase(TestCase):

    def setUp(self):
        self.client = APIClient()

        # Exemplo de uma regra Sigma para os testes
        self.sigma_rule = """
title: Suspicious SQL Query
id: d84c0ded-edd7-4123-80ed-348bb3ccc4d5
status: test
description: Detects suspicious SQL query keywrods that are often used during recon, exfiltration or destructive activities. Such as dropping tables and selecting wildcard fields
author: '@juju4'
date: 2022/12/27
references:
    - https://github.com/sqlmapproject/sqlmap
tags:
    - attack.exfiltration
    - attack.initial_access
    - attack.privilege_escalation
    - attack.t1190
    - attack.t1505.001
logsource:
    category: database
    definition: 'Requirements: Must be able to log the SQL queries'
detection:
    keywords:
        - 'drop'
        - 'truncate'
        - 'dump'
        - 'select \*'
    condition: keywords
falsepositives:
    - Inventory and monitoring activity
    - Vulnerability scanners
    - Legitimate applications
level: medium        """

    def test_convertSigmaToSplunk(self):
        url = reverse('convertSigmaToSplunk')
        data = {'rule': self.sigma_rule}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 200)

    def test_convertSigma(self):
        url = reverse('convertSigma')
        data = {'rule': self.sigma_rule, 'backend': 'Splunk Rule'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.json()) > 0)


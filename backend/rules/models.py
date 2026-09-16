from django.db import models
from django.contrib.postgres.fields import ArrayField

from accounts.models import Company


class RuleModel(models.Model):
    title = models.CharField(unique=False, null=True)
    useCaseId = models.IntegerField(unique=False, null=True)
    type = models.CharField(unique=False, null=True)
    syntax = models.CharField(unique=False, null=True)
    ruleCode = models.CharField(unique=False, null=True)
    logsources = ArrayField(models.CharField(max_length=255, blank=True), blank=True, default=list)
    def __str__(self):
        return self.title
    
class Rule(models.Model):
    ruleModel = models.ForeignKey(RuleModel, on_delete=models.CASCADE, null=True)
    ruleCode = models.CharField(unique=False, null=True)
    syntax = models.CharField(unique=False, null=True)

    logsources = ArrayField(models.CharField(max_length=255, blank=True), blank=True, default=list)
    client = models.ForeignKey(Company, on_delete=models.CASCADE, null=True)
    def __str__(self):
        return self.ruleCode


class RegisteredLogSource(models.Model):
    TYPE_CHOICES = [
        ('windows', 'Windows'),
        ('linux', 'Linux'),
        ('network', 'Network'),
        ('cloud', 'Cloud'),
        ('application', 'Application'),
        ('other', 'Other'),
    ]
    COLLECTION_CHOICES = [
        ('agent', 'Agent'),
        ('syslog', 'Syslog'),
        ('api', 'API'),
        ('file', 'File'),
        ('other', 'Other'),
    ]

    name = models.CharField(unique=False, null=True)
    description = models.CharField(unique=False, null=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, blank=True, null=True)
    collectionMethod = models.CharField(max_length=20, choices=COLLECTION_CHOICES, blank=True, null=True)
    products = ArrayField(models.CharField(max_length=255, blank=True), blank=True, default=list)

    def __str__(self):
        return self.name

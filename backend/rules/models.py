from django.db import models
from django.contrib.postgres.fields import ArrayField
from accounts.models import Company

class RuleModel(models.Model):
    title = models.CharField(max_length=255, null=True, blank=True)
    useCaseId = models.IntegerField(null=True, blank=True)
    type = models.CharField(max_length=50, null=True, blank=True)
    syntax = models.CharField(max_length=100, null=True, blank=True)
    ruleCode = models.TextField(null=True, blank=True)
    logsources = ArrayField(models.CharField(max_length=255, blank=True), blank=True, default=list)

    def __str__(self):
        return self.title or f"RuleModel #{self.id}"

class Rule(models.Model):
    ruleModel = models.ForeignKey(RuleModel, on_delete=models.CASCADE, null=True, related_name='rules')
    ruleCode = models.TextField(null=True, blank=True)
    syntax = models.CharField(max_length=100, null=True, blank=True)

    status = models.CharField(max_length=50, null=True, blank=True)

    logsources = ArrayField(models.CharField(max_length=255, blank=True), blank=True, default=list)
    client = models.ForeignKey(Company, on_delete=models.CASCADE, null=True)

    validatedManually = models.BooleanField(default=False)
    validatedBy = models.CharField(max_length=255, null=True, blank=True)
    validatedAt = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        model_name = self.ruleModel.title if self.ruleModel and self.ruleModel.title else f"Modelo #{self.ruleModel_id}"
        client_name = self.client.name if self.client and hasattr(self.client, 'name') else f"Cliente #{self.client_id}"
        return f"Rule #{self.id or 'Nova'} - {model_name} ({client_name})"[:255]

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
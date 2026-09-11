from django.db import models
from django.contrib.postgres.fields import ArrayField
from accounts.models import Company


class RuleModel(models.Model):
    title = models.CharField(max_length=255, null=True, blank=True)
    useCaseId = models.IntegerField(null=True, blank=True)
    type = models.CharField(max_length=50, null=True, blank=True)
    syntax = models.CharField(max_length=100, null=True, blank=True)  # <-- Campo adicionado aqui
    ruleCode = models.TextField(null=True, blank=True)
    logsources = ArrayField(models.CharField(max_length=255, blank=True), blank=True, default=list)

    def __str__(self):
        return self.title or f"RuleModel #{self.id}"

    
class Rule(models.Model):
    ruleModel = models.ForeignKey(RuleModel, on_delete=models.CASCADE, null=True)
    ruleCode = models.TextField(null=True, blank=True)
    syntax = models.CharField(max_length=100, null=True, blank=True)
    logsources = ArrayField(models.CharField(max_length=255, blank=True), blank=True, default=list)
    client = models.ForeignKey(Company, on_delete=models.CASCADE, null=True)

    def __str__(self):
        return self.ruleCode or f"Rule #{self.id}"


class RegisteredLogSource(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.name or f"LogSource #{self.id}"
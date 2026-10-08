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
    STATUS_CHOICES = [
        ('', '(Vazio)'),
        ('Regra validada', 'Regra validada'),
        ('Regra não validada', 'Regra não validada'),
    ]
    GENERATION_CHOICES = [
        ('', 'Não aplicável'),
        ('pending', 'A gerar'),
        ('done', 'Gerado'),
        ('failed', 'Falhou'),
        ('unsupported', 'Não convertível'),
    ]

    # Campos que vêm do antigo RuleModel
    title = models.CharField(max_length=255, null=True, blank=True)
    useCaseId = models.IntegerField(null=True, blank=True)
    type = models.CharField(max_length=50, null=True, blank=True)

    # Transição: some quando o RuleModel for removido
    ruleModel = models.ForeignKey(RuleModel, on_delete=models.CASCADE, null=True, blank=True, related_name='rules')

    ruleCode = models.TextField(null=True, blank=True)
    syntax = models.CharField(max_length=100, null=True, blank=True)
    logsources = ArrayField(models.CharField(max_length=255, blank=True), blank=True, default=list)
    client = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='Regra não validada',
        blank=True
    )

    # Regra de origem (ex: o Sigma gerado aponta para a regra SPL)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    generated = models.BooleanField(default=False)
    generationStatus = models.CharField(max_length=20, choices=GENERATION_CHOICES, default='', blank=True)
    generationNote = models.TextField(null=True, blank=True)

    def __str__(self):
        return (self.title or f"Rule #{self.id or 'Nova'}")[:255]

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

    name = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, blank=True, null=True)
    collectionMethod = models.CharField(max_length=20, choices=COLLECTION_CHOICES, blank=True, null=True)
    products = ArrayField(models.CharField(max_length=255, blank=True), blank=True, default=list)

    def __str__(self):
        return self.name or f"LogSource #{self.id}"
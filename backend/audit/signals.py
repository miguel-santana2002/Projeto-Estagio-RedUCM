from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import GlobalAuditLog

# Importação de todos os modelos ativos da plataforma
from accounts.models import User, Company
from rules.models import RuleModel, Rule, RegisteredLogSource
from usecases.models import UseCase

# Lista de todos os modelos monitorizados
MODELS_TO_TRACK = [
    User,
    Company,
    RuleModel,
    Rule,
    RegisteredLogSource,
    UseCase,
]

def register_audit_signals(model_class):
    @receiver(post_save, sender=model_class)
    def log_creation_or_update(sender, instance, created, **kwargs):
        action_type = 'CREATE' if created else 'UPDATE'
        GlobalAuditLog.objects.create(
            action=action_type,
            content_object=instance,
            changes_summary=str(instance.__dict__)
        )

    @receiver(post_delete, sender=model_class)
    def log_deletion(sender, instance, **kwargs):
        GlobalAuditLog.objects.create(
            action='DELETE',
            content_object=instance,
            changes_summary=str(instance.__dict__)
        )

# Registo automático para cada modelo listado
for model in MODELS_TO_TRACK:
    register_audit_signals(model)
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import GlobalAuditLog
from .threadlocal import get_current_user

# Importação de todos os modelos críticos que pretendes monitorizar
from accounts.models import Company
from rules.models import RuleModel, Rule, RegisteredLogSource
from usecases.models import UseCase

UserModel = get_user_model()

# Lista exaustiva de todos os modelos monitorizados na plataforma
MODELS_TO_TRACK = [
    UserModel,
    Company,
    RuleModel,
    Rule,
    RegisteredLogSource,
    UseCase,
]

def _get_actor():
    user = get_current_user()
    if user is None or not getattr(user, "is_authenticated", False):
        return "Sistema"
    return getattr(user, "email", str(user))

@receiver(post_save)
def global_post_save_handler(sender, instance, created, **kwargs):
    # Ignorar o próprio modelo de auditoria para evitar loop infinito
    if sender is GlobalAuditLog:
        return
        
    # Verificar se o modelo alterado pertence à lista que queremos monitorizar
    if sender in MODELS_TO_TRACK or any(issubclass(sender, m) for m in MODELS_TO_TRACK if isinstance(m, type)):
        action_type = 'CREATE' if created else 'UPDATE'
        
        try:
            # Recolher todos os campos e respetivos valores do objeto
            instance_data = {
                field.name: str(getattr(instance, field.name, ''))
                for field in instance._meta.fields
            }
        except Exception:
            instance_data = {"info": "Dados indisponíveis"}

        # Obter a representação legível do objeto em segurança
        try:
            obj_repr = str(instance)
        except Exception:
            obj_repr = f"ID: {instance.pk}"

        GlobalAuditLog.objects.create(
            action=action_type,
            model_name=sender.__name__,
            object_id=str(getattr(instance, 'pk', 'N/A')),
            object_repr=obj_repr,
            actor=_get_actor(),
            changes=instance_data
        )

@receiver(post_delete)
def global_post_delete_handler(sender, instance, **kwargs):
    # Ignorar o próprio modelo de auditoria
    if sender is GlobalAuditLog:
        return

    if sender in MODELS_TO_TRACK or any(issubclass(sender, m) for m in MODELS_TO_TRACK if isinstance(m, type)):
        try:
            obj_repr = str(instance)
        except Exception:
            obj_repr = f"ID: {getattr(instance, 'pk', 'N/A')}"

        GlobalAuditLog.objects.create(
            action='DELETE',
            model_name=sender.__name__,
            object_id=str(getattr(instance, 'pk', 'Desconhecido')),
            object_repr=obj_repr,
            actor=_get_actor(),
            changes={"status": "Objeto completamente eliminado da base de dados"}
        )
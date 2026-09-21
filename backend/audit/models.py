from django.db import models

class GlobalAuditLog(models.Model):
    action = models.CharField(max_length=50) # 'CREATE', 'UPDATE', 'DELETE'
    model_name = models.CharField(max_length=255) # Ex: 'Rule', 'Company'
    object_id = models.CharField(max_length=255, null=True, blank=True)
    object_repr = models.CharField(max_length=255, null=True, blank=True) # Ex: O __str__ do objeto
    actor = models.CharField(max_length=255, null=True, blank=True) # Nome do utilizador ou Sistema
    changes = models.JSONField(default=dict, blank=True, null=True) # Dicionário com os dados
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.timestamp}] {self.action} - {self.model_name} (#{self.object_id})"
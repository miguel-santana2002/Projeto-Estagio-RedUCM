from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class GlobalAuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255) # Ex: "CREATE", "UPDATE", "DELETE"
    target = models.CharField(max_length=255, blank=True, null=True) # Ex: "Rule: Sigma-01"
    details = models.TextField(blank=True, null=True) # Descrição detalhada da alteração
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.timestamp}] {self.action} - {self.target}"
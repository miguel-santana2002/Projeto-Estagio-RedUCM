from rest_framework import serializers
from .models import GlobalAuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    # Campos formatados ou adicionais podem ser mapeados aqui se necessário
    model_name = serializers.CharField(source='content_type.model', read_only=True)

    class Meta:
        model = GlobalAuditLog
        fields = [
            'id', 
            'action', 
            'model_name', 
            'object_id', 
            'object_repr', 
            'actor', 
            'changes', 
            'timestamp'
        ]
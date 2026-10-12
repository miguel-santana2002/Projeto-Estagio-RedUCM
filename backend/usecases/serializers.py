from rest_framework import serializers
from .models import UseCase
from rules.models import Rule

class UseCaseSerializer(serializers.ModelSerializer):
    rules = serializers.SerializerMethodField()

    class Meta:
        model = UseCase
        fields = '__all__'

    def get_rules(self, obj):
        try:
            # Garante que vai buscar com segurança à tabela Rule nova pelo ID do Use Case
            regras = Rule.objects.filter(useCaseId=obj.id)
            return list(regras.values('id', 'title', 'syntax'))
        except Exception:
            return []

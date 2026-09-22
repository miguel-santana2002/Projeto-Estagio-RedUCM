from rest_framework import serializers
from rules.models import RegisteredLogSource, Rule, RuleModel
from usecases.models import UseCase


SUPPORTED_TARGET_SYNTAXES = [
    "SPL (Splunk)",
    "KQL (Sentinel)",
    "AQL (QRadar)",
    "EQL (Elastic)",
    "Sigma Rule",
    "CQL (CrowdStrike)",
]


class ConvertRuleSerializer(serializers.Serializer):
    source_query = serializers.CharField(
        required=True,
        allow_blank=False,
        error_messages={"required": "A query de origem é obrigatória."}
    )
    source_syntax = serializers.CharField(        
        required=True,
        allow_blank=False
    )
    target_syntax = serializers.ChoiceField(
        choices=SUPPORTED_TARGET_SYNTAXES,
        required=True
    )


class ConvertRuleResponseSerializer(serializers.Serializer):
    sigma_rule = serializers.CharField()
    target_query = serializers.CharField()


class RuleModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleModel
        fields = '__all__'


class RuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rule
        fields = '__all__'
        extra_kwargs = {
            'client': {'required': False, 'allow_null': True},
            'ruleModel': {'required': True},
        }

    def to_representation(self, instance):
        """Mantém a estrutura aninhada para o frontend no GET sem afetar o POST."""
        data = super().to_representation(instance)

        # Expande dados do cliente se existir, caso contrário devolve None
        if instance.client:
            data['client'] = {
                'pk': instance.client.pk,
                'name': getattr(instance.client, 'name', str(instance.client))
            }
        else:
            data['client'] = None

        # Expande dados essenciais do modelo associado
        if instance.ruleModel:
            data['ruleModel'] = {
                'id': instance.ruleModel.id,
                'title': instance.ruleModel.title,
                'type': getattr(instance.ruleModel, 'type', None),
                'syntax': getattr(instance.ruleModel, 'syntax', None),
                'useCaseId': getattr(instance.ruleModel, 'useCaseId', None),
            }
        else:
            data['ruleModel'] = None

        return data


class RegisteredLogSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegisteredLogSource
        fields = '__all__'
        depth = 1
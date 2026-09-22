from rest_framework import serializers
from usecases.models import UseCase
from rest_framework import serializers

class UseCaseSerializer(serializers.ModelSerializer):
    playbook = serializers.ImageField(required=False, allow_null=True)

   
    class Meta:
        model = UseCase
        fields = ['id', 'title', 'cncsClass', 'cncsType', 'description', 'mitigation', 'mitreTechniques', 'phaseTasks', 'rules', 'attackVectors', 'playbook']

from rules.models import RegisteredLogSource, Rule, RuleModel
from rest_framework import serializers
from usecases.models import UseCase
from rest_framework import serializers
from usecases.models import UseCase


class RuleModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleModel
        fields = '__all__'

class RuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rule
        fields = '__all__'
        depth = 1

class RegisteredLogSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegisteredLogSource
        fields = '__all__'
        depth = 1


        

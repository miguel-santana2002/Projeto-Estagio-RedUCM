from django.urls import path
from rules.views import (
    createRegisteredLogSource,
    createRule,
    createRuleModel,
    deleteLogSourceById,
    deleteRuleModelById,
    deleteRuleById,
    getRegisteredLogSources,
    getRuleById,
    getRuleModelById,
    getRuleModels,
    getRuleModelsByUseCase,
    getRules,
    getRulesByUseCase,
    updateRuleCode,
    updateRuleModelCode,
    updateRuleModel,
    updateLogSourceById,
    convertRule,
    updateRule,
)
from rest_framework.urlpatterns import format_suffix_patterns


urlpatterns = [
    path('createRuleModel', createRuleModel, name='createRuleModel'),
    path('getRuleModels', getRuleModels, name='getRuleModels'),
    path('getRuleModelsByUseCase/<int:useCaseId>', getRuleModelsByUseCase, name='getRuleModelsByUseCase'),
    path('getRuleModelById/<int:id>', getRuleModelById, name='getRuleModelById'),
    path('deleteRuleModelById/<int:id>', deleteRuleModelById, name='deleteRuleModelById'),
    path('deleteRuleById/<int:id>', deleteRuleById, name='deleteRuleById'),
    path('createRule', createRule, name="createRule"),
    path('getRules', getRules, name='getRules'),
    path('getRulesByUseCase/<int:useCaseId>', getRulesByUseCase, name='getRulesByUseCase'),
    path('getRuleById/<int:id>', getRuleById, name='getRuleById'),
    path('createRegisteredLogSource', createRegisteredLogSource, name='createRegisteredLogSource'),
    path('getRegisteredLogSources', getRegisteredLogSources, name='getRegisteredLogSources'),
    path('deleteLogSourceById/<int:id>',deleteLogSourceById, name='deleteLogSourceById'),
    path('updateRuleModelCode/<int:id>', updateRuleModelCode, name='updateRuleModelCode'),
    path('updateRuleCode/<int:id>', updateRuleCode, name='updateRuleCode'),
    path('updateRuleModel/<int:id>', updateRuleModel, name='updateRuleModel'),
    path('updateLogSourceById/<int:id>', updateLogSourceById, name='updateLogSourceById'),
    path('convertRule', convertRule, name='convertRule'),
    path('updateRule/<int:id>', updateRule, name='updateRule'),

]

# urlpatterns = format_suffix_patterns(urlpatterns)

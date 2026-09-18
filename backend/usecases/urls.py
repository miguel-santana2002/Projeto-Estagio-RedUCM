from usecases.views import createUseCase, deleteUseCase, getAllTechniques, getComponentsByTechniqueId, getDataSourcesByTechniqueId, getMitigationsByTechniqueId, getTechniqueById, getTechniqueTacticBasedOnListIds, getTechniqueTacticById, getUseCaseById, getUseCases, updatePhaseTasks, updateUseCase
from django.urls import path
from rest_framework.urlpatterns import format_suffix_patterns

urlpatterns = [
    path('getTechniqueById/<str:id>', getTechniqueById, name='getTechniqueById'),
    path('getAllTechniques/', getAllTechniques, name='getAllTechniques'),
    path('createUseCase', createUseCase, name='createUseCase'),
    path('getMitigationsByTechniqueId/<str:id>', getMitigationsByTechniqueId, name='getMitigationsByTechniqueId'),
    path('getDataSourcesByTechniqueId/<str:id>', getDataSourcesByTechniqueId, name='getDataSourcesByTechniqueId'),
    path('getComponentsByTechniqueId/<str:id>', getComponentsByTechniqueId, name='getComponentsByTechniqueId'),
    path('getUseCases', getUseCases, name='getUseCases'),
    path('deleteUseCase/<str:id>', deleteUseCase, name='deleteUseCase'),
    path('getUseCaseById/<int:id>', getUseCaseById, name='getUseCaseById'),
    path('updatePhaseTasks/<int:id>', updatePhaseTasks, name='updatePhaseTasks'),
    path('updateUseCase/<int:id>', updateUseCase, name='updateUseCase'),
    path('getTechniqueTacticById/<str:id>', getTechniqueTacticById, name='getTechniqueTacticById'),
    path('getTechniqueTacticBasedOnListIds/', getTechniqueTacticBasedOnListIds, name='getTechniqueTacticBasedOnListIds'),
]
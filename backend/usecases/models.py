from django.db import models
from django.contrib.postgres.fields import ArrayField


from rest_framework import permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import viewsets

# Create your models here.

def upload_to(instance, filename):
    return 'images/{filename}'.format(filename=filename)


class UseCase(models.Model):
    title = models.CharField(max_length=1000)
    cncsClass = models.CharField(max_length=1000, blank=True, null=True)
    cncsType = models.CharField(max_length=1000, blank=True, null=True)
    description = models.CharField(max_length=1000000, blank=True, null=True)
    mitigation = models.CharField(max_length=1000000, blank=True, null=True)
    mitreTechniques = ArrayField(models.CharField( blank=True, null=True),blank=True, null=True)
    phaseTasks = ArrayField(models.JSONField(blank=True, null=True), blank=True, null=True)
    rules = ArrayField(models.JSONField(blank=True, null=True), blank=True, null=True)
    tactics = ArrayField(models.CharField(blank=True, null=True), blank=True, null=True)  # <-- Substituído aqui por tactics (vetores de ataque nao se aplica)
    playbook = models.ImageField(upload_to=upload_to, blank=True, null=True)


class UseCaseViewSet(viewsets.ModelViewSet):
    from usecases.serializers import UseCaseSerializer
    queryset = UseCase.objects.order_by('-id')
    serializer_class = UseCaseSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [
        permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


#class UseCase(models.Model):
 #   title = models.CharField()
 #   description = models.CharField(blank=True, null=True)
  #  mitigation = models.CharField(blank=True, null=True)
 #   playbook = models.BinaryField(blank=True)
 #   mitreTechniques = ArrayField(models.CharField(blank=True, null=True), blank=True, null=True)
 ##   cncsClass = models.CharField(blank=True, null=True)
  #  cncsType = models.CharField(blank=True, null=True)
  #  PhaseTasks = ArrayField(models.JSONField(blank=True, null=True), blank=True, null=True)

#



    #apaguei o  detections

    def __str__(self):
        return self.name

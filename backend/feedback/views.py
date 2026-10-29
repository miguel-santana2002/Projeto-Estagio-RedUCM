import json
from django.db.models import Q
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .models import Feedback, FeedbackAttachment
from .serializers import FeedbackSerializer, FeedbackAttachmentSerializer


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permissão customizada:
    - Leitura (GET, HEAD, OPTIONS): Permitida a todos.
    - Alteração/Eliminação (PUT, PATCH, DELETE): Permitida apenas ao criador do ticket ou Administradores/Staff.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        # Staff/Admins mantêm acesso total
        if getattr(request.user, 'is_superuser', False):
            return True

        # Operadores só podem editar ou apagar os próprios tickets
        return obj.created_by == request.user


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.prefetch_related('attachments').all().order_by('-created_at')
    serializer_class = FeedbackSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsOwnerOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()

        type_param = self.request.query_params.get('type')
        if type_param:
            qs = qs.filter(type=type_param.upper())

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param.upper())

        priority_param = self.request.query_params.get('priority')
        if priority_param:
            qs = qs.filter(priority=priority_param.upper())

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(created_by_name__icontains=search)
            )

        return qs

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        user_name = ''
        if user:
            user_name = user.username or user.email
        elif self.request.data.get('created_by_name'):
            user_name = self.request.data.get('created_by_name')

        # Força o estado 'CRIADO' na criação, ignorando valores passados no payload
        instance = serializer.save(
            status='CRIADO',
            created_by=user,
            created_by_name=user_name or 'Anónimo'
        )

        self._save_attachments(instance, self.request.FILES)

    def perform_update(self, serializer):
        instance = serializer.save()

        remove_ids = self.request.data.get('remove_attachment_ids')
        if remove_ids:
            if isinstance(remove_ids, str):
                try:
                    remove_ids = json.loads(remove_ids)
                except Exception:
                    remove_ids = [int(i.strip()) for i in remove_ids.split(',') if i.strip().isdigit()]
            if isinstance(remove_ids, list):
                FeedbackAttachment.objects.filter(feedback=instance, id__in=remove_ids).delete()

        self._save_attachments(instance, self.request.FILES)

    def _save_attachments(self, feedback_instance, files_dict):
        uploaded_files = []
        if 'attachments' in files_dict:
            uploaded_files.extend(files_dict.getlist('attachments'))
        if 'files' in files_dict:
            uploaded_files.extend(files_dict.getlist('files'))
        if 'attachment' in files_dict and 'attachment' not in ['attachments', 'files']:
            uploaded_files.extend(files_dict.getlist('attachment'))

        for f in uploaded_files:
            FeedbackAttachment.objects.create(
                feedback=feedback_instance,
                file=f,
                filename=f.name,
                file_size=f.size
            )

    @action(detail=True, methods=['delete'], url_path='attachment/(?P<attachment_id>[^/.]+)')
    def delete_attachment(self, request, pk=None, attachment_id=None):
        feedback = self.get_object()
        try:
            att = feedback.attachments.get(id=attachment_id)
            att.delete()
            return Response({'detail': 'Anexo removido com sucesso.'}, status=status.HTTP_204_NO_CONTENT)
        except FeedbackAttachment.DoesNotExist:
            return Response({'detail': 'Anexo não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
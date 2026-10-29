from rest_framework import serializers
from .models import Feedback, FeedbackAttachment


class FeedbackAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = FeedbackAttachment
        fields = ['id', 'feedback', 'file', 'filename', 'file_size', 'file_url', 'uploaded_at']
        read_only_fields = ['id', 'filename', 'file_size', 'file_url', 'uploaded_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class FeedbackSerializer(serializers.ModelSerializer):
    attachments = FeedbackAttachmentSerializer(many=True, read_only=True)
    author = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = [
            'id',
            'title',
            'description',
            'type',
            'status',
            'priority',
            'created_by',
            'created_by_name',
            'author',
            'created_at',
            'updated_at',
            'attachments',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'author', 'created_at', 'updated_at', 'attachments']

    def get_author(self, obj):
        if obj.created_by:
            return obj.created_by.username or obj.created_by.email
        return obj.created_by_name or 'Anónimo'


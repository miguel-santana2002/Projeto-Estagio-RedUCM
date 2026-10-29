import os
from django.db import models
from django.conf import settings


def feedback_attachment_path(instance, filename):
    report_id = instance.feedback_id or 'temp'
    return os.path.join('feedback_attachments', f"report_{report_id}", filename)


class Feedback(models.Model):
    TYPE_CHOICES = [
        ('BUG', 'Bug / Erro'),
        ('FEATURE', 'Sugestão / Melhoria'),
    ]

    STATUS_CHOICES = [
        ('CRIADO', 'Criado'),
        ('EM_ANALISE', 'Em Análise'),
        ('CONCLUIDO', 'Concluido'),
        ('FECHADO', 'Fechado'),
    ]

    PRIORITY_CHOICES = [
        ('LOW', 'Baixa'),
        ('MEDIUM', 'Média'),
        ('HIGH', 'Alta'),
        ('CRITICAL', 'Crítica'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='BUG')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CRIADO')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedbacks'
    )
    created_by_name = models.CharField(max_length=150, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.type}] {self.title} ({self.status})"


class FeedbackAttachment(models.Model):
    feedback = models.ForeignKey(
        Feedback,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(upload_to=feedback_attachment_path)
    filename = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['uploaded_at']

    def save(self, *args, **kwargs):
        if self.file and not self.filename:
            self.filename = os.path.basename(self.file.name)
        if self.file and hasattr(self.file, 'size') and not self.file_size:
            self.file_size = self.file.size
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.file:
            try:
                if os.path.isfile(self.file.path):
                    os.remove(self.file.path)
            except Exception:
                pass
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.filename or os.path.basename(self.file.name)


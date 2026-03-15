"""
Models for Pipeline app.

Contains models for:
- PipelineExecution: Metadata de ejecuciones del pipeline (14 etapas)
"""

from django.db import models
import uuid


class PipelineExecution(models.Model):
    """
    Modelo de ejecucion del pipeline.
    Almacena metadata de cada etapa del pipeline automatico (14 etapas).
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
    ]

    execution_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        db_index=True,
        help_text="UUID unico para agrupar todas las etapas de una ejecucion"
    )
    stage_name = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Nombre de la etapa del pipeline"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(
        null=True,
        blank=True,
        help_text="Duracion de la etapa en segundos"
    )
    cache_hit = models.BooleanField(
        default=False,
        help_text="Indica si se uso cache (Redis/MySQL/Drive)"
    )
    config_hash = models.CharField(
        max_length=32,
        null=True,
        blank=True,
        help_text="Hash MD5 de la configuracion para invalidacion de cache"
    )
    error_message = models.TextField(
        null=True,
        blank=True,
        help_text="Mensaje de error si status='failed'"
    )
    result_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Resultado completo de la etapa (vocabulario, tópicos, factores, etc.)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pipeline_executions'
        ordering = ['-created_at', 'stage_name']
        indexes = [
            models.Index(fields=['execution_id']),
            models.Index(fields=['stage_name']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.execution_id} - {self.stage_name}: {self.status}"

    @property
    def is_running(self):
        """Indica si la etapa esta en ejecucion."""
        return self.status == 'running'

    @property
    def is_completed(self):
        """Indica si la etapa fue completada exitosamente."""
        return self.status == 'completed'

    @property
    def has_failed(self):
        """Indica si la etapa fallo."""
        return self.status == 'failed'

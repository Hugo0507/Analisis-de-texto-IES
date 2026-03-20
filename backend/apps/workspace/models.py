"""
Workspace Models

Modelos para el Laboratorio: sesiones de inferencia sobre nuevos documentos
usando modelos ya entrenados del corpus.
"""

import uuid
from django.db import models
from django.conf import settings
from apps.datasets.models import Dataset


class Workspace(models.Model):
    """
    Sesión de Laboratorio.

    Agrupa documentos nuevos subidos por el usuario y los resultados
    de inferencia obtenidos usando los modelos entrenados del dataset.
    """

    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_COMPLETED = 'completed'
    STATUS_ERROR = 'error'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_PROCESSING, 'Procesando'),
        (STATUS_COMPLETED, 'Completado'),
        (STATUS_ERROR, 'Error'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workspaces',
        verbose_name='Creado por'
    )
    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name='workspaces',
        verbose_name='Dataset de referencia'
    )

    # IDs de los análisis entrenados a usar para inferencia
    bow_id = models.IntegerField(null=True, blank=True, verbose_name='BoW de referencia')
    tfidf_id = models.IntegerField(null=True, blank=True, verbose_name='TF-IDF de referencia')
    topic_model_id = models.IntegerField(null=True, blank=True, verbose_name='Topic Model de referencia')

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name='Estado'
    )
    progress_percentage = models.IntegerField(default=0, verbose_name='Progreso (%)')
    error_message = models.TextField(null=True, blank=True, verbose_name='Mensaje de error')

    # Resultados JSON de inferencia
    results = models.JSONField(default=dict, verbose_name='Resultados de inferencia')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado')
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name='Expira')

    class Meta:
        db_table = 'workspace'
        verbose_name = 'Workspace'
        verbose_name_plural = 'Workspaces'
        ordering = ['-created_at']

    def __str__(self):
        return f"Workspace {self.id} — {self.dataset.name}"


class WorkspaceDocument(models.Model):
    """
    Documento subido al Laboratorio.

    Un PDF subido por el usuario para ser analizado mediante
    inferencia con los modelos del corpus de referencia.
    """

    STATUS_PENDING = 'pending'
    STATUS_EXTRACTING = 'extracting'
    STATUS_READY = 'ready'
    STATUS_ERROR = 'error'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_EXTRACTING, 'Extrayendo texto'),
        (STATUS_READY, 'Listo'),
        (STATUS_ERROR, 'Error'),
    ]

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name='Workspace'
    )

    file = models.FileField(
        upload_to='workspace/pdfs/',
        verbose_name='Archivo PDF'
    )
    original_filename = models.CharField(max_length=255, verbose_name='Nombre original')
    file_size = models.IntegerField(default=0, verbose_name='Tamaño (bytes)')

    # Texto extraído del PDF
    extracted_text = models.TextField(null=True, blank=True, verbose_name='Texto extraído')
    preprocessed_text = models.TextField(null=True, blank=True, verbose_name='Texto preprocesado')

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name='Estado'
    )
    error_message = models.TextField(null=True, blank=True, verbose_name='Mensaje de error')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado')

    class Meta:
        db_table = 'workspace_document'
        verbose_name = 'Documento del Workspace'
        verbose_name_plural = 'Documentos del Workspace'

    def __str__(self):
        return f"{self.original_filename} ({self.workspace_id})"

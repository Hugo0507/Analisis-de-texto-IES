"""
Data Preparation Models

Modelos para gestión de preparación de datos NLP.
"""

from django.db import models
from django.contrib.auth import get_user_model
from apps.datasets.models import Dataset

User = get_user_model()


class DataPreparation(models.Model):
    """
    Modelo para almacenar configuración y resultados de preparación de datos.

    Flujo:
    1. Usuario selecciona dataset
    2. Configura opciones de limpieza y transformación
    3. Sistema procesa en background (Celery)
    4. Se genera informe de resultados
    """

    # Estados posibles
    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_COMPLETED = 'completed'
    STATUS_ERROR = 'error'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_PROCESSING, 'En Proceso'),
        (STATUS_COMPLETED, 'Completado'),
        (STATUS_ERROR, 'Error'),
    ]

    # Etapas del proceso
    STAGE_EXTRACTING = 'extracting'
    STAGE_DETECTING_LANGUAGE = 'detecting_language'
    STAGE_CLEANING = 'cleaning'
    STAGE_TRANSFORMING = 'transforming'
    STAGE_VALIDATING = 'validating'
    STAGE_COMPLETED = 'completed'

    STAGE_CHOICES = [
        (STAGE_EXTRACTING, 'Extrayendo PDF'),
        (STAGE_DETECTING_LANGUAGE, 'Detectando Idiomas'),
        (STAGE_CLEANING, 'Limpiando Texto'),
        (STAGE_TRANSFORMING, 'Transformando'),
        (STAGE_VALIDATING, 'Validando'),
        (STAGE_COMPLETED, 'Completado'),
    ]

    # Relaciones
    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name='preparations',
        verbose_name='Dataset'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='data_preparations',
        verbose_name='Creado por'
    )

    # Identificación
    name = models.CharField(
        max_length=255,
        verbose_name='Nombre',
        help_text='Nombre descriptivo para esta preparación'
    )

    # Configuración - Limpieza
    custom_stopwords = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Stopwords Personalizadas',
        help_text='Lista de palabras a eliminar además de las por defecto'
    )
    filter_by_predominant_language = models.BooleanField(
        default=True,
        verbose_name='Filtrar por Idioma Predominante',
        help_text='Mantener solo archivos del idioma más común'
    )

    # Configuración - Transformación
    enable_tokenization = models.BooleanField(
        default=True,
        verbose_name='Tokenización'
    )
    enable_lemmatization = models.BooleanField(
        default=True,
        verbose_name='Lematización (spaCy)'
    )
    enable_special_chars_removal = models.BooleanField(
        default=True,
        verbose_name='Eliminación de Caracteres Especiales'
    )

    # Configuración - Validación
    enable_integrity_check = models.BooleanField(
        default=True,
        verbose_name='Verificación de Integridad'
    )
    enable_duplicate_removal = models.BooleanField(
        default=True,
        verbose_name='Eliminación de Duplicados'
    )

    # Estado y Progreso
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name='Estado'
    )
    current_stage = models.CharField(
        max_length=30,
        choices=STAGE_CHOICES,
        blank=True,
        null=True,
        verbose_name='Etapa Actual'
    )
    progress_percentage = models.IntegerField(
        default=0,
        verbose_name='Progreso (%)',
        help_text='Porcentaje de completitud (0-100)'
    )
    error_message = models.TextField(
        blank=True,
        null=True,
        verbose_name='Mensaje de Error'
    )

    # Resultados - Idiomas Detectados
    detected_languages = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Idiomas Detectados',
        help_text='Formato: {"en": 256, "es": 18, "ru": 13}'
    )
    predominant_language = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name='Idioma Predominante',
        help_text='Código ISO del idioma predominante (ej: "en", "es")'
    )
    predominant_language_percentage = models.FloatField(
        default=0.0,
        verbose_name='Porcentaje del Idioma Predominante'
    )

    # Resultados - Estadísticas
    total_files_analyzed = models.IntegerField(
        default=0,
        verbose_name='Total de Archivos Analizados'
    )
    files_processed = models.IntegerField(
        default=0,
        verbose_name='Archivos Procesados',
        help_text='Archivos del idioma predominante'
    )
    files_omitted = models.IntegerField(
        default=0,
        verbose_name='Archivos Omitidos',
        help_text='Archivos de otros idiomas'
    )
    duplicates_removed = models.IntegerField(
        default=0,
        verbose_name='Duplicados Eliminados'
    )

    # Resultados - Archivos Procesados
    processed_file_ids = models.JSONField(
        default=list,
        blank=True,
        verbose_name='IDs de Archivos Procesados',
        help_text='Lista de IDs de DatasetFile procesados'
    )
    omitted_file_ids = models.JSONField(
        default=list,
        blank=True,
        verbose_name='IDs de Archivos Omitidos',
        help_text='Lista de IDs de DatasetFile omitidos'
    )

    # Metadatos
    task_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Task ID (Celery)',
        help_text='ID de la tarea de Celery para seguimiento'
    )
    processing_started_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Inicio de Procesamiento'
    )
    processing_completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Fin de Procesamiento'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Última Actualización'
    )

    class Meta:
        verbose_name = 'Preparación de Datos'
        verbose_name_plural = 'Preparaciones de Datos'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['dataset']),
        ]

    def __str__(self):
        return f"{self.name} - {self.dataset.name}"

    @property
    def processing_duration(self):
        """Duración del procesamiento en segundos."""
        if self.processing_started_at and self.processing_completed_at:
            delta = self.processing_completed_at - self.processing_started_at
            return delta.total_seconds()
        return None

    @property
    def is_processing(self):
        """Indica si está en proceso."""
        return self.status == self.STATUS_PROCESSING

    @property
    def is_completed(self):
        """Indica si está completado."""
        return self.status == self.STATUS_COMPLETED

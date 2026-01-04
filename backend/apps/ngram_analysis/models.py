"""
Ngram Analysis Models

Análisis comparativo de múltiples configuraciones de N-gramas.
"""

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class NgramAnalysis(models.Model):
    """
    Análisis comparativo de N-gramas.

    Ejecuta múltiples análisis de Bolsa de Palabras con diferentes
    configuraciones de n-gramas y permite comparar resultados.
    """

    # Estados
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

    # Etapas
    STAGE_PENDING = 'pending'
    STAGE_LOADING_DATA = 'loading_data'
    STAGE_PROCESSING_NGRAMS = 'processing_ngrams'
    STAGE_CALCULATING_COMPARISONS = 'calculating_comparisons'
    STAGE_SAVING_RESULTS = 'saving_results'
    STAGE_COMPLETED = 'completed'

    STAGE_CHOICES = [
        (STAGE_PENDING, 'Pendiente'),
        (STAGE_LOADING_DATA, 'Cargando datos'),
        (STAGE_PROCESSING_NGRAMS, 'Procesando N-gramas'),
        (STAGE_CALCULATING_COMPARISONS, 'Calculando comparaciones'),
        (STAGE_SAVING_RESULTS, 'Guardando resultados'),
        (STAGE_COMPLETED, 'Completado'),
    ]

    # Información básica
    name = models.CharField(max_length=255, verbose_name='Nombre del análisis')
    description = models.TextField(blank=True, verbose_name='Descripción')

    # Relaciones
    data_preparation = models.ForeignKey(
        'data_preparation.DataPreparation',
        on_delete=models.CASCADE,
        related_name='ngram_analyses',
        verbose_name='Preparación de datos'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ngram_analyses',
        verbose_name='Creado por'
    )

    # Configuraciones de n-gramas a ejecutar
    # Formato: [[1,1], [1,2], [1,3], [2,2], [2,3], [3,3]]
    ngram_configurations = models.JSONField(
        default=list,
        verbose_name='Configuraciones de N-gramas'
    )

    # Parámetros comunes para todos los análisis
    max_features = models.IntegerField(
        default=100000,
        verbose_name='Máximo de features'
    )
    min_df = models.IntegerField(
        default=1,
        verbose_name='Frecuencia mínima de documento'
    )
    max_df = models.FloatField(
        default=1.0,
        verbose_name='Frecuencia máxima de documento'
    )

    # Contadores
    document_count = models.IntegerField(default=0, verbose_name='Número de documentos')
    total_configurations = models.IntegerField(default=0, verbose_name='Total de configuraciones')

    # Resultados por configuración
    # Formato: {
    #   "1_1": {
    #     "vocabulary_size": 1000,
    #     "matrix_shape": {"rows": 254, "cols": 1000},
    #     "matrix_sparsity": 0.4655,
    #     "avg_terms_per_document": 45.2,
    #     "top_terms": [...],
    #     "unique_terms": 800  # Términos únicos de esta configuración
    #   },
    #   "1_2": {...},
    #   ...
    # }
    results = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Resultados por configuración'
    )

    # Comparaciones entre configuraciones
    # Formato: {
    #   "overlapping_terms": {
    #     "1_1_vs_1_2": 650,
    #     "1_1_vs_2_2": 300,
    #     ...
    #   },
    #   "unique_contributions": {
    #     "1_1": 350,  # Términos únicos que solo aporta (1,1)
    #     "1_2": 200,
    #     ...
    #   },
    #   "total_unique_terms": 1500  # Vocabulario combinado total
    # }
    comparisons = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Comparaciones entre configuraciones'
    )

    # Estado y progreso
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name='Estado'
    )
    current_stage = models.CharField(
        max_length=50,
        choices=STAGE_CHOICES,
        default=STAGE_PENDING,
        verbose_name='Etapa actual'
    )
    progress_percentage = models.IntegerField(
        default=0,
        verbose_name='Porcentaje de progreso'
    )
    error_message = models.TextField(
        blank=True,
        verbose_name='Mensaje de error'
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de creación'
    )
    processing_started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Inicio de procesamiento'
    )
    processing_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fin de procesamiento'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Última actualización'
    )

    class Meta:
        verbose_name = 'Análisis de N-gramas'
        verbose_name_plural = 'Análisis de N-gramas'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['data_preparation']),
        ]

    def __str__(self):
        return f"{self.name} ({len(self.ngram_configurations)} configuraciones)"

    @property
    def current_stage_label(self):
        """Obtener etiqueta de la etapa actual."""
        return dict(self.STAGE_CHOICES).get(self.current_stage, '')

    @property
    def status_label(self):
        """Obtener etiqueta del estado."""
        return dict(self.STATUS_CHOICES).get(self.status, '')

    @property
    def data_preparation_name(self):
        """Nombre de la preparación de datos."""
        return self.data_preparation.name if self.data_preparation else ''

    @property
    def dataset_name(self):
        """Nombre del dataset."""
        return self.data_preparation.dataset.name if self.data_preparation and self.data_preparation.dataset else ''

    @property
    def created_by_email(self):
        """Email del creador."""
        return self.created_by.email if self.created_by else ''

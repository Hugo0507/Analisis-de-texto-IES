"""
Bag of Words Models

Modelo para análisis de Bolsa de Palabras (BoW).
Crea representaciones vectoriales de documentos preprocesados.
"""

from django.db import models
from django.conf import settings
from apps.data_preparation.models import DataPreparation


class BagOfWords(models.Model):
    """
    Modelo de Bolsa de Palabras.

    Genera representaciones vectoriales de documentos usando diferentes
    métodos de vectorización (CountVectorizer, TfidfVectorizer).
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

    # Etapas de procesamiento
    STAGE_PENDING = 'pending'
    STAGE_LOADING_DATA = 'loading_data'
    STAGE_VECTORIZING = 'vectorizing'
    STAGE_CALCULATING_STATS = 'calculating_stats'
    STAGE_SAVING_RESULTS = 'saving_results'
    STAGE_COMPLETED = 'completed'

    STAGE_CHOICES = [
        (STAGE_PENDING, 'Pendiente'),
        (STAGE_LOADING_DATA, 'Cargando datos preprocesados'),
        (STAGE_VECTORIZING, 'Vectorizando documentos'),
        (STAGE_CALCULATING_STATS, 'Calculando estadísticas'),
        (STAGE_SAVING_RESULTS, 'Guardando resultados'),
        (STAGE_COMPLETED, 'Completado'),
    ]

    # === Información básica ===
    name = models.CharField(
        max_length=200,
        help_text="Nombre descriptivo del análisis BoW"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Descripción opcional del análisis"
    )

    # === Relaciones ===
    data_preparation = models.ForeignKey(
        DataPreparation,
        on_delete=models.CASCADE,
        related_name='bag_of_words_analyses',
        help_text="Preparación de datos a utilizar"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bag_of_words_analyses',
        help_text="Usuario que creó este análisis"
    )

    # === Configuración de vectorización (Count Vectorizer) ===
    max_features = models.IntegerField(
        default=1000,
        help_text="Número máximo de features (palabras) a considerar"
    )

    min_df = models.IntegerField(
        default=1,
        help_text="Mínima frecuencia de documento (ignorar términos que aparecen en menos de N documentos)"
    )

    max_df = models.FloatField(
        default=1.0,
        help_text="Máxima frecuencia de documento (ignorar términos que aparecen en más de % de documentos)"
    )

    ngram_min = models.IntegerField(
        default=1,
        help_text="Tamaño mínimo de n-gramas (1 = unigramas)"
    )

    ngram_max = models.IntegerField(
        default=1,
        help_text="Tamaño máximo de n-gramas (1 = unigramas, 2 = bigramas, etc.)"
    )

    # === Estado del procesamiento ===
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Estado actual del análisis"
    )

    current_stage = models.CharField(
        max_length=50,
        choices=STAGE_CHOICES,
        default=STAGE_PENDING,
        null=True,
        blank=True,
        help_text="Etapa actual del procesamiento"
    )

    progress_percentage = models.IntegerField(
        default=0,
        help_text="Porcentaje de progreso (0-100)"
    )

    error_message = models.TextField(
        null=True,
        blank=True,
        help_text="Mensaje de error si el procesamiento falla"
    )

    # === Resultados ===
    vocabulary_size = models.IntegerField(
        default=0,
        help_text="Tamaño del vocabulario generado"
    )

    document_count = models.IntegerField(
        default=0,
        help_text="Número de documentos procesados"
    )

    matrix_shape = models.JSONField(
        default=dict,
        blank=True,
        help_text="Dimensiones de la matriz documento-término (rows, cols)"
    )

    matrix_sparsity = models.FloatField(
        default=0.0,
        help_text="Esparsidad de la matriz (% de ceros)"
    )

    top_terms = models.JSONField(
        default=list,
        blank=True,
        help_text="Top términos más frecuentes/importantes con sus valores"
    )

    vocabulary = models.JSONField(
        default=dict,
        blank=True,
        help_text="Vocabulario completo (término: índice)"
    )

    feature_names = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de nombres de features (palabras)"
    )

    # === Estadísticas adicionales ===
    avg_terms_per_document = models.FloatField(
        default=0.0,
        help_text="Promedio de términos únicos por documento"
    )

    total_term_occurrences = models.IntegerField(
        default=0,
        help_text="Total de ocurrencias de términos en el corpus"
    )

    # === Timestamps ===
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Fecha de creación"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Fecha de última actualización"
    )

    processing_started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha de inicio del procesamiento"
    )

    processing_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha de finalización del procesamiento"
    )

    # === Artefacto de modelo (serializado para inferencia) ===
    model_artifact = models.FileField(
        upload_to='artifacts/bow/',
        null=True,
        blank=True,
        help_text="Vectorizador CountVectorizer serializado (joblib) para inferencia sobre nuevos documentos"
    )
    model_artifact_bin = models.BinaryField(
        null=True,
        blank=True,
        help_text="Vectorizador serializado (joblib) almacenado en DB para persistencia en hosting efímero"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Bolsa de Palabras'
        verbose_name_plural = 'Bolsas de Palabras'
        indexes = [
            models.Index(fields=['created_by', '-created_at']),
            models.Index(fields=['data_preparation']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.name} (Bag of Words)"

    @property
    def ngram_range(self):
        """Retorna tupla de ngram_range."""
        return (self.ngram_min, self.ngram_max)

    @property
    def is_completed(self):
        """Verifica si el análisis está completado."""
        return self.status == self.STATUS_COMPLETED

    @property
    def is_processing(self):
        """Verifica si el análisis está en proceso."""
        return self.status == self.STATUS_PROCESSING

    @property
    def has_error(self):
        """Verifica si el análisis tiene error."""
        return self.status == self.STATUS_ERROR

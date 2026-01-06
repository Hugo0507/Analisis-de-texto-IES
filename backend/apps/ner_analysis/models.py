"""
NER Analysis Models

Modelo para análisis de Reconocimiento de Entidades Nombradas usando spaCy.
"""

from django.db import models
from django.conf import settings
from apps.data_preparation.models import DataPreparation
from apps.datasets.models import Dataset


class NerAnalysis(models.Model):
    """
    Modelo de Análisis NER.

    Extrae y analiza entidades nombradas de textos usando spaCy.
    Soporta múltiples modelos y personalización de entidades.
    """

    # === ESTADOS ===
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

    # === ETAPAS DE PROCESAMIENTO ===
    STAGE_PENDING = 'pending'
    STAGE_LOADING_MODEL = 'loading_model'
    STAGE_LOADING_DATA = 'loading_data'
    STAGE_EXTRACTING_ENTITIES = 'extracting_entities'
    STAGE_CALCULATING_STATS = 'calculating_stats'
    STAGE_ANALYZING_COOCCURRENCES = 'analyzing_cooccurrences'
    STAGE_SAVING_RESULTS = 'saving_results'
    STAGE_COMPLETED = 'completed'

    STAGE_CHOICES = [
        (STAGE_PENDING, 'Pendiente'),
        (STAGE_LOADING_MODEL, 'Cargando modelo spaCy'),
        (STAGE_LOADING_DATA, 'Cargando datos'),
        (STAGE_EXTRACTING_ENTITIES, 'Extrayendo entidades'),
        (STAGE_CALCULATING_STATS, 'Calculando estadísticas'),
        (STAGE_ANALYZING_COOCCURRENCES, 'Analizando co-ocurrencias'),
        (STAGE_SAVING_RESULTS, 'Guardando resultados'),
        (STAGE_COMPLETED, 'Completado'),
    ]

    # === MODELOS DE SPACY SOPORTADOS ===
    MODEL_EN_SM = 'en_core_web_sm'
    MODEL_EN_MD = 'en_core_web_md'
    MODEL_EN_LG = 'en_core_web_lg'
    MODEL_ES_SM = 'es_core_news_sm'
    MODEL_ES_MD = 'es_core_news_md'
    MODEL_ES_LG = 'es_core_news_lg'

    MODEL_CHOICES = [
        (MODEL_EN_SM, 'Inglés (Pequeño) - en_core_web_sm'),
        (MODEL_EN_MD, 'Inglés (Mediano) - en_core_web_md'),
        (MODEL_EN_LG, 'Inglés (Grande) - en_core_web_lg'),
        (MODEL_ES_SM, 'Español (Pequeño) - es_core_news_sm'),
        (MODEL_ES_MD, 'Español (Mediano) - es_core_news_md'),
        (MODEL_ES_LG, 'Español (Grande) - es_core_news_lg'),
    ]

    # === FUENTES DE DATOS ===
    SOURCE_DATA_PREPARATION = 'data_preparation'
    SOURCE_DATASET = 'dataset'

    SOURCE_CHOICES = [
        (SOURCE_DATA_PREPARATION, 'Preparación de Datos (Preprocesado)'),
        (SOURCE_DATASET, 'Dataset Directo (Textos Raw)'),
    ]

    # === INFORMACIÓN BÁSICA ===
    name = models.CharField(
        max_length=200,
        help_text="Nombre descriptivo del análisis NER"
    )

    description = models.TextField(
        blank=True,
        null=True,
        help_text="Descripción opcional del análisis"
    )

    # === RELACIONES (Fuente de datos) ===
    source_type = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default=SOURCE_DATA_PREPARATION,
        help_text="Tipo de fuente de datos"
    )

    data_preparation = models.ForeignKey(
        DataPreparation,
        on_delete=models.CASCADE,
        related_name='ner_analyses',
        null=True,
        blank=True,
        help_text="Preparación de datos a utilizar (si source_type='data_preparation')"
    )

    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name='ner_analyses',
        null=True,
        blank=True,
        help_text="Dataset directo a utilizar (si source_type='dataset')"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ner_analyses',
        help_text="Usuario que creó este análisis"
    )

    # === CONFIGURACIÓN DEL MODELO SPACY ===
    spacy_model = models.CharField(
        max_length=50,
        choices=MODEL_CHOICES,
        default=MODEL_EN_SM,
        help_text="Modelo de spaCy a utilizar"
    )

    # === CONFIGURACIÓN DE ENTIDADES ===
    # Array de tipos de entidades seleccionadas
    # Ej: ["PERSON", "ORG", "GPE", "DATE", "MONEY"]
    selected_entities = models.JSONField(
        default=list,
        help_text="Lista de tipos de entidades a extraer"
    )

    # === ESTADO DEL PROCESAMIENTO ===
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

    # === RESULTADOS: ESTADÍSTICAS GENERALES ===
    documents_processed = models.IntegerField(
        default=0,
        help_text="Número de documentos procesados"
    )

    total_entities_found = models.IntegerField(
        default=0,
        help_text="Total de entidades encontradas"
    )

    unique_entities_count = models.IntegerField(
        default=0,
        help_text="Número de entidades únicas"
    )

    entity_types_found = models.JSONField(
        default=dict,
        blank=True,
        help_text="Conteo por tipo de entidad. Ej: {'PERSON': 150, 'ORG': 80}"
    )

    # === RESULTADOS: ENTIDADES DETALLADAS ===
    # Estructura: [
    #   {
    #     "text": "Apple Inc",
    #     "label": "ORG",
    #     "frequency": 45,
    #     "documents": [1, 5, 12, ...],
    #     "document_count": 15
    #   },
    #   ...
    # ]
    entities = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista completa de entidades con frecuencias y documentos"
    )

    # === RESULTADOS: TOP ENTIDADES POR CATEGORÍA ===
    # Estructura: {
    #   "PERSON": [
    #     {"text": "John Doe", "frequency": 50, "document_count": 10},
    #     ...
    #   ],
    #   "ORG": [...],
    #   ...
    # }
    top_entities_by_type = models.JSONField(
        default=dict,
        blank=True,
        help_text="Top N entidades por cada categoría"
    )

    # === RESULTADOS: CO-OCURRENCIAS ===
    # Estructura: [
    #   {
    #     "entity1": {"text": "Apple", "label": "ORG"},
    #     "entity2": {"text": "Steve Jobs", "label": "PERSON"},
    #     "cooccurrence_count": 25,
    #     "documents": [1, 3, 5, ...]
    #   },
    #   ...
    # ]
    cooccurrences = models.JSONField(
        default=list,
        blank=True,
        help_text="Análisis de entidades que co-ocurren en mismos documentos"
    )

    # === RESULTADOS: DISTRIBUCIÓN ===
    # Para gráfico donut - estructura: [
    #   {"label": "PERSON", "value": 150, "percentage": 35.5},
    #   {"label": "ORG", "value": 80, "percentage": 19.0},
    #   ...
    # ]
    entity_distribution = models.JSONField(
        default=list,
        blank=True,
        help_text="Distribución porcentual de tipos de entidades"
    )

    # === TIMESTAMPS ===
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

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Análisis NER'
        verbose_name_plural = 'Análisis NER'
        indexes = [
            models.Index(fields=['created_by', '-created_at']),
            models.Index(fields=['source_type']),
            models.Index(fields=['status']),
            models.Index(fields=['spacy_model']),
        ]

    def __str__(self):
        return f"{self.name} (NER - {self.get_spacy_model_display()})"

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

    @property
    def source_name(self):
        """Obtener nombre de la fuente de datos."""
        if self.source_type == self.SOURCE_DATA_PREPARATION and self.data_preparation:
            return self.data_preparation.name
        elif self.source_type == self.SOURCE_DATASET and self.dataset:
            return self.dataset.name
        return "Sin fuente"

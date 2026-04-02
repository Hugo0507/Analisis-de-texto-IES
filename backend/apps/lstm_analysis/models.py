"""
LSTM Analysis Models

Modelo para clasificación de documentos por tema dominante usando una red LSTM.
Complementa el pipeline NLP: DataPreparation -> TopicModeling -> LstmAnalysis.
"""

from django.db import models
from django.conf import settings
from apps.data_preparation.models import DataPreparation
from apps.topic_modeling.models import TopicModeling


class LstmAnalysis(models.Model):
    """
    Análisis LSTM para clasificación de documentos por tema dominante.

    Arquitectura: Embedding -> LSTM -> Linear -> Softmax
    Fuente de textos: DataPreparation (textos preprocesados)
    Fuente de etiquetas: TopicModeling (temas dominantes por documento)
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
    STAGE_LOADING_DATA = 'loading_data'
    STAGE_BUILDING_VOCAB = 'building_vocab'
    STAGE_ENCODING_SEQUENCES = 'encoding_sequences'
    STAGE_PREPARING_DATASETS = 'preparing_datasets'
    STAGE_TRAINING = 'training'
    STAGE_EVALUATING = 'evaluating'
    STAGE_SAVING_RESULTS = 'saving_results'
    STAGE_COMPLETED = 'completed'

    STAGE_CHOICES = [
        (STAGE_PENDING, 'Pendiente'),
        (STAGE_LOADING_DATA, 'Cargando datos y etiquetas'),
        (STAGE_BUILDING_VOCAB, 'Construyendo vocabulario'),
        (STAGE_ENCODING_SEQUENCES, 'Codificando secuencias'),
        (STAGE_PREPARING_DATASETS, 'Preparando conjuntos de datos'),
        (STAGE_TRAINING, 'Entrenando modelo LSTM'),
        (STAGE_EVALUATING, 'Evaluando modelo'),
        (STAGE_SAVING_RESULTS, 'Guardando resultados'),
        (STAGE_COMPLETED, 'Completado'),
    ]

    # ============================================================
    # INFORMACIÓN BÁSICA
    # ============================================================
    name = models.CharField(max_length=255, verbose_name='Nombre del Análisis')
    description = models.TextField(blank=True, null=True, verbose_name='Descripción')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lstm_analyses',
        verbose_name='Creado por',
    )

    # ============================================================
    # ORIGEN DE DATOS
    # ============================================================
    data_preparation = models.ForeignKey(
        DataPreparation,
        on_delete=models.CASCADE,
        related_name='lstm_analyses',
        verbose_name='Preparación de Datos',
        help_text='Fuente de textos preprocesados',
    )
    topic_modeling = models.ForeignKey(
        TopicModeling,
        on_delete=models.CASCADE,
        related_name='lstm_analyses',
        verbose_name='Modelo de Temas',
        help_text='Fuente de etiquetas de tema dominante por documento',
    )

    # ============================================================
    # HIPERPARÁMETROS
    # ============================================================
    embedding_dim = models.IntegerField(default=64, verbose_name='Dimensión de Embeddings')
    hidden_dim = models.IntegerField(default=128, verbose_name='Dimensión Oculta LSTM')
    num_layers = models.IntegerField(default=1, verbose_name='Capas LSTM')
    num_epochs = models.IntegerField(default=20, verbose_name='Épocas de Entrenamiento')
    learning_rate = models.FloatField(default=0.001, verbose_name='Tasa de Aprendizaje')
    batch_size = models.IntegerField(default=16, verbose_name='Tamaño de Lote')
    train_split = models.FloatField(default=0.8, verbose_name='Proporción de Entrenamiento')
    max_vocab_size = models.IntegerField(default=5000, verbose_name='Vocabulario Máximo')
    max_seq_length = models.IntegerField(default=500, verbose_name='Longitud Máxima de Secuencia')

    # ============================================================
    # ESTADO Y PROGRESO
    # ============================================================
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='Estado'
    )
    current_stage = models.CharField(
        max_length=50, choices=STAGE_CHOICES, default=STAGE_PENDING, verbose_name='Etapa Actual'
    )
    progress_percentage = models.IntegerField(default=0, verbose_name='Progreso (%)')
    error_message = models.TextField(null=True, blank=True, verbose_name='Mensaje de Error')

    # ============================================================
    # RESULTADOS
    # ============================================================
    accuracy = models.FloatField(null=True, blank=True, verbose_name='Exactitud (Test)')
    training_time_seconds = models.FloatField(
        null=True, blank=True, verbose_name='Tiempo de entrenamiento (s)'
    )
    documents_used = models.IntegerField(default=0, verbose_name='Documentos utilizados')
    num_classes = models.IntegerField(default=0, verbose_name='Clases (temas)')
    vocab_size_actual = models.IntegerField(default=0, verbose_name='Tamaño real del vocabulario')

    # Resultados detallados (JSON)
    loss_history = models.JSONField(
        default=list,
        verbose_name='Historial de pérdida',
        help_text='Lista de loss por época durante el entrenamiento',
    )
    confusion_matrix = models.JSONField(
        default=list,
        verbose_name='Matriz de confusión',
        help_text='Matriz NxN: filas=real, columnas=predicho',
    )
    classification_report = models.JSONField(
        default=dict,
        verbose_name='Reporte de clasificación',
        help_text='Precisión, recall y F1 por tema',
    )
    class_labels = models.JSONField(
        default=list,
        verbose_name='Etiquetas de clase',
        help_text='Nombre de cada tema en el orden de la matriz',
    )

    # Artefacto del modelo serializado
    model_artifact_bin = models.BinaryField(
        null=True,
        blank=True,
        verbose_name='Artefacto del modelo LSTM',
        help_text='Pesos del modelo LSTM serializados con torch.save()',
    )

    # ============================================================
    # TIMESTAMPS
    # ============================================================
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado')
    processing_started_at = models.DateTimeField(
        null=True, blank=True, verbose_name='Inicio de procesamiento'
    )
    processing_completed_at = models.DateTimeField(
        null=True, blank=True, verbose_name='Fin de procesamiento'
    )

    class Meta:
        db_table = 'lstm_analysis'
        verbose_name = 'Análisis LSTM'
        verbose_name_plural = 'Análisis LSTM'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"

    @property
    def status_display(self):
        return self.get_status_display()

    @property
    def current_stage_display(self):
        return self.get_current_stage_display()

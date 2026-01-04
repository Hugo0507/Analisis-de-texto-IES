"""
Bag of Words Serializers

Serializers para la API de Bolsa de Palabras.
"""

from rest_framework import serializers
from .models import BagOfWords
from apps.data_preparation.models import DataPreparation


class BagOfWordsListSerializer(serializers.ModelSerializer):
    """
    Serializer para lista de análisis BoW.

    Incluye información resumida para mostrar en tabla.
    """

    data_preparation_name = serializers.CharField(
        source='data_preparation.name',
        read_only=True
    )

    dataset_name = serializers.CharField(
        source='data_preparation.dataset.name',
        read_only=True
    )

    current_stage_label = serializers.SerializerMethodField()

    class Meta:
        model = BagOfWords
        fields = [
            'id',
            'name',
            'data_preparation_name',
            'dataset_name',
            'status',
            'progress_percentage',
            'current_stage',
            'current_stage_label',
            'vocabulary_size',
            'document_count',
            'created_at',
        ]

    def get_current_stage_label(self, obj):
        """Obtener etiqueta de la etapa actual."""
        if obj.current_stage:
            stage_labels = dict(BagOfWords.STAGE_CHOICES)
            return stage_labels.get(obj.current_stage, obj.current_stage)
        return None


class BagOfWordsDetailSerializer(serializers.ModelSerializer):
    """
    Serializer para detalle completo de análisis BoW.

    Incluye toda la información y resultados.
    """

    data_preparation = serializers.SerializerMethodField()
    current_stage_label = serializers.SerializerMethodField()
    created_by_email = serializers.EmailField(
        source='created_by.email',
        read_only=True
    )

    class Meta:
        model = BagOfWords
        fields = [
            'id',
            'name',
            'description',

            # Relaciones
            'data_preparation',
            'created_by_email',

            # Configuración (Count Vectorizer)
            'max_features',
            'min_df',
            'max_df',
            'ngram_min',
            'ngram_max',

            # Estado
            'status',
            'current_stage',
            'current_stage_label',
            'progress_percentage',
            'error_message',

            # Resultados
            'vocabulary_size',
            'document_count',
            'matrix_shape',
            'matrix_sparsity',
            'top_terms',
            'vocabulary',
            'feature_names',
            'avg_terms_per_document',
            'total_term_occurrences',

            # Timestamps
            'created_at',
            'updated_at',
            'processing_started_at',
            'processing_completed_at',
        ]

    def get_data_preparation(self, obj):
        """Obtener información de la preparación de datos."""
        prep = obj.data_preparation
        return {
            'id': prep.id,
            'name': prep.name,
            'dataset': {
                'id': prep.dataset.id,
                'name': prep.dataset.name,
            },
            'predominant_language': prep.predominant_language,
            'files_processed': prep.files_processed,
        }

    def get_current_stage_label(self, obj):
        """Obtener etiqueta de la etapa actual."""
        if obj.current_stage:
            stage_labels = dict(BagOfWords.STAGE_CHOICES)
            return stage_labels.get(obj.current_stage, obj.current_stage)
        return None


class BagOfWordsCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear nuevo análisis BoW.

    Valida configuración y crea instancia.
    """

    class Meta:
        model = BagOfWords
        fields = [
            'name',
            'description',
            'data_preparation',
            'max_features',
            'min_df',
            'max_df',
            'ngram_min',
            'ngram_max',
        ]

    def validate_data_preparation(self, value):
        """
        Validar que la preparación de datos esté completada.
        """
        if value.status != DataPreparation.STATUS_COMPLETED:
            raise serializers.ValidationError(
                "La preparación de datos debe estar completada antes de crear un análisis BoW."
            )
        return value

    def validate_max_features(self, value):
        """Validar que max_features sea positivo."""
        if value <= 0:
            raise serializers.ValidationError("max_features debe ser mayor a 0")
        return value

    def validate_min_df(self, value):
        """Validar que min_df sea válido."""
        if value < 1:
            raise serializers.ValidationError("min_df debe ser al menos 1")
        return value

    def validate_max_df(self, value):
        """Validar que max_df esté entre 0 y 1."""
        if not 0 < value <= 1.0:
            raise serializers.ValidationError("max_df debe estar entre 0 y 1")
        return value

    def validate(self, data):
        """Validaciones adicionales."""
        # Validar ngram_range
        ngram_min = data.get('ngram_min', 1)
        ngram_max = data.get('ngram_max', 1)

        if ngram_min < 1:
            raise serializers.ValidationError({
                'ngram_min': 'ngram_min debe ser al menos 1'
            })

        if ngram_max < ngram_min:
            raise serializers.ValidationError({
                'ngram_max': 'ngram_max debe ser mayor o igual a ngram_min'
            })

        return data

    def create(self, validated_data):
        """
        Crear nueva instancia de BagOfWords.

        Asigna el usuario actual automáticamente.
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        # Estado inicial
        validated_data['status'] = BagOfWords.STATUS_PENDING
        validated_data['current_stage'] = BagOfWords.STAGE_PENDING
        validated_data['progress_percentage'] = 0

        return super().create(validated_data)


class BagOfWordsUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para actualizar análisis BoW.

    Solo permite actualizar nombre y descripción.
    """

    class Meta:
        model = BagOfWords
        fields = ['name', 'description']


class ProgressSerializer(serializers.Serializer):
    """
    Serializer para progreso en tiempo real.
    """

    status = serializers.CharField()
    progress_percentage = serializers.IntegerField()
    current_stage = serializers.CharField(allow_null=True)
    current_stage_label = serializers.CharField(allow_null=True)
    error_message = serializers.CharField(allow_null=True)


class StatsSerializer(serializers.Serializer):
    """
    Serializer para estadísticas generales.
    """

    total_analyses = serializers.IntegerField()
    processing = serializers.IntegerField()
    completed = serializers.IntegerField()
    failed = serializers.IntegerField()

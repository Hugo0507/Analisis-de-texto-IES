"""
Topic Modeling Serializers

Serializers para la API REST de Topic Modeling.
"""

from rest_framework import serializers
from .models import TopicModeling
from apps.data_preparation.models import DataPreparation
from apps.datasets.models import Dataset


class TopicModelingListSerializer(serializers.ModelSerializer):
    """
    Serializer para listar topic modelings (resumen).
    """
    source_name = serializers.CharField(read_only=True)
    algorithm_display = serializers.CharField(source='get_algorithm_display', read_only=True)
    algorithm_category = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = TopicModeling
        fields = [
            'id', 'name', 'description', 'algorithm', 'algorithm_display',
            'algorithm_category', 'num_topics', 'num_words',
            'source_type', 'source_name', 'status', 'status_display',
            'progress_percentage', 'documents_processed', 'coherence_score',
            'created_by_username', 'created_at'
        ]


class TopicModelingDetailSerializer(serializers.ModelSerializer):
    """
    Serializer para detalle completo de topic modeling.
    """
    source_name = serializers.CharField(read_only=True)
    algorithm_display = serializers.CharField(source='get_algorithm_display', read_only=True)
    algorithm_category = serializers.CharField(read_only=True)
    is_probabilistic = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = TopicModeling
        fields = [
            # Información básica
            'id', 'name', 'description', 'created_by', 'created_by_username',

            # Origen de datos
            'source_type', 'source_name', 'data_preparation', 'dataset',

            # Configuración
            'algorithm', 'algorithm_display', 'algorithm_category', 'is_probabilistic',
            'num_topics', 'num_words', 'max_iterations', 'random_seed',

            # Estado y progreso
            'status', 'status_display', 'current_stage', 'current_stage_display',
            'progress_percentage', 'error_message',

            # Resultados generales
            'documents_processed', 'vocabulary_size', 'coherence_score', 'perplexity_score',

            # Resultados detallados
            'topics', 'document_topics', 'topic_distribution',

            # Timestamps
            'created_at', 'updated_at', 'processing_started_at', 'processing_completed_at'
        ]


class TopicModelingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear nuevo topic modeling.
    """

    class Meta:
        model = TopicModeling
        fields = [
            'name', 'description', 'source_type', 'data_preparation', 'dataset',
            'algorithm', 'num_topics', 'num_words', 'max_iterations', 'random_seed'
        ]

    def validate(self, data):
        """Validación personalizada"""
        source_type = data.get('source_type')
        data_preparation = data.get('data_preparation')
        dataset = data.get('dataset')

        # Validar que source_type corresponde con data_preparation o dataset
        if source_type == TopicModeling.SOURCE_DATA_PREPARATION:
            if not data_preparation:
                raise serializers.ValidationError({
                    'data_preparation': 'Se requiere una preparación de datos cuando source_type es data_preparation'
                })
            # Verificar que la preparación esté completada
            if data_preparation.status != 'completed':
                raise serializers.ValidationError({
                    'data_preparation': 'La preparación de datos debe estar completada'
                })
            # Limpiar dataset si existe
            data['dataset'] = None

        elif source_type == TopicModeling.SOURCE_DATASET:
            if not dataset:
                raise serializers.ValidationError({
                    'dataset': 'Se requiere un dataset cuando source_type es dataset'
                })
            # Limpiar data_preparation si existe
            data['data_preparation'] = None

        # Validar número de tópicos
        num_topics = data.get('num_topics', 10)
        if num_topics < 2 or num_topics > 100:
            raise serializers.ValidationError({
                'num_topics': 'El número de tópicos debe estar entre 2 y 100'
            })

        # Validar número de palabras
        num_words = data.get('num_words', 10)
        if num_words < 5 or num_words > 50:
            raise serializers.ValidationError({
                'num_words': 'El número de palabras debe estar entre 5 y 50'
            })

        return data

    def create(self, validated_data):
        """Crear topic modeling"""
        # Agregar usuario actual
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TopicModelingUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para actualizar topic modeling (solo nombre y descripción).
    """

    class Meta:
        model = TopicModeling
        fields = ['name', 'description']


class ProgressSerializer(serializers.ModelSerializer):
    """
    Serializer para obtener progreso de procesamiento.
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)

    class Meta:
        model = TopicModeling
        fields = [
            'status', 'status_display', 'progress_percentage',
            'current_stage', 'current_stage_display', 'error_message'
        ]


class StatsSerializer(serializers.Serializer):
    """
    Serializer para estadísticas generales de topic modelings.
    """
    total = serializers.IntegerField()
    by_status = serializers.DictField()
    by_algorithm = serializers.DictField()

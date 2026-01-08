"""
BERTopic Serializers

Serializers para la API de BERTopic.
"""

from rest_framework import serializers
from .models import BERTopicAnalysis


class BERTopicListSerializer(serializers.ModelSerializer):
    """
    Serializer para lista de análisis BERTopic (resumen).
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    embedding_model_display = serializers.CharField(source='get_embedding_model_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    source_name = serializers.CharField(read_only=True)

    class Meta:
        model = BERTopicAnalysis
        fields = [
            'id', 'name', 'description',
            'embedding_model', 'embedding_model_display',
            'num_topics_found', 'num_words',
            'source_type', 'source_name',
            'status', 'status_display', 'progress_percentage',
            'documents_processed', 'coherence_score', 'num_outliers',
            'created_by_username', 'created_at'
        ]


class BERTopicDetailSerializer(serializers.ModelSerializer):
    """
    Serializer para detalle completo de análisis BERTopic.
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)
    embedding_model_display = serializers.CharField(source='get_embedding_model_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    source_name = serializers.CharField(read_only=True)

    class Meta:
        model = BERTopicAnalysis
        fields = '__all__'


class BERTopicCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear nuevo análisis BERTopic.
    """

    class Meta:
        model = BERTopicAnalysis
        fields = [
            'name', 'description', 'source_type', 'data_preparation', 'dataset',
            'embedding_model', 'n_neighbors', 'n_components',
            'min_cluster_size', 'min_samples', 'nr_topics', 'num_words', 'random_seed'
        ]

    def validate(self, data):
        """Validación personalizada"""
        source_type = data.get('source_type')
        data_preparation = data.get('data_preparation')
        dataset = data.get('dataset')

        # Validar que source_type corresponde con data_preparation o dataset
        if source_type == BERTopicAnalysis.SOURCE_DATA_PREPARATION:
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

        elif source_type == BERTopicAnalysis.SOURCE_DATASET:
            if not dataset:
                raise serializers.ValidationError({
                    'dataset': 'Se requiere un dataset cuando source_type es dataset'
                })
            # Limpiar data_preparation si existe
            data['data_preparation'] = None

        # Validar n_neighbors
        n_neighbors = data.get('n_neighbors', 15)
        if n_neighbors < 5 or n_neighbors > 50:
            raise serializers.ValidationError({
                'n_neighbors': 'N neighbors debe estar entre 5 y 50'
            })

        # Validar n_components
        n_components = data.get('n_components', 5)
        if n_components < 2 or n_components > 100:
            raise serializers.ValidationError({
                'n_components': 'N components debe estar entre 2 y 100'
            })

        # Validar min_cluster_size
        min_cluster_size = data.get('min_cluster_size', 10)
        if min_cluster_size < 5 or min_cluster_size > 100:
            raise serializers.ValidationError({
                'min_cluster_size': 'Min cluster size debe estar entre 5 y 100'
            })

        # Validar min_samples
        min_samples = data.get('min_samples', 5)
        if min_samples < 1 or min_samples > 50:
            raise serializers.ValidationError({
                'min_samples': 'Min samples debe estar entre 1 y 50'
            })

        # Validar num_words
        num_words = data.get('num_words', 10)
        if num_words < 5 or num_words > 50:
            raise serializers.ValidationError({
                'num_words': 'El número de palabras debe estar entre 5 y 50'
            })

        # Validar nr_topics (si se proporciona)
        nr_topics = data.get('nr_topics')
        if nr_topics is not None and (nr_topics < 2 or nr_topics > 100):
            raise serializers.ValidationError({
                'nr_topics': 'El número de tópicos debe estar entre 2 y 100 o null para automático'
            })

        return data

    def create(self, validated_data):
        """Crear análisis BERTopic"""
        # Agregar usuario actual
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class BERTopicUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para actualizar análisis BERTopic (solo nombre y descripción).
    """

    class Meta:
        model = BERTopicAnalysis
        fields = ['name', 'description']


class ProgressSerializer(serializers.ModelSerializer):
    """
    Serializer para progreso de procesamiento.
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)

    class Meta:
        model = BERTopicAnalysis
        fields = [
            'status', 'status_display',
            'current_stage', 'current_stage_display',
            'progress_percentage', 'error_message'
        ]


class StatsSerializer(serializers.Serializer):
    """
    Serializer para estadísticas generales.
    """
    total = serializers.IntegerField()
    by_status = serializers.DictField()
    by_embedding_model = serializers.DictField()

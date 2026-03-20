"""
TF-IDF Analysis Serializers
"""

from rest_framework import serializers
from .models import TfIdfAnalysis


class TfIdfAnalysisListSerializer(serializers.ModelSerializer):
    """
    Serializer para lista de análisis TF-IDF.
    """
    source_name = serializers.CharField(read_only=True)
    dataset_name = serializers.CharField(read_only=True)
    created_by_email = serializers.CharField(read_only=True)
    status_label = serializers.CharField(read_only=True)
    current_stage_label = serializers.CharField(read_only=True)
    source_type_label = serializers.CharField(source='get_source_type_display', read_only=True)
    has_artifact = serializers.SerializerMethodField()

    class Meta:
        model = TfIdfAnalysis
        fields = [
            'id',
            'name',
            'description',
            'source_type',
            'source_type_label',
            'source_name',
            'dataset_name',
            'created_by_email',
            'vocabulary_size',
            'document_count',
            'status',
            'status_label',
            'current_stage',
            'current_stage_label',
            'progress_percentage',
            'has_artifact',
            'created_at',
            'updated_at',
        ]

    def get_has_artifact(self, obj):
        return bool(obj.vectorizer_artifact)


class TfIdfAnalysisDetailSerializer(serializers.ModelSerializer):
    """
    Serializer detallado para análisis TF-IDF.
    """
    source_name = serializers.CharField(read_only=True)
    dataset_name = serializers.CharField(read_only=True)
    created_by_email = serializers.CharField(read_only=True)
    status_label = serializers.CharField(read_only=True)
    current_stage_label = serializers.CharField(read_only=True)
    source_type_label = serializers.CharField(source='get_source_type_display', read_only=True)

    class Meta:
        model = TfIdfAnalysis
        fields = [
            'id',
            'name',
            'description',
            'source_type',
            'source_type_label',
            'source_name',
            'dataset_name',
            'data_preparation',
            'bag_of_words',
            'ngram_analysis',
            'ngram_config',
            'created_by',
            'created_by_email',
            'max_features',
            'min_df',
            'max_df',
            'ngram_min',
            'ngram_max',
            'use_idf',
            'smooth_idf',
            'sublinear_tf',
            'document_count',
            'vocabulary_size',
            'tf_matrix',
            'idf_vector',
            'tfidf_matrix',
            'status',
            'status_label',
            'current_stage',
            'current_stage_label',
            'progress_percentage',
            'error_message',
            'created_at',
            'processing_started_at',
            'processing_completed_at',
            'updated_at',
        ]


class TfIdfAnalysisCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear análisis TF-IDF.
    """

    class Meta:
        model = TfIdfAnalysis
        fields = [
            'name',
            'description',
            'source_type',
            'data_preparation',
            'bag_of_words',
            'ngram_analysis',
            'ngram_config',
            'max_features',
            'min_df',
            'max_df',
            'ngram_min',
            'ngram_max',
            'use_idf',
            'smooth_idf',
            'sublinear_tf',
        ]

    def validate(self, attrs):
        """
        Validar que se proporcione la fuente correcta según el tipo.
        """
        source_type = attrs.get('source_type')

        if source_type == TfIdfAnalysis.SOURCE_DATA_PREPARATION:
            if not attrs.get('data_preparation'):
                raise serializers.ValidationError({
                    'data_preparation': 'Debes especificar una preparación de datos'
                })
        elif source_type == TfIdfAnalysis.SOURCE_BAG_OF_WORDS:
            if not attrs.get('bag_of_words'):
                raise serializers.ValidationError({
                    'bag_of_words': 'Debes especificar una Bolsa de Palabras'
                })
        elif source_type in [
            TfIdfAnalysis.SOURCE_NGRAM_CONFIG,
            TfIdfAnalysis.SOURCE_NGRAM_ALL,
            TfIdfAnalysis.SOURCE_NGRAM_VOCABULARY
        ]:
            if not attrs.get('ngram_analysis'):
                raise serializers.ValidationError({
                    'ngram_analysis': 'Debes especificar un análisis de N-gramas'
                })
            if source_type == TfIdfAnalysis.SOURCE_NGRAM_CONFIG and not attrs.get('ngram_config'):
                raise serializers.ValidationError({
                    'ngram_config': 'Debes especificar la configuración de N-grama (ej: "2_2")'
                })

        return attrs

    def validate_max_features(self, value):
        """Validar max_features."""
        if value <= 0:
            raise serializers.ValidationError(
                "El número máximo de features debe ser mayor a 0"
            )
        return value

    def validate_min_df(self, value):
        """Validar min_df."""
        if value < 1:
            raise serializers.ValidationError(
                "La frecuencia mínima debe ser al menos 1"
            )
        return value

    def validate_max_df(self, value):
        """Validar max_df."""
        if value <= 0 or value > 1:
            raise serializers.ValidationError(
                "La frecuencia máxima debe estar entre 0 y 1"
            )
        return value

    def validate_ngram_min(self, value):
        """Validar ngram_min."""
        if value < 1:
            raise serializers.ValidationError(
                "El n-grama mínimo debe ser al menos 1"
            )
        return value

    def validate_ngram_max(self, value):
        """Validar ngram_max."""
        if value < 1:
            raise serializers.ValidationError(
                "El n-grama máximo debe ser al menos 1"
            )
        return value


class TfIdfAnalysisProgressSerializer(serializers.ModelSerializer):
    """
    Serializer para actualizar progreso del análisis.
    """
    status_label = serializers.CharField(read_only=True)
    current_stage_label = serializers.CharField(read_only=True)

    class Meta:
        model = TfIdfAnalysis
        fields = [
            'id',
            'status',
            'status_label',
            'current_stage',
            'current_stage_label',
            'progress_percentage',
            'error_message',
        ]
        read_only_fields = fields

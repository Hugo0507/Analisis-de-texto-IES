"""
Serializers for Analysis app.

Contains serializers for:
- Vocabulary: Terminos del corpus
- BowMatrix: Matriz Bag of Words
- TfidfMatrix: Matriz TF-IDF
- Topic: Temas descubiertos
- Factor: Factores de transformacien digital
- DocumentFactor: Relacien documento-factor
"""

from rest_framework import serializers
from .models import (
    Vocabulary,
    BowMatrix,
    TfidfMatrix,
    Topic,
    Factor,
    DocumentFactor,
)
from apps.documents.serializers import DocumentListSerializer


class VocabularySerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Vocabulary.
    """
    class Meta:
        model = Vocabulary
        fields = [
            'id',
            'term',
            'global_frequency',
            'document_frequency',
            'idf_score',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class BowMatrixSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo BowMatrix.
    Incluye datos anidados de documento y termino.
    """
    document = DocumentListSerializer(read_only=True)
    term = VocabularySerializer(read_only=True)

    class Meta:
        model = BowMatrix
        fields = [
            'id',
            'document',
            'term',
            'frequency',
        ]
        read_only_fields = ['id']


class BowMatrixSimpleSerializer(serializers.ModelSerializer):
    """
    Serializer simple para BowMatrix sin datos anidados.
    etil para creacien y listados masivos.
    """
    term_text = serializers.CharField(source='term.term', read_only=True)
    document_filename = serializers.CharField(source='document.filename', read_only=True)

    class Meta:
        model = BowMatrix
        fields = [
            'id',
            'document',
            'document_filename',
            'term',
            'term_text',
            'frequency',
        ]
        read_only_fields = ['id']


class TfidfMatrixSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo TfidfMatrix.
    Incluye datos anidados de documento y termino.
    """
    document = DocumentListSerializer(read_only=True)
    term = VocabularySerializer(read_only=True)

    class Meta:
        model = TfidfMatrix
        fields = [
            'id',
            'document',
            'term',
            'tfidf_score',
        ]
        read_only_fields = ['id']


class TfidfMatrixSimpleSerializer(serializers.ModelSerializer):
    """
    Serializer simple para TfidfMatrix sin datos anidados.
    """
    term_text = serializers.CharField(source='term.term', read_only=True)
    document_filename = serializers.CharField(source='document.filename', read_only=True)

    class Meta:
        model = TfidfMatrix
        fields = [
            'id',
            'document',
            'document_filename',
            'term',
            'term_text',
            'tfidf_score',
        ]
        read_only_fields = ['id']


class TopicSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Topic.
    """
    model_type_display = serializers.CharField(
        source='get_model_type_display',
        read_only=True
    )

    class Meta:
        model = Topic
        fields = [
            'id',
            'model_type',
            'model_type_display',
            'topic_number',
            'top_words',
            'coherence_score',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class FactorSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Factor.
    """
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )

    class Meta:
        model = Factor
        fields = [
            'id',
            'name',
            'category',
            'category_display',
            'keywords',
            'global_frequency',
            'relevance_score',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class DocumentFactorSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo DocumentFactor.
    Incluye datos anidados de documento y factor.
    """
    document = DocumentListSerializer(read_only=True)
    factor = FactorSerializer(read_only=True)

    class Meta:
        model = DocumentFactor
        fields = [
            'id',
            'document',
            'factor',
            'mention_count',
            'relevance_score',
        ]
        read_only_fields = ['id']


class DocumentFactorSimpleSerializer(serializers.ModelSerializer):
    """
    Serializer simple para DocumentFactor sin datos anidados.
    """
    document_filename = serializers.CharField(source='document.filename', read_only=True)
    factor_name = serializers.CharField(source='factor.name', read_only=True)
    factor_category_display = serializers.CharField(
        source='factor.get_category_display',
        read_only=True
    )

    class Meta:
        model = DocumentFactor
        fields = [
            'id',
            'document',
            'document_filename',
            'factor',
            'factor_name',
            'factor_category_display',
            'mention_count',
            'relevance_score',
        ]
        read_only_fields = ['id']


# ========================================
# Serializers para Visualizaciones (DTOs)
# ========================================

class WordCloudDataSerializer(serializers.Serializer):
    """
    Serializer para datos de nube de palabras (Nivo).
    """
    text = serializers.CharField()
    value = serializers.IntegerField()


class TermFrequencySerializer(serializers.Serializer):
    """
    Serializer para datos de frecuencia de terminos (bar chart).
    """
    term = serializers.CharField()
    frequency = serializers.IntegerField()
    idf_score = serializers.FloatField(required=False)


class TopicHeatmapSerializer(serializers.Serializer):
    """
    Serializer para datos de heatmap documento-tema.
    """
    document_id = serializers.IntegerField()
    document_filename = serializers.CharField()
    topic_id = serializers.IntegerField()
    topic_label = serializers.CharField()
    probability = serializers.FloatField()


class FactorNetworkNodeSerializer(serializers.Serializer):
    """
    Serializer para nodos de red de co-ocurrencia de factores.
    """
    id = serializers.CharField()
    label = serializers.CharField()
    category = serializers.CharField()
    frequency = serializers.IntegerField()


class FactorNetworkLinkSerializer(serializers.Serializer):
    """
    Serializer para enlaces de red de co-ocurrencia de factores.
    """
    source = serializers.CharField()
    target = serializers.CharField()
    weight = serializers.FloatField()

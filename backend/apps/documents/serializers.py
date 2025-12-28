"""
Serializers for Documents app.

Converts Django ORM models to JSON (and vice versa) for REST API.
"""

from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Document.

    Campos calculados:
    - status_display: Texto legible del status
    """
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = Document
        fields = [
            'id',
            'drive_file_id',
            'filename',
            'language_code',
            'language_confidence',
            'txt_content',
            'preprocessed_text',
            'status',
            'status_display',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DocumentListSerializer(serializers.ModelSerializer):
    """
    Serializer ligero para listado de documentos.
    No incluye txt_content ni preprocessed_text (campos pesados).
    """
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = Document
        fields = [
            'id',
            'drive_file_id',
            'filename',
            'language_code',
            'language_confidence',
            'status',
            'status_display',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DocumentStatisticsSerializer(serializers.Serializer):
    """
    Serializer para estadísticas agregadas del corpus.
    No está ligado a un modelo específico.
    """
    total_documents = serializers.IntegerField()
    completed_documents = serializers.IntegerField()
    processing_documents = serializers.IntegerField()
    error_documents = serializers.IntegerField()
    languages = serializers.DictField(child=serializers.IntegerField())
    avg_confidence = serializers.FloatField()
    total_size_chars = serializers.IntegerField()

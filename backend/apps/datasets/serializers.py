"""
Serializers for Dataset models.
"""

from rest_framework import serializers
from .models import Dataset, DatasetFile


class DatasetFileSerializer(serializers.ModelSerializer):
    """Serializer for DatasetFile model."""

    class Meta:
        model = DatasetFile
        fields = [
            'id',
            'filename',
            'original_filename',
            'file_size_bytes',
            'mime_type',
            'status',
            'error_message',
            'language_code',
            'language_confidence',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'filename',
            'status',
            'error_message',
            'language_code',
            'language_confidence',
            'created_at',
            'updated_at',
        ]


class DatasetSerializer(serializers.ModelSerializer):
    """Serializer for Dataset model."""

    files = DatasetFileSerializer(many=True, read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)

    class Meta:
        model = Dataset
        fields = [
            'id',
            'name',
            'description',
            'source',
            'source_url',
            'status',
            'total_files',
            'total_size_bytes',
            'created_by',
            'created_by_email',
            'files',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'status',
            'total_files',
            'total_size_bytes',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
        ]


class DatasetListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dataset list view."""

    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    file_count = serializers.IntegerField(source='files.count', read_only=True)

    class Meta:
        model = Dataset
        fields = [
            'id',
            'name',
            'description',
            'source',
            'status',
            'total_files',
            'total_size_bytes',
            'created_by_email',
            'file_count',
            'created_at',
            'updated_at',
        ]


class DatasetCreateSerializer(serializers.Serializer):
    """Serializer for creating a dataset with file uploads."""

    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    source = serializers.ChoiceField(choices=['upload', 'drive'])
    source_url = serializers.URLField(required=False, allow_blank=True)
    files = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        allow_empty=True
    )

    def validate(self, data):
        """Validate that source matches provided data."""
        if data['source'] == 'drive' and not data.get('source_url'):
            raise serializers.ValidationError(
                "source_url is required when source is 'drive'"
            )

        if data['source'] == 'upload' and not data.get('files'):
            raise serializers.ValidationError(
                "files are required when source is 'upload'"
            )

        return data

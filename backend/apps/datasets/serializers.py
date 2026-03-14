"""
Serializers for Dataset models.
"""

from rest_framework import serializers
from .models import Dataset, DatasetFile


class DatasetFileSerializer(serializers.ModelSerializer):
    """Serializer for DatasetFile model — full detail including bibliographic metadata."""

    bib_authors_list = serializers.ReadOnlyField()
    bib_keywords_list = serializers.ReadOnlyField()
    bib_source_db_display = serializers.CharField(
        source='get_bib_source_db_display', read_only=True
    )
    inclusion_status_display = serializers.CharField(
        source='get_inclusion_status_display', read_only=True
    )

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
            # Directory
            'directory_path',
            'directory_name',
            # Language
            'language_code',
            'language_confidence',
            # Bibliographic metadata
            'bib_title',
            'bib_authors',
            'bib_authors_list',
            'bib_year',
            'bib_journal',
            'bib_doi',
            'bib_abstract',
            'bib_keywords',
            'bib_keywords_list',
            'bib_source_db',
            'bib_source_db_display',
            'bib_volume',
            'bib_issue',
            'bib_pages',
            # PRISMA
            'inclusion_status',
            'inclusion_status_display',
            'exclusion_reason',
            # Timestamps
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
            'bib_authors_list',
            'bib_keywords_list',
            'bib_source_db_display',
            'inclusion_status_display',
            'created_at',
            'updated_at',
        ]


class DatasetFileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating bibliographic metadata and inclusion status of a file."""

    class Meta:
        model = DatasetFile
        fields = [
            'bib_title',
            'bib_authors',
            'bib_year',
            'bib_journal',
            'bib_doi',
            'bib_abstract',
            'bib_keywords',
            'bib_source_db',
            'bib_volume',
            'bib_issue',
            'bib_pages',
            'inclusion_status',
            'exclusion_reason',
        ]

    def validate_bib_year(self, value):
        if value is not None and (value < 1900 or value > 2100):
            raise serializers.ValidationError('El año debe estar entre 1900 y 2100.')
        return value

    def validate(self, data):
        if data.get('inclusion_status') == 'excluded' and not data.get('exclusion_reason'):
            raise serializers.ValidationError(
                {'exclusion_reason': 'Debes indicar el motivo de exclusión.'}
            )
        return data


class DatasetSerializer(serializers.ModelSerializer):
    """Serializer for Dataset model — full detail with files and PRISMA info."""

    files = DatasetFileSerializer(many=True, read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    prisma_stats = serializers.ReadOnlyField()

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
            # PRISMA
            'search_strategy',
            'inclusion_criteria',
            'exclusion_criteria',
            'database_sources',
            'prisma_stats',
            # Relations
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
            'prisma_stats',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
        ]


class DatasetListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dataset list view."""

    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    file_count = serializers.IntegerField(source='files.count', read_only=True)
    prisma_stats = serializers.ReadOnlyField()

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
            'database_sources',
            'prisma_stats',
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
    # PRISMA fields — optional at creation time, can be filled in later
    search_strategy = serializers.CharField(required=False, allow_blank=True)
    inclusion_criteria = serializers.CharField(required=False, allow_blank=True)
    exclusion_criteria = serializers.CharField(required=False, allow_blank=True)
    database_sources = serializers.CharField(required=False, allow_blank=True)
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


class DatasetUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating dataset metadata and PRISMA protocol."""

    class Meta:
        model = Dataset
        fields = [
            'name',
            'description',
            'search_strategy',
            'inclusion_criteria',
            'exclusion_criteria',
            'database_sources',
        ]

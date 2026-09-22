"""
Corpus: datasets, archivos y preparacion de datos.
"""

import logging

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)

from .base import PublicAPIPagination

from apps.datasets.models import Dataset, DatasetFile
from apps.datasets.serializers import (
    DatasetListSerializer,
    DatasetSerializer,
    DatasetFileSerializer,
)

from apps.data_preparation.models import DataPreparation
from apps.data_preparation.serializers import (
    DataPreparationListSerializer,
    DataPreparationDetailSerializer,
)


# ============================================================
# DATASETS
# ============================================================

class PublicDatasetViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only access to completed datasets from all users."""

    permission_classes = [AllowAny]
    pagination_class = PublicAPIPagination
    # Sin prefetch de 'files': el listado solo cuenta archivos y precargarlos
    # traía cada fila completa, incluido el PDF guardado en file_content.
    queryset = Dataset.objects.filter(
        status='completed'
    ).select_related('created_by').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return DatasetListSerializer
        return DatasetSerializer

    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """Get all files for a specific dataset."""
        dataset = self.get_object()
        # Sin las columnas pesadas: el serializer no las usa y pesan megabytes
        files = dataset.files.defer('file_content', 'txt_content', 'preprocessed_text')
        serializer = DatasetFileSerializer(files, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def directory_stats(self, request, pk=None):
        """Get directory distribution statistics for a dataset."""
        dataset = self.get_object()
        # Solo las tres columnas que se recorren aquí
        files = dataset.files.only('directory_name', 'original_filename', 'file_size_bytes')

        directory_stats = {}
        extension_totals = {}
        directory_totals = {}

        for file in files:
            directory = file.directory_name or "Root"
            filename = file.original_filename
            extension = filename.split('.')[-1].upper() if '.' in filename else 'UNKNOWN'

            if directory not in directory_stats:
                directory_stats[directory] = {}
                directory_totals[directory] = 0

            if extension not in directory_stats[directory]:
                directory_stats[directory][extension] = 0

            directory_stats[directory][extension] += 1
            directory_totals[directory] += 1

            if extension not in extension_totals:
                extension_totals[extension] = 0
            extension_totals[extension] += 1

        all_extensions = sorted(extension_totals.keys())

        table_data = []
        for directory in sorted(directory_stats.keys()):
            row = {
                'directory': directory,
                'extensions': {},
                'total': directory_totals[directory]
            }
            for ext in all_extensions:
                row['extensions'][ext] = directory_stats[directory].get(ext, 0)
            table_data.append(row)

        pie_chart_data = [
            {
                'name': directory,
                'value': directory_totals[directory],
                'percentage': round((directory_totals[directory] / files.count() * 100), 2) if files.count() > 0 else 0
            }
            for directory in sorted(directory_stats.keys())
        ]

        return Response({
            'table_data': table_data,
            'extension_totals': extension_totals,
            'directory_totals': directory_totals,
            'all_extensions': all_extensions,
            'grand_total': files.count(),
            'pie_chart_data': pie_chart_data
        })


# ============================================================
# DOCUMENTS (Dataset Files) — preview endpoint
# ============================================================

class PublicDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only access to DatasetFile objects — used for document previews."""

    permission_classes = [AllowAny]
    pagination_class = None
    queryset = DatasetFile.objects.all()

    def list(self, request, *args, **kwargs):
        return Response([])  # list not exposed; use datasets/{id}/files/ instead

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """
        TRANS-6: Return a text preview of a processed document.

        Query params:
          chars (default 500, max 2000) — approximate character limit for the preview
        """
        doc = self.get_object()
        chars = min(int(request.query_params.get('chars', 500)), 2000)

        raw = doc.preprocessed_text or doc.txt_content or ''
        # Split to words, take enough words to fill ~chars characters
        words = raw.split()
        preview_words = []
        total = 0
        for w in words:
            if total + len(w) + 1 > chars:
                break
            preview_words.append(w)
            total += len(w) + 1

        return Response({
            'id': doc.id,
            'title': doc.bib_title or doc.original_filename,
            'filename': doc.original_filename,
            'bib_year': doc.bib_year,
            'bib_authors': doc.bib_authors,
            'language_code': doc.language_code,
            'preview': ' '.join(preview_words),
            'total_chars': len(raw),
            'total_words': len(words),
            'has_preprocessed': bool(doc.preprocessed_text),
        })


# ============================================================
# DATA PREPARATION
# ============================================================

class PublicDataPreparationViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only access to completed data preparations from all users."""

    permission_classes = [AllowAny]
    pagination_class = PublicAPIPagination

    def get_queryset(self):
        qs = DataPreparation.objects.filter(
            status='completed'
        ).select_related('dataset', 'created_by').order_by('-created_at')
        dataset_id = self.request.query_params.get('dataset_id')
        if dataset_id:
            qs = qs.filter(dataset_id=dataset_id)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return DataPreparationListSerializer
        return DataPreparationDetailSerializer

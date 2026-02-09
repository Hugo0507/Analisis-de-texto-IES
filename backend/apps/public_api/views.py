"""
Public API Views

Read-only ViewSets for the public dashboard.
Exposes completed analyses from all users without authentication.
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

# --- Dataset ---
from apps.datasets.models import Dataset, DatasetFile
from apps.datasets.serializers import (
    DatasetListSerializer,
    DatasetSerializer,
    DatasetFileSerializer,
)

# --- Data Preparation ---
from apps.data_preparation.models import DataPreparation
from apps.data_preparation.serializers import (
    DataPreparationListSerializer,
    DataPreparationDetailSerializer,
)

# --- Bag of Words ---
from apps.bag_of_words.models import BagOfWords
from apps.bag_of_words.serializers import (
    BagOfWordsListSerializer,
    BagOfWordsDetailSerializer,
)

# --- N-gram Analysis ---
from apps.ngram_analysis.models import NgramAnalysis
from apps.ngram_analysis.serializers import (
    NgramAnalysisListSerializer,
    NgramAnalysisDetailSerializer,
)

# --- TF-IDF Analysis ---
from apps.tfidf_analysis.models import TfIdfAnalysis
from apps.tfidf_analysis.serializers import (
    TfIdfAnalysisListSerializer,
    TfIdfAnalysisDetailSerializer,
)

# --- NER Analysis ---
from apps.ner_analysis.models import NerAnalysis
from apps.ner_analysis.serializers import (
    NerAnalysisListSerializer,
    NerAnalysisDetailSerializer,
)

# --- Topic Modeling ---
from apps.topic_modeling.models import TopicModeling
from apps.topic_modeling.serializers import (
    TopicModelingListSerializer,
    TopicModelingDetailSerializer,
)

# --- BERTopic ---
from apps.bertopic.models import BERTopicAnalysis
from apps.bertopic.serializers import (
    BERTopicListSerializer,
    BERTopicDetailSerializer,
)


# ============================================================
# DATASETS
# ============================================================

class PublicDatasetViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only access to completed datasets from all users."""

    permission_classes = [AllowAny]
    pagination_class = None
    queryset = Dataset.objects.filter(
        status='completed'
    ).prefetch_related('files').select_related('created_by').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return DatasetListSerializer
        return DatasetSerializer

    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """Get all files for a specific dataset."""
        dataset = self.get_object()
        files = dataset.files.all()
        serializer = DatasetFileSerializer(files, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def directory_stats(self, request, pk=None):
        """Get directory distribution statistics for a dataset."""
        dataset = self.get_object()
        files = dataset.files.all()

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
# DATA PREPARATION
# ============================================================

class PublicDataPreparationViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only access to completed data preparations from all users."""

    permission_classes = [AllowAny]
    pagination_class = None
    queryset = DataPreparation.objects.filter(
        status='completed'
    ).select_related('dataset', 'created_by').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return DataPreparationListSerializer
        return DataPreparationDetailSerializer


# ============================================================
# BAG OF WORDS
# ============================================================

class PublicBagOfWordsViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only access to completed BoW analyses from all users."""

    permission_classes = [AllowAny]
    pagination_class = None
    queryset = BagOfWords.objects.filter(
        status='completed'
    ).select_related(
        'data_preparation',
        'data_preparation__dataset',
        'created_by'
    ).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return BagOfWordsListSerializer
        return BagOfWordsDetailSerializer

    @action(detail=True, methods=['get'])
    def vocabulary(self, request, pk=None):
        """Get vocabulary for a completed BoW analysis."""
        bow = self.get_object()

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 100))

        vocab_items = sorted(
            bow.vocabulary.items(),
            key=lambda x: x[1],
            reverse=True
        )

        start = (page - 1) * page_size
        end = start + page_size
        paginated_items = vocab_items[start:end]

        return Response({
            'total': len(vocab_items),
            'page': page,
            'page_size': page_size,
            'vocabulary': [
                {'term': term, 'index': idx}
                for term, idx in paginated_items
            ]
        })

    @action(detail=True, methods=['get'])
    def top_terms(self, request, pk=None):
        """Get top terms with scores for a completed BoW analysis."""
        bow = self.get_object()
        limit = int(request.query_params.get('limit', 50))
        top_terms = bow.top_terms[:limit]

        return Response({
            'total_vocabulary': bow.vocabulary_size,
            'returned': len(top_terms),
            'top_terms': top_terms
        })


# ============================================================
# N-GRAM ANALYSIS
# ============================================================

class PublicNgramAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only access to completed N-gram analyses from all users."""

    permission_classes = [AllowAny]
    pagination_class = None
    queryset = NgramAnalysis.objects.filter(
        status='completed'
    ).select_related(
        'data_preparation',
        'data_preparation__dataset',
        'created_by'
    ).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return NgramAnalysisListSerializer
        return NgramAnalysisDetailSerializer

    @action(detail=True, methods=['get'])
    def comparison(self, request, pk=None):
        """Get comparison data between N-gram configurations."""
        ngram_analysis = self.get_object()
        return Response({
            'configurations': ngram_analysis.ngram_configurations,
            'results': ngram_analysis.results,
            'comparisons': ngram_analysis.comparisons,
        })


# ============================================================
# TF-IDF ANALYSIS
# ============================================================

class PublicTfIdfAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only access to completed TF-IDF analyses from all users."""

    permission_classes = [AllowAny]
    pagination_class = None
    queryset = TfIdfAnalysis.objects.filter(
        status='completed'
    ).select_related(
        'data_preparation',
        'bag_of_words',
        'ngram_analysis',
        'created_by'
    ).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return TfIdfAnalysisListSerializer
        return TfIdfAnalysisDetailSerializer

    @action(detail=True, methods=['get'])
    def matrices(self, request, pk=None):
        """Get the 3 matrices (TF, IDF, TF-IDF) for a completed analysis."""
        tfidf_analysis = self.get_object()
        return Response({
            'tf_matrix': tfidf_analysis.tf_matrix,
            'idf_vector': tfidf_analysis.idf_vector,
            'tfidf_matrix': tfidf_analysis.tfidf_matrix,
        })


# ============================================================
# NER ANALYSIS
# ============================================================

class PublicNerAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only access to completed NER analyses from all users."""

    permission_classes = [AllowAny]
    pagination_class = None
    queryset = NerAnalysis.objects.filter(
        status='completed'
    ).select_related(
        'data_preparation',
        'data_preparation__dataset',
        'dataset',
        'created_by'
    ).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return NerAnalysisListSerializer
        return NerAnalysisDetailSerializer


# ============================================================
# TOPIC MODELING
# ============================================================

class PublicTopicModelingViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only access to completed Topic Modeling analyses from all users."""

    permission_classes = [AllowAny]
    pagination_class = None
    queryset = TopicModeling.objects.filter(
        status='completed'
    ).select_related('created_by').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return TopicModelingListSerializer
        return TopicModelingDetailSerializer


# ============================================================
# BERTOPIC
# ============================================================

class PublicBERTopicViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only access to completed BERTopic analyses from all users."""

    permission_classes = [AllowAny]
    pagination_class = None
    queryset = BERTopicAnalysis.objects.filter(
        status='completed'
    ).select_related('created_by').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return BERTopicListSerializer
        return BERTopicDetailSerializer

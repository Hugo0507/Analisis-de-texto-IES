"""
Public API Views

Read-only ViewSets for the public dashboard.
Exposes completed analyses from all users without authentication.
"""

import json
import logging

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

logger = logging.getLogger(__name__)


class PublicAPIPagination(PageNumberPagination):
    """Pagination for public API endpoints."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

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
    pagination_class = PublicAPIPagination
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


# ============================================================
# BAG OF WORDS
# ============================================================

class PublicBagOfWordsViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only access to completed BoW analyses from all users."""

    permission_classes = [AllowAny]
    pagination_class = PublicAPIPagination

    def get_queryset(self):
        qs = BagOfWords.objects.filter(
            status='completed'
        ).select_related(
            'data_preparation',
            'data_preparation__dataset',
            'created_by'
        ).order_by('-created_at')
        dataset_id = self.request.query_params.get('dataset_id')
        if dataset_id:
            qs = qs.filter(data_preparation__dataset_id=dataset_id)
        return qs

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
    pagination_class = PublicAPIPagination

    def get_queryset(self):
        qs = NgramAnalysis.objects.filter(
            status='completed'
        ).select_related(
            'data_preparation',
            'data_preparation__dataset',
            'created_by'
        ).order_by('-created_at')
        dataset_id = self.request.query_params.get('dataset_id')
        if dataset_id:
            qs = qs.filter(data_preparation__dataset_id=dataset_id)
        return qs

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
    pagination_class = PublicAPIPagination

    def get_queryset(self):
        qs = TfIdfAnalysis.objects.filter(
            status='completed'
        ).select_related(
            'data_preparation',
            'bag_of_words',
            'ngram_analysis',
            'created_by'
        ).order_by('-created_at')
        dataset_id = self.request.query_params.get('dataset_id')
        if dataset_id:
            qs = qs.filter(data_preparation__dataset_id=dataset_id)
        return qs

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
    pagination_class = PublicAPIPagination

    def get_queryset(self):
        qs = NerAnalysis.objects.filter(
            status='completed'
        ).select_related(
            'data_preparation',
            'data_preparation__dataset',
            'dataset',
            'created_by'
        ).order_by('-created_at')
        dataset_id = self.request.query_params.get('dataset_id')
        if dataset_id:
            from django.db.models import Q
            qs = qs.filter(
                Q(dataset_id=dataset_id) |
                Q(data_preparation__dataset_id=dataset_id)
            )
        return qs

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
    pagination_class = PublicAPIPagination

    def get_queryset(self):
        qs = TopicModeling.objects.filter(
            status='completed'
        ).select_related(
            'data_preparation',
            'data_preparation__dataset',
            'dataset',
            'created_by'
        ).order_by('-created_at')
        dataset_id = self.request.query_params.get('dataset_id')
        if dataset_id:
            from django.db.models import Q
            qs = qs.filter(
                Q(dataset_id=dataset_id) |
                Q(data_preparation__dataset_id=dataset_id)
            )
        return qs

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
    pagination_class = PublicAPIPagination

    def get_queryset(self):
        qs = BERTopicAnalysis.objects.filter(
            status='completed'
        ).select_related(
            'data_preparation',
            'data_preparation__dataset',
            'dataset',
            'created_by'
        ).order_by('-created_at')
        dataset_id = self.request.query_params.get('dataset_id')
        if dataset_id:
            from django.db.models import Q
            qs = qs.filter(
                Q(dataset_id=dataset_id) |
                Q(data_preparation__dataset_id=dataset_id)
            )
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return BERTopicListSerializer
        return BERTopicDetailSerializer


# ============================================================
# WORKSPACE (PUBLIC — no auth required)
# ============================================================

import subprocess
import sys
import threading

from apps.workspace.models import Workspace, WorkspaceDocument
from apps.workspace.serializers import (
    WorkspaceSerializer,
    WorkspaceUploadSerializer,
)
from apps.workspace.views import (
    _monitor_inference_subprocess,
    _build_excel_bytes,
    _build_config_dict,
    DEFAULT_INFERENCE_PARAMS,
    INFERENCE_TIMEOUT_SECONDS,
)

WORKSPACE_PUBLIC_EXPIRY_HOURS = 48


class PublicWorkspaceViewSet(viewsets.ViewSet):
    """
    Public workspace endpoints for the Laboratory module.
    No authentication required. Workspaces are identified by UUID.
    Anonymous workspaces expire after 48 hours.
    """

    permission_classes = [AllowAny]

    def _get_workspace(self, workspace_id):
        """Fetch workspace by UUID. Returns None if not found."""
        try:
            return Workspace.objects.prefetch_related('documents').get(id=workspace_id)
        except (Workspace.DoesNotExist, Exception):
            return None

    def create(self, request):
        """
        POST /api/v1/public/workspace/
        Create a new anonymous workspace.

        Body: {
          dataset_id, bow_id?, tfidf_id?, topic_model_id?,
          ner_id?, bertopic_id?, custom_stopwords?, inference_params?
        }
        """
        dataset_id = request.data.get('dataset_id')
        if not dataset_id:
            return Response({'error': 'dataset_id es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.datasets.models import Dataset
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({'error': f'Dataset {dataset_id} no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        expires_at = timezone.now() + timezone.timedelta(hours=WORKSPACE_PUBLIC_EXPIRY_HOURS)

        workspace = Workspace.objects.create(
            created_by=None,
            dataset=dataset,
            bow_id=request.data.get('bow_id'),
            tfidf_id=request.data.get('tfidf_id'),
            topic_model_id=request.data.get('topic_model_id'),
            ner_id=request.data.get('ner_id'),
            bertopic_id=request.data.get('bertopic_id'),
            custom_stopwords=request.data.get('custom_stopwords') or [],
            inference_params=request.data.get('inference_params') or DEFAULT_INFERENCE_PARAMS,
            expires_at=expires_at,
        )

        logger.info(f"[PUBLIC WS {workspace.id}] Creado anónimo (dataset={dataset_id}, expires={expires_at})")
        return Response(WorkspaceSerializer(workspace).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        """GET /api/v1/public/workspace/{uuid}/ — Get workspace + results."""
        workspace = self._get_workspace(pk)
        if not workspace:
            return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(WorkspaceSerializer(workspace).data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser])
    def upload(self, request, pk=None):
        """POST /api/v1/public/workspace/{uuid}/upload/ — Upload a PDF."""
        workspace = self._get_workspace(pk)
        if not workspace:
            return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if workspace.status == Workspace.STATUS_PROCESSING:
            return Response(
                {'error': 'El workspace está procesando. Espera a que termine.'},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = WorkspaceUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = serializer.validated_data['file']
        doc = WorkspaceDocument.objects.create(
            workspace=workspace,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            file_size=uploaded_file.size,
            status=WorkspaceDocument.STATUS_PENDING,
        )

        return Response(
            {
                'id': doc.id,
                'original_filename': doc.original_filename,
                'file_size': doc.file_size,
                'status': doc.status,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def run(self, request, pk=None):
        """POST /api/v1/public/workspace/{uuid}/run/ — Start inference."""
        workspace = self._get_workspace(pk)
        if not workspace:
            return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if workspace.status == Workspace.STATUS_PROCESSING:
            return Response({'error': 'El workspace ya está procesando.'}, status=status.HTTP_409_CONFLICT)

        pending_docs = workspace.documents.filter(
            status__in=[WorkspaceDocument.STATUS_PENDING, WorkspaceDocument.STATUS_READY]
        )
        if not pending_docs.exists():
            return Response(
                {'error': 'No hay documentos para procesar. Sube al menos un PDF.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        workspace.status = Workspace.STATUS_PROCESSING
        workspace.progress_percentage = 0
        workspace.error_message = None
        workspace.results = {}
        workspace.save()

        process = subprocess.Popen(
            [sys.executable, 'manage.py', 'run_inference', str(workspace.id)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        logger.info(f"[PUBLIC WS {pk}] Subprocess lanzado (PID: {process.pid})")

        monitor = threading.Thread(
            target=_monitor_inference_subprocess,
            args=(process, str(workspace.id)),
            daemon=True,
        )
        monitor.start()

        return Response(
            {'status': 'processing', 'workspace_id': str(workspace.id)},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=['get'])
    def export_excel(self, request, pk=None):
        """GET /api/v1/public/workspace/{uuid}/export_excel/ — Export as .xlsx."""
        from django.http import HttpResponse
        workspace = self._get_workspace(pk)
        if not workspace:
            return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if workspace.status != Workspace.STATUS_COMPLETED:
            return Response({'error': 'El workspace aún no está completado.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            xlsx_bytes = _build_excel_bytes(workspace)
        except Exception as exc:
            logger.exception(f"[PUBLIC WS {pk}] Error generando Excel: {exc}")
            return Response({'error': f'Error generando el Excel: {exc}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        date_str = workspace.created_at.strftime('%Y%m%d')
        dataset_slug = workspace.dataset.name[:30].replace(' ', '_')
        filename = f"lab_{dataset_slug}_{date_str}.xlsx"

        response = HttpResponse(
            xlsx_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'])
    def export_config(self, request, pk=None):
        """GET /api/v1/public/workspace/{uuid}/export_config/ — Export config+results as JSON."""
        from django.http import HttpResponse
        workspace = self._get_workspace(pk)
        if not workspace:
            return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if workspace.status != Workspace.STATUS_COMPLETED:
            return Response({'error': 'El workspace aún no está completado.'}, status=status.HTTP_400_BAD_REQUEST)

        config = _build_config_dict(workspace)
        json_bytes = json.dumps(config, ensure_ascii=False, indent=2).encode('utf-8')

        date_str = workspace.created_at.strftime('%Y%m%d')
        dataset_slug = workspace.dataset.name[:30].replace(' ', '_')
        filename = f"lab_config_{dataset_slug}_{date_str}.json"

        response = HttpResponse(json_bytes, content_type='application/json; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


# ============================================================
# CORPUS STOPWORDS (PUBLIC)
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def public_corpus_stopwords(request):
    """
    GET /api/v1/public/corpus-stopwords/?dataset_id=X
    Returns the corpus stopwords for a given dataset (no auth required).
    """
    dataset_id_raw = request.query_params.get('dataset_id')
    if not dataset_id_raw:
        return Response({'error': 'dataset_id requerido.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        dataset_id = int(dataset_id_raw)
    except ValueError:
        return Response({'error': 'dataset_id debe ser un entero.'}, status=status.HTTP_400_BAD_REQUEST)

    from apps.workspace.inference import get_inference_stopwords
    corpus_stopwords = sorted(get_inference_stopwords(dataset_id=dataset_id))
    return Response({'corpus_stopwords': corpus_stopwords})

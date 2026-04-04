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

    @action(detail=True, methods=['get'], url_path='doc-term-matrix')
    def doc_term_matrix(self, request, pk=None):
        """
        BE-2: Return a top N docs × top N terms TF-IDF submatrix.

        Query params:
          top_terms (default 15, max 30)
          top_docs  (default 15, max 30)

        Response:
          { top_terms: string[], top_docs: string[],
            matrix: [{ id: docName, data: [{x: term, y: score}] }] }
        """
        import io
        import joblib
        import numpy as np
        from apps.datasets.models import DatasetFile

        tfidf_analysis = self.get_object()
        if tfidf_analysis.status != 'completed':
            return Response({'error': 'El análisis debe estar completado'}, status=status.HTTP_400_BAD_REQUEST)
        if not tfidf_analysis.vectorizer_artifact_bin:
            return Response({'error': 'Artefacto del vectorizador no disponible'}, status=status.HTTP_404_NOT_FOUND)

        top_terms = min(int(request.query_params.get('top_terms', 15)), 30)
        top_docs  = min(int(request.query_params.get('top_docs', 15)), 30)

        # Determine file_ids from the source
        source_type = tfidf_analysis.source_type
        file_ids = []
        if source_type == 'data_preparation' and tfidf_analysis.data_preparation:
            file_ids = tfidf_analysis.data_preparation.processed_file_ids or []
        elif source_type == 'bag_of_words' and tfidf_analysis.bag_of_words:
            prep = tfidf_analysis.bag_of_words.data_preparation
            if prep:
                file_ids = prep.processed_file_ids or []
        elif tfidf_analysis.ngram_analysis:
            prep = tfidf_analysis.ngram_analysis.data_preparation
            if prep:
                file_ids = prep.processed_file_ids or []

        if not file_ids:
            return Response({'error': 'No hay archivos procesados asociados'}, status=status.HTTP_404_NOT_FOUND)

        # Load files preserving order from file_ids
        files_qs = DatasetFile.objects.filter(id__in=file_ids).only(
            'id', 'preprocessed_text', 'bib_title', 'original_filename'
        )
        file_map = {f.id: f for f in files_qs}

        texts, names = [], []
        for fid in file_ids:
            f = file_map.get(fid)
            if f and f.preprocessed_text:
                label = (f.bib_title or f.original_filename or f'Doc {fid}')[:35]
                texts.append(f.preprocessed_text)
                names.append(label)

        if not texts:
            return Response({'error': 'No hay textos preprocesados disponibles'}, status=status.HTTP_404_NOT_FOUND)

        # Load TF-IDF vectorizer from binary artifact
        buf = io.BytesIO(bytes(tfidf_analysis.vectorizer_artifact_bin))
        vectorizer = joblib.load(buf)

        X = vectorizer.transform(texts)           # sparse (n_docs, n_vocab)
        feature_names = vectorizer.get_feature_names_out()

        top_terms = min(top_terms, X.shape[1])
        top_docs  = min(top_docs, X.shape[0])

        # Select top terms by average TF-IDF score across all docs
        avg_scores = np.asarray(X.mean(axis=0)).flatten()
        top_term_idx = avg_scores.argsort()[::-1][:top_terms]
        top_term_names = [str(feature_names[i]) for i in top_term_idx]

        # Select top docs by total TF-IDF score (most content-rich docs)
        doc_scores = np.asarray(X.sum(axis=1)).flatten()
        top_doc_idx = doc_scores.argsort()[::-1][:top_docs]

        sub = X[top_doc_idx, :][:, top_term_idx].toarray()
        selected_names = [names[i] for i in top_doc_idx]

        matrix_rows = [
            {
                'id': selected_names[i],
                'data': [
                    {'x': top_term_names[j], 'y': round(float(sub[i, j]), 4)}
                    for j in range(len(top_term_names))
                ],
            }
            for i in range(len(selected_names))
        ]

        return Response({
            'top_terms': top_term_names,
            'top_docs': selected_names,
            'matrix': matrix_rows,
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

    @action(detail=False, methods=['get'])
    def coherence_comparison(self, request):
        """Get coherence scores for all completed topic modelings in a dataset."""
        qs = self.get_queryset()
        return Response([
            {
                'id': tm.id,
                'name': tm.name,
                'num_topics': tm.num_topics,
                'coherence_score': tm.coherence_score,
                'perplexity_score': tm.perplexity_score,
                'algorithm': tm.algorithm,
            }
            for tm in qs
        ])

    @action(detail=True, methods=['get'], url_path='executive-summary')
    def executive_summary(self, request, pk=None):
        """
        BE-7: Generate a template-based executive summary for a topic modeling result.

        Uses BE-6 classification data (topic_classifications) to produce structured
        paragraphs describing the corpus, topics, OE3 coverage, and quality indicators.
        """
        from apps.topic_modeling.serializers import TopicModelingDetailSerializer as _Det

        tm = self.get_object()
        if tm.status != 'completed':
            return Response({'error': 'El análisis debe estar completado'}, status=status.HTTP_400_BAD_REQUEST)

        # Get topic classifications via the serializer method
        serializer = _Det(tm)
        classifications = serializer.get_topic_classifications(tm)

        topics      = tm.topics or []
        n_topics    = len(topics)
        n_docs      = tm.documents_processed or 0
        coherence   = tm.coherence_score
        perplexity  = tm.perplexity_score
        algorithm   = tm.get_algorithm_display()

        # Count topics per OE3 category
        cat_counts: dict = {}
        for cls in classifications:
            cat = cls['primary_category']
            cat_label = cls['primary_category_label']
            if cat not in cat_counts:
                cat_counts[cat] = {'count': 0, 'label': cat_label}
            cat_counts[cat]['count'] += 1

        # Sort by count
        sorted_cats = sorted(cat_counts.items(), key=lambda x: x[1]['count'], reverse=True)
        n_covered   = len(sorted_cats)

        # Top terms across all topics (by weight)
        term_weights: dict = {}
        for t in topics:
            for w in (t.get('words') or [])[:5]:
                word = w.get('word', '')
                wt   = float(w.get('weight', 0))
                term_weights[word] = term_weights.get(word, 0) + wt
        top_terms = sorted(term_weights.items(), key=lambda x: x[1], reverse=True)[:10]
        top_terms_str = ', '.join(f'"{t[0]}"' for t in top_terms)

        # Coherence quality label
        if coherence is None:
            quality_label = 'no disponible'
        elif coherence >= 0.6:
            quality_label = 'excelente (≥ 0.6)'
        elif coherence >= 0.4:
            quality_label = 'aceptable (0.4–0.6)'
        else:
            quality_label = 'mejorable (< 0.4)'

        # Build narrative
        paragraphs = []

        # P1: Corpus and method overview
        paragraphs.append(
            f'El corpus analizado consta de {n_docs:,} documentos. Se aplicó el algoritmo '
            f'**{algorithm}** con {n_topics} tópicos configurados.'
        )

        # P2: OE3 coverage
        if sorted_cats:
            dominant_cat = sorted_cats[0][1]['label']
            dominant_count = sorted_cats[0][1]['count']
            dominant_pct = round(dominant_count / max(1, n_topics) * 100)
            paragraphs.append(
                f'Los {n_topics} tópicos identificados cubren **{n_covered}/6 factores** del marco OE3. '
                f'La categoría más representada es **{dominant_cat}** con {dominant_count} tópicos '
                f'({dominant_pct}% del total). '
                + ('Las demás categorías identificadas son: ' + ', '.join(f'{v["label"]} ({v["count"]})'
                   for k, v in sorted_cats[1:]) + '.' if len(sorted_cats) > 1 else '')
            )

        # P3: Key terms
        if top_terms_str:
            paragraphs.append(
                f'Los términos con mayor peso acumulado en todos los tópicos son: {top_terms_str}. '
                'Estos términos reflejan los conceptos centrales de la transformación digital en IES '
                'presentes en la literatura analizada.'
            )

        # P4: Quality indicators
        quality_parts = [f'El score de coherencia promedio es **{coherence:.3f}** ({quality_label})' if coherence is not None else 'El score de coherencia no está disponible']
        if perplexity is not None:
            quality_parts.append(f'la perplejidad del modelo es **{perplexity:.1f}**')
        paragraphs.append('. '.join(quality_parts) + '.')

        # P5: Recommendation
        if coherence is not None and coherence < 0.4:
            paragraphs.append(
                'ℹ️ **Recomendación:** Considera ajustar el número de tópicos o ampliar el corpus '
                'para mejorar la coherencia del modelo. Un valor de coherencia < 0.4 puede indicar '
                'que los tópicos se superponen semánticamente.'
            )

        return Response({
            'model_name': tm.name,
            'algorithm': algorithm,
            'n_topics': n_topics,
            'n_docs': n_docs,
            'coherence_score': coherence,
            'perplexity_score': perplexity,
            'oe3_coverage': n_covered,
            'category_distribution': [
                {'id': k, 'label': v['label'], 'count': v['count']}
                for k, v in sorted_cats
            ],
            'summary_paragraphs': paragraphs,
            'summary_markdown': '\n\n'.join(paragraphs),
        })


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

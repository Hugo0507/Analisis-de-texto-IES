"""
Vectorizacion: bolsa de palabras, n-gramas y TF-IDF.
"""

import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)

from .base import PublicAPIPagination

from apps.bag_of_words.models import BagOfWords
from apps.bag_of_words.serializers import (
    BagOfWordsListSerializer,
    BagOfWordsDetailSerializer,
)

from apps.ngram_analysis.models import NgramAnalysis
from apps.ngram_analysis.serializers import (
    NgramAnalysisListSerializer,
    NgramAnalysisDetailSerializer,
)

from apps.tfidf_analysis.models import TfIdfAnalysis
from apps.tfidf_analysis.serializers import (
    TfIdfAnalysisListSerializer,
    TfIdfAnalysisDetailSerializer,
)


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
        top_docs = min(int(request.query_params.get('top_docs', 15)), 30)

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
        top_docs = min(top_docs, X.shape[0])

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

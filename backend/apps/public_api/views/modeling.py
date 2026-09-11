"""
Modelado: NER, topic modeling y BERTopic.
"""

import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)

from .base import PublicAPIPagination

from apps.ner_analysis.models import NerAnalysis
from apps.ner_analysis.serializers import (
    NerAnalysisListSerializer,
    NerAnalysisDetailSerializer,
)

from apps.topic_modeling.models import TopicModeling
from apps.topic_modeling.serializers import (
    TopicModelingListSerializer,
    TopicModelingDetailSerializer,
)

from apps.bertopic.models import BERTopicAnalysis
from apps.bertopic.serializers import (
    BERTopicListSerializer,
    BERTopicDetailSerializer,
)


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

        topics = tm.topics or []
        n_topics = len(topics)
        n_docs = tm.documents_processed or 0
        coherence = tm.coherence_score
        perplexity = tm.perplexity_score
        algorithm = tm.get_algorithm_display()

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
        n_covered = len(sorted_cats)

        # Top terms across all topics (by weight)
        term_weights: dict = {}
        for t in topics:
            for w in (t.get('words') or [])[:5]:
                word = w.get('word', '')
                wt = float(w.get('weight', 0))
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
            f'**{algorithm}** con {n_topics} temas configurados.'
        )

        # P2: OE3 coverage
        if sorted_cats:
            dominant_cat = sorted_cats[0][1]['label']
            dominant_count = sorted_cats[0][1]['count']
            dominant_pct = round(dominant_count / max(1, n_topics) * 100)
            paragraphs.append(
                f'Los {n_topics} temas identificados cubren **{n_covered}/6 factores** del marco OE3. '
                f'La categoría más representada es **{dominant_cat}** con {dominant_count} temas '
                f'({dominant_pct}% del total). '
                + ('Las demás categorías identificadas son: ' + ', '.join(f'{v["label"]} ({v["count"]})'
                   for k, v in sorted_cats[1:]) + '.' if len(sorted_cats) > 1 else '')
            )

        # P3: Key terms
        if top_terms_str:
            paragraphs.append(
                f'Los términos con mayor peso acumulado en todos los temas son: {top_terms_str}. '
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
                'ℹ️ **Recomendación:** Considera ajustar el número de temas o ampliar el corpus '
                'para mejorar la coherencia del modelo. Un valor de coherencia < 0.4 puede indicar '
                'que los temas se superponen semánticamente.'
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

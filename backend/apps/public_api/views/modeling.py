"""
Modelado: NER, topic modeling y BERTopic.
"""

import logging

from django.db.models import Q
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
from apps.topic_modeling.factors import OE3_CATEGORIES
from apps.topic_modeling.queries import con_tamano_de_artefactos
from apps.topic_modeling.serializers import (
    TopicModelingListSerializer,
    TopicModelingDetailSerializer,
)

from apps.bertopic.models import BERTopicAnalysis
from apps.bertopic.serializers import (
    BERTopicListSerializer,
    BERTopicDetailSerializer,
)


def _miles(n):
    """Número con punto como separador de miles, al estilo del dashboard."""
    return f'{n or 0:,}'.replace(',', '.')


def _decimal(n, decimales=None):
    """Número con coma decimal, como se escribe en español."""
    if n is None:
        return '—'
    texto = f'{n:.{decimales}f}' if decimales is not None else f'{n:g}'
    return texto.replace('.', ',')


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
        if self.action == 'list':
            # El listado solo necesita saber si hay artefactos, no su contenido
            qs = con_tamano_de_artefactos(qs)
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

        # Términos más presentes: en cuántos temas aparecen entre los 5 primeros.
        # No se suman los pesos crudos porque su escala depende del algoritmo
        # (LDA entrega conteos y NMF/LSA/PLSA puntuaciones), así que sumarlos
        # solo destacaba los temas más grandes.
        presencia: dict = {}
        aporte: dict = {}
        for t in topics:
            palabras = t.get('words') or []
            total_tema = sum(abs(float(w.get('weight', 0) or 0)) for w in palabras) or 1
            for w in palabras[:5]:
                palabra = w.get('word', '')
                if palabra:
                    presencia[palabra] = presencia.get(palabra, 0) + 1
                    # El aporte se normaliza por tema para poder sumarlo entre
                    # algoritmos con escalas distintas; desempata a igual presencia.
                    aporte[palabra] = aporte.get(palabra, 0) + abs(float(w.get('weight', 0) or 0)) / total_tema
        terminos = sorted(
            presencia.items(), key=lambda x: (-x[1], -aporte.get(x[0], 0), x[0])
        )[:10]
        terminos_str = ', '.join(f'"{t[0]}"' for t in terminos)
        transversales = [t for t in terminos if t[1] > 1]

        # Coherence quality label
        if coherence is None:
            quality_label = 'no disponible'
        elif coherence >= 0.6:
            quality_label = 'alta para el rango habitual de C_V, de 0 a 1'
        elif coherence >= 0.4:
            quality_label = 'aceptable: está entre 0,4 y 0,6'
        else:
            quality_label = 'baja: por debajo de 0,4'

        # Posición frente a los demás modelos completados del mismo corpus
        dataset_id = (
            tm.data_preparation.dataset_id if tm.data_preparation_id else tm.dataset_id
        )
        hermanos = []
        if dataset_id:
            hermanos = list(
                TopicModeling.objects.filter(status='completed')
                .filter(
                    Q(dataset_id=dataset_id) | Q(data_preparation__dataset_id=dataset_id)
                )
                .exclude(coherence_score__isnull=True)
                .values_list('id', 'coherence_score')
            )
        ordenados = sorted(hermanos, key=lambda x: x[1], reverse=True)
        posicion = next((i + 1 for i, (i_id, _) in enumerate(ordenados) if i_id == tm.id), None)

        # Factores del marco OE3 que ningún tema cubrió
        cubiertos = set(cat_counts)
        sin_cubrir = [c['label'] for c in OE3_CATEGORIES if c['id'] not in cubiertos]

        # Build narrative
        paragraphs = []

        # P1: corpus, preparación y configuración con la que se entrenó
        origen = tm.data_preparation.name if tm.data_preparation_id else (
            tm.dataset.name if tm.dataset_id else 'el corpus seleccionado'
        )
        paragraphs.append(
            f'Este resumen describe **{tm.name}**: {n_topics} temas extraídos con '
            f'**{algorithm}** sobre {_miles(n_docs)} documentos de «{origen}», con un '
            f'vocabulario de hasta {_miles(tm.max_features)} términos '
            f'(min_df {tm.min_df}, max_df {_decimal(tm.max_df)}, '
            f'n-gramas {tm.ngram_min}–{tm.ngram_max}).'
        )

        # P2: cobertura del marco OE3, con empates y factores ausentes
        if sorted_cats:
            maximo = sorted_cats[0][1]['count']
            empatadas = [v['label'] for _, v in sorted_cats if v['count'] == maximo]
            pct = round(maximo / max(1, n_topics) * 100)
            if len(empatadas) == 1:
                encabezado = (
                    f'La categoría con más temas es **{empatadas[0]}** '
                    f'({maximo} de {n_topics}, {pct}%).'
                )
            else:
                encabezado = (
                    'Empatan como categorías con más temas: '
                    + ' y '.join(f'**{e}**' for e in empatadas)
                    + f', con {maximo} temas cada una ({pct}% del total).'
                )
            resto = [
                f'{v["label"]} ({v["count"]})'
                for _, v in sorted_cats if v['count'] != maximo
            ]
            detalle = f' Le siguen: {", ".join(resto)}.' if resto else ''
            falta = (
                f' Ningún tema quedó clasificado en {" ni ".join(sin_cubrir)}.'
                if sin_cubrir else ' Los seis factores del marco quedaron representados.'
            )
            paragraphs.append(
                f'Los temas cubren **{n_covered} de los 6 factores** del marco OE3. '
                f'{encabezado}{detalle}{falta} La clasificación es automática, por '
                f'coincidencia de las palabras clave de cada factor con los términos '
                f'de cada tema.'
            )

        # P3: términos que atraviesan el corpus
        if terminos_str:
            if transversales:
                cruce = (
                    ' Aparecen en varios temas a la vez: '
                    + ', '.join(f'"{t[0]}" ({t[1]} temas)' for t in transversales[:3])
                    + ', lo que indica asuntos transversales del corpus.'
                )
            else:
                cruce = ' Cada uno pesa sobre todo en un único tema, sin solapamiento marcado.'
            paragraphs.append(
                f'Los términos más presentes entre los cinco principales de cada tema son: '
                f'{terminos_str}.{cruce}'
            )

        # P4: calidad del modelo, comparada con los demás del mismo corpus
        quality_parts = [
            f'La coherencia C_V es **{_decimal(coherence, 3)}**, {quality_label}'
            if coherence is not None else 'La coherencia C_V no está disponible'
        ]
        if perplexity is not None:
            quality_parts.append(f'la perplejidad del modelo es **{_decimal(perplexity, 1)}**')
        cierre = '. '.join(quality_parts) + '.'
        if posicion and len(ordenados) > 1:
            cierre += (
                f' Entre los {len(ordenados)} modelos de temas completados de este corpus, '
                f'ocupa el puesto **{posicion}** por coherencia.'
            )
        paragraphs.append(cierre)

        # P5: Recommendation
        if coherence is not None and coherence < 0.4:
            paragraphs.append(
                '**Recomendación:** considera ajustar el número de temas o ampliar el '
                'corpus. Una coherencia por debajo de 0,4 suele indicar que los temas '
                'se superponen entre sí.'
            )

        return Response({
            'model_name': tm.name,
            'algorithm': algorithm,
            'n_topics': n_topics,
            'n_docs': n_docs,
            'coherence_score': coherence,
            'perplexity_score': perplexity,
            'oe3_coverage': n_covered,
            'uncovered_categories': sin_cubrir,
            'coherence_rank': posicion,
            'models_compared': len(ordenados),
            'source_name': origen,
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

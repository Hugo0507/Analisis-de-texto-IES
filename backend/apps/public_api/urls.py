"""
Public API URLs

Read-only endpoints for the public dashboard.
All endpoints use AllowAny permission.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PublicDatasetViewSet,
    PublicDocumentViewSet,
    PublicDataPreparationViewSet,
    PublicBagOfWordsViewSet,
    PublicNgramAnalysisViewSet,
    PublicTfIdfAnalysisViewSet,
    PublicNerAnalysisViewSet,
    PublicTopicModelingViewSet,
    PublicBERTopicViewSet,
    PublicWorkspaceViewSet,
    public_corpus_stopwords,
)

router = DefaultRouter()
router.register(r'datasets', PublicDatasetViewSet, basename='public-dataset')
router.register(r'documents', PublicDocumentViewSet, basename='public-document')
router.register(r'data-preparation', PublicDataPreparationViewSet, basename='public-data-preparation')
router.register(r'bag-of-words', PublicBagOfWordsViewSet, basename='public-bag-of-words')
router.register(r'ngram-analysis', PublicNgramAnalysisViewSet, basename='public-ngram-analysis')
router.register(r'tfidf-analysis', PublicTfIdfAnalysisViewSet, basename='public-tfidf-analysis')
router.register(r'ner-analysis', PublicNerAnalysisViewSet, basename='public-ner-analysis')
router.register(r'topic-modeling', PublicTopicModelingViewSet, basename='public-topic-modeling')
router.register(r'bertopic', PublicBERTopicViewSet, basename='public-bertopic')
router.register(r'workspace', PublicWorkspaceViewSet, basename='public-workspace')

urlpatterns = [
    path('', include(router.urls)),
    path('corpus-stopwords/', public_corpus_stopwords, name='public-corpus-stopwords'),
]

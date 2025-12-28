"""
URL configuration for Analysis app.

Exposes Analysis ViewSets:

BoW Endpoints:
- POST /bow/generate/ - Generate BoW matrix
- GET /bow/{document_id}/ - Get BoW for document
- GET /bow/vocabulary/ - Get vocabulary statistics

TF-IDF Endpoints:
- POST /tfidf/calculate/ - Calculate TF-IDF matrix
- GET /tfidf/{document_id}/ - Get TF-IDF for document
- GET /tfidf/similarity/ - Calculate similarity between documents

Topic Modeling Endpoints:
- POST /topics/train/ - Train topic model
- GET /topics/lda/ - Get LDA results
- GET /topics/nmf/ - Get NMF results
- GET /topics/lsa/ - Get LSA results
- GET /topics/plsa/ - Get pLSA results
- GET /topics/compare/ - Compare all models

Factor Analysis Endpoints:
- POST /factors/analyze/ - Analyze factors
- GET /factors/{document_id}/ - Get factors for document
- GET /factors/statistics/ - Get global factor statistics
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BowViewSet, TfidfViewSet, TopicModelingViewSet, FactorAnalysisViewSet

router = DefaultRouter()
router.register(r'bow', BowViewSet, basename='bow')
router.register(r'tfidf', TfidfViewSet, basename='tfidf')
router.register(r'topics', TopicModelingViewSet, basename='topics')
router.register(r'factors', FactorAnalysisViewSet, basename='factors')

urlpatterns = [
    path('', include(router.urls)),
]

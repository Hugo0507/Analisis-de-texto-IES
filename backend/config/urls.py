"""
URL Configuration for Análisis de Transformación Digital project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from apps.core.views import health_check, api_root

urlpatterns = [
    # Root and Health Check
    path('', api_root, name='api-root'),
    path('health/', health_check, name='health-check'),

    # Django Admin
    path('admin/', admin.site.urls),

    # API v1
    path('api/v1/', include('apps.users.urls')),  # Auth and Users
    path('api/v1/documents/', include('apps.documents.urls')),
    path('api/v1/', include('apps.datasets.urls')),  # Datasets
    path('api/v1/', include('apps.data_preparation.urls')),  # Data Preparation
    path('api/v1/', include('apps.bag_of_words.urls')),  # Bag of Words
    path('api/v1/', include('apps.ngram_analysis.urls')),  # Ngram Analysis
    path('api/v1/', include('apps.tfidf_analysis.urls')),  # TF-IDF Analysis
    path('api/v1/', include('apps.ner_analysis.urls')),  # NER Analysis
    path('api/v1/', include('apps.topic_modeling.urls')),  # Topic Modeling
    path('api/v1/', include('apps.bertopic.urls')),  # BERTopic Analysis
    path('api/v1/analysis/', include('apps.analysis.urls')),
    path('api/v1/pipeline/', include('apps.pipeline.urls')),
    path('api/v1/public/', include('apps.public_api.urls')),  # Public Dashboard API
    path('api/v1/ai-analysis/', include('apps.ai_analysis.urls')),  # AI Analysis (LLM)

    # OpenAPI/Swagger Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

"""
URL configuration for Documents app.

Exposes DocumentViewSet endpoints:
- GET/POST /documents/ - List/Create documents
- GET/PUT/PATCH/DELETE /documents/{id}/ - Detail/Update/Delete
- POST /documents/upload/ - Upload from Google Drive
- POST /documents/{id}/detect-language/ - Detect language for document
- POST /documents/detect-language-batch/ - Batch language detection
- POST /documents/{id}/convert/ - Convert PDF to TXT
- POST /documents/convert-batch/ - Batch conversion
- POST /documents/{id}/preprocess/ - Preprocess text
- POST /documents/preprocess-batch/ - Batch preprocessing
- GET /documents/{id}/statistics/ - Get text statistics
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet

router = DefaultRouter()
router.register(r'', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
]

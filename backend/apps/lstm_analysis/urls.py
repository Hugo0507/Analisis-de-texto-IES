"""
LSTM Analysis URLs
"""

from rest_framework.routers import DefaultRouter
from .views import LstmAnalysisViewSet

router = DefaultRouter()
router.register(r'lstm-analysis', LstmAnalysisViewSet, basename='lstm-analysis')

urlpatterns = router.urls

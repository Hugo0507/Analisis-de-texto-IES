"""
Views for AI Analysis app.

ViewSets for managing AI analysis configs, results, and comparisons.
"""

import logging

from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import AIAnalysisConfig, AIAnalysisResult, AIComparisonResult
from .serializers import (
    AIAnalysisConfigSerializer,
    AIAnalysisConfigCreateSerializer,
    AIAnalysisResultSerializer,
    AIAnalysisResultListSerializer,
    AIComparisonResultSerializer,
)
from .use_cases.run_ai_analysis import RunAIAnalysisUseCase
from .use_cases.compare_ai_results import CompareAIResultsUseCase

logger = logging.getLogger(__name__)


class AIAnalysisConfigViewSet(viewsets.ModelViewSet):
    """
    CRUD + run action for AI Analysis configurations.

    Endpoints:
    - GET    /ai-analysis/configs/              list
    - POST   /ai-analysis/configs/              create
    - GET    /ai-analysis/configs/{id}/          retrieve
    - PUT    /ai-analysis/configs/{id}/          update
    - PATCH  /ai-analysis/configs/{id}/          partial_update
    - DELETE /ai-analysis/configs/{id}/          destroy
    - POST   /ai-analysis/configs/{id}/run/      run analysis
    """
    queryset = AIAnalysisConfig.objects.select_related(
        'dataset', 'created_by'
    ).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return AIAnalysisConfigCreateSerializer
        return AIAnalysisConfigSerializer

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)

    @action(detail=True, methods=['post'], url_path='run')
    def run(self, request, pk=None):
        """
        Run AI analysis for this config.

        POST /ai-analysis/configs/{id}/run/
        Body (optional): {"providers": ["claude", "gemini", "openai"]}
        """
        providers = request.data.get('providers', ['claude', 'gemini', 'openai'])

        use_case = RunAIAnalysisUseCase()
        result = use_case.execute(
            config_id=int(pk),
            providers=providers,
        )

        if result.get('success'):
            return Response(result, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)


class AIAnalysisResultViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Read-only ViewSet for AI Analysis results.

    Endpoints:
    - GET /ai-analysis/results/           list
    - GET /ai-analysis/results/{id}/      retrieve
    """
    queryset = AIAnalysisResult.objects.select_related('config').order_by('-created_at')
    filterset_fields = ['provider', 'config']

    def get_serializer_class(self):
        if self.action == 'list':
            return AIAnalysisResultListSerializer
        return AIAnalysisResultSerializer


class AIComparisonViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Read-only ViewSet for AI comparison results + compare action.

    Endpoints:
    - GET  /ai-analysis/comparisons/                list
    - GET  /ai-analysis/comparisons/{id}/            retrieve
    - POST /ai-analysis/comparisons/compare/         run comparison
    """
    queryset = AIComparisonResult.objects.select_related(
        'config', 'claude_result', 'gemini_result', 'openai_result'
    ).order_by('-created_at')
    serializer_class = AIComparisonResultSerializer

    @action(detail=False, methods=['post'], url_path='compare')
    def compare(self, request):
        """
        Run comparison for a given config_id.

        POST /ai-analysis/comparisons/compare/
        Body: {"config_id": 1}
        """
        config_id = request.data.get('config_id')
        if not config_id:
            return Response(
                {'success': False, 'error': 'config_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        use_case = CompareAIResultsUseCase()
        result = use_case.execute(config_id=int(config_id))

        if result.get('success'):
            return Response(result, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)

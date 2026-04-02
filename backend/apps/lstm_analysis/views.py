"""
LSTM Analysis Views
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count

from .models import LstmAnalysis
from .serializers import (
    LstmListSerializer,
    LstmDetailSerializer,
    LstmCreateSerializer,
    LstmProgressSerializer,
)

logger = logging.getLogger(__name__)


class LstmAnalysisViewSet(viewsets.ModelViewSet):
    """
    ViewSet para análisis LSTM.

    Endpoints:
    - GET  /lstm-analysis/            — listar
    - POST /lstm-analysis/            — crear y entrenar
    - GET  /lstm-analysis/{id}/       — detalle con resultados
    - DELETE /lstm-analysis/{id}/     — eliminar
    - GET  /lstm-analysis/{id}/progress/ — polling de progreso
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return LstmAnalysis.objects.filter(created_by=self.request.user).select_related(
            'data_preparation', 'topic_modeling'
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return LstmListSerializer
        if self.action == 'create':
            return LstmCreateSerializer
        if self.action == 'progress':
            return LstmProgressSerializer
        return LstmDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lstm = serializer.save()

        from .processor import start_processing_thread
        start_processing_thread(lstm.id)

        response_serializer = LstmDetailSerializer(lstm)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """GET /lstm-analysis/{id}/progress/"""
        lstm = self.get_object()
        serializer = LstmProgressSerializer(lstm)
        return Response(serializer.data)

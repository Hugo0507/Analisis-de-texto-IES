"""
Laboratorio publico: workspaces anonimos e inferencia.
"""

import json
import logging

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)


# ============================================================
# WORKSPACE (PUBLIC — no auth required)
# ============================================================

import subprocess
import sys
import threading

from apps.workspace.models import Workspace, WorkspaceDocument
from apps.workspace.serializers import (
    WorkspaceSerializer,
    WorkspaceUploadSerializer,
)
from apps.workspace.views import (
    _monitor_inference_subprocess,
    _build_excel_bytes,
    _build_config_dict,
    DEFAULT_INFERENCE_PARAMS,
)

WORKSPACE_PUBLIC_EXPIRY_HOURS = 48


class PublicWorkspaceViewSet(viewsets.ViewSet):
    """
    Public workspace endpoints for the Laboratory module.
    No authentication required. Workspaces are identified by UUID.
    Anonymous workspaces expire after 48 hours.
    """

    permission_classes = [AllowAny]

    def _get_workspace(self, workspace_id):
        """Fetch workspace by UUID. Returns None if not found."""
        try:
            return Workspace.objects.prefetch_related('documents').get(id=workspace_id)
        except (Workspace.DoesNotExist, Exception):
            return None

    def create(self, request):
        """
        POST /api/v1/public/workspace/
        Create a new anonymous workspace.

        Body: {
          dataset_id, bow_id?, tfidf_id?, topic_model_id?,
          ner_id?, bertopic_id?, custom_stopwords?, inference_params?
        }
        """
        dataset_id = request.data.get('dataset_id')
        if not dataset_id:
            return Response({'error': 'dataset_id es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.datasets.models import Dataset
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({'error': f'Dataset {dataset_id} no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        expires_at = timezone.now() + timezone.timedelta(hours=WORKSPACE_PUBLIC_EXPIRY_HOURS)

        workspace = Workspace.objects.create(
            created_by=None,
            dataset=dataset,
            bow_id=request.data.get('bow_id'),
            tfidf_id=request.data.get('tfidf_id'),
            topic_model_id=request.data.get('topic_model_id'),
            ner_id=request.data.get('ner_id'),
            bertopic_id=request.data.get('bertopic_id'),
            custom_stopwords=request.data.get('custom_stopwords') or [],
            inference_params=request.data.get('inference_params') or DEFAULT_INFERENCE_PARAMS,
            expires_at=expires_at,
        )

        logger.info(f"[PUBLIC WS {workspace.id}] Creado anónimo (dataset={dataset_id}, expires={expires_at})")
        return Response(WorkspaceSerializer(workspace).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        """GET /api/v1/public/workspace/{uuid}/ — Get workspace + results."""
        workspace = self._get_workspace(pk)
        if not workspace:
            return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(WorkspaceSerializer(workspace).data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser])
    def upload(self, request, pk=None):
        """POST /api/v1/public/workspace/{uuid}/upload/ — Upload a PDF."""
        workspace = self._get_workspace(pk)
        if not workspace:
            return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if workspace.status == Workspace.STATUS_PROCESSING:
            return Response(
                {'error': 'El workspace está procesando. Espera a que termine.'},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = WorkspaceUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = serializer.validated_data['file']
        doc = WorkspaceDocument.objects.create(
            workspace=workspace,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            file_size=uploaded_file.size,
            status=WorkspaceDocument.STATUS_PENDING,
        )

        return Response(
            {
                'id': doc.id,
                'original_filename': doc.original_filename,
                'file_size': doc.file_size,
                'status': doc.status,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def run(self, request, pk=None):
        """POST /api/v1/public/workspace/{uuid}/run/ — Start inference."""
        workspace = self._get_workspace(pk)
        if not workspace:
            return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if workspace.status == Workspace.STATUS_PROCESSING:
            return Response({'error': 'El workspace ya está procesando.'}, status=status.HTTP_409_CONFLICT)

        pending_docs = workspace.documents.filter(
            status__in=[WorkspaceDocument.STATUS_PENDING, WorkspaceDocument.STATUS_READY]
        )
        if not pending_docs.exists():
            return Response(
                {'error': 'No hay documentos para procesar. Sube al menos un PDF.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        workspace.status = Workspace.STATUS_PROCESSING
        workspace.progress_percentage = 0
        workspace.error_message = None
        workspace.results = {}
        workspace.save()

        process = subprocess.Popen(
            [sys.executable, 'manage.py', 'run_inference', str(workspace.id)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        logger.info(f"[PUBLIC WS {pk}] Subprocess lanzado (PID: {process.pid})")

        monitor = threading.Thread(
            target=_monitor_inference_subprocess,
            args=(process, str(workspace.id)),
            daemon=True,
        )
        monitor.start()

        return Response(
            {'status': 'processing', 'workspace_id': str(workspace.id)},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=['get'])
    def export_excel(self, request, pk=None):
        """GET /api/v1/public/workspace/{uuid}/export_excel/ — Export as .xlsx."""
        from django.http import HttpResponse
        workspace = self._get_workspace(pk)
        if not workspace:
            return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if workspace.status != Workspace.STATUS_COMPLETED:
            return Response({'error': 'El workspace aún no está completado.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            xlsx_bytes = _build_excel_bytes(workspace)
        except Exception as exc:
            logger.exception(f"[PUBLIC WS {pk}] Error generando Excel: {exc}")
            return Response({'error': f'Error generando el Excel: {exc}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        date_str = workspace.created_at.strftime('%Y%m%d')
        dataset_slug = workspace.dataset.name[:30].replace(' ', '_')
        filename = f"lab_{dataset_slug}_{date_str}.xlsx"

        response = HttpResponse(
            xlsx_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'])
    def export_config(self, request, pk=None):
        """GET /api/v1/public/workspace/{uuid}/export_config/ — Export config+results as JSON."""
        from django.http import HttpResponse
        workspace = self._get_workspace(pk)
        if not workspace:
            return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if workspace.status != Workspace.STATUS_COMPLETED:
            return Response({'error': 'El workspace aún no está completado.'}, status=status.HTTP_400_BAD_REQUEST)

        config = _build_config_dict(workspace)
        json_bytes = json.dumps(config, ensure_ascii=False, indent=2).encode('utf-8')

        date_str = workspace.created_at.strftime('%Y%m%d')
        dataset_slug = workspace.dataset.name[:30].replace(' ', '_')
        filename = f"lab_config_{dataset_slug}_{date_str}.json"

        response = HttpResponse(json_bytes, content_type='application/json; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


# ============================================================
# CORPUS STOPWORDS (PUBLIC)
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def public_corpus_stopwords(request):
    """
    GET /api/v1/public/corpus-stopwords/?dataset_id=X
    Returns the corpus stopwords for a given dataset (no auth required).
    """
    dataset_id_raw = request.query_params.get('dataset_id')
    if not dataset_id_raw:
        return Response({'error': 'dataset_id requerido.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        dataset_id = int(dataset_id_raw)
    except ValueError:
        return Response({'error': 'dataset_id debe ser un entero.'}, status=status.HTTP_400_BAD_REQUEST)

    from apps.workspace.inference import get_inference_stopwords
    corpus_stopwords = sorted(get_inference_stopwords(dataset_id=dataset_id))
    return Response({'corpus_stopwords': corpus_stopwords})

"""
Workspace Views

API para el Laboratorio: subida de PDFs e inferencia con modelos del corpus.

Arquitectura de procesos:
    - La inferencia corre en un subprocess completamente separado via
      `python manage.py run_inference <workspace_id>`. Esto evita la
      heap corruption causada por fork() heredando estado de numpy/scipy
      del proceso gunicorn padre.
    - Un Thread monitor vigila el subprocess; si crashea o excede el timeout
      de 5 minutos, marca el workspace como error automáticamente.
"""

import logging
import subprocess
import sys
import threading

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Workspace, WorkspaceDocument
from .serializers import (
    WorkspaceSerializer,
    WorkspaceCreateSerializer,
    WorkspaceUploadSerializer,
)

logger = logging.getLogger(__name__)

# Timeout máximo para el proceso de inferencia (5 minutos)
INFERENCE_TIMEOUT_SECONDS = 5 * 60


# ── Endpoints ────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def workspace_list(request):
    """Listar workspaces del usuario o crear uno nuevo."""
    if request.method == 'GET':
        workspaces = Workspace.objects.filter(created_by=request.user).prefetch_related('documents')
        serializer = WorkspaceSerializer(workspaces, many=True)
        return Response(serializer.data)

    serializer = WorkspaceCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        workspace = serializer.save()
        return Response(WorkspaceSerializer(workspace).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def workspace_detail(request, workspace_id):
    """Obtener o eliminar un workspace."""
    try:
        workspace = Workspace.objects.prefetch_related('documents').get(
            id=workspace_id,
            created_by=request.user
        )
    except Workspace.DoesNotExist:
        return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        workspace.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(WorkspaceSerializer(workspace).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def workspace_upload(request, workspace_id):
    """Subir un PDF al workspace."""
    try:
        workspace = Workspace.objects.get(id=workspace_id, created_by=request.user)
    except Workspace.DoesNotExist:
        return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if workspace.status == Workspace.STATUS_PROCESSING:
        return Response(
            {'error': 'El workspace está procesando. Espera a que termine antes de subir más archivos.'},
            status=status.HTTP_409_CONFLICT
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
        status=status.HTTP_201_CREATED
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def workspace_run(request, workspace_id):
    """
    Iniciar inferencia sobre los documentos subidos al workspace.

    Lanza un subprocess completamente separado (python manage.py run_inference)
    y un Thread monitor que detecta crashes o timeouts.
    """
    try:
        workspace = Workspace.objects.prefetch_related('documents').get(
            id=workspace_id,
            created_by=request.user
        )
    except Workspace.DoesNotExist:
        return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if workspace.status == Workspace.STATUS_PROCESSING:
        return Response(
            {'error': 'El workspace ya está procesando.'},
            status=status.HTTP_409_CONFLICT
        )

    pending_docs = workspace.documents.filter(
        status__in=[WorkspaceDocument.STATUS_PENDING, WorkspaceDocument.STATUS_READY]
    )
    if not pending_docs.exists():
        return Response(
            {'error': 'No hay documentos para procesar. Sube al menos un PDF.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    workspace.status = Workspace.STATUS_PROCESSING
    workspace.progress_percentage = 0
    workspace.error_message = None
    workspace.results = {}
    workspace.save()

    # Lanzar subprocess completamente aislado (sin fork, sin heap compartido)
    process = subprocess.Popen(
        [sys.executable, 'manage.py', 'run_inference', str(workspace.id)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    logger.info(
        f"[WS {workspace_id}] Subprocess de inferencia lanzado (PID: {process.pid})"
    )

    # Monitor: vigila el subprocess y actualiza status si crashea/timeout
    monitor = threading.Thread(
        target=_monitor_inference_subprocess,
        args=(process, str(workspace.id)),
        daemon=True,
    )
    monitor.start()

    return Response(
        {'status': 'processing', 'workspace_id': str(workspace.id)},
        status=status.HTTP_202_ACCEPTED
    )


# ── Monitor del subprocess de inferencia ─────────────────────────────────

def _monitor_inference_subprocess(process: subprocess.Popen, workspace_id: str):
    """
    Vigila el subprocess de inferencia.

    Si el proceso termina con returncode != 0 (crash, OOM, etc.)
    o excede el timeout, marca el workspace como error.
    Esto garantiza que NUNCA quede un workspace atascado en 'processing'.
    """
    try:
        try:
            stdout, stderr = process.communicate(timeout=INFERENCE_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            logger.error(
                f"[WS {workspace_id}] Timeout de {INFERENCE_TIMEOUT_SECONDS}s "
                f"alcanzado. Terminando subprocess..."
            )
            process.kill()
            stdout, stderr = process.communicate(timeout=10)

            _mark_workspace_error(
                workspace_id,
                f"La inferencia excedió el tiempo máximo de "
                f"{INFERENCE_TIMEOUT_SECONDS // 60} minutos y fue cancelada."
            )
            return

        if process.returncode != 0:
            stderr_text = stderr.decode('utf-8', errors='replace')[-500:] if stderr else ''
            logger.error(
                f"[WS {workspace_id}] Subprocess terminó con código {process.returncode}. "
                f"stderr: {stderr_text}"
            )
            _mark_workspace_error(
                workspace_id,
                f"El proceso de inferencia terminó con error "
                f"(código: {process.returncode}). Intenta de nuevo."
            )
            return

        logger.info(f"[WS {workspace_id}] Subprocess de inferencia finalizó OK")

    except Exception as e:
        logger.exception(f"[WS {workspace_id}] Error en monitor: {e}")
        _mark_workspace_error(workspace_id, f"Error interno del monitor: {e}")


def _mark_workspace_error(workspace_id: str, message: str):
    """Marca un workspace como error (solo si aún está en processing)."""
    try:
        workspace = Workspace.objects.get(id=workspace_id)
        if workspace.status == Workspace.STATUS_PROCESSING:
            workspace.status = Workspace.STATUS_ERROR
            workspace.error_message = message[:500]
            workspace.save()
            logger.info(f"[WS {workspace_id}] Marcado como error: {message}")
    except Exception as e:
        logger.error(f"[WS {workspace_id}] No se pudo marcar error: {e}")

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

# Parámetros por defecto para inferencia
DEFAULT_INFERENCE_PARAMS = {
    'num_top_terms': 50,
    'strip_references': True,
    'min_word_length': 2,
    'ner_entity_types': [],   # vacío = heredar del NER de referencia
}

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


# ── Stopwords ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workspace_stopwords(request, workspace_id):
    """
    Obtener las stopwords activas del workspace.

    Retorna:
    - corpus_stopwords: palabras del corpus (solo lectura)
    - custom_stopwords: palabras personalizadas del usuario para esta sesión
    """
    try:
        workspace = Workspace.objects.get(id=workspace_id, created_by=request.user)
    except Workspace.DoesNotExist:
        return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    from apps.workspace.inference import get_inference_stopwords
    corpus_stopwords = sorted(get_inference_stopwords(dataset_id=workspace.dataset_id))

    return Response({
        'corpus_stopwords': corpus_stopwords,
        'custom_stopwords': workspace.custom_stopwords or [],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def workspace_stopwords_update(request, workspace_id):
    """
    Añadir o quitar stopwords personalizadas.

    Body: { "add": ["word1", "word2"], "remove": ["word3"] }
    """
    try:
        workspace = Workspace.objects.get(id=workspace_id, created_by=request.user)
    except Workspace.DoesNotExist:
        return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if workspace.status == Workspace.STATUS_PROCESSING:
        return Response(
            {'error': 'No se puede modificar stopwords mientras la inferencia está en curso.'},
            status=status.HTTP_409_CONFLICT
        )

    to_add = request.data.get('add', [])
    to_remove = request.data.get('remove', [])

    if not isinstance(to_add, list) or not isinstance(to_remove, list):
        return Response(
            {'error': 'Los campos "add" y "remove" deben ser listas.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    current = set(workspace.custom_stopwords or [])

    # Normalizar: lowercase, strip, solo palabras no vacías
    new_words = {w.strip().lower() for w in to_add if isinstance(w, str) and w.strip()}
    remove_words = {w.strip().lower() for w in to_remove if isinstance(w, str) and w.strip()}

    current = (current | new_words) - remove_words
    workspace.custom_stopwords = sorted(current)
    workspace.save(update_fields=['custom_stopwords'])

    return Response({
        'custom_stopwords': workspace.custom_stopwords,
        'added': sorted(new_words - remove_words),
        'removed': sorted(remove_words & (current | remove_words)),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def workspace_stopwords_import(request, workspace_id):
    """
    Importar stopwords desde un archivo TXT (una palabra por línea).

    Las palabras importadas se añaden a las custom_stopwords existentes.
    """
    try:
        workspace = Workspace.objects.get(id=workspace_id, created_by=request.user)
    except Workspace.DoesNotExist:
        return Response({'error': 'Workspace no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if workspace.status == Workspace.STATUS_PROCESSING:
        return Response(
            {'error': 'No se puede importar stopwords mientras la inferencia está en curso.'},
            status=status.HTTP_409_CONFLICT
        )

    uploaded = request.FILES.get('file')
    if not uploaded:
        return Response({'error': 'No se recibió ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)

    allowed_extensions = {'.txt', '.csv'}
    import os
    ext = os.path.splitext(uploaded.name)[1].lower()
    if ext not in allowed_extensions:
        return Response(
            {'error': f'Solo se aceptan archivos .txt o .csv. Recibido: {uploaded.name}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        content = uploaded.read().decode('utf-8', errors='replace')
    except Exception:
        return Response({'error': 'No se pudo leer el archivo.'}, status=status.HTTP_400_BAD_REQUEST)

    # Parsear: una palabra por línea (ignorar líneas vacías y comentarios #)
    imported = set()
    for line in content.splitlines():
        word = line.strip().lower()
        if word and not word.startswith('#'):
            imported.add(word)

    if not imported:
        return Response({'error': 'El archivo no contiene palabras válidas.'}, status=status.HTTP_400_BAD_REQUEST)

    current = set(workspace.custom_stopwords or [])
    current |= imported
    workspace.custom_stopwords = sorted(current)
    workspace.save(update_fields=['custom_stopwords'])

    return Response({
        'custom_stopwords': workspace.custom_stopwords,
        'imported_count': len(imported),
        'imported_words': sorted(imported),
    })

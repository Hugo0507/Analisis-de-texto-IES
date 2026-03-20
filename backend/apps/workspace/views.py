"""
Workspace Views

API para el Laboratorio: subida de PDFs e inferencia con modelos del corpus.
"""

import logging
import threading
from django.utils import timezone
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

    Lanza el procesamiento en background (threading).
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

    thread = threading.Thread(
        target=_run_inference_thread,
        args=(str(workspace.id),),
        daemon=True
    )
    thread.start()

    return Response(
        {'status': 'processing', 'workspace_id': str(workspace.id)},
        status=status.HTTP_202_ACCEPTED
    )


def _run_inference_thread(workspace_id: str):
    """Proceso de inferencia en background."""
    from .inference import (
        load_artifact, infer_bow, infer_tfidf, infer_topics, preprocess_for_inference
    )

    try:
        workspace = Workspace.objects.prefetch_related('documents').get(id=workspace_id)
        docs = workspace.documents.all()

        # PASO 1: Extraer texto de PDFs (10–40%)
        logger.info(f"[WS {workspace_id}] Extrayendo texto de {docs.count()} PDFs...")
        texts = []
        for i, doc in enumerate(docs):
            try:
                doc.status = WorkspaceDocument.STATUS_EXTRACTING
                doc.save()

                extracted = _extract_pdf_text(doc.file)
                preprocessed = preprocess_for_inference(extracted)

                doc.extracted_text = extracted
                doc.preprocessed_text = preprocessed
                doc.status = WorkspaceDocument.STATUS_READY
                doc.save()

                texts.append(preprocessed)
            except Exception as e:
                doc.status = WorkspaceDocument.STATUS_ERROR
                doc.error_message = str(e)
                doc.save()
                logger.warning(f"[WS {workspace_id}] Error en doc {doc.id}: {e}")

        if not texts:
            raise ValueError("No se pudo extraer texto de ningún documento.")

        workspace.progress_percentage = 40
        workspace.save()

        results = {}

        # PASO 2: Inferencia BoW (40–60%)
        if workspace.bow_id:
            logger.info(f"[WS {workspace_id}] Inferencia BoW con modelo {workspace.bow_id}...")
            try:
                results['bow'] = infer_bow(texts, workspace.bow_id)
            except Exception as e:
                logger.warning(f"[WS {workspace_id}] Error inferencia BoW: {e}")
                results['bow'] = {'error': str(e)}
            workspace.progress_percentage = 60
            workspace.save()

        # PASO 3: Inferencia TF-IDF (60–80%)
        if workspace.tfidf_id:
            logger.info(f"[WS {workspace_id}] Inferencia TF-IDF con modelo {workspace.tfidf_id}...")
            try:
                results['tfidf'] = infer_tfidf(texts, workspace.tfidf_id)
            except Exception as e:
                logger.warning(f"[WS {workspace_id}] Error inferencia TF-IDF: {e}")
                results['tfidf'] = {'error': str(e)}
            workspace.progress_percentage = 80
            workspace.save()

        # PASO 4: Inferencia Topic Model (80–100%)
        if workspace.topic_model_id:
            logger.info(f"[WS {workspace_id}] Inferencia tópicos con modelo {workspace.topic_model_id}...")
            try:
                results['topics'] = infer_topics(texts, workspace.topic_model_id)
            except Exception as e:
                logger.warning(f"[WS {workspace_id}] Error inferencia tópicos: {e}")
                results['topics'] = {'error': str(e)}

        results['document_count'] = len(texts)
        workspace.results = results
        workspace.status = Workspace.STATUS_COMPLETED
        workspace.progress_percentage = 100
        workspace.save()

        logger.info(f"[WS {workspace_id}] ✅ Inferencia completada")

    except Exception as e:
        logger.exception(f"[WS {workspace_id}] ❌ Error en inferencia: {e}")
        try:
            workspace = Workspace.objects.get(id=workspace_id)
            workspace.status = Workspace.STATUS_ERROR
            workspace.error_message = str(e)
            workspace.save()
        except Exception:
            pass


def _extract_pdf_text(file_field) -> str:
    """Extraer texto de un PDF usando PyMuPDF (fitz)."""
    try:
        import fitz  # PyMuPDF
        file_field.open('rb')
        try:
            pdf_bytes = file_field.read()
        finally:
            file_field.close()

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages_text = []
        for page in doc:
            pages_text.append(page.get_text())
        doc.close()

        return '\n'.join(pages_text).strip()
    except ImportError:
        # Fallback a PyPDF2 si fitz no está disponible
        try:
            import PyPDF2
            file_field.open('rb')
            try:
                reader = PyPDF2.PdfReader(file_field)
                pages_text = [page.extract_text() or '' for page in reader.pages]
            finally:
                file_field.close()
            return '\n'.join(pages_text).strip()
        except ImportError:
            raise ImportError(
                "Se requiere PyMuPDF (fitz) o PyPDF2 para extraer texto de PDFs. "
                "Instala con: pip install pymupdf"
            )

"""
Workspace Views

API para el Laboratorio: subida de PDFs e inferencia con modelos del corpus.

Arquitectura de procesos:
    - La inferencia corre en un Process separado (multiprocessing) para aislar
      el heap de C extensions (numpy/scipy/joblib) del proceso gunicorn.
    - Un Thread monitor vigila el proceso hijo; si crashea o excede el timeout
      de 5 minutos, marca el workspace como error automáticamente.
    - Validación de idioma con langdetect antes de gastar recursos en inferencia.
"""

import logging
import multiprocessing
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

    Lanza un Process separado para la inferencia y un Thread monitor
    que detecta crashes o timeouts.
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

    # Lanzar proceso de inferencia aislado (heap separado)
    process = multiprocessing.Process(
        target=_inference_process_entry,
        args=(str(workspace.id),),
        daemon=True,
    )
    process.start()

    # Monitor: vigila el proceso y actualiza status si crashea/timeout
    monitor = threading.Thread(
        target=_monitor_inference_process,
        args=(process, str(workspace.id)),
        daemon=True,
    )
    monitor.start()

    return Response(
        {'status': 'processing', 'workspace_id': str(workspace.id)},
        status=status.HTTP_202_ACCEPTED
    )


# ── Proceso de inferencia (se ejecuta en subprocess aislado) ──────────────

def _inference_process_entry(workspace_id: str):
    """
    Entry point del proceso hijo de inferencia (fork).

    Cierra las conexiones DB heredadas del padre para que Django
    cree nuevas en este proceso.
    """
    try:
        # Cerrar conexiones heredadas del padre
        from django.db import connections
        for conn in connections.all():
            conn.close()

        _run_inference(workspace_id)
    except Exception as e:
        # Intentar marcar el workspace como error desde el proceso hijo
        logger.exception(f"[WS {workspace_id}] Error fatal en proceso de inferencia: {e}")
        try:
            from django.db import connections
            for conn in connections.all():
                conn.close()
            workspace = Workspace.objects.get(id=workspace_id)
            workspace.status = Workspace.STATUS_ERROR
            workspace.error_message = str(e)[:500]
            workspace.save()
        except Exception:
            pass


def _run_inference(workspace_id: str):
    """Lógica principal de inferencia (corre en proceso aislado via fork)."""
    from .inference import (
        infer_bow, infer_tfidf, infer_topics,
        preprocess_for_inference, get_inference_stopwords,
    )

    workspace = Workspace.objects.prefetch_related('documents').get(id=workspace_id)
    docs = workspace.documents.all()

    # Obtener stopwords y idioma del corpus para preprocesar igual que el entrenamiento
    dataset_id = workspace.dataset_id
    stopwords = get_inference_stopwords(dataset_id=dataset_id)

    # Obtener idioma predominante del corpus
    from apps.data_preparation.models import DataPreparation
    prep = DataPreparation.objects.filter(
        dataset_id=dataset_id,
        status=DataPreparation.STATUS_COMPLETED,
    ).order_by('-created_at').first()
    corpus_language = prep.predominant_language if prep else 'en'

    logger.info(
        f"[WS {workspace_id}] Preprocesamiento con {len(stopwords)} stopwords, "
        f"idioma='{corpus_language}', lematización=True"
    )

    # ── PASO 1: Extraer texto y preprocesar PDFs (0–20%) ────────────────
    logger.info(f"[WS {workspace_id}] Extrayendo texto de {docs.count()} PDFs...")
    workspace.progress_percentage = 5
    workspace.save()

    texts = []
    for doc in docs:
        try:
            doc.status = WorkspaceDocument.STATUS_EXTRACTING
            doc.save()

            extracted = _extract_pdf_text(doc.file)
            preprocessed = preprocess_for_inference(
                extracted,
                stopwords=stopwords,
                lemmatize=True,
                language=corpus_language,
            )

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

    workspace.progress_percentage = 20
    workspace.save()

    # ── PASO 2: Validación de idioma (20–30%) ──────────────────────────
    logger.info(f"[WS {workspace_id}] Validando idioma de los documentos...")
    _validate_document_languages(workspace, docs)
    workspace.progress_percentage = 30
    workspace.save()

    # Verificar si quedan textos válidos después de la validación
    valid_docs = workspace.documents.filter(status=WorkspaceDocument.STATUS_READY)
    valid_texts = [d.preprocessed_text for d in valid_docs if d.preprocessed_text]

    if not valid_texts:
        raise ValueError(
            "Todos los documentos fueron rechazados por idioma incompatible. "
            "Sube documentos en el mismo idioma del corpus."
        )

    workspace.progress_percentage = 40
    workspace.save()

    # ── PASO 3: Inferencia BoW (40–60%) ────────────────────────────────
    results = {}

    if workspace.bow_id:
        logger.info(f"[WS {workspace_id}] Inferencia BoW con modelo {workspace.bow_id}...")
        try:
            results['bow'] = infer_bow(valid_texts, workspace.bow_id)
        except Exception as e:
            logger.warning(f"[WS {workspace_id}] Error inferencia BoW: {e}")
            results['bow'] = {'error': str(e)}
        workspace.progress_percentage = 60
        workspace.save()

    # ── PASO 4: Inferencia TF-IDF (60–80%) ─────────────────────────────
    if workspace.tfidf_id:
        logger.info(f"[WS {workspace_id}] Inferencia TF-IDF con modelo {workspace.tfidf_id}...")
        try:
            results['tfidf'] = infer_tfidf(valid_texts, workspace.tfidf_id)
        except Exception as e:
            logger.warning(f"[WS {workspace_id}] Error inferencia TF-IDF: {e}")
            results['tfidf'] = {'error': str(e)}
        workspace.progress_percentage = 80
        workspace.save()

    # ── PASO 5: Inferencia Topic Model (80–100%) ──────────────────────
    if workspace.topic_model_id:
        logger.info(f"[WS {workspace_id}] Inferencia tópicos con modelo {workspace.topic_model_id}...")
        try:
            results['topics'] = infer_topics(valid_texts, workspace.topic_model_id)
        except Exception as e:
            logger.warning(f"[WS {workspace_id}] Error inferencia tópicos: {e}")
            results['topics'] = {'error': str(e)}

    # ── Finalizar ──────────────────────────────────────────────────────
    results['document_count'] = len(valid_texts)
    workspace.results = results
    workspace.status = Workspace.STATUS_COMPLETED
    workspace.progress_percentage = 100
    workspace.save()

    logger.info(f"[WS {workspace_id}] Inferencia completada")


# ── Validación de idioma ──────────────────────────────────────────────────

def _validate_document_languages(workspace: Workspace, docs):
    """
    Detecta el idioma de cada documento y rechaza los que no coinciden
    con el idioma predominante del corpus (DataPreparation).

    Si no hay DataPreparation completada para el dataset, se omite la
    validación y solo se registra el idioma detectado.
    """
    from apps.data_preparation.language_detector import LanguageDetector
    from apps.data_preparation.models import DataPreparation

    # Obtener idioma predominante del corpus
    prep = DataPreparation.objects.filter(
        dataset=workspace.dataset,
        status=DataPreparation.STATUS_COMPLETED,
    ).order_by('-created_at').first()

    expected_lang = prep.predominant_language if prep else None

    if expected_lang:
        logger.info(
            f"[WS {workspace.id}] Idioma esperado del corpus: '{expected_lang}'"
        )
    else:
        logger.info(
            f"[WS {workspace.id}] Sin DataPreparation; se omite filtro de idioma"
        )

    rejected_count = 0

    for doc in docs:
        # Solo validar documentos que ya tienen texto extraído
        if doc.status != WorkspaceDocument.STATUS_READY or not doc.extracted_text:
            continue

        # Detectar idioma usando langdetect (misma lib que DataPreparation)
        detected_lang, confidence = LanguageDetector.detect_language(
            doc.extracted_text[:5000]  # Primeros 5000 chars son suficientes
        )

        doc.detected_language = detected_lang
        doc.language_confidence = confidence

        # Rechazar si el idioma no coincide con el corpus
        if expected_lang and detected_lang != expected_lang and confidence > 0.7:
            doc.status = WorkspaceDocument.STATUS_ERROR
            doc.error_message = (
                f"Idioma incompatible: se detectó '{detected_lang}' "
                f"(confianza: {confidence:.0%}), pero el corpus fue "
                f"procesado en '{expected_lang}'. "
                f"Sube un documento en el mismo idioma del corpus."
            )
            rejected_count += 1
            logger.info(
                f"[WS {workspace.id}] Doc {doc.id} rechazado: "
                f"'{detected_lang}' != '{expected_lang}'"
            )
        else:
            logger.info(
                f"[WS {workspace.id}] Doc {doc.id} idioma OK: "
                f"'{detected_lang}' (confianza: {confidence:.0%})"
            )

        doc.save()

    if rejected_count > 0:
        logger.warning(
            f"[WS {workspace.id}] {rejected_count} documento(s) rechazado(s) "
            f"por idioma incompatible"
        )


# ── Monitor del proceso de inferencia ─────────────────────────────────────

def _monitor_inference_process(process: multiprocessing.Process, workspace_id: str):
    """
    Vigila el proceso hijo de inferencia.

    Si el proceso termina con exitcode != 0 (crash por heap corruption,
    SIGKILL, OOM, etc.) o excede el timeout, marca el workspace como error.
    Esto garantiza que NUNCA quede un workspace atascado en 'processing'.
    """
    try:
        process.join(timeout=INFERENCE_TIMEOUT_SECONDS)

        if process.is_alive():
            # Timeout alcanzado — matar el proceso
            logger.error(
                f"[WS {workspace_id}] Timeout de {INFERENCE_TIMEOUT_SECONDS}s "
                f"alcanzado. Terminando proceso..."
            )
            process.terminate()
            process.join(timeout=10)
            if process.is_alive():
                process.kill()

            _mark_workspace_error(
                workspace_id,
                f"La inferencia excedió el tiempo máximo de "
                f"{INFERENCE_TIMEOUT_SECONDS // 60} minutos y fue cancelada."
            )
            return

        if process.exitcode != 0:
            # Proceso crasheó (heap corruption, SIGABRT, etc.)
            logger.error(
                f"[WS {workspace_id}] Proceso de inferencia terminó con "
                f"código {process.exitcode}"
            )
            _mark_workspace_error(
                workspace_id,
                f"El proceso de inferencia terminó inesperadamente "
                f"(código: {process.exitcode}). Intenta de nuevo."
            )
            return

        # exitcode == 0: el proceso completó normalmente.
        # El workspace ya fue marcado como completed/error dentro de _run_inference.
        logger.info(f"[WS {workspace_id}] Proceso de inferencia finalizó OK")

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


# ── Extracción de texto de PDFs ──────────────────────────────────────────

def _extract_pdf_text(file_field) -> str:
    """Extraer texto de un PDF usando PyMuPDF (fitz) o PyPDF2 como fallback."""
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

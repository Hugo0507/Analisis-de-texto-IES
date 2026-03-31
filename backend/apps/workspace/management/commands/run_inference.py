"""
Management command para ejecutar inferencia en un proceso completamente aislado.

Se invoca via subprocess.Popen desde views.py para evitar heap corruption
causada por fork() heredando estado de numpy/scipy/joblib del proceso padre.
"""

import logging
import sys

from django.core.management.base import BaseCommand

from apps.workspace.models import Workspace, WorkspaceDocument

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Ejecutar inferencia de workspace en proceso aislado'

    def add_arguments(self, parser):
        parser.add_argument('workspace_id', type=str)

    def handle(self, *args, **options):
        workspace_id = options['workspace_id']
        try:
            self._run(workspace_id)
        except Exception as e:
            logger.exception(f"[WS {workspace_id}] Error fatal en inferencia: {e}")
            try:
                workspace = Workspace.objects.get(id=workspace_id)
                if workspace.status == Workspace.STATUS_PROCESSING:
                    workspace.status = Workspace.STATUS_ERROR
                    workspace.error_message = str(e)[:500]
                    workspace.save()
            except Exception:
                pass
            sys.exit(1)

    def _run(self, workspace_id: str):
        from apps.workspace.inference import (
            infer_bow, infer_tfidf, infer_topics,
            preprocess_for_inference, get_inference_stopwords,
            preload_inference_artifacts,
        )

        workspace = Workspace.objects.prefetch_related('documents').get(id=workspace_id)
        docs = workspace.documents.all()
        total_docs = docs.count()

        # Obtener stopwords y idioma del corpus
        dataset_id = workspace.dataset_id
        stopwords = get_inference_stopwords(dataset_id=dataset_id)

        from apps.data_preparation.models import DataPreparation
        prep = DataPreparation.objects.filter(
            dataset_id=dataset_id,
            status=DataPreparation.STATUS_COMPLETED,
        ).order_by('-created_at').first()
        corpus_language = prep.predominant_language if prep else 'en'

        logger.info(
            f"[WS {workspace_id}] Preprocesamiento con {len(stopwords)} stopwords, "
            f"idioma='{corpus_language}', lematización=False (desactivada para rendimiento en producción)"
        )

        # ── PASO 0: Pre-cargar artefactos ML ────────────────────────────
        # Carga todos los artefactos sklearn/joblib antes del procesamiento.
        logger.info(f"[WS {workspace_id}] Pre-cargando artefactos ML...")
        workspace.progress_percentage = 3
        workspace.save()

        try:
            preloaded = preload_inference_artifacts(workspace)
        except Exception as e:
            logger.error(f"[WS {workspace_id}] Error pre-cargando artefactos: {e}")
            raise

        # ── PASO 1: Extraer texto y preprocesar PDFs (5–20%) ────────────
        logger.info(f"[WS {workspace_id}] Extrayendo texto de {total_docs} PDFs...")
        workspace.progress_percentage = 5
        workspace.save()

        texts = []
        preprocessing_stats = {
            'total_raw_tokens': 0,
            'total_clean_tokens': 0,
            'documents_processed': 0,
            'documents_failed': 0,
        }

        for i, doc in enumerate(docs):
            try:
                doc.status = WorkspaceDocument.STATUS_EXTRACTING
                doc.save()

                extracted = _extract_pdf_text(doc.file)
                raw_token_count = len(extracted.split())

                preprocessed = preprocess_for_inference(
                    extracted,
                    stopwords=stopwords,
                    lemmatize=False,
                    language=corpus_language,
                )
                clean_token_count = len(preprocessed.split()) if preprocessed else 0

                preprocessing_stats['total_raw_tokens'] += raw_token_count
                preprocessing_stats['total_clean_tokens'] += clean_token_count
                preprocessing_stats['documents_processed'] += 1

                doc.extracted_text = extracted
                doc.preprocessed_text = preprocessed
                doc.status = WorkspaceDocument.STATUS_READY
                doc.save()

                texts.append(preprocessed)
            except Exception as e:
                doc.status = WorkspaceDocument.STATUS_ERROR
                doc.error_message = str(e)
                doc.save()
                preprocessing_stats['documents_failed'] += 1
                logger.warning(f"[WS {workspace_id}] Error en doc {doc.id}: {e}")

            # Actualizar progreso por documento: de 5% a 20%
            progress = 5 + int((i + 1) / total_docs * 15) if total_docs > 0 else 20
            workspace.progress_percentage = progress
            workspace.save()

        if not texts:
            raise ValueError("No se pudo extraer texto de ningún documento.")

        # ── PASO 2: Validación de idioma (20–30%) ──────────────────────
        logger.info(f"[WS {workspace_id}] Validando idioma de los documentos...")
        _validate_document_languages(workspace, docs)
        workspace.progress_percentage = 30
        workspace.save()

        # Verificar si quedan textos válidos
        valid_docs = workspace.documents.filter(status=WorkspaceDocument.STATUS_READY)
        valid_texts = [d.preprocessed_text for d in valid_docs if d.preprocessed_text]

        if not valid_texts:
            raise ValueError(
                "Todos los documentos fueron rechazados por idioma incompatible. "
                "Sube documentos en el mismo idioma del corpus."
            )

        workspace.progress_percentage = 40
        workspace.save()

        # ── PASO 3: Inferencia BoW (40–60%) ──────────────────────────
        results = {}

        if workspace.bow_id:
            if 'bow_vectorizer' not in preloaded:
                logger.warning(f"[WS {workspace_id}] BoW #{workspace.bow_id} omitido (sin artefacto).")
                results['bow'] = {
                    'error': 'Artefacto no disponible. Re-ejecuta el análisis de Bag of Words para regenerarlo.'
                }
            else:
                logger.info(f"[WS {workspace_id}] Inferencia BoW con modelo {workspace.bow_id}...")
                try:
                    results['bow'] = infer_bow(
                        valid_texts,
                        workspace.bow_id,
                        preloaded_vectorizer=preloaded['bow_vectorizer'],
                    )
                except Exception as e:
                    logger.warning(f"[WS {workspace_id}] Error inferencia BoW: {e}")
                    results['bow'] = {'error': str(e)}
            workspace.progress_percentage = 60
            workspace.save()

        # ── PASO 4: Inferencia TF-IDF (60–80%) ─────────────────────
        if workspace.tfidf_id:
            if 'tfidf_vectorizer' not in preloaded:
                logger.warning(f"[WS {workspace_id}] TF-IDF #{workspace.tfidf_id} omitido (sin artefacto).")
                results['tfidf'] = {
                    'error': 'Artefacto no disponible. Re-ejecuta el análisis TF-IDF para regenerarlo.'
                }
            else:
                logger.info(f"[WS {workspace_id}] Inferencia TF-IDF con modelo {workspace.tfidf_id}...")
                try:
                    results['tfidf'] = infer_tfidf(
                        valid_texts,
                        workspace.tfidf_id,
                        preloaded_vectorizer=preloaded['tfidf_vectorizer'],
                    )
                except Exception as e:
                    logger.warning(f"[WS {workspace_id}] Error inferencia TF-IDF: {e}")
                    results['tfidf'] = {'error': str(e)}
            workspace.progress_percentage = 80
            workspace.save()

        # ── PASO 5: Inferencia Topic Model (80–100%) ───────────────
        if workspace.topic_model_id:
            if 'topic_vectorizer' not in preloaded or 'topic_model' not in preloaded:
                logger.warning(f"[WS {workspace_id}] Topic Model #{workspace.topic_model_id} omitido (sin artefacto).")
                results['topics'] = {
                    'error': 'Artefacto no disponible. Re-ejecuta el análisis de Topic Modeling para regenerarlo.'
                }
            else:
                logger.info(f"[WS {workspace_id}] Inferencia temas con modelo {workspace.topic_model_id}...")
                try:
                    results['topics'] = infer_topics(
                        valid_texts,
                        workspace.topic_model_id,
                        preloaded_vectorizer=preloaded['topic_vectorizer'],
                        preloaded_model=preloaded['topic_model'],
                    )
                except Exception as e:
                    logger.warning(f"[WS {workspace_id}] Error inferencia temas: {e}")
                    results['topics'] = {'error': str(e)}

        # ── Finalizar ──────────────────────────────────────────────
        results['document_count'] = len(valid_texts)
        results['preprocessing_stats'] = preprocessing_stats

        # Documentos rechazados por idioma
        rejected_docs = workspace.documents.filter(
            status=WorkspaceDocument.STATUS_ERROR,
            detected_language__isnull=False,
        )
        results['rejected_documents'] = [
            {
                'filename': d.original_filename,
                'detected_language': d.detected_language,
                'expected_language': corpus_language,
                'confidence': round(d.language_confidence, 2),
                'reason': d.error_message or '',
            }
            for d in rejected_docs
        ]

        workspace.results = results
        workspace.status = Workspace.STATUS_COMPLETED
        workspace.progress_percentage = 100
        workspace.save()

        logger.info(f"[WS {workspace_id}] Inferencia completada")


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


def _validate_document_languages(workspace, docs):
    """Detecta idioma de cada documento y rechaza los incompatibles."""
    from apps.data_preparation.language_detector import LanguageDetector
    from apps.data_preparation.models import DataPreparation

    prep = DataPreparation.objects.filter(
        dataset=workspace.dataset,
        status=DataPreparation.STATUS_COMPLETED,
    ).order_by('-created_at').first()

    expected_lang = prep.predominant_language if prep else None

    if expected_lang:
        logger.info(f"[WS {workspace.id}] Idioma esperado del corpus: '{expected_lang}'")
    else:
        logger.info(f"[WS {workspace.id}] Sin DataPreparation; se omite filtro de idioma")

    for doc in docs:
        if doc.status != WorkspaceDocument.STATUS_READY or not doc.extracted_text:
            continue

        detected_lang, confidence = LanguageDetector.detect_language(
            doc.extracted_text[:5000]
        )

        doc.detected_language = detected_lang
        doc.language_confidence = confidence

        if expected_lang and detected_lang != expected_lang and confidence > 0.7:
            doc.status = WorkspaceDocument.STATUS_ERROR
            doc.error_message = (
                f"Idioma incompatible: se detectó '{detected_lang}' "
                f"(confianza: {confidence:.0%}), pero el corpus fue "
                f"procesado en '{expected_lang}'."
            )
            logger.info(f"[WS {workspace.id}] Doc {doc.id} rechazado: '{detected_lang}' != '{expected_lang}'")
        else:
            logger.info(f"[WS {workspace.id}] Doc {doc.id} idioma OK: '{detected_lang}' (confianza: {confidence:.0%})")

        doc.save()

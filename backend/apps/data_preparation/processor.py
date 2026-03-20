"""
Data Preparation Processor

Procesa datasets aplicando limpieza, transformacion y validacion de datos NLP.
Ejecuta en background usando threading (no Celery).

Architecture: Split into focused modules:
- pdf_extractor.py: PDF text extraction with cascade strategy
- drive_downloader.py: Google Drive file downloads
- language_detector.py: Language detection
- processor.py (this file): Main orchestration
"""

import logging
import os
import re
import threading
import traceback
from typing import Dict, List

from django.utils import timezone

from .models import DataPreparation
from .stopwords import get_combined_stopwords
from .pdf_extractor import PDFExtractor
from .drive_downloader import DriveFileDownloader
from .language_detector import LanguageDetector
from apps.datasets.models import DatasetFile

logger = logging.getLogger(__name__)


class DataPreparationProcessor:
    """
    Procesador principal de preparacion de datos.

    Ejecuta en background usando threading.
    Actualiza progreso en tiempo real en la base de datos.
    """

    def __init__(self, preparation_id: int):
        self.preparation_id = preparation_id
        self.preparation = None

    def update_progress(self, stage: str, percentage: int, **kwargs):
        """Actualizar progreso en la base de datos."""
        try:
            self.preparation.current_stage = stage
            self.preparation.progress_percentage = percentage

            for key, value in kwargs.items():
                setattr(self.preparation, key, value)

            self.preparation.save()
            logger.info(f"Preparation {self.preparation_id}: {stage} - {percentage}%")
        except Exception as e:
            logger.error(f"Error updating progress: {e}")

    def mark_error(self, error_message: str):
        """Marcar preparacion como error."""
        try:
            self.preparation.status = DataPreparation.STATUS_ERROR
            self.preparation.error_message = error_message
            self.preparation.save()
            logger.error(f"Preparation {self.preparation_id} failed: {error_message}")
        except Exception as e:
            logger.error(f"Error marking error state: {e}")

    def process(self):
        """Proceso principal de preparacion de datos."""
        try:
            self.preparation = DataPreparation.objects.get(id=self.preparation_id)
            self.preparation.status = DataPreparation.STATUS_PROCESSING
            self.preparation.processing_started_at = timezone.now()
            self.preparation.save()

            pdf_files = DatasetFile.objects.filter(
                dataset=self.preparation.dataset,
                mime_type='application/pdf'
            )

            if not pdf_files.exists():
                raise Exception("No se encontraron archivos PDF en el dataset")

            total_files = pdf_files.count()
            self.preparation.total_files_analyzed = total_files
            self.preparation.save()

            files_with_text = self._extract_texts(pdf_files, total_files)
            if not files_with_text:
                raise Exception("No se pudo extraer texto de ningun PDF")

            predominant_lang = self._detect_languages(files_with_text)
            processed_files = self._filter_by_language(files_with_text, predominant_lang)
            self._apply_stopwords(processed_files, predominant_lang)
            self._apply_transformations(processed_files, predominant_lang)
            processed_files = self._validate_and_deduplicate(processed_files)
            self._save_preprocessed_texts(processed_files)

            self.update_progress(
                DataPreparation.STAGE_COMPLETED,
                100,
                status=DataPreparation.STATUS_COMPLETED,
                processing_completed_at=timezone.now()
            )

            logger.info(f"Preparation {self.preparation_id} completed successfully")

        except Exception as e:
            error_message = f"Error en procesamiento: {str(e)}"
            logger.exception(error_message)
            self.mark_error(error_message)

    def _extract_texts(self, pdf_files, total_files: int) -> List[Dict]:
        """ETAPA 1: Extraer texto de PDFs (0-30%)."""
        self.update_progress(DataPreparation.STAGE_EXTRACTING, 0)
        files_with_text = []

        for idx, pdf_file in enumerate(pdf_files):
            progress = int((idx / total_files) * 30)
            self.update_progress(DataPreparation.STAGE_EXTRACTING, progress)

            pdf_path = pdf_file.file_path
            temp_file_path = None

            try:
                if pdf_path.startswith('drive://'):
                    drive_file_id = pdf_path.replace('drive://', '')
                    temp_file_path = DriveFileDownloader.download_from_drive(
                        drive_file_id, self.preparation.created_by
                    )
                    if not temp_file_path:
                        logger.warning(f"Could not download {pdf_file.original_filename} from Drive")
                        continue
                    pdf_path = temp_file_path

                text, method = PDFExtractor.extract_text(pdf_path)

                if text:
                    files_with_text.append({
                        'file_id': pdf_file.id,
                        'file_name': pdf_file.original_filename,
                        'text': text,
                        'extraction_method': method
                    })
                else:
                    logger.warning(f"Could not extract text from {pdf_file.original_filename}")
            finally:
                if temp_file_path:
                    DriveFileDownloader.cleanup_temp_file(temp_file_path)

        return files_with_text

    def _detect_languages(self, files_with_text: List[Dict]) -> str:
        """ETAPA 2: Detectar idiomas (30-50%). Returns predominant language."""
        self.update_progress(DataPreparation.STAGE_DETECTING_LANGUAGE, 30)
        language_counts = {}

        for idx, file_data in enumerate(files_with_text):
            progress = 30 + int((idx / len(files_with_text)) * 20)
            self.update_progress(DataPreparation.STAGE_DETECTING_LANGUAGE, progress)

            lang, confidence = LanguageDetector.detect_language(file_data['text'])
            file_data['language'] = lang
            file_data['language_confidence'] = confidence
            language_counts[lang] = language_counts.get(lang, 0) + 1

        predominant_lang = max(language_counts, key=language_counts.get)
        predominant_count = language_counts[predominant_lang]
        predominant_percentage = (predominant_count / len(files_with_text)) * 100

        self.preparation.detected_languages = language_counts
        self.preparation.predominant_language = predominant_lang
        self.preparation.predominant_language_percentage = predominant_percentage
        self.preparation.save()

        return predominant_lang

    def _filter_by_language(self, files_with_text: List[Dict], predominant_lang: str) -> List[Dict]:
        """ETAPA 3: Filtrar por idioma predominante (50-60%)."""
        self.update_progress(DataPreparation.STAGE_CLEANING, 50)

        if self.preparation.filter_by_predominant_language:
            processed_files = [f for f in files_with_text if f['language'] == predominant_lang]
            omitted_files = [f for f in files_with_text if f['language'] != predominant_lang]
        else:
            processed_files = files_with_text
            omitted_files = []

        self.preparation.files_processed = len(processed_files)
        self.preparation.files_omitted = len(omitted_files)
        self.preparation.processed_file_ids = [f['file_id'] for f in processed_files]
        self.preparation.omitted_file_ids = [f['file_id'] for f in omitted_files]
        self.preparation.save()

        return processed_files

    def _apply_stopwords(self, processed_files: List[Dict], predominant_lang: str):
        """ETAPA 4: Aplicar stopwords (60-70%)."""
        self.update_progress(DataPreparation.STAGE_CLEANING, 60)

        stopwords = get_combined_stopwords(
            custom_stopwords=self.preparation.custom_stopwords,
            language=predominant_lang
        )

        for idx, file_data in enumerate(processed_files):
            progress = 60 + int((idx / len(processed_files)) * 10)
            self.update_progress(DataPreparation.STAGE_CLEANING, progress)

            text = file_data['text']
            words = text.lower().split()
            cleaned_words = [w for w in words if w not in stopwords]
            file_data['cleaned_text'] = ' '.join(cleaned_words)

    def _apply_transformations(self, processed_files: List[Dict], predominant_lang: str):
        """ETAPA 5: Transformacion - tokenizacion, lematizacion, limpieza (70-90%)."""
        self.update_progress(DataPreparation.STAGE_TRANSFORMING, 70)

        for idx, file_data in enumerate(processed_files):
            progress = 70 + int((idx / len(processed_files)) * 20)
            self.update_progress(DataPreparation.STAGE_TRANSFORMING, progress)

            text = file_data.get('cleaned_text', file_data['text'])

            if self.preparation.enable_tokenization:
                file_data['tokens'] = text.split()

            if self.preparation.enable_lemmatization:
                self._lemmatize(file_data, text, predominant_lang)

            if self.preparation.enable_special_chars_removal:
                # Eliminar todo excepto letras y espacios.
                # El patrón anterior [^a-zA-Z0-9\s] conservaba dígitos,
                # permitiendo que años y números entren al vocabulario BoW/TF-IDF.
                file_data['cleaned_text'] = re.sub(r'[^a-zA-Z\s]', '', text)

    def _lemmatize(self, file_data: Dict, text: str, lang: str):
        """Apply spaCy lemmatization to a single file."""
        try:
            import spacy
            model_name = 'es_core_news_sm' if lang == 'es' else 'en_core_web_sm'
            nlp = spacy.load(model_name)
            doc = nlp(text)
            file_data['lemmas'] = [token.lemma_ for token in doc]
        except Exception as e:
            logger.warning(f"Lemmatization failed: {e}")

    def _validate_and_deduplicate(self, processed_files: List[Dict]) -> List[Dict]:
        """ETAPA 6: Validacion e integridad (90-95%)."""
        self.update_progress(DataPreparation.STAGE_VALIDATING, 90)

        if self.preparation.enable_integrity_check:
            processed_files = [
                f for f in processed_files
                if f.get('cleaned_text') or f.get('text')
            ]

        duplicates_count = 0
        if self.preparation.enable_duplicate_removal:
            seen_texts = set()
            unique_files = []

            for file_data in processed_files:
                text = file_data.get('cleaned_text', file_data['text'])
                text_hash = hash(text)

                if text_hash not in seen_texts:
                    seen_texts.add(text_hash)
                    unique_files.append(file_data)
                else:
                    duplicates_count += 1

            processed_files = unique_files

        self.preparation.duplicates_removed = duplicates_count
        self.preparation.files_processed = len(processed_files)
        self.preparation.save()

        return processed_files

    def _save_preprocessed_texts(self, processed_files: List[Dict]):
        """ETAPA 7: Guardar textos preprocesados en BD (95-100%)."""
        self.update_progress(DataPreparation.STAGE_VALIDATING, 95)

        for idx, file_data in enumerate(processed_files):
            progress = 95 + int((idx / len(processed_files)) * 5)
            self.update_progress(DataPreparation.STAGE_VALIDATING, progress)

            try:
                preprocessed_text = file_data.get('cleaned_text', file_data.get('text', ''))
                DatasetFile.objects.filter(id=file_data['file_id']).update(
                    preprocessed_text=preprocessed_text,
                    txt_content=file_data.get('text', ''),
                    language_code=file_data.get('language'),
                    language_confidence=file_data.get('language_confidence', 0.0)
                )
            except Exception as e:
                logger.error(f"Error saving preprocessed text for file {file_data['file_id']}: {e}")

        logger.info(f"Preprocessed texts saved to DB for {len(processed_files)} files")


def process_data_preparation(preparation_id: int):
    """Funcion wrapper para ejecutar processor en thread separado."""
    processor = DataPreparationProcessor(preparation_id)
    processor.process()


def start_processing_thread(preparation_id: int):
    """Iniciar procesamiento en thread de background."""
    thread = threading.Thread(
        target=process_data_preparation,
        args=(preparation_id,),
        daemon=True
    )
    thread.start()
    logger.info(f"Thread started for preparation {preparation_id}")


def update_data_preparation(preparation_id: int):
    """
    Actualizar preparacion existente con cambios en el dataset.

    Detecta archivos agregados y eliminados:
    - Archivos eliminados: Remueve de processed_file_ids y omitted_file_ids
    - Archivos agregados: Procesa solo los archivos nuevos e incrementa contadores
    """
    try:
        preparation = DataPreparation.objects.get(id=preparation_id)
        preparation.status = DataPreparation.STATUS_PROCESSING
        preparation.current_stage = 'updating'
        preparation.progress_percentage = 0
        preparation.save()

        current_file_ids = set(DatasetFile.objects.filter(
            dataset=preparation.dataset,
            mime_type='application/pdf'
        ).values_list('id', flat=True))

        processed_ids = set(preparation.processed_file_ids)
        omitted_ids = set(preparation.omitted_file_ids)
        all_original_ids = processed_ids | omitted_ids

        added_ids = current_file_ids - all_original_ids
        deleted_ids = all_original_ids - current_file_ids

        logger.info(f"Preparation {preparation_id}: {len(added_ids)} added, {len(deleted_ids)} deleted")

        _remove_deleted_files(preparation, deleted_ids)
        _process_new_files(preparation, added_ids)

        preparation.status = DataPreparation.STATUS_COMPLETED
        preparation.current_stage = DataPreparation.STAGE_COMPLETED
        preparation.progress_percentage = 100
        preparation.processing_completed_at = timezone.now()
        preparation.save()

        logger.info(f"Update of preparation {preparation_id} completed successfully")

    except Exception as e:
        error_message = f"Error updating preparation: {str(e)}"
        logger.exception(error_message)
        try:
            preparation = DataPreparation.objects.get(id=preparation_id)
            preparation.status = DataPreparation.STATUS_ERROR
            preparation.error_message = error_message
            preparation.save()
        except Exception as save_error:
            logger.error(f"Error saving error state: {save_error}")


def _remove_deleted_files(preparation, deleted_ids: set):
    """Remove deleted files from preparation tracking."""
    if not deleted_ids:
        return

    preparation.progress_percentage = 10
    preparation.save()

    preparation.processed_file_ids = [
        fid for fid in preparation.processed_file_ids if fid not in deleted_ids
    ]
    preparation.omitted_file_ids = [
        fid for fid in preparation.omitted_file_ids if fid not in deleted_ids
    ]
    preparation.files_processed = len(preparation.processed_file_ids)
    preparation.files_omitted = len(preparation.omitted_file_ids)
    preparation.save()

    logger.info(f"Removed {len(deleted_ids)} files from preparation")


def _process_new_files(preparation, added_ids: set):
    """Process newly added files for an existing preparation."""
    if not added_ids:
        return

    new_files = DatasetFile.objects.filter(id__in=added_ids)
    total_new = len(added_ids)

    logger.info(f"Updating: {total_new} new files to process")

    # Extract texts (10-40%)
    files_with_text = _extract_new_file_texts(preparation, new_files, total_new)
    logger.info(f"Extraction complete: {len(files_with_text)} files with text of {total_new} total")

    # Detect languages (40-60%)
    preparation.progress_percentage = 40
    preparation.save()

    for idx, file_data in enumerate(files_with_text):
        progress = 40 + int((idx / len(files_with_text)) * 20)
        preparation.progress_percentage = progress
        preparation.save()

        lang, confidence = LanguageDetector.detect_language(file_data['text'])
        file_data['language'] = lang
        file_data['language_confidence'] = confidence

    # Filter by predominant language (60-70%)
    preparation.progress_percentage = 60
    preparation.save()

    predominant_lang = preparation.predominant_language

    if preparation.filter_by_predominant_language:
        new_processed = [f for f in files_with_text if f['language'] == predominant_lang]
        new_omitted = [f for f in files_with_text if f['language'] != predominant_lang]
    else:
        new_processed = files_with_text
        new_omitted = []

    # Apply stopwords (70-90%)
    stopwords = get_combined_stopwords(
        custom_stopwords=preparation.custom_stopwords,
        language=predominant_lang
    )

    for idx, file_data in enumerate(new_processed):
        progress = 70 + int((idx / len(new_processed)) * 20) if new_processed else 70
        preparation.progress_percentage = progress
        preparation.save()

        text = file_data['text']
        words = text.lower().split()
        cleaned_words = [w for w in words if w not in stopwords]
        file_data['cleaned_text'] = ' '.join(cleaned_words)

    # Save preprocessed texts to DB (90-95%)
    preparation.progress_percentage = 90
    for idx, file_data in enumerate(new_processed):
        progress = 90 + int((idx / len(new_processed)) * 5) if new_processed else 90
        preparation.progress_percentage = progress
        preparation.save()

        try:
            preprocessed_text = file_data.get('cleaned_text', file_data.get('text', ''))
            DatasetFile.objects.filter(id=file_data['file_id']).update(
                preprocessed_text=preprocessed_text,
                txt_content=file_data.get('text', ''),
                language_code=file_data.get('language'),
                language_confidence=file_data.get('language_confidence', 0.0)
            )
        except Exception as e:
            logger.error(f"Error saving preprocessed text for file {file_data['file_id']}: {e}")

    logger.info(f"Preprocessed texts saved to DB for {len(new_processed)} new files")

    # Update counters (95%)
    preparation.progress_percentage = 95
    preparation.processed_file_ids.extend([f['file_id'] for f in new_processed])
    preparation.omitted_file_ids.extend([f['file_id'] for f in new_omitted])
    preparation.files_processed = len(preparation.processed_file_ids)
    preparation.files_omitted = len(preparation.omitted_file_ids)
    preparation.total_files_analyzed = preparation.files_processed + preparation.files_omitted
    preparation.save()

    logger.info(f"Processed {len(new_processed)} new files, omitted {len(new_omitted)}")


def _extract_new_file_texts(preparation, new_files, total_new: int) -> List[Dict]:
    """Extract text from newly added PDF files."""
    files_with_text = []

    for idx, pdf_file in enumerate(new_files):
        progress = 10 + int((idx / total_new) * 30)
        preparation.progress_percentage = progress
        preparation.save()

        pdf_path = pdf_file.file_path
        temp_file_path = None

        try:
            logger.info(f"[UPDATE] Processing file {idx+1}/{total_new}: {pdf_file.original_filename}")

            if pdf_path.startswith('drive://'):
                drive_file_id = pdf_path.replace('drive://', '')
                temp_file_path = DriveFileDownloader.download_from_drive(
                    drive_file_id, preparation.created_by
                )
                if not temp_file_path:
                    logger.warning(f"[UPDATE] Could not download {pdf_file.original_filename} from Drive")
                    continue
                pdf_path = temp_file_path
            else:
                if not os.path.exists(pdf_path):
                    logger.error(f"[UPDATE] File does not exist: {pdf_path}")
                    continue

            text, method = PDFExtractor.extract_text(pdf_path)

            if text:
                files_with_text.append({
                    'file_id': pdf_file.id,
                    'file_name': pdf_file.original_filename,
                    'text': text,
                    'extraction_method': method
                })
            else:
                logger.warning(f"[UPDATE] Could not extract text from {pdf_file.original_filename}")

        except Exception as e:
            logger.error(f"[UPDATE] Error processing {pdf_file.original_filename}: {str(e)}")
            logger.error(f"[UPDATE] Traceback: {traceback.format_exc()}")

        finally:
            if temp_file_path:
                DriveFileDownloader.cleanup_temp_file(temp_file_path)

    return files_with_text


def start_update_thread(preparation_id: int):
    """Iniciar actualizacion en thread de background."""
    thread = threading.Thread(
        target=update_data_preparation,
        args=(preparation_id,),
        daemon=True
    )
    thread.start()
    logger.info(f"Update thread started for preparation {preparation_id}")

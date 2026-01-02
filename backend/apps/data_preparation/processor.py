"""
Data Preparation Processor

Procesa datasets aplicando limpieza, transformación y validación de datos NLP.
Ejecuta en background usando threading (no Celery).
"""

import logging
import threading
import tempfile
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from django.utils import timezone
from .models import DataPreparation
from .stopwords import get_combined_stopwords
from apps.datasets.models import DatasetFile

logger = logging.getLogger(__name__)


class PDFExtractor:
    """
    Extractor de texto desde PDFs con sistema de cascada.

    Intenta extraer con pdfminer.six (más simple y rápido).
    Si falla, intenta con PyPDF2 (intermedio).
    Si falla, intenta con pdfplumber (más complejo pero robusto).
    """

    @staticmethod
    def extract_with_pdfminer(pdf_path: str) -> Optional[str]:
        """
        Extraer texto usando pdfminer.six (Nivel 1 - Simple).
        """
        try:
            from pdfminer.high_level import extract_text
            text = extract_text(pdf_path)
            if text and text.strip():
                return text.strip()
            return None
        except Exception as e:
            logger.debug(f"pdfminer falló para {pdf_path}: {e}")
            return None

    @staticmethod
    def extract_with_pypdf2(pdf_path: str) -> Optional[str]:
        """
        Extraer texto usando PyPDF2 (Nivel 2 - Intermedio).
        """
        try:
            import PyPDF2
            text_parts = []

            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)

            full_text = '\n'.join(text_parts).strip()
            if full_text:
                return full_text
            return None
        except Exception as e:
            logger.debug(f"PyPDF2 falló para {pdf_path}: {e}")
            return None

    @staticmethod
    def extract_with_pdfplumber(pdf_path: str) -> Optional[str]:
        """
        Extraer texto usando pdfplumber (Nivel 3 - Robusto).
        """
        try:
            import pdfplumber
            text_parts = []

            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)

            full_text = '\n'.join(text_parts).strip()
            if full_text:
                return full_text
            return None
        except Exception as e:
            logger.debug(f"pdfplumber falló para {pdf_path}: {e}")
            return None

    @classmethod
    def extract_text(cls, pdf_path: str) -> Tuple[Optional[str], str]:
        """
        Extraer texto con sistema de cascada.

        Returns:
            tuple: (text, method_used)
        """
        # Nivel 1: pdfminer.six
        text = cls.extract_with_pdfminer(pdf_path)
        if text:
            return text, 'pdfminer'

        # Nivel 2: PyPDF2
        text = cls.extract_with_pypdf2(pdf_path)
        if text:
            return text, 'pypdf2'

        # Nivel 3: pdfplumber
        text = cls.extract_with_pdfplumber(pdf_path)
        if text:
            return text, 'pdfplumber'

        return None, 'failed'


class DriveFileDownloader:
    """
    Descarga archivos temporales desde Google Drive.
    """

    @staticmethod
    def download_from_drive(file_id: str, user) -> Optional[str]:
        """
        Descarga un archivo de Drive a un archivo temporal.

        Args:
            file_id: ID del archivo en Google Drive (sin el prefijo drive://)
            user: Usuario propietario del archivo

        Returns:
            str: Ruta al archivo temporal descargado, o None si falla
        """
        try:
            from apps.infrastructure.storage.drive_gateway import DriveGateway

            gateway = DriveGateway(user=user)
            gateway.authenticate()

            # Crear archivo temporal
            temp_fd, temp_path = tempfile.mkstemp(suffix='.pdf')
            os.close(temp_fd)  # Cerrar el descriptor

            # Descargar desde Drive
            request = gateway.service.files().get_media(fileId=file_id)
            with open(temp_path, 'wb') as f:
                import io
                from googleapiclient.http import MediaIoBaseDownload
                downloader = MediaIoBaseDownload(f, request)
                done = False
                while not done:
                    status, done = downloader.next_chunk()

            logger.debug(f"Archivo descargado desde Drive: {file_id} -> {temp_path}")
            return temp_path

        except Exception as e:
            logger.error(f"Error descargando archivo de Drive {file_id}: {e}")
            return None

    @staticmethod
    def cleanup_temp_file(temp_path: str):
        """
        Elimina un archivo temporal.
        """
        try:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
                logger.debug(f"Archivo temporal eliminado: {temp_path}")
        except Exception as e:
            logger.warning(f"Error eliminando archivo temporal {temp_path}: {e}")


class LanguageDetector:
    """
    Detector de idioma usando langdetect.
    """

    @staticmethod
    def detect_language(text: str) -> Tuple[Optional[str], float]:
        """
        Detectar idioma de un texto.

        Args:
            text: Texto a analizar

        Returns:
            tuple: (language_code, confidence)
        """
        try:
            from langdetect import detect, detect_langs

            # Detectar idioma
            lang = detect(text)

            # Obtener confianza
            langs = detect_langs(text)
            confidence = 0.0
            for lang_info in langs:
                if lang_info.lang == lang:
                    confidence = lang_info.prob
                    break

            return lang, confidence
        except Exception as e:
            logger.warning(f"Error detectando idioma: {e}")
            return 'unknown', 0.0


class DataPreparationProcessor:
    """
    Procesador principal de preparación de datos.

    Ejecuta en background usando threading.
    Actualiza progreso en tiempo real en la base de datos.
    """

    def __init__(self, preparation_id: int):
        self.preparation_id = preparation_id
        self.preparation = None

    def update_progress(self, stage: str, percentage: int, **kwargs):
        """
        Actualizar progreso en la base de datos.
        """
        try:
            self.preparation.current_stage = stage
            self.preparation.progress_percentage = percentage

            for key, value in kwargs.items():
                setattr(self.preparation, key, value)

            self.preparation.save()
            logger.info(f"Preparation {self.preparation_id}: {stage} - {percentage}%")
        except Exception as e:
            logger.error(f"Error actualizando progreso: {e}")

    def mark_error(self, error_message: str):
        """
        Marcar preparación como error.
        """
        try:
            self.preparation.status = DataPreparation.STATUS_ERROR
            self.preparation.error_message = error_message
            self.preparation.save()
            logger.error(f"Preparation {self.preparation_id} falló: {error_message}")
        except Exception as e:
            logger.error(f"Error marcando error: {e}")

    def process(self):
        """
        Proceso principal de preparación de datos.

        Pasos:
        1. Extraer texto de PDFs
        2. Detectar idioma de cada archivo
        3. Calcular idioma predominante
        4. Filtrar por idioma predominante (opcional)
        5. Aplicar stopwords
        6. Tokenización (opcional)
        7. Lematización (opcional)
        8. Eliminar caracteres especiales (opcional)
        9. Verificar integridad (opcional)
        10. Eliminar duplicados (opcional)
        11. Guardar resultados
        """
        try:
            # Cargar preparación
            self.preparation = DataPreparation.objects.get(id=self.preparation_id)

            # Iniciar procesamiento
            self.preparation.status = DataPreparation.STATUS_PROCESSING
            self.preparation.processing_started_at = timezone.now()
            self.preparation.save()

            # Obtener archivos PDF del dataset
            pdf_files = DatasetFile.objects.filter(
                dataset=self.preparation.dataset,
                mime_type='application/pdf'
            )

            if not pdf_files.exists():
                raise Exception("No se encontraron archivos PDF en el dataset")

            total_files = pdf_files.count()
            self.preparation.total_files_analyzed = total_files
            self.preparation.save()

            # ETAPA 1: Extraer texto de PDFs (0-30%)
            self.update_progress(DataPreparation.STAGE_EXTRACTING, 0)
            files_with_text = []

            for idx, pdf_file in enumerate(pdf_files):
                progress = int((idx / total_files) * 30)
                self.update_progress(DataPreparation.STAGE_EXTRACTING, progress)

                pdf_path = pdf_file.file_path
                temp_file_path = None

                try:
                    # Si el archivo está en Drive, descargarlo temporalmente
                    if pdf_path.startswith('drive://'):
                        drive_file_id = pdf_path.replace('drive://', '')
                        temp_file_path = DriveFileDownloader.download_from_drive(
                            drive_file_id,
                            self.preparation.created_by
                        )
                        if not temp_file_path:
                            logger.warning(f"No se pudo descargar {pdf_file.original_filename} desde Drive")
                            continue
                        pdf_path = temp_file_path

                    # Extraer texto
                    text, method = PDFExtractor.extract_text(pdf_path)

                    if text:
                        files_with_text.append({
                            'file_id': pdf_file.id,
                            'file_name': pdf_file.original_filename,
                            'text': text,
                            'extraction_method': method
                        })
                    else:
                        logger.warning(f"No se pudo extraer texto de {pdf_file.original_filename}")

                finally:
                    # Limpiar archivo temporal si existe
                    if temp_file_path:
                        DriveFileDownloader.cleanup_temp_file(temp_file_path)

            if not files_with_text:
                raise Exception("No se pudo extraer texto de ningún PDF")

            # ETAPA 2: Detectar idiomas (30-50%)
            self.update_progress(DataPreparation.STAGE_DETECTING_LANGUAGE, 30)
            language_counts = {}

            for idx, file_data in enumerate(files_with_text):
                progress = 30 + int((idx / len(files_with_text)) * 20)
                self.update_progress(DataPreparation.STAGE_DETECTING_LANGUAGE, progress)

                lang, confidence = LanguageDetector.detect_language(file_data['text'])
                file_data['language'] = lang
                file_data['language_confidence'] = confidence

                language_counts[lang] = language_counts.get(lang, 0) + 1

            # Calcular idioma predominante
            predominant_lang = max(language_counts, key=language_counts.get)
            predominant_count = language_counts[predominant_lang]
            predominant_percentage = (predominant_count / len(files_with_text)) * 100

            # Guardar idiomas detectados
            self.preparation.detected_languages = language_counts
            self.preparation.predominant_language = predominant_lang
            self.preparation.predominant_language_percentage = predominant_percentage
            self.preparation.save()

            # ETAPA 3: Filtrar por idioma predominante (50-60%)
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

            # ETAPA 4: Aplicar stopwords (60-70%)
            self.update_progress(DataPreparation.STAGE_CLEANING, 60)

            # Obtener stopwords combinadas
            stopwords = get_combined_stopwords(
                custom_stopwords=self.preparation.custom_stopwords,
                language=predominant_lang
            )

            # Limpiar textos (remover stopwords)
            for idx, file_data in enumerate(processed_files):
                progress = 60 + int((idx / len(processed_files)) * 10)
                self.update_progress(DataPreparation.STAGE_CLEANING, progress)

                text = file_data['text']
                words = text.lower().split()
                cleaned_words = [w for w in words if w not in stopwords]
                file_data['cleaned_text'] = ' '.join(cleaned_words)

            # ETAPA 5: Transformación (70-90%)
            self.update_progress(DataPreparation.STAGE_TRANSFORMING, 70)

            for idx, file_data in enumerate(processed_files):
                progress = 70 + int((idx / len(processed_files)) * 20)
                self.update_progress(DataPreparation.STAGE_TRANSFORMING, progress)

                text = file_data.get('cleaned_text', file_data['text'])

                # Tokenización
                if self.preparation.enable_tokenization:
                    tokens = text.split()
                    file_data['tokens'] = tokens

                # Lematización con spaCy (opcional)
                if self.preparation.enable_lemmatization:
                    try:
                        import spacy
                        # Cargar modelo según idioma
                        if predominant_lang == 'en':
                            nlp = spacy.load('en_core_web_sm')
                        elif predominant_lang == 'es':
                            nlp = spacy.load('es_core_news_sm')
                        else:
                            nlp = spacy.load('en_core_web_sm')  # Fallback

                        doc = nlp(text)
                        lemmas = [token.lemma_ for token in doc]
                        file_data['lemmas'] = lemmas
                    except Exception as e:
                        logger.warning(f"Lematización falló: {e}")

                # Eliminar caracteres especiales
                if self.preparation.enable_special_chars_removal:
                    import re
                    cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', text)
                    file_data['cleaned_text'] = cleaned

            # ETAPA 6: Validación (90-100%)
            self.update_progress(DataPreparation.STAGE_VALIDATING, 90)

            # Verificar integridad
            if self.preparation.enable_integrity_check:
                valid_files = []
                for file_data in processed_files:
                    # Verificar que tenga texto
                    if file_data.get('cleaned_text') or file_data.get('text'):
                        valid_files.append(file_data)
                processed_files = valid_files

            # Eliminar duplicados
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

            # COMPLETADO (100%)
            self.update_progress(
                DataPreparation.STAGE_COMPLETED,
                100,
                status=DataPreparation.STATUS_COMPLETED,
                processing_completed_at=timezone.now()
            )

            logger.info(f"Preparation {self.preparation_id} completada exitosamente")

        except Exception as e:
            error_message = f"Error en procesamiento: {str(e)}"
            logger.exception(error_message)
            self.mark_error(error_message)


def process_data_preparation(preparation_id: int):
    """
    Función wrapper para ejecutar processor en thread separado.

    Args:
        preparation_id: ID de la preparación a procesar
    """
    processor = DataPreparationProcessor(preparation_id)
    processor.process()


def start_processing_thread(preparation_id: int):
    """
    Iniciar procesamiento en thread de background.

    Args:
        preparation_id: ID de la preparación a procesar
    """
    thread = threading.Thread(
        target=process_data_preparation,
        args=(preparation_id,),
        daemon=True
    )
    thread.start()
    logger.info(f"Thread iniciado para preparation {preparation_id}")

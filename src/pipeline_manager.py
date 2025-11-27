"""
Pipeline Manager - Orquestador Central del Análisis
Ejecuta automáticamente todas las etapas del análisis de transformación digital
"""

import time
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import traceback

from src.pipeline_config import PipelineConfig
from src.utils.progress_tracker import ProgressTracker, StageStatus
from src.utils.pipeline_cache import PipelineCache
from src.utils.logger import get_logger

logger = get_logger(__name__)


class PipelineManager:
    """
    Orquestador central que ejecuta el pipeline completo de análisis
    CON SISTEMA DE CACHÉ INTELIGENTE: Solo procesa lo que no existe en Drive
    """

    def __init__(self, drive_connector, config: Optional[PipelineConfig] = None):
        """
        Inicializa el pipeline manager

        Args:
            drive_connector: Conector de Google Drive
            config: Configuración del pipeline (usa default si es None)
        """
        self.drive_connector = drive_connector
        self.config = config or PipelineConfig()
        self.progress_tracker = ProgressTracker("Análisis de Transformación Digital")

        # Sistema de caché (se inicializará al ejecutar)
        self.cache: Optional[PipelineCache] = None

        # Componentes del pipeline (se inicializarán on-demand)
        self.language_detector = None
        self.document_converter = None
        self.text_preprocessor = None
        self.procesador_texto = None
        self.analizador_factores = None

        # Resultados de cada etapa
        self.results = {}

        # Estado del pipeline
        self.is_running = False
        self.is_complete = False
        self.has_errors = False

        logger.info("PipelineManager inicializado con sistema de caché inteligente")

        # Inicializar etapas
        self._initialize_stages()

    def _initialize_stages(self):
        """Inicializa las etapas del pipeline según configuración"""
        stages_config = self.config.PIPELINE['stages']

        stage_definitions = [
            ('language_detection', 'Detección de Idiomas', 'Detecta idioma de cada documento y selecciona corpus principal'),
            ('txt_conversion', 'Conversión PDF→TXT', 'Convierte documentos PDF a texto plano'),
            ('preprocessing', 'Preprocesamiento', 'Limpia, tokeniza y normaliza el texto'),
            ('bow', 'Bolsa de Palabras (BoW)', 'Crea matriz de frecuencias de términos'),
            ('tfidf', 'TF-IDF', 'Aplica ponderación TF-IDF a la matriz BoW'),
            ('ngrams', 'Análisis de N-gramas', 'Extrae y analiza unigramas, bigramas y trigramas'),
            ('ner', 'Named Entity Recognition', 'Identifica entidades nombradas (países, organizaciones, etc.)'),
            ('topic_modeling', 'Modelado de Temas', 'Descubre temas latentes (LDA, NMF, LSA, pLSA)'),
            ('bertopic', 'BERTopic', 'Topic modeling con embeddings de BERT'),
            ('dimensionality_reduction', 'Reducción de Dimensionalidad', 'Aplica PCA, t-SNE y UMAP'),
            ('classification', 'Clasificación de Textos', 'Entrena modelos de clasificación supervisada'),
            ('factor_analysis', 'Análisis de Factores', 'Identifica factores clave de transformación digital'),
            ('consolidation', 'Consolidación de Factores', 'Integra resultados de todos los análisis'),
            ('visualizations', 'Visualizaciones', 'Genera gráficos y nubes de palabras')
        ]

        for stage_key, stage_name, stage_desc in stage_definitions:
            if stages_config.get(stage_key, True):
                self.progress_tracker.add_stage(stage_name, stage_desc)
            else:
                logger.info(f"Etapa deshabilitada: {stage_name}")

    def execute_pipeline(
        self,
        files: List[Dict[str, Any]],
        parent_folder_id: str,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Ejecuta el pipeline completo de análisis

        Args:
            files: Lista de archivos PDF del Drive
            parent_folder_id: ID de la carpeta padre para persistencia
            progress_callback: Función callback para updates de progreso

        Returns:
            Diccionario con resultados completos del pipeline
        """
        logger.info("=" * 70)
        logger.info("INICIANDO PIPELINE DE ANÁLISIS AUTOMÁTICO")
        logger.info("=" * 70)

        self.is_running = True
        self.is_complete = False
        self.has_errors = False
        self.results = {}

        # Inicializar sistema de caché
        logger.info("Inicializando sistema de caché con carpeta: " + parent_folder_id)
        self.cache = PipelineCache(self.drive_connector, parent_folder_id)

        # Registrar callback si se proporciona
        if progress_callback:
            self.progress_tracker.register_callback(progress_callback)

        # Iniciar pipeline
        self.progress_tracker.start_pipeline()

        try:
            stage_idx = 0

            # ============================================================
            # ETAPA 1: DETECCIÓN DE IDIOMAS
            # ============================================================
            if self.config.PIPELINE['stages'].get('language_detection', True):
                self._execute_stage(
                    stage_idx,
                    self._stage_language_detection,
                    files=files,
                    parent_folder_id=parent_folder_id
                )
                stage_idx += 1

            # ============================================================
            # ETAPA 2: CONVERSIÓN PDF → TXT
            # ============================================================
            if self.config.PIPELINE['stages'].get('txt_conversion', True):
                # Usar archivos filtrados por idioma si existen
                files_to_convert = self.results.get('english_pdf_files', files)

                self._execute_stage(
                    stage_idx,
                    self._stage_txt_conversion,
                    files=files_to_convert,
                    parent_folder_id=parent_folder_id
                )
                stage_idx += 1

            # ============================================================
            # ETAPA 3: PREPROCESAMIENTO
            # ============================================================
            if self.config.PIPELINE['stages'].get('preprocessing', True):
                if 'txt_files' not in self.results:
                    logger.warning("No hay archivos TXT, saltando preprocesamiento")
                    self.progress_tracker.skip_stage(stage_idx, "No hay archivos TXT disponibles")
                else:
                    self._execute_stage(
                        stage_idx,
                        self._stage_preprocessing,
                        txt_files=self.results['txt_files'],
                        parent_folder_id=parent_folder_id
                    )
                stage_idx += 1

            # ============================================================
            # ETAPA 4: BOLSA DE PALABRAS
            # ============================================================
            if self.config.PIPELINE['stages'].get('bow', True):
                if 'preprocessed_texts' not in self.results:
                    self.progress_tracker.skip_stage(stage_idx, "No hay textos preprocesados")
                else:
                    self._execute_stage(
                        stage_idx,
                        self._stage_bow,
                        preprocessed_texts=self.results['preprocessed_texts'],
                        parent_folder_id=parent_folder_id
                    )
                stage_idx += 1

            # ============================================================
            # ETAPA 5: TF-IDF
            # ============================================================
            if self.config.PIPELINE['stages'].get('tfidf', True):
                if 'bow_matrix' not in self.results:
                    self.progress_tracker.skip_stage(stage_idx, "No hay matriz BoW")
                else:
                    self._execute_stage(
                        stage_idx,
                        self._stage_tfidf,
                        preprocessed_texts=self.results['preprocessed_texts'],
                        parent_folder_id=parent_folder_id
                    )
                stage_idx += 1

            # ============================================================
            # ETAPA 6: ANÁLISIS DE N-GRAMAS
            # ============================================================
            if self.config.PIPELINE['stages'].get('ngrams', True):
                if 'preprocessed_texts' not in self.results:
                    self.progress_tracker.skip_stage(stage_idx, "No hay textos preprocesados")
                else:
                    self._execute_stage(
                        stage_idx,
                        self._stage_ngrams,
                        preprocessed_texts=self.results['preprocessed_texts'],
                        parent_folder_id=parent_folder_id
                    )
                stage_idx += 1

            # ============================================================
            # ETAPA 7: NAMED ENTITY RECOGNITION (NER)
            # ============================================================
            if self.config.PIPELINE['stages'].get('ner', True):
                if 'txt_files' not in self.results:
                    self.progress_tracker.skip_stage(stage_idx, "No hay archivos TXT")
                else:
                    self._execute_stage(
                        stage_idx,
                        self._stage_ner,
                        txt_files=self.results['txt_files'],
                        parent_folder_id=parent_folder_id
                    )
                stage_idx += 1

            # ============================================================
            # ETAPA 8: TOPIC MODELING
            # ============================================================
            if self.config.PIPELINE['stages'].get('topic_modeling', True):
                if 'preprocessed_texts' not in self.results:
                    self.progress_tracker.skip_stage(stage_idx, "No hay textos preprocesados")
                else:
                    self._execute_stage(
                        stage_idx,
                        self._stage_topic_modeling,
                        preprocessed_texts=self.results['preprocessed_texts'],
                        parent_folder_id=parent_folder_id
                    )
                stage_idx += 1

            # ============================================================
            # ETAPA 9: BERTOPIC
            # ============================================================
            if self.config.PIPELINE['stages'].get('bertopic', True):
                if 'preprocessed_texts' not in self.results:
                    self.progress_tracker.skip_stage(stage_idx, "No hay textos preprocesados")
                else:
                    self._execute_stage(
                        stage_idx,
                        self._stage_bertopic,
                        preprocessed_texts=self.results['preprocessed_texts'],
                        parent_folder_id=parent_folder_id
                    )
                stage_idx += 1

            # ============================================================
            # ETAPA 10: REDUCCIÓN DE DIMENSIONALIDAD
            # ============================================================
            if self.config.PIPELINE['stages'].get('dimensionality_reduction', True):
                if 'tfidf_matrix' not in self.results:
                    self.progress_tracker.skip_stage(stage_idx, "No hay matriz TF-IDF")
                else:
                    self._execute_stage(
                        stage_idx,
                        self._stage_dimensionality_reduction,
                        tfidf_matrix=self.results['tfidf_matrix'],
                        feature_names=self.results.get('tfidf_feature_names', []),
                        parent_folder_id=parent_folder_id
                    )
                stage_idx += 1

            # ============================================================
            # ETAPA 11: CLASIFICACIÓN (OPCIONAL - requiere etiquetas)
            # ============================================================
            if self.config.PIPELINE['stages'].get('classification', False):
                logger.info("Clasificación requiere etiquetado manual - saltando")
                self.progress_tracker.skip_stage(stage_idx, "Requiere etiquetado manual")
                stage_idx += 1

            # ============================================================
            # ETAPA 12: ANÁLISIS DE FACTORES
            # ============================================================
            if self.config.PIPELINE['stages'].get('factor_analysis', True):
                if 'preprocessed_texts' not in self.results:
                    self.progress_tracker.skip_stage(stage_idx, "No hay textos preprocesados")
                else:
                    self._execute_stage(
                        stage_idx,
                        self._stage_factor_analysis,
                        preprocessed_texts=self.results['preprocessed_texts'],
                        parent_folder_id=parent_folder_id
                    )
                stage_idx += 1

            # ============================================================
            # ETAPA 13: CONSOLIDACIÓN DE FACTORES
            # ============================================================
            if self.config.PIPELINE['stages'].get('consolidation', True):
                self._execute_stage(
                    stage_idx,
                    self._stage_consolidation,
                    all_results=self.results,
                    parent_folder_id=parent_folder_id
                )
                stage_idx += 1

            # ============================================================
            # ETAPA 14: VISUALIZACIONES
            # ============================================================
            if self.config.PIPELINE['stages'].get('visualizations', True):
                self._execute_stage(
                    stage_idx,
                    self._stage_visualizations,
                    all_results=self.results,
                    parent_folder_id=parent_folder_id
                )
                stage_idx += 1

            # Completar pipeline
            self.progress_tracker.complete_pipeline()
            self.is_complete = True

            logger.info("=" * 70)
            logger.info("PIPELINE COMPLETADO EXITOSAMENTE")
            logger.info(f"Duración total: {self.progress_tracker.get_total_duration():.2f}s")
            logger.info("=" * 70)

        except Exception as e:
            self.has_errors = True
            logger.error(f"Error crítico en el pipeline: {e}", exc_info=True)
            self.results['pipeline_error'] = str(e)
            self.results['pipeline_traceback'] = traceback.format_exc()

        finally:
            self.is_running = False

        return self.results

    def _execute_stage(self, stage_idx: int, stage_function: Callable, **kwargs):
        """
        Ejecuta una etapa del pipeline con manejo de errores

        Args:
            stage_idx: Índice de la etapa
            stage_function: Función a ejecutar
            **kwargs: Argumentos para la función
        """
        stage = self.progress_tracker.stages[stage_idx]
        timeout = self.config.PIPELINE['stage_timeout'].get(
            stage.name.lower().replace(' ', '_').replace('→', '_').replace('(', '').replace(')', ''),
            None
        )

        logger.info(f"\n{'='*60}")
        logger.info(f"ETAPA {stage_idx + 1}: {stage.name}")
        logger.info(f"{'='*60}")

        self.progress_tracker.start_stage(stage_idx)

        try:
            # Ejecutar etapa
            result = stage_function(stage_idx=stage_idx, **kwargs)

            # Completar etapa
            self.progress_tracker.complete_stage(stage_idx, result)

        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            logger.error(f"Error en etapa '{stage.name}': {error_msg}", exc_info=True)

            self.progress_tracker.fail_stage(stage_idx, error_msg)
            self.has_errors = True

            # Guardar error en resultados
            self.results[f'{stage.name}_error'] = error_msg
            self.results[f'{stage.name}_traceback'] = traceback.format_exc()

            # Continuar o detener según configuración
            if not self.config.PIPELINE.get('continue_on_error', True):
                raise

    # ============================================================
    # IMPLEMENTACIÓN DE ETAPAS
    # ============================================================
    # Las siguientes funciones implementan cada etapa del pipeline
    # Se ejecutan automáticamente en secuencia

    def _stage_language_detection(self, stage_idx: int, files: List[Dict], parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 1: Detección de idiomas"""
        logger.info(f"=== INICIO ETAPA: Detección de Idiomas ===")
        logger.info(f"Archivos recibidos: {len(files)}")

        # ===== VERIFICAR CACHÉ PRIMERO =====
        cached = self.cache.check_stage_cache("02_Language_Detection", "language_detection_results.json")

        if cached:
            # El caché puede tener dos formatos: nuevo (con 'results') o antiguo (directo)
            results_data = cached.get('results', cached)

            # Verificar si tiene los datos necesarios
            if results_data.get('language_results'):
                logger.info("✓ Detección de idiomas encontrada en caché, usando resultados existentes")
                self.progress_tracker.update_progress(stage_idx, 0.5, "Cargando desde caché...")

                # Cargar resultados del caché
                self.results['language_detection_results'] = results_data.get('language_results', [])
                self.results['majority_language'] = results_data.get('majority_language', 'en')
                english_pdfs = results_data.get('english_pdfs', [])

                # Si english_pdfs está vacío pero tenemos language_results, reconstruirlo
                if not english_pdfs and self.results['language_detection_results']:
                    logger.warning("⚠️ Cache antiguo sin english_pdfs, reconstruyendo desde language_results...")
                    majority_lang = self.results['majority_language']

                    # DEBUG: Ver estructura del primer resultado
                    if self.results['language_detection_results']:
                        sample = self.results['language_detection_results'][0]
                        logger.debug(f"Muestra de resultado cacheado: {sample}")
                        logger.debug(f"Idioma mayoritario a buscar: '{majority_lang}'")

                    # Reconstruir lista de archivos en idioma mayoritario
                    english_pdfs = [
                        {'file_name': r['file_name'], 'file_id': r['file_id']}
                        for r in self.results['language_detection_results']
                        if r.get('language_code') == majority_lang
                    ]

                    logger.info(f"✓ Reconstruidos {len(english_pdfs)} archivos en idioma {majority_lang}")

                    # Si aún está vacío, intentar con todos los archivos no-error
                    if not english_pdfs:
                        logger.warning(f"⚠️ No se encontraron archivos con language_code='{majority_lang}'")
                        logger.warning("Intentando recuperar archivos con idiomas válidos (no 'error' ni 'unknown')...")

                        # Contar idiomas en el cache
                        from collections import Counter
                        lang_codes = [r.get('language_code') for r in self.results['language_detection_results']]
                        lang_counts_cache = Counter(lang_codes)
                        logger.info(f"Idiomas en caché: {dict(lang_counts_cache)}")

                        # Tomar archivos válidos
                        valid_pdfs = [
                            {'file_name': r['file_name'], 'file_id': r['file_id'], 'language_code': r.get('language_code')}
                            for r in self.results['language_detection_results']
                            if r.get('language_code') not in ['error', 'unknown']
                        ]

                        if valid_pdfs:
                            # Recalcular idioma mayoritario desde los archivos válidos
                            valid_langs = [f['language_code'] for f in valid_pdfs]
                            valid_lang_counts = Counter(valid_langs)
                            new_majority = valid_lang_counts.most_common(1)[0][0]
                            logger.info(f"✓ Nuevo idioma mayoritario calculado: {new_majority} ({valid_lang_counts[new_majority]} archivos)")

                            # Filtrar por nuevo idioma mayoritario
                            english_pdfs = [
                                {'file_name': f['file_name'], 'file_id': f['file_id']}
                                for f in valid_pdfs
                                if f['language_code'] == new_majority
                            ]

                            # Actualizar el idioma mayoritario en resultados
                            self.results['majority_language'] = new_majority
                            majority_lang = new_majority

                            logger.info(f"✓ Recuperados {len(english_pdfs)} archivos en idioma {new_majority}")
                        else:
                            logger.error("❌ No hay archivos válidos en el caché. Todos tienen 'error' o 'unknown'.")
                            logger.error("Se requiere re-ejecutar la detección de idiomas desde cero.")

                self.results['english_pdf_files'] = english_pdfs

                self.progress_tracker.update_progress(stage_idx, 1.0, "Cargado desde caché")

                logger.info(f"✓ Caché cargado: {len(self.results['language_detection_results'])} resultados")
                logger.info(f"✓ Archivos filtrados en idioma {self.results['majority_language']}: {len(english_pdfs)}")
                return {
                    'total_files': results_data.get('total_files', 0),
                    'majority_language': self.results['majority_language'],
                    'filtered_files': len(english_pdfs),
                    'from_cache': True
                }

        # ===== NO HAY CACHÉ, PROCESAR =====
        from src.language_detector import LanguageDetector

        logger.info(f"Cache no encontrado, detectando idiomas en {len(files)} archivos...")

        if not self.language_detector:
            logger.info("Inicializando LanguageDetector...")
            self.language_detector = LanguageDetector()

        # Filtrar solo PDFs
        pdf_files = [f for f in files if f.get('name', '').lower().endswith('.pdf')]
        logger.info(f"PDFs filtrados: {len(pdf_files)}")
        self.progress_tracker.update_progress(stage_idx, 0.1, f"Analizando {len(pdf_files)} PDFs...")

        # Detección REAL de idiomas (no mock)
        language_results = []
        logger.info("Iniciando detección de idiomas...")

        # VALIDACIÓN TEMPRANA: Contar idiomas válidos en los primeros 10 archivos
        early_validation_count = min(10, len(pdf_files))
        early_valid_count = 0

        for i, pdf in enumerate(pdf_files):
            try:
                logger.info(f"Procesando [{i+1}/{len(pdf_files)}]: {pdf['name']}")

                # Leer contenido del PDF
                file_content = self.drive_connector.read_file_content(pdf.get('id'))

                if not file_content:
                    logger.warning(f"No se pudo leer el archivo {pdf['name']}")
                    language_results.append({
                        'file_name': pdf['name'],
                        'file_id': pdf.get('id'),
                        'language_code': 'error',
                        'language_name': 'Error de lectura',
                        'confidence': 0.0,
                        'error': 'No se pudo leer el archivo desde Drive'
                    })
                    continue

                # Convertir BytesIO a bytes si es necesario
                if hasattr(file_content, 'read'):
                    file_content.seek(0)
                    file_bytes = file_content
                else:
                    file_bytes = file_content

                # Detectar idioma usando el LanguageDetector
                detection_result = self.language_detector.detect_from_bytes(
                    file_bytes,
                    pdf['name'],
                    '.pdf'
                )

                language_results.append({
                    'file_name': pdf['name'],
                    'file_id': pdf.get('id'),
                    'language_code': detection_result.get('language_code', 'unknown'),
                    'language_name': detection_result.get('language_name', 'Unknown'),
                    'confidence': detection_result.get('confidence', 0.0),
                    'error': detection_result.get('error', None),
                    'text_length': detection_result.get('text_length', 0)
                })

                # Contar idiomas válidos en primeros 10 archivos
                if i < early_validation_count:
                    lang_code = detection_result.get('language_code', 'unknown')
                    if lang_code not in ['error', 'unknown']:
                        early_valid_count += 1
                        logger.info(f"  ✓ Idioma válido detectado: {lang_code}")
                    else:
                        logger.warning(f"  ✗ NO se detectó idioma válido (código: {lang_code})")
                        if detection_result.get('error'):
                            logger.error(f"     Razón: {detection_result.get('error')}")
                        if detection_result.get('text_length', 0) == 0:
                            logger.error(f"     Problema: No se extrajo texto del PDF")

            except Exception as e:
                logger.error(f"Error detectando idioma de {pdf['name']}: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                language_results.append({
                    'file_name': pdf['name'],
                    'file_id': pdf.get('id'),
                    'language_code': 'error',
                    'language_name': 'Error de excepción',
                    'confidence': 0.0,
                    'error': str(e)
                })

            # VALIDACIÓN TEMPRANA: Detener si los primeros 10 archivos NO detectan NINGÚN idioma
            if i + 1 == early_validation_count:
                logger.info(f"\n{'='*80}")
                logger.info(f"VALIDACIÓN TEMPRANA (primeros {early_validation_count} archivos)")
                logger.info(f"{'='*80}")
                logger.info(f"Archivos procesados: {early_validation_count}")
                logger.info(f"Idiomas válidos detectados: {early_valid_count}")
                logger.info(f"Idiomas fallidos/desconocidos: {early_validation_count - early_valid_count}")

                if early_valid_count == 0:
                    logger.error(f"\n{'!'*80}")
                    logger.error(f"❌ DETECCIÓN DE IDIOMAS FALLIDA")
                    logger.error(f"{'!'*80}")
                    logger.error(f"NO se detectó ningún idioma válido en los primeros {early_validation_count} archivos.")
                    logger.error(f"\nPOSIBLES CAUSAS:")
                    logger.error(f"1. Los PDFs no contienen texto extraíble (son imágenes escaneadas)")
                    logger.error(f"2. Los PDFs están protegidos o encriptados")
                    logger.error(f"3. Error en la biblioteca pdfminer.six (verifica instalación)")
                    logger.error(f"4. Los archivos están corruptos")
                    logger.error(f"\nRECOMENDACIÓN:")
                    logger.error(f"- Verifica que los PDFs contengan texto extraíble")
                    logger.error(f"- Instala/actualiza pdfminer.six: pip install --upgrade pdfminer.six")
                    logger.error(f"- Revisa los logs detallados arriba para cada archivo")
                    logger.error(f"{'!'*80}\n")

                    # Actualizar progreso indicando error
                    self.progress_tracker.update_progress(stage_idx, 0.0, "❌ No se detectaron idiomas - Pipeline detenido")

                    # Guardar resultados parciales para análisis
                    self.results['language_detection_results'] = language_results
                    self.results['majority_language'] = None
                    self.results['english_pdf_files'] = []

                    raise ValueError(
                        f"Pipeline detenido: No se detectó ningún idioma válido en los primeros {early_validation_count} archivos. "
                        f"Revisa los logs para más detalles."
                    )
                else:
                    logger.info(f"✓ Validación exitosa: {early_valid_count}/{early_validation_count} archivos con idioma detectado")
                    logger.info(f"Continuando con el resto de archivos...\n")

            # Actualizar progreso
            self.progress_tracker.update_progress(stage_idx, 0.1 + (0.7 * (i + 1) / len(pdf_files)))

        logger.info(f"Detección completada: {len(language_results)} archivos procesados")

        # Seleccionar idioma mayoritario
        from collections import Counter
        valid_languages = [r['language_code'] for r in language_results if r['language_code'] not in ['error', 'unknown']]

        if not valid_languages:
            logger.warning("No se detectaron idiomas válidos, usando 'en' por defecto")
            majority_lang = 'en'
        else:
            lang_counts = Counter(valid_languages)
            majority_lang = lang_counts.most_common(1)[0][0]
            logger.info(f"Idioma mayoritario detectado: {majority_lang} ({lang_counts[majority_lang]} archivos)")

        # Filtrar archivos en idioma mayoritario
        english_pdfs = [
            {'file_name': r['file_name'], 'file_id': r['file_id']}
            for r in language_results
            if r['language_code'] == majority_lang
        ]

        logger.info(f"Archivos filtrados en idioma {majority_lang}: {len(english_pdfs)}")

        # Guardar resultados
        self.results['language_detection_results'] = language_results
        self.results['majority_language'] = majority_lang
        self.results['english_pdf_files'] = english_pdfs
        self.results['selected_language'] = majority_lang
        self.results['selected_language_count'] = len(english_pdfs)

        # ===== GUARDAR EN CACHÉ =====
        logger.info("Guardando resultados en caché...")
        self.progress_tracker.update_progress(stage_idx, 0.9, "Guardando en caché...")

        cache_data = {
            'language_results': language_results,
            'majority_language': majority_lang,
            'english_pdfs': english_pdfs,
            'total_files': len(pdf_files),
            'selected_language': majority_lang,
            'selected_language_count': len(english_pdfs)
        }

        self.cache.save_stage_results("02_Language_Detection", cache_data, "language_detection_results.json")

        logger.info("=== FIN ETAPA: Detección de Idiomas ===")
        return {
            'total_files': len(pdf_files),
            'majority_language': majority_lang,
            'filtered_files': len(english_pdfs),
            'from_cache': False
        }

    def _stage_txt_conversion(self, stage_idx: int, files: List[Dict], parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 2: Conversión PDF → TXT

        Flujo:
        1. Buscar archivos .txt en Google Drive
        2. Si existen, cargarlos desde Drive
        3. Si no existen, convertir PDFs y guardar en Drive
        """

        # ===== PASO 1: BUSCAR ARCHIVOS TXT EN GOOGLE DRIVE =====
        logger.info("=== Etapa Conversión TXT ===")
        logger.info("Paso 1: Buscando archivos TXT en Google Drive...")

        folder_id = self.cache.get_or_create_stage_folder("03_TXT_Converted")
        files_in_folder = self.drive_connector.list_files_in_folder(folder_id, recursive=False)

        # Filtrar solo archivos .txt (excluir JSONs)
        txt_files_in_drive = [f for f in files_in_folder if f['name'].endswith('.txt')]

        logger.info(f"Encontrados {len(txt_files_in_drive)} archivos TXT en Drive")
        logger.info(f"Archivos PDF a procesar: {len(files)}")

        # ===== VERIFICAR SI ESTÁN TODOS LOS ARCHIVOS =====
        # Crear set de nombres de archivos TXT esperados
        expected_txt_names = {f['file_name'].replace('.pdf', '.txt') for f in files}
        actual_txt_names = {f['name'] for f in txt_files_in_drive}

        # Verificar si tenemos TODOS los archivos TXT necesarios
        all_files_cached = expected_txt_names == actual_txt_names

        if all_files_cached and len(txt_files_in_drive) == len(files):
            logger.info(f"✓ TODOS los archivos TXT están en caché ({len(txt_files_in_drive)}/{len(files)})")
        else:
            missing_files = expected_txt_names - actual_txt_names
            extra_files = actual_txt_names - expected_txt_names
            logger.warning(f"⚠️ Caché incompleto: {len(txt_files_in_drive)} en Drive vs {len(files)} esperados")
            if missing_files:
                logger.warning(f"   Archivos faltantes: {len(missing_files)} (ej: {list(missing_files)[:3]})")
            if extra_files:
                logger.warning(f"   Archivos extra: {len(extra_files)} (serán ignorados)")

        # ===== PASO 2: SI HAY ARCHIVOS EN DRIVE Y ESTÁN COMPLETOS, CARGARLOS =====
        if all_files_cached and len(txt_files_in_drive) > 0:
            logger.info("✓ Caché completo encontrado, cargando archivos TXT desde Drive...")
            self.progress_tracker.update_progress(stage_idx, 0.1, f"Cargando {len(txt_files_in_drive)} archivos TXT desde caché...")

            txt_files_full = []

            for i, txt_file_info in enumerate(txt_files_in_drive):
                try:
                    txt_content_bytes = self.drive_connector.read_file_content(txt_file_info['id'])

                    if hasattr(txt_content_bytes, 'read'):
                        txt_content = txt_content_bytes.read().decode('utf-8')
                    elif txt_content_bytes:
                        txt_content = txt_content_bytes.decode('utf-8')
                    else:
                        txt_content = ""

                    txt_files_full.append({
                        'name': txt_file_info['name'],
                        'id': txt_file_info['id'],
                        'text': txt_content,
                        'length': len(txt_content)
                    })

                    self.progress_tracker.update_progress(stage_idx, 0.1 + (0.8 * (i + 1) / len(txt_files_in_drive)))

                except Exception as e:
                    logger.error(f"Error leyendo {txt_file_info['name']}: {e}", exc_info=True)

            # Guardar en results
            self.results['txt_files'] = txt_files_full
            self.results['conversion_stats'] = {
                'total': len(files),
                'successful': len(txt_files_full),
                'failed': len(files) - len(txt_files_full)
            }

            self.progress_tracker.update_progress(stage_idx, 1.0, "Archivos TXT cargados desde Drive")
            logger.info(f"✓ {len(txt_files_full)} archivos TXT cargados desde Drive")

            return {
                'total': len(files),
                'successful': len(txt_files_full),
                'failed': len(files) - len(txt_files_full),
                'from_cache': True
            }

        # ===== NO HAY CACHÉ, PROCESAR =====
        from src.document_converter import DocumentConverter

        logger.info(f"Cache no encontrado, convirtiendo {len(files)} archivos PDF a TXT...")

        if not self.document_converter:
            self.document_converter = DocumentConverter()

        conversion_results = []
        txt_files = []

        for i, pdf_file in enumerate(files):
            try:
                file_bytes = self.drive_connector.read_file_content(pdf_file['file_id'])

                if file_bytes:
                    conversion = self.document_converter.convert_from_bytes(
                        file_bytes,
                        pdf_file['file_name'],
                        '.pdf'
                    )

                    conversion_results.append(conversion)

                    if conversion['success']:
                        txt_files.append({
                            'name': pdf_file['file_name'].replace('.pdf', '.txt'),
                            'id': pdf_file['file_id'],
                            'text': conversion['text'],
                            'length': conversion['text_length']
                        })

            except Exception as e:
                logger.error(f"Error convirtiendo {pdf_file['file_name']}: {e}")
                conversion_results.append({
                    'file': pdf_file['file_name'],
                    'success': False,
                    'error': str(e)
                })

            self.progress_tracker.update_progress(stage_idx, 0.1 + (0.8 * (i + 1) / len(files)))

        self.results['conversion_results'] = conversion_results
        self.results['txt_files'] = txt_files

        # ===== GUARDAR EN CACHÉ =====
        self.progress_tracker.update_progress(stage_idx, 0.95, "Guardando en caché...")

        # NO guardar el texto completo en el caché (es demasiado grande)
        # Solo guardar metadatos
        txt_files_metadata = [
            {
                'name': f['name'],
                'id': f['id'],
                'length': f['length']
                # NO incluir 'text' aquí
            }
            for f in txt_files
        ]

        conversion_results_lite = [
            {
                'file': r.get('file'),
                'success': r.get('success'),
                'text_length': r.get('text_length', 0),
                'error': r.get('error') if not r.get('success') else None
                # NO incluir 'text' aquí
            }
            for r in conversion_results
        ]

        cache_data = {
            'conversion_results': conversion_results_lite,
            'txt_files': txt_files_metadata,
            'total': len(files),
            'successful': len(txt_files),
            'failed': len(files) - len(txt_files)
        }

        self.cache.save_stage_results("03_TXT_Converted", cache_data, "conversion_results.json")

        # Guardar archivos TXT individuales en Drive
        logger.info("Guardando archivos TXT en Drive...")
        folder_id = self.cache.get_or_create_stage_folder("03_TXT_Converted")

        for i, txt_file in enumerate(txt_files):
            try:
                txt_bytes = txt_file['text'].encode('utf-8')
                self.drive_connector.upload_file(
                    folder_id,
                    txt_file['name'],
                    txt_bytes,
                    'text/plain'
                )
                logger.debug(f"  ✓ Guardado: {txt_file['name']}")
            except Exception as e:
                logger.error(f"  ❌ Error guardando {txt_file['name']}: {e}")

        # Mantener el texto completo en memoria para la sesión actual
        self.results['conversion_results'] = conversion_results
        self.results['txt_files'] = txt_files
        self.results['conversion_stats'] = {
            'total': len(files),
            'successful': len(txt_files),
            'failed': len(files) - len(txt_files)
        }

        logger.info(f"Conversión completada: {len(txt_files)}/{len(files)} exitosas")

        return {
            'total': len(files),
            'successful': len(txt_files),
            'failed': len(files) - len(txt_files),
            'from_cache': False
        }

    def _stage_preprocessing(self, stage_idx: int, txt_files: List[Dict], parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 3: Preprocesamiento"""

        # ===== VERIFICAR CACHÉ =====
        cached = self.cache.check_stage_cache("04_TXT_Preprocessed", "preprocessing_results.json")

        if cached:
            # El caché puede tener dos formatos: nuevo (con 'results') o antiguo (directo)
            results_data = cached.get('results', cached)

            # Verificar si tiene los datos necesarios
            if results_data.get('preprocessed_texts'):
                logger.info("✓ Preprocesamiento encontrado en caché")
                self.progress_tracker.update_progress(stage_idx, 0.5, "Cargando desde caché...")

                self.results['preprocessed_texts'] = results_data.get('preprocessed_texts', {})
                self.results['preprocessing_results'] = results_data.get('preprocessing_results', {})
                self.results['preprocessing_stats'] = {
                    'total_documents': results_data.get('total_documents', 0),
                    'total_tokens': results_data.get('total_tokens', 0),
                    'vocabulary_size': results_data.get('vocabulary_size', 0)
                }

                self.progress_tracker.update_progress(stage_idx, 1.0, "Cargado desde caché")

                return {
                    'total_documents': results_data.get('total_documents', 0),
                    'total_tokens': results_data.get('total_tokens', 0),
                    'from_cache': True
                }

        # ===== PROCESAR =====
        from src.text_preprocessor import TextPreprocessor

        logger.info(f"Cache no encontrado, preprocesando {len(txt_files)} documentos...")

        if not self.text_preprocessor:
            self.text_preprocessor = TextPreprocessor(language='english', use_global_stopwords=True)

        # Obtener parámetros de preprocesamiento desde configuración
        preprocessing_config = self.config.PREPROCESSING
        apply_lemmatization = preprocessing_config.get('apply_lemmatization', False)
        apply_stemming = preprocessing_config.get('apply_stemming', False)

        preprocessed_texts = {}
        preprocessing_results = {}

        for i, txt_file in enumerate(txt_files):
            try:
                text = txt_file.get('text', '')
                doc_name = txt_file['name']

                # Usar procesar_texto_completo que soporta lematización
                result = self.text_preprocessor.procesar_texto_completo(
                    text,
                    doc_name,
                    remove_stopwords=True,
                    apply_stemming=apply_stemming,
                    apply_lemmatization=apply_lemmatization
                )

                preprocessed_texts[doc_name] = ' '.join(result['tokens'])
                preprocessing_results[doc_name] = result

            except Exception as e:
                logger.error(f"Error preprocesando {txt_file['name']}: {e}")

            self.progress_tracker.update_progress(stage_idx, 0.1 + (0.8 * (i + 1) / len(txt_files)))

        self.results['preprocessed_texts'] = preprocessed_texts
        self.results['preprocessing_results'] = preprocessing_results

        # ===== GUARDAR EN CACHÉ =====
        self.progress_tracker.update_progress(stage_idx, 0.95, "Guardando en caché...")

        total_tokens = sum(len(r['tokens']) for r in preprocessing_results.values())
        vocabulary = set()
        for result in preprocessing_results.values():
            vocabulary.update(result['tokens'])

        self.results['preprocessing_stats'] = {
            'total_documents': len(preprocessed_texts),
            'total_tokens': total_tokens,
            'vocabulary_size': len(vocabulary)
        }

        cache_data = {
            'preprocessed_texts': preprocessed_texts,
            'preprocessing_results': preprocessing_results,
            'total_documents': len(preprocessed_texts),
            'total_tokens': total_tokens
        }

        self.cache.save_stage_results("04_TXT_Preprocessed", cache_data, "preprocessing_results.json")

        logger.info(f"Preprocesamiento completado: {len(preprocessed_texts)} documentos")

        return {
            'total_documents': len(preprocessed_texts),
            'total_tokens': total_tokens,
            'from_cache': False
        }

    # Las demás etapas se implementan de forma similar...
    # Por brevedad, voy a crear métodos stub que puedes expandir

    def _stage_bow(self, stage_idx: int, preprocessed_texts: Dict, parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 4: Bolsa de Palabras"""

        # ===== VERIFICAR CACHÉ =====
        cached = self.cache.check_stage_cache("05_BagOfWords_Results", "bow_results.json")

        if cached:
            # El caché puede tener dos formatos: nuevo (con 'results') o antiguo (directo)
            results_data = cached.get('results', cached)

            # Verificar si tiene los datos necesarios
            if results_data.get('vocabulary_size') or results_data.get('feature_names'):
                logger.info("✓ BoW encontrado en caché")
                self.progress_tracker.update_progress(stage_idx, 0.5, "Cargando desde caché...")

                # Cargar metadatos
                self.results['bow_vocabulary_size'] = results_data.get('vocabulary_size', 0)
                self.results['bow_feature_names'] = results_data.get('feature_names', [])
                self.results['bow_doc_names'] = results_data.get('doc_names', [])
                self.results['bow_top_terms'] = results_data.get('top_terms', [])
                self.results['bow_stats'] = {
                    'n_documents': results_data.get('n_documents', 0),
                    'vocabulary_size': results_data.get('vocabulary_size', 0),
                    'total_terms': results_data.get('total_terms', 0),
                    'avg_terms_per_doc': results_data.get('avg_terms_per_doc', 0),
                    'sparsity': results_data.get('sparsity', 0.0)
                }

                # CRÍTICO: Cargar la matriz desde pickle
                logger.info("Cargando matriz BoW desde pickle...")
                bow_matrix = self.cache.load_pickle_data("05_BagOfWords_Results", "bow_matrix.pkl")
                if bow_matrix is not None:
                    self.results['bow_matrix'] = bow_matrix
                    logger.info(f"✓ Matriz BoW cargada: {bow_matrix.shape}")
                else:
                    logger.warning("⚠️ No se pudo cargar la matriz BoW desde cache")

                self.progress_tracker.update_progress(stage_idx, 1.0, "Cargado desde caché")

                return {
                    'vocabulary_size': results_data.get('vocabulary_size', 0),
                    'total_terms': results_data.get('total_terms', 0),
                    'avg_terms_per_doc': results_data.get('avg_terms_per_doc', 0),
                    'n_documents': results_data.get('n_documents', 0),
                    'from_cache': True
                }

        # ===== PROCESAR USANDO BOW_ANALYZER =====
        from src.bow_analyzer import BagOfWordsAnalyzer

        logger.info(f"Cache no encontrado, creando matriz BoW para {len(preprocessed_texts)} documentos...")
        self.progress_tracker.update_progress(stage_idx, 0.1, "Inicializando BagOfWordsAnalyzer...")

        # Crear instancia del analizador con configuración
        bow_analyzer = BagOfWordsAnalyzer(config=self.config.BOW)

        self.progress_tracker.update_progress(stage_idx, 0.3, "Creando matriz de frecuencias...")

        # Crear matriz BoW
        bow_df = bow_analyzer.fit_transform(preprocessed_texts)

        self.progress_tracker.update_progress(stage_idx, 0.6, "Calculando estadísticas...")

        # Obtener estadísticas
        bow_stats = bow_analyzer.get_statistics(bow_df)

        # Obtener top términos
        top_terms = bow_analyzer.get_top_terms(bow_df, top_n=50)

        self.progress_tracker.update_progress(stage_idx, 0.8, "Extrayendo información...")

        logger.info(f"BoW creado: {bow_stats['vocabulary_size']} términos, {bow_stats['total_terms']} ocurrencias totales")

        # Guardar resultados
        self.results['bow_matrix'] = bow_df  # DataFrame en lugar de sparse matrix
        self.results['bow_feature_names'] = bow_analyzer.get_vocabulary()
        self.results['bow_analyzer'] = bow_analyzer
        self.results['bow_doc_names'] = list(preprocessed_texts.keys())
        self.results['bow_top_terms'] = top_terms
        self.results['bow_stats'] = bow_stats

        # ===== GUARDAR EN CACHÉ =====
        self.progress_tracker.update_progress(stage_idx, 0.90, "Guardando en caché...")

        cache_data = {
            'vocabulary_size': bow_stats['vocabulary_size'],
            'total_terms': bow_stats['total_terms'],
            'avg_terms_per_doc': bow_stats['avg_terms_per_doc'],
            'n_documents': bow_stats['n_documents'],
            'sparsity': bow_stats['sparsity'],
            'feature_names': bow_analyzer.get_vocabulary(),
            'doc_names': list(preprocessed_texts.keys()),
            'top_terms': top_terms
        }

        self.cache.save_stage_results("05_BagOfWords_Results", cache_data, "bow_results.json")

        # CRÍTICO: Guardar la matriz en pickle para poder cargarla después
        logger.info("Guardando matriz BoW en pickle...")
        self.cache.save_pickle_data("05_BagOfWords_Results", bow_df, "bow_matrix.pkl")

        self.progress_tracker.update_progress(stage_idx, 1.0, "BoW completado")

        return {
            'vocabulary_size': bow_stats['vocabulary_size'],
            'total_terms': bow_stats['total_terms'],
            'avg_terms_per_doc': bow_stats['avg_terms_per_doc'],
            'n_documents': bow_stats['n_documents'],
            'from_cache': False
        }

    def _stage_tfidf(self, stage_idx: int, preprocessed_texts: Dict, parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 5: TF-IDF"""

        # ===== VERIFICAR CACHÉ =====
        cached = self.cache.check_stage_cache("06_TFIDF_Results", "tfidf_results.json")

        if cached:
            # El caché puede tener dos formatos: nuevo (con 'results') o antiguo (directo)
            results_data = cached.get('results', cached)

            # Verificar si tiene los datos necesarios
            if results_data.get('vocabulary_size') or results_data.get('feature_names'):
                logger.info("✓ TF-IDF encontrado en caché")
                self.progress_tracker.update_progress(stage_idx, 0.5, "Cargando desde caché...")

                # Cargar metadatos
                self.results['tfidf_vocabulary_size'] = results_data.get('vocabulary_size', 0)
                self.results['tfidf_feature_names'] = results_data.get('feature_names', [])
                self.results['tfidf_doc_names'] = results_data.get('doc_names', [])
                self.results['tfidf_top_terms'] = results_data.get('top_terms', [])
                self.results['top_tfidf_terms_per_doc'] = results_data.get('top_terms_per_doc', {})
                self.results['tfidf_stats'] = {
                    'n_documents': results_data.get('n_documents', 0),
                    'vocabulary_size': results_data.get('vocabulary_size', 0),
                    'sparsity': results_data.get('sparsity', 0.0),
                    'density': results_data.get('density', 0.0),
                    'avg_tfidf_score': results_data.get('avg_tfidf_score', 0.0)
                }

                # CRÍTICO: Cargar la matriz desde pickle
                logger.info("Cargando matriz TF-IDF desde pickle...")
                tfidf_matrix = self.cache.load_pickle_data("06_TFIDF_Results", "tfidf_matrix.pkl")
                if tfidf_matrix is not None:
                    self.results['tfidf_matrix'] = tfidf_matrix
                    logger.info(f"✓ Matriz TF-IDF cargada: {tfidf_matrix.shape}")
                else:
                    logger.warning("⚠️ No se pudo cargar la matriz TF-IDF desde cache")

                self.progress_tracker.update_progress(stage_idx, 1.0, "Cargado desde caché")

                return {
                    'vocabulary_size': results_data.get('vocabulary_size', 0),
                    'n_documents': results_data.get('n_documents', 0),
                    'from_cache': True
                }

        # ===== PROCESAR USANDO TFIDF_ANALYZER =====
        from src.tfidf_analyzer import TFIDFAnalyzer

        logger.info(f"Cache no encontrado, calculando TF-IDF para {len(preprocessed_texts)} documentos...")
        self.progress_tracker.update_progress(stage_idx, 0.1, "Inicializando TFIDFAnalyzer...")

        # Crear instancia del analizador con configuración
        tfidf_analyzer = TFIDFAnalyzer(config=self.config.TFIDF)

        self.progress_tracker.update_progress(stage_idx, 0.3, "Calculando matriz TF-IDF...")

        # Crear matriz TF-IDF
        tfidf_df = tfidf_analyzer.fit_transform(preprocessed_texts)

        self.progress_tracker.update_progress(stage_idx, 0.5, "Normalizando matriz...")

        # Normalizar (ya está normalizado por defecto, pero aseguramos)
        tfidf_df_normalized = tfidf_analyzer.normalize(tfidf_df, norm=self.config.TFIDF.get('norm', 'l2'))

        self.progress_tracker.update_progress(stage_idx, 0.6, "Calculando estadísticas...")

        # Obtener estadísticas
        tfidf_stats = tfidf_analyzer.get_statistics(tfidf_df_normalized)

        # Obtener top términos globales
        top_terms = tfidf_analyzer.get_top_terms(tfidf_df_normalized, top_n=50)

        self.progress_tracker.update_progress(stage_idx, 0.7, "Extrayendo términos más relevantes por documento...")

        # Obtener top términos por documento
        doc_names = list(preprocessed_texts.keys())
        top_terms_per_doc = {}
        for doc_name in doc_names:
            top_terms_per_doc[doc_name] = tfidf_analyzer.get_document_top_terms(tfidf_df_normalized, doc_name, top_n=10)

        logger.info(f"TF-IDF calculado: {tfidf_stats['vocabulary_size']} términos únicos")

        # Guardar resultados
        self.results['tfidf_matrix'] = tfidf_df_normalized  # DataFrame normalizado
        self.results['tfidf_feature_names'] = tfidf_analyzer.get_vocabulary()
        self.results['tfidf_analyzer'] = tfidf_analyzer
        self.results['tfidf_doc_names'] = doc_names
        self.results['tfidf_top_terms'] = top_terms
        self.results['top_tfidf_terms_per_doc'] = top_terms_per_doc
        self.results['tfidf_stats'] = tfidf_stats

        # ===== GUARDAR EN CACHÉ =====
        self.progress_tracker.update_progress(stage_idx, 0.90, "Guardando en caché...")

        cache_data = {
            'vocabulary_size': tfidf_stats['vocabulary_size'],
            'n_documents': tfidf_stats['n_documents'],
            'sparsity': tfidf_stats['sparsity'],
            'density': 1.0 - tfidf_stats['sparsity'],
            'avg_tfidf_score': tfidf_stats.get('avg_tfidf_score', 0.0),
            'feature_names': tfidf_analyzer.get_vocabulary(),
            'doc_names': doc_names,
            'top_terms': top_terms,
            'top_terms_per_doc': top_terms_per_doc
        }

        self.cache.save_stage_results("06_TFIDF_Results", cache_data, "tfidf_results.json")

        # CRÍTICO: Guardar la matriz en pickle para poder cargarla después
        logger.info("Guardando matriz TF-IDF en pickle...")
        self.cache.save_pickle_data("06_TFIDF_Results", tfidf_df_normalized, "tfidf_matrix.pkl")

        self.progress_tracker.update_progress(stage_idx, 1.0, "TF-IDF completado")

        return {
            'vocabulary_size': tfidf_stats['vocabulary_size'],
            'n_documents': tfidf_stats['n_documents'],
            'from_cache': False
        }

    def _stage_ngrams(self, stage_idx: int, preprocessed_texts: Dict, parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 6: N-gramas"""

        # ===== VERIFICAR CACHÉ =====
        cached = self.cache.check_stage_cache("07_Ngram_Analysis", "ngram_results.json")

        if cached:
            # El caché puede tener dos formatos: nuevo (con 'results') o antiguo (directo)
            results_data = cached.get('results', cached)

            # Verificar si tiene los datos necesarios
            if results_data.get('ngram_analysis'):
                logger.info("✓ N-gramas encontrado en caché")
                self.progress_tracker.update_progress(stage_idx, 0.5, "Cargando desde caché...")

                self.results['ngram_analysis'] = results_data.get('ngram_analysis', {})

                self.progress_tracker.update_progress(stage_idx, 1.0, "Cargado desde caché")

                return {
                    'max_n': results_data.get('max_n', 0),
                    'n_documents': results_data.get('n_documents', 0),
                    'ngrams_extracted': results_data.get('ngrams_extracted', 0),
                    'from_cache': True
                }

        # ===== PROCESAR =====
        from src.models.ngram_analyzer import NgramAnalyzer

        logger.info(f"Cache no encontrado, analizando n-gramas en {len(preprocessed_texts)} documentos...")
        self.progress_tracker.update_progress(stage_idx, 0.1, "Inicializando analizador de n-gramas...")

        ngram_config = self.config.NGRAMS

        analyzer = NgramAnalyzer()

        self.progress_tracker.update_progress(stage_idx, 0.3, "Extrayendo n-gramas...")

        ngram_results = analyzer.analyze_corpus(
            preprocessed_texts,
            max_n=ngram_config['max_n'],
            min_df=ngram_config['min_df'],
            max_df=ngram_config['max_df'],
            top_k=ngram_config['top_k']
        )

        self.progress_tracker.update_progress(stage_idx, 0.8, "Procesando resultados...")

        logger.info(f"Análisis de n-gramas completado: {ngram_config['max_n']}-gramas extraídos")

        self.results['ngram_analysis'] = ngram_results
        self.results['ngram_analyzer'] = analyzer

        # ===== GUARDAR EN CACHÉ =====
        self.progress_tracker.update_progress(stage_idx, 0.95, "Guardando en caché...")

        ngrams_extracted = sum(
            len(ngram_results['ngrams'].get(f'{n}grams', {}).get('top_ngrams', []))
            for n in range(1, ngram_config['max_n'] + 1)
        )

        cache_data = {
            'max_n': ngram_config['max_n'],
            'n_documents': len(preprocessed_texts),
            'ngrams_extracted': ngrams_extracted,
            'ngram_analysis': ngram_results
        }

        self.cache.save_stage_results("07_Ngram_Analysis", cache_data, "ngram_results.json")

        self.progress_tracker.update_progress(stage_idx, 1.0, "N-gramas completado")

        return {
            'max_n': ngram_config['max_n'],
            'n_documents': len(preprocessed_texts),
            'ngrams_extracted': ngrams_extracted,
            'from_cache': False
        }

    def _stage_ner(self, stage_idx: int, txt_files: List[Dict], parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 7: NER"""
        from src.models.ner_analyzer import NERAnalyzer

        # ===== VERIFICAR CACHÉ =====
        cached = self.cache.check_stage_cache("08_NER_Analysis", "ner_results.json")

        if cached:
            # El caché puede tener dos formatos: nuevo (con 'results') o antiguo (directo)
            results_data = cached.get('results', cached)

            # Verificar si tiene los datos necesarios
            if results_data.get('corpus_analysis'):
                logger.info("✓ NER encontrado en caché")
                self.progress_tracker.update_progress(stage_idx, 0.5, "Cargando NER desde caché...")

                self.results['ner_corpus_analysis'] = results_data.get('corpus_analysis', {})

                self.progress_tracker.update_progress(stage_idx, 1.0, "NER cargado desde caché")

                return {
                    'total_entities': results_data.get('total_entities', 0),
                    'entity_types': results_data.get('entity_types', 0),
                    'documents_processed': results_data.get('documents_processed', 0),
                    'from_cache': True
                }

        # ===== PROCESAR =====
        logger.info(f"Cache no encontrado, ejecutando NER en {len(txt_files)} documentos...")
        self.progress_tracker.update_progress(stage_idx, 0.05, "Inicializando modelo NER...")

        # Configuración desde config
        ner_config = self.config.NER

        # Crear analizador NER
        # IMPORTANTE: Desactivar caché interno del NERAnalyzer porque el pipeline
        # ya maneja su propio sistema de caché en Google Drive
        analyzer = NERAnalyzer(
            model_name=ner_config['model_name'],
            use_cache=False  # Usar solo el caché del pipeline (Google Drive)
        )

        self.progress_tracker.update_progress(stage_idx, 0.1, "Modelo cargado, procesando documentos...")

        # Preparar textos
        texts_dict = {}
        for i, txt_file in enumerate(txt_files):
            texts_dict[txt_file['name']] = txt_file.get('text', '')

        # Analizar corpus completo
        try:
            corpus_analysis = analyzer.analyze_corpus(texts_dict)
            self.progress_tracker.update_progress(stage_idx, 0.9, "Generando insights...")

            # Guardar resultados
            self.results['ner_corpus_analysis'] = corpus_analysis
            self.results['ner_analyzer'] = analyzer

            logger.info(f"NER completado: {corpus_analysis['corpus_stats']['total_entities']} entidades encontradas")

            # ===== GUARDAR EN CACHÉ =====
            self.progress_tracker.update_progress(stage_idx, 0.95, "Guardando NER en caché...")

            cache_data = {
                'corpus_analysis': corpus_analysis,
                'total_entities': corpus_analysis['corpus_stats']['total_entities'],
                'entity_types': len(corpus_analysis['corpus_stats']['entities_by_type']),
                'documents_processed': len(texts_dict)
            }

            self.cache.save_stage_results("08_NER_Analysis", cache_data, "ner_results.json")

            self.progress_tracker.update_progress(stage_idx, 1.0, "NER completado")

            return {
                'total_entities': corpus_analysis['corpus_stats']['total_entities'],
                'entity_types': len(corpus_analysis['corpus_stats']['entities_by_type']),
                'documents_processed': len(texts_dict),
                'from_cache': False
            }

        except Exception as e:
            logger.error(f"Error en NER: {e}")
            self.progress_tracker.update_progress(stage_idx, 1.0, "NER completado con errores")
            return {'error': str(e)}

    def _stage_topic_modeling(self, stage_idx: int, preprocessed_texts: Dict, parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 8: Topic Modeling"""
        from src.models.topic_modeling import TopicModelingAnalyzer

        # ===== VERIFICAR CACHÉ =====
        cached = self.cache.check_stage_cache("09_Topic_Modeling", "topic_results.json")

        if cached:
            # El caché puede tener dos formatos: nuevo (con 'results') o antiguo (directo)
            results_data = cached.get('results', cached)

            # Verificar si tiene los datos necesarios
            if results_data.get('topic_modeling_results'):
                logger.info("✓ Topic Modeling encontrado en caché")
                self.progress_tracker.update_progress(stage_idx, 0.5, "Cargando Topic Modeling desde caché...")

                self.results['topic_modeling'] = results_data.get('topic_modeling_results', {})

                self.progress_tracker.update_progress(stage_idx, 1.0, "Topic Modeling cargado desde caché")

                return {
                    'models_trained': results_data.get('models_trained', 0),
                    'n_documents': results_data.get('n_documents', 0),
                    'from_cache': True
                }

        # ===== PROCESAR =====
        logger.info(f"Cache no encontrado, modelando temas en {len(preprocessed_texts)} documentos...")
        self.progress_tracker.update_progress(stage_idx, 0.05, "Inicializando analizador de temas...")

        # Configuración desde config
        tm_config = self.config.TOPIC_MODELING

        # Crear analizador
        analyzer = TopicModelingAnalyzer()

        # Preparar documentos
        doc_names, documents = analyzer.prepare_documents(preprocessed_texts)

        results = {}

        # LDA
        self.progress_tracker.update_progress(stage_idx, 0.1, "Entrenando LDA...")
        try:
            lda_results = analyzer.fit_lda(
                documents,
                n_topics=tm_config['lda']['n_topics'],
                max_features=tm_config['lda']['max_features'],
                min_df=tm_config['lda']['min_df'],
                max_df=tm_config['lda']['max_df'],
                random_state=tm_config['lda']['random_state'],
                max_iter=tm_config['lda']['max_iter']
            )
            results['lda'] = lda_results
            logger.info(f"LDA completado: {lda_results['n_topics']} temas")
        except Exception as e:
            logger.error(f"Error en LDA: {e}")
            results['lda_error'] = str(e)

        # NMF
        self.progress_tracker.update_progress(stage_idx, 0.4, "Entrenando NMF...")
        try:
            nmf_results = analyzer.fit_nmf(
                documents,
                n_topics=tm_config['nmf']['n_topics'],
                max_features=tm_config['nmf']['max_features'],
                min_df=tm_config['nmf']['min_df'],
                max_df=tm_config['nmf']['max_df'],
                random_state=tm_config['nmf']['random_state'],
                max_iter=tm_config['nmf']['max_iter']
            )
            results['nmf'] = nmf_results
            logger.info(f"NMF completado: {nmf_results['n_topics']} temas")
        except Exception as e:
            logger.error(f"Error en NMF: {e}")
            results['nmf_error'] = str(e)

        # LSA
        self.progress_tracker.update_progress(stage_idx, 0.6, "Entrenando LSA...")
        try:
            lsa_results = analyzer.fit_lsa(
                documents,
                n_topics=tm_config['lsa']['n_components'],
                max_features=tm_config['lsa']['max_features'],
                min_df=tm_config['lsa']['min_df'],
                max_df=tm_config['lsa']['max_df'],
                random_state=tm_config['lsa']['random_state']
            )
            results['lsa'] = lsa_results
            logger.info(f"LSA completado: {lsa_results['n_topics']} componentes")
        except Exception as e:
            logger.error(f"Error en LSA: {e}")
            results['lsa_error'] = str(e)

        # PLSA
        self.progress_tracker.update_progress(stage_idx, 0.75, "Entrenando pLSA...")
        try:
            plsa_results = analyzer.fit_plsa(
                documents,
                n_topics=tm_config['plsa']['n_topics'],
                max_features=tm_config['plsa']['max_features'],
                min_df=tm_config['plsa']['min_df'],
                max_df=tm_config['plsa']['max_df'],
                random_state=tm_config['plsa']['random_state'],
                max_iter=tm_config['plsa']['max_iter']
            )
            results['plsa'] = plsa_results
            logger.info(f"pLSA completado: {plsa_results['n_topics']} temas")
        except Exception as e:
            logger.error(f"Error en pLSA: {e}")
            results['plsa_error'] = str(e)

        # Comparación de modelos
        self.progress_tracker.update_progress(stage_idx, 0.90, "Comparando modelos...")
        try:
            if 'lda' in results and 'nmf' in results and 'lsa' in results:
                comparison = analyzer.compare_models(
                    results['lda'],
                    results['nmf'],
                    results['lsa'],
                    results.get('plsa')
                )
                results['model_comparison'] = comparison
                logger.info("Comparación de modelos completada")
        except Exception as e:
            logger.error(f"Error en comparación de modelos: {e}")
            results['comparison_error'] = str(e)

        # Guardar resultados
        self.results['topic_modeling'] = results
        self.results['topic_modeling_analyzer'] = analyzer

        logger.info("Topic Modeling completado (LDA, NMF, LSA, pLSA)")

        # ===== GUARDAR EN CACHÉ =====
        self.progress_tracker.update_progress(stage_idx, 0.95, "Guardando Topic Modeling en caché...")

        cache_data = {
            'topic_modeling_results': results,
            'models_trained': len([k for k in results.keys() if not k.endswith('_error')]),
            'n_documents': len(documents)
        }

        self.cache.save_stage_results("09_Topic_Modeling", cache_data, "topic_results.json")

        self.progress_tracker.update_progress(stage_idx, 1.0, "Topic Modeling completado")

        return {
            'models_trained': len([k for k in results.keys() if not k.endswith('_error')]),
            'n_documents': len(documents),
            'from_cache': False
        }

    def _stage_bertopic(self, stage_idx: int, preprocessed_texts: Dict, parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 9: BERTopic"""
        from src.models.bertopic_analyzer import BERTopicAnalyzer

        # ===== VERIFICAR CACHÉ =====
        cached = self.cache.check_stage_cache("10_BERTopic_Analysis", "bertopic_results.json")

        if cached:
            # El caché puede tener dos formatos: nuevo (con 'results') o antiguo (directo)
            results_data = cached.get('results', cached)

            # Verificar si tiene los datos necesarios
            if results_data.get('bertopic_results'):
                logger.info("✓ BERTopic encontrado en caché")
                self.progress_tracker.update_progress(stage_idx, 0.5, "Cargando BERTopic desde caché...")

                self.results['bertopic'] = results_data.get('bertopic_results', {})

                self.progress_tracker.update_progress(stage_idx, 1.0, "BERTopic cargado desde caché")

                return {
                    'n_topics': results_data.get('n_topics', 0),
                    'n_documents': results_data.get('n_documents', 0),
                    'from_cache': True
                }

        # ===== PROCESAR =====
        logger.info(f"Cache no encontrado, ejecutando BERTopic en {len(preprocessed_texts)} documentos...")
        self.progress_tracker.update_progress(stage_idx, 0.05, "Inicializando BERTopic...")

        # Configuración desde config
        bertopic_config = self.config.BERTOPIC

        try:
            # Crear analizador
            analyzer = BERTopicAnalyzer()

            self.progress_tracker.update_progress(stage_idx, 0.1, "Generando embeddings...")

            # Entrenar BERTopic
            bertopic_results = analyzer.fit_bertopic(
                preprocessed_texts,
                n_topics=bertopic_config['n_topics'],
                embedding_model=bertopic_config['embedding_model'],
                min_topic_size=bertopic_config['min_topic_size'],
                language=bertopic_config['language'],
                calculate_probabilities=bertopic_config['calculate_probabilities'],
                verbose=bertopic_config['verbose']
            )

            # Guardar resultados
            self.results['bertopic'] = bertopic_results
            self.results['bertopic_analyzer'] = analyzer

            logger.info(f"BERTopic completado: {bertopic_results['n_topics']} temas encontrados")

            # ===== GUARDAR EN CACHÉ =====
            self.progress_tracker.update_progress(stage_idx, 0.95, "Guardando BERTopic en caché...")

            cache_data = {
                'bertopic_results': bertopic_results,
                'n_topics': bertopic_results['n_topics'],
                'n_documents': len(preprocessed_texts)
            }

            self.cache.save_stage_results("10_BERTopic_Analysis", cache_data, "bertopic_results.json")

            self.progress_tracker.update_progress(stage_idx, 1.0, "BERTopic completado")

            return {
                'n_topics': bertopic_results['n_topics'],
                'n_documents': len(preprocessed_texts),
                'from_cache': False
            }

        except Exception as e:
            logger.error(f"Error en BERTopic: {e}")
            self.progress_tracker.update_progress(stage_idx, 1.0, "BERTopic completado con errores")
            return {'error': str(e)}

    def _stage_dimensionality_reduction(self, stage_idx: int, tfidf_matrix, feature_names: List, parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 10: Reducción de Dimensionalidad"""
        from src.models.dimensionality_reduction import DimensionalityReducer
        import numpy as np

        # ===== VERIFICAR CACHÉ =====
        cached = self.cache.check_stage_cache("11_Dimensionality_Reduction", "dimred_results.json")

        if cached:
            # El caché puede tener dos formatos: nuevo (con 'results') o antiguo (directo)
            results_data = cached.get('results', cached)

            # Verificar si tiene los datos necesarios
            if results_data.get('reduction_results'):
                logger.info("✓ Reducción de dimensionalidad encontrada en caché")
                self.progress_tracker.update_progress(stage_idx, 0.5, "Cargando reducción desde caché...")

                reduction_results = results_data.get('reduction_results', {})

                # Cargar datos transformados desde pickle
                logger.info("Cargando datos transformados desde pickle...")
                transformed_data_dict = self.cache.load_pickle_data(
                    "11_Dimensionality_Reduction",
                    "transformed_data.pkl"
                )

                # Combinar métricas con datos transformados
                if transformed_data_dict:
                    for method_name, transformed_data in transformed_data_dict.items():
                        if method_name in reduction_results:
                            reduction_results[method_name]['transformed_data'] = transformed_data
                    logger.info(f"✓ Datos transformados cargados para {len(transformed_data_dict)} métodos")
                else:
                    logger.warning("⚠️ No se encontraron datos transformados en pickle")

                self.results['dimensionality_reduction'] = reduction_results

                self.progress_tracker.update_progress(stage_idx, 1.0, "Reducción cargada desde caché")

                return {
                    'methods_applied': results_data.get('methods_applied', 0),
                    'original_dimensions': results_data.get('original_dimensions', 0),
                    'from_cache': True
                }

        # ===== PROCESAR =====
        logger.info("Cache no encontrado, reduciendo dimensionalidad...")
        self.progress_tracker.update_progress(stage_idx, 0.05, "Inicializando reductor...")

        # Configuración desde config
        dim_config = self.config.DIMENSIONALITY_REDUCTION

        # Crear reductor
        reducer = DimensionalityReducer()

        # Preparar datos
        self.progress_tracker.update_progress(stage_idx, 0.1, "Preparando datos...")
        data_matrix = tfidf_matrix.toarray()
        prep_stats = reducer.prepare_data(data_matrix, list(feature_names))

        results = {}

        # PCA
        self.progress_tracker.update_progress(stage_idx, 0.2, "Aplicando PCA...")
        try:
            pca_results = reducer.apply_pca(
                n_components=dim_config['pca']['n_components'],
                random_state=dim_config['pca']['random_state']
            )
            results['pca'] = pca_results
            logger.info(f"PCA completado: {pca_results['n_components']} componentes")
        except Exception as e:
            logger.error(f"Error en PCA: {e}")
            results['pca_error'] = str(e)

        # t-SNE
        self.progress_tracker.update_progress(stage_idx, 0.5, "Aplicando t-SNE...")
        try:
            tsne_results = reducer.apply_tsne(
                n_components=dim_config['tsne']['n_components'],
                perplexity=dim_config['tsne']['perplexity'],
                learning_rate=dim_config['tsne']['learning_rate'],
                n_iter=dim_config['tsne']['n_iter'],
                random_state=dim_config['tsne']['random_state']
            )
            results['tsne'] = tsne_results
            logger.info(f"t-SNE completado: {tsne_results['n_components']} componentes")
        except Exception as e:
            logger.error(f"Error en t-SNE: {e}")
            results['tsne_error'] = str(e)

        # UMAP (si está disponible)
        self.progress_tracker.update_progress(stage_idx, 0.8, "Aplicando UMAP...")
        try:
            umap_results = reducer.apply_umap(
                n_components=dim_config['umap']['n_components'],
                n_neighbors=dim_config['umap']['n_neighbors'],
                min_dist=dim_config['umap']['min_dist'],
                metric=dim_config['umap']['metric'],
                random_state=dim_config['umap']['random_state']
            )
            results['umap'] = umap_results
            logger.info(f"UMAP completado: {umap_results['n_components']} componentes")
        except Exception as e:
            logger.warning(f"UMAP no disponible o error: {e}")
            results['umap_error'] = str(e)

        # Guardar resultados
        self.results['dimensionality_reduction'] = results
        self.results['dimensionality_reducer'] = reducer

        logger.info("Reducción de dimensionalidad completada")

        # ===== GUARDAR EN CACHÉ =====
        self.progress_tracker.update_progress(stage_idx, 0.95, "Guardando reducción en caché...")

        # Separar datos transformados (NumPy arrays) de métricas (JSON-serializable)
        results_for_json = {}
        transformed_data_dict = {}

        for method_name, method_results in results.items():
            if method_name.endswith('_error'):
                # Guardar errores tal cual
                results_for_json[method_name] = method_results
            elif isinstance(method_results, dict) and 'transformed_data' in method_results:
                # Separar transformed_data (NumPy) de métricas (JSON)
                results_for_json[method_name] = {
                    k: v for k, v in method_results.items() if k != 'transformed_data'
                }
                # Guardar datos transformados por separado
                transformed_data_dict[method_name] = method_results['transformed_data']
            else:
                results_for_json[method_name] = method_results

        cache_data = {
            'reduction_results': results_for_json,
            'methods_applied': len([k for k in results.keys() if not k.endswith('_error')]),
            'original_dimensions': prep_stats['n_features']
        }

        # Guardar métricas en JSON
        self.cache.save_stage_results("11_Dimensionality_Reduction", cache_data, "dimred_results.json")

        # Guardar datos transformados en pickle por separado
        if transformed_data_dict:
            logger.info("Guardando datos transformados en pickle...")
            self.cache.save_pickle_data(
                "11_Dimensionality_Reduction",
                transformed_data_dict,
                "transformed_data.pkl"
            )

        self.progress_tracker.update_progress(stage_idx, 1.0, "Reducción completada")

        return {
            'methods_applied': len([k for k in results.keys() if not k.endswith('_error')]),
            'original_dimensions': prep_stats['n_features'],
            'from_cache': False
        }

    def _stage_factor_analysis(self, stage_idx: int, preprocessed_texts: Dict, parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 11: Análisis de Factores"""
        from src.factor_analyzer import AnalizadorFactores

        # ===== VERIFICAR CACHÉ =====
        cached = self.cache.check_stage_cache("13_Factor_Analysis", "factor_results.json")

        if cached:
            # El caché puede tener dos formatos: nuevo (con 'results') o antiguo (directo)
            results_data = cached.get('results', cached)

            # Verificar si tiene los datos necesarios
            if results_data.get('factor_analysis_results') or results_data.get('factor_dataframe'):
                logger.info("✓ Análisis de factores encontrado en caché")
                self.progress_tracker.update_progress(stage_idx, 0.5, "Cargando análisis de factores desde caché...")

                # Reconstruir DataFrame si está en formato JSON
                import pandas as pd
                factor_df_data = results_data.get('factor_dataframe', {})
                if isinstance(factor_df_data, dict):
                    factor_df = pd.DataFrame(factor_df_data)
                else:
                    factor_df = pd.DataFrame()

                self.results['factor_analysis'] = {
                    'factor_dataframe': factor_df,
                    'top_factors': results_data.get('top_factors', [])
                }

                self.progress_tracker.update_progress(stage_idx, 1.0, "Análisis de factores cargado desde caché")

                return {
                'n_documents': results_data.get('n_documents', 0),
                'n_factors': results_data.get('n_factors', 0),
                'from_cache': True
            }

        # ===== PROCESAR =====
        logger.info(f"Cache no encontrado, analizando factores en {len(preprocessed_texts)} documentos...")
        self.progress_tracker.update_progress(stage_idx, 0.1, "Inicializando analizador de factores...")

        # Crear analizador
        if not self.analizador_factores:
            self.analizador_factores = AnalizadorFactores()

        self.progress_tracker.update_progress(stage_idx, 0.3, "Analizando documentos...")

        # Analizar documentos
        factor_df = self.analizador_factores.analizar_documentos(preprocessed_texts)

        self.progress_tracker.update_progress(stage_idx, 0.6, "Obteniendo factores principales...")

        # Obtener factores principales
        top_factors = self.analizador_factores.obtener_factores_principales(
            preprocessed_texts,
            top_n=10
        )

        # Guardar resultados
        self.results['factor_analysis'] = {
            'factor_dataframe': factor_df,
            'top_factors': top_factors
        }
        self.results['factor_analyzer'] = self.analizador_factores

        logger.info(f"Análisis de factores completado: {len(top_factors)} factores principales")

        # ===== GUARDAR EN CACHÉ =====
        self.progress_tracker.update_progress(stage_idx, 0.9, "Guardando análisis de factores en caché...")

        cache_data = {
            'factor_dataframe': factor_df.to_dict() if hasattr(factor_df, 'to_dict') else {},
            'top_factors': top_factors,
            'n_documents': len(preprocessed_texts),
            'n_factors': len(top_factors)
        }

        self.cache.save_stage_results("13_Factor_Analysis", cache_data, "factor_results.json")

        self.progress_tracker.update_progress(stage_idx, 1.0, "Análisis de factores completado")

        return {
            'n_documents': len(preprocessed_texts),
            'n_factors': len(top_factors),
            'from_cache': False
        }

    def _stage_consolidation(self, stage_idx: int, all_results: Dict, parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 12: Consolidación"""

        # ===== VERIFICAR CACHÉ =====
        cached = self.cache.check_stage_cache("14_Consolidation", "consolidation.json")

        if cached:
            # El caché puede tener dos formatos: nuevo (con 'results') o antiguo (directo)
            results_data = cached.get('results', cached)

            # Verificar si tiene los datos necesarios
            if results_data.get('consolidation'):
                logger.info("✓ Consolidación encontrada en caché")
                self.progress_tracker.update_progress(stage_idx, 0.5, "Cargando consolidación desde caché...")

                self.results['consolidation'] = results_data.get('consolidation', {})

                self.progress_tracker.update_progress(stage_idx, 1.0, "Consolidación cargada desde caché")

                return {
                    **results_data.get('consolidation', {}),
                    'from_cache': True
                }

        # ===== PROCESAR =====
        logger.info("Cache no encontrado, consolidando resultados de todos los análisis...")
        self.progress_tracker.update_progress(stage_idx, 0.1, "Recopilando resultados...")

        consolidation = {
            'pipeline_start': self.progress_tracker.start_time.isoformat() if self.progress_tracker.start_time else None,
            'stages_completed': len([s for s in self.progress_tracker.stages if s.status.value == 'completed']),
            'stages_failed': len([s for s in self.progress_tracker.stages if s.status.value == 'failed']),
            'total_duration': self.progress_tracker.get_total_duration(),
        }

        self.progress_tracker.update_progress(stage_idx, 0.5, "Consolidando métricas...")

        # Consolidar métricas clave
        if 'bow_matrix' in all_results:
            consolidation['vocabulary_size'] = len(all_results.get('bow_feature_names', []))

        if 'preprocessed_texts' in all_results:
            consolidation['n_documents'] = len(all_results['preprocessed_texts'])

        if 'topic_modeling' in all_results:
            consolidation['topic_models'] = list(all_results['topic_modeling'].keys())

        if 'ner_corpus_analysis' in all_results:
            consolidation['total_entities'] = all_results['ner_corpus_analysis']['corpus_stats'].get('total_entities', 0)

        # Guardar consolidación
        self.results['consolidation'] = consolidation

        logger.info("Consolidación completada")

        # ===== GUARDAR EN CACHÉ =====
        self.progress_tracker.update_progress(stage_idx, 0.9, "Guardando consolidación en caché...")

        cache_data = {
            'consolidation': consolidation
        }

        self.cache.save_stage_results("14_Consolidation", cache_data, "consolidation.json")

        self.progress_tracker.update_progress(stage_idx, 1.0, "Consolidación completada")

        return {
            **consolidation,
            'from_cache': False
        }

    def _stage_visualizations(self, stage_idx: int, all_results: Dict, parent_folder_id: str) -> Dict[str, Any]:
        """Etapa 13: Visualizaciones"""

        # ===== VERIFICAR CACHÉ =====
        cached = self.cache.check_stage_cache("15_Visualizations", "viz_metadata.json")

        if cached:
            # El caché puede tener dos formatos: nuevo (con 'results') o antiguo (directo)
            results_data = cached.get('results', cached)

            # Verificar si tiene los datos necesarios
            if results_data.get('viz_data'):
                logger.info("✓ Visualizaciones encontradas en caché")
                self.progress_tracker.update_progress(stage_idx, 0.5, "Cargando visualizaciones desde caché...")

                self.results['visualizations'] = results_data.get('viz_data', {})

                self.progress_tracker.update_progress(stage_idx, 1.0, "Visualizaciones cargadas desde caché")

                return {
                    **results_data.get('viz_data', {}),
                    'from_cache': True
                }

        # ===== PROCESAR =====
        logger.info("Cache no encontrado, generando visualizaciones...")
        self.progress_tracker.update_progress(stage_idx, 0.5, "Preparando datos para visualización...")

        # Por ahora, solo preparamos datos
        # Las visualizaciones se generarán on-demand en los dashboards
        viz_data = {
            'ready_for_visualization': True,
            'available_visualizations': []
        }

        if 'bow_matrix' in all_results:
            viz_data['available_visualizations'].append('wordcloud')
            viz_data['available_visualizations'].append('term_frequency')

        if 'topic_modeling' in all_results:
            viz_data['available_visualizations'].append('topic_distribution')

        if 'ner_corpus_analysis' in all_results:
            viz_data['available_visualizations'].append('entity_network')

        if 'dimensionality_reduction' in all_results:
            viz_data['available_visualizations'].append('scatter_plots')

        self.results['visualizations'] = viz_data

        logger.info(f"Visualizaciones preparadas: {len(viz_data['available_visualizations'])} tipos")

        # ===== GUARDAR EN CACHÉ =====
        self.progress_tracker.update_progress(stage_idx, 0.95, "Guardando visualizaciones en caché...")

        cache_data = {
            'viz_data': viz_data
        }

        self.cache.save_stage_results("15_Visualizations", cache_data, "viz_metadata.json")

        self.progress_tracker.update_progress(stage_idx, 1.0, "Visualizaciones completadas")

        return {
            **viz_data,
            'from_cache': False
        }

    def get_progress_dict(self) -> Dict[str, Any]:
        """
        Retorna el progreso actual como diccionario

        Returns:
            Diccionario con estado completo del pipeline
        """
        return self.progress_tracker.to_dict()

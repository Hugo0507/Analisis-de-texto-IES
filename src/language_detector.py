"""
Módulo de Detección de Idioma
Detecta el idioma de documentos de texto
"""

import langdetect
from langdetect import detect, detect_langs, LangDetectException
import langid
import pandas as pd
from collections import Counter
from typing import Dict, List, Any, Optional
from src.utils.logger import get_logger

# Inicializar logger
logger = get_logger(__name__)


class LanguageDetector:
    """Clase para detectar idiomas en documentos"""

    def __init__(self) -> None:
        """Inicializa el detector de idioma"""
        # Configurar langdetect para resultados consistentes
        langdetect.DetectorFactory.seed = 0

        # Mapeo de códigos de idioma a nombres completos
        self.language_names: Dict[str, str] = {
            'es': 'Español',
            'en': 'Inglés',
            'pt': 'Portugués',
            'fr': 'Francés',
            'de': 'Alemán',
            'it': 'Italiano',
            'ca': 'Catalán',
            'gl': 'Gallego',
            'eu': 'Euskera',
            'zh-cn': 'Chino',
            'ja': 'Japonés',
            'ko': 'Coreano',
            'ar': 'Árabe',
            'ru': 'Ruso',
            'nl': 'Holandés',
            'sv': 'Sueco',
            'no': 'Noruego',
            'da': 'Danés',
            'fi': 'Finlandés',
            'pl': 'Polaco',
            'tr': 'Turco',
            'el': 'Griego',
            'he': 'Hebreo',
            'hi': 'Hindi',
            'th': 'Tailandés',
            'vi': 'Vietnamita',
            'id': 'Indonesio',
            'ro': 'Rumano',
            'hu': 'Húngaro',
            'cs': 'Checo',
            'sk': 'Eslovaco',
            'uk': 'Ucraniano',
            'bg': 'Búlgaro',
            'hr': 'Croata',
            'sr': 'Serbio',
            'unknown': 'Desconocido'
        }

    def detect_language(self, text: str, method: str = 'langdetect') -> Dict[str, Any]:
        """
        Detecta el idioma de un texto

        Args:
            text: Texto a analizar
            method: Método a usar ('langdetect' o 'langid')

        Returns:
            Diccionario con código de idioma, nombre, y confianza
        """
        if not text or len(text.strip()) < 10:
            return {
                'language_code': 'unknown',
                'language_name': 'Desconocido',
                'confidence': 0.0,
                'method': method
            }

        try:
            if method == 'langdetect':
                # Usar langdetect
                lang_code = detect(text)
                langs_prob = detect_langs(text)

                # Obtener confianza
                confidence = 0.0
                for lang_prob in langs_prob:
                    if lang_prob.lang == lang_code:
                        confidence = lang_prob.prob
                        break

                return {
                    'language_code': lang_code,
                    'language_name': self.language_names.get(lang_code, lang_code.upper()),
                    'confidence': round(confidence, 4),
                    'method': 'langdetect'
                }

            elif method == 'langid':
                # Usar langid
                lang_code, confidence = langid.classify(text)

                return {
                    'language_code': lang_code,
                    'language_name': self.language_names.get(lang_code, lang_code.upper()),
                    'confidence': round(confidence, 4),
                    'method': 'langid'
                }

        except LangDetectException as e:
            return {
                'language_code': 'unknown',
                'language_name': 'Desconocido',
                'confidence': 0.0,
                'method': method,
                'error': str(e)
            }
        except Exception as e:
            return {
                'language_code': 'error',
                'language_name': 'Error',
                'confidence': 0.0,
                'method': method,
                'error': str(e)
            }

    def detect_from_bytes(self, file_bytes: bytes, file_name: str, file_extension: str, method: str = 'langdetect') -> Dict[str, Any]:
        """
        Detecta el idioma de un archivo PDF desde bytes

        Args:
            file_bytes: Bytes del archivo
            file_name: Nombre del archivo
            file_extension: Extensión del archivo (.pdf)
            method: Método de detección

        Returns:
            Diccionario con información del idioma
        """
        try:
            # Usar pdfminer.six para extraer texto (más robusto que PyPDF2)
            from pdfminer.high_level import extract_text
            from io import BytesIO

            # Convertir bytes a BytesIO si es necesario
            if isinstance(file_bytes, bytes):
                file_stream = BytesIO(file_bytes)
            else:
                # Si ya es un BytesIO, usarlo directamente
                file_stream = file_bytes
                file_stream.seek(0)

            # Extraer texto usando pdfminer
            logger.debug(f"Extrayendo texto de {file_name} usando pdfminer...")
            text = extract_text(file_stream)

            # LOG: Mostrar longitud del texto extraído
            text_length = len(text.strip()) if text else 0
            logger.info(f"  -> Texto extraído: {text_length} caracteres")

            # Verificar si hay texto extraído
            if text and text.strip():
                # Detectar idioma del texto extraído
                result = self.detect_language(text, method=method)
                result['file'] = file_name
                result['text_length'] = text_length
                logger.info(f"  -> Idioma detectado: {result.get('language_code', 'unknown')} (confianza: {result.get('confidence', 0):.2f})")
                return result
            else:
                logger.warning(f"  -> No se extrajo texto del PDF {file_name}")
                return {
                    'file': file_name,
                    'language_code': 'error',
                    'language_name': 'Texto no detectado',
                    'confidence': 0.0,
                    'method': method,
                    'error': 'No text extracted from PDF',
                    'text_length': 0
                }

        except Exception as e:
            logger.error(f"  -> Error procesando {file_name}: {e}")
            return {
                'file': file_name,
                'language_code': 'error',
                'language_name': 'Error',
                'confidence': 0.0,
                'method': method,
                'error': str(e),
                'text_length': 0
            }

    def detect_language_from_file(self, file_path: str, encoding: str = 'utf-8', method: str = 'langdetect') -> Dict[str, Any]:
        """
        Detecta el idioma de un archivo

        Args:
            file_path: Ruta al archivo
            encoding: Codificación del archivo
            method: Método de detección

        Returns:
            Diccionario con información del idioma
        """
        try:
            with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
                text = f.read()

            result = self.detect_language(text, method=method)
            result['file'] = file_path
            return result

        except Exception as e:
            return {
                'file': file_path,
                'language_code': 'error',
                'language_name': 'Error',
                'confidence': 0.0,
                'method': method,
                'error': str(e)
            }

    def detect_languages_batch(self, texts: Any, method: str = 'langdetect') -> List[Dict[str, Any]]:
        """
        Detecta idiomas en múltiples textos

        Args:
            texts: Lista de textos o diccionario {nombre: texto}
            method: Método de detección

        Returns:
            Lista de resultados
        """
        results: List[Dict[str, Any]] = []

        if isinstance(texts, dict):
            for name, text in texts.items():
                result = self.detect_language(text, method=method)
                result['document'] = name
                results.append(result)
        else:
            for i, text in enumerate(texts):
                result = self.detect_language(text, method=method)
                result['document'] = f'documento_{i+1}'
                results.append(result)

        return results

    def detect_languages_from_files(self, file_paths: List[str], encoding: str = 'utf-8', method: str = 'langdetect') -> List[Dict[str, Any]]:
        """
        Detecta idiomas de múltiples archivos

        Args:
            file_paths: Lista de rutas de archivos
            encoding: Codificación de los archivos
            method: Método de detección

        Returns:
            Lista de resultados
        """
        results = []

        for file_path in file_paths:
            result = self.detect_language_from_file(file_path, encoding=encoding, method=method)
            results.append(result)

        return results

    def create_language_statistics(self, detection_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Crea estadísticas de idiomas detectados

        Args:
            detection_results: Lista de resultados de detección

        Returns:
            Diccionario con estadísticas
        """
        # Contar idiomas
        language_counts = Counter()
        confidence_sum = {}
        confidence_count = {}

        for result in detection_results:
            lang_name = result.get('language_name', 'Desconocido')
            confidence = result.get('confidence', 0.0)

            language_counts[lang_name] += 1

            # Calcular promedio de confianza
            if lang_name not in confidence_sum:
                confidence_sum[lang_name] = 0.0
                confidence_count[lang_name] = 0

            confidence_sum[lang_name] += confidence
            confidence_count[lang_name] += 1

        # Calcular promedios
        language_stats = {}
        for lang_name, count in language_counts.items():
            avg_confidence = confidence_sum[lang_name] / confidence_count[lang_name]
            language_stats[lang_name] = {
                'count': count,
                'percentage': round((count / len(detection_results)) * 100, 2),
                'avg_confidence': round(avg_confidence, 4)
            }

        return {
            'total_documents': len(detection_results),
            'languages_detected': len(language_counts),
            'by_language': language_stats,
            'most_common': language_counts.most_common(1)[0] if language_counts else ('Ninguno', 0)
        }

    def create_detection_dataframe(self, detection_results: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Crea DataFrame con resultados de detección

        Args:
            detection_results: Lista de resultados

        Returns:
            DataFrame de pandas
        """
        data = []
        for result in detection_results:
            data.append({
                'Documento': result.get('document', result.get('file', 'N/A')),
                'Idioma': result.get('language_name', 'Desconocido'),
                'Código': result.get('language_code', 'unknown'),
                'Confianza': result.get('confidence', 0.0),
                'Método': result.get('method', 'N/A')
            })

        return pd.DataFrame(data)

    def filter_by_language(self, detection_results: List[Dict[str, Any]], target_languages: Any) -> List[Dict[str, Any]]:
        """
        Filtra resultados por idioma(s) específico(s)

        Args:
            detection_results: Lista de resultados de detección
            target_languages: Lista de códigos de idioma (ej: ['es', 'en'])

        Returns:
            Lista filtrada de resultados
        """
        if isinstance(target_languages, str):
            target_languages = [target_languages]

        filtered = []
        for result in detection_results:
            if result.get('language_code') in target_languages:
                filtered.append(result)

        return filtered

    def separate_by_language(self, detection_results):
        """
        Separa resultados por idioma

        Args:
            detection_results: Lista de resultados

        Returns:
            Diccionario {idioma: [resultados]}
        """
        separated = {}

        for result in detection_results:
            lang_name = result.get('language_name', 'Desconocido')

            if lang_name not in separated:
                separated[lang_name] = []

            separated[lang_name].append(result)

        return separated

    def get_language_distribution(self, detection_results):
        """
        Obtiene la distribución de idiomas

        Args:
            detection_results: Lista de resultados

        Returns:
            DataFrame con distribución
        """
        stats = self.create_language_statistics(detection_results)

        data = []
        for lang_name, lang_stats in stats['by_language'].items():
            data.append({
                'Idioma': lang_name,
                'Cantidad': lang_stats['count'],
                'Porcentaje': lang_stats['percentage'],
                'Confianza Promedio': lang_stats['avg_confidence']
            })

        df = pd.DataFrame(data)
        df = df.sort_values('Cantidad', ascending=False)

        return df

    def validate_detection(self, text, expected_language):
        """
        Valida si el texto está en el idioma esperado

        Args:
            text: Texto a validar
            expected_language: Código de idioma esperado

        Returns:
            Diccionario con resultado de validación
        """
        result = self.detect_language(text)

        is_valid = result['language_code'] == expected_language
        confidence = result['confidence']

        message = ("✓ Validado" if is_valid else
                   f"✗ Se esperaba {expected_language}, "
                   f"se detectó {result['language_code']}")

        return {
            'is_valid': is_valid,
            'detected': result['language_code'],
            'expected': expected_language,
            'confidence': confidence,
            'message': message
        }

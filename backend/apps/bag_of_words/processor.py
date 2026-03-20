"""
Bag of Words Processor

Procesamiento en background de análisis BoW usando threading.
"""

import logging
import os
import threading
from datetime import datetime
from typing import List, Dict, Any
import joblib
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from django.core.files.base import ContentFile
from django.utils import timezone

logger = logging.getLogger(__name__)


def process_bag_of_words(bow_id: int):
    """
    Procesar análisis de Bolsa de Palabras en background.

    Args:
        bow_id: ID del análisis BagOfWords a procesar
    """
    from .models import BagOfWords
    from apps.data_preparation.models import DataPreparation

    try:
        bow = BagOfWords.objects.get(id=bow_id)

        logger.info(f"[BoW {bow_id}] Iniciando procesamiento: {bow.name}")

        # Actualizar estado
        bow.status = BagOfWords.STATUS_PROCESSING
        bow.current_stage = BagOfWords.STAGE_LOADING_DATA
        bow.progress_percentage = 10
        bow.processing_started_at = timezone.now()
        bow.save()

        # ETAPA 1: Cargar datos preprocesados
        logger.info(f"[BoW {bow_id}] Cargando datos preprocesados...")
        data_prep = bow.data_preparation

        if data_prep.status != DataPreparation.STATUS_COMPLETED:
            raise ValueError("La preparación de datos no está completada")

        # Obtener textos preprocesados del cache
        texts = load_preprocessed_texts(data_prep)

        if not texts:
            raise ValueError("No se encontraron textos preprocesados")

        logger.info(f"[BoW {bow_id}] ✅ Cargados {len(texts)} documentos")

        bow.document_count = len(texts)
        bow.current_stage = BagOfWords.STAGE_VECTORIZING
        bow.progress_percentage = 30
        bow.save()

        # ETAPA 2: Vectorizar
        logger.info(f"[BoW {bow_id}] Vectorizando con Count Vectorizer...")

        vectorizer, matrix = vectorize_texts(bow, texts)

        logger.info(
            f"[BoW {bow_id}] ✅ Matriz creada: {matrix.shape[0]}x{matrix.shape[1]} "
            f"(sparsity: {calculate_sparsity(matrix):.2%})"
        )

        bow.current_stage = BagOfWords.STAGE_CALCULATING_STATS
        bow.progress_percentage = 60
        bow.save()

        # ETAPA 3: Calcular estadísticas
        logger.info(f"[BoW {bow_id}] Calculando estadísticas...")

        stats = calculate_statistics(vectorizer, matrix)

        bow.current_stage = BagOfWords.STAGE_SAVING_RESULTS
        bow.progress_percentage = 80
        bow.save()

        # ETAPA 4: Guardar resultados
        logger.info(f"[BoW {bow_id}] Guardando resultados...")

        bow.vocabulary_size = len(vectorizer.vocabulary_)
        bow.matrix_shape = {
            'rows': int(matrix.shape[0]),  # Convertir numpy.int64 a int
            'cols': int(matrix.shape[1])   # Convertir numpy.int64 a int
        }
        bow.matrix_sparsity = float(calculate_sparsity(matrix))  # Convertir a float

        # Guardar top términos
        bow.top_terms = stats['top_terms']

        # Guardar vocabulario (solo primeros 5000 para no saturar BD)
        vocab = vectorizer.vocabulary_
        if len(vocab) > 5000:
            # Tomar solo los top términos por importancia
            sorted_vocab = sorted(
                vocab.items(),
                key=lambda x: stats['term_scores'].get(x[0], 0),
                reverse=True
            )[:5000]
            # Convertir valores numpy.int64 a int
            bow.vocabulary = {k: int(v) for k, v in sorted_vocab}
        else:
            # Convertir valores numpy.int64 a int
            bow.vocabulary = {k: int(v) for k, v in vocab.items()}

        # Guardar feature names
        bow.feature_names = vectorizer.get_feature_names_out().tolist()

        # Estadísticas adicionales
        bow.avg_terms_per_document = float(stats['avg_terms_per_doc'])
        bow.total_term_occurrences = int(stats['total_occurrences'])

        # ETAPA 4b: Serializar vectorizador para inferencia futura
        logger.info(f"[BoW {bow_id}] Serializando vectorizador...")
        try:
            import io
            buffer = io.BytesIO()
            joblib.dump(vectorizer, buffer)
            buffer.seek(0)
            artifact_filename = f"bow_{bow_id}_vectorizer.pkl"
            bow.model_artifact.save(artifact_filename, ContentFile(buffer.read()), save=False)
            logger.info(f"[BoW {bow_id}] ✅ Vectorizador serializado: {artifact_filename}")
        except Exception as artifact_error:
            logger.warning(f"[BoW {bow_id}] ⚠️ No se pudo serializar el vectorizador: {artifact_error}")

        # COMPLETADO
        bow.status = BagOfWords.STATUS_COMPLETED
        bow.current_stage = BagOfWords.STAGE_COMPLETED
        bow.progress_percentage = 100
        bow.processing_completed_at = timezone.now()
        bow.save()

        logger.info(f"[BoW {bow_id}] ✅ Procesamiento completado exitosamente")

    except Exception as e:
        logger.exception(f"[BoW {bow_id}] ❌ Error en procesamiento: {str(e)}")

        try:
            bow = BagOfWords.objects.get(id=bow_id)
            bow.status = BagOfWords.STATUS_ERROR
            bow.error_message = str(e)
            bow.progress_percentage = 0
            bow.save()
        except Exception as save_error:
            logger.error(f"[BoW {bow_id}] Error guardando estado de error: {save_error}")


def load_preprocessed_texts(data_prep) -> List[str]:
    """
    Cargar textos preprocesados desde la base de datos.

    Args:
        data_prep: Instancia de DataPreparation

    Returns:
        Lista de textos preprocesados
    """
    from apps.datasets.models import DatasetFile

    try:
        # Obtener IDs de archivos procesados
        file_ids = data_prep.processed_file_ids

        if not file_ids:
            logger.warning(
                f"No hay archivos procesados en preparación {data_prep.id}. "
                f"Asegúrate de que la preparación se completó correctamente."
            )
            return []

        # Cargar archivos desde la base de datos
        files = DatasetFile.objects.filter(id__in=file_ids).only('preprocessed_text')

        # Extraer textos preprocesados
        texts = []
        for file in files:
            if file.preprocessed_text:
                texts.append(file.preprocessed_text)
            else:
                logger.warning(f"Archivo {file.id} no tiene texto preprocesado")

        logger.info(
            f"Cargados {len(texts)} textos preprocesados desde la base de datos "
            f"para preparación {data_prep.id}"
        )

        return texts

    except Exception as e:
        logger.error(f"Error cargando textos preprocesados: {str(e)}")
        return []


def vectorize_texts(bow, texts: List[str]):
    """
    Vectorizar textos usando Count Vectorizer (Bolsa de Palabras).

    Args:
        bow: Instancia de BagOfWords con configuración
        texts: Lista de textos a vectorizar

    Returns:
        Tuple (vectorizer, matrix)
    """
    ngram_range = (bow.ngram_min, bow.ngram_max)

    from apps.data_preparation.stopwords import EXTRA_STOPWORDS

    vectorizer = CountVectorizer(
        max_features=bow.max_features,
        min_df=bow.min_df,
        max_df=bow.max_df,
        ngram_range=ngram_range,
        # Solo tokens alfabéticos de mínimo 3 caracteres.
        # El patrón por defecto (\w\w+) incluye dígitos, lo que permite
        # que años (2018, 2021) y números sueltos (40) entren al vocabulario
        # incluso si el preprocesamiento los eliminó del texto.
        token_pattern=r"(?u)\b[a-zA-Z]{3,}\b",
        # Segunda línea de defensa: stopwords aplicadas en vectorización
        stop_words=list(EXTRA_STOPWORDS),
    )

    matrix = vectorizer.fit_transform(texts)

    return vectorizer, matrix


def calculate_sparsity(matrix) -> float:
    """
    Calcular esparsidad de la matriz (porcentaje de ceros).

    Args:
        matrix: Matriz sparse o densa

    Returns:
        Porcentaje de ceros (0.0 a 1.0)
    """
    total_elements = int(matrix.shape[0]) * int(matrix.shape[1])
    if total_elements == 0:
        return 0.0

    non_zero = matrix.nnz if hasattr(matrix, 'nnz') else int(np.count_nonzero(matrix))
    zero_elements = total_elements - non_zero

    # Convertir a float nativo de Python
    return float(zero_elements / total_elements)


def calculate_statistics(vectorizer, matrix) -> Dict[str, Any]:
    """
    Calcular estadísticas de la matriz documento-término (Count Vectorizer).

    Args:
        vectorizer: Vectorizador CountVectorizer usado
        matrix: Matriz documento-término

    Returns:
        Diccionario con estadísticas
    """
    feature_names = vectorizer.get_feature_names_out()

    # Sumar frecuencias por columna (término)
    term_scores = np.asarray(matrix.sum(axis=0)).flatten()

    # Top términos (los 50 más frecuentes)
    top_indices = term_scores.argsort()[-50:][::-1]
    top_terms = [
        {
            'term': feature_names[i],
            'score': float(term_scores[i]),
            'rank': idx + 1
        }
        for idx, i in enumerate(top_indices)
    ]

    # Crear diccionario término -> score (frecuencia) para uso posterior
    term_score_dict = {
        feature_names[i]: float(term_scores[i])
        for i in range(len(feature_names))
    }

    # Promedio de términos únicos por documento
    terms_per_doc = np.asarray((matrix > 0).sum(axis=1)).flatten()
    avg_terms = float(np.mean(terms_per_doc))

    # Total de ocurrencias (suma de todas las frecuencias)
    # Convertir numpy.int64 a int nativo de Python
    total_occurrences = int(np.sum(matrix))

    return {
        'top_terms': top_terms,
        'term_scores': term_score_dict,
        'avg_terms_per_doc': avg_terms,
        'total_occurrences': total_occurrences,
    }


def start_processing_thread(bow_id: int):
    """
    Iniciar procesamiento en thread de background.

    Args:
        bow_id: ID del análisis BagOfWords a procesar
    """
    thread = threading.Thread(
        target=process_bag_of_words,
        args=(bow_id,),
        daemon=True
    )
    thread.start()
    logger.info(f"Thread de procesamiento BoW iniciado para ID {bow_id}")

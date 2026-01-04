"""
Bag of Words Processor

Procesamiento en background de análisis BoW usando threading.
"""

import logging
import threading
from datetime import datetime
from typing import List, Dict, Any
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
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
            'rows': matrix.shape[0],
            'cols': matrix.shape[1]
        }
        bow.matrix_sparsity = calculate_sparsity(matrix)

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
            bow.vocabulary = dict(sorted_vocab)
        else:
            bow.vocabulary = vocab

        # Guardar feature names
        bow.feature_names = vectorizer.get_feature_names_out().tolist()

        # Estadísticas adicionales
        bow.avg_terms_per_document = stats['avg_terms_per_doc']
        bow.total_term_occurrences = stats['total_occurrences']

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
    Cargar textos preprocesados desde el cache.

    Args:
        data_prep: Instancia de DataPreparation

    Returns:
        Lista de textos preprocesados
    """
    from apps.infrastructure.cache.redis_manager import RedisManager

    try:
        redis_manager = RedisManager()
        cache_key = f"preprocessed_texts:{data_prep.id}"

        # Intentar cargar desde cache
        cached_data = redis_manager.get(cache_key)

        if cached_data and 'processed_texts' in cached_data:
            logger.info(f"Textos cargados desde cache para preparación {data_prep.id}")
            return cached_data['processed_texts']

        logger.warning(
            f"No se encontraron textos en cache para preparación {data_prep.id}. "
            f"Asegúrate de que la preparación guardó los textos en cache."
        )
        return []

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

    vectorizer = CountVectorizer(
        max_features=bow.max_features,
        min_df=bow.min_df,
        max_df=bow.max_df,
        ngram_range=ngram_range,
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
    total_elements = matrix.shape[0] * matrix.shape[1]
    if total_elements == 0:
        return 0.0

    non_zero = matrix.nnz if hasattr(matrix, 'nnz') else np.count_nonzero(matrix)
    zero_elements = total_elements - non_zero

    return zero_elements / total_elements


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
    total_occurrences = int(matrix.sum())

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

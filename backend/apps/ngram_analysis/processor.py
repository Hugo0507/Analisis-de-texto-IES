"""
Ngram Analysis Processor

Procesamiento en background de análisis de múltiples configuraciones de N-gramas.
"""

import logging
import threading
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from django.utils import timezone

logger = logging.getLogger(__name__)


def process_ngram_analysis(ngram_id: int):
    """
    Procesar análisis de N-gramas en background.

    Ejecuta múltiples análisis de Bolsa de Palabras con diferentes
    configuraciones de n-gramas y calcula comparaciones.

    Args:
        ngram_id: ID del análisis NgramAnalysis a procesar
    """
    from .models import NgramAnalysis
    from apps.data_preparation.models import DataPreparation

    try:
        ngram_analysis = NgramAnalysis.objects.get(id=ngram_id)

        logger.info(f"[Ngram {ngram_id}] Iniciando procesamiento: {ngram_analysis.name}")

        # Actualizar estado
        ngram_analysis.status = NgramAnalysis.STATUS_PROCESSING
        ngram_analysis.current_stage = NgramAnalysis.STAGE_LOADING_DATA
        ngram_analysis.progress_percentage = 5
        ngram_analysis.processing_started_at = timezone.now()
        ngram_analysis.save()

        # ETAPA 1: Cargar datos preprocesados (5-15%)
        logger.info(f"[Ngram {ngram_id}] Cargando datos preprocesados...")
        data_prep = ngram_analysis.data_preparation

        if data_prep.status != DataPreparation.STATUS_COMPLETED:
            raise ValueError("La preparación de datos no está completada")

        # Cargar textos preprocesados
        texts = load_preprocessed_texts(data_prep)

        if not texts:
            raise ValueError("No se encontraron textos preprocesados")

        logger.info(f"[Ngram {ngram_id}] ✅ Cargados {len(texts)} documentos")

        ngram_analysis.document_count = len(texts)
        ngram_analysis.current_stage = NgramAnalysis.STAGE_PROCESSING_NGRAMS
        ngram_analysis.progress_percentage = 15
        ngram_analysis.save()

        # ETAPA 2: Procesar cada configuración de n-gramas (15-75%)
        logger.info(f"[Ngram {ngram_id}] Procesando {len(ngram_analysis.ngram_configurations)} configuraciones...")

        results = {}
        vectorizers = {}  # Guardar para comparaciones

        total_configs = len(ngram_analysis.ngram_configurations)
        for idx, config in enumerate(ngram_analysis.ngram_configurations):
            # Progreso de 15% a 75% (60% total / num configs)
            progress = 15 + int((idx / total_configs) * 60)
            ngram_analysis.progress_percentage = progress
            ngram_analysis.save()

            min_n, max_n = config
            config_key = f"{min_n}_{max_n}"

            logger.info(f"[Ngram {ngram_id}] Procesando configuración ({min_n}, {max_n})...")

            # Vectorizar con esta configuración
            vectorizer, matrix = vectorize_texts(
                ngram_analysis, texts, ngram_range=(min_n, max_n)
            )

            # Calcular estadísticas
            stats = calculate_statistics(vectorizer, matrix)

            # Guardar resultados
            results[config_key] = {
                'ngram_range': [min_n, max_n],
                'vocabulary_size': len(vectorizer.vocabulary_),
                'matrix_shape': {
                    'rows': int(matrix.shape[0]),
                    'cols': int(matrix.shape[1])
                },
                'matrix_sparsity': float(calculate_sparsity(matrix)),
                'avg_terms_per_document': float(stats['avg_terms_per_doc']),
                'total_term_occurrences': int(stats['total_occurrences']),
                'top_terms': stats['top_terms'][:30],  # Top 30
                'unique_terms': len(vectorizer.vocabulary_)  # Para comparaciones
            }

            vectorizers[config_key] = vectorizer

            logger.info(
                f"[Ngram {ngram_id}] ✅ ({min_n}, {max_n}): "
                f"{len(vectorizer.vocabulary_)} términos, "
                f"sparsity: {calculate_sparsity(matrix):.2%}"
            )

        ngram_analysis.results = results
        ngram_analysis.current_stage = NgramAnalysis.STAGE_CALCULATING_COMPARISONS
        ngram_analysis.progress_percentage = 75
        ngram_analysis.save()

        # ETAPA 3: Calcular comparaciones (75-90%)
        logger.info(f"[Ngram {ngram_id}] Calculando comparaciones entre configuraciones...")

        comparisons = calculate_comparisons(vectorizers, results)

        ngram_analysis.comparisons = comparisons
        ngram_analysis.current_stage = NgramAnalysis.STAGE_SAVING_RESULTS
        ngram_analysis.progress_percentage = 90
        ngram_analysis.save()

        # ETAPA 4: Finalizar (90-100%)
        logger.info(f"[Ngram {ngram_id}] Guardando resultados finales...")

        ngram_analysis.status = NgramAnalysis.STATUS_COMPLETED
        ngram_analysis.current_stage = NgramAnalysis.STAGE_COMPLETED
        ngram_analysis.progress_percentage = 100
        ngram_analysis.processing_completed_at = timezone.now()
        ngram_analysis.save()

        logger.info(f"[Ngram {ngram_id}] ✅ Procesamiento completado exitosamente")

    except Exception as e:
        logger.exception(f"[Ngram {ngram_id}] ❌ Error en procesamiento: {str(e)}")

        try:
            ngram_analysis = NgramAnalysis.objects.get(id=ngram_id)
            ngram_analysis.status = NgramAnalysis.STATUS_ERROR
            ngram_analysis.error_message = str(e)
            ngram_analysis.progress_percentage = 0
            ngram_analysis.save()
        except Exception as save_error:
            logger.error(f"[Ngram {ngram_id}] Error guardando estado de error: {save_error}")


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
        file_ids = data_prep.processed_file_ids

        if not file_ids:
            logger.warning(
                f"No hay archivos procesados en preparación {data_prep.id}"
            )
            return []

        files = DatasetFile.objects.filter(id__in=file_ids).only('preprocessed_text')

        texts = []
        for file in files:
            if file.preprocessed_text:
                texts.append(file.preprocessed_text)

        logger.info(
            f"Cargados {len(texts)} textos preprocesados para preparación {data_prep.id}"
        )

        return texts

    except Exception as e:
        logger.error(f"Error cargando textos preprocesados: {str(e)}")
        return []


def vectorize_texts(
    ngram_analysis,
    texts: List[str],
    ngram_range: Tuple[int, int]
):
    """
    Vectorizar textos usando Count Vectorizer con configuración específica.

    Args:
        ngram_analysis: Instancia de NgramAnalysis con parámetros
        texts: Lista de textos a vectorizar
        ngram_range: Tupla (min_n, max_n) para n-gramas

    Returns:
        Tuple (vectorizer, matrix)
    """
    vectorizer = CountVectorizer(
        max_features=ngram_analysis.max_features,
        min_df=ngram_analysis.min_df,
        max_df=ngram_analysis.max_df,
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
    total_elements = int(matrix.shape[0]) * int(matrix.shape[1])
    if total_elements == 0:
        return 0.0

    non_zero = matrix.nnz if hasattr(matrix, 'nnz') else int(np.count_nonzero(matrix))
    zero_elements = total_elements - non_zero

    return float(zero_elements / total_elements)


def calculate_statistics(vectorizer, matrix) -> Dict[str, Any]:
    """
    Calcular estadísticas de la matriz documento-término.

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

    # Crear diccionario término -> score
    term_score_dict = {
        feature_names[i]: float(term_scores[i])
        for i in range(len(feature_names))
    }

    # Promedio de términos únicos por documento
    terms_per_doc = np.asarray((matrix > 0).sum(axis=1)).flatten()
    avg_terms = float(np.mean(terms_per_doc))

    # Total de ocurrencias
    total_occurrences = int(np.sum(matrix))

    return {
        'top_terms': top_terms,
        'term_scores': term_score_dict,
        'avg_terms_per_doc': avg_terms,
        'total_occurrences': total_occurrences,
    }


def calculate_comparisons(
    vectorizers: Dict[str, CountVectorizer],
    results: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calcular comparaciones entre configuraciones de n-gramas.

    Calcula:
    - Solapamiento de términos entre pares de configuraciones
    - Términos únicos que aporta cada configuración
    - Vocabulario total combinado

    Args:
        vectorizers: Dict de vectorizers por config_key
        results: Dict de resultados por config_key

    Returns:
        Dict con comparaciones
    """
    config_keys = list(vectorizers.keys())

    # Obtener vocabularios
    vocabularies = {
        key: set(vectorizer.vocabulary_.keys())
        for key, vectorizer in vectorizers.items()
    }

    # Calcular solapamiento entre pares
    overlapping_terms = {}
    for i, key1 in enumerate(config_keys):
        for key2 in config_keys[i+1:]:
            overlap = len(vocabularies[key1] & vocabularies[key2])
            overlapping_terms[f"{key1}_vs_{key2}"] = overlap

    # Calcular contribución única de cada configuración
    # (términos que solo aparecen en esa configuración)
    unique_contributions = {}
    for key in config_keys:
        # Términos de esta configuración
        terms_this = vocabularies[key]

        # Términos de todas las demás configuraciones
        terms_others = set()
        for other_key in config_keys:
            if other_key != key:
                terms_others.update(vocabularies[other_key])

        # Términos únicos de esta configuración
        unique = len(terms_this - terms_others)
        unique_contributions[key] = unique

    # Vocabulario total combinado (unión de todos)
    all_terms = set()
    for vocab in vocabularies.values():
        all_terms.update(vocab)

    # Estadísticas por configuración
    config_stats = {}
    for key in config_keys:
        config_stats[key] = {
            'vocabulary_size': len(vocabularies[key]),
            'unique_contribution': unique_contributions[key],
            'coverage': round(len(vocabularies[key]) / len(all_terms) * 100, 2)  # % del vocabulario total
        }

    return {
        'overlapping_terms': overlapping_terms,
        'unique_contributions': unique_contributions,
        'total_unique_terms': len(all_terms),
        'config_stats': config_stats,
    }


def start_processing_thread(ngram_id: int):
    """
    Iniciar procesamiento en thread de background.

    Args:
        ngram_id: ID del análisis NgramAnalysis a procesar
    """
    thread = threading.Thread(
        target=process_ngram_analysis,
        args=(ngram_id,),
        daemon=True
    )
    thread.start()
    logger.info(f"Thread de procesamiento Ngram iniciado para ID {ngram_id}")

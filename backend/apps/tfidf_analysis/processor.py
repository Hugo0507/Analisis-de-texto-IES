"""
TF-IDF Analysis Processor

Procesador para análisis TF-IDF con múltiples fuentes de origen.
Calcula 3 matrices separadas: TF, IDF y TF-IDF.
"""

import io
import logging
import threading
from datetime import datetime
from typing import Dict, List, Any, Tuple
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from django.core.files.base import ContentFile
from django.utils import timezone

logger = logging.getLogger(__name__)


def process_tfidf_analysis(tfidf_id: int):
    """
    Procesar análisis TF-IDF en background.

    Args:
        tfidf_id: ID del análisis TfIdfAnalysis a procesar
    """
    from .models import TfIdfAnalysis

    try:
        tfidf_analysis = TfIdfAnalysis.objects.get(id=tfidf_id)
    except TfIdfAnalysis.DoesNotExist:
        logger.error(f"TfIdfAnalysis con ID {tfidf_id} no encontrado")
        return

    logger.info(f"[TfIdf {tfidf_id}] Iniciando procesamiento: {tfidf_analysis.name}")

    try:
        # Actualizar estado a processing
        tfidf_analysis.status = TfIdfAnalysis.STATUS_PROCESSING
        tfidf_analysis.processing_started_at = timezone.now()
        tfidf_analysis.current_stage = TfIdfAnalysis.STAGE_LOADING_DATA
        tfidf_analysis.progress_percentage = 10
        tfidf_analysis.save()

        # Paso 1: Cargar datos según el tipo de origen
        logger.info(f"[TfIdf {tfidf_id}] Cargando datos desde {tfidf_analysis.get_source_type_display()}...")
        texts, ngram_range = load_data_by_source(tfidf_analysis)

        tfidf_analysis.document_count = len(texts)
        tfidf_analysis.progress_percentage = 20
        tfidf_analysis.save()

        logger.info(f"[TfIdf {tfidf_id}] ✅ Cargados {len(texts)} documentos")

        # Paso 2: Calcular matriz TF (Term Frequency)
        tfidf_analysis.current_stage = TfIdfAnalysis.STAGE_CALCULATING_TF
        tfidf_analysis.progress_percentage = 30
        tfidf_analysis.save()

        logger.info(f"[TfIdf {tfidf_id}] Calculando matriz TF...")
        tf_matrix_data, feature_names = calculate_tf_matrix(
            texts,
            tfidf_analysis.max_features,
            tfidf_analysis.min_df,
            tfidf_analysis.max_df,
            ngram_range,
            tfidf_analysis.sublinear_tf
        )

        tfidf_analysis.tf_matrix = tf_matrix_data
        tfidf_analysis.vocabulary_size = len(feature_names)
        tfidf_analysis.progress_percentage = 50
        tfidf_analysis.save()

        logger.info(f"[TfIdf {tfidf_id}] ✅ Matriz TF calculada: {tfidf_analysis.vocabulary_size} términos")

        # Paso 3: Calcular vector IDF (Inverse Document Frequency)
        tfidf_analysis.current_stage = TfIdfAnalysis.STAGE_CALCULATING_IDF
        tfidf_analysis.progress_percentage = 60
        tfidf_analysis.save()

        logger.info(f"[TfIdf {tfidf_id}] Calculando vector IDF...")
        idf_vector_data = calculate_idf_vector(
            texts,
            feature_names,
            tfidf_analysis.max_features,
            tfidf_analysis.min_df,
            tfidf_analysis.max_df,
            ngram_range,
            tfidf_analysis.smooth_idf
        )

        tfidf_analysis.idf_vector = idf_vector_data
        tfidf_analysis.progress_percentage = 75
        tfidf_analysis.save()

        logger.info(f"[TfIdf {tfidf_id}] ✅ Vector IDF calculado")

        # Paso 4: Calcular matriz TF-IDF final
        tfidf_analysis.current_stage = TfIdfAnalysis.STAGE_CALCULATING_TFIDF
        tfidf_analysis.progress_percentage = 85
        tfidf_analysis.save()

        logger.info(f"[TfIdf {tfidf_id}] Calculando matriz TF-IDF...")
        tfidf_matrix_data, tfidf_vectorizer = calculate_tfidf_matrix(
            texts,
            tfidf_analysis.max_features,
            tfidf_analysis.min_df,
            tfidf_analysis.max_df,
            ngram_range,
            tfidf_analysis.use_idf,
            tfidf_analysis.smooth_idf,
            tfidf_analysis.sublinear_tf
        )

        tfidf_analysis.tfidf_matrix = tfidf_matrix_data
        tfidf_analysis.progress_percentage = 95
        tfidf_analysis.save()

        logger.info(f"[TfIdf {tfidf_id}] ✅ Matriz TF-IDF calculada")

        # Serializar vectorizador TF-IDF para inferencia futura
        logger.info(f"[TfIdf {tfidf_id}] Serializando vectorizador TF-IDF...")
        try:
            buffer = io.BytesIO()
            joblib.dump(tfidf_vectorizer, buffer)
            buffer.seek(0)
            artifact_filename = f"tfidf_{tfidf_id}_vectorizer.pkl"
            tfidf_analysis.vectorizer_artifact.save(artifact_filename, ContentFile(buffer.read()), save=False)
            logger.info(f"[TfIdf {tfidf_id}] ✅ Vectorizador TF-IDF serializado: {artifact_filename}")
        except Exception as artifact_error:
            logger.warning(f"[TfIdf {tfidf_id}] ⚠️ No se pudo serializar el vectorizador: {artifact_error}")

        # Finalizar
        tfidf_analysis.current_stage = TfIdfAnalysis.STAGE_COMPLETED
        tfidf_analysis.status = TfIdfAnalysis.STATUS_COMPLETED
        tfidf_analysis.progress_percentage = 100
        tfidf_analysis.processing_completed_at = timezone.now()
        tfidf_analysis.save()

        logger.info(f"[TfIdf {tfidf_id}] ✅ Procesamiento completado exitosamente")

    except Exception as e:
        logger.error(f"[TfIdf {tfidf_id}] ❌ Error: {str(e)}", exc_info=True)
        tfidf_analysis.status = TfIdfAnalysis.STATUS_ERROR
        tfidf_analysis.error_message = str(e)
        tfidf_analysis.save()


def load_data_by_source(tfidf_analysis) -> Tuple[List[str], Tuple[int, int]]:
    """
    Cargar textos y ngram_range según el tipo de origen.

    Returns:
        Tuple (texts, ngram_range)
    """
    from apps.datasets.models import DatasetFile

    source_type = tfidf_analysis.source_type

    # Caso 1: Desde preparación de datos directamente
    if source_type == 'data_preparation':
        prep = tfidf_analysis.data_preparation
        if not prep or prep.status != 'completed':
            raise ValueError("Preparación de datos no está completada")

        # Obtener textos usando processed_file_ids
        file_ids = prep.processed_file_ids
        if not file_ids:
            raise ValueError("No hay archivos procesados en la preparación de datos")

        files = DatasetFile.objects.filter(id__in=file_ids).only('preprocessed_text')
        texts = [f.preprocessed_text for f in files if f.preprocessed_text]
        ngram_range = (tfidf_analysis.ngram_min, tfidf_analysis.ngram_max)

        logger.info(f"Cargados {len(texts)} textos de preparación de datos")
        return texts, ngram_range

    # Caso 2: Desde Bolsa de Palabras
    elif source_type == 'bag_of_words':
        bow = tfidf_analysis.bag_of_words
        if not bow or bow.status != 'completed':
            raise ValueError("Bolsa de Palabras no está completada")

        prep = bow.data_preparation
        file_ids = prep.processed_file_ids
        if not file_ids:
            raise ValueError("No hay archivos procesados en la preparación de datos")

        files = DatasetFile.objects.filter(id__in=file_ids).only('preprocessed_text')
        texts = [f.preprocessed_text for f in files if f.preprocessed_text]
        ngram_range = (bow.ngram_min, bow.ngram_max)

        logger.info(f"Cargados {len(texts)} textos de Bolsa de Palabras con ngram_range {ngram_range}")
        return texts, ngram_range

    # Caso 3: Configuración específica de N-grama
    elif source_type == 'ngram_config':
        ngram = tfidf_analysis.ngram_analysis
        if not ngram or ngram.status != 'completed':
            raise ValueError("Análisis de N-gramas no está completado")

        # Parse ngram_config (ej: "2_2" -> (2, 2))
        config_str = tfidf_analysis.ngram_config
        try:
            parts = config_str.split('_')
            ngram_range = (int(parts[0]), int(parts[1]))
        except:
            raise ValueError(f"Configuración N-grama inválida: {config_str}")

        prep = ngram.data_preparation
        file_ids = prep.processed_file_ids
        if not file_ids:
            raise ValueError("No hay archivos procesados en la preparación de datos")

        files = DatasetFile.objects.filter(id__in=file_ids).only('preprocessed_text')
        texts = [f.preprocessed_text for f in files if f.preprocessed_text]

        logger.info(f"Cargados {len(texts)} textos de N-grama config {ngram_range}")
        return texts, ngram_range

    # Caso 4: Todas las configuraciones de N-grama (usar la más amplia)
    elif source_type == 'ngram_all':
        ngram = tfidf_analysis.ngram_analysis
        if not ngram or ngram.status != 'completed':
            raise ValueError("Análisis de N-gramas no está completado")

        # Encontrar el rango más amplio de todas las configuraciones
        configs = ngram.ngram_configurations
        if not configs:
            raise ValueError("No hay configuraciones de N-gramas")

        min_n = min(c[0] for c in configs)
        max_n = max(c[1] for c in configs)
        ngram_range = (min_n, max_n)

        prep = ngram.data_preparation
        file_ids = prep.processed_file_ids
        if not file_ids:
            raise ValueError("No hay archivos procesados en la preparación de datos")

        files = DatasetFile.objects.filter(id__in=file_ids).only('preprocessed_text')
        texts = [f.preprocessed_text for f in files if f.preprocessed_text]

        logger.info(f"Cargados {len(texts)} textos de TODAS las configs N-grama con rango {ngram_range}")
        return texts, ngram_range

    # Caso 5: Vocabulario completo de N-grama
    elif source_type == 'ngram_vocabulary':
        ngram = tfidf_analysis.ngram_analysis
        if not ngram or ngram.status != 'completed':
            raise ValueError("Análisis de N-gramas no está completado")

        # Usar todo el vocabulario único (unión de todos los términos)
        configs = ngram.ngram_configurations
        if not configs:
            raise ValueError("No hay configuraciones de N-gramas")

        min_n = min(c[0] for c in configs)
        max_n = max(c[1] for c in configs)
        ngram_range = (min_n, max_n)

        prep = ngram.data_preparation
        file_ids = prep.processed_file_ids
        if not file_ids:
            raise ValueError("No hay archivos procesados en la preparación de datos")

        files = DatasetFile.objects.filter(id__in=file_ids).only('preprocessed_text')
        texts = [f.preprocessed_text for f in files if f.preprocessed_text]

        logger.info(f"Cargados {len(texts)} textos del vocabulario completo N-grama con rango {ngram_range}")
        return texts, ngram_range

    else:
        raise ValueError(f"Tipo de origen no soportado: {source_type}")


def calculate_tf_matrix(
    texts: List[str],
    max_features: int,
    min_df: int,
    max_df: float,
    ngram_range: Tuple[int, int],
    sublinear_tf: bool
) -> Tuple[Dict[str, Any], List[str]]:
    """
    Calcular matriz TF (Term Frequency).

    Returns:
        Tuple (tf_matrix_data, feature_names)
    """
    from apps.data_preparation.stopwords import EXTRA_STOPWORDS

    vectorizer = CountVectorizer(
        max_features=max_features,
        min_df=min_df,
        max_df=max_df,
        ngram_range=ngram_range,
        token_pattern=r"(?u)\b[a-zA-Z]{3,}\b",
        stop_words=list(EXTRA_STOPWORDS),
    )

    matrix = vectorizer.fit_transform(texts)
    feature_names = vectorizer.get_feature_names_out()

    # Aplicar sublinear_tf si está activado
    if sublinear_tf:
        matrix = matrix.astype(float)
        matrix.data = 1 + np.log(matrix.data)

    # Calcular estadísticas
    matrix_dense = matrix.toarray() if hasattr(matrix, 'toarray') else matrix
    term_frequencies = matrix_dense.sum(axis=0)

    # Top términos por TF
    top_indices = term_frequencies.argsort()[-50:][::-1]
    top_terms_by_tf = [
        {
            'term': feature_names[i],
            'score': float(term_frequencies[i]),
            'rank': idx + 1
        }
        for idx, i in enumerate(top_indices)
    ]

    # Calcular promedio de TF por documento
    terms_per_doc = (matrix > 0).sum(axis=1)
    avg_tf_per_document = float(np.mean(terms_per_doc))

    # Calcular sparsity
    total_elements = matrix.shape[0] * matrix.shape[1]
    non_zero = matrix.nnz if hasattr(matrix, 'nnz') else int(np.count_nonzero(matrix))
    sparsity = (total_elements - non_zero) / total_elements

    tf_matrix_data = {
        'matrix_shape': {
            'rows': int(matrix.shape[0]),
            'cols': int(matrix.shape[1])
        },
        'matrix_sparsity': round(float(sparsity), 4),
        'top_terms_by_tf': top_terms_by_tf,
        'avg_tf_per_document': round(avg_tf_per_document, 2),
        'sublinear_applied': sublinear_tf
    }

    return tf_matrix_data, feature_names


def calculate_idf_vector(
    texts: List[str],
    feature_names: List[str],
    max_features: int,
    min_df: int,
    max_df: float,
    ngram_range: Tuple[int, int],
    smooth_idf: bool
) -> Dict[str, Any]:
    """
    Calcular vector IDF (Inverse Document Frequency).
    """
    from apps.data_preparation.stopwords import EXTRA_STOPWORDS

    vectorizer = TfidfVectorizer(
        max_features=max_features,
        min_df=min_df,
        max_df=max_df,
        ngram_range=ngram_range,
        use_idf=True,
        smooth_idf=smooth_idf,
        sublinear_tf=False,
        token_pattern=r"(?u)\b[a-zA-Z]{3,}\b",
        stop_words=list(EXTRA_STOPWORDS),
    )

    vectorizer.fit(texts)

    # Obtener valores IDF
    idf_values = {}
    for term, idx in vectorizer.vocabulary_.items():
        if idx < len(vectorizer.idf_):
            idf_values[term] = float(vectorizer.idf_[idx])

    # Ordenar términos por IDF
    sorted_terms = sorted(idf_values.items(), key=lambda x: x[1], reverse=True)

    # Top términos por IDF (más raros/específicos)
    top_terms_by_idf = [
        {
            'term': term,
            'idf': round(idf, 4),
            'rank': idx + 1
        }
        for idx, (term, idf) in enumerate(sorted_terms[:50])
    ]

    # Bottom términos por IDF (más comunes)
    bottom_terms_by_idf = [
        {
            'term': term,
            'idf': round(idf, 4),
            'rank': idx + 1
        }
        for idx, (term, idf) in enumerate(sorted_terms[-50:][::-1])
    ]

    # Promedio de IDF
    avg_idf = np.mean(list(idf_values.values()))

    idf_vector_data = {
        'idf_values': {k: round(v, 4) for k, v in list(idf_values.items())[:1000]},  # Limitar a 1000 para performance
        'top_terms_by_idf': top_terms_by_idf,
        'bottom_terms_by_idf': bottom_terms_by_idf,
        'avg_idf': round(float(avg_idf), 4),
        'smooth_applied': smooth_idf
    }

    return idf_vector_data


def calculate_tfidf_matrix(
    texts: List[str],
    max_features: int,
    min_df: int,
    max_df: float,
    ngram_range: Tuple[int, int],
    use_idf: bool,
    smooth_idf: bool,
    sublinear_tf: bool
) -> Tuple[Dict[str, Any], TfidfVectorizer]:
    """
    Calcular matriz TF-IDF final.

    Returns:
        Tuple (tfidf_matrix_data, vectorizer) — vectorizer is returned for artifact serialization
    """
    from apps.data_preparation.stopwords import EXTRA_STOPWORDS

    vectorizer = TfidfVectorizer(
        max_features=max_features,
        min_df=min_df,
        max_df=max_df,
        ngram_range=ngram_range,
        use_idf=use_idf,
        smooth_idf=smooth_idf,
        sublinear_tf=sublinear_tf,
        token_pattern=r"(?u)\b[a-zA-Z]{3,}\b",
        stop_words=list(EXTRA_STOPWORDS),
    )

    matrix = vectorizer.fit_transform(texts)
    feature_names = vectorizer.get_feature_names_out()

    # Calcular scores TF-IDF por término
    matrix_dense = matrix.toarray() if hasattr(matrix, 'toarray') else matrix
    tfidf_scores = matrix_dense.sum(axis=0)

    # Top términos por TF-IDF
    top_indices = tfidf_scores.argsort()[-50:][::-1]
    top_terms = [
        {
            'term': feature_names[i],
            'score': round(float(tfidf_scores[i]), 4),
            'rank': idx + 1
        }
        for idx, i in enumerate(top_indices)
    ]

    # Promedio de TF-IDF por documento
    avg_tfidf_per_doc = float(np.mean(matrix_dense.sum(axis=1)))

    # Score total
    total_score = float(np.sum(tfidf_scores))

    # Calcular sparsity
    total_elements = matrix.shape[0] * matrix.shape[1]
    non_zero = matrix.nnz if hasattr(matrix, 'nnz') else int(np.count_nonzero(matrix))
    sparsity = (total_elements - non_zero) / total_elements

    tfidf_matrix_data = {
        'matrix_shape': {
            'rows': int(matrix.shape[0]),
            'cols': int(matrix.shape[1])
        },
        'matrix_sparsity': round(float(sparsity), 4),
        'top_terms': top_terms,
        'avg_tfidf_per_document': round(avg_tfidf_per_doc, 4),
        'total_score': round(total_score, 2)
    }

    return tfidf_matrix_data, vectorizer


def start_processing_thread(tfidf_id: int):
    """
    Iniciar procesamiento en thread de background.

    Args:
        tfidf_id: ID del análisis TfIdfAnalysis a procesar
    """
    thread = threading.Thread(
        target=process_tfidf_analysis,
        args=(tfidf_id,),
        daemon=True
    )
    thread.start()
    logger.info(f"Thread de procesamiento TF-IDF iniciado para ID {tfidf_id}")

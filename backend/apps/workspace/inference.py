"""
Workspace Inference

Inferencia sobre nuevos documentos usando modelos previamente entrenados.
Modo B: transform() sin reentrenamiento. Los pesos IDF y espacios de tópicos
del corpus original se preservan para resultados comparables.
"""

import io
import logging
from typing import List, Dict, Any

import joblib
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

logger = logging.getLogger(__name__)


def _load_from_binary(binary_data) -> Any:
    """Cargar artefacto desde BinaryField (datos en DB)."""
    if not binary_data:
        return None
    # psycopg2 devuelve memoryview para bytea; convertir a bytes
    # para evitar corrupción de heap con joblib/numpy en subprocesos
    if isinstance(binary_data, memoryview):
        binary_data = bytes(binary_data)
    buffer = io.BytesIO(binary_data)
    return joblib.load(buffer)


def _load_from_file(artifact_field) -> Any:
    """Cargar artefacto desde FileField (filesystem). Fallback."""
    if not artifact_field or not artifact_field.name:
        return None
    try:
        artifact_field.open('rb')
        try:
            return joblib.load(artifact_field)
        finally:
            artifact_field.close()
    except (FileNotFoundError, OSError):
        return None


def load_artifact(model_instance, bin_field_name: str, file_field_name: str) -> Any:
    """
    Cargar artefacto con fallback:
      1. BinaryField (DB) — siempre disponible en producción
      2. FileField (filesystem) — funciona en desarrollo local
      3. Error si ambos fallan
    """
    # Intentar desde DB primero
    bin_data = getattr(model_instance, bin_field_name, None)
    obj = _load_from_binary(bin_data)
    if obj is not None:
        return obj

    # Fallback a filesystem
    file_field = getattr(model_instance, file_field_name, None)
    obj = _load_from_file(file_field)
    if obj is not None:
        return obj

    raise FileNotFoundError(
        f'No se encontró el artefacto {bin_field_name} '
        f'ni en DB ni en filesystem. '
        f'Reejecutar el análisis para regenerar.'
    )


def infer_bow(texts: List[str], bow_id: int) -> Dict[str, Any]:
    """
    Inferencia BoW sobre nuevos textos usando vectorizador entrenado.

    Args:
        texts: Textos preprocesados a analizar
        bow_id: ID del análisis BagOfWords de referencia

    Returns:
        Diccionario con top_terms, matrix_shape, sparsity, avg_terms_per_doc
    """
    from apps.bag_of_words.models import BagOfWords

    bow = BagOfWords.objects.get(id=bow_id)

    vectorizer: CountVectorizer = load_artifact(bow, 'model_artifact_bin', 'model_artifact')

    # Inferencia: transform preserva el vocabulario del corpus original
    matrix = vectorizer.transform(texts)
    feature_names = vectorizer.get_feature_names_out()

    term_scores = np.asarray(matrix.sum(axis=0)).flatten()
    top_indices = term_scores.argsort()[-50:][::-1]
    top_terms = [
        {'term': feature_names[i], 'score': float(term_scores[i]), 'rank': idx + 1}
        for idx, i in enumerate(top_indices)
        if term_scores[i] > 0
    ]

    total_elements = matrix.shape[0] * matrix.shape[1]
    non_zero = matrix.nnz
    sparsity = float((total_elements - non_zero) / total_elements) if total_elements > 0 else 0.0

    terms_per_doc = np.asarray((matrix > 0).sum(axis=1)).flatten()
    avg_terms = float(np.mean(terms_per_doc)) if len(terms_per_doc) > 0 else 0.0

    return {
        'top_terms': top_terms,
        'matrix_shape': {'rows': int(matrix.shape[0]), 'cols': int(matrix.shape[1])},
        'matrix_sparsity': round(sparsity, 4),
        'avg_terms_per_document': round(avg_terms, 2),
        'total_term_occurrences': int(matrix.sum()),
        'vocabulary_size': len(vectorizer.vocabulary_),
        'reference_bow_id': bow_id,
        'reference_bow_name': bow.name,
    }


def infer_tfidf(texts: List[str], tfidf_id: int) -> Dict[str, Any]:
    """
    Inferencia TF-IDF sobre nuevos textos usando vectorizador entrenado.

    Los pesos IDF del corpus original se preservan — los scores son
    comparables con los del corpus de entrenamiento.

    Args:
        texts: Textos preprocesados a analizar
        tfidf_id: ID del análisis TfIdfAnalysis de referencia

    Returns:
        Diccionario con top_terms, matrix_shape, sparsity
    """
    from apps.tfidf_analysis.models import TfIdfAnalysis

    tfidf = TfIdfAnalysis.objects.get(id=tfidf_id)

    vectorizer: TfidfVectorizer = load_artifact(tfidf, 'vectorizer_artifact_bin', 'vectorizer_artifact')

    # Inferencia: transform usa los IDF aprendidos del corpus
    matrix = vectorizer.transform(texts)
    feature_names = vectorizer.get_feature_names_out()

    matrix_dense = matrix.toarray()
    tfidf_scores = matrix_dense.sum(axis=0)
    top_indices = tfidf_scores.argsort()[-50:][::-1]
    top_terms = [
        {'term': feature_names[i], 'score': round(float(tfidf_scores[i]), 4), 'rank': idx + 1}
        for idx, i in enumerate(top_indices)
        if tfidf_scores[i] > 0
    ]

    total_elements = matrix.shape[0] * matrix.shape[1]
    non_zero = matrix.nnz
    sparsity = float((total_elements - non_zero) / total_elements) if total_elements > 0 else 0.0

    return {
        'top_terms': top_terms,
        'matrix_shape': {'rows': int(matrix.shape[0]), 'cols': int(matrix.shape[1])},
        'matrix_sparsity': round(sparsity, 4),
        'avg_tfidf_per_document': round(float(np.mean(matrix_dense.sum(axis=1))), 4),
        'reference_tfidf_id': tfidf_id,
        'reference_tfidf_name': tfidf.name,
    }


def infer_topics(texts: List[str], topic_model_id: int) -> Dict[str, Any]:
    """
    Inferencia de tópicos sobre nuevos textos usando modelo entrenado.

    El espacio de tópicos del corpus original se preserva — permite
    asignar documentos nuevos a los mismos tópicos del corpus.

    Args:
        texts: Textos preprocesados a analizar
        topic_model_id: ID del TopicModeling de referencia

    Returns:
        Diccionario con document_topics, dominant_topics, topic_distribution
    """
    from apps.topic_modeling.models import TopicModeling

    tm = TopicModeling.objects.get(id=topic_model_id)

    vectorizer = load_artifact(tm, 'vectorizer_artifact_bin', 'vectorizer_artifact')
    model = load_artifact(tm, 'model_artifact_bin', 'model_artifact')

    # Vectorizar nuevos textos con vocabulario del corpus
    doc_term_matrix = vectorizer.transform(texts)

    # Inferir distribución de tópicos (transform, no fit_transform)
    doc_topic_matrix = model.transform(doc_term_matrix)

    # Construir resultados por documento
    document_topics = []
    for idx, topic_dist in enumerate(doc_topic_matrix):
        dominant_topic = int(np.argmax(topic_dist))
        document_topics.append({
            'document_index': idx,
            'dominant_topic': dominant_topic,
            'dominant_topic_weight': round(float(topic_dist[dominant_topic]), 4),
            'topic_distribution': [round(float(w), 4) for w in topic_dist],
        })

    # Distribución global de tópicos dominantes
    dominant_counts = {}
    for doc in document_topics:
        t = doc['dominant_topic']
        dominant_counts[t] = dominant_counts.get(t, 0) + 1

    topic_distribution = []
    corpus_topics = {t['topic_id']: t for t in tm.topics}
    for topic_id, count in sorted(dominant_counts.items()):
        corpus_topic = corpus_topics.get(topic_id, {})
        topic_distribution.append({
            'topic_id': topic_id,
            'topic_label': corpus_topic.get('topic_label', f'Tópico {topic_id}'),
            'document_count': count,
            'percentage': round(count / len(texts) * 100, 1),
        })

    return {
        'document_topics': document_topics,
        'topic_distribution': topic_distribution,
        'num_topics': tm.num_topics,
        'algorithm': tm.algorithm,
        'corpus_topics': tm.topics,
        'reference_topic_model_id': topic_model_id,
        'reference_topic_model_name': tm.name,
    }


def preprocess_for_inference(text: str) -> str:
    """
    Preprocesamiento básico para texto extraído de PDFs nuevos.

    Normalización mínima consistente con el preprocesamiento del corpus.
    """
    import re
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

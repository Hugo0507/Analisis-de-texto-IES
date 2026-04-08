"""
Workspace Inference

Inferencia sobre nuevos documentos usando modelos previamente entrenados.
Modo B: transform() sin reentrenamiento. Los pesos IDF y espacios de tópicos
del corpus original se preservan para resultados comparables.
"""

import io
import logging
import re
from typing import List, Dict, Any, Optional, Set

import joblib
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

logger = logging.getLogger(__name__)


# ── Carga de artefactos ──────────────────────────────────────────────────────

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
    bin_data = getattr(model_instance, bin_field_name, None)
    obj = _load_from_binary(bin_data)
    if obj is not None:
        return obj

    file_field = getattr(model_instance, file_field_name, None)
    obj = _load_from_file(file_field)
    if obj is not None:
        return obj

    raise FileNotFoundError(
        f'No se encontró el artefacto {bin_field_name} '
        f'ni en DB ni en filesystem. '
        f'Reejecutar el análisis para regenerar.'
    )


# ── Pre-carga de artefactos (solo Topic Model; BoW y TF-IDF usan JSON) ───────

def preload_inference_artifacts(workspace) -> Dict[str, Any]:
    """
    Cargar artefactos ML necesarios para inferencia de Topic Model.

    BoW y TF-IDF ya NO usan joblib/scipy; sus matrices se construyen con
    numpy puro desde los campos JSON (vocabulary / idf_values) de la DB.
    Esto evita el `double free or corruption` (!prev) causado por scipy
    sparse matrix C code al llamar CountVectorizer.transform().

    Returns:
        dict con claves opcionales:
          'topic_vectorizer'  -> vectorizador del TopicModel
          'topic_model'       -> modelo LDA/NMF
    """
    preloaded: Dict[str, Any] = {}

    if workspace.topic_model_id:
        try:
            from apps.topic_modeling.models import TopicModeling
            tm = TopicModeling.objects.get(id=workspace.topic_model_id)
            preloaded['topic_vectorizer'] = load_artifact(
                tm, 'vectorizer_artifact_bin', 'vectorizer_artifact'
            )
            preloaded['topic_model'] = load_artifact(
                tm, 'model_artifact_bin', 'model_artifact'
            )
            logger.info(f"[WS {workspace.id}] Artefactos Topic Model #{workspace.topic_model_id} pre-cargados.")
        except FileNotFoundError as e:
            logger.warning(
                f"[WS {workspace.id}] Topic Model #{workspace.topic_model_id} sin artefacto — "
                f"inferencia de tópicos será omitida. "
                f"Re-ejecuta el análisis de Topic Modeling para regenerar. Detalle: {e}"
            )

    return preloaded


# ── Inferencia BoW ───────────────────────────────────────────────────────────

def infer_bow(
    texts: List[str],
    bow_id: int,
    preloaded_vectorizer: Optional[CountVectorizer] = None,
    num_top_terms: int = 50,
) -> Dict[str, Any]:
    """
    Inferencia BoW usando numpy puro (sin sklearn CountVectorizer.transform).

    El vocabulario se lee directamente del campo JSON de BagOfWords para
    evitar la corrupción de heap (double free) causada por scipy sparse C code.
    """
    from apps.bag_of_words.models import BagOfWords

    bow = BagOfWords.objects.get(id=bow_id)
    vocab: Dict[str, int] = bow.vocabulary or {}
    if not vocab:
        raise ValueError(f"BoW #{bow_id} no tiene vocabulario disponible en DB.")

    vocab_size = max(vocab.values()) + 1
    n_docs = len(texts)

    # Construir matriz de conteo con numpy puro (sin scipy sparse)
    matrix = np.zeros((n_docs, vocab_size), dtype=np.int32)
    for row_idx, text in enumerate(texts):
        for token in text.split():
            idx = vocab.get(token)
            if idx is not None:
                matrix[row_idx, idx] += 1

    # Mapa inverso índice → término para las stats
    idx_to_term = [''] * vocab_size
    for term, idx in vocab.items():
        if idx < vocab_size:
            idx_to_term[idx] = term

    term_scores = matrix.sum(axis=0)
    top_indices = term_scores.argsort()[-num_top_terms:][::-1]
    top_terms = [
        {'term': idx_to_term[i], 'score': float(term_scores[i]), 'rank': rank + 1}
        for rank, i in enumerate(top_indices)
        if term_scores[i] > 0
    ]

    total_elements = n_docs * vocab_size
    non_zero = int(np.count_nonzero(matrix))
    sparsity = float((total_elements - non_zero) / total_elements) if total_elements > 0 else 0.0

    terms_per_doc = (matrix > 0).sum(axis=1)
    avg_terms = float(np.mean(terms_per_doc)) if n_docs > 0 else 0.0

    return {
        'top_terms': top_terms,
        'matrix_shape': {'rows': n_docs, 'cols': vocab_size},
        'matrix_sparsity': round(sparsity, 4),
        'avg_terms_per_document': round(avg_terms, 2),
        'total_term_occurrences': int(matrix.sum()),
        'vocabulary_size': vocab_size,
        'reference_bow_id': bow_id,
        'reference_bow_name': bow.name,
    }


# ── Inferencia TF-IDF ───────────────────────────────────────────────────────

def infer_tfidf(
    texts: List[str],
    tfidf_id: int,
    preloaded_vectorizer: Optional[TfidfVectorizer] = None,
    num_top_terms: int = 50,
) -> Dict[str, Any]:
    """
    Inferencia TF-IDF usando numpy puro (sin TfidfVectorizer.transform).

    Los pesos IDF se leen directamente de idf_vector['idf_values'] en DB
    para evitar la corrupción de heap causada por scipy sparse C code.
    """
    from apps.tfidf_analysis.models import TfIdfAnalysis

    tfidf = TfIdfAnalysis.objects.get(id=tfidf_id)
    idf_values: Dict[str, float] = (tfidf.idf_vector or {}).get('idf_values', {})
    if not idf_values:
        raise ValueError(f"TF-IDF #{tfidf_id} no tiene idf_values disponibles en DB.")

    # Orden consistente de términos
    terms = sorted(idf_values.keys())
    vocab = {term: i for i, term in enumerate(terms)}
    idf_array = np.array([idf_values[t] for t in terms], dtype=np.float64)
    vocab_size = len(terms)
    n_docs = len(texts)

    # Matriz TF con numpy puro
    tf_matrix = np.zeros((n_docs, vocab_size), dtype=np.float64)
    for row_idx, text in enumerate(texts):
        for token in text.split():
            idx = vocab.get(token)
            if idx is not None:
                tf_matrix[row_idx, idx] += 1.0

    # Aplicar IDF y normalizar L2 (replica TfidfVectorizer con norm='l2')
    tfidf_matrix = tf_matrix * idf_array
    row_norms = np.linalg.norm(tfidf_matrix, axis=1, keepdims=True)
    row_norms[row_norms == 0] = 1.0
    tfidf_matrix = tfidf_matrix / row_norms

    tfidf_scores = tfidf_matrix.sum(axis=0)
    top_indices = tfidf_scores.argsort()[-num_top_terms:][::-1]
    top_terms = [
        {'term': terms[i], 'score': round(float(tfidf_scores[i]), 4), 'rank': rank + 1}
        for rank, i in enumerate(top_indices)
        if tfidf_scores[i] > 0
    ]

    total_elements = n_docs * vocab_size
    non_zero = int(np.count_nonzero(tfidf_matrix))
    sparsity = float((total_elements - non_zero) / total_elements) if total_elements > 0 else 0.0

    return {
        'top_terms': top_terms,
        'matrix_shape': {'rows': n_docs, 'cols': vocab_size},
        'matrix_sparsity': round(sparsity, 4),
        'avg_tfidf_per_document': round(float(np.mean(tfidf_matrix.sum(axis=1))), 4),
        'reference_tfidf_id': tfidf_id,
        'reference_tfidf_name': tfidf.name,
    }


# ── Inferencia Topics ────────────────────────────────────────────────────────

def infer_topics(
    texts: List[str],
    topic_model_id: int,
    preloaded_vectorizer=None,
    preloaded_model=None,
) -> Dict[str, Any]:
    """
    Args:
        texts: Textos preprocesados.
        topic_model_id: ID del modelo TopicModeling de referencia.
        preloaded_vectorizer: Vectorizador pre-cargado (evita joblib.load() tras spaCy).
        preloaded_model: Modelo LDA/NMF pre-cargado.
    """
    from apps.topic_modeling.models import TopicModeling

    tm = TopicModeling.objects.get(id=topic_model_id)
    if preloaded_vectorizer is not None and preloaded_model is not None:
        vectorizer = preloaded_vectorizer
        model = preloaded_model
    else:
        vectorizer = load_artifact(tm, 'vectorizer_artifact_bin', 'vectorizer_artifact')
        model = load_artifact(tm, 'model_artifact_bin', 'model_artifact')

    doc_term_matrix = vectorizer.transform(texts)
    doc_topic_matrix = model.transform(doc_term_matrix)

    # Resultados por documento con distribución completa
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
            'topic_label': corpus_topic.get('topic_label', f'Tema {topic_id}'),
            'document_count': count,
            'percentage': round(count / len(texts) * 100, 1),
        })

    # Distribución promedio sobre TODOS los tópicos (no solo dominantes)
    # Esto permite al frontend mostrar la afinidad del documento con cada tópico
    avg_distribution = np.mean(doc_topic_matrix, axis=0)
    all_topics_affinity = []
    for topic_id in range(len(avg_distribution)):
        corpus_topic = corpus_topics.get(topic_id, {})
        weight = float(avg_distribution[topic_id])
        if weight > 0.001:  # Solo tópicos con afinidad mínima
            all_topics_affinity.append({
                'topic_id': topic_id,
                'topic_label': corpus_topic.get('topic_label', f'Tema {topic_id}'),
                'top_words': corpus_topic.get('top_words', [])[:10],
                'weight': round(weight, 4),
                'percentage': round(weight * 100, 1),
            })
    all_topics_affinity.sort(key=lambda x: x['weight'], reverse=True)

    return {
        'document_topics': document_topics,
        'topic_distribution': topic_distribution,
        'all_topics_affinity': all_topics_affinity,
        'num_topics': tm.num_topics,
        'algorithm': tm.algorithm,
        'corpus_topics': tm.topics,
        'reference_topic_model_id': topic_model_id,
        'reference_topic_model_name': tm.name,
    }


# ── Preprocesamiento para inferencia ─────────────────────────────────────────

# Patrones compilados para limpieza de texto de PDFs
_RE_URL = re.compile(r'https?://\S+|www\.\S+', re.IGNORECASE)
_RE_EMAIL = re.compile(r'\S+@\S+\.\S+')
_RE_DOI = re.compile(r'\b(?:doi|DOI)[:\s]*10\.\S+')
_RE_ISBN = re.compile(r'\b(?:ISBN|ISSN)[:\s\-]*[\d\-Xx]+', re.IGNORECASE)
_RE_PAGE_NUMBERS = re.compile(r'\b(?:pp?\.|pages?)\s*\d+[\s\-–]+\d+', re.IGNORECASE)
_RE_CITATION_BRACKETS = re.compile(r'\[[\d,;\s\-–]+\]')
_RE_CITATION_PARENS = re.compile(r'\(\s*(?:[A-Z][a-z]+(?:\s+(?:et\s+al\.?|&|and)\s*)?(?:,?\s*\d{4})\s*(?:;\s*)?)+\)')
_RE_NUMBERS_STANDALONE = re.compile(r'\b\d+(?:\.\d+)?\b')
_RE_NON_ALPHA = re.compile(r'[^a-zA-Z\s]')
_RE_MULTI_SPACE = re.compile(r'\s+')
_RE_SHORT_WORDS = re.compile(r'\b[a-zA-Z]\b')

# Sección de referencias: líneas que comienzan con "References", "Bibliography", etc.
_RE_REFERENCES_SECTION = re.compile(
    r'\n\s*(?:references|bibliography|bibliograf[íi]a|works?\s+cited|literatura\s+citada)\s*\n',
    re.IGNORECASE,
)


def get_inference_stopwords(
    dataset_id: Optional[int] = None,
    language: str = 'en',
) -> Set[str]:
    """
    Obtener las mismas stopwords usadas en el preprocesamiento del corpus.

    Combina EXTRA_STOPWORDS + NLTK + custom_stopwords del DataPreparation.
    """
    from apps.data_preparation.stopwords import get_combined_stopwords
    from apps.data_preparation.models import DataPreparation

    custom = []
    if dataset_id:
        prep = DataPreparation.objects.filter(
            dataset_id=dataset_id,
            status=DataPreparation.STATUS_COMPLETED,
        ).order_by('-created_at').first()
        if prep:
            custom = prep.custom_stopwords or []
            language = prep.predominant_language or language

    return get_combined_stopwords(custom_stopwords=custom, language=language)


def _strip_references_section(text: str) -> str:
    """Eliminar la sección de referencias/bibliografía del final del texto."""
    match = _RE_REFERENCES_SECTION.search(text)
    if match:
        # Truncar desde donde empieza la sección de referencias
        return text[:match.start()].strip()
    return text


def preprocess_for_inference(
    text: str,
    stopwords: Optional[Set[str]] = None,
    lemmatize: bool = True,
    language: str = 'en',
    nlp=None,
    strip_references: bool = True,
    min_word_length: int = 2,
) -> str:
    """
    Preprocesamiento completo para texto extraído de PDFs nuevos.

    Replica el pipeline del corpus:
      1. Eliminar sección de referencias/bibliografía (si strip_references=True)
      2. Eliminar URLs, emails, DOIs, ISBNs, citas en brackets
      3. Eliminar números de páginas y citas parentéticas
      4. Convertir a minúsculas
      5. Eliminar caracteres no alfabéticos
      6. Lematizar con spaCy (si disponible)
      7. Aplicar stopwords (EXTRA + NLTK + custom del dataset)
      8. Eliminar palabras más cortas que min_word_length

    Args:
        text: Texto crudo extraído del PDF
        stopwords: Conjunto de stopwords a aplicar. Si None, usa solo EXTRA_STOPWORDS.
        lemmatize: Si aplicar lematización con spaCy
        language: Código de idioma para spaCy ('en' o 'es')
        nlp: Instancia de spaCy ya cargada. Pasar para evitar recargar el modelo
             por cada documento. Si None, carga internamente (fallback).
        strip_references: Si eliminar sección de referencias/bibliografía al final.
        min_word_length: Longitud mínima de palabras a conservar (default 2).
    """
    if not text or not text.strip():
        return ''

    # 1. Truncar sección de referencias (condicional)
    if strip_references:
        text = _strip_references_section(text)

    # 2–3. Eliminar URLs, emails, DOIs, citas, etc.
    text = _RE_URL.sub(' ', text)
    text = _RE_EMAIL.sub(' ', text)
    text = _RE_DOI.sub(' ', text)
    text = _RE_ISBN.sub(' ', text)
    text = _RE_PAGE_NUMBERS.sub(' ', text)
    text = _RE_CITATION_BRACKETS.sub(' ', text)
    text = _RE_CITATION_PARENS.sub(' ', text)

    # 4. Minúsculas
    text = text.lower()

    # 5. Eliminar números y caracteres no alfabéticos
    text = _RE_NUMBERS_STANDALONE.sub(' ', text)
    text = _RE_NON_ALPHA.sub(' ', text)

    # 6. Lematizar (si spaCy está disponible)
    if lemmatize:
        text = _lemmatize_text(text, language, nlp=nlp)

    # 7. Aplicar stopwords
    if stopwords:
        words = text.split()
        words = [w for w in words if w not in stopwords]
        text = ' '.join(words)

    # 8. Eliminar palabras más cortas que min_word_length y normalizar espacios
    if min_word_length > 1:
        re_short = re.compile(r'\b[a-zA-Z]{1,' + str(min_word_length - 1) + r'}\b')
        text = re_short.sub(' ', text)
    text = _RE_MULTI_SPACE.sub(' ', text).strip()

    return text


def infer_ner(
    texts: List[str],
    ner_id: int,
    entity_types: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Inferencia NER usando spaCy con el modelo de referencia del corpus.

    Carga el modelo spaCy pre-entrenado (sin artefactos joblib),
    extrae entidades nombradas y filtra por tipo según la configuración.

    Args:
        texts: Textos extraídos de PDFs (pueden ser raw, no preprocesados).
        ner_id: ID del análisis NER de referencia (para obtener spacy_model y entity types).
        entity_types: Tipos de entidades a extraer. Si vacío, hereda del NER de referencia.

    Returns:
        entity_distribution, top_entities_by_type, document_entities,
        total_entities_found, unique_entities_count.
    """
    try:
        import spacy
    except ImportError:
        raise RuntimeError("spaCy no está instalado. Instala con: pip install spacy")

    from apps.ner_analysis.models import NerAnalysis

    ner = NerAnalysis.objects.get(id=ner_id)
    model_name = ner.spacy_model or 'en_core_web_sm'

    # Tipos de entidades: parámetro > heredar del NER de referencia
    active_types: Set[str] = set()
    if entity_types:
        active_types = set(entity_types)
    elif ner.selected_entities:
        active_types = set(ner.selected_entities)

    try:
        nlp = spacy.load(model_name)
    except Exception as e:
        raise RuntimeError(f"No se pudo cargar modelo spaCy '{model_name}': {e}")

    entity_counts: Dict[str, Dict[str, int]] = {}  # tipo -> {texto: count}
    document_entities = []
    total = 0

    for idx, text in enumerate(texts):
        if not text or not text.strip():
            document_entities.append({'document_index': idx, 'entities': []})
            continue

        chunk = text[:100_000]  # limitar para evitar OOM
        doc_nlp = nlp(chunk)

        doc_ents = []
        for ent in doc_nlp.ents:
            if active_types and ent.label_ not in active_types:
                continue
            ent_text = ent.text.strip()
            if not ent_text:
                continue
            ent_type = ent.label_

            if ent_type not in entity_counts:
                entity_counts[ent_type] = {}
            entity_counts[ent_type][ent_text] = entity_counts[ent_type].get(ent_text, 0) + 1
            doc_ents.append({'text': ent_text, 'type': ent_type})
            total += 1

        document_entities.append({'document_index': idx, 'entities': doc_ents})

    # Top entidades por tipo (max 20)
    top_entities_by_type: Dict[str, List[Dict]] = {}
    for ent_type, counts in entity_counts.items():
        sorted_ents = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        top_entities_by_type[ent_type] = [
            {'text': t, 'count': c}
            for t, c in sorted_ents[:20]
        ]

    # Distribución por tipo
    entity_distribution = []
    for ent_type, counts in entity_counts.items():
        type_total = sum(counts.values())
        entity_distribution.append({
            'type': ent_type,
            'count': type_total,
            'unique_entities': len(counts),
            'percentage': round(type_total / total * 100, 1) if total > 0 else 0.0,
        })
    entity_distribution.sort(key=lambda x: x['count'], reverse=True)

    unique_total = sum(len(counts) for counts in entity_counts.values())

    return {
        'entity_distribution': entity_distribution,
        'top_entities_by_type': top_entities_by_type,
        'document_entities': document_entities,
        'total_entities_found': total,
        'unique_entities_count': unique_total,
        'entity_types_used': sorted(active_types) if active_types else [],
        'reference_ner_id': ner_id,
        'reference_ner_name': ner.name,
        'spacy_model': model_name,
    }


def infer_bertopic_similarity(
    texts: List[str],
    bertopic_id: int,
) -> Dict[str, Any]:
    """
    Inferencia BERTopic por similitud de palabras clave (no UMAP/HDBSCAN nativo).

    Los artefactos UMAP/HDBSCAN no se almacenan en DB, por lo que la asignación
    de tópicos se realiza por solapamiento de tokens con las palabras representativas
    de cada tópico entrenado en el corpus.

    Args:
        texts: Textos preprocesados.
        bertopic_id: ID del análisis BERTopic de referencia.

    Returns:
        document_assignments, topic_distribution, method="keyword_similarity".
    """
    from apps.bertopic.models import BERTopicAnalysis

    bt = BERTopicAnalysis.objects.get(id=bertopic_id)
    topics = bt.topics or []

    if not topics:
        raise ValueError(f"BERTopic #{bertopic_id} no tiene tópicos disponibles.")

    # Construir conjuntos de palabras por tópico (excluir outlier -1)
    topic_wordsets: Dict[int, Set[str]] = {}
    for topic in topics:
        tid = topic.get('topic_id', -1)
        if tid == -1:
            continue
        words = {w['word'].lower() for w in topic.get('words', []) if w.get('word')}
        if words:
            topic_wordsets[tid] = words

    if not topic_wordsets:
        raise ValueError(f"BERTopic #{bertopic_id} no tiene tópicos válidos (solo outliers).")

    topic_labels = {
        t['topic_id']: t.get('topic_label', f'Tema {t["topic_id"]}')
        for t in topics
    }

    document_assignments = []
    topic_doc_counts: Dict[int, int] = {}

    for idx, text in enumerate(texts):
        tokens = set(text.lower().split()) if text else set()

        scores: Dict[int, float] = {}
        for tid, words in topic_wordsets.items():
            overlap = len(tokens & words)
            scores[tid] = overlap / len(words) if words else 0.0

        if scores and max(scores.values()) > 0:
            dominant = max(scores, key=lambda k: scores[k])
        else:
            dominant = -1  # outlier si no hay solapamiento

        topic_doc_counts[dominant] = topic_doc_counts.get(dominant, 0) + 1

        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
        document_assignments.append({
            'document_index': idx,
            'dominant_topic': dominant,
            'dominant_topic_label': topic_labels.get(dominant, f'Tema {dominant}'),
            'similarity_score': round(scores.get(dominant, 0.0), 4),
            'top_topics': [
                {
                    'topic_id': tid,
                    'topic_label': topic_labels.get(tid, f'Tema {tid}'),
                    'similarity_score': round(score, 4),
                }
                for tid, score in sorted_scores
            ],
        })

    n_docs = len(texts)
    topic_distribution = []
    for tid, count in sorted(topic_doc_counts.items()):
        topic_distribution.append({
            'topic_id': tid,
            'topic_label': topic_labels.get(tid, f'Tema {tid}'),
            'document_count': count,
            'percentage': round(count / n_docs * 100, 1) if n_docs > 0 else 0.0,
        })

    return {
        'document_assignments': document_assignments,
        'topic_distribution': topic_distribution,
        'total_documents': n_docs,
        'method': 'keyword_similarity',
        'method_note': (
            'Asignación por solapamiento de tokens con palabras representativas '
            'de cada tópico. No utiliza UMAP/HDBSCAN nativo.'
        ),
        'reference_bertopic_id': bertopic_id,
        'reference_bertopic_name': bt.name,
    }


def load_spacy_model(language: str = 'en'):
    """
    Cargar modelo spaCy una sola vez y retornarlo, configurado solo para lematización.

    Excluye los componentes parser, ner y senter que no son necesarios para
    la lematización pero añaden un overhead significativo (2-3x más lento).
    Solo carga: tok2vec → tagger → attribute_ruler → lemmatizer.

    Retorna None si no está disponible (fallback silencioso).
    Debe llamarse UNA VEZ antes del bucle de documentos.
    """
    try:
        import spacy
        model_name = 'es_core_news_sm' if language == 'es' else 'en_core_web_sm'
        # exclude elimina los componentes del pipeline completamente (más rápido que disable)
        nlp = spacy.load(model_name, exclude=['parser', 'ner', 'senter'])
        logger.info(
            f"Modelo spaCy '{model_name}' cargado (pipeline: {nlp.pipe_names})."
        )
        return nlp
    except Exception as e:
        logger.warning(f"No se pudo cargar modelo spaCy para '{language}': {e}. Se omitirá lematización.")
        return None


def _lemmatize_text(text: str, language: str = 'en', nlp=None) -> str:
    """
    Lematizar texto con spaCy.

    Args:
        text: Texto a lematizar.
        language: Código de idioma ('en' o 'es'). Solo se usa si nlp es None.
        nlp: Instancia de spaCy ya cargada. Si se pasa, se usa directamente
             sin llamar spacy.load() (evita recargas por documento).
             Si es None, carga el modelo (comportamiento anterior, fallback).
    """
    try:
        if nlp is None:
            import spacy
            model_name = 'es_core_news_sm' if language == 'es' else 'en_core_web_sm'
            nlp = spacy.load(model_name, exclude=['parser', 'ner', 'senter'])

        # Limitar a 100K caracteres para evitar OOM en spaCy
        if len(text) > 100_000:
            text = text[:100_000]

        doc = nlp(text)
        return ' '.join(token.lemma_ for token in doc if not token.is_space)
    except Exception as e:
        logger.warning(f"Lematización omitida: {e}")
        return text

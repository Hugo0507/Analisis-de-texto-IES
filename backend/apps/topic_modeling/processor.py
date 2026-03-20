"""
Topic Modeling Processor

Procesamiento de Topic Modeling con LSA, NMF, PLSA y LDA.
"""

import io
import logging
import threading
import numpy as np
from typing import List, Dict, Any, Tuple
import joblib
from django.core.files.base import ContentFile
from django.utils import timezone
from collections import Counter

# NLP & ML
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.decomposition import TruncatedSVD, NMF as SKNMF, LatentDirichletAllocation
from gensim.models import LdaModel
from gensim.corpora import Dictionary
from gensim.models.coherencemodel import CoherenceModel

logger = logging.getLogger(__name__)

# Descargar recursos de NLTK si no existen
try:
    stopwords.words('english')
except LookupError:
    nltk.download('stopwords', quiet=True)
try:
    word_tokenize('test')
except LookupError:
    nltk.download('punkt', quiet=True)


def process_topic_modeling(tm_id: int):
    """
    Proceso principal de Topic Modeling.

    Args:
        tm_id: ID del TopicModeling a procesar
    """
    from .models import TopicModeling

    try:
        tm = TopicModeling.objects.get(id=tm_id)

        logger.info(f"[TM {tm_id}] Iniciando procesamiento: {tm.name}")

        # Actualizar estado
        tm.status = TopicModeling.STATUS_PROCESSING
        tm.current_stage = TopicModeling.STAGE_LOADING_DATA
        tm.progress_percentage = 10
        tm.processing_started_at = timezone.now()
        tm.save()

        # ETAPA 1: Cargar datos (10%)
        logger.info(f"[TM {tm_id}] Cargando datos desde {tm.source_type}...")
        texts, document_ids = load_texts(tm)

        if not texts or len(texts) < 3:
            raise ValueError(f"Se necesitan al menos 3 documentos. Encontrados: {len(texts)}")

        logger.info(f"[TM {tm_id}] [OK] Cargados {len(texts)} documentos")
        tm.documents_processed = len(texts)
        tm.current_stage = TopicModeling.STAGE_PREPROCESSING
        tm.progress_percentage = 20
        tm.save()

        # ETAPA 2: Preprocesar textos (20%)
        logger.info(f"[TM {tm_id}] Preprocesando textos...")
        processed_texts = preprocess_texts(texts)

        tm.current_stage = TopicModeling.STAGE_VECTORIZING
        tm.progress_percentage = 30
        tm.save()

        # ETAPA 3: Vectorizar (30%)
        logger.info(f"[TM {tm_id}] Vectorizando textos...")
        doc_term_matrix, feature_names, vectorizer = vectorize_texts(
            processed_texts, tm.algorithm
        )
        tm.vocabulary_size = len(feature_names)
        logger.info(f"[TM {tm_id}] [OK] Vocabulario: {tm.vocabulary_size} términos")

        tm.current_stage = TopicModeling.STAGE_TRAINING_MODEL
        tm.progress_percentage = 40
        tm.save()

        # ETAPA 4: Entrenar modelo (40%)
        logger.info(f"[TM {tm_id}] Entrenando modelo {tm.algorithm.upper()}...")
        model, doc_topic_matrix = train_model(
            tm, doc_term_matrix, feature_names, processed_texts
        )

        tm.current_stage = TopicModeling.STAGE_EXTRACTING_TOPICS
        tm.progress_percentage = 60
        tm.save()

        # ETAPA 5: Extraer tópicos (60%)
        logger.info(f"[TM {tm_id}] Extrayendo tópicos...")
        topics = extract_topics(tm, model, feature_names)
        logger.info(f"[TM {tm_id}] [OK] Extraídos {len(topics)} tópicos")

        tm.current_stage = TopicModeling.STAGE_CALCULATING_COHERENCE
        tm.progress_percentage = 75
        tm.save()

        # ETAPA 6: Calcular coherencia (75%)
        logger.info(f"[TM {tm_id}] Calculando coherencia...")
        coherence_score = calculate_coherence(
            tm, processed_texts, topics, vectorizer
        )
        if coherence_score:
            logger.info(f"[TM {tm_id}] [OK] Coherencia: {coherence_score:.4f}")

        tm.current_stage = TopicModeling.STAGE_SAVING_RESULTS
        tm.progress_percentage = 90
        tm.save()

        # ETAPA 7: Guardar resultados (90%)
        logger.info(f"[TM {tm_id}] Guardando resultados...")
        save_results(tm, topics, doc_topic_matrix, document_ids, coherence_score)

        # Serializar vectorizador y modelo para inferencia futura
        logger.info(f"[TM {tm_id}] Serializando artefactos del modelo...")
        try:
            # Vectorizador
            buf_vec = io.BytesIO()
            joblib.dump(vectorizer, buf_vec)
            buf_vec.seek(0)
            vec_filename = f"tm_{tm_id}_vectorizer.pkl"
            tm.vectorizer_artifact.save(vec_filename, ContentFile(buf_vec.read()), save=False)

            # Modelo
            buf_model = io.BytesIO()
            joblib.dump(model, buf_model)
            buf_model.seek(0)
            model_filename = f"tm_{tm_id}_model.pkl"
            tm.model_artifact.save(model_filename, ContentFile(buf_model.read()), save=False)

            logger.info(f"[TM {tm_id}] ✅ Artefactos serializados: {vec_filename}, {model_filename}")
        except Exception as artifact_error:
            logger.warning(f"[TM {tm_id}] ⚠️ No se pudo serializar artefactos: {artifact_error}")

        # COMPLETADO
        tm.status = TopicModeling.STATUS_COMPLETED
        tm.current_stage = TopicModeling.STAGE_COMPLETED
        tm.progress_percentage = 100
        tm.processing_completed_at = timezone.now()
        tm.save()

        logger.info(f"[TM {tm_id}] [SUCCESS] Procesamiento completado exitosamente")

    except Exception as e:
        logger.exception(f"[TM {tm_id}] [ERROR] Error en procesamiento: {str(e)}")

        try:
            tm = TopicModeling.objects.get(id=tm_id)
            tm.status = TopicModeling.STATUS_ERROR
            tm.error_message = str(e)[:1000]  # Limitar longitud
            tm.progress_percentage = 0
            tm.save()
        except Exception as save_error:
            logger.error(f"[TM {tm_id}] Error guardando estado de error: {save_error}")


def load_texts(tm) -> Tuple[List[str], List[int]]:
    """
    Cargar textos desde la fuente configurada.

    Args:
        tm: Instancia de TopicModeling

    Returns:
        Tupla de (textos, document_ids)
    """
    from apps.datasets.models import DatasetFile

    texts = []
    document_ids = []

    if tm.source_type == tm.SOURCE_DATA_PREPARATION:
        # Desde DataPreparation (textos preprocesados)
        data_prep = tm.data_preparation
        file_ids = data_prep.processed_file_ids

        if not file_ids:
            logger.warning(f"No hay archivos procesados en preparación {data_prep.id}")
            return [], []

        files = DatasetFile.objects.filter(id__in=file_ids).only('id', 'preprocessed_text')

        for file in files:
            if file.preprocessed_text and len(file.preprocessed_text.strip()) > 10:
                texts.append(file.preprocessed_text)
                document_ids.append(file.id)

    elif tm.source_type == tm.SOURCE_DATASET:
        # Desde Dataset (textos raw)
        dataset = tm.dataset
        files = DatasetFile.objects.filter(
            dataset=dataset,
            status='completed'
        ).only('id', 'txt_content')

        for file in files:
            if file.txt_content and len(file.txt_content.strip()) > 10:
                texts.append(file.txt_content)
                document_ids.append(file.id)

    logger.info(f"Cargados {len(texts)} textos desde {tm.source_type}")
    return texts, document_ids


def preprocess_texts(texts: List[str]) -> List[str]:
    """
    Preprocesar textos: lowercase, eliminar stopwords, tokenizar.

    Args:
        texts: Lista de textos raw

    Returns:
        Lista de textos preprocesados
    """
    stop_words = set(stopwords.words('english'))
    processed = []

    for text in texts:
        # Lowercase
        text = text.lower()

        # Tokenizar
        tokens = word_tokenize(text)

        # Eliminar stopwords y tokens cortos
        tokens = [
            token for token in tokens
            if token.isalpha() and token not in stop_words and len(token) > 2
        ]

        # Unir tokens
        processed_text = ' '.join(tokens)
        processed.append(processed_text)

    return processed


def vectorize_texts(texts: List[str], algorithm: str) -> Tuple[Any, List[str], Any]:
    """
    Vectorizar textos según algoritmo.

    Args:
        texts: Textos preprocesados
        algorithm: Algoritmo a usar (lsa, nmf, plsa, lda)

    Returns:
        Tupla de (doc_term_matrix, feature_names, vectorizer)
    """
    if algorithm in ['lsa', 'nmf']:
        # TF-IDF para LSA y NMF
        vectorizer = TfidfVectorizer(
            max_features=2000,
            min_df=2,
            max_df=0.8,
            ngram_range=(1, 2)
        )
    else:
        # CountVectorizer para PLSA y LDA (requieren frecuencias)
        vectorizer = CountVectorizer(
            max_features=2000,
            min_df=2,
            max_df=0.8,
            ngram_range=(1, 2)
        )

    doc_term_matrix = vectorizer.fit_transform(texts)
    feature_names = vectorizer.get_feature_names_out()

    return doc_term_matrix, feature_names, vectorizer


def train_model(tm, doc_term_matrix, feature_names, processed_texts) -> Tuple[Any, np.ndarray]:
    """
    Entrenar modelo según algoritmo seleccionado.

    Args:
        tm: Instancia TopicModeling
        doc_term_matrix: Matriz documento-término
        feature_names: Nombres de features
        processed_texts: Textos procesados (para LDA con gensim)

    Returns:
        Tupla de (modelo entrenado, doc_topic_matrix)
    """
    n_topics = tm.num_topics
    random_seed = tm.random_seed or 42
    max_iter = tm.max_iterations

    if tm.algorithm == 'lsa':
        # LSA usando TruncatedSVD
        model = TruncatedSVD(
            n_components=n_topics,
            random_state=random_seed,
            n_iter=max_iter
        )
        doc_topic_matrix = model.fit_transform(doc_term_matrix)

    elif tm.algorithm == 'nmf':
        # NMF
        model = SKNMF(
            n_components=n_topics,
            random_state=random_seed,
            max_iter=max_iter,
            init='nndsvd'
        )
        doc_topic_matrix = model.fit_transform(doc_term_matrix)

    elif tm.algorithm == 'plsa':
        # PLSA usando LatentDirichletAllocation con parámetros específicos
        # (PLSA es similar a LDA pero sin priors Dirichlet)
        model = LatentDirichletAllocation(
            n_components=n_topics,
            random_state=random_seed,
            max_iter=max_iter,
            learning_method='batch',
            doc_topic_prior=None,  # Sin prior para simular PLSA
            topic_word_prior=None
        )
        doc_topic_matrix = model.fit_transform(doc_term_matrix)

    elif tm.algorithm == 'lda':
        # LDA usando sklearn
        model = LatentDirichletAllocation(
            n_components=n_topics,
            random_state=random_seed,
            max_iter=max_iter,
            learning_method='batch'
        )
        doc_topic_matrix = model.fit_transform(doc_term_matrix)

    else:
        raise ValueError(f"Algoritmo no soportado: {tm.algorithm}")

    return model, doc_topic_matrix


def extract_topics(tm, model, feature_names: List[str]) -> List[Dict[str, Any]]:
    """
    Extraer tópicos del modelo entrenado.

    Args:
        tm: Instancia TopicModeling
        model: Modelo entrenado
        feature_names: Nombres de features

    Returns:
        Lista de tópicos con palabras y pesos
    """
    topics = []
    n_words = tm.num_words

    if tm.algorithm == 'lsa':
        # LSA: usar components_
        topic_word_matrix = model.components_

    elif tm.algorithm in ['nmf', 'plsa', 'lda']:
        # NMF, PLSA, LDA: usar components_
        topic_word_matrix = model.components_

    for topic_idx, topic_weights in enumerate(topic_word_matrix):
        # Obtener índices de top palabras
        top_word_indices = topic_weights.argsort()[-n_words:][::-1]

        # Obtener palabras y pesos
        words = []
        for idx in top_word_indices:
            words.append({
                'word': feature_names[idx],
                'weight': float(topic_weights[idx])
            })

        # Generar label automático basado en top 3 palabras
        top_3_words = ' + '.join([w['word'] for w in words[:3]])

        topics.append({
            'topic_id': topic_idx,
            'topic_label': f"Topic {topic_idx}: {top_3_words}",
            'words': words
        })

    return topics


def calculate_coherence(tm, processed_texts, topics, vectorizer) -> float:
    """
    Calcular coherencia del modelo.

    Args:
        tm: Instancia TopicModeling
        processed_texts: Textos procesados
        topics: Tópicos extraídos
        vectorizer: Vectorizer usado

    Returns:
        Score de coherencia
    """
    try:
        # Tokenizar textos para coherencia
        texts_tokenized = [text.split() for text in processed_texts]

        # Crear diccionario
        dictionary = Dictionary(texts_tokenized)

        # Extraer top palabras de cada tópico
        topic_words = []
        for topic in topics:
            words = [w['word'] for w in topic['words'][:10]]
            topic_words.append(words)

        # Calcular coherencia C_V
        coherence_model = CoherenceModel(
            topics=topic_words,
            texts=texts_tokenized,
            dictionary=dictionary,
            coherence='c_v'
        )

        coherence_score = coherence_model.get_coherence()
        return round(coherence_score, 4)

    except Exception as e:
        logger.warning(f"Error calculando coherencia: {e}")
        return None


def save_results(tm, topics, doc_topic_matrix, document_ids, coherence_score):
    """
    Guardar resultados en la base de datos.

    Args:
        tm: Instancia TopicModeling
        topics: Tópicos extraídos
        doc_topic_matrix: Matriz documento-tópico
        document_ids: IDs de documentos
        coherence_score: Score de coherencia
    """
    from apps.datasets.models import DatasetFile

    # Guardar tópicos
    tm.topics = topics

    # Procesar document_topics
    document_topics = []
    for doc_idx, doc_id in enumerate(document_ids):
        topic_dist = doc_topic_matrix[doc_idx]
        dominant_topic = int(topic_dist.argmax())
        dominant_weight = float(topic_dist[dominant_topic])

        # Obtener nombre del documento
        try:
            doc_file = DatasetFile.objects.get(id=doc_id)
            doc_name = doc_file.original_filename
        except:
            doc_name = f"Document {doc_id}"

        document_topics.append({
            'document_id': doc_id,
            'document_name': doc_name,
            'dominant_topic': dominant_topic,
            'topic_distribution': [float(x) for x in topic_dist],
            'dominant_topic_weight': dominant_weight
        })

    tm.document_topics = document_topics

    # Calcular distribución global de tópicos
    topic_counts = Counter([dt['dominant_topic'] for dt in document_topics])
    total_docs = len(document_topics)

    topic_distribution = []
    for topic_idx in range(len(topics)):
        count = topic_counts.get(topic_idx, 0)
        percentage = (count / total_docs * 100) if total_docs > 0 else 0

        topic_distribution.append({
            'topic_id': topic_idx,
            'topic_label': topics[topic_idx]['topic_label'],
            'document_count': count,
            'percentage': round(percentage, 2)
        })

    tm.topic_distribution = topic_distribution

    # Guardar coherencia
    tm.coherence_score = coherence_score

    tm.save()


def start_processing_thread(tm_id: int):
    """
    Iniciar procesamiento en thread de background.

    Args:
        tm_id: ID del análisis TopicModeling a procesar
    """
    thread = threading.Thread(
        target=process_topic_modeling,
        args=(tm_id,),
        daemon=True
    )
    thread.start()
    logger.info(f"[THREAD] Procesamiento Topic Modeling iniciado para ID {tm_id}")

"""
BERTopic Processor

Implementa el algoritmo BERTopic para Topic Modeling basado en transformers.

BERTopic combina:
1. BERT embeddings (sentence-transformers)
2. UMAP (reducción dimensional)
3. HDBSCAN (clustering)
4. c-TF-IDF (representación de tópicos)
"""

import logging
import threading
import traceback
from datetime import datetime
from typing import List, Tuple, Dict, Any
import numpy as np
from collections import Counter, defaultdict

from django.utils import timezone
from django.db import transaction

logger = logging.getLogger(__name__)


def start_processing_thread(bertopic_id: int):
    """
    Inicia procesamiento de BERTopic en background thread.

    Args:
        bertopic_id: ID del análisis BERTopic
    """
    thread = threading.Thread(
        target=process_bertopic_analysis,
        args=(bertopic_id,),
        daemon=True
    )
    thread.start()
    logger.info(f"🚀 [BERTopic] Thread iniciado para análisis #{bertopic_id}")


def process_bertopic_analysis(bertopic_id: int):
    """
    Procesar análisis BERTopic completo.

    Pipeline de 9 etapas:
    1. Loading data (10%)
    2. Loading model (20%)
    3. Generating embeddings (30-50%)
    4. Reducing dimensions - UMAP (60%)
    5. Clustering - HDBSCAN (70%)
    6. Extracting topics - c-TF-IDF (80%)
    7. Calculating coherence (90%)
    8. Saving results (95%)
    9. Completed (100%)

    Args:
        bertopic_id: ID del análisis BERTopic
    """
    from .models import BERTopicAnalysis

    try:
        # Obtener análisis
        bertopic = BERTopicAnalysis.objects.get(id=bertopic_id)

        logger.info(f"🔍 [BERTopic] Iniciando procesamiento: {bertopic.name}")

        # Marcar como procesando
        bertopic.status = BERTopicAnalysis.STATUS_PROCESSING
        bertopic.current_stage = BERTopicAnalysis.STAGE_LOADING_DATA
        bertopic.progress_percentage = 5
        bertopic.processing_started_at = timezone.now()
        bertopic.save()

        # ============================================================
        # STAGE 1: LOADING DATA (10%)
        # ============================================================
        logger.info(f"📂 [BERTopic] Etapa 1/9: Cargando datos...")
        bertopic.current_stage = BERTopicAnalysis.STAGE_LOADING_DATA
        bertopic.progress_percentage = 10
        bertopic.save()

        texts, document_ids = load_texts(bertopic)
        num_documents = len(texts)

        if num_documents == 0:
            raise ValueError("No se encontraron documentos para procesar")

        logger.info(f"✅ [BERTopic] {num_documents} documentos cargados")

        # ============================================================
        # STAGE 2: LOADING MODEL (20%)
        # ============================================================
        logger.info(f"🤖 [BERTopic] Etapa 2/9: Cargando modelo {bertopic.embedding_model}...")
        bertopic.current_stage = BERTopicAnalysis.STAGE_LOADING_MODEL
        bertopic.progress_percentage = 20
        bertopic.save()

        embedding_model = load_embedding_model(bertopic.embedding_model)
        logger.info(f"✅ [BERTopic] Modelo cargado exitosamente")

        # ============================================================
        # STAGE 3: GENERATING EMBEDDINGS (30-50%)
        # ============================================================
        logger.info(f"🧬 [BERTopic] Etapa 3/9: Generando embeddings BERT...")
        bertopic.current_stage = BERTopicAnalysis.STAGE_GENERATING_EMBEDDINGS
        bertopic.progress_percentage = 30
        bertopic.save()

        embeddings = generate_embeddings(bertopic, embedding_model, texts)
        logger.info(f"✅ [BERTopic] Embeddings generados: {embeddings.shape}")

        bertopic.progress_percentage = 50
        bertopic.save()

        # ============================================================
        # STAGE 4: REDUCING DIMENSIONS - UMAP (60%)
        # ============================================================
        logger.info(f"📉 [BERTopic] Etapa 4/9: Reduciendo dimensionalidad (UMAP)...")
        bertopic.current_stage = BERTopicAnalysis.STAGE_REDUCING_DIMENSIONS
        bertopic.progress_percentage = 60
        bertopic.save()

        reduced_embeddings = reduce_dimensions(bertopic, embeddings)
        logger.info(f"✅ [BERTopic] UMAP completado: {reduced_embeddings.shape}")

        # ============================================================
        # STAGE 5: CLUSTERING - HDBSCAN (70%)
        # ============================================================
        logger.info(f"🎯 [BERTopic] Etapa 5/9: Clustering (HDBSCAN)...")
        bertopic.current_stage = BERTopicAnalysis.STAGE_CLUSTERING
        bertopic.progress_percentage = 70
        bertopic.save()

        cluster_labels = perform_clustering(bertopic, reduced_embeddings)
        logger.info(f"✅ [BERTopic] Clustering completado")

        # Contar tópicos encontrados y outliers
        unique_clusters = set(cluster_labels)
        num_topics = len(unique_clusters) - (1 if -1 in unique_clusters else 0)
        num_outliers = sum(1 for label in cluster_labels if label == -1)

        logger.info(f"📊 [BERTopic] Tópicos encontrados: {num_topics}, Outliers: {num_outliers}")

        # ============================================================
        # STAGE 6: EXTRACTING TOPICS - c-TF-IDF (80%)
        # ============================================================
        logger.info(f"🔤 [BERTopic] Etapa 6/9: Extrayendo tópicos (c-TF-IDF)...")
        bertopic.current_stage = BERTopicAnalysis.STAGE_EXTRACTING_TOPICS
        bertopic.progress_percentage = 80
        bertopic.save()

        topics_data = extract_topics(bertopic, texts, cluster_labels)
        logger.info(f"✅ [BERTopic] Tópicos extraídos: {len(topics_data['topics'])}")

        # ============================================================
        # STAGE 7: CALCULATING COHERENCE (85%)
        # ============================================================
        logger.info(f"📈 [BERTopic] Etapa 7/10: Calculando coherencia...")
        bertopic.current_stage = BERTopicAnalysis.STAGE_CALCULATING_COHERENCE
        bertopic.progress_percentage = 85
        bertopic.save()

        coherence_score = calculate_coherence(texts, topics_data['topics'])
        logger.info(f"✅ [BERTopic] Coherencia C_V: {coherence_score:.4f}")

        # ============================================================
        # STAGE 8: COMPUTING PROJECTIONS (92%)
        # ============================================================
        logger.info(f"🗺️ [BERTopic] Etapa 8/10: Calculando proyecciones 2D...")
        bertopic.current_stage = BERTopicAnalysis.STAGE_COMPUTING_PROJECTIONS
        bertopic.progress_percentage = 92
        bertopic.save()

        projections_2d = compute_projections_2d(embeddings, cluster_labels, topics_data['topics'])
        logger.info(f"✅ [BERTopic] Proyecciones 2D calculadas")

        # ============================================================
        # STAGE 9: SAVING RESULTS (97%)
        # ============================================================
        logger.info(f"💾 [BERTopic] Etapa 9/10: Guardando resultados...")
        bertopic.current_stage = BERTopicAnalysis.STAGE_SAVING_RESULTS
        bertopic.progress_percentage = 97
        bertopic.save()

        # Guardar todos los resultados
        with transaction.atomic():
            bertopic.documents_processed = num_documents
            bertopic.num_topics_found = num_topics
            bertopic.num_outliers = num_outliers
            bertopic.coherence_score = coherence_score

            # Datos detallados
            bertopic.topics = topics_data['topics']
            bertopic.document_topics = topics_data['document_topics']
            bertopic.topic_distribution = topics_data['topic_distribution']
            bertopic.topic_sizes = topics_data['topic_sizes']
            bertopic.projections_2d = projections_2d

            # Calcular vocabulario
            all_words = set()
            for topic in topics_data['topics']:
                all_words.update(word['word'] for word in topic['words'])
            bertopic.vocabulary_size = len(all_words)

            # Marcar como completado
            bertopic.status = BERTopicAnalysis.STATUS_COMPLETED
            bertopic.current_stage = BERTopicAnalysis.STAGE_COMPLETED
            bertopic.progress_percentage = 100
            bertopic.processing_completed_at = timezone.now()
            bertopic.save()

        logger.info(f"✅ [BERTopic] Procesamiento completado exitosamente")

    except Exception as e:
        logger.error(f"❌ [BERTopic] Error en procesamiento: {str(e)}")
        logger.error(traceback.format_exc())

        try:
            bertopic = BERTopicAnalysis.objects.get(id=bertopic_id)
            bertopic.status = BERTopicAnalysis.STATUS_ERROR
            bertopic.error_message = f"{type(e).__name__}: {str(e)}"
            bertopic.save()
        except Exception as save_error:
            logger.error(f"❌ [BERTopic] Error al guardar estado de error: {save_error}")


def load_embedding_model(model_name: str):
    """
    Cargar modelo de embeddings de sentence-transformers.

    Args:
        model_name: Nombre del modelo (ej: 'all-MiniLM-L6-v2')

    Returns:
        Modelo cargado de sentence-transformers

    Raises:
        OSError: Si el modelo no está instalado
    """
    try:
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer(model_name)
        logger.info(f"✅ [BERTopic] Modelo {model_name} cargado exitosamente")
        return model

    except OSError as e:
        error_msg = (
            f"El modelo '{model_name}' no está instalado. "
            f"Por favor instálalo con: pip install sentence-transformers"
        )
        logger.error(f"❌ [BERTopic] {error_msg}")
        raise OSError(error_msg) from e


def load_texts(bertopic) -> Tuple[List[str], List[int]]:
    """
    Cargar textos desde la fuente de datos.

    Args:
        bertopic: Instancia de BERTopicAnalysis

    Returns:
        Tupla de (textos, document_ids)
    """
    from apps.datasets.models import DatasetFile

    texts = []
    document_ids = []

    if bertopic.source_type == bertopic.SOURCE_DATA_PREPARATION:
        # Cargar desde preparación de datos
        data_prep = bertopic.data_preparation
        file_ids = data_prep.processed_file_ids or []

        files = DatasetFile.objects.filter(id__in=file_ids)

        for file in files:
            if file.preprocessed_text:
                texts.append(file.preprocessed_text)
                document_ids.append(file.id)

        logger.info(f"📂 [BERTopic] Textos cargados desde Data Preparation: {len(texts)}")

    elif bertopic.source_type == bertopic.SOURCE_DATASET:
        # Cargar desde dataset directo
        dataset = bertopic.dataset
        files = dataset.files.all()

        for file in files:
            if file.txt_content:
                texts.append(file.txt_content)
                document_ids.append(file.id)

        logger.info(f"📂 [BERTopic] Textos cargados desde Dataset: {len(texts)}")

    return texts, document_ids


def generate_embeddings(bertopic, model, texts: List[str]) -> np.ndarray:
    """
    Generar embeddings BERT para los textos.

    Args:
        bertopic: Instancia de BERTopicAnalysis
        model: Modelo de sentence-transformers
        texts: Lista de textos

    Returns:
        Array numpy de embeddings
    """
    batch_size = 32
    embeddings_list = []

    # Procesar en batches
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_embeddings = model.encode(batch, show_progress_bar=False)
        embeddings_list.append(batch_embeddings)

        # Actualizar progreso cada 100 documentos
        if (i + batch_size) % 100 == 0:
            progress = 30 + int((i / len(texts)) * 20)  # 30% - 50%
            bertopic.progress_percentage = min(progress, 50)
            bertopic.save()

    embeddings = np.vstack(embeddings_list)
    return embeddings


def reduce_dimensions(bertopic, embeddings: np.ndarray) -> np.ndarray:
    """
    Reducir dimensionalidad con UMAP.

    Args:
        bertopic: Instancia de BERTopicAnalysis
        embeddings: Embeddings BERT

    Returns:
        Embeddings reducidos
    """
    from umap import UMAP

    umap_model = UMAP(
        n_neighbors=bertopic.n_neighbors,
        n_components=bertopic.n_components,
        min_dist=0.0,
        metric='cosine',
        random_state=bertopic.random_seed
    )

    reduced_embeddings = umap_model.fit_transform(embeddings)
    return reduced_embeddings


def perform_clustering(bertopic, embeddings: np.ndarray) -> np.ndarray:
    """
    Realizar clustering con HDBSCAN.

    Args:
        bertopic: Instancia de BERTopicAnalysis
        embeddings: Embeddings reducidos por UMAP

    Returns:
        Array de labels de clusters
    """
    from hdbscan import HDBSCAN

    hdbscan_model = HDBSCAN(
        min_cluster_size=bertopic.min_cluster_size,
        min_samples=bertopic.min_samples,
        metric='euclidean',
        cluster_selection_method='eom',
        prediction_data=True
    )

    cluster_labels = hdbscan_model.fit_predict(embeddings)
    return cluster_labels


def extract_topics(bertopic, texts: List[str], cluster_labels: np.ndarray) -> Dict[str, Any]:
    """
    Extraer tópicos usando c-TF-IDF.

    Args:
        bertopic: Instancia de BERTopicAnalysis
        texts: Textos originales
        cluster_labels: Labels de clusters

    Returns:
        Diccionario con topics, document_topics, topic_distribution, topic_sizes
    """
    from sklearn.feature_extraction.text import CountVectorizer

    # Agrupar documentos por cluster
    documents_per_topic = defaultdict(list)
    document_topics = []

    for idx, (text, label) in enumerate(zip(texts, cluster_labels)):
        documents_per_topic[int(label)].append(text)
        document_topics.append({
            'document_id': idx,
            'topic_id': int(label),
            'text_preview': text[:200] if len(text) > 200 else text
        })

    # Calcular c-TF-IDF para cada tópico
    topics = []
    topic_sizes = {}

    # Vectorizer
    vectorizer = CountVectorizer(max_features=5000, stop_words='english')

    for topic_id in sorted(documents_per_topic.keys()):
        if topic_id == -1:
            # Outliers
            topic_sizes[str(topic_id)] = len(documents_per_topic[topic_id])
            continue

        topic_docs = documents_per_topic[topic_id]
        topic_text = ' '.join(topic_docs)

        # Extraer palabras con c-TF-IDF
        try:
            X = vectorizer.fit_transform([topic_text])
            feature_names = vectorizer.get_feature_names_out()

            # Obtener scores
            tfidf_scores = X.toarray()[0]

            # Top palabras
            top_indices = tfidf_scores.argsort()[-bertopic.num_words:][::-1]
            top_words = [
                {
                    'word': feature_names[i],
                    'weight': float(tfidf_scores[i])
                }
                for i in top_indices
            ]

            # Crear label del tópico
            topic_label = ' + '.join([w['word'] for w in top_words[:5]])

            topics.append({
                'topic_id': topic_id,
                'topic_label': f"Topic {topic_id}: {topic_label}",
                'words': top_words,
                'num_documents': len(topic_docs)
            })

            topic_sizes[str(topic_id)] = len(topic_docs)

        except Exception as e:
            logger.warning(f"⚠️ [BERTopic] Error extrayendo tópico {topic_id}: {e}")
            continue

    # Calcular distribución porcentual
    total_docs = len(texts)
    topic_distribution = [
        {
            'topic_id': topic['topic_id'],
            'topic_label': topic['topic_label'],
            'count': topic['num_documents'],
            'percentage': round((topic['num_documents'] / total_docs) * 100, 2)
        }
        for topic in topics
    ]

    # Agregar outliers a distribución
    if -1 in documents_per_topic:
        num_outliers = len(documents_per_topic[-1])
        topic_distribution.append({
            'topic_id': -1,
            'topic_label': 'Outliers',
            'count': num_outliers,
            'percentage': round((num_outliers / total_docs) * 100, 2)
        })

    return {
        'topics': topics,
        'document_topics': document_topics[:1000],  # Limitar para BD
        'topic_distribution': topic_distribution,
        'topic_sizes': topic_sizes
    }


def compute_projections_2d(
    embeddings: np.ndarray,
    cluster_labels: np.ndarray,
    topics: List[Dict],
) -> Dict[str, Any]:
    """
    Calcular proyecciones 2D (PCA, t-SNE, UMAP) de los embeddings para visualización.

    Args:
        embeddings: Embeddings BERT (n_docs x embedding_dim)
        cluster_labels: Labels de clusters por documento
        topics: Lista de tópicos extraídos (para obtener topic_label)

    Returns:
        Diccionario con claves 'pca', 'tsne', 'umap', cada una lista de puntos
        {x, y, topic_id, topic_label}
    """
    from sklearn.decomposition import PCA
    from sklearn.manifold import TSNE
    from umap import UMAP

    n_docs = len(embeddings)
    random_state = 42

    # Mapa topic_id → topic_label
    label_map: Dict[int, str] = {t['topic_id']: t['topic_label'] for t in topics}
    label_map[-1] = 'Outliers'

    def _build_points(coords: np.ndarray) -> List[Dict]:
        points = []
        for i in range(n_docs):
            topic_id = int(cluster_labels[i])
            points.append({
                'x': round(float(coords[i, 0]), 4),
                'y': round(float(coords[i, 1]), 4),
                'topic_id': topic_id,
                'topic_label': label_map.get(topic_id, f'Tema {topic_id}'),
            })
        return points

    result: Dict[str, Any] = {}

    # ── PCA ──────────────────────────────────────────────────────
    try:
        pca = PCA(n_components=2, random_state=random_state)
        pca_coords = pca.fit_transform(embeddings)
        result['pca'] = _build_points(pca_coords)
        logger.info(f"✅ [BERTopic] PCA 2D calculado (varianza explicada: {pca.explained_variance_ratio_.sum():.2%})")
    except Exception as e:
        logger.warning(f"⚠️ [BERTopic] Error en PCA: {e}")
        result['pca'] = []

    # ── t-SNE ─────────────────────────────────────────────────────
    try:
        perplexity = min(30, max(5, n_docs // 4))
        tsne = TSNE(n_components=2, perplexity=perplexity, random_state=random_state, n_jobs=1)
        tsne_coords = tsne.fit_transform(embeddings)
        result['tsne'] = _build_points(tsne_coords)
        logger.info(f"✅ [BERTopic] t-SNE 2D calculado")
    except Exception as e:
        logger.warning(f"⚠️ [BERTopic] Error en t-SNE: {e}")
        result['tsne'] = []

    # ── UMAP ─────────────────────────────────────────────────────
    try:
        n_neighbors = min(15, max(2, n_docs - 1))
        umap_2d = UMAP(n_components=2, n_neighbors=n_neighbors, min_dist=0.1,
                       metric='cosine', random_state=random_state)
        umap_coords = umap_2d.fit_transform(embeddings)
        result['umap'] = _build_points(umap_coords)
        logger.info(f"✅ [BERTopic] UMAP 2D calculado")
    except Exception as e:
        logger.warning(f"⚠️ [BERTopic] Error en UMAP 2D: {e}")
        result['umap'] = []

    return result


def calculate_coherence(texts: List[str], topics: List[Dict]) -> float:
    """
    Calcular coherencia C_V usando Gensim.

    Args:
        texts: Textos originales
        topics: Lista de tópicos extraídos

    Returns:
        Score de coherencia
    """
    try:
        from gensim.models import CoherenceModel
        from gensim.corpora import Dictionary
        import nltk
        from nltk.tokenize import word_tokenize

        # Asegurar que nltk tenga punkt
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt', quiet=True)

        # Tokenizar textos
        tokenized_texts = [word_tokenize(text.lower()) for text in texts]

        # Crear diccionario
        dictionary = Dictionary(tokenized_texts)

        # Extraer palabras de tópicos (sin outliers)
        topic_words = []
        for topic in topics:
            if topic['topic_id'] != -1:
                words = [w['word'] for w in topic['words'][:10]]
                topic_words.append(words)

        if not topic_words:
            logger.warning("⚠️ [BERTopic] No hay tópicos para calcular coherencia")
            return 0.0

        # Calcular coherencia
        coherence_model = CoherenceModel(
            topics=topic_words,
            texts=tokenized_texts,
            dictionary=dictionary,
            coherence='c_v'
        )

        coherence_score = coherence_model.get_coherence()
        return round(coherence_score, 4)

    except Exception as e:
        logger.warning(f"⚠️ [BERTopic] Error calculando coherencia: {e}")
        return 0.0

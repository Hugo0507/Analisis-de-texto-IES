"""
Módulo de BERTopic - Topic Modeling con Transformers
Usa embeddings de BERT para descubrir temas semánticamente coherentes
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from collections import Counter
from src.utils.logger import get_logger
import warnings
warnings.filterwarnings('ignore')

# Inicializar logger
logger = get_logger(__name__)

try:
    from bertopic import BERTopic
    from sentence_transformers import SentenceTransformer
    from sklearn.feature_extraction.text import CountVectorizer
    BERTOPIC_AVAILABLE = True
except (ImportError, Exception) as e:
    BERTOPIC_AVAILABLE = False
    # Silenciar advertencia - los paquetes están instalados correctamente
    # Si hay error, se manejará en la clase BERTopicAnalyzer


class BERTopicAnalyzer:
    """Clase para análisis de temas usando BERTopic"""

    def __init__(self):
        """Inicializa el analizador de BERTopic"""
        if not BERTOPIC_AVAILABLE:
            raise ImportError(
                "BERTopic no está disponible. "
                "Instala con: pip install bertopic sentence-transformers"
            )

        self.model = None
        self.embeddings = None
        self.topics = None
        self.probs = None
        self.embedding_model = None

    def fit_bertopic(self,
                    texts_dict: Dict[str, str],
                    n_topics: Optional[int] = None,
                    embedding_model: str = 'all-MiniLM-L6-v2',
                    min_topic_size: int = 10,
                    language: str = 'english',
                    calculate_probabilities: bool = True,
                    verbose: bool = True) -> Dict[str, Any]:
        """
        Entrena modelo BERTopic

        Args:
            texts_dict: Diccionario {nombre_doc: texto}
            n_topics: Número de temas (None = automático con HDBSCAN)
            embedding_model: Modelo de sentence-transformers
            min_topic_size: Tamaño mínimo de topic
            language: Idioma para stopwords
            calculate_probabilities: Calcular probabilidades de temas
            verbose: Mostrar progreso

        Returns:
            Diccionario con resultados de BERTopic
        """
        logger.info(f"\n🤖 Entrenando modelo BERTopic...")
        logger.info(f"  - Embedding model: {embedding_model}")
        logger.info(f"  - Min topic size: {min_topic_size}")
        logger.info(f"  - Documents: {len(texts_dict)}")

        # Preparar documentos
        doc_names = list(texts_dict.keys())
        documents = list(texts_dict.values())

        # Cargar modelo de embeddings
        logger.info(f"\n📥 Cargando modelo de embeddings...")
        self.embedding_model = SentenceTransformer(embedding_model)

        # Crear embeddings
        logger.info(f"🔄 Generando embeddings...")
        self.embeddings = self.embedding_model.encode(
            documents,
            show_progress_bar=verbose
        )

        # Configurar vectorizador
        vectorizer_model = CountVectorizer(
            stop_words=language if language == 'english' else None,
            min_df=2,
            ngram_range=(1, 2)
        )

        # Configurar BERTopic
        logger.info(f"\n🎯 Entrenando BERTopic...")

        # NO pasar embedding_model para evitar problemas de compatibilidad
        # En su lugar, pasaremos embeddings pre-calculados directamente
        model_params = {
            'language': language,
            'calculate_probabilities': calculate_probabilities,
            'verbose': verbose,
            'min_topic_size': min_topic_size,
            'vectorizer_model': vectorizer_model
        }

        # Si se especifica número de temas
        if n_topics is not None:
            from sklearn.cluster import KMeans

            # Usar K-Means en lugar de HDBSCAN
            cluster_model = KMeans(n_clusters=n_topics, random_state=42)
            model_params['hdbscan_model'] = cluster_model

        self.model = BERTopic(**model_params)

        # Entrenar modelo con embeddings pre-calculados
        # Al pasar embeddings, BERTopic NO intenta cargar el embedding_model
        self.topics, self.probs = self.model.fit_transform(documents, embeddings=self.embeddings)

        # Obtener información de temas
        topic_info = self.model.get_topic_info()

        # Número de temas (excluyendo outliers -1)
        n_topics_found = len([t for t in set(self.topics) if t != -1])

        logger.info(f"\n✓ Modelo BERTopic entrenado")
        logger.info(f"  - Temas encontrados: {n_topics_found}")
        logger.info(f"  - Documentos clasificados: {len([t for t in self.topics if t != -1])}")
        logger.info(f"  - Outliers: {len([t for t in self.topics if t == -1])}")

        # Extraer resultados
        results = self._extract_results(
            doc_names,
            documents,
            topic_info,
            n_topics_found
        )

        return results

    def _extract_results(self,
                        doc_names: List[str],
                        documents: List[str],
                        topic_info: pd.DataFrame,
                        n_topics: int) -> Dict[str, Any]:
        """
        Extrae resultados del modelo BERTopic

        Args:
            doc_names: Nombres de documentos
            documents: Textos de documentos
            topic_info: DataFrame con info de temas
            n_topics: Número de temas

        Returns:
            Diccionario con resultados
        """
        # Temas con palabras representativas
        topics_list = []

        for topic_id in sorted(set(self.topics)):
            if topic_id == -1:  # Skip outliers
                continue

            # Obtener top palabras del tema
            topic_words = self.model.get_topic(topic_id)

            if topic_words:
                # Palabras con scores
                top_words = [
                    {'word': word, 'score': float(score)}
                    for word, score in topic_words[:10]
                ]

                # Palabras como string
                top_words_str = ' | '.join([w['word'] for w in top_words])

                # Documentos del tema
                docs_in_topic = [
                    doc_names[i] for i, t in enumerate(self.topics) if t == topic_id
                ]

                topics_list.append({
                    'topic_id': int(topic_id),
                    'topic_name': f"Topic {topic_id}",
                    'top_words': top_words,
                    'top_words_str': top_words_str,
                    'count': len(docs_in_topic),
                    'documents': docs_in_topic[:10]  # Top 10 docs
                })

        # Distribución de documentos por tema
        doc_topics = []
        for idx, (doc_name, topic_id) in enumerate(zip(doc_names, self.topics)):
            prob = float(self.probs[idx][topic_id]) if self.probs is not None else 0.0

            doc_topics.append({
                'document': doc_name,
                'topic_id': int(topic_id),
                'topic_name': f"Topic {topic_id}" if topic_id != -1 else "Outlier",
                'probability': prob
            })

        # Métricas de calidad
        coherence_score = self._calculate_coherence(documents)

        results = {
            'model_type': 'BERTopic',
            'n_topics': n_topics,
            'topics': topics_list,
            'doc_topics': doc_topics,
            'topic_info': topic_info.to_dict('records'),
            'coherence': coherence_score,
            'n_outliers': len([t for t in self.topics if t == -1]),
            'embedding_model': str(self.embedding_model),
            'total_documents': len(documents)
        }

        return results

    def _calculate_coherence(self, documents: List[str]) -> float:
        """
        Calcula coherencia del modelo (simplificado)

        Args:
            documents: Lista de documentos

        Returns:
            Score de coherencia
        """
        try:
            # Coherencia basada en diversidad intra-topic
            topic_sizes = [len([t for t in self.topics if t == tid])
                          for tid in set(self.topics) if tid != -1]

            if not topic_sizes:
                return 0.0

            # Métrica simple: balance de tamaños de temas
            mean_size = np.mean(topic_sizes)
            std_size = np.std(topic_sizes)

            # Normalizar (menor std = mejor balance)
            coherence = 1.0 / (1.0 + (std_size / mean_size)) if mean_size > 0 else 0.0

            return float(coherence)
        except Exception as e:
            logger.info(f"⚠️  Error calculando coherencia: {e}")
            return 0.0

    def get_topic_hierarchy(self) -> Optional[Dict[str, Any]]:
        """
        Obtiene jerarquía de temas si está disponible

        Returns:
            Diccionario con jerarquía o None
        """
        if self.model is None:
            return None

        try:
            # BERTopic puede generar jerarquía
            hierarchical_topics = self.model.hierarchical_topics(docs=None)

            return {
                'available': True,
                'hierarchy': hierarchical_topics.to_dict('records') if hierarchical_topics is not None else []
            }
        except Exception as e:
            logger.info(f"⚠️  Jerarquía no disponible: {e}")
            return {'available': False, 'hierarchy': []}

    def get_representative_docs(self, topic_id: int, n_docs: int = 5) -> List[str]:
        """
        Obtiene documentos representativos de un tema

        Args:
            topic_id: ID del tema
            n_docs: Número de documentos

        Returns:
            Lista de documentos representativos
        """
        if self.model is None:
            return []

        try:
            repr_docs = self.model.get_representative_docs(topic_id)
            return repr_docs[:n_docs] if repr_docs else []
        except Exception as e:
            logger.info(f"⚠️  Error obteniendo docs representativos: {e}")
            return []

    def visualize_topics(self) -> Optional[Any]:
        """
        Genera visualización interactiva de temas

        Returns:
            Objeto de visualización de Plotly o None
        """
        if self.model is None:
            return None

        try:
            fig = self.model.visualize_topics()
            return fig
        except Exception as e:
            logger.info(f"⚠️  Error generando visualización: {e}")
            return None

    def visualize_barchart(self, top_n_topics: int = 10) -> Optional[Any]:
        """
        Genera gráfico de barras de top temas

        Args:
            top_n_topics: Número de temas a mostrar

        Returns:
            Figura de Plotly o None
        """
        if self.model is None:
            return None

        try:
            fig = self.model.visualize_barchart(top_n_topics=top_n_topics)
            return fig
        except Exception as e:
            logger.info(f"⚠️  Error generando barchart: {e}")
            return None

    def visualize_heatmap(self) -> Optional[Any]:
        """
        Genera heatmap de similitud entre temas

        Returns:
            Figura de Plotly o None
        """
        if self.model is None:
            return None

        try:
            fig = self.model.visualize_heatmap()
            return fig
        except Exception as e:
            logger.info(f"⚠️  Error generando heatmap: {e}")
            return None

    def search_topics(self, query: str, top_n: int = 5) -> List[Tuple[int, float]]:
        """
        Busca temas similares a una query

        Args:
            query: Texto de búsqueda
            top_n: Número de temas a retornar

        Returns:
            Lista de (topic_id, similarity_score)
        """
        if self.model is None or self.embedding_model is None:
            return []

        try:
            similar_topics, similarities = self.model.find_topics(query, top_n=top_n)
            return list(zip(similar_topics, similarities))
        except Exception as e:
            logger.info(f"⚠️  Error buscando temas: {e}")
            return []

    def get_topic_sizes(self) -> Dict[int, int]:
        """
        Obtiene tamaños de cada tema

        Returns:
            Diccionario {topic_id: size}
        """
        if self.topics is None:
            return {}

        topic_counts = Counter(self.topics)
        return {int(k): int(v) for k, v in topic_counts.items() if k != -1}

    def get_topic_distribution(self, document: str) -> List[Tuple[int, float]]:
        """
        Obtiene distribución de temas para un nuevo documento

        Args:
            document: Texto del documento

        Returns:
            Lista de (topic_id, probability)
        """
        if self.model is None:
            return []

        try:
            topic, prob = self.model.transform([document])
            return [(int(topic[0]), float(prob[0]))]
        except Exception as e:
            logger.info(f"⚠️  Error obteniendo distribución: {e}")
            return []

    def reduce_topics(self, n_topics: int) -> Dict[str, Any]:
        """
        Reduce el número de temas

        Args:
            n_topics: Número objetivo de temas

        Returns:
            Información de temas reducidos
        """
        if self.model is None:
            return {}

        try:
            logger.info(f"\n🔄 Reduciendo a {n_topics} temas...")
            self.model.reduce_topics(docs=None, nr_topics=n_topics)

            # Actualizar topics
            topic_info = self.model.get_topic_info()

            return {
                'success': True,
                'new_n_topics': len([t for t in set(self.model.topics_) if t != -1]),
                'topic_info': topic_info.to_dict('records')
            }
        except Exception as e:
            logger.info(f"⚠️  Error reduciendo temas: {e}")
            return {'success': False, 'error': str(e)}

    def update_topics(self, documents: List[str], vectorizer_model=None) -> bool:
        """
        Actualiza representación de temas con nuevo vocabulario

        Args:
            documents: Documentos del corpus
            vectorizer_model: Vectorizador personalizado

        Returns:
            True si exitoso
        """
        if self.model is None:
            return False

        try:
            logger.info("\n🔄 Actualizando representación de temas...")
            self.model.update_topics(
                documents,
                vectorizer_model=vectorizer_model
            )
            return True
        except Exception as e:
            logger.info(f"⚠️  Error actualizando temas: {e}")
            return False

    def save_model(self, path: str) -> bool:
        """
        Guarda el modelo entrenado

        Args:
            path: Ruta donde guardar

        Returns:
            True si exitoso
        """
        if self.model is None:
            return False

        try:
            self.model.save(path)
            logger.info(f"✓ Modelo guardado en: {path}")
            return True
        except Exception as e:
            logger.info(f"⚠️  Error guardando modelo: {e}")
            return False

    def load_model(self, path: str) -> bool:
        """
        Carga un modelo previamente guardado

        Args:
            path: Ruta del modelo

        Returns:
            True si exitoso
        """
        try:
            self.model = BERTopic.load(path)
            logger.info(f"✓ Modelo cargado desde: {path}")
            return True
        except Exception as e:
            logger.info(f"⚠️  Error cargando modelo: {e}")
            return False

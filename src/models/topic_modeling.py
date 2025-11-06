"""
Módulo de Modelado de Temas (Topic Modeling)
Implementa LDA, NMF y LSA para descubrir temas ocultos en el corpus
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from collections import defaultdict, Counter
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.decomposition import LatentDirichletAllocation, NMF, TruncatedSVD
from src.utils.logger import get_logger
import warnings
warnings.filterwarnings('ignore')

# Inicializar logger
logger = get_logger(__name__)


class TopicModelingAnalyzer:
    """Clase para análisis de modelado de temas usando LDA, NMF y LSA"""

    def __init__(self):
        """Inicializa el analizador de temas"""
        self.lda_model = None
        self.nmf_model = None
        self.lsa_model = None
        self.plsa_model = None
        self.vectorizer_bow = None
        self.vectorizer_tfidf = None
        self.feature_names = None

    def prepare_documents(self, texts_dict: Dict[str, str]) -> Tuple[List[str], List[str]]:
        """
        Prepara documentos para modelado de temas

        Args:
            texts_dict: Diccionario {nombre_doc: texto_preprocesado}

        Returns:
            Tupla de (nombres_documentos, textos)
        """
        doc_names = list(texts_dict.keys())
        documents = list(texts_dict.values())
        return doc_names, documents

    def fit_lda(self,
                documents: List[str],
                n_topics: int = 10,
                max_features: int = 1000,
                min_df: int = 2,
                max_df: float = 0.95,
                random_state: int = 42,
                max_iter: int = 20) -> Dict[str, Any]:
        """
        Entrena modelo LDA (Latent Dirichlet Allocation)

        Args:
            documents: Lista de documentos preprocesados
            n_topics: Número de temas a descubrir
            max_features: Número máximo de términos
            min_df: Frecuencia mínima de documento
            max_df: Frecuencia máxima de documento
            random_state: Semilla aleatoria
            max_iter: Iteraciones máximas

        Returns:
            Diccionario con resultados del modelo LDA
        """
        logger.info(f"Entrenando modelo LDA con {n_topics} temas...")

        # Crear vectorizador para LDA (usa BoW)
        self.vectorizer_bow = CountVectorizer(
            max_features=max_features,
            min_df=min_df,
            max_df=max_df
        )

        # Crear matriz documento-término
        doc_term_matrix = self.vectorizer_bow.fit_transform(documents)
        self.feature_names = self.vectorizer_bow.get_feature_names_out()

        # Entrenar modelo LDA
        self.lda_model = LatentDirichletAllocation(
            n_components=n_topics,
            random_state=random_state,
            max_iter=max_iter,
            learning_method='batch',
            n_jobs=-1
        )

        # Ajustar modelo
        doc_topic_dist = self.lda_model.fit_transform(doc_term_matrix)

        # Obtener distribución de temas
        topic_word_dist = self.lda_model.components_

        # Extraer top palabras por tema
        topics = self._extract_top_words(
            topic_word_dist,
            self.feature_names,
            n_words=10
        )

        # Calcular coherencia y perplejidad
        perplexity = self.lda_model.perplexity(doc_term_matrix)
        log_likelihood = self.lda_model.score(doc_term_matrix)

        logger.info(f"Modelo LDA entrenado exitosamente")
        logger.info(f"Perplejidad: {perplexity:.2f}, Log-likelihood: {log_likelihood:.2f}")

        return {
            'model_type': 'LDA',
            'n_topics': n_topics,
            'topics': topics,
            'doc_topic_distribution': doc_topic_dist,
            'topic_word_distribution': topic_word_dist,
            'feature_names': self.feature_names.tolist(),
            'perplexity': float(perplexity),
            'log_likelihood': float(log_likelihood),
            'vocabulary_size': len(self.feature_names)
        }

    def fit_nmf(self,
                documents: List[str],
                n_topics: int = 10,
                max_features: int = 1000,
                min_df: int = 2,
                max_df: float = 0.95,
                random_state: int = 42,
                max_iter: int = 200) -> Dict[str, Any]:
        """
        Entrena modelo NMF (Non-negative Matrix Factorization)

        Args:
            documents: Lista de documentos preprocesados
            n_topics: Número de temas a descubrir
            max_features: Número máximo de términos
            min_df: Frecuencia mínima de documento
            max_df: Frecuencia máxima de documento
            random_state: Semilla aleatoria
            max_iter: Iteraciones máximas

        Returns:
            Diccionario con resultados del modelo NMF
        """
        logger.info(f"Entrenando modelo NMF con {n_topics} temas...")

        # Crear vectorizador para NMF (usa TF-IDF)
        self.vectorizer_tfidf = TfidfVectorizer(
            max_features=max_features,
            min_df=min_df,
            max_df=max_df
        )

        # Crear matriz documento-término con TF-IDF
        doc_term_matrix = self.vectorizer_tfidf.fit_transform(documents)
        self.feature_names = self.vectorizer_tfidf.get_feature_names_out()

        # Entrenar modelo NMF
        self.nmf_model = NMF(
            n_components=n_topics,
            random_state=random_state,
            max_iter=max_iter,
            init='nndsvda',  # Inicialización mejorada
            solver='mu',  # Multiplicative Update solver
            beta_loss='frobenius'
        )

        # Ajustar modelo
        doc_topic_dist = self.nmf_model.fit_transform(doc_term_matrix)

        # Obtener distribución de temas
        topic_word_dist = self.nmf_model.components_

        # Extraer top palabras por tema
        topics = self._extract_top_words(
            topic_word_dist,
            self.feature_names,
            n_words=10
        )

        # Calcular error de reconstrucción
        reconstruction_error = self.nmf_model.reconstruction_err_

        logger.info(f"Modelo NMF entrenado exitosamente")
        logger.info(f"Error de reconstrucción: {reconstruction_error:.2f}")

        return {
            'model_type': 'NMF',
            'n_topics': n_topics,
            'topics': topics,
            'doc_topic_distribution': doc_topic_dist,
            'topic_word_distribution': topic_word_dist,
            'feature_names': self.feature_names.tolist(),
            'reconstruction_error': float(reconstruction_error),
            'vocabulary_size': len(self.feature_names)
        }

    def fit_lsa(self,
                documents: List[str],
                n_topics: int = 10,
                max_features: int = 1000,
                min_df: int = 2,
                max_df: float = 0.95,
                random_state: int = 42) -> Dict[str, Any]:
        """
        Entrena modelo LSA (Latent Semantic Analysis) usando SVD

        Args:
            documents: Lista de documentos preprocesados
            n_topics: Número de temas a descubrir
            max_features: Número máximo de términos
            min_df: Frecuencia mínima de documento
            max_df: Frecuencia máxima de documento
            random_state: Semilla aleatoria

        Returns:
            Diccionario con resultados del modelo LSA
        """
        logger.info(f"Entrenando modelo LSA con {n_topics} temas...")

        # Crear vectorizador para LSA (usa TF-IDF)
        self.vectorizer_tfidf = TfidfVectorizer(
            max_features=max_features,
            min_df=min_df,
            max_df=max_df
        )

        # Crear matriz documento-término con TF-IDF
        doc_term_matrix = self.vectorizer_tfidf.fit_transform(documents)
        self.feature_names = self.vectorizer_tfidf.get_feature_names_out()

        # Entrenar modelo LSA (usando TruncatedSVD)
        self.lsa_model = TruncatedSVD(
            n_components=n_topics,
            random_state=random_state,
            n_iter=100
        )

        # Ajustar modelo
        doc_topic_dist = self.lsa_model.fit_transform(doc_term_matrix)

        # Obtener distribución de temas
        topic_word_dist = self.lsa_model.components_

        # Extraer top palabras por tema
        topics = self._extract_top_words(
            topic_word_dist,
            self.feature_names,
            n_words=10
        )

        # Calcular varianza explicada
        explained_variance = self.lsa_model.explained_variance_ratio_.sum()

        logger.info(f"Modelo LSA entrenado exitosamente")
        logger.info(f"Varianza explicada: {explained_variance:.2%}")

        return {
            'model_type': 'LSA',
            'n_topics': n_topics,
            'topics': topics,
            'doc_topic_distribution': doc_topic_dist,
            'topic_word_distribution': topic_word_dist,
            'feature_names': self.feature_names.tolist(),
            'explained_variance': float(explained_variance),
            'explained_variance_ratio': self.lsa_model.explained_variance_ratio_.tolist(),
            'vocabulary_size': len(self.feature_names)
        }

    def fit_plsa(self,
                 documents: List[str],
                 n_topics: int = 10,
                 max_features: int = 1000,
                 min_df: int = 2,
                 max_df: float = 0.95,
                 max_iter: int = 100,
                 random_state: int = 42) -> Dict[str, Any]:
        """
        Entrena modelo pLSA (probabilistic Latent Semantic Analysis)
        Implementación basada en EM algorithm

        Args:
            documents: Lista de documentos preprocesados
            n_topics: Número de temas a descubrir
            max_features: Número máximo de términos
            min_df: Frecuencia mínima de documento
            max_df: Frecuencia máxima de documento
            max_iter: Iteraciones máximas
            random_state: Semilla aleatoria

        Returns:
            Diccionario con resultados del modelo pLSA
        """
        logger.info(f"Entrenando modelo pLSA con {n_topics} temas...")

        # Crear vectorizador para pLSA (usa BoW normalizado)
        self.vectorizer_bow = CountVectorizer(
            max_features=max_features,
            min_df=min_df,
            max_df=max_df
        )

        # Crear matriz documento-término
        doc_term_matrix = self.vectorizer_bow.fit_transform(documents)
        self.feature_names = self.vectorizer_bow.get_feature_names_out()

        # Convertir a matriz densa para EM algorithm
        dtm_dense = doc_term_matrix.toarray()
        n_docs, n_words = dtm_dense.shape

        # Normalizar por documento (probabilidades)
        doc_word_probs = dtm_dense / (dtm_dense.sum(axis=1, keepdims=True) + 1e-10)

        # Inicializar parámetros del modelo pLSA
        np.random.seed(random_state)

        # P(z|d) - Distribución de temas por documento
        doc_topic_dist = np.random.rand(n_docs, n_topics)
        doc_topic_dist = doc_topic_dist / doc_topic_dist.sum(axis=1, keepdims=True)

        # P(w|z) - Distribución de palabras por tema
        topic_word_dist = np.random.rand(n_topics, n_words)
        topic_word_dist = topic_word_dist / topic_word_dist.sum(axis=1, keepdims=True)

        # EM Algorithm
        log_likelihoods = []

        for iteration in range(max_iter):
            # E-Step: Calcular P(z|d,w)
            # P(z|d,w) = P(w|z) * P(z|d) / sum_z'(P(w|z') * P(z'|d))

            # Crear tensor 3D para cálculos eficientes
            # [n_docs, n_words, n_topics]
            posterior = np.zeros((n_docs, n_words, n_topics))

            for d in range(n_docs):
                for w in range(n_words):
                    if dtm_dense[d, w] > 0:  # Solo para palabras presentes
                        # P(w|z) * P(z|d)
                        numerator = topic_word_dist[:, w] * doc_topic_dist[d, :]
                        denominator = numerator.sum() + 1e-10
                        posterior[d, w, :] = numerator / denominator

            # M-Step: Actualizar parámetros

            # Actualizar P(w|z)
            for z in range(n_topics):
                for w in range(n_words):
                    numerator = 0
                    denominator = 0
                    for d in range(n_docs):
                        count = dtm_dense[d, w]
                        numerator += count * posterior[d, w, z]
                        denominator += dtm_dense[d, :].sum() * posterior[d, :, z].sum()
                    topic_word_dist[z, w] = numerator / (denominator + 1e-10)

            # Normalizar P(w|z)
            topic_word_dist = topic_word_dist / (topic_word_dist.sum(axis=1, keepdims=True) + 1e-10)

            # Actualizar P(z|d)
            for d in range(n_docs):
                for z in range(n_topics):
                    numerator = (dtm_dense[d, :] * posterior[d, :, z]).sum()
                    denominator = dtm_dense[d, :].sum() + 1e-10
                    doc_topic_dist[d, z] = numerator / denominator

            # Normalizar P(z|d)
            doc_topic_dist = doc_topic_dist / (doc_topic_dist.sum(axis=1, keepdims=True) + 1e-10)

            # Calcular log-likelihood
            log_likelihood = 0
            for d in range(n_docs):
                for w in range(n_words):
                    if dtm_dense[d, w] > 0:
                        p_w_d = (doc_topic_dist[d, :] * topic_word_dist[:, w]).sum()
                        log_likelihood += dtm_dense[d, w] * np.log(p_w_d + 1e-10)

            log_likelihoods.append(log_likelihood)

            # Convergencia
            if iteration > 0:
                improvement = abs(log_likelihoods[-1] - log_likelihoods[-2])
                if improvement < 0.1:
                    logger.info(f"Convergencia alcanzada en iteración {iteration + 1}")
                    break

            if (iteration + 1) % 10 == 0:
                logger.debug(f"Iteración {iteration + 1}/{max_iter}, Log-likelihood: {log_likelihood:.2f}")

        # Extraer top palabras por tema
        topics = self._extract_top_words(
            topic_word_dist,
            self.feature_names,
            n_words=10
        )

        # Calcular perplejidad
        perplexity = np.exp(-log_likelihoods[-1] / dtm_dense.sum())

        logger.info(f"Modelo pLSA entrenado exitosamente")
        logger.info(f"Log-likelihood: {log_likelihoods[-1]:.2f}, Perplejidad: {perplexity:.2f}, Iteraciones: {len(log_likelihoods)}")

        return {
            'model_type': 'pLSA',
            'n_topics': n_topics,
            'topics': topics,
            'doc_topic_distribution': doc_topic_dist,
            'topic_word_distribution': topic_word_dist,
            'feature_names': self.feature_names.tolist(),
            'log_likelihood': float(log_likelihoods[-1]),
            'perplexity': float(perplexity),
            'log_likelihoods': [float(ll) for ll in log_likelihoods],
            'iterations': len(log_likelihoods),
            'vocabulary_size': len(self.feature_names)
        }

    def _extract_top_words(self,
                          topic_word_dist: np.ndarray,
                          feature_names: np.ndarray,
                          n_words: int = 10) -> List[Dict[str, Any]]:
        """
        Extrae las palabras más importantes de cada tema

        Args:
            topic_word_dist: Distribución tema-palabra
            feature_names: Nombres de características (palabras)
            n_words: Número de palabras a extraer por tema

        Returns:
            Lista de diccionarios con información de cada tema
        """
        topics = []

        for topic_idx, topic in enumerate(topic_word_dist):
            # Obtener índices de las palabras más importantes
            top_indices = topic.argsort()[-n_words:][::-1]

            # Obtener palabras y pesos
            top_words = []
            for idx in top_indices:
                top_words.append({
                    'word': feature_names[idx],
                    'weight': float(topic[idx])
                })

            topics.append({
                'topic_id': topic_idx,
                'topic_name': f"Tema {topic_idx + 1}",
                'top_words': top_words,
                'top_words_str': ' | '.join([w['word'] for w in top_words])
            })

        return topics

    def get_document_topics(self,
                           doc_topic_dist: np.ndarray,
                           doc_names: List[str],
                           threshold: float = 0.1) -> List[Dict[str, Any]]:
        """
        Obtiene los temas dominantes por documento

        Args:
            doc_topic_dist: Distribución documento-tema
            doc_names: Nombres de documentos
            threshold: Umbral mínimo de probabilidad

        Returns:
            Lista con temas por documento
        """
        doc_topics = []

        for doc_idx, doc_name in enumerate(doc_names):
            # Obtener distribución de temas para este documento
            topic_dist = doc_topic_dist[doc_idx]

            # Tema dominante
            dominant_topic = int(topic_dist.argmax())
            dominant_prob = float(topic_dist[dominant_topic])

            # Todos los temas significativos
            significant_topics = []
            for topic_id, prob in enumerate(topic_dist):
                if prob >= threshold:
                    significant_topics.append({
                        'topic_id': int(topic_id),
                        'probability': float(prob)
                    })

            # Ordenar por probabilidad
            significant_topics.sort(key=lambda x: x['probability'], reverse=True)

            doc_topics.append({
                'document': doc_name,
                'dominant_topic': dominant_topic,
                'dominant_probability': dominant_prob,
                'significant_topics': significant_topics,
                'topic_distribution': topic_dist.tolist()
            })

        return doc_topics

    def compare_models(self,
                      lda_results: Dict[str, Any],
                      nmf_results: Dict[str, Any],
                      lsa_results: Dict[str, Any],
                      plsa_results: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Compara los resultados de los modelos

        Args:
            lda_results: Resultados de LDA
            nmf_results: Resultados de NMF
            lsa_results: Resultados de LSA
            plsa_results: Resultados de pLSA (opcional)

        Returns:
            Diccionario con comparación de modelos
        """
        models = ['LDA', 'NMF', 'LSA']
        metrics = {
            'LDA': {
                'perplexity': lda_results.get('perplexity'),
                'log_likelihood': lda_results.get('log_likelihood'),
                'type': 'Probabilístico'
            },
            'NMF': {
                'reconstruction_error': nmf_results.get('reconstruction_error'),
                'type': 'No Probabilístico (Algebraico)'
            },
            'LSA': {
                'explained_variance': lsa_results.get('explained_variance'),
                'type': 'No Probabilístico (Algebraico)'
            }
        }

        # Agregar pLSA si está disponible
        if plsa_results:
            models.append('pLSA')
            metrics['pLSA'] = {
                'perplexity': plsa_results.get('perplexity'),
                'log_likelihood': plsa_results.get('log_likelihood'),
                'type': 'Probabilístico'
            }

        # Calcular topic overlap
        topic_overlap = self._calculate_topic_overlap(
            lda_results['topics'],
            nmf_results['topics'],
            lsa_results['topics'],
            plsa_results['topics'] if plsa_results else None
        )

        comparison = {
            'models': models,
            'metrics': metrics,
            'topic_overlap': topic_overlap
        }

        return comparison

    def _calculate_topic_overlap(self,
                                topics_lda: List[Dict],
                                topics_nmf: List[Dict],
                                topics_lsa: List[Dict],
                                topics_plsa: Optional[List[Dict]] = None) -> Dict[str, float]:
        """
        Calcula el solapamiento entre temas de diferentes modelos

        Args:
            topics_lda: Temas de LDA
            topics_nmf: Temas de NMF
            topics_lsa: Temas de LSA
            topics_plsa: Temas de pLSA (opcional)

        Returns:
            Diccionario con métricas de solapamiento
        """
        # Extraer palabras top de cada modelo
        lda_words = set()
        nmf_words = set()
        lsa_words = set()

        for topic in topics_lda:
            lda_words.update([w['word'] for w in topic['top_words'][:5]])
        for topic in topics_nmf:
            nmf_words.update([w['word'] for w in topic['top_words'][:5]])
        for topic in topics_lsa:
            lsa_words.update([w['word'] for w in topic['top_words'][:5]])

        # Calcular Jaccard similarity
        overlap = {
            'LDA_NMF': float(len(lda_words & nmf_words) / len(lda_words | nmf_words)) if lda_words | nmf_words else 0,
            'LDA_LSA': float(len(lda_words & lsa_words) / len(lda_words | lsa_words)) if lda_words | lsa_words else 0,
            'NMF_LSA': float(len(nmf_words & lsa_words) / len(nmf_words | lsa_words)) if nmf_words | lsa_words else 0
        }

        # Agregar overlaps con pLSA si está disponible
        if topics_plsa:
            plsa_words = set()
            for topic in topics_plsa:
                plsa_words.update([w['word'] for w in topic['top_words'][:5]])

            overlap['LDA_pLSA'] = float(len(lda_words & plsa_words) / len(lda_words | plsa_words)) if lda_words | plsa_words else 0
            overlap['NMF_pLSA'] = float(len(nmf_words & plsa_words) / len(nmf_words | plsa_words)) if nmf_words | plsa_words else 0
            overlap['LSA_pLSA'] = float(len(lsa_words & plsa_words) / len(lsa_words | plsa_words)) if lsa_words | plsa_words else 0

        return overlap

    def analyze_topic_evolution(self,
                                doc_topics: List[Dict[str, Any]],
                                doc_names: List[str]) -> Dict[str, Any]:
        """
        Analiza la evolución de temas a través de los documentos

        Args:
            doc_topics: Temas por documento
            doc_names: Nombres de documentos

        Returns:
            Análisis de evolución de temas
        """
        # Agrupar documentos por tema dominante
        topic_groups = defaultdict(list)
        for dt in doc_topics:
            topic_groups[dt['dominant_topic']].append(dt['document'])

        # Calcular distribución de temas
        topic_distribution = {}
        for topic_id, docs in topic_groups.items():
            topic_distribution[f"Tema {topic_id + 1}"] = len(docs)

        return {
            'topic_groups': dict(topic_groups),
            'topic_distribution': topic_distribution,
            'total_documents': len(doc_names),
            'topics_found': len(topic_groups)
        }

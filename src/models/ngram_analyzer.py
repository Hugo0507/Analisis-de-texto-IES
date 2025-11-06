"""
Módulo de Análisis de N-gramas
Extrae y analiza unigramas, bigramas, trigramas y n-gramas en general
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any
from collections import Counter, defaultdict
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from src.utils.logger import get_logger
import warnings
warnings.filterwarnings('ignore')

# Inicializar logger
logger = get_logger(__name__)


class NgramAnalyzer:
    """Clase para análisis completo de n-gramas (unigramas, bigramas, trigramas, etc.)"""

    def __init__(self):
        """Inicializa el analizador de n-gramas"""
        self.unigrams = None
        self.bigrams = None
        self.trigrams = None
        self.vectorizers = {}
        self.matrices = {}

    def analyze_corpus(self,
                      texts_dict: Dict[str, str],
                      max_n: int = 3,
                      min_df: int = 2,
                      max_df: float = 0.95,
                      top_k: int = 50) -> Dict[str, Any]:
        """
        Analiza n-gramas en el corpus completo

        Args:
            texts_dict: Diccionario {nombre_doc: texto_preprocesado}
            max_n: Máximo n para n-gramas (ej: 3 = trigramas)
            min_df: Frecuencia mínima de documento
            max_df: Frecuencia máxima de documento
            top_k: Top K n-gramas a retornar por tipo

        Returns:
            Diccionario con análisis completo de n-gramas
        """
        logger.info(f"Analizando n-gramas (1 a {max_n}) en el corpus...")

        doc_names = list(texts_dict.keys())
        documents = list(texts_dict.values())

        results = {
            'config': {
                'max_n': max_n,
                'min_df': min_df,
                'max_df': max_df,
                'top_k': top_k,
                'num_documents': len(documents)
            },
            'ngrams': {}
        }

        # Analizar cada tipo de n-grama
        for n in range(1, max_n + 1):
            logger.debug(f"Extrayendo {self._ngram_name(n)}...")

            ngram_results = self._extract_ngrams(
                documents,
                doc_names,
                n=n,
                min_df=min_df,
                max_df=max_df,
                top_k=top_k
            )

            results['ngrams'][f'{n}grams'] = ngram_results

        # Análisis comparativo
        results['comparison'] = self._compare_ngrams(results['ngrams'])

        # Estadísticas globales
        results['statistics'] = self._calculate_statistics(results['ngrams'])

        logger.info("Análisis de n-gramas completado exitosamente")
        return results

    def _extract_ngrams(self,
                       documents: List[str],
                       doc_names: List[str],
                       n: int,
                       min_df: int,
                       max_df: float,
                       top_k: int) -> Dict[str, Any]:
        """
        Extrae n-gramas específicos (unigramas, bigramas, etc.)

        Args:
            documents: Lista de documentos
            doc_names: Nombres de documentos
            n: Tamaño del n-grama
            min_df: Frecuencia mínima
            max_df: Frecuencia máxima
            top_k: Top K a retornar

        Returns:
            Diccionario con resultados de n-gramas
        """
        # Vectorizador de frecuencias
        count_vectorizer = CountVectorizer(
            ngram_range=(n, n),
            min_df=min_df,
            max_df=max_df
        )

        # Vectorizador TF-IDF
        tfidf_vectorizer = TfidfVectorizer(
            ngram_range=(n, n),
            min_df=min_df,
            max_df=max_df
        )

        # Crear matrices
        count_matrix = count_vectorizer.fit_transform(documents)
        tfidf_matrix = tfidf_vectorizer.fit_transform(documents)

        # Obtener nombres de n-gramas
        feature_names = count_vectorizer.get_feature_names_out()

        # Calcular frecuencias globales
        total_counts = np.asarray(count_matrix.sum(axis=0)).flatten()

        # Frecuencia por documento
        doc_frequencies = (count_matrix > 0).sum(axis=0)
        doc_frequencies = np.asarray(doc_frequencies).flatten()

        # Scores TF-IDF promedio
        avg_tfidf_scores = np.asarray(tfidf_matrix.mean(axis=0)).flatten()

        # Crear DataFrame con todas las métricas
        ngrams_df = pd.DataFrame({
            'ngram': feature_names,
            'frequency': total_counts,
            'doc_frequency': doc_frequencies,
            'avg_tfidf': avg_tfidf_scores
        })

        # Ordenar por frecuencia
        ngrams_df = ngrams_df.sort_values('frequency', ascending=False)

        # Top K n-gramas
        top_ngrams = ngrams_df.head(top_k).to_dict('records')

        # Top n-gramas por documento
        top_per_doc = self._top_ngrams_per_document(
            count_matrix,
            feature_names,
            doc_names,
            top_k=10
        )

        # Diversidad de n-gramas
        diversity = self._calculate_diversity(ngrams_df)

        return {
            'ngram_type': self._ngram_name(n),
            'n': n,
            'total_unique': len(feature_names),
            'total_occurrences': int(total_counts.sum()),
            'top_ngrams': top_ngrams,
            'top_per_document': top_per_doc,
            'diversity': diversity,
            'all_ngrams_df': ngrams_df
        }

    def _top_ngrams_per_document(self,
                                 matrix,
                                 feature_names,
                                 doc_names,
                                 top_k=10) -> List[Dict[str, Any]]:
        """
        Obtiene los top n-gramas por documento

        Args:
            matrix: Matriz documento-término
            feature_names: Nombres de características
            doc_names: Nombres de documentos
            top_k: Número de top n-gramas

        Returns:
            Lista de diccionarios con top n-gramas por documento
        """
        results = []

        matrix_dense = matrix.toarray()

        for doc_idx, doc_name in enumerate(doc_names):
            doc_vector = matrix_dense[doc_idx]

            # Obtener índices de top n-gramas
            top_indices = doc_vector.argsort()[-top_k:][::-1]

            # Filtrar solo los que tienen frecuencia > 0
            top_ngrams = []
            for idx in top_indices:
                if doc_vector[idx] > 0:
                    top_ngrams.append({
                        'ngram': feature_names[idx],
                        'frequency': int(doc_vector[idx])
                    })

            results.append({
                'document': doc_name,
                'top_ngrams': top_ngrams
            })

        return results

    def _calculate_diversity(self, ngrams_df: pd.DataFrame) -> Dict[str, float]:
        """
        Calcula métricas de diversidad de n-gramas

        Args:
            ngrams_df: DataFrame con n-gramas

        Returns:
            Diccionario con métricas de diversidad
        """
        total_occurrences = ngrams_df['frequency'].sum()
        unique_ngrams = len(ngrams_df)

        # Type-Token Ratio (TTR)
        ttr = unique_ngrams / total_occurrences if total_occurrences > 0 else 0

        # Concentración (cuánto representan los top 10%)
        top_10_percent = int(unique_ngrams * 0.1)
        if top_10_percent > 0:
            top_freq = ngrams_df.head(top_10_percent)['frequency'].sum()
            concentration = top_freq / total_occurrences
        else:
            concentration = 0

        # Entropía de Shannon
        probabilities = ngrams_df['frequency'] / total_occurrences
        entropy = -np.sum(probabilities * np.log2(probabilities + 1e-10))

        # Gini coefficient
        sorted_freq = np.sort(ngrams_df['frequency'].values)
        n = len(sorted_freq)
        index = np.arange(1, n + 1)
        gini = (2 * np.sum(index * sorted_freq)) / (n * np.sum(sorted_freq)) - (n + 1) / n

        return {
            'type_token_ratio': float(ttr),
            'concentration_top10': float(concentration),
            'shannon_entropy': float(entropy),
            'gini_coefficient': float(gini),
            'unique_ngrams': int(unique_ngrams),
            'total_occurrences': int(total_occurrences)
        }

    def _compare_ngrams(self, ngrams_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compara diferentes tipos de n-gramas

        Args:
            ngrams_dict: Diccionario con resultados de n-gramas

        Returns:
            Comparación entre tipos de n-gramas
        """
        comparison = {
            'vocabulary_sizes': {},
            'total_occurrences': {},
            'diversity_comparison': {},
            'coverage_overlap': {}
        }

        # Comparar tamaños de vocabulario
        for ngram_key, ngram_data in ngrams_dict.items():
            comparison['vocabulary_sizes'][ngram_key] = ngram_data['total_unique']
            comparison['total_occurrences'][ngram_key] = ngram_data['total_occurrences']
            comparison['diversity_comparison'][ngram_key] = ngram_data['diversity']

        # Calcular overlap entre tipos (palabras compartidas)
        if '1grams' in ngrams_dict and '2grams' in ngrams_dict:
            # Extraer palabras de bigramas
            bigram_words = set()
            for bg in ngrams_dict['2grams']['top_ngrams']:
                words = bg['ngram'].split()
                bigram_words.update(words)

            # Palabras de unigramas
            unigram_words = set([ug['ngram'] for ug in ngrams_dict['1grams']['top_ngrams']])

            # Overlap
            overlap = len(bigram_words & unigram_words)
            comparison['coverage_overlap']['unigrams_in_bigrams'] = overlap

        return comparison

    def _calculate_statistics(self, ngrams_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcula estadísticas globales del análisis

        Args:
            ngrams_dict: Diccionario con n-gramas

        Returns:
            Estadísticas globales
        """
        stats = {
            'total_ngram_types': len(ngrams_dict),
            'summary_by_type': {}
        }

        for ngram_key, ngram_data in ngrams_dict.items():
            stats['summary_by_type'][ngram_key] = {
                'unique_count': ngram_data['total_unique'],
                'total_occurrences': ngram_data['total_occurrences'],
                'avg_frequency': ngram_data['total_occurrences'] / ngram_data['total_unique'] if ngram_data['total_unique'] > 0 else 0,
                'type_token_ratio': ngram_data['diversity']['type_token_ratio']
            }

        return stats

    def _ngram_name(self, n: int) -> str:
        """Retorna el nombre del n-grama"""
        names = {
            1: 'Unigramas',
            2: 'Bigramas',
            3: 'Trigramas',
            4: '4-gramas',
            5: '5-gramas'
        }
        return names.get(n, f'{n}-gramas')

    def extract_collocations(self,
                            texts_dict: Dict[str, str],
                            n: int = 2,
                            min_freq: int = 5,
                            top_k: int = 50) -> List[Dict[str, Any]]:
        """
        Extrae colocaciones (n-gramas frecuentes estadísticamente significativos)

        Args:
            texts_dict: Diccionario de textos
            n: Tamaño del n-grama
            min_freq: Frecuencia mínima
            top_k: Top K colocaciones

        Returns:
            Lista de colocaciones con scores
        """
        logger.info(f"Extrayendo colocaciones ({self._ngram_name(n)})...")

        documents = list(texts_dict.values())

        # Extraer n-gramas con frecuencias
        vectorizer = CountVectorizer(ngram_range=(n, n))
        matrix = vectorizer.fit_transform(documents)
        feature_names = vectorizer.get_feature_names_out()

        # Calcular frecuencias
        frequencies = np.asarray(matrix.sum(axis=0)).flatten()

        # Filtrar por frecuencia mínima
        valid_indices = frequencies >= min_freq
        valid_ngrams = feature_names[valid_indices]
        valid_freqs = frequencies[valid_indices]

        # Para bigramas, calcular PMI (Pointwise Mutual Information)
        if n == 2:
            collocations = self._calculate_pmi(
                valid_ngrams,
                valid_freqs,
                documents,
                top_k
            )
        else:
            # Para otros n-gramas, ordenar por frecuencia
            sorted_indices = valid_freqs.argsort()[::-1][:top_k]
            collocations = [
                {
                    'ngram': valid_ngrams[idx],
                    'frequency': int(valid_freqs[idx]),
                    'score': float(valid_freqs[idx])
                }
                for idx in sorted_indices
            ]

        logger.info(f"{len(collocations)} colocaciones encontradas")
        return collocations

    def _calculate_pmi(self,
                      ngrams: np.ndarray,
                      frequencies: np.ndarray,
                      documents: List[str],
                      top_k: int) -> List[Dict[str, Any]]:
        """
        Calcula PMI (Pointwise Mutual Information) para bigramas

        PMI(w1, w2) = log2(P(w1,w2) / (P(w1) * P(w2)))

        Args:
            ngrams: Array de bigramas
            frequencies: Frecuencias de bigramas
            documents: Documentos del corpus
            top_k: Top K a retornar

        Returns:
            Lista de bigramas con PMI scores
        """
        # Calcular frecuencias de palabras individuales
        word_vectorizer = CountVectorizer(ngram_range=(1, 1))
        word_matrix = word_vectorizer.fit_transform(documents)
        word_names = word_vectorizer.get_feature_names_out()
        word_frequencies = np.asarray(word_matrix.sum(axis=0)).flatten()

        # Crear diccionario de frecuencias de palabras
        word_freq_dict = dict(zip(word_names, word_frequencies))

        # Calcular total de palabras
        total_words = word_frequencies.sum()

        # Calcular PMI para cada bigrama
        pmi_scores = []

        for bigram, bigram_freq in zip(ngrams, frequencies):
            words = bigram.split()
            if len(words) == 2:
                w1, w2 = words

                # Frecuencias de palabras individuales
                f_w1 = word_freq_dict.get(w1, 0)
                f_w2 = word_freq_dict.get(w2, 0)

                if f_w1 > 0 and f_w2 > 0:
                    # Probabilidades
                    p_bigram = bigram_freq / total_words
                    p_w1 = f_w1 / total_words
                    p_w2 = f_w2 / total_words

                    # PMI
                    pmi = np.log2((p_bigram + 1e-10) / ((p_w1 * p_w2) + 1e-10))

                    pmi_scores.append({
                        'ngram': bigram,
                        'frequency': int(bigram_freq),
                        'pmi': float(pmi),
                        'score': float(pmi)
                    })

        # Ordenar por PMI
        pmi_scores.sort(key=lambda x: x['pmi'], reverse=True)

        return pmi_scores[:top_k]

    def analyze_ngram_patterns(self, texts_dict: Dict[str, str]) -> Dict[str, Any]:
        """
        Analiza patrones específicos en n-gramas

        Args:
            texts_dict: Diccionario de textos

        Returns:
            Análisis de patrones de n-gramas
        """
        logger.info("Analizando patrones de n-gramas...")

        documents = list(texts_dict.values())

        patterns = {
            'repeated_words': self._find_repeated_words(documents),
            'long_ngrams': self._find_long_ngrams(documents, min_n=4),
            'common_starters': self._find_common_starters(documents),
            'common_enders': self._find_common_enders(documents)
        }

        logger.info("Análisis de patrones completado exitosamente")
        return patterns

    def _find_repeated_words(self, documents: List[str], top_k: int = 20) -> List[Dict[str, Any]]:
        """Encuentra bigramas con palabras repetidas (ej: 'very very')"""
        vectorizer = CountVectorizer(ngram_range=(2, 2))
        matrix = vectorizer.fit_transform(documents)
        feature_names = vectorizer.get_feature_names_out()
        frequencies = np.asarray(matrix.sum(axis=0)).flatten()

        repeated = []
        for ngram, freq in zip(feature_names, frequencies):
            words = ngram.split()
            if len(words) == 2 and words[0] == words[1]:
                repeated.append({
                    'ngram': ngram,
                    'frequency': int(freq)
                })

        repeated.sort(key=lambda x: x['frequency'], reverse=True)
        return repeated[:top_k]

    def _find_long_ngrams(self, documents: List[str], min_n: int = 4, top_k: int = 20) -> List[Dict[str, Any]]:
        """Encuentra n-gramas largos (4+ palabras)"""
        vectorizer = CountVectorizer(ngram_range=(min_n, min_n))
        matrix = vectorizer.fit_transform(documents)
        feature_names = vectorizer.get_feature_names_out()
        frequencies = np.asarray(matrix.sum(axis=0)).flatten()

        long_ngrams = [
            {'ngram': ngram, 'frequency': int(freq)}
            for ngram, freq in zip(feature_names, frequencies)
        ]

        long_ngrams.sort(key=lambda x: x['frequency'], reverse=True)
        return long_ngrams[:top_k]

    def _find_common_starters(self, documents: List[str], top_k: int = 20) -> List[Dict[str, Any]]:
        """Encuentra las palabras más comunes al inicio de bigramas"""
        vectorizer = CountVectorizer(ngram_range=(2, 2))
        matrix = vectorizer.fit_transform(documents)
        feature_names = vectorizer.get_feature_names_out()
        frequencies = np.asarray(matrix.sum(axis=0)).flatten()

        starters = defaultdict(int)
        for ngram, freq in zip(feature_names, frequencies):
            first_word = ngram.split()[0]
            starters[first_word] += freq

        sorted_starters = sorted(starters.items(), key=lambda x: x[1], reverse=True)[:top_k]

        return [
            {'word': word, 'frequency': int(freq)}
            for word, freq in sorted_starters
        ]

    def _find_common_enders(self, documents: List[str], top_k: int = 20) -> List[Dict[str, Any]]:
        """Encuentra las palabras más comunes al final de bigramas"""
        vectorizer = CountVectorizer(ngram_range=(2, 2))
        matrix = vectorizer.fit_transform(documents)
        feature_names = vectorizer.get_feature_names_out()
        frequencies = np.asarray(matrix.sum(axis=0)).flatten()

        enders = defaultdict(int)
        for ngram, freq in zip(feature_names, frequencies):
            last_word = ngram.split()[-1]
            enders[last_word] += freq

        sorted_enders = sorted(enders.items(), key=lambda x: x[1], reverse=True)[:top_k]

        return [
            {'word': word, 'frequency': int(freq)}
            for word, freq in sorted_enders
        ]

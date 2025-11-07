"""
Módulo de Identificación Automática de Factores
Extrae, consolida y analiza factores relevantes de múltiples fuentes PLN
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Set, Any, Optional
from collections import Counter, defaultdict
from itertools import combinations
import re
from src.utils.logger import get_logger

logger = get_logger(__name__)


class FactorIdentifier:
    """
    Identifica automáticamente factores relevantes de múltiples fuentes:
    - Topic Modeling (LDA, NMF, LSA, pLSA, BERTopic)
    - TF-IDF
    - Named Entity Recognition
    - N-gramas
    - Co-ocurrencia de términos
    """

    def __init__(self):
        """Inicializa el identificador de factores"""
        logger.info("Inicializando FactorIdentifier")
        self.factors = {}
        self.factor_sources = defaultdict(list)
        self.factor_scores = {}
        self.factor_relations = defaultdict(dict)

    def extract_factors_from_topics(
        self,
        topic_results: Dict[str, Any],
        top_n_words: int = 10,
        min_weight: float = 0.01
    ) -> List[Dict[str, Any]]:
        """
        Extrae factores de resultados de topic modeling

        Args:
            topic_results: Resultados de LDA/NMF/LSA/pLSA/BERTopic
            top_n_words: Número de palabras top por tópico
            min_weight: Peso mínimo para considerar una palabra

        Returns:
            Lista de factores identificados con metadata
        """
        logger.info("Extrayendo factores de topic modeling...")
        factors = []

        if 'topics' not in topic_results:
            logger.warning("No se encontraron tópicos en los resultados")
            return factors

        model_type = topic_results.get('model_type', 'Unknown')
        topics = topic_results['topics']

        for topic_id, topic_info in enumerate(topics):
            # Extraer palabras del tópico
            if isinstance(topic_info, dict):
                words = topic_info.get('words', [])
                weights = topic_info.get('weights', [])
            elif isinstance(topic_info, list):
                words = [w[0] if isinstance(w, tuple) else w for w in topic_info[:top_n_words]]
                weights = [w[1] if isinstance(w, tuple) else 1.0 for w in topic_info[:top_n_words]]
            else:
                continue

            # Filtrar por peso mínimo
            for word, weight in zip(words[:top_n_words], weights[:top_n_words]):
                if weight >= min_weight:
                    factor = {
                        'term': word,
                        'source': f'topic_modeling_{model_type.lower()}',
                        'topic_id': topic_id,
                        'weight': float(weight),
                        'type': 'topic_keyword',
                        'model': model_type
                    }
                    factors.append(factor)

        logger.info(f"Extraídos {len(factors)} factores de {model_type}")
        return factors

    def extract_factors_from_tfidf(
        self,
        tfidf_results: Dict[str, Any],
        top_n: int = 100,
        min_score: float = 0.1
    ) -> List[Dict[str, Any]]:
        """
        Extrae factores de análisis TF-IDF

        Args:
            tfidf_results: Resultados de TF-IDF
            top_n: Número de términos top a considerar
            min_score: Score mínimo TF-IDF

        Returns:
            Lista de factores identificados
        """
        logger.info("Extrayendo factores de TF-IDF...")
        factors = []

        # Extraer de top terms global
        if 'top_terms_global' in tfidf_results:
            top_terms = tfidf_results['top_terms_global'][:top_n]

            for term_info in top_terms:
                if isinstance(term_info, dict):
                    term = term_info.get('term', '')
                    score = term_info.get('score', 0.0)
                elif isinstance(term_info, tuple):
                    term, score = term_info[0], term_info[1]
                else:
                    continue

                if score >= min_score:
                    factor = {
                        'term': term,
                        'source': 'tfidf_global',
                        'weight': float(score),
                        'type': 'tfidf_term',
                    }
                    factors.append(factor)

        logger.info(f"Extraídos {len(factors)} factores de TF-IDF")
        return factors

    def extract_factors_from_ner(
        self,
        ner_results: Dict[str, Any],
        min_frequency: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Extrae factores de Named Entity Recognition

        Args:
            ner_results: Resultados de NER (soporta múltiples estructuras)
            min_frequency: Frecuencia mínima de aparición

        Returns:
            Lista de factores identificados
        """
        logger.info("Extrayendo factores de NER...")
        factors = []

        # Soportar múltiples estructuras de datos
        entity_summary = None

        # Estructura 1: Directamente con 'entity_summary'
        if 'entity_summary' in ner_results:
            entity_summary = ner_results['entity_summary']

        # Estructura 2: Con 'corpus_analysis' -> 'top_entities_by_category'
        elif 'corpus_analysis' in ner_results:
            corpus = ner_results['corpus_analysis']
            if 'top_entities_by_category' in corpus:
                entity_summary = corpus['top_entities_by_category']

        # Estructura 3: Directamente con 'top_entities_by_category'
        elif 'top_entities_by_category' in ner_results:
            entity_summary = ner_results['top_entities_by_category']

        if not entity_summary:
            logger.warning("No se encontró resumen de entidades en NER (intenté entity_summary, corpus_analysis.top_entities_by_category)")
            return factors

        # Extraer factores
        for entity_type, entities in entity_summary.items():
            if isinstance(entities, dict):
                # Formato: {entity: count}
                for entity, count in entities.items():
                    if isinstance(count, (int, float)) and count >= min_frequency:
                        factor = {
                            'term': entity,
                            'source': 'ner',
                            'weight': float(count),
                            'type': 'named_entity',
                            'entity_type': entity_type
                        }
                        factors.append(factor)
            elif isinstance(entities, list):
                # Formato: [(entity, count), ...]
                for item in entities:
                    if isinstance(item, tuple) and len(item) >= 2:
                        entity, count = item[0], item[1]
                        if isinstance(count, (int, float)) and count >= min_frequency:
                            factor = {
                                'term': entity,
                                'source': 'ner',
                                'weight': float(count),
                                'type': 'named_entity',
                                'entity_type': entity_type
                            }
                            factors.append(factor)

        logger.info(f"Extraídos {len(factors)} factores de NER")
        return factors

    def extract_factors_from_ngrams(
        self,
        ngram_results: Dict[str, Any],
        top_n: int = 50,
        min_frequency: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Extrae factores de análisis de n-gramas

        Args:
            ngram_results: Resultados de n-gram analysis
            top_n: Número de n-gramas top
            min_frequency: Frecuencia mínima

        Returns:
            Lista de factores identificados
        """
        logger.info("Extrayendo factores de n-gramas...")
        factors = []

        # Procesar bigramas y trigramas
        for ngram_type in ['bigrams', 'trigrams']:
            if ngram_type in ngram_results:
                ngrams = ngram_results[ngram_type][:top_n]

                for ngram_info in ngrams:
                    if isinstance(ngram_info, dict):
                        term = ngram_info.get('ngram', '')
                        freq = ngram_info.get('frequency', 0)
                    elif isinstance(ngram_info, tuple):
                        term, freq = ngram_info[0], ngram_info[1]
                    else:
                        continue

                    if freq >= min_frequency:
                        factor = {
                            'term': term,
                            'source': f'ngrams_{ngram_type}',
                            'weight': float(freq),
                            'type': 'ngram',
                            'ngram_type': ngram_type
                        }
                        factors.append(factor)

        logger.info(f"Extraídos {len(factors)} factores de n-gramas")
        return factors

    def consolidate_factors(
        self,
        all_factors: List[Dict[str, Any]],
        similarity_threshold: float = 0.85
    ) -> pd.DataFrame:
        """
        Consolida factores de múltiples fuentes, eliminando duplicados
        y agrupando términos similares

        Args:
            all_factors: Lista de todos los factores extraídos
            similarity_threshold: Umbral de similitud para agrupar

        Returns:
            DataFrame con factores consolidados
        """
        logger.info(f"Consolidando {len(all_factors)} factores...")

        if not all_factors:
            logger.warning("No hay factores para consolidar")
            return pd.DataFrame()

        # Agrupar por término exacto primero
        term_groups = defaultdict(list)
        for factor in all_factors:
            term = factor['term'].lower().strip()
            term_groups[term].append(factor)

        # Consolidar cada grupo
        consolidated = []
        for term, factors in term_groups.items():
            # Calcular peso total (suma de pesos normalizados por fuente)
            total_weight = sum(f['weight'] for f in factors)
            avg_weight = total_weight / len(factors)

            # Contar fuentes
            sources = [f['source'] for f in factors]
            source_counts = Counter(sources)

            # Determinar tipo principal
            types = [f['type'] for f in factors]
            main_type = Counter(types).most_common(1)[0][0]

            consolidated_factor = {
                'term': term,
                'total_weight': total_weight,
                'avg_weight': avg_weight,
                'frequency': len(factors),
                'sources': list(source_counts.keys()),
                'source_count': len(source_counts),
                'main_type': main_type,
                'source_distribution': dict(source_counts)
            }
            consolidated.append(consolidated_factor)

        # Crear DataFrame
        df = pd.DataFrame(consolidated)

        # Ordenar por peso total
        df = df.sort_values('total_weight', ascending=False).reset_index(drop=True)

        logger.info(f"Consolidados a {len(df)} factores únicos")
        return df

    def calculate_cooccurrence(
        self,
        texts_dict: Dict[str, str],
        factors_df: pd.DataFrame,
        top_n_factors: int = 100,
        window_size: int = 50
    ) -> pd.DataFrame:
        """
        Calcula matriz de co-ocurrencia entre factores

        Args:
            texts_dict: Diccionario {doc_id: texto_preprocesado}
            factors_df: DataFrame de factores consolidados
            top_n_factors: Número de factores top a analizar
            window_size: Tamaño de ventana de palabras para co-ocurrencia

        Returns:
            DataFrame con matriz de co-ocurrencia
        """
        logger.info("Calculando co-ocurrencia de factores...")

        # Tomar top N factores
        top_factors = factors_df.head(top_n_factors)['term'].tolist()

        # Inicializar matriz de co-ocurrencia
        cooccurrence = defaultdict(lambda: defaultdict(int))

        # Analizar cada documento
        for doc_id, text in texts_dict.items():
            words = text.lower().split()

            # Encontrar posiciones de factores
            factor_positions = defaultdict(list)
            for i, word in enumerate(words):
                if word in top_factors:
                    factor_positions[word].append(i)

            # Calcular co-ocurrencias dentro de ventanas
            for factor1 in factor_positions:
                for pos1 in factor_positions[factor1]:
                    for factor2 in factor_positions:
                        if factor1 != factor2:
                            for pos2 in factor_positions[factor2]:
                                if abs(pos1 - pos2) <= window_size:
                                    cooccurrence[factor1][factor2] += 1

        # Convertir a DataFrame
        cooc_matrix = pd.DataFrame(cooccurrence).fillna(0)

        logger.info(f"Calculada matriz de co-ocurrencia: {cooc_matrix.shape}")
        return cooc_matrix

    def identify_factor_clusters(
        self,
        factors_df: pd.DataFrame,
        cooccurrence_matrix: pd.DataFrame,
        n_clusters: int = 8
    ) -> pd.DataFrame:
        """
        Identifica clusters de factores relacionados

        Args:
            factors_df: DataFrame de factores
            cooccurrence_matrix: Matriz de co-ocurrencia
            n_clusters: Número de clusters a identificar

        Returns:
            DataFrame con clusters asignados
        """
        logger.info("Identificando clusters de factores...")

        try:
            from sklearn.cluster import KMeans
            from sklearn.preprocessing import StandardScaler

            # Preparar datos para clustering
            # Usar co-ocurrencia como features
            terms_in_matrix = cooccurrence_matrix.index.tolist()
            features = cooccurrence_matrix.loc[terms_in_matrix, terms_in_matrix].values

            # Normalizar
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(features)

            # K-Means clustering
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            clusters = kmeans.fit_predict(features_scaled)

            # Asignar clusters
            cluster_df = pd.DataFrame({
                'term': terms_in_matrix,
                'cluster_id': clusters
            })

            # Merge con factors_df
            factors_with_clusters = factors_df.merge(
                cluster_df,
                on='term',
                how='left'
            )

            logger.info(f"Identificados {n_clusters} clusters de factores")
            return factors_with_clusters

        except Exception as e:
            logger.error(f"Error en clustering: {e}")
            factors_df['cluster_id'] = -1
            return factors_df

    def generate_factor_summary(
        self,
        factors_df: pd.DataFrame,
        top_n: int = 50
    ) -> Dict[str, Any]:
        """
        Genera resumen estadístico de factores identificados

        Args:
            factors_df: DataFrame de factores consolidados
            top_n: Número de factores top para resumen

        Returns:
            Diccionario con resumen estadístico
        """
        logger.info("Generando resumen de factores...")

        summary = {
            'total_factors': len(factors_df),
            'top_factors': factors_df.head(top_n).to_dict('records'),
            'factors_by_type': factors_df['main_type'].value_counts().to_dict(),
            'avg_weight': factors_df['total_weight'].mean(),
            'median_weight': factors_df['total_weight'].median(),
            'factors_multi_source': len(factors_df[factors_df['source_count'] > 1]),
            'source_distribution': factors_df['source_count'].value_counts().to_dict()
        }

        logger.info(f"Resumen generado: {summary['total_factors']} factores totales")
        return summary

    def export_results(
        self,
        factors_df: pd.DataFrame,
        cooccurrence_matrix: pd.DataFrame,
        summary: Dict[str, Any],
        output_dir: str = 'output'
    ) -> Dict[str, str]:
        """
        Exporta resultados a archivos

        Args:
            factors_df: DataFrame de factores
            cooccurrence_matrix: Matriz de co-ocurrencia
            summary: Resumen estadístico
            output_dir: Directorio de salida

        Returns:
            Diccionario con rutas de archivos exportados
        """
        import os
        import json
        from datetime import datetime

        logger.info("Exportando resultados...")

        # Crear directorio si no existe
        os.makedirs(output_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        files_exported = {}

        try:
            # Exportar factores a CSV
            factors_file = os.path.join(output_dir, f'factors_{timestamp}.csv')
            factors_df.to_csv(factors_file, index=False, encoding='utf-8')
            files_exported['factors_csv'] = factors_file

            # Exportar co-ocurrencia
            cooc_file = os.path.join(output_dir, f'cooccurrence_{timestamp}.csv')
            cooccurrence_matrix.to_csv(cooc_file, encoding='utf-8')
            files_exported['cooccurrence_csv'] = cooc_file

            # Exportar resumen a JSON
            summary_file = os.path.join(output_dir, f'factor_summary_{timestamp}.json')
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)
            files_exported['summary_json'] = summary_file

            logger.info(f"Resultados exportados a {output_dir}")
            return files_exported

        except Exception as e:
            logger.error(f"Error exportando resultados: {e}")
            return {}

    def save_results_for_cache(
        self,
        results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Prepara resultados para guardar en caché (serializable)

        Args:
            results: Resultados completos del análisis

        Returns:
            Diccionario serializable para JSON
        """
        import json

        cache_data = {}

        try:
            # Guardar factors_df como lista de diccionarios
            if 'factors_df' in results and not results['factors_df'].empty:
                cache_data['factors_df'] = results['factors_df'].to_dict('records')
                cache_data['factors_df_columns'] = results['factors_df'].columns.tolist()

            # Guardar cooccurrence_matrix
            if 'cooccurrence_matrix' in results and not results['cooccurrence_matrix'].empty:
                cache_data['cooccurrence_matrix'] = {
                    'data': results['cooccurrence_matrix'].to_dict(),
                    'index': results['cooccurrence_matrix'].index.tolist(),
                    'columns': results['cooccurrence_matrix'].columns.tolist()
                }

            # Guardar summary (ya es serializable)
            if 'summary' in results:
                # Filtrar 'top_factors' que puede ser muy grande
                summary_copy = results['summary'].copy()
                if 'top_factors' in summary_copy:
                    summary_copy['top_factors'] = summary_copy['top_factors'][:20]  # Solo top 20
                cache_data['summary'] = summary_copy

            # Guardar metadata de red
            if 'network' in results:
                network = results['network']
                cache_data['network'] = {
                    'n_nodes': network.get('n_nodes', 0),
                    'n_edges': network.get('n_edges', 0)
                }

            # Guardar métricas
            if 'metrics' in results:
                cache_data['metrics'] = results['metrics']

            # Timestamp y config
            cache_data['timestamp'] = results.get('timestamp', '')
            cache_data['config'] = results.get('config', {})

            return cache_data

        except Exception as e:
            logger.error(f"Error preparando datos para caché: {e}")
            return {}

    def load_results_from_cache(
        self,
        cache_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Reconstruye resultados desde caché

        Args:
            cache_data: Datos cargados desde caché

        Returns:
            Diccionario con resultados reconstruidos
        """
        try:
            results = {}

            # Reconstruir factors_df
            if 'factors_df' in cache_data and cache_data['factors_df']:
                results['factors_df'] = pd.DataFrame(cache_data['factors_df'])
                if 'factors_df_columns' in cache_data:
                    results['factors_df'] = results['factors_df'][cache_data['factors_df_columns']]
            else:
                results['factors_df'] = pd.DataFrame()

            # Reconstruir cooccurrence_matrix
            if 'cooccurrence_matrix' in cache_data:
                cooc = cache_data['cooccurrence_matrix']
                results['cooccurrence_matrix'] = pd.DataFrame(
                    cooc['data'],
                    index=cooc.get('index', []),
                    columns=cooc.get('columns', [])
                )
            else:
                results['cooccurrence_matrix'] = pd.DataFrame()

            # Cargar summary
            results['summary'] = cache_data.get('summary', {})

            # Cargar network y metrics
            results['network'] = cache_data.get('network', {})
            results['metrics'] = cache_data.get('metrics', {})

            # Metadata
            results['timestamp'] = cache_data.get('timestamp', '')
            results['config'] = cache_data.get('config', {})

            logger.info("Resultados reconstruidos desde caché correctamente")
            return results

        except Exception as e:
            logger.error(f"Error reconstruyendo resultados desde caché: {e}")
            return {}

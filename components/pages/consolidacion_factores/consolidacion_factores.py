"""
Módulo de Lógica - Consolidación de Factores
Funciones para integrar y analizar resultados de todas las fases del análisis
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
from collections import Counter
import itertools


def consolidate_tfidf_factors(tfidf_results: Dict[str, Any], top_n: int = 20) -> pd.DataFrame:
    """
    Consolida los factores más relevantes del análisis TF-IDF

    Args:
        tfidf_results: Resultados del análisis TF-IDF
        top_n: Número de términos top a extraer

    Returns:
        DataFrame con términos y sus puntajes promedio
    """
    if not tfidf_results or 'top_terms_per_doc' not in tfidf_results:
        return pd.DataFrame(columns=['Término', 'Puntaje Promedio', 'Frecuencia'])

    # Recopilar todos los términos con sus puntajes
    all_terms = []
    for doc_terms in tfidf_results['top_terms_per_doc'].values():
        for term, score in doc_terms:
            all_terms.append({'term': term, 'score': score})

    if not all_terms:
        return pd.DataFrame(columns=['Término', 'Puntaje Promedio', 'Frecuencia'])

    # Crear DataFrame y calcular promedios
    df = pd.DataFrame(all_terms)
    consolidated = df.groupby('term').agg({
        'score': ['mean', 'count']
    }).reset_index()

    consolidated.columns = ['Término', 'Puntaje Promedio', 'Frecuencia']
    consolidated = consolidated.sort_values('Puntaje Promedio', ascending=False).head(top_n)

    return consolidated


def consolidate_topics(topic_results: Dict[str, Any], top_n: int = 5) -> List[Dict[str, Any]]:
    """
    Consolida los topics principales de LDA/NMF/LSA

    Args:
        topic_results: Resultados del topic modeling
        top_n: Número de topics principales

    Returns:
        Lista de diccionarios con información de cada topic
    """
    if not topic_results or 'topics' not in topic_results:
        return []

    topics_list = []
    for i, topic in enumerate(topic_results['topics'][:top_n]):
        topics_list.append({
            'topic_id': i,
            'top_words': ', '.join([word for word, _ in topic[:10]]),
            'relevance': sum([score for _, score in topic[:10]])
        })

    return topics_list


def consolidate_entities(ner_results: Dict[str, Any], top_n: int = 15) -> pd.DataFrame:
    """
    Consolida las entidades más frecuentes del análisis NER

    Args:
        ner_results: Resultados del análisis NER
        top_n: Número de entidades top

    Returns:
        DataFrame con entidades, tipos y frecuencias
    """
    if not ner_results or 'entities' not in ner_results:
        return pd.DataFrame(columns=['Entidad', 'Tipo', 'Frecuencia'])

    # Contar entidades por tipo
    entity_counts = {}
    for entity_type, entities in ner_results['entities'].items():
        for entity, count in entities.items():
            key = (entity, entity_type)
            entity_counts[key] = entity_counts.get(key, 0) + count

    # Crear DataFrame
    data = [
        {'Entidad': entity, 'Tipo': etype, 'Frecuencia': count}
        for (entity, etype), count in entity_counts.items()
    ]

    df = pd.DataFrame(data)
    df = df.sort_values('Frecuencia', ascending=False).head(top_n)

    return df


def build_cooccurrence_matrix(terms: List[str], documents: List[str], window_size: int = 5) -> pd.DataFrame:
    """
    Construye matriz de co-ocurrencia de términos

    Args:
        terms: Lista de términos de interés
        documents: Lista de documentos (textos)
        window_size: Tamaño de ventana para co-ocurrencia

    Returns:
        DataFrame con matriz de co-ocurrencia
    """
    # Inicializar matriz
    cooc_matrix = np.zeros((len(terms), len(terms)))
    term_to_idx = {term: i for i, term in enumerate(terms)}

    # Calcular co-ocurrencias
    for doc in documents:
        words = doc.lower().split()
        for i, word in enumerate(words):
            if word in term_to_idx:
                idx1 = term_to_idx[word]
                # Buscar en ventana
                start = max(0, i - window_size)
                end = min(len(words), i + window_size + 1)
                for j in range(start, end):
                    if i != j and words[j] in term_to_idx:
                        idx2 = term_to_idx[words[j]]
                        cooc_matrix[idx1, idx2] += 1

    # Crear DataFrame
    df = pd.DataFrame(cooc_matrix, index=terms, columns=terms)
    return df


def generate_network_data(cooccurrence_df: pd.DataFrame, threshold: float = 0.1) -> Dict[str, Any]:
    """
    Genera datos para visualización de red de factores

    Args:
        cooccurrence_df: Matriz de co-ocurrencia
        threshold: Umbral mínimo de conexión

    Returns:
        Diccionario con nodes y edges para network graph
    """
    nodes = []
    edges = []

    # Crear nodos
    for i, term in enumerate(cooccurrence_df.index):
        nodes.append({
            'id': i,
            'label': term,
            'size': cooccurrence_df.loc[term].sum()
        })

    # Crear edges (solo valores sobre el umbral)
    max_value = cooccurrence_df.max().max()
    threshold_value = max_value * threshold

    for i, term1 in enumerate(cooccurrence_df.index):
        for j, term2 in enumerate(cooccurrence_df.columns):
            if i < j:  # Evitar duplicados
                weight = cooccurrence_df.loc[term1, term2]
                if weight > threshold_value:
                    edges.append({
                        'source': i,
                        'target': j,
                        'weight': float(weight),
                        'normalized_weight': float(weight / max_value)
                    })

    return {'nodes': nodes, 'edges': edges}


def calculate_factor_relevance(
    tfidf_df: pd.DataFrame,
    topics_list: List[Dict],
    entities_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Calcula relevancia integrada de factores desde múltiples fuentes

    Args:
        tfidf_df: DataFrame de términos TF-IDF
        topics_list: Lista de topics
        entities_df: DataFrame de entidades

    Returns:
        DataFrame consolidado con factores y métricas de relevancia
    """
    factors = []

    # Factores de TF-IDF
    if not tfidf_df.empty:
        for _, row in tfidf_df.iterrows():
            factors.append({
                'Factor': row['Término'],
                'Fuente': 'TF-IDF',
                'Relevancia': row['Puntaje Promedio'],
                'Frecuencia': row['Frecuencia']
            })

    # Factores de entidades
    if not entities_df.empty:
        for _, row in entities_df.iterrows():
            factors.append({
                'Factor': row['Entidad'],
                'Fuente': f"NER ({row['Tipo']})",
                'Relevancia': row['Frecuencia'] / entities_df['Frecuencia'].max(),
                'Frecuencia': row['Frecuencia']
            })

    # Factores de topics (palabras clave)
    for topic in topics_list:
        top_words = topic['top_words'].split(', ')[:5]
        for word in top_words:
            factors.append({
                'Factor': word,
                'Fuente': f"Topic {topic['topic_id']}",
                'Relevancia': topic['relevance'] / (len(topics_list) * 10),
                'Frecuencia': 1
            })

    # Crear DataFrame y agregar por factor
    if not factors:
        return pd.DataFrame(columns=['Factor', 'Fuentes', 'Relevancia Total', 'Frecuencia Total'])

    df = pd.DataFrame(factors)

    # Consolidar factores que aparecen en múltiples fuentes
    consolidated = df.groupby('Factor').agg({
        'Fuente': lambda x: ', '.join(set(x)),
        'Relevancia': 'sum',
        'Frecuencia': 'sum'
    }).reset_index()

    consolidated.columns = ['Factor', 'Fuentes', 'Relevancia Total', 'Frecuencia Total']
    consolidated = consolidated.sort_values('Relevancia Total', ascending=False)

    return consolidated


def generate_qualitative_insights(
    consolidated_factors: pd.DataFrame,
    classification_results: Dict[str, Any] = None
) -> List[Dict[str, str]]:
    """
    Genera insights cualitativos basados en los factores identificados

    Args:
        consolidated_factors: DataFrame con factores consolidados
        classification_results: Resultados opcionales de clasificación

    Returns:
        Lista de insights con tipo, título y descripción
    """
    insights = []

    if consolidated_factors.empty:
        insights.append({
            'type': 'warning',
            'title': 'Sin factores identificados',
            'description': 'No se han identificado factores relevantes en el análisis. Verifica que hayas completado las fases anteriores.'
        })
        return insights

    # Insight 1: Factores dominantes
    top_factor = consolidated_factors.iloc[0]
    insights.append({
        'type': 'success',
        'title': f'Factor más relevante: {top_factor["Factor"]}',
        'description': f'Este factor aparece en: {top_factor["Fuentes"]} con una relevancia total de {top_factor["Relevancia Total"]:.3f}. '
                      f'Esto sugiere que es un tema central en la transformación digital según tu corpus de documentos.'
    })

    # Insight 2: Diversidad de fuentes
    multi_source = consolidated_factors[consolidated_factors['Fuentes'].str.contains(',')]
    if not multi_source.empty:
        insights.append({
            'type': 'info',
            'title': f'Factores validados por múltiples técnicas: {len(multi_source)}',
            'description': f'Hay {len(multi_source)} factores que aparecen en múltiples análisis (TF-IDF, NER, Topics), '
                          f'lo que indica alta consistencia y confiabilidad en su identificación.'
        })

    # Insight 3: Top 5 factores
    top_5 = consolidated_factors.head(5)['Factor'].tolist()
    insights.append({
        'type': 'info',
        'title': 'Top 5 factores clave identificados',
        'description': f'Los cinco factores más relevantes son: {", ".join(top_5)}. '
                      f'Estos representan los conceptos más importantes en tu análisis de transformación digital en IES.'
    })

    # Insight 4: Clasificación (si está disponible)
    if classification_results and 'document_labels' in classification_results:
        unique_classes = len(set(classification_results['document_labels'].values()))
        insights.append({
            'type': 'success',
            'title': f'Documentos clasificados en {unique_classes} categorías',
            'description': f'El análisis de clasificación ha organizado los documentos en {unique_classes} grupos temáticos, '
                          f'facilitando la identificación de patrones y tendencias específicas.'
        })

    return insights


def prepare_export_data(
    tfidf_df: pd.DataFrame,
    topics_list: List[Dict],
    entities_df: pd.DataFrame,
    consolidated_factors: pd.DataFrame,
    insights: List[Dict]
) -> Dict[str, Any]:
    """
    Prepara datos consolidados para exportación

    Args:
        tfidf_df: DataFrame TF-IDF
        topics_list: Lista de topics
        entities_df: DataFrame de entidades
        consolidated_factors: Factores consolidados
        insights: Insights cualitativos

    Returns:
        Diccionario con todos los datos organizados para exportar
    """
    export_data = {
        'resumen': {
            'total_factores_identificados': len(consolidated_factors),
            'factores_multifuente': len(consolidated_factors[consolidated_factors['Fuentes'].str.contains(',')]),
            'total_insights': len(insights)
        },
        'tfidf': tfidf_df.to_dict('records') if not tfidf_df.empty else [],
        'topics': topics_list,
        'entities': entities_df.to_dict('records') if not entities_df.empty else [],
        'factores_consolidados': consolidated_factors.to_dict('records') if not consolidated_factors.empty else [],
        'insights': insights
    }

    return export_data

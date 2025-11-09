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
        # doc_terms es un diccionario {término: puntaje}
        for term, score in doc_terms.items():
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


def categorize_factors_by_dimension(consolidated_factors: pd.DataFrame) -> Dict[str, List[str]]:
    """
    Categoriza factores en dimensiones teóricas de transformación digital

    Args:
        consolidated_factors: DataFrame con factores consolidados

    Returns:
        Diccionario con factores categorizados por dimensión
    """
    # Diccionario de palabras clave por dimensión teórica
    dimension_keywords = {
        'Tecnológica': [
            'digital', 'technology', 'platform', 'cloud', 'software', 'system', 'data',
            'infrastructure', 'internet', 'web', 'mobile', 'application', 'tool',
            'artificial', 'intelligence', 'machine', 'learning', 'ai', 'ict', 'technologies'
        ],
        'Pedagógica/Educativa': [
            'learning', 'education', 'teaching', 'student', 'teacher', 'course', 'curriculum',
            'pedagogy', 'didactic', 'assessment', 'competence', 'skill', 'training',
            'knowledge', 'instruction', 'academic', 'educational'
        ],
        'Organizacional/Institucional': [
            'university', 'institution', 'organization', 'management', 'governance',
            'strategy', 'leadership', 'structure', 'policy', 'process', 'administrative',
            'organizational', 'institutional', 'strategic'
        ],
        'Humana/Social': [
            'people', 'user', 'human', 'social', 'collaboration', 'communication',
            'community', 'culture', 'behavior', 'interaction', 'engagement', 'experience',
            'adoption', 'acceptance', 'change'
        ],
        'Innovación/Investigación': [
            'innovation', 'research', 'development', 'transformation', 'digital transformation',
            'change', 'innovation', 'creative', 'novel', 'emerging', 'future', 'trend'
        ],
        'Calidad/Evaluación': [
            'quality', 'evaluation', 'assessment', 'performance', 'effectiveness',
            'impact', 'outcome', 'result', 'measure', 'metric', 'indicator'
        ]
    }

    categorized = {dim: [] for dim in dimension_keywords.keys()}
    categorized['Otros'] = []

    for _, row in consolidated_factors.iterrows():
        factor = row['Factor'].lower()
        assigned = False

        for dimension, keywords in dimension_keywords.items():
            if any(keyword in factor for keyword in keywords):
                categorized[dimension].append(row['Factor'])
                assigned = True
                break

        if not assigned:
            categorized['Otros'].append(row['Factor'])

    # Filtrar dimensiones vacías
    return {k: v for k, v in categorized.items() if v}


def build_thematic_matrix(
    consolidated_factors: pd.DataFrame,
    categorized_factors: Dict[str, List[str]]
) -> pd.DataFrame:
    """
    Construye una matriz de análisis temático con factores y dimensiones

    Args:
        consolidated_factors: DataFrame con factores consolidados
        categorized_factors: Factores categorizados por dimensión

    Returns:
        DataFrame con matriz temática
    """
    matrix_data = []

    for dimension, factors in categorized_factors.items():
        for factor in factors:
            # Buscar el factor en consolidated_factors
            factor_data = consolidated_factors[consolidated_factors['Factor'] == factor]
            if not factor_data.empty:
                matrix_data.append({
                    'Dimensión Teórica': dimension,
                    'Factor': factor,
                    'Relevancia': factor_data.iloc[0]['Relevancia Total'],
                    'Fuentes': factor_data.iloc[0]['Fuentes'],
                    'Validación': 'Multi-técnica' if ',' in factor_data.iloc[0]['Fuentes'] else 'Única técnica'
                })

    df = pd.DataFrame(matrix_data)
    if not df.empty:
        df = df.sort_values(['Dimensión Teórica', 'Relevancia'], ascending=[True, False])

    return df


def generate_qualitative_coding(thematic_matrix: pd.DataFrame) -> Dict[str, Any]:
    """
    Genera codificación cualitativa automatizada de factores

    Args:
        thematic_matrix: Matriz temática de factores

    Returns:
        Diccionario con códigos cualitativos y análisis
    """
    if thematic_matrix.empty:
        return {}

    coding = {
        'dimensiones_identificadas': thematic_matrix['Dimensión Teórica'].unique().tolist(),
        'total_factores_por_dimension': thematic_matrix.groupby('Dimensión Teórica').size().to_dict(),
        'factores_alta_validacion': thematic_matrix[thematic_matrix['Validación'] == 'Multi-técnica'].to_dict('records'),
        'dimension_dominante': thematic_matrix.groupby('Dimensión Teórica').size().idxmax() if len(thematic_matrix) > 0 else None,
        'cobertura_teorica': {
            'dimensiones_cubiertas': len(thematic_matrix['Dimensión Teórica'].unique()),
            'porcentaje_multitecnica': (thematic_matrix['Validación'] == 'Multi-técnica').sum() / len(thematic_matrix) * 100
        }
    }

    return coding


def generate_interpretation_guide(
    consolidated_factors: pd.DataFrame,
    thematic_matrix: pd.DataFrame,
    qualitative_coding: Dict[str, Any]
) -> Dict[str, List[str]]:
    """
    Genera guía de preguntas para interpretación cualitativa profunda

    Args:
        consolidated_factors: Factores consolidados
        thematic_matrix: Matriz temática
        qualitative_coding: Codificación cualitativa

    Returns:
        Diccionario con preguntas guía organizadas por categoría
    """
    guide = {}

    # Preguntas sobre factores identificados
    guide['Sobre los factores identificados'] = [
        f"¿Cómo se relacionan los factores principales ({', '.join(consolidated_factors.head(3)['Factor'].tolist())}) con el marco teórico de transformación digital en IES?",
        "¿Qué factores identificados confirman o contradicen la literatura existente?",
        "¿Existen factores emergentes no contemplados en el marco teórico inicial?",
        "¿Qué factores aparecen validados por múltiples técnicas y por qué esto es significativo?"
    ]

    # Preguntas sobre dimensiones teóricas
    if qualitative_coding and 'dimension_dominante' in qualitative_coding:
        dim_dominante = qualitative_coding['dimension_dominante']
        guide['Sobre las dimensiones teóricas'] = [
            f"¿Por qué la dimensión '{dim_dominante}' es la más prominente en el corpus analizado?",
            "¿Qué implica la distribución de factores entre dimensiones para la transformación digital en IES?",
            "¿Existen dimensiones subrepresentadas que deberían explorarse más?",
            "¿Cómo interactúan las diferentes dimensiones entre sí según los datos?"
        ]

    # Preguntas metodológicas
    guide['Sobre la validez metodológica'] = [
        "¿Qué nivel de triangulación metodológica se logró con las múltiples técnicas de análisis?",
        "¿Los factores multi-técnica confirman la robustez del análisis?",
        "¿Existen sesgos potenciales en la identificación de factores?",
        "¿Cómo se comparan los resultados cuantitativos con la interpretación cualitativa?"
    ]

    # Preguntas para la discusión
    guide['Para la discusión de resultados'] = [
        "¿Qué patrones emergentes revela la red de co-ocurrencias entre factores?",
        "¿Cómo contribuyen estos hallazgos al conocimiento sobre transformación digital en educación superior?",
        "¿Qué recomendaciones prácticas se derivan de los factores identificados?",
        "¿Qué líneas futuras de investigación sugieren estos resultados?"
    ]

    return guide


def generate_qualitative_insights(
    consolidated_factors: pd.DataFrame,
    classification_results: Dict[str, Any] = None
) -> List[Dict[str, str]]:
    """
    Genera insights cualitativos profundos basados en los factores identificados

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

    # Insight 1: Factores dominantes con análisis profundo
    top_factor = consolidated_factors.iloc[0]
    insights.append({
        'type': 'success',
        'title': f'Factor más relevante: {top_factor["Factor"]}',
        'description': f'Este factor aparece en: {top_factor["Fuentes"]} con una relevancia total de {top_factor["Relevancia Total"]:.3f}. '
                      f'La convergencia de múltiples técnicas de análisis en este factor sugiere que es un **tema central** '
                      f'en la transformación digital según tu corpus. Esto indica que merece atención prioritaria en la '
                      f'interpretación y discusión de resultados.'
    })

    # Insight 2: Validación multi-técnica (triangulación metodológica)
    multi_source = consolidated_factors[consolidated_factors['Fuentes'].str.contains(',')]
    if not multi_source.empty:
        percentage = (len(multi_source) / len(consolidated_factors)) * 100
        insights.append({
            'type': 'success',
            'title': f'Triangulación metodológica: {percentage:.1f}% de factores validados',
            'description': f'**{len(multi_source)} de {len(consolidated_factors)} factores** ({percentage:.1f}%) han sido '
                          f'identificados por múltiples técnicas (TF-IDF, NER, Topics), lo que proporciona **validación cruzada** '
                          f'y aumenta la confiabilidad de los hallazgos. Esta triangulación metodológica fortalece '
                          f'la robustez científica del análisis.'
        })

    # Insight 3: Distribución y cobertura de factores
    top_10 = consolidated_factors.head(10)
    relevance_concentration = (top_10['Relevancia Total'].sum() / consolidated_factors['Relevancia Total'].sum()) * 100
    insights.append({
        'type': 'info',
        'title': f'Concentración de relevancia: {relevance_concentration:.1f}% en top 10',
        'description': f'Los 10 factores principales concentran el **{relevance_concentration:.1f}%** de la relevancia total. '
                      f'Una concentración {"alta" if relevance_concentration > 60 else "moderada" if relevance_concentration > 40 else "baja"} '
                      f'sugiere {"un enfoque temático bien definido" if relevance_concentration > 60 else "una diversidad temática equilibrada"}. '
                      f'Factores clave: {", ".join(top_10.head(5)["Factor"].tolist())}.'
    })

    # Insight 4: Análisis de fuentes y técnicas
    source_distribution = {}
    for sources in consolidated_factors['Fuentes']:
        for source in sources.split(', '):
            source_type = 'TF-IDF' if 'TF-IDF' in source else 'NER' if 'NER' in source else 'Topic Modeling'
            source_distribution[source_type] = source_distribution.get(source_type, 0) + 1

    dominant_technique = max(source_distribution, key=source_distribution.get)
    insights.append({
        'type': 'info',
        'title': f'Técnica predominante: {dominant_technique}',
        'description': f'La técnica **{dominant_technique}** identificó el mayor número de factores únicos '
                      f'({source_distribution[dominant_technique]} factores). Distribución: {", ".join([f"{k}: {v}" for k, v in source_distribution.items()])}. '
                      f'Esta información es útil para comprender qué enfoque metodológico fue más efectivo en tu corpus.'
    })

    # Insight 5: Clasificación (si está disponible)
    if classification_results and 'document_labels' in classification_results:
        unique_classes = len(set(classification_results['document_labels'].values()))
        insights.append({
            'type': 'success',
            'title': f'Organización documental: {unique_classes} categorías temáticas',
            'description': f'El análisis de clasificación ha organizado el corpus en **{unique_classes} categorías temáticas** '
                          f'distintas, facilitando la identificación de patrones, tendencias y agrupaciones conceptuales. '
                          f'Esto permite un análisis comparativo entre grupos documentales.'
        })

    # Insight 6: Recomendación de profundización
    insights.append({
        'type': 'info',
        'title': 'Recomendación metodológica',
        'description': 'Para un **análisis cualitativo formal**, se recomienda: (1) Contrastar factores con marco teórico, '
                      '(2) Analizar factores multi-técnica prioritariamente, (3) Explorar relaciones en el science mapping, '
                      '(4) Codificar factores en dimensiones teóricas, (5) Documentar interpretaciones en la matriz temática.'
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
    Prepara datos consolidados para exportación incluyendo análisis cualitativo completo

    Args:
        tfidf_df: DataFrame TF-IDF
        topics_list: Lista de topics
        entities_df: DataFrame de entidades
        consolidated_factors: Factores consolidados
        insights: Insights cualitativos

    Returns:
        Diccionario con todos los datos organizados para exportar
    """
    # Generar análisis cualitativo completo
    categorized = categorize_factors_by_dimension(consolidated_factors)
    thematic_matrix = build_thematic_matrix(consolidated_factors, categorized)
    qualitative_coding = generate_qualitative_coding(thematic_matrix)
    interpretation_guide = generate_interpretation_guide(consolidated_factors, thematic_matrix, qualitative_coding)

    export_data = {
        'resumen': {
            'total_factores_identificados': len(consolidated_factors),
            'factores_multifuente': len(consolidated_factors[consolidated_factors['Fuentes'].str.contains(',')]),
            'total_insights': len(insights),
            'dimensiones_teoricas_cubiertas': qualitative_coding.get('cobertura_teorica', {}).get('dimensiones_cubiertas', 0),
            'porcentaje_validacion_multitecnica': qualitative_coding.get('cobertura_teorica', {}).get('porcentaje_multitecnica', 0)
        },
        'tfidf': tfidf_df.to_dict('records') if not tfidf_df.empty else [],
        'topics': topics_list,
        'entities': entities_df.to_dict('records') if not entities_df.empty else [],
        'factores_consolidados': consolidated_factors.to_dict('records') if not consolidated_factors.empty else [],
        'insights': insights,
        'analisis_cualitativo': {
            'matriz_tematica': thematic_matrix.to_dict('records') if not thematic_matrix.empty else [],
            'factores_por_dimension': categorized,
            'codificacion_cualitativa': qualitative_coding,
            'guia_interpretacion': interpretation_guide
        }
    }

    return export_data

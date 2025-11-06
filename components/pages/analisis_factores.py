"""
Página de Análisis Automático de Factores Relevantes
Identifica, consolida y visualiza factores de múltiples fuentes PLN
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
from typing import Dict, Any, Optional
import os

from components.ui.helpers import show_section_header
from src.models.factor_identification import FactorIdentifier
from src.models.science_mapping import ScienceMapper
from src.utils.logger import get_logger

logger = get_logger(__name__)


def check_prerequisites() -> Dict[str, bool]:
    """
    Verifica qué datos están disponibles para análisis

    Returns:
        Diccionario con disponibilidad de datos
    """
    available = {
        'preprocessing': 'preprocessed_texts' in st.session_state,
        'topic_modeling': 'topic_modeling_results' in st.session_state,
        'tfidf': 'tfidf_results' in st.session_state,
        'ner': 'ner_results' in st.session_state,
        'ngrams': 'ngram_results' in st.session_state
    }
    return available


def load_available_results() -> Dict[str, Any]:
    """
    Carga todos los resultados disponibles desde session_state

    Returns:
        Diccionario con resultados disponibles
    """
    results = {}

    if 'preprocessed_texts' in st.session_state:
        results['texts'] = st.session_state.preprocessed_texts

    if 'topic_modeling_results' in st.session_state:
        results['topic_modeling'] = st.session_state.topic_modeling_results

    if 'tfidf_results' in st.session_state:
        results['tfidf'] = st.session_state.tfidf_results

    if 'ner_results' in st.session_state:
        results['ner'] = st.session_state.ner_results

    if 'ngram_results' in st.session_state:
        results['ngrams'] = st.session_state.ngram_results

    return results


def extract_all_factors(available_results: Dict[str, Any], config: Dict[str, Any]) -> list:
    """
    Extrae factores de todas las fuentes disponibles

    Args:
        available_results: Resultados disponibles
        config: Configuración de extracción

    Returns:
        Lista de todos los factores extraídos
    """
    identifier = FactorIdentifier()
    all_factors = []

    with st.spinner("🔍 Extrayendo factores de Topic Modeling..."):
        # Topic Modeling
        if 'topic_modeling' in available_results:
            tm_results = available_results['topic_modeling']

            # Extraer de cada modelo
            for model_name in ['lda', 'nmf', 'lsa', 'plsa']:
                if model_name in tm_results and tm_results[model_name]:
                    factors = identifier.extract_factors_from_topics(
                        tm_results[model_name],
                        top_n_words=config.get('topic_top_words', 10),
                        min_weight=config.get('topic_min_weight', 0.01)
                    )
                    all_factors.extend(factors)
                    logger.info(f"Extraídos {len(factors)} factores de {model_name}")

    with st.spinner("🔍 Extrayendo factores de TF-IDF..."):
        # TF-IDF
        if 'tfidf' in available_results:
            factors = identifier.extract_factors_from_tfidf(
                available_results['tfidf'],
                top_n=config.get('tfidf_top_n', 100),
                min_score=config.get('tfidf_min_score', 0.1)
            )
            all_factors.extend(factors)
            logger.info(f"Extraídos {len(factors)} factores de TF-IDF")

    with st.spinner("🔍 Extrayendo factores de NER..."):
        # NER
        if 'ner' in available_results:
            factors = identifier.extract_factors_from_ner(
                available_results['ner'],
                min_frequency=config.get('ner_min_freq', 3)
            )
            all_factors.extend(factors)
            logger.info(f"Extraídos {len(factors)} factores de NER")

    with st.spinner("🔍 Extrayendo factores de N-gramas..."):
        # N-gramas
        if 'ngrams' in available_results:
            factors = identifier.extract_factors_from_ngrams(
                available_results['ngrams'],
                top_n=config.get('ngram_top_n', 50),
                min_frequency=config.get('ngram_min_freq', 5)
            )
            all_factors.extend(factors)
            logger.info(f"Extraídos {len(factors)} factores de n-gramas")

    return all_factors


def execute_factor_analysis(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ejecuta el análisis completo de factores

    Args:
        config: Configuración del análisis

    Returns:
        Diccionario con todos los resultados del análisis
    """
    logger.info("Iniciando análisis de factores...")

    # Cargar resultados disponibles
    available_results = load_available_results()

    # Extraer factores
    st.info("📊 Extrayendo factores de múltiples fuentes PLN...")
    all_factors = extract_all_factors(available_results, config)

    if not all_factors:
        st.error("❌ No se pudieron extraer factores. Asegúrate de haber ejecutado los análisis previos.")
        return {}

    st.success(f"✅ Extraídos {len(all_factors)} factores brutos de todas las fuentes")

    # Consolidar factores
    st.info("🔄 Consolidando factores...")
    identifier = FactorIdentifier()
    factors_df = identifier.consolidate_factors(
        all_factors,
        similarity_threshold=config.get('similarity_threshold', 0.85)
    )

    st.success(f"✅ Consolidados a {len(factors_df)} factores únicos")

    # Calcular co-ocurrencia si hay textos
    cooccurrence_matrix = pd.DataFrame()
    if 'texts' in available_results and not factors_df.empty:
        st.info("🔗 Calculando co-ocurrencia de factores...")
        cooccurrence_matrix = identifier.calculate_cooccurrence(
            available_results['texts'],
            factors_df,
            top_n_factors=config.get('cooc_top_factors', 100),
            window_size=config.get('cooc_window_size', 50)
        )
        st.success(f"✅ Calculada matriz de co-ocurrencia: {cooccurrence_matrix.shape}")

    # Clustering de factores
    if not cooccurrence_matrix.empty:
        st.info("🎯 Identificando clusters de factores...")
        factors_df = identifier.identify_factor_clusters(
            factors_df,
            cooccurrence_matrix,
            n_clusters=config.get('n_clusters', 8)
        )
        st.success("✅ Clusters identificados")

    # Generar resumen
    summary = identifier.generate_factor_summary(factors_df, top_n=50)

    # Science Mapping
    network = {}
    metrics = {}
    if not cooccurrence_matrix.empty:
        st.info("🗺️ Generando Science Mapping...")
        mapper = ScienceMapper()

        network = mapper.build_cooccurrence_network(
            cooccurrence_matrix,
            min_cooccurrence=config.get('min_cooccurrence', 5),
            top_n_nodes=config.get('network_top_nodes', 50)
        )

        if network and network['n_nodes'] > 0:
            metrics = mapper.calculate_network_metrics(network)
            st.success(f"✅ Red creada: {network['n_nodes']} nodos, {network['n_edges']} conexiones")

    results = {
        'factors_df': factors_df,
        'cooccurrence_matrix': cooccurrence_matrix,
        'summary': summary,
        'network': network,
        'metrics': metrics,
        'timestamp': datetime.now().isoformat(),
        'config': config
    }

    logger.info("Análisis de factores completado")
    return results


def render_configuration_tab():
    """Renderiza la pestaña de configuración"""
    st.markdown("### ⚙️ Configuración del Análisis")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("#### Extracción de Factores")

        topic_top_words = st.slider(
            "Palabras por tópico",
            min_value=5,
            max_value=20,
            value=10,
            help="Número de palabras top a extraer de cada tópico"
        )

        topic_min_weight = st.slider(
            "Peso mínimo (Topic Modeling)",
            min_value=0.001,
            max_value=0.1,
            value=0.01,
            format="%.3f",
            help="Peso mínimo para considerar una palabra de tópico"
        )

        tfidf_top_n = st.slider(
            "Top N términos (TF-IDF)",
            min_value=50,
            max_value=200,
            value=100,
            help="Número de términos TF-IDF a considerar"
        )

        tfidf_min_score = st.slider(
            "Score mínimo (TF-IDF)",
            min_value=0.05,
            max_value=0.3,
            value=0.1,
            format="%.2f",
            help="Score mínimo TF-IDF"
        )

    with col2:
        st.markdown("#### Co-ocurrencia y Red")

        cooc_top_factors = st.slider(
            "Factores para co-ocurrencia",
            min_value=50,
            max_value=150,
            value=100,
            help="Número de factores top para análisis de co-ocurrencia"
        )

        cooc_window_size = st.slider(
            "Ventana de co-ocurrencia",
            min_value=10,
            max_value=100,
            value=50,
            help="Tamaño de ventana de palabras para detectar co-ocurrencia"
        )

        network_top_nodes = st.slider(
            "Nodos en red",
            min_value=20,
            max_value=100,
            value=50,
            help="Número máximo de nodos en la red de conocimiento"
        )

        min_cooccurrence = st.slider(
            "Co-ocurrencia mínima",
            min_value=3,
            max_value=20,
            value=5,
            help="Número mínimo de co-ocurrencias para crear conexión"
        )

        n_clusters = st.slider(
            "Número de clusters",
            min_value=3,
            max_value=15,
            value=8,
            help="Número de clusters de factores a identificar"
        )

    st.markdown("---")

    if st.button("🚀 Ejecutar Análisis de Factores", type="primary", use_container_width=True):
        config = {
            'topic_top_words': topic_top_words,
            'topic_min_weight': topic_min_weight,
            'tfidf_top_n': tfidf_top_n,
            'tfidf_min_score': tfidf_min_score,
            'ner_min_freq': 3,
            'ngram_top_n': 50,
            'ngram_min_freq': 5,
            'similarity_threshold': 0.85,
            'cooc_top_factors': cooc_top_factors,
            'cooc_window_size': cooc_window_size,
            'network_top_nodes': network_top_nodes,
            'min_cooccurrence': min_cooccurrence,
            'n_clusters': n_clusters
        }

        with st.spinner("⏳ Analizando factores..."):
            results = execute_factor_analysis(config)

            if results:
                st.session_state.factor_analysis_results = results
                st.success("✅ Análisis completado exitosamente")
                st.rerun()


def render_summary_tab(results: Dict[str, Any]):
    """Renderiza la pestaña de resumen"""
    st.markdown("### 📊 Resumen del Análisis")

    summary = results['summary']
    factors_df = results['factors_df']

    # Métricas clave
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Total de Factores", summary['total_factors'])

    with col2:
        st.metric("Multi-fuente", summary['factors_multi_source'])

    with col3:
        st.metric("Peso Promedio", f"{summary['avg_weight']:.2f}")

    with col4:
        clusters = factors_df['cluster_id'].nunique() if 'cluster_id' in factors_df.columns else 0
        st.metric("Clusters Identificados", clusters)

    st.markdown("---")

    # Top factores
    st.markdown("#### 🏆 Top 20 Factores Más Relevantes")

    top_20 = factors_df.head(20)[[
        'term', 'total_weight', 'frequency', 'source_count', 'main_type'
    ]].copy()
    top_20.columns = ['Factor', 'Peso Total', 'Frecuencia', '# Fuentes', 'Tipo']

    st.dataframe(
        top_20,
        use_container_width=True,
        hide_index=True
    )

    # Distribución por tipo
    col1, col2 = st.columns(2)

    with col1:
        st.markdown("#### 📈 Distribución por Tipo de Factor")
        type_dist = pd.DataFrame.from_dict(
            summary['factors_by_type'],
            orient='index',
            columns=['Cantidad']
        ).reset_index()
        type_dist.columns = ['Tipo', 'Cantidad']

        fig = px.pie(
            type_dist,
            values='Cantidad',
            names='Tipo',
            title="Factores por Tipo",
            hole=0.4
        )
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.markdown("#### 🔗 Distribución por Número de Fuentes")
        source_dist = pd.DataFrame.from_dict(
            summary['source_distribution'],
            orient='index',
            columns=['Cantidad']
        ).reset_index()
        source_dist.columns = ['Num Fuentes', 'Cantidad']
        source_dist = source_dist.sort_values('Num Fuentes')

        fig = px.bar(
            source_dist,
            x='Num Fuentes',
            y='Cantidad',
            title="Factores por Número de Fuentes",
            labels={'Num Fuentes': 'Número de Fuentes PLN', 'Cantidad': 'Cantidad de Factores'}
        )
        st.plotly_chart(fig, use_container_width=True)


def render_factors_table_tab(results: Dict[str, Any]):
    """Renderiza la pestaña de tabla de factores"""
    st.markdown("### 📋 Tabla Completa de Factores")

    factors_df = results['factors_df']

    # Filtros
    col1, col2, col3 = st.columns(3)

    with col1:
        if 'main_type' in factors_df.columns:
            types = ['Todos'] + sorted(factors_df['main_type'].unique().tolist())
            selected_type = st.selectbox("Filtrar por tipo", types)
        else:
            selected_type = 'Todos'

    with col2:
        min_sources = st.slider(
            "Mínimo de fuentes",
            min_value=1,
            max_value=int(factors_df['source_count'].max()) if 'source_count' in factors_df.columns else 1,
            value=1
        )

    with col3:
        top_n = st.slider(
            "Mostrar top N",
            min_value=10,
            max_value=len(factors_df),
            value=min(100, len(factors_df))
        )

    # Aplicar filtros
    filtered_df = factors_df.copy()

    if selected_type != 'Todos' and 'main_type' in filtered_df.columns:
        filtered_df = filtered_df[filtered_df['main_type'] == selected_type]

    if 'source_count' in filtered_df.columns:
        filtered_df = filtered_df[filtered_df['source_count'] >= min_sources]

    filtered_df = filtered_df.head(top_n)

    # Mostrar tabla
    display_cols = ['term', 'total_weight', 'avg_weight', 'frequency', 'source_count', 'main_type']
    if 'cluster_id' in filtered_df.columns:
        display_cols.append('cluster_id')

    available_cols = [col for col in display_cols if col in filtered_df.columns]

    st.dataframe(
        filtered_df[available_cols],
        use_container_width=True,
        height=600
    )

    st.info(f"📊 Mostrando {len(filtered_df)} de {len(factors_df)} factores totales")


def render_network_tab(results: Dict[str, Any]):
    """Renderiza la pestaña de red de conocimiento"""
    st.markdown("### 🗺️ Red de Co-ocurrencia de Factores")

    network = results.get('network', {})
    metrics = results.get('metrics', {})

    if not network or network.get('n_nodes', 0) == 0:
        st.warning("⚠️ No hay datos de red disponibles. Asegúrate de tener textos preprocesados y ejecutar el análisis.")
        return

    # Métricas de red
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Nodos (Factores)", network['n_nodes'])

    with col2:
        st.metric("Conexiones", network['n_edges'])

    with col3:
        if metrics and 'n_communities' in metrics:
            st.metric("Comunidades", metrics['n_communities'])

    with col4:
        if metrics and 'density' in metrics:
            st.metric("Densidad", f"{metrics['density']:.3f}")

    st.markdown("---")

    # Visualización de red
    st.markdown("#### 🕸️ Visualización de Red de Conocimiento")

    try:
        mapper = ScienceMapper()
        fig = mapper.create_network_visualization(
            network,
            metrics,
            layout='spring',
            color_by='community',
            title="Red de Co-ocurrencia de Factores en Transformación Digital"
        )
        st.plotly_chart(fig, use_container_width=True)
    except Exception as e:
        st.error(f"Error generando visualización de red: {e}")
        logger.error(f"Error en visualización de red: {e}", exc_info=True)

    # Métricas de centralidad
    if metrics and metrics.get('degree_centrality'):
        st.markdown("---")
        st.markdown("#### 📊 Top Factores por Centralidad")

        mapper = ScienceMapper()
        fig_centrality = mapper.create_centrality_comparison(metrics, top_n=20)
        st.plotly_chart(fig_centrality, use_container_width=True)


def render_landscape_tab(results: Dict[str, Any]):
    """Renderiza la pestaña de landscape"""
    st.markdown("### 🌍 Knowledge Landscape de Factores")

    factors_df = results['factors_df']
    metrics = results.get('metrics', {})

    if factors_df.empty:
        st.warning("⚠️ No hay factores disponibles")
        return

    try:
        mapper = ScienceMapper()

        # Landscape principal
        fig_landscape = mapper.create_factor_landscape(
            factors_df,
            metrics,
            top_n=100
        )
        st.plotly_chart(fig_landscape, use_container_width=True)

        st.markdown("---")

        # Sunburst de comunidades
        if metrics and metrics.get('communities'):
            st.markdown("#### 🎯 Comunidades de Factores Relacionados")
            fig_sunburst = mapper.create_community_sunburst(
                factors_df,
                metrics,
                max_factors=50
            )
            st.plotly_chart(fig_sunburst, use_container_width=True)

    except Exception as e:
        st.error(f"Error generando landscape: {e}")
        logger.error(f"Error en landscape: {e}", exc_info=True)


def render_export_tab(results: Dict[str, Any]):
    """Renderiza la pestaña de exportación"""
    st.markdown("### 💾 Exportar Resultados")

    st.info("📁 Los resultados se exportarán al directorio `output/`")

    col1, col2 = st.columns([3, 1])

    with col1:
        st.markdown("**Archivos a exportar:**")
        st.markdown("- `factors_TIMESTAMP.csv` - Tabla completa de factores")
        st.markdown("- `cooccurrence_TIMESTAMP.csv` - Matriz de co-ocurrencia")
        st.markdown("- `factor_summary_TIMESTAMP.json` - Resumen estadístico")

    with col2:
        if st.button("📥 Exportar Todo", type="primary"):
            try:
                identifier = FactorIdentifier()
                files = identifier.export_results(
                    results['factors_df'],
                    results['cooccurrence_matrix'],
                    results['summary'],
                    output_dir='output'
                )

                if files:
                    st.success("✅ Resultados exportados exitosamente")
                    for key, path in files.items():
                        st.code(path, language="text")
                else:
                    st.error("❌ Error al exportar resultados")

            except Exception as e:
                st.error(f"Error: {e}")
                logger.error(f"Error exportando: {e}", exc_info=True)

    st.markdown("---")

    # Preview de datos
    st.markdown("#### 👁️ Preview de Exportación")

    tab1, tab2 = st.tabs(["CSV Preview", "JSON Preview"])

    with tab1:
        st.markdown("**Top 20 Factores (CSV):**")
        preview_df = results['factors_df'].head(20)
        st.dataframe(preview_df, use_container_width=True)

    with tab2:
        st.markdown("**Resumen (JSON):**")
        import json
        summary_json = json.dumps(results['summary'], indent=2, ensure_ascii=False)
        st.code(summary_json, language="json")


def render():
    """Renderiza la página principal de análisis de factores"""

    show_section_header(
        "Análisis Automático de Factores Relevantes",
        "Identificación, consolidación y visualización de factores desde múltiples fuentes PLN"
    )

    # Verificar prerequisitos
    available = check_prerequisites()

    if not any(available.values()):
        st.error("❌ No hay datos disponibles para análisis.")
        st.info("""
        **Para usar esta función, debes completar primero:**
        1. **Preprocesamiento** de textos
        2. Al menos uno de: **Topic Modeling**, **TF-IDF**, **NER**, **N-gramas**
        """)
        return

    # Mostrar disponibilidad
    st.markdown("#### 📊 Datos Disponibles")
    col1, col2, col3, col4, col5 = st.columns(5)

    with col1:
        st.metric("Textos", "✅" if available['preprocessing'] else "❌")
    with col2:
        st.metric("Topic Model", "✅" if available['topic_modeling'] else "❌")
    with col3:
        st.metric("TF-IDF", "✅" if available['tfidf'] else "❌")
    with col4:
        st.metric("NER", "✅" if available['ner'] else "❌")
    with col5:
        st.metric("N-gramas", "✅" if available['ngrams'] else "❌")

    st.markdown("---")

    # Tabs principales
    tabs = st.tabs([
        "⚙️ Configuración",
        "📊 Resumen",
        "📋 Tabla de Factores",
        "🗺️ Red de Conocimiento",
        "🌍 Landscape",
        "💾 Exportar"
    ])

    # Tab 1: Configuración
    with tabs[0]:
        render_configuration_tab()

    # Verificar si hay resultados
    if 'factor_analysis_results' not in st.session_state:
        for i in range(1, 6):
            with tabs[i]:
                st.info("ℹ️ Configura y ejecuta el análisis en la pestaña 'Configuración' primero.")
        return

    results = st.session_state.factor_analysis_results

    # Tab 2: Resumen
    with tabs[1]:
        render_summary_tab(results)

    # Tab 3: Tabla
    with tabs[2]:
        render_factors_table_tab(results)

    # Tab 4: Red
    with tabs[3]:
        render_network_tab(results)

    # Tab 5: Landscape
    with tabs[4]:
        render_landscape_tab(results)

    # Tab 6: Exportar
    with tabs[5]:
        render_export_tab(results)

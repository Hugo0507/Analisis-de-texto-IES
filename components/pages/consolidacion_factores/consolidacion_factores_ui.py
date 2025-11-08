"""
Módulo de UI - Consolidación de Factores
Dashboard de síntesis y science mapping de factores relevantes
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import networkx as nx
from components.ui.helpers import show_section_header
from . import consolidacion_factores as logic
import json


def render_dashboard_sintesis():
    """Renderiza el dashboard de síntesis con factores clave"""

    st.subheader("📊 Dashboard de Síntesis - Factores Clave de Transformación Digital")

    # Verificar que existan datos de análisis previos
    has_tfidf = hasattr(st.session_state, 'tfidf_results') and st.session_state.tfidf_results
    has_topics = hasattr(st.session_state, 'topic_results') and st.session_state.topic_results
    has_ner = hasattr(st.session_state, 'ner_results') and st.session_state.ner_results

    if not any([has_tfidf, has_topics, has_ner]):
        st.warning("⚠️ No hay datos suficientes para generar el dashboard. Completa al menos una de las siguientes fases:")
        st.markdown("""
        - **7. Análisis TF-IDF** (recomendado)
        - **10. Modelado de Temas** (LDA/NMF/LSA)
        - **9. Named Entity Recognition**
        """)
        return

    # Consolidar datos
    with st.spinner("Consolidando factores de todas las fases..."):
        # TF-IDF
        tfidf_df = logic.consolidate_tfidf_factors(
            st.session_state.tfidf_results if has_tfidf else {},
            top_n=20
        )

        # Topics
        topics_list = logic.consolidate_topics(
            st.session_state.topic_results if has_topics else {},
            top_n=5
        )

        # Entidades
        entities_df = logic.consolidate_entities(
            st.session_state.ner_results if has_ner else {},
            top_n=15
        )

        # Factores consolidados
        consolidated_factors = logic.calculate_factor_relevance(
            tfidf_df, topics_list, entities_df
        )

        # Insights cualitativos
        classification_results = st.session_state.classification_results if hasattr(st.session_state, 'classification_results') else None
        insights = logic.generate_qualitative_insights(
            consolidated_factors, classification_results
        )

        # Guardar en session state
        st.session_state.consolidated_factors = consolidated_factors
        st.session_state.consolidation_insights = insights

    # Métricas principales
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric(
            "Factores Identificados",
            len(consolidated_factors),
            help="Total de factores únicos encontrados en todos los análisis"
        )

    with col2:
        multi_source = len(consolidated_factors[consolidated_factors['Fuentes'].str.contains(',')]) if not consolidated_factors.empty else 0
        st.metric(
            "Validados (Multi-fuente)",
            multi_source,
            help="Factores que aparecen en múltiples técnicas de análisis"
        )

    with col3:
        st.metric(
            "Fuentes Analizadas",
            sum([has_tfidf, has_topics, has_ner]),
            delta=f"de 3 disponibles",
            help="Número de técnicas de análisis completadas"
        )

    with col4:
        st.metric(
            "Insights Generados",
            len(insights),
            help="Recomendaciones cualitativas basadas en los datos"
        )

    st.markdown("---")

    # Panel de Factores Consolidados
    st.markdown("### 🎯 Factores Clave Consolidados (Top 20)")

    if not consolidated_factors.empty:
        # Preparar datos para visualización
        top_20 = consolidated_factors.head(20).copy()

        col1, col2 = st.columns([2, 1])

        with col1:
            # Gráfico de barras
            fig = px.bar(
                top_20,
                x='Relevancia Total',
                y='Factor',
                orientation='h',
                title='Factores más Relevantes por Relevancia Integrada',
                labels={'Relevancia Total': 'Relevancia', 'Factor': 'Factor Identificado'},
                color='Relevancia Total',
                color_continuous_scale='Viridis'
            )
            fig.update_layout(height=600, yaxis={'categoryorder': 'total ascending'})
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.markdown("**Detalles de Factores:**")
            # Mostrar tabla con detalles
            display_df = top_20[['Factor', 'Fuentes', 'Frecuencia Total']].copy()
            display_df['Fuentes'] = display_df['Fuentes'].apply(lambda x: x[:30] + '...' if len(x) > 30 else x)
            st.dataframe(display_df, height=600, hide_index=True)

    st.markdown("---")

    # Panel de Topics
    if topics_list:
        st.markdown("### 📚 Topics Principales Identificados")

        for topic in topics_list:
            with st.expander(f"**Topic {topic['topic_id']}** - Relevancia: {topic['relevance']:.3f}"):
                st.markdown(f"**Palabras clave:** {topic['top_words']}")
                st.caption("Estas palabras representan el tema central de este topic")

    # Panel de Entidades
    if not entities_df.empty:
        st.markdown("### 🏢 Entidades Principales (NER)")

        col1, col2 = st.columns(2)

        with col1:
            # Gráfico de entidades
            fig = px.bar(
                entities_df.head(10),
                x='Frecuencia',
                y='Entidad',
                color='Tipo',
                orientation='h',
                title='Top 10 Entidades Identificadas',
                labels={'Frecuencia': 'Frecuencia', 'Entidad': 'Entidad'}
            )
            fig.update_layout(height=400, yaxis={'categoryorder': 'total ascending'})
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            # Distribución por tipo
            type_dist = entities_df.groupby('Tipo')['Frecuencia'].sum().reset_index()
            fig = px.pie(
                type_dist,
                values='Frecuencia',
                names='Tipo',
                title='Distribución por Tipo de Entidad'
            )
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)


def render_science_mapping():
    """Renderiza visualizaciones de science mapping"""

    st.subheader("🗺️ Science Mapping - Red de Relaciones entre Factores")

    if not hasattr(st.session_state, 'consolidated_factors') or st.session_state.consolidated_factors.empty:
        st.info("ℹ️ Primero genera el Dashboard de Síntesis en la pestaña anterior")
        return

    # Obtener top factores
    top_factors = st.session_state.consolidated_factors.head(30)['Factor'].tolist()

    # Verificar si hay textos preprocesados
    if not hasattr(st.session_state, 'preprocessed_texts') or not st.session_state.preprocessed_texts:
        st.warning("⚠️ No hay textos preprocesados disponibles. Completa la fase de Preprocesamiento primero.")
        return

    documents = list(st.session_state.preprocessed_texts.values())

    with st.spinner("Construyendo red de co-ocurrencias..."):
        # Construir matriz de co-ocurrencia
        cooc_matrix = logic.build_cooccurrence_matrix(top_factors, documents, window_size=5)

        # Generar datos de red
        network_data = logic.generate_network_data(cooc_matrix, threshold=0.1)

        # Guardar en session state
        st.session_state.network_data = network_data
        st.session_state.cooc_matrix = cooc_matrix

    # Tabs para diferentes visualizaciones
    tab1, tab2, tab3 = st.tabs(["Red de Factores", "Mapa de Calor", "Estadísticas de Red"])

    with tab1:
        st.markdown("#### Visualización de Red de Co-ocurrencias")
        st.caption("Muestra las relaciones entre factores basadas en su aparición conjunta en el corpus")

        # Crear grafo con networkx
        G = nx.Graph()

        # Agregar nodos
        for node in network_data['nodes']:
            G.add_node(node['id'], label=node['label'], size=node['size'])

        # Agregar edges
        for edge in network_data['edges']:
            G.add_edge(edge['source'], edge['target'], weight=edge['weight'])

        # Calcular layout
        pos = nx.spring_layout(G, k=0.5, iterations=50)

        # Crear visualización con plotly
        edge_trace = []
        for edge in G.edges(data=True):
            x0, y0 = pos[edge[0]]
            x1, y1 = pos[edge[1]]
            edge_trace.append(
                go.Scatter(
                    x=[x0, x1, None],
                    y=[y0, y1, None],
                    mode='lines',
                    line=dict(width=edge[2]['weight']/10, color='#888'),
                    hoverinfo='none',
                    showlegend=False
                )
            )

        # Nodos
        node_x = []
        node_y = []
        node_text = []
        node_size = []

        for node in G.nodes():
            x, y = pos[node]
            node_x.append(x)
            node_y.append(y)
            node_text.append(G.nodes[node]['label'])
            node_size.append(G.nodes[node]['size'] / 10)

        node_trace = go.Scatter(
            x=node_x,
            y=node_y,
            mode='markers+text',
            text=node_text,
            textposition="top center",
            marker=dict(
                size=node_size,
                color=node_size,
                colorscale='Viridis',
                showscale=True,
                colorbar=dict(title="Importancia")
            ),
            hoverinfo='text'
        )

        # Crear figura
        fig = go.Figure(data=edge_trace + [node_trace])
        fig.update_layout(
            title='Red de Co-ocurrencias de Factores Clave',
            showlegend=False,
            hovermode='closest',
            height=700,
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False)
        )

        st.plotly_chart(fig, use_container_width=True)

        st.info("""
        💡 **Interpretación:**
        - **Nodos**: Representan factores clave identificados
        - **Tamaño del nodo**: Indica la importancia/frecuencia del factor
        - **Conexiones**: Muestran relaciones por co-ocurrencia en documentos
        - **Grosor de línea**: Indica fuerza de la relación
        """)

    with tab2:
        st.markdown("#### Mapa de Calor de Co-ocurrencias")

        # Crear heatmap
        fig = px.imshow(
            cooc_matrix.values,
            x=cooc_matrix.columns,
            y=cooc_matrix.index,
            color_continuous_scale='Viridis',
            title='Matriz de Co-ocurrencias entre Factores',
            labels=dict(color="Frecuencia")
        )
        fig.update_layout(height=800)
        fig.update_xaxes(tickangle=45)

        st.plotly_chart(fig, use_container_width=True)

        st.info("💡 Celdas más oscuras indican mayor co-ocurrencia entre pares de factores")

    with tab3:
        st.markdown("#### Estadísticas de la Red")

        col1, col2, col3 = st.columns(3)

        with col1:
            st.metric("Nodos (Factores)", len(G.nodes()))
            st.metric("Densidad de Red", f"{nx.density(G):.3f}")

        with col2:
            st.metric("Conexiones", len(G.edges()))
            if len(G.nodes()) > 0:
                avg_degree = sum(dict(G.degree()).values()) / len(G.nodes())
                st.metric("Grado Promedio", f"{avg_degree:.2f}")

        with col3:
            if nx.is_connected(G):
                diameter = nx.diameter(G)
                st.metric("Diámetro de Red", diameter)
            else:
                st.metric("Componentes Conectados", nx.number_connected_components(G))

        # Top factores por centralidad
        st.markdown("### Factores más Centrales en la Red")

        if len(G.nodes()) > 0:
            centrality = nx.degree_centrality(G)
            centrality_df = pd.DataFrame([
                {'Factor': G.nodes[node]['label'], 'Centralidad': score}
                for node, score in centrality.items()
            ]).sort_values('Centralidad', ascending=False).head(10)

            fig = px.bar(
                centrality_df,
                x='Centralidad',
                y='Factor',
                orientation='h',
                title='Top 10 Factores por Centralidad en la Red'
            )
            fig.update_layout(yaxis={'categoryorder': 'total ascending'})
            st.plotly_chart(fig, use_container_width=True)


def render_analisis_cualitativo():
    """Renderiza panel de análisis cualitativo guiado"""

    st.subheader("💭 Análisis Cualitativo Guiado")

    if not hasattr(st.session_state, 'consolidation_insights'):
        st.info("ℹ️ Primero genera el Dashboard de Síntesis")
        return

    insights = st.session_state.consolidation_insights

    st.markdown("""
    Este panel proporciona **interpretaciones automáticas** de los resultados del análisis,
    ayudándote a comprender el significado y las implicaciones de los factores identificados.
    """)

    st.markdown("---")

    # Mostrar insights
    for i, insight in enumerate(insights):
        if insight['type'] == 'success':
            st.success(f"**{insight['title']}**\n\n{insight['description']}")
        elif insight['type'] == 'info':
            st.info(f"**{insight['title']}**\n\n{insight['description']}")
        elif insight['type'] == 'warning':
            st.warning(f"**{insight['title']}**\n\n{insight['description']}")

    st.markdown("---")

    # Recomendaciones para el investigador
    st.markdown("### 📝 Recomendaciones para el Investigador")

    if hasattr(st.session_state, 'consolidated_factors') and not st.session_state.consolidated_factors.empty:
        st.markdown("""
        **Basado en tu análisis, te recomendamos:**

        1. **Profundiza en los factores multi-fuente**: Los factores que aparecen en múltiples análisis
           (TF-IDF, NER, Topics) tienen mayor validez y deberían ser prioritarios en tu investigación.

        2. **Explora las relaciones en el Science Mapping**: El grafo de red muestra conexiones no obvias
           entre factores que pueden revelar patrones emergentes en la transformación digital.

        3. **Contrasta con tu marco teórico**: Compara los factores identificados automáticamente con
           los reportados en tu marco de referencia para validar o descubrir nuevos hallazgos.

        4. **Analiza las entidades organizacionales**: Las entidades NER tipo ORG pueden revelar
           instituciones líderes o casos de estudio relevantes mencionados frecuentemente.

        5. **Documenta tus hallazgos**: Utiliza la función de exportación para generar un reporte
           completo que puedes incluir en tu tesis.
        """)

        # Sugerencias específicas según los datos
        top_3 = st.session_state.consolidated_factors.head(3)['Factor'].tolist()

        st.markdown(f"""
        **Sugerencias específicas para tu corpus:**

        - Los tres factores más relevantes identificados son: **{', '.join(top_3)}**.
          Considera dedicar secciones específicas de tu análisis a cada uno de estos temas.

        - Revisa si estos factores se alinean con las dimensiones teóricas de tu marco conceptual
          (tecnológica, organizacional, humana, estratégica, financiera, pedagógica, etc.).

        - Si encuentras factores inesperados o no cubiertos en tu marco teórico, esto puede
          representar una **contribución original** de tu investigación.
        """)


def render_exportacion():
    """Renderiza opciones de exportación de resultados"""

    st.subheader("📥 Exportación de Resultados")

    if not hasattr(st.session_state, 'consolidated_factors'):
        st.info("ℹ️ Primero genera el Dashboard de Síntesis")
        return

    st.markdown("""
    Exporta los resultados consolidados de tu análisis en diferentes formatos
    para incluir en tu tesis o presentaciones.
    """)

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("#### Exportar Datos")

        # Preparar datos para exportación
        tfidf_df = logic.consolidate_tfidf_factors(
            st.session_state.tfidf_results if hasattr(st.session_state, 'tfidf_results') else {},
            top_n=20
        )
        topics_list = logic.consolidate_topics(
            st.session_state.topic_results if hasattr(st.session_state, 'topic_results') else {},
            top_n=5
        )
        entities_df = logic.consolidate_entities(
            st.session_state.ner_results if hasattr(st.session_state, 'ner_results') else {},
            top_n=15
        )

        export_data = logic.prepare_export_data(
            tfidf_df,
            topics_list,
            entities_df,
            st.session_state.consolidated_factors,
            st.session_state.consolidation_insights
        )

        # Botón de descarga JSON
        json_str = json.dumps(export_data, indent=2, ensure_ascii=False)
        st.download_button(
            label="💾 Descargar JSON",
            data=json_str,
            file_name="consolidacion_factores.json",
            mime="application/json",
            use_container_width=True
        )

        # Botón de descarga CSV (factores consolidados)
        if not st.session_state.consolidated_factors.empty:
            csv = st.session_state.consolidated_factors.to_csv(index=False)
            st.download_button(
                label="📊 Descargar CSV (Factores)",
                data=csv,
                file_name="factores_consolidados.csv",
                mime="text/csv",
                use_container_width=True
            )

    with col2:
        st.markdown("#### Resumen del Análisis")

        resumen = export_data['resumen']

        st.metric("Total de Factores", resumen['total_factores_identificados'])
        st.metric("Factores Multi-fuente", resumen['factores_multifuente'])
        st.metric("Insights Generados", resumen['total_insights'])

        st.info("""
        **Datos incluidos en la exportación:**
        - Factores TF-IDF top 20
        - Topics principales (top 5)
        - Entidades NER top 15
        - Factores consolidados con relevancia integrada
        - Insights cualitativos
        """)


def render():
    """Renderiza la página de consolidación de factores"""

    show_section_header(
        "Consolidación de Factores y Science Mapping",
        "Dashboard de síntesis y visualización integrada de factores relevantes de transformación digital"
    )

    st.markdown("""
    Esta sección **integra y consolida** los resultados de todas las fases de análisis anteriores,
    proporcionando una visión holística de los **factores clave de éxito** en la transformación digital
    de instituciones de educación superior.
    """)

    st.info("""
    **🎯 Cumple con OE3:** Selección de factores relevantes y sus relaciones mediante métodos
    cuantitativos (métricas integradas) y cualitativos (análisis guiado e interpretación).
    """)

    # Pestañas principales
    tab1, tab2, tab3, tab4 = st.tabs([
        "📊 Dashboard de Síntesis",
        "🗺️ Science Mapping",
        "💭 Análisis Cualitativo",
        "📥 Exportación"
    ])

    with tab1:
        render_dashboard_sintesis()

    with tab2:
        render_science_mapping()

    with tab3:
        render_analisis_cualitativo()

    with tab4:
        render_exportacion()

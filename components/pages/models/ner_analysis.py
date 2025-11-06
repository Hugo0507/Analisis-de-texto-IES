"""
Página de Análisis NER (Named Entity Recognition)
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime
from components.ui.helpers import show_section_header, get_connector


def render():
    """Renderiza la página de análisis NER"""

    show_section_header(
        "Análisis NER - Entidades Nombradas",
        "Identificación de países, años, organizaciones y otras entidades relevantes"
    )

    # Verificar prerequisitos
    if 'txt_files' not in st.session_state or len(st.session_state.txt_files) == 0:
        st.warning("⚠️ No hay archivos TXT disponibles. Completa primero la conversión de PDF a TXT.")
        return

    tabs = st.tabs(["⚙️ Configuración", "📊 Dashboard General", "🌍 Análisis Geográfico", "📅 Análisis Temporal", "🏷️ Entidades", "🔗 Co-ocurrencias", "📈 Métricas por Documento"])

    # Tab 1: Configuración
    with tabs[0]:
        st.markdown("### ⚙️ Configuración del Análisis NER")

        st.info("""
        **Named Entity Recognition (NER)** identifica y clasifica entidades nombradas en texto:
        - 🌍 **GPE**: Países, ciudades, estados
        - 🏢 **ORG**: Organizaciones, instituciones, empresas
        - 👤 **PERSON**: Nombres de personas
        - 📅 **DATE**: Fechas y períodos temporales
        - 💰 **MONEY**: Cantidades monetarias
        - 📊 **CARDINAL**: Números y cantidades
        """)

        st.markdown("---")

        # Verificar si existe caché
        from src.models.ner_cache import NERCache
        cache = NERCache()
        cache_info = cache.get_cache_info()

        if cache_info:
            st.success(f"""
            ✓ **Caché encontrado**
            - Fecha: {cache_info.get('timestamp', 'Desconocida')}
            - Documentos: {cache_info.get('document_count', 0)}
            - Caracteres procesados: {cache_info.get('total_chars', 0):,}

            El análisis se cargará automáticamente desde el caché sin necesidad de re-procesar.
            """)

        # Seleccionar modelo
        model_choice = st.selectbox(
            "Modelo de SpaCy",
            ["en_core_web_sm (Pequeño, rápido)", "en_core_web_md (Mediano)", "en_core_web_lg (Grande, preciso)"],
            help="Modelos más grandes son más precisos pero más lentos"
        )

        model_map = {
            "en_core_web_sm (Pequeño, rápido)": "en_core_web_sm",
            "en_core_web_md (Mediano)": "en_core_web_md",
            "en_core_web_lg (Grande, preciso)": "en_core_web_lg"
        }

        selected_model = model_map[model_choice]

        # Opción para forzar re-procesamiento
        force_recompute = st.checkbox(
            "🔄 Forzar re-procesamiento (ignorar caché)",
            value=False,
            help="Marca esta opción para volver a procesar todos los documentos aunque exista un caché"
        )

        col1, col2 = st.columns(2)

        with col1:
            if st.button("▶️ Ejecutar Análisis NER", type="primary", use_container_width=True):
                st.session_state.ner_config = {
                    'model': selected_model,
                    'force_recompute': force_recompute
                }
                # Limpiar resultados previos para forzar recarga
                if 'ner_results' in st.session_state:
                    del st.session_state.ner_results
                st.success("✓ Configuración guardada. Ve a las pestañas de análisis para ver los resultados.")
                st.rerun()

        with col2:
            if cache_info and st.button("🗑️ Limpiar Caché", use_container_width=True):
                if cache.clear_cache():
                    st.success("✓ Caché eliminado correctamente")
                    st.rerun()
                else:
                    st.error("❌ Error al eliminar caché")

    # Verificar si se ha ejecutado el análisis
    if 'ner_config' not in st.session_state:
        for i in range(1, 7):
            with tabs[i]:
                st.info("ℹ️ Configura y ejecuta el análisis NER en la pestaña 'Configuración' primero.")
        return

    # Ejecutar análisis si no existe en session_state
    if 'ner_results' not in st.session_state:
        with st.spinner("🔍 Verificando caché y analizando entidades nombradas..."):
            from src.models.ner_analyzer import NERAnalyzer

            # Inicializar analizador con caché habilitado
            analyzer = NERAnalyzer(
                model_name=st.session_state.ner_config['model'],
                use_cache=True  # Habilitar sistema de caché automático
            )

            # Cargar textos
            connector = get_connector()
            if not connector:
                st.error("❌ Error de conexión con Google Drive")
                return

            texts_dict = {}
            progress_bar = st.progress(0)
            status_text = st.empty()

            # Obtener archivos TXT de la carpeta 03_TXT_Converted
            folder_03 = st.session_state.persistence_folders.get('03_TXT_Converted')

            if not folder_03:
                st.error("❌ No se encontró la carpeta 03_TXT_Converted. Completa primero la conversión PDF→TXT")
                return

            # Listar archivos TXT en la carpeta
            txt_files_list = connector.list_files_in_folder(folder_03, recursive=False)
            txt_files_list = [f for f in txt_files_list if f['name'].endswith('.txt')]

            if not txt_files_list:
                st.error("❌ No se encontraron archivos TXT en la carpeta 03_TXT_Converted")
                return

            for idx, txt_file in enumerate(txt_files_list):
                status_text.text(f"Cargando {idx+1}/{len(txt_files_list)}: {txt_file['name']}")

                try:
                    file_id = txt_file.get('id')
                    if not file_id:
                        st.warning(f"⚠️ Saltando {txt_file['name']}: Sin ID de archivo")
                        continue

                    file_content = connector.read_file_content(file_id)
                    if file_content:
                        # Si es un BytesIO, leer su contenido
                        if hasattr(file_content, 'read'):
                            content_bytes = file_content.read()
                            text = content_bytes.decode('utf-8', errors='ignore')
                        else:
                            # Si ya son bytes
                            text = file_content.decode('utf-8', errors='ignore')

                        # Informar si el documento es muy largo
                        if len(text) > 1000000:
                            status_text.text(f"⏳ Procesando documento largo ({len(text):,} caracteres): {txt_file['name']}")

                        texts_dict[txt_file['name']] = text
                except Exception as e:
                    st.warning(f"⚠️ Error cargando {txt_file['name']}: {str(e)}")

                progress_bar.progress((idx + 1) / len(txt_files_list))

            status_text.empty()
            progress_bar.empty()

            # Ejecutar análisis NER con soporte de caché
            force_recompute = st.session_state.ner_config.get('force_recompute', False)

            if force_recompute:
                st.info("🔄 Re-procesamiento forzado: ignorando caché...")

            with st.spinner("Ejecutando análisis NER..."):
                corpus_analysis = analyzer.analyze_corpus(texts_dict, force_recompute=force_recompute)
                geographical_insights = analyzer.get_geographical_insights(corpus_analysis)
                temporal_insights = analyzer.get_temporal_insights(corpus_analysis)
                cooccurrence_insights = analyzer.get_cooccurrence_insights(corpus_analysis)
                diversity_insights = analyzer.get_diversity_insights(corpus_analysis)
                entity_stats = analyzer.get_entity_statistics(corpus_analysis)

            st.session_state.ner_results = {
                'corpus_analysis': corpus_analysis,
                'geographical_insights': geographical_insights,
                'temporal_insights': temporal_insights,
                'cooccurrence_insights': cooccurrence_insights,
                'diversity_insights': diversity_insights,
                'entity_stats': entity_stats,
                'analyzer': analyzer
            }

            # Guardar resultados en Drive
            from components.ui.helpers import save_results_to_cache

            folder_ner = connector.get_or_create_folder(
                st.session_state.parent_folder_id,
                "07_NER_Analysis"
            )
            st.session_state.persistence_folders['07_NER_Analysis'] = folder_ner

            # Preparar datos serializables para caché en Drive
            cache_data = {
                'corpus_stats': corpus_analysis['corpus_stats'],
                'country_distribution': corpus_analysis['country_distribution'],
                'year_distribution': corpus_analysis['year_distribution'],
                'top_entities_by_category': corpus_analysis['top_entities_by_category'],
                'geographical_insights': geographical_insights,
                'temporal_insights': temporal_insights,
                'cooccurrence_insights': {
                    'top_pairs': cooccurrence_insights.get('top_pairs', []),
                    'total_cooccurrences': cooccurrence_insights.get('total_cooccurrences', 0)
                },
                'diversity_insights': diversity_insights,
                'entity_stats': entity_stats,
                'document_count': corpus_analysis['corpus_stats']['total_documents'],
                'analysis_date': corpus_analysis.get('cache_metadata', {}).get('timestamp',
                                                                                datetime.now().isoformat())
            }

            save_results_to_cache(
                folder_ner,
                "ner_analysis_results.json",
                cache_data
            )

        st.success("✅ Análisis NER completado y guardado en Drive")
        st.rerun()

    # Obtener resultados
    results = st.session_state.ner_results
    corpus_analysis = results['corpus_analysis']
    geo_insights = results['geographical_insights']
    temp_insights = results['temporal_insights']
    cooccurrence_insights = results['cooccurrence_insights']
    diversity_insights = results['diversity_insights']
    entity_stats = results['entity_stats']

    # Tab 2: Dashboard General
    with tabs[1]:
        st.markdown("### 📊 Dashboard General del Análisis NER")

        # Métricas principales
        st.markdown("**📌 Métricas Principales del Corpus**")
        col1, col2, col3, col4, col5 = st.columns(5)

        corpus_stats = corpus_analysis['corpus_stats']
        col1.metric("📄 Documentos", corpus_stats['total_documents'])
        col2.metric("🏷️ Total Entidades", corpus_stats['total_entities'])
        col3.metric("📋 Tipos de Entidades", corpus_stats['total_entity_types'])
        col4.metric("🌍 Países Únicos", corpus_stats['unique_countries'])
        col5.metric("📅 Años Únicos", corpus_stats['unique_years'])

        st.markdown("---")

        # Métricas de diversidad
        st.markdown("**📈 Métricas de Diversidad**")
        col1, col2, col3, col4 = st.columns(4)

        col1.metric("Promedio Entidades/Doc", diversity_insights['avg_entities_per_doc'])
        col2.metric("Desv. Estándar", diversity_insights['std_entities_per_doc'])
        col3.metric("Densidad Promedio", f"{diversity_insights['avg_entity_density']} por 1K chars")
        col4.metric("Promedio Países/Doc", diversity_insights['avg_countries_per_doc'])

        st.markdown("---")

        # Distribución de categorías de entidades
        st.markdown("**🎯 Distribución de Categorías de Entidades**")

        if entity_stats['category_stats']:
            cat_data = []
            for label, stats in entity_stats['category_stats'].items():
                cat_data.append({
                    'Categoría': label,
                    'Total Menciones': stats['total_mentions'],
                    'Entidades Únicas': stats['unique_entities'],
                    'Promedio Menciones': stats['avg_mentions']
                })

            cat_df = pd.DataFrame(cat_data).sort_values('Total Menciones', ascending=False)

            col1, col2 = st.columns([1, 1])

            with col1:
                st.dataframe(cat_df, use_container_width=True, height=400)

            with col2:
                fig = px.treemap(
                    cat_df,
                    path=['Categoría'],
                    values='Total Menciones',
                    title='Treemap de Categorías de Entidades',
                    color='Total Menciones',
                    color_continuous_scale='Viridis'
                )
                st.plotly_chart(fig, use_container_width=True)

        st.markdown("---")

        # Distribución de entidades por documento
        st.markdown("**📊 Distribución de Entidades por Documento**")

        doc_metrics = corpus_analysis['document_metrics']
        doc_df = pd.DataFrame(doc_metrics)

        col1, col2 = st.columns([1, 1])

        with col1:
            fig = px.bar(
                doc_df.sort_values('total_entities', ascending=False).head(15),
                x='total_entities',
                y='document',
                orientation='h',
                title='Top 15 Documentos por Total de Entidades',
                labels={'total_entities': 'Total Entidades', 'document': 'Documento'},
                color='total_entities',
                color_continuous_scale='Blues'
            )
            fig.update_layout(yaxis={'categoryorder': 'total ascending'}, height=500)
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            fig = px.scatter(
                doc_df,
                x='total_entities',
                y='entity_density',
                size='unique_countries',
                hover_data=['document'],
                title='Relación: Total Entidades vs Densidad',
                labels={
                    'total_entities': 'Total Entidades',
                    'entity_density': 'Densidad (por 1K chars)',
                    'unique_countries': 'Países Únicos'
                },
                color='entity_density',
                color_continuous_scale='Plasma'
            )
            fig.update_layout(height=500)
            st.plotly_chart(fig, use_container_width=True)

        st.markdown("---")

        # Top documentos
        st.markdown("**🏆 Top 5 Documentos más Ricos en Información**")

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**Por Total de Entidades**")
            top_by_entities = pd.DataFrame(diversity_insights['top_docs_by_entities'])
            st.dataframe(top_by_entities, use_container_width=True)

        with col2:
            st.markdown("**Por Densidad de Entidades**")
            top_by_density = pd.DataFrame(diversity_insights['top_docs_by_density'])
            st.dataframe(top_by_density, use_container_width=True)

    # Tab 3: Análisis Geográfico
    with tabs[2]:
        st.markdown("### 🌍 Análisis Geográfico")

        st.markdown("**📊 Estadísticas Generales**")
        col1, col2, col3, col4 = st.columns(4)

        col1.metric("Total Países Mencionados", corpus_analysis['corpus_stats']['total_countries'])
        col2.metric("Países Únicos", corpus_analysis['corpus_stats']['unique_countries'])
        col3.metric("Documentos Analizados", corpus_analysis['corpus_stats']['total_documents'])
        col4.metric("Región Más Activa", geo_insights.get('most_active_region', 'N/A'))

        st.markdown("---")

        # Top países
        st.markdown("**🏆 Top 10 Países Más Mencionados**")

        if geo_insights['top_countries']:
            countries_df = pd.DataFrame(
                geo_insights['top_countries'],
                columns=['País', 'Menciones']
            )

            col1, col2 = st.columns([1, 1])

            with col1:
                st.dataframe(countries_df, use_container_width=True, height=400)

            with col2:
                fig = px.bar(
                    countries_df,
                    x='Menciones',
                    y='País',
                    orientation='h',
                    title='Top 10 Países por Menciones',
                    color='Menciones',
                    color_continuous_scale='Blues'
                )
                fig.update_layout(yaxis={'categoryorder': 'total ascending'}, height=400)
                st.plotly_chart(fig, use_container_width=True)

            st.markdown("---")

            # Distribución por continentes
            st.markdown("**🌎 Distribución por Continentes**")

            continent_df = pd.DataFrame(
                list(geo_insights['continent_distribution'].items()),
                columns=['Continente', 'Menciones']
            ).sort_values('Menciones', ascending=False)

            col1, col2 = st.columns([1, 1])

            with col1:
                st.dataframe(continent_df, use_container_width=True)

            with col2:
                fig = go.Figure(data=[go.Pie(
                    labels=continent_df['Continente'],
                    values=continent_df['Menciones'],
                    hole=0.3
                )])
                fig.update_layout(title='Distribución de Publicaciones por Continente')
                st.plotly_chart(fig, use_container_width=True)

            # Insights
            st.markdown("---")
            st.markdown("**💡 Insights Geográficos**")
            st.success(f"""
            - El país más mencionado es **{geo_insights['top_countries'][0][0]}** con **{geo_insights['top_countries'][0][1]}** menciones
            - La región más activa es **{geo_insights.get('most_active_region', 'N/A')}**
            - Se identificaron **{geo_insights['total_countries_analyzed']}** países diferentes en el corpus
            - Los 3 países con más publicaciones representan el **{sum([c[1] for c in geo_insights['top_countries'][:3]]) / sum([c[1] for c in geo_insights['top_countries']]) * 100:.1f}%** del total
            """)
        else:
            st.warning("No se encontraron países en el corpus")

    # Tab 4: Análisis Temporal
    with tabs[3]:
        st.markdown("### 📅 Análisis Temporal")

        if 'message' in temp_insights:
            st.warning(temp_insights['message'])
        else:
            st.markdown("**📊 Estadísticas Temporales**")
            col1, col2, col3, col4 = st.columns(4)

            year_range = temp_insights['year_range']
            col1.metric("Rango de Años", f"{year_range[0]} - {year_range[1]}")
            col2.metric("Total Menciones", temp_insights['total_year_mentions'])
            col3.metric("Años Únicos", temp_insights['unique_years'])
            col4.metric("Año Más Mencionado", temp_insights['most_mentioned_year'])

            st.markdown("---")

            # Top años
            st.markdown("**📆 Top 10 Años Más Mencionados**")

            years_df = pd.DataFrame(
                temp_insights['top_years'],
                columns=['Año', 'Menciones']
            )

            col1, col2 = st.columns([1, 1])

            with col1:
                st.dataframe(years_df, use_container_width=True, height=400)

            with col2:
                fig = px.line(
                    years_df,
                    x='Año',
                    y='Menciones',
                    title='Evolución de Menciones por Año',
                    markers=True
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, use_container_width=True)

            st.markdown("---")

            # Distribución por décadas
            st.markdown("**📊 Distribución por Décadas**")

            decade_df = pd.DataFrame(
                list(temp_insights['decade_distribution'].items()),
                columns=['Década', 'Menciones']
            )
            decade_df['Década'] = decade_df['Década'].astype(str) + 's'

            col1, col2 = st.columns([1, 1])

            with col1:
                st.dataframe(decade_df, use_container_width=True)

            with col2:
                fig = px.bar(
                    decade_df,
                    x='Década',
                    y='Menciones',
                    title='Publicaciones por Década',
                    color='Menciones',
                    color_continuous_scale='Viridis'
                )
                st.plotly_chart(fig, use_container_width=True)

            # Insights temporales
            st.markdown("---")
            st.markdown("**💡 Insights Temporales**")
            st.info(f"""
            - El período de análisis abarca desde **{year_range[0]}** hasta **{year_range[1]}** ({year_range[1] - year_range[0]} años)
            - El año más mencionado es **{temp_insights['most_mentioned_year']}** con **{dict(temp_insights['top_years'])[temp_insights['most_mentioned_year']]}** menciones
            - Se identificaron **{temp_insights['unique_years']}** años únicos en el corpus
            - Tendencia: La transformación digital en educación superior muestra mayor actividad en los años recientes
            """)

    # Tab 5: Análisis de Entidades
    with tabs[4]:
        st.markdown("### 🏷️ Análisis de Entidades")

        top_entities = corpus_analysis['top_entities_by_category']

        if not top_entities:
            st.warning("No se encontraron entidades en el corpus")
            return

        st.markdown("**📋 Categorías de Entidades Identificadas**")

        # Mostrar resumen de categorías
        category_counts = {
            label: sum(count for _, count in entities)
            for label, entities in top_entities.items()
        }

        categories_df = pd.DataFrame(
            list(category_counts.items()),
            columns=['Categoría', 'Total Menciones']
        ).sort_values('Total Menciones', ascending=False)

        col1, col2 = st.columns([1, 1])

        with col1:
            st.dataframe(categories_df, use_container_width=True)

        with col2:
            fig = px.pie(
                categories_df,
                values='Total Menciones',
                names='Categoría',
                title='Distribución de Categorías de Entidades'
            )
            st.plotly_chart(fig, use_container_width=True)

        st.markdown("---")

        # Detalles por categoría
        st.markdown("**🔍 Top Entidades por Categoría**")

        # Mapeo de nombres de categorías
        category_names = {
            'GPE': '🌍 Países/Ciudades',
            'ORG': '🏢 Organizaciones',
            'PERSON': '👤 Personas',
            'DATE': '📅 Fechas',
            'CARDINAL': '🔢 Números',
            'MONEY': '💰 Cantidades Monetarias',
            'PERCENT': '📊 Porcentajes',
            'TIME': '⏰ Tiempos',
            'ORDINAL': '🔢 Ordinales',
            'QUANTITY': '📏 Cantidades',
            'FAC': '🏗️ Instalaciones',
            'PRODUCT': '📦 Productos',
            'EVENT': '🎯 Eventos',
            'WORK_OF_ART': '🎨 Obras de Arte',
            'LAW': '⚖️ Leyes',
            'LANGUAGE': '🗣️ Idiomas',
            'NORP': '👥 Nacionalidades/Grupos'
        }

        for label, entities in sorted(top_entities.items(), key=lambda x: sum(c for _, c in x[1]), reverse=True):
            if entities:
                display_name = category_names.get(label, label)

                with st.expander(f"{display_name} - Top 10", expanded=False):
                    entities_df = pd.DataFrame(
                        entities,
                        columns=['Entidad', 'Menciones']
                    )

                    col1, col2 = st.columns([1, 1])

                    with col1:
                        st.dataframe(entities_df, use_container_width=True)

                    with col2:
                        fig = px.bar(
                            entities_df,
                            x='Menciones',
                            y='Entidad',
                            orientation='h',
                            title=f'Top 10 - {display_name}',
                            color='Menciones',
                            color_continuous_scale='Teal'
                        )
                        fig.update_layout(yaxis={'categoryorder': 'total ascending'})
                        st.plotly_chart(fig, use_container_width=True)

    # Tab 6: Co-ocurrencias
    with tabs[5]:
        st.markdown("### 🔗 Análisis de Co-ocurrencias entre Entidades")

        if 'message' in cooccurrence_insights:
            st.warning(cooccurrence_insights['message'])
        else:
            st.markdown("**📊 Estadísticas de Co-ocurrencias**")
            col1, col2 = st.columns(2)

            col1.metric("Total Co-ocurrencias Detectadas", cooccurrence_insights['total_cooccurrences'])
            col2.metric("Top Pares Mostrados", len(cooccurrence_insights['top_pairs']))

            st.markdown("---")

            # Top pares que co-ocurren
            st.markdown("**🔝 Top 20 Pares de Entidades que Co-ocurren**")

            pairs_data = []
            for pair, count in cooccurrence_insights['top_pairs']:
                entity1, entity2 = pair
                pairs_data.append({
                    'Entidad 1': entity1.rsplit(' (', 1)[0],
                    'Tipo 1': entity1.rsplit(' (', 1)[1].rstrip(')') if '(' in entity1 else '',
                    'Entidad 2': entity2.rsplit(' (', 1)[0],
                    'Tipo 2': entity2.rsplit(' (', 1)[1].rstrip(')') if '(' in entity2 else '',
                    'Co-ocurrencias': count
                })

            pairs_df = pd.DataFrame(pairs_data)

            col1, col2 = st.columns([1, 1])

            with col1:
                st.dataframe(pairs_df, use_container_width=True, height=600)

            with col2:
                # Gráfico de barras de top co-ocurrencias
                pairs_df['Par'] = pairs_df['Entidad 1'] + ' ↔ ' + pairs_df['Entidad 2']
                fig = px.bar(
                    pairs_df.head(15),
                    x='Co-ocurrencias',
                    y='Par',
                    orientation='h',
                    title='Top 15 Pares de Entidades que Co-ocurren',
                    color='Co-ocurrencias',
                    color_continuous_scale='Sunset'
                )
                fig.update_layout(yaxis={'categoryorder': 'total ascending'}, height=600)
                st.plotly_chart(fig, use_container_width=True)

            st.markdown("---")

            # Gráfico de red de co-ocurrencias
            st.markdown("**🕸️ Red de Co-ocurrencias (Top 20)**")

            network_data = cooccurrence_insights['network_data'][:20]

            if network_data:
                # Crear grafo de red usando plotly
                import networkx as nx

                G = nx.Graph()
                for link in network_data:
                    G.add_edge(link['source'], link['target'], weight=link['weight'])

                pos = nx.spring_layout(G, k=2, iterations=50)

                edge_trace = []
                for edge in G.edges():
                    x0, y0 = pos[edge[0]]
                    x1, y1 = pos[edge[1]]
                    weight = G[edge[0]][edge[1]]['weight']
                    edge_trace.append(go.Scatter(
                        x=[x0, x1, None],
                        y=[y0, y1, None],
                        mode='lines',
                        line=dict(width=weight/2, color='#888'),
                        hoverinfo='none',
                        showlegend=False
                    ))

                node_trace = go.Scatter(
                    x=[],
                    y=[],
                    text=[],
                    mode='markers+text',
                    hoverinfo='text',
                    textposition="top center",
                    marker=dict(
                        showscale=True,
                        colorscale='YlGnBu',
                        size=15,
                        colorbar=dict(
                            thickness=15,
                            title='Conexiones',
                            xanchor='left',
                            titleside='right'
                        )
                    )
                )

                for node in G.nodes():
                    x, y = pos[node]
                    node_trace['x'] += tuple([x])
                    node_trace['y'] += tuple([y])
                    node_trace['text'] += tuple([node])

                node_adjacencies = []
                for node in G.nodes():
                    node_adjacencies.append(len(list(G.neighbors(node))))

                node_trace['marker']['color'] = node_adjacencies

                fig = go.Figure(data=edge_trace + [node_trace],
                             layout=go.Layout(
                                title='Red de Co-ocurrencias entre Entidades',
                                titlefont_size=16,
                                showlegend=False,
                                hovermode='closest',
                                margin=dict(b=0,l=0,r=0,t=40),
                                xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                                yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                                height=700
                                ))

                st.plotly_chart(fig, use_container_width=True)

                st.info("""
                **💡 Interpretación:**
                - Los nodos representan entidades nombradas
                - Las líneas conectan entidades que aparecen cerca en el texto
                - El grosor de la línea indica la frecuencia de co-ocurrencia
                - El color del nodo indica cuántas conexiones tiene
                """)

    # Tab 7: Métricas por Documento
    with tabs[6]:
        st.markdown("### 📈 Métricas Detalladas por Documento")

        doc_metrics = corpus_analysis['document_metrics']
        doc_df = pd.DataFrame(doc_metrics)

        st.markdown("**📊 Tabla Completa de Métricas**")
        st.dataframe(
            doc_df.sort_values('total_entities', ascending=False),
            use_container_width=True,
            height=400
        )

        st.markdown("---")

        # Distribuciones
        st.markdown("**📈 Distribuciones Estadísticas**")

        col1, col2, col3 = st.columns(3)

        with col1:
            fig = px.histogram(
                doc_df,
                x='total_entities',
                nbins=20,
                title='Distribución: Total de Entidades',
                labels={'total_entities': 'Total Entidades', 'count': 'Frecuencia'},
                color_discrete_sequence=['#636EFA']
            )
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            fig = px.histogram(
                doc_df,
                x='entity_density',
                nbins=20,
                title='Distribución: Densidad de Entidades',
                labels={'entity_density': 'Densidad (por 1K)', 'count': 'Frecuencia'},
                color_discrete_sequence=['#EF553B']
            )
            st.plotly_chart(fig, use_container_width=True)

        with col3:
            fig = px.histogram(
                doc_df,
                x='unique_countries',
                nbins=15,
                title='Distribución: Países Únicos',
                labels={'unique_countries': 'Países Únicos', 'count': 'Frecuencia'},
                color_discrete_sequence=['#00CC96']
            )
            st.plotly_chart(fig, use_container_width=True)

        st.markdown("---")

        # Análisis comparativo
        st.markdown("**🔍 Análisis Comparativo de Documentos**")

        # Box plot de entidades por documento
        fig = px.box(
            doc_df,
            y='total_entities',
            title='Box Plot: Distribución de Entidades por Documento',
            labels={'total_entities': 'Total Entidades'}
        )
        fig.update_traces(marker_color='lightblue', marker_line_color='blue', marker_line_width=1.5)
        st.plotly_chart(fig, use_container_width=True)

        st.markdown("---")

        # Estadísticas resumen
        st.markdown("**📋 Estadísticas Resumen**")

        col1, col2, col3, col4 = st.columns(4)

        col1.metric("Mínimo Entidades", int(doc_df['total_entities'].min()))
        col2.metric("Máximo Entidades", int(doc_df['total_entities'].max()))
        col3.metric("Media Entidades", f"{doc_df['total_entities'].mean():.2f}")
        col4.metric("Mediana Entidades", f"{doc_df['total_entities'].median():.2f}")

        st.info(f"""
        **💡 Insights de Diversidad:**
        - Rango de entidades: {int(doc_df['total_entities'].min())} - {int(doc_df['total_entities'].max())}
        - Desviación estándar: {doc_df['total_entities'].std():.2f}
        - El {((doc_df['entity_density'] > diversity_insights['avg_entity_density']).sum() / len(doc_df) * 100):.1f}% de los documentos están por encima de la densidad promedio
        - Coeficiente de variación: {(doc_df['total_entities'].std() / doc_df['total_entities'].mean() * 100):.2f}%
        """)

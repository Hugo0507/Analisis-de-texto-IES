"""
Página de BERTopic - Topic Modeling con Transformers
Usa embeddings de BERT para descubrir temas semánticamente coherentes
"""

import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime
from components.ui.helpers import (
    show_section_header,
    show_chart_interpretation,
    get_connector,
    download_folder_from_drive,
    upload_folder_to_drive,
    save_results_to_cache
)

# Verificar si BERTopic está disponible
try:
    from src.models.bertopic_analyzer import BERTopicAnalyzer, BERTOPIC_AVAILABLE
except (ImportError, Exception) as e:
    BERTOPIC_AVAILABLE = False
    print(f"BERTopic no disponible: {e}")


def render():
    """Renderiza la página de BERTopic"""

    show_section_header(
        "BERTopic - Topic Modeling con Transformers",
        "Modelado de temas usando embeddings de BERT para coherencia semántica"
    )

    # Verificar si BERTopic está disponible
    if not BERTOPIC_AVAILABLE:
        st.error("""
        ❌ **BERTopic no está instalado**

        Para usar BERTopic, necesitas instalar las siguientes librerías:

        ```bash
        pip install bertopic
        pip install sentence-transformers
        ```

        **Nota**: BERTopic requiere modelos de transformers que pueden ser grandes (> 400MB).
        Asegúrate de tener suficiente espacio en disco.
        """)
        return

    # Verificar prerequisitos
    if 'preprocessing_results' not in st.session_state:
        st.warning("⚠️ No hay textos preprocesados. Completa primero el Preprocesamiento.")
        return

    tabs = st.tabs([
        "⚙️ Configuración",
        "📊 Resultados",
        "🎨 Visualizaciones",
        "🔍 Exploración",
        "💾 Persistencia"
    ])

    # Tab 1: Configuración
    with tabs[0]:
        render_configuration_tab()

    # Verificar si se ha ejecutado el análisis
    if 'bertopic_config' not in st.session_state:
        for i in range(1, 5):
            with tabs[i]:
                st.info("ℹ️ Configura y ejecuta el análisis en la pestaña 'Configuración' primero.")
        return

    # Ejecutar análisis si no existe
    if 'bertopic_results' not in st.session_state:
        execute_bertopic_analysis()

    # Mostrar resultados
    results = st.session_state.bertopic_results

    # Tab 2: Resultados
    with tabs[1]:
        render_results(results)

    # Tab 3: Visualizaciones
    with tabs[2]:
        render_visualizations(results)

    # Tab 4: Exploración
    with tabs[3]:
        render_exploration(results)

    # Tab 5: Persistencia
    with tabs[4]:
        render_persistence_tab(results)


def render_configuration_tab():
    """Renderiza la pestaña de configuración"""

    st.markdown("### ⚙️ Configuración de BERTopic")

    st.info("""
    **BERTopic** es un algoritmo de topic modeling basado en transformers que:
    - Usa embeddings de BERT para representar documentos
    - Agrupa documentos similares con HDBSCAN/KMeans
    - Extrae temas usando TF-IDF en los clusters
    - Genera temas más coherentes semánticamente que LDA/NMF

    **Ventajas**:
    - ✅ Temas más coherentes y semánticamente ricos
    - ✅ Soporta múltiples idiomas
    - ✅ Visualizaciones interactivas integradas
    - ✅ Búsqueda semántica de temas

    **Desventajas**:
    - ⚠️  Requiere más recursos computacionales
    - ⚠️  Más lento que LDA/NMF
    - ⚠️  Necesita descarga de modelos (400MB+)
    """)

    st.markdown("---")

    st.markdown("**Parámetros del Modelo**")

    col1, col2 = st.columns(2)

    with col1:
        embedding_models = [
            'all-MiniLM-L6-v2',  # Ligero y rápido (default)
            'all-mpnet-base-v2',  # Mejor calidad, más lento
            'paraphrase-multilingual-MiniLM-L12-v2',  # Multilingüe
            'distilbert-base-nli-mean-tokens'  # DistilBERT
        ]

        embedding_model = st.selectbox(
            "Modelo de Embeddings",
            embedding_models,
            help="Modelo de sentence-transformers para generar embeddings"
        )

        st.caption("""
        **Recomendaciones**:
        - `all-MiniLM-L6-v2`: Rápido, buena calidad (default)
        - `all-mpnet-base-v2`: Mejor calidad, más lento
        - `paraphrase-multilingual-MiniLM-L12-v2`: Para textos multilingües
        """)

    with col2:
        n_topics_option = st.radio(
            "Número de Temas",
            ["Automático (HDBSCAN)", "Manual (KMeans)"],
            help="Automático usa HDBSCAN, Manual usa KMeans con n temas fijo"
        )

        if n_topics_option == "Manual (KMeans)":
            n_topics = st.slider(
                "Número de temas",
                min_value=3,
                max_value=20,
                value=10,
                help="Número fijo de temas a descubrir"
            )
        else:
            n_topics = None
            st.info("HDBSCAN determinará automáticamente el número óptimo de temas")

    st.markdown("---")

    col1, col2 = st.columns(2)

    with col1:
        min_topic_size = st.slider(
            "Tamaño mínimo de tema",
            min_value=2,
            max_value=20,
            value=10,
            help="Mínimo número de documentos para formar un tema"
        )

    with col2:
        calculate_probs = st.checkbox(
            "Calcular probabilidades",
            value=True,
            help="Calcula probabilidades de asignación de temas (más lento)"
        )

    st.markdown("---")

    # Advertencia sobre recursos
    st.warning("""
    ⚠️  **Nota sobre recursos**:
    - Primera ejecución descarga el modelo de embeddings (~400MB)
    - Generación de embeddings puede tardar 2-5 minutos
    - Corpus grande (>200 docs) puede tardar 5-10 minutos
    - Los resultados se guardan en caché para siguientes ejecuciones
    """)

    st.markdown("---")

    # Botón de ejecución
    col1, col2 = st.columns([2, 1])

    with col1:
        if st.button("🚀 Ejecutar Análisis BERTopic", type="primary", use_container_width=True):
            config = {
                'embedding_model': embedding_model,
                'n_topics': n_topics,
                'min_topic_size': min_topic_size,
                'calculate_probabilities': calculate_probs,
                'force_recompute': False
            }
            st.session_state.bertopic_config = config
            st.rerun()

    with col2:
        if st.button("🔄 Forzar Re-cálculo", use_container_width=True):
            config = {
                'embedding_model': embedding_model,
                'n_topics': n_topics,
                'min_topic_size': min_topic_size,
                'calculate_probabilities': calculate_probs,
                'force_recompute': True
            }
            st.session_state.bertopic_config = config
            if 'bertopic_results' in st.session_state:
                del st.session_state.bertopic_results
            st.rerun()


def execute_bertopic_analysis():
    """Ejecuta el análisis de BERTopic"""

    config = st.session_state.bertopic_config

    # Intentar cargar desde caché
    from src.utils.local_cache import LocalCache
    local_cache = LocalCache('bertopic_analysis')

    if not config.get('force_recompute', False):
        cached_results = local_cache.load(config=config)
        if cached_results:
            # Intentar cargar el modelo BERTopic guardado
            from pathlib import Path
            model_cache_dir = Path("cache") / "bertopic_analysis_cache"
            model_path = str(model_cache_dir / "bertopic_model")

            # Si no existe localmente, intentar descargar desde Drive
            if not Path(model_path).exists():
                connector = get_connector()
                if connector and st.session_state.get('parent_folder_id'):
                    # Buscar carpeta de BERTopic en Drive
                    folder_bt = connector.get_or_create_folder(
                        st.session_state.parent_folder_id,
                        "10_BERTopic_Analysis"
                    )

                    # Buscar archivos del modelo (tienen prefijo "model_")
                    files = connector.list_files_in_folder(folder_bt, recursive=False)
                    model_files = [f for f in files if f['name'].startswith('model_')]

                    if model_files:
                        st.info("📥 Descargando modelo BERTopic desde Drive...")
                        Path(model_path).mkdir(parents=True, exist_ok=True)

                        for file_info in model_files:
                            content = connector.download_file(file_info['id'])
                            if content:
                                # Remover el prefijo "model_" del nombre
                                filename = file_info['name'].replace('model_', '', 1)
                                file_path = Path(model_path) / filename
                                with open(file_path, 'wb') as f:
                                    f.write(content)

                        st.success("✓ Modelo descargado desde Drive")

            if Path(model_path).exists():
                try:
                    from src.models.bertopic_analyzer import BERTopicAnalyzer
                    analyzer = BERTopicAnalyzer()

                    if analyzer.load_model(model_path):
                        cached_results['analyzer'] = analyzer
                        st.success("✅ Resultados y modelo cargados correctamente")
                    else:
                        st.success("✅ Resultados cargados desde caché local")
                        st.info("ℹ️ Modelo no disponible. Las visualizaciones requerirán re-entrenamiento.")
                except Exception as e:
                    st.success("✅ Resultados cargados desde caché local")
                    st.warning(f"⚠️ No se pudo cargar el modelo: {e}")
            else:
                st.success("✅ Resultados cargados desde caché local")
                st.info("ℹ️ Modelo no encontrado. Las visualizaciones requerirán re-entrenamiento.")

            st.session_state.bertopic_results = cached_results
            return

    # Si no hay caché, procesar
    with st.spinner("🤖 Ejecutando BERTopic... Esto puede tardar varios minutos (primera vez descarga modelos)."):
        from src.models.bertopic_analyzer import BERTopicAnalyzer

        # Obtener textos preprocesados
        preprocessing_results = st.session_state.preprocessing_results
        documents_data = preprocessing_results['documents']

        # Preparar textos (unir tokens)
        texts_dict = {}
        for doc_name, doc_data in documents_data.items():
            text = ' '.join(doc_data['tokens'])
            texts_dict[doc_name] = text

        # Inicializar analizador
        analyzer = BERTopicAnalyzer()

        # Entrenar BERTopic
        st.info("🔄 Generando embeddings y entrenando modelo...")
        results = analyzer.fit_bertopic(
            texts_dict,
            n_topics=config.get('n_topics'),
            embedding_model=config['embedding_model'],
            min_topic_size=config['min_topic_size'],
            calculate_probabilities=config['calculate_probabilities'],
            verbose=True
        )

        # Guardar el analizador para visualizaciones
        results['analyzer'] = analyzer

        # Guardar en session state
        st.session_state.bertopic_results = results

        # Guardar en caché local (sin el analyzer para reducir tamaño)
        cache_results = {k: v for k, v in results.items() if k != 'analyzer'}
        local_cache.save(
            results=cache_results,
            config=config,
            metadata={
                'document_count': len(texts_dict),
                'n_topics': results['n_topics']
            }
        )

        # Guardar en Drive
        connector = get_connector()
        if connector and st.session_state.get('parent_folder_id'):
            # 1. Crear carpeta principal en Drive
            folder_bt = connector.get_or_create_folder(
                st.session_state.parent_folder_id,
                "10_BERTopic_Analysis"
            )
            st.session_state.persistence_folders['10_BERTopic_Analysis'] = folder_bt

            # 2. Guardar resultados JSON
            cache_data = {
                'topics': results['topics'],
                'n_topics': results['n_topics'],
                'n_outliers': results['n_outliers'],
                'coherence': results['coherence'],
                'config': config,
                'analysis_date': datetime.now().isoformat()
            }

            save_results_to_cache(
                folder_bt,
                "bertopic_results.json",
                cache_data
            )
            print(f"✓ Resultados BERTopic guardados en Drive")

            # 3. Guardar modelo completo para visualizaciones
            from pathlib import Path

            model_cache_dir = Path("cache") / "bertopic_analysis_cache"
            model_cache_dir.mkdir(parents=True, exist_ok=True)
            model_path = str(model_cache_dir / "bertopic_model")

            if analyzer.save_model(model_path):
                print(f"✓ Modelo BERTopic guardado localmente")

                # Subir el modelo a Drive (en una subcarpeta)
                try:
                    # Subir cada archivo del modelo individualmente
                    from pathlib import Path
                    model_dir = Path(model_path)

                    if model_dir.exists():
                        for file_path in model_dir.glob('*'):
                            if file_path.is_file():
                                with open(file_path, 'rb') as f:
                                    content = f.read()

                                # Subir directamente a la carpeta de BERTopic
                                connector.upload_file(
                                    folder_bt,
                                    f"model_{file_path.name}",
                                    content,
                                    'application/octet-stream'
                                )
                        print(f"✓ Modelo BERTopic subido a Drive para persistencia")
                except Exception as e:
                    print(f"⚠️ Error subiendo modelo a Drive: {e}")
                    print(f"   Modelo disponible solo localmente")
            else:
                print(f"⚠️ No se pudo guardar el modelo BERTopic")

    st.success("✅ Análisis BERTopic completado y guardado")
    st.rerun()


def render_results(results: dict):
    """Renderiza resultados de BERTopic"""

    st.markdown("### 📊 Resultados de BERTopic")

    # Métricas principales
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Temas Descubiertos", results['n_topics'])
    col2.metric("Documentos Clasificados", results['total_documents'] - results['n_outliers'])
    col3.metric("Outliers", results['n_outliers'])
    col4.metric("Coherencia", f"{results['coherence']:.3f}")

    st.markdown("---")

    # Información del modelo
    with st.expander("ℹ️ Información del Modelo"):
        st.write(f"**Modelo de Embeddings**: {results.get('embedding_model', 'N/A')}")
        st.write(f"**Tipo de Modelo**: {results['model_type']}")
        st.write(f"**Total Documentos**: {results['total_documents']}")

    st.markdown("---")

    # Temas descubiertos
    st.markdown("**🏷️ Temas Descubiertos**")

    for topic in results['topics']:
        with st.expander(f"**{topic['topic_name']}** ({topic['count']} documentos): {topic['top_words_str'][:80]}..."):
            # Top palabras
            st.markdown("**Top Palabras**:")
            words_df = pd.DataFrame(topic['top_words'])
            st.dataframe(words_df, use_container_width=True)

            # Documentos del tema
            if topic.get('documents'):
                st.markdown("**Documentos en este tema**:")
                for doc in topic['documents'][:5]:
                    st.write(f"- {doc}")

    # Distribución de documentos por tema
    st.markdown("---")
    st.markdown("**📑 Distribución de Documentos por Tema**")

    doc_topics_df = pd.DataFrame(results['doc_topics'])

    # Agrupar por tema
    topic_counts = doc_topics_df[doc_topics_df['topic_id'] != -1]['topic_name'].value_counts()

    fig_dist = px.bar(
        x=topic_counts.index,
        y=topic_counts.values,
        labels={'x': 'Tema', 'y': 'Número de Documentos'},
        title='Distribución de Documentos por Tema'
    )
    st.plotly_chart(fig_dist, use_container_width=True)

    show_chart_interpretation(
        chart_type="Grafico de Barras Verticales",
        title="Distribucion de Documentos por Tema",
        interpretation="Esta grafica muestra cuantos documentos fueron asignados a cada tema identificado por BERTopic. BERTopic es un modelo de topic modeling basado en transformers (BERT) que descubre temas semanticamente coherentes usando embeddings densos y clustering. A diferencia de LDA/NMF que usan bag-of-words, BERTopic captura relaciones semanticas profundas entre palabras.",
        what_to_look_for=[
            "**Temas dominantes**: ¿Hay temas con muchos mas documentos que otros? Esto indica tematicas centrales en el corpus.",
            "**Distribucion equilibrada vs. concentrada**: Una distribucion equilibrada sugiere diversidad tematica, mientras que concentracion indica especializacion del corpus.",
            "**Temas con pocos documentos**: Pueden representar nichos especializados o ruido. Considera si son relevantes o deben fusionarse.",
            "**Comparacion con otros modelos**: Compara con LDA/NMF para validar consenso tematico y evaluar complementariedad de metodos."
        ]
    )


def render_visualizations(results: dict):
    """Renderiza visualizaciones de BERTopic"""

    st.markdown("### 🎨 Visualizaciones Interactivas de BERTopic")

    analyzer = results.get('analyzer')

    if analyzer is None or analyzer.model is None:
        st.warning("⚠️ Visualizaciones no disponibles. El modelo necesita ser re-entrenado en esta sesión.")
        return

    st.info("Las visualizaciones de BERTopic son interactivas. Puedes hacer zoom, pan, y hover para más detalles.")

    # Visualización 1: Topics
    st.markdown("---")
    st.markdown("**📍 Distribución de Temas en Espacio 2D**")

    with st.spinner("Generando visualización de temas..."):
        try:
            fig_topics = analyzer.visualize_topics()
            if fig_topics:
                st.plotly_chart(fig_topics, use_container_width=True)
                st.caption("Cada punto representa un tema. La distancia indica similitud semántica.")

                show_chart_interpretation(
                    chart_type="Diagrama de Dispersion 2D (Reduccion Dimensional)",
                    title="Distribucion de Temas en Espacio 2D",
                    interpretation="Esta visualizacion proyecta los temas en un espacio bidimensional usando reduccion dimensional (UMAP/t-SNE). Cada punto representa un tema, y su posicion refleja la similitud semantica con otros temas basada en los embeddings de BERT. Los temas cercanos comparten vocabulario y contexto semantico similar.",
                    what_to_look_for=[
                        "**Clusters de temas**: ¿Se forman grupos de temas cercanos? Esto indica super-categorias tematicas o areas de conocimiento relacionadas.",
                        "**Temas aislados**: Temas muy separados representan tematicas distintivas o especializadas sin mucha relacion con otros.",
                        "**Densidad espacial**: Regiones densas indican diversidad de sub-temas dentro de un area, regiones dispersas muestran heterogeneidad tematica.",
                        "**Tamano de puntos**: Si varia, puede indicar el numero de documentos por tema (validar temas grandes vs. pequenos)."
                    ]
                )
            else:
                st.info("Visualización de temas no disponible.")
        except Exception as e:
            st.error(f"Error generando visualización: {e}")

    # Visualización 2: Barchart
    st.markdown("---")
    st.markdown("**📊 Top Temas por Tamaño**")

    top_n = st.slider("Número de temas a mostrar", 3, 15, 8, key="barchart_slider")

    with st.spinner("Generando gráfico de barras..."):
        try:
            fig_bar = analyzer.visualize_barchart(top_n_topics=top_n)
            if fig_bar:
                st.plotly_chart(fig_bar, use_container_width=True)

                show_chart_interpretation(
                    chart_type="Grafico de Barras Agrupadas (Top Temas)",
                    title="Top Temas por Tamano",
                    interpretation="Este grafico muestra los temas mas importantes ordenados por numero de documentos asignados. Cada tema se representa con sus palabras clave mas representativas, permitiendo una comprension rapida de las tematicas principales del corpus. La longitud de las barras indica la prevalencia de cada tema.",
                    what_to_look_for=[
                        "**Palabras clave por tema**: ¿Las palabras clave tienen coherencia semantica? Temas coherentes indican buena calidad del modelado.",
                        "**Diferencias de tamano**: ¿Hay un tema dominante o varios temas de tamano similar? Esto refleja la estructura tematica del corpus.",
                        "**Interpretabilidad**: ¿Puedes asignar un nombre significativo a cada tema basandote en sus palabras clave?",
                        "**Ajuste del top_n**: Experimenta con diferentes valores para ver mas o menos temas y encontrar el nivel de granularidad optimo."
                    ]
                )
            else:
                st.info("Gráfico de barras no disponible.")
        except Exception as e:
            st.error(f"Error generando gráfico: {e}")

    # Visualización 3: Heatmap
    st.markdown("---")
    st.markdown("**🔥 Similitud entre Temas (Heatmap)**")

    with st.spinner("Generando heatmap..."):
        try:
            fig_heat = analyzer.visualize_heatmap()
            if fig_heat:
                st.plotly_chart(fig_heat, use_container_width=True)
                st.caption("Colores más claros indican mayor similitud entre temas.")

                show_chart_interpretation(
                    chart_type="Heatmap (Mapa de Calor de Similitud)",
                    title="Similitud entre Temas",
                    interpretation="Este heatmap muestra la similitud coseno entre pares de temas basada en sus representaciones vectoriales (embeddings). Colores mas claros/calidos indican mayor similitud semantica entre temas, mientras que colores oscuros/frios muestran temas disimiles. La diagonal siempre es maxima (un tema consigo mismo).",
                    what_to_look_for=[
                        "**Bloques de colores claros**: Grupos de temas muy similares que podrian fusionarse para reducir redundancia o representan sub-categorias de un tema mayor.",
                        "**Temas disimiles**: Filas/columnas predominantemente oscuras indican temas unicos y distintivos sin relacion con otros.",
                        "**Patron de similitud**: ¿La similitud sigue una estructura (ej. temas contiguos son similares)? Esto sugiere una jerarquia tematica.",
                        "**Validacion de clustering**: Compara con la visualizacion 2D para validar coherencia espacial y semantica de los agrupamientos."
                    ]
                )
            else:
                st.info("Heatmap no disponible.")
        except Exception as e:
            st.error(f"Error generando heatmap: {e}")


def render_exploration(results: dict):
    """Renderiza herramientas de exploración"""

    st.markdown("### 🔍 Exploración de Temas")

    analyzer = results.get('analyzer')

    if analyzer is None or analyzer.model is None:
        st.warning("⚠️ Exploración no disponible. El modelo necesita ser re-entrenado en esta sesión.")
        return

    # Búsqueda de temas
    st.markdown("**🔎 Búsqueda Semántica de Temas**")

    query = st.text_input(
        "Busca temas similares a:",
        placeholder="digital transformation, online learning, etc.",
        help="Introduce una frase y encontraremos temas semánticamente similares"
    )

    if query:
        with st.spinner("Buscando temas similares..."):
            similar = analyzer.search_topics(query, top_n=5)

            if similar:
                st.success(f"Encontrados {len(similar)} temas similares:")

                for topic_id, score in similar:
                    topic_info = next((t for t in results['topics'] if t['topic_id'] == topic_id), None)

                    if topic_info:
                        st.write(f"**{topic_info['topic_name']}** (Similitud: {score:.3f})")
                        st.write(f"Palabras clave: {topic_info['top_words_str'][:100]}...")
                        st.write(f"Documentos: {topic_info['count']}")
                        st.markdown("---")
            else:
                st.info("No se encontraron temas similares.")

    # Tamaños de temas
    st.markdown("---")
    st.markdown("**📏 Tamaños de Temas**")

    topic_sizes = analyzer.get_topic_sizes()
    sizes_df = pd.DataFrame([
        {'Tema': f"Topic {tid}", 'Tamaño': size}
        for tid, size in sorted(topic_sizes.items(), key=lambda x: x[1], reverse=True)
    ])

    if not sizes_df.empty and 'Tema' in sizes_df.columns and 'Tamaño' in sizes_df.columns:
        col1, col2 = st.columns([1, 2])

        with col1:
            st.dataframe(sizes_df, use_container_width=True)

        with col2:
            fig_sizes = px.pie(
                sizes_df,
                values='Tamaño',
                names='Tema',
                title='Proporción de Documentos por Tema'
            )
            st.plotly_chart(fig_sizes, use_container_width=True)

        show_chart_interpretation(
            chart_type="Grafico de Pastel (Pie Chart)",
            title="Proporcion de Documentos por Tema",
            interpretation="Este grafico de pastel muestra la proporcion relativa de documentos asignados a cada tema. Cada segmento representa un tema, y su tamano es proporcional al numero de documentos que contiene. Permite visualizar rapidamente cuales temas dominan el corpus y cuales son minoritarios.",
            what_to_look_for=[
                "**Tema dominante**: ¿Hay un segmento que ocupa mas de la mitad del circulo? Esto indica un tema central que abarca la mayoria del corpus.",
                "**Distribucion balanceada**: Segmentos de tamano similar sugieren diversidad tematica equilibrada sin dominancia de un solo tema.",
                "**Temas pequenos**: Segmentos muy pequenos (< 5%) pueden ser temas especializados, ruido o candidatos para fusion con temas relacionados.",
                "**Comparacion con graficas anteriores**: Valida coherencia con el grafico de barras de distribucion y con los tamanos en la visualizacion 2D."
            ]
        )
    else:
        st.warning("⚠️ No hay datos de temas disponibles para mostrar el grafico de proporcion.")


def render_persistence_tab(results: dict):
    """Renderiza pestaña de persistencia"""

    st.markdown("### 💾 Persistencia de Resultados")

    st.info("""
    Los resultados están guardados automáticamente en:
    - **Caché local** para carga rápida
    - **Google Drive** para respaldo
    """)

    # Descargar resultados como CSV
    st.markdown("**📥 Descargar Resultados**")

    col1, col2 = st.columns(2)

    with col1:
        # CSV de temas
        topics_data = []
        for topic in results['topics']:
            for word in topic['top_words']:
                topics_data.append({
                    'Topic': topic['topic_name'],
                    'Word': word['word'],
                    'Score': word['score'],
                    'Document_Count': topic['count']
                })

        topics_df = pd.DataFrame(topics_data)
        csv_topics = topics_df.to_csv(index=False)

        st.download_button(
            label="📥 Descargar Temas (CSV)",
            data=csv_topics,
            file_name="bertopic_topics.csv",
            mime="text/csv",
            width='stretch'
        )

    with col2:
        # CSV de asignaciones documento-tema
        doc_topics_df = pd.DataFrame(results['doc_topics'])
        csv_docs = doc_topics_df.to_csv(index=False)

        st.download_button(
            label="📥 Descargar Asignaciones (CSV)",
            data=csv_docs,
            file_name="bertopic_document_topics.csv",
            mime="text/csv",
            width='stretch'
        )

    st.markdown("---")

    st.success("""
    ✅ **Archivos en Google Drive** (carpeta `10_BERTopic_Analysis/`):
    - `bertopic_results.json` - Resultados completos
    - Caché local para carga rápida en próximas sesiones

    **Nota**: Los embeddings y el modelo BERTopic no se guardan por su gran tamaño.
    Re-ejecuta el análisis si cambias de sesión.
    """)

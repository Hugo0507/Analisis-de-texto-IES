"""
Página de Modelado de Temas (Topic Modeling)
LDA, NMF, LSA y pLSA para descubrir temas ocultos
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime
from components.ui.helpers import (
    show_section_header,
    get_connector,
    save_results_to_cache,
    save_pickle_to_drive
)


def render():
    """Renderiza la página de modelado de temas"""

    show_section_header(
        "Modelado de Temas",
        "Descubre temas ocultos usando LDA, NMF, LSA y pLSA"
    )

    # Verificar prerequisitos
    if 'preprocessing_results' not in st.session_state:
        st.warning("⚠️ No hay textos preprocesados. Completa primero el Preprocesamiento.")
        return

    tabs = st.tabs([
        "⚙️ Configuración",
        "📊 Resultados LDA",
        "📈 Resultados NMF",
        "🔍 Resultados LSA",
        "🎲 Resultados pLSA",
        "⚖️ Comparación de Modelos",
        "💾 Persistencia"
    ])

    # Tab 1: Configuración
    with tabs[0]:
        render_configuration_tab()

    # Verificar si se ha ejecutado el análisis
    if 'topic_modeling_config' not in st.session_state:
        for i in range(1, 7):
            with tabs[i]:
                st.info("ℹ️ Configura y ejecuta el análisis en la pestaña 'Configuración' primero.")
        return

    # Ejecutar análisis si no existe
    if 'topic_modeling_results' not in st.session_state:
        execute_topic_modeling()

    # Mostrar resultados
    results = st.session_state.topic_modeling_results

    # Tab 2: Resultados LDA
    with tabs[1]:
        render_lda_results(results['lda'])

    # Tab 3: Resultados NMF
    with tabs[2]:
        render_nmf_results(results['nmf'])

    # Tab 4: Resultados LSA
    with tabs[3]:
        render_lsa_results(results['lsa'])

    # Tab 5: Resultados pLSA
    with tabs[4]:
        render_plsa_results(results['plsa'])

    # Tab 6: Comparación
    with tabs[5]:
        render_comparison(results)

    # Tab 7: Persistencia
    with tabs[6]:
        render_persistence_tab(results)


def render_configuration_tab():
    """Renderiza la pestaña de configuración"""

    st.markdown("### ⚙️ Configuración de Modelado de Temas")

    st.info("""
    **Modelado de Temas** descubre temas ocultos en un corpus de documentos.

    **Cuatro métodos implementados:**
    - 🎲 **LDA** (Latent Dirichlet Allocation): Método probabilístico generativo
    - 📐 **NMF** (Non-negative Matrix Factorization): Método algebraico, rápido e interpretable
    - 🔬 **LSA** (Latent Semantic Analysis): Método basado en SVD, bueno para similitud
    - 🎯 **pLSA** (probabilistic LSA): Precursor probabilístico de LDA, usa EM algorithm
    """)

    st.markdown("---")

    # Verificar caché
    from src.utils.local_cache import LocalCache
    cache = LocalCache('topic_modeling')
    cache_info = cache.get_info()

    if cache_info:
        st.success(f"""
        ✓ **Caché encontrado**
        - Fecha: {cache_info.get('timestamp', 'Desconocida')}
        - Número de temas: {cache_info.get('config', {}).get('n_topics', 'N/A')}

        Los resultados se cargarán automáticamente desde el caché.
        """)

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**Parámetros Principales**")

        n_topics = st.slider(
            "Número de temas a descubrir",
            min_value=3,
            max_value=20,
            value=10,
            help="Número de temas latentes a identificar en el corpus"
        )

        max_features = st.number_input(
            "Máximo de términos",
            min_value=500,
            max_value=5000,
            value=1000,
            step=100,
            help="Número máximo de términos a considerar"
        )

    with col2:
        st.markdown("**Parámetros de Filtrado**")

        min_df = st.number_input(
            "Frecuencia mínima de documento",
            min_value=1,
            max_value=10,
            value=2,
            help="Término debe aparecer en al menos N documentos"
        )

        max_df = st.slider(
            "Frecuencia máxima (%)",
            min_value=50,
            max_value=100,
            value=95,
            help="Ignorar términos que aparecen en más del X% de documentos"
        ) / 100

    st.markdown("---")

    # Opción de forzar re-cálculo
    force_recompute = st.checkbox(
        "🔄 Forzar re-cálculo (ignorar caché)",
        value=False,
        help="Marca para volver a calcular aunque exista caché"
    )

    col_btn1, col_btn2 = st.columns(2)

    with col_btn1:
        if st.button("▶️ Ejecutar Análisis de Temas", type="primary", use_container_width=True):
            st.session_state.topic_modeling_config = {
                'n_topics': n_topics,
                'max_features': max_features,
                'min_df': min_df,
                'max_df': max_df,
                'force_recompute': force_recompute
            }
            # Limpiar resultados previos
            if 'topic_modeling_results' in st.session_state:
                del st.session_state.topic_modeling_results
            st.success("✓ Configuración guardada. Ve a las pestañas de resultados.")
            st.rerun()

    with col_btn2:
        if cache_info and st.button("🗑️ Limpiar Caché", use_container_width=True):
            if cache.clear():
                st.success("✓ Caché eliminado")
                st.rerun()


def execute_topic_modeling():
    """Ejecuta el análisis de modelado de temas"""

    config = st.session_state.topic_modeling_config

    # Intentar cargar desde caché
    from src.utils.local_cache import LocalCache
    local_cache = LocalCache('topic_modeling')

    if not config.get('force_recompute', False):
        cached_results = local_cache.load(config=config)
        if cached_results:
            st.success("✅ Resultados cargados desde caché local")
            st.session_state.topic_modeling_results = cached_results
            return

    # Si no hay caché, procesar
    with st.spinner("🔍 Analizando temas en el corpus... Esto puede tardar varios minutos."):
        from src.models.topic_modeling import TopicModelingAnalyzer

        # Obtener textos preprocesados
        preprocessing_results = st.session_state.preprocessing_results
        documents_data = preprocessing_results['documents']

        # Preparar textos (unir tokens)
        texts_dict = {}
        for doc_name, doc_data in documents_data.items():
            text = ' '.join(doc_data['tokens'])
            texts_dict[doc_name] = text

        # Inicializar analizador
        analyzer = TopicModelingAnalyzer()
        doc_names, documents = analyzer.prepare_documents(texts_dict)

        # Entrenar LDA
        st.info("📊 Entrenando modelo LDA...")
        lda_results = analyzer.fit_lda(
            documents,
            n_topics=config['n_topics'],
            max_features=config['max_features'],
            min_df=config['min_df'],
            max_df=config['max_df']
        )

        # Obtener temas por documento (LDA)
        lda_doc_topics = analyzer.get_document_topics(
            lda_results['doc_topic_distribution'],
            doc_names
        )

        # Entrenar NMF
        st.info("📈 Entrenando modelo NMF...")
        nmf_results = analyzer.fit_nmf(
            documents,
            n_topics=config['n_topics'],
            max_features=config['max_features'],
            min_df=config['min_df'],
            max_df=config['max_df']
        )

        # Obtener temas por documento (NMF)
        nmf_doc_topics = analyzer.get_document_topics(
            nmf_results['doc_topic_distribution'],
            doc_names
        )

        # Entrenar LSA
        st.info("🔬 Entrenando modelo LSA...")
        lsa_results = analyzer.fit_lsa(
            documents,
            n_topics=config['n_topics'],
            max_features=config['max_features'],
            min_df=config['min_df'],
            max_df=config['max_df']
        )

        # Obtener temas por documento (LSA)
        lsa_doc_topics = analyzer.get_document_topics(
            lsa_results['doc_topic_distribution'],
            doc_names
        )

        # Entrenar pLSA
        st.info("🎯 Entrenando modelo pLSA...")
        plsa_results = analyzer.fit_plsa(
            documents,
            n_topics=config['n_topics'],
            max_features=config['max_features'],
            min_df=config['min_df'],
            max_df=config['max_df']
        )

        # Obtener temas por documento (pLSA)
        plsa_doc_topics = analyzer.get_document_topics(
            plsa_results['doc_topic_distribution'],
            doc_names
        )

        # Comparar modelos (incluyendo pLSA)
        comparison = analyzer.compare_models(lda_results, nmf_results, lsa_results, plsa_results)

        # Guardar resultados
        results = {
            'lda': {
                **lda_results,
                'doc_topics': lda_doc_topics
            },
            'nmf': {
                **nmf_results,
                'doc_topics': nmf_doc_topics
            },
            'lsa': {
                **lsa_results,
                'doc_topics': lsa_doc_topics
            },
            'plsa': {
                **plsa_results,
                'doc_topics': plsa_doc_topics
            },
            'comparison': comparison,
            'config': config,
            'doc_names': doc_names
        }

        # Guardar en session state
        st.session_state.topic_modeling_results = results

        # Guardar en caché local
        local_cache.save(
            results=results,
            config=config,
            metadata={
                'document_count': len(doc_names),
                'n_topics': config['n_topics']
            }
        )

        # Guardar en Drive
        connector = get_connector()
        if connector and st.session_state.get('parent_folder_id'):
            folder_tm = connector.get_or_create_folder(
                st.session_state.parent_folder_id,
                "08_Topic_Modeling"
            )
            st.session_state.persistence_folders['08_Topic_Modeling'] = folder_tm

            # Preparar datos para Drive
            cache_data = {
                'lda_topics': lda_results['topics'],
                'nmf_topics': nmf_results['topics'],
                'lsa_topics': lsa_results['topics'],
                'plsa_topics': plsa_results['topics'],
                'comparison': comparison,
                'config': config,
                'document_count': len(doc_names),
                'analysis_date': datetime.now().isoformat()
            }

            save_results_to_cache(
                folder_tm,
                "topic_modeling_results.json",
                cache_data
            )

            # Guardar modelos entrenados en pickle para uso posterior
            # Guardar cada modelo individualmente
            models_to_save = {
                'lda_model.pkl': analyzer.lda_model,
                'nmf_model.pkl': analyzer.nmf_model,
                'lsa_model.pkl': analyzer.lsa_model,
                'plsa_model.pkl': {
                    'doc_topic_dist': analyzer.plsa_model['doc_topic_dist'],
                    'topic_word_dist': analyzer.plsa_model['topic_word_dist']
                } if analyzer.plsa_model else None
            }

            for filename, model in models_to_save.items():
                if model is not None:
                    save_pickle_to_drive(folder_tm, filename, model)

            # Guardar vectorizadores
            if analyzer.vectorizer_bow:
                save_pickle_to_drive(folder_tm, "vectorizer_bow.pkl", analyzer.vectorizer_bow)
            if analyzer.vectorizer_tfidf:
                save_pickle_to_drive(folder_tm, "vectorizer_tfidf.pkl", analyzer.vectorizer_tfidf)

            print("✓ Modelos guardados en Drive para uso posterior")

    st.success("✅ Análisis de temas completado y guardado")
    st.rerun()


def render_lda_results(lda_results):
    """Renderiza resultados de LDA"""

    st.markdown("### 📊 Resultados LDA (Latent Dirichlet Allocation)")

    st.info("""
    **LDA** es un método probabilístico que asume que cada documento es una mezcla de temas
    y cada tema es una distribución de palabras.
    """)

    # Métricas
    col1, col2, col3 = st.columns(3)
    col1.metric("Temas Identificados", lda_results['n_topics'])
    col2.metric("Vocabulario", f"{lda_results['vocabulary_size']:,}")
    col3.metric("Perplejidad", f"{lda_results['perplexity']:.2f}")

    st.markdown("---")

    # Mostrar temas
    st.markdown("**🏷️ Temas Descubiertos**")

    for topic in lda_results['topics']:
        with st.expander(f"**{topic['topic_name']}**: {topic['top_words_str'][:100]}..."):
            # Crear DataFrame de palabras
            words_df = pd.DataFrame(topic['top_words'])
            words_df['weight'] = words_df['weight'].round(4)

            # Gráfico de barras
            fig = go.Figure(data=[
                go.Bar(
                    x=words_df['weight'],
                    y=words_df['word'],
                    orientation='h',
                    marker_color='indianred'
                )
            ])
            fig.update_layout(
                title=f"Top Palabras - {topic['topic_name']}",
                xaxis_title="Peso",
                yaxis_title="Palabra",
                height=400,
                yaxis={'categoryorder': 'total ascending'}
            )
            st.plotly_chart(fig, use_container_width=True)

    # Distribución de temas en documentos
    st.markdown("---")
    st.markdown("**📑 Distribución de Temas por Documento**")

    doc_topics_df = pd.DataFrame(lda_results['doc_topics'])
    doc_topics_df = doc_topics_df[['document', 'dominant_topic', 'dominant_probability']]
    doc_topics_df['dominant_topic'] = doc_topics_df['dominant_topic'].apply(lambda x: f"Tema {x+1}")

    st.dataframe(doc_topics_df, use_container_width=True)

    # Gráfico de distribución
    topic_counts = doc_topics_df['dominant_topic'].value_counts()
    fig_dist = px.bar(
        x=topic_counts.index,
        y=topic_counts.values,
        labels={'x': 'Tema', 'y': 'Número de Documentos'},
        title='Distribución de Documentos por Tema (LDA)'
    )
    st.plotly_chart(fig_dist, use_container_width=True)


def render_nmf_results(nmf_results):
    """Renderiza resultados de NMF"""

    st.markdown("### 📈 Resultados NMF (Non-negative Matrix Factorization)")

    st.info("""
    **NMF** es un método algebraico que descompone la matriz documento-término
    en dos matrices no negativas. Es más rápido que LDA y a menudo más interpretable.
    """)

    # Métricas
    col1, col2, col3 = st.columns(3)
    col1.metric("Temas Identificados", nmf_results['n_topics'])
    col2.metric("Vocabulario", f"{nmf_results['vocabulary_size']:,}")
    col3.metric("Error de Reconstrucción", f"{nmf_results['reconstruction_error']:.2f}")

    st.markdown("---")

    # Mostrar temas
    st.markdown("**🏷️ Temas Descubiertos**")

    for topic in nmf_results['topics']:
        with st.expander(f"**{topic['topic_name']}**: {topic['top_words_str'][:100]}..."):
            words_df = pd.DataFrame(topic['top_words'])
            words_df['weight'] = words_df['weight'].round(4)

            fig = go.Figure(data=[
                go.Bar(
                    x=words_df['weight'],
                    y=words_df['word'],
                    orientation='h',
                    marker_color='steelblue'
                )
            ])
            fig.update_layout(
                title=f"Top Palabras - {topic['topic_name']}",
                xaxis_title="Peso",
                yaxis_title="Palabra",
                height=400,
                yaxis={'categoryorder': 'total ascending'}
            )
            st.plotly_chart(fig, use_container_width=True)

    # Distribución
    st.markdown("---")
    st.markdown("**📑 Distribución de Temas por Documento**")

    doc_topics_df = pd.DataFrame(nmf_results['doc_topics'])
    doc_topics_df = doc_topics_df[['document', 'dominant_topic', 'dominant_probability']]
    doc_topics_df['dominant_topic'] = doc_topics_df['dominant_topic'].apply(lambda x: f"Tema {x+1}")

    st.dataframe(doc_topics_df, use_container_width=True)


def render_lsa_results(lsa_results):
    """Renderiza resultados de LSA"""

    st.markdown("### 🔬 Resultados LSA (Latent Semantic Analysis)")

    st.info("""
    **LSA** usa SVD (Singular Value Decomposition) para encontrar conceptos latentes.
    Es excelente para capturar similitud semántica entre documentos.
    """)

    # Métricas
    col1, col2, col3 = st.columns(3)
    col1.metric("Temas Identificados", lsa_results['n_topics'])
    col2.metric("Vocabulario", f"{lsa_results['vocabulary_size']:,}")
    col3.metric("Varianza Explicada", f"{lsa_results['explained_variance']:.2%}")

    st.markdown("---")

    # Mostrar temas
    st.markdown("**🏷️ Conceptos Latentes Descubiertos**")

    for topic in lsa_results['topics']:
        with st.expander(f"**{topic['topic_name']}**: {topic['top_words_str'][:100]}..."):
            words_df = pd.DataFrame(topic['top_words'])
            words_df['weight'] = words_df['weight'].round(4)

            fig = go.Figure(data=[
                go.Bar(
                    x=words_df['weight'],
                    y=words_df['word'],
                    orientation='h',
                    marker_color='mediumseagreen'
                )
            ])
            fig.update_layout(
                title=f"Top Palabras - {topic['topic_name']}",
                xaxis_title="Peso",
                yaxis_title="Palabra",
                height=400,
                yaxis={'categoryorder': 'total ascending'}
            )
            st.plotly_chart(fig, use_container_width=True)

    # Varianza explicada por componente
    st.markdown("---")
    st.markdown("**📊 Varianza Explicada por Componente**")

    variance_df = pd.DataFrame({
        'Componente': [f"C{i+1}" for i in range(len(lsa_results['explained_variance_ratio']))],
        'Varianza': lsa_results['explained_variance_ratio']
    })

    fig_var = px.bar(
        variance_df,
        x='Componente',
        y='Varianza',
        title='Varianza Explicada por cada Componente LSA'
    )
    st.plotly_chart(fig_var, use_container_width=True)


def render_plsa_results(plsa_results):
    """Renderiza resultados de pLSA"""

    st.markdown("### 🎲 Resultados pLSA (probabilistic Latent Semantic Analysis)")

    st.info("""
    **pLSA** es el precursor probabilístico de LDA. Usa el algoritmo EM (Expectation-Maximization)
    para encontrar distribuciones de probabilidad de temas en documentos y palabras en temas.
    Es similar a LDA pero sin prior Dirichlet.
    """)

    # Métricas
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Temas Identificados", plsa_results['n_topics'])
    col2.metric("Vocabulario", f"{plsa_results['vocabulary_size']:,}")
    col3.metric("Perplejidad", f"{plsa_results['perplexity']:.2f}")
    col4.metric("Iteraciones", plsa_results['iterations'])

    # Log-likelihood adicional
    st.metric("Log-Likelihood", f"{plsa_results['log_likelihood']:.2f}")

    st.markdown("---")

    # Mostrar temas
    st.markdown("**🏷️ Temas Descubiertos**")

    for topic in plsa_results['topics']:
        with st.expander(f"**{topic['topic_name']}**: {topic['top_words_str'][:100]}..."):
            # Crear DataFrame de palabras
            words_df = pd.DataFrame(topic['top_words'])
            words_df['weight'] = words_df['weight'].round(4)

            # Gráfico de barras
            fig = go.Figure(data=[
                go.Bar(
                    x=words_df['weight'],
                    y=words_df['word'],
                    orientation='h',
                    marker_color='mediumpurple'
                )
            ])
            fig.update_layout(
                title=f"Top Palabras - {topic['topic_name']}",
                xaxis_title="Probabilidad P(w|z)",
                yaxis_title="Palabra",
                height=400,
                yaxis={'categoryorder': 'total ascending'}
            )
            st.plotly_chart(fig, use_container_width=True)

    # Distribución de temas en documentos
    st.markdown("---")
    st.markdown("**📑 Distribución de Temas por Documento**")

    doc_topics_df = pd.DataFrame(plsa_results['doc_topics'])
    doc_topics_df = doc_topics_df[['document', 'dominant_topic', 'dominant_probability']]
    doc_topics_df['dominant_topic'] = doc_topics_df['dominant_topic'].apply(lambda x: f"Tema {x+1}")

    st.dataframe(doc_topics_df, use_container_width=True)

    # Gráfico de distribución
    topic_counts = doc_topics_df['dominant_topic'].value_counts()
    fig_dist = px.bar(
        x=topic_counts.index,
        y=topic_counts.values,
        labels={'x': 'Tema', 'y': 'Número de Documentos'},
        title='Distribución de Documentos por Tema (pLSA)',
        color_discrete_sequence=['mediumpurple']
    )
    st.plotly_chart(fig_dist, use_container_width=True)

    # Convergencia del algoritmo EM
    if 'log_likelihoods' in plsa_results and len(plsa_results['log_likelihoods']) > 1:
        st.markdown("---")
        st.markdown("**📈 Convergencia del Algoritmo EM**")

        convergence_df = pd.DataFrame({
            'Iteración': list(range(1, len(plsa_results['log_likelihoods']) + 1)),
            'Log-Likelihood': plsa_results['log_likelihoods']
        })

        fig_conv = px.line(
            convergence_df,
            x='Iteración',
            y='Log-Likelihood',
            title='Convergencia del Algoritmo EM en pLSA',
            markers=True
        )
        fig_conv.update_traces(line_color='mediumpurple')
        st.plotly_chart(fig_conv, use_container_width=True)

        st.caption("""
        El gráfico muestra cómo el log-likelihood aumenta con cada iteración del algoritmo EM.
        La convergencia se alcanza cuando el incremento es menor a un umbral definido.
        """)


def render_comparison(results):
    """Renderiza comparación de modelos"""

    st.markdown("### ⚖️ Comparación de Modelos")

    comparison = results['comparison']

    st.info("""
    Compara los tres métodos de modelado de temas para identificar
    cuál es más adecuado para tu corpus.
    """)

    # Tabla comparativa
    st.markdown("**📊 Métricas de Rendimiento**")

    metrics_data = []
    for model in comparison['models']:
        model_metrics = comparison['metrics'][model]
        row = {'Modelo': model, 'Tipo': model_metrics['type']}

        if model == 'LDA':
            row['Métrica Principal'] = f"Perplejidad: {model_metrics['perplexity']:.2f}"
            row['Interpretación'] = "Menor es mejor"
        elif model == 'NMF':
            row['Métrica Principal'] = f"Error: {model_metrics['reconstruction_error']:.2f}"
            row['Interpretación'] = "Menor es mejor"
        elif model == 'LSA':
            row['Métrica Principal'] = f"Varianza: {model_metrics['explained_variance']:.2%}"
            row['Interpretación'] = "Mayor es mejor"
        elif model == 'pLSA':
            row['Métrica Principal'] = f"Perplejidad: {model_metrics['perplexity']:.2f}"
            row['Interpretación'] = "Menor es mejor"
        else:
            # Fallback para cualquier otro modelo
            row['Métrica Principal'] = "N/A"
            row['Interpretación'] = "N/A"

        metrics_data.append(row)

    metrics_df = pd.DataFrame(metrics_data)
    st.dataframe(metrics_df, use_container_width=True)

    # Solapamiento de temas
    st.markdown("---")
    st.markdown("**🔗 Solapamiento de Palabras Top entre Modelos**")

    overlap = comparison['topic_overlap']
    overlap_df = pd.DataFrame([
        {'Comparación': 'LDA vs NMF', 'Similitud': f"{overlap['LDA_NMF']:.2%}"},
        {'Comparación': 'LDA vs LSA', 'Similitud': f"{overlap['LDA_LSA']:.2%}"},
        {'Comparación': 'NMF vs LSA', 'Similitud': f"{overlap['NMF_LSA']:.2%}"},
    ])

    st.dataframe(overlap_df, use_container_width=True)

    st.markdown("""
    **Interpretación:**
    - **Alta similitud (>50%)**: Los modelos identifican temas similares
    - **Baja similitud (<30%)**: Los modelos capturan aspectos diferentes del corpus
    """)

    # Recomendación
    st.markdown("---")
    st.markdown("**💡 Recomendaciones**")

    st.success("""
    **¿Cuál modelo usar?**

    - **LDA**: Mejor para interpretar probabilidades de temas. El estándar en la academia.
    - **NMF**: Más rápido, bueno para exploración inicial. Resultados más "nítidos".
    - **LSA**: Excelente para similitud de documentos y clustering.

    **💡 Tip**: Usa los tres y compara resultados para validación cruzada.
    """)


def render_persistence_tab(results):
    """Renderiza pestaña de persistencia"""

    st.markdown("### 💾 Persistencia de Resultados")

    st.info("""
    Los resultados están guardados automáticamente en:
    - **Caché local** para carga rápida
    - **Google Drive** para respaldo
    """)

    # Botones de descarga
    col1, col2, col3, col4 = st.columns(4)

    # Preparar CSV de temas LDA
    with col1:
        lda_topics_data = []
        for topic in results['lda']['topics']:
            for word_data in topic['top_words']:
                lda_topics_data.append({
                    'Tema': topic['topic_name'],
                    'Palabra': word_data['word'],
                    'Peso': word_data['weight']
                })
        lda_df = pd.DataFrame(lda_topics_data)
        csv_lda = lda_df.to_csv(index=False)

        st.download_button(
            label="📥 Descargar Temas LDA (CSV)",
            data=csv_lda,
            file_name="lda_topics.csv",
            mime="text/csv",
            use_container_width=True
        )

    # Preparar CSV de temas NMF
    with col2:
        nmf_topics_data = []
        for topic in results['nmf']['topics']:
            for word_data in topic['top_words']:
                nmf_topics_data.append({
                    'Tema': topic['topic_name'],
                    'Palabra': word_data['word'],
                    'Peso': word_data['weight']
                })
        nmf_df = pd.DataFrame(nmf_topics_data)
        csv_nmf = nmf_df.to_csv(index=False)

        st.download_button(
            label="📥 Descargar Temas NMF (CSV)",
            data=csv_nmf,
            file_name="nmf_topics.csv",
            mime="text/csv",
            use_container_width=True
        )

    # Preparar CSV de temas LSA
    with col3:
        lsa_topics_data = []
        for topic in results['lsa']['topics']:
            for word_data in topic['top_words']:
                lsa_topics_data.append({
                    'Tema': topic['topic_name'],
                    'Palabra': word_data['word'],
                    'Peso': word_data['weight']
                })
        lsa_df = pd.DataFrame(lsa_topics_data)
        csv_lsa = lsa_df.to_csv(index=False)

        st.download_button(
            label="📥 Descargar Temas LSA (CSV)",
            data=csv_lsa,
            file_name="lsa_topics.csv",
            mime="text/csv",
            use_container_width=True
        )

    # Preparar CSV de temas pLSA
    with col4:
        plsa_topics_data = []
        for topic in results['plsa']['topics']:
            for word_data in topic['top_words']:
                plsa_topics_data.append({
                    'Tema': topic['topic_name'],
                    'Palabra': word_data['word'],
                    'Peso': word_data['weight']
                })
        plsa_df = pd.DataFrame(plsa_topics_data)
        csv_plsa = plsa_df.to_csv(index=False)

        st.download_button(
            label="📥 Descargar Temas pLSA (CSV)",
            data=csv_plsa,
            file_name="plsa_topics.csv",
            mime="text/csv",
            use_container_width=True
        )

    st.markdown("---")

    st.success("""
    ✅ **Archivos en Google Drive** (carpeta `08_Topic_Modeling/`):
    - `topic_modeling_results.json` - Resultados completos
    - Caché local para carga rápida en próximas sesiones
    """)

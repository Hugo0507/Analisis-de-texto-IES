"""
Modelado de Temas - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
import plotly.express as px
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from components.ui.helpers import show_section_header, show_return_to_dashboard_button, show_chart_interpretation


def render_topic_visualizations(model_name, model_data, color_scheme='Blues'):
    """Renderiza visualizaciones para un modelo de topics"""

    topics = model_data.get('topics', {})
    n_topics = model_data.get('n_topics', 0)

    st.metric("Temas Descubiertos", n_topics)

    st.markdown("---")

    # Crear pestañas por tema
    if topics and len(topics) > 0:
        topic_tabs = st.tabs([f"Tema {i}" for i in range(min(len(topics), 10))])

        for idx, (topic_id, words) in enumerate(list(topics.items())[:10]):
            with topic_tabs[idx]:
                st.markdown(f"#### Tema {topic_id}")

                # Nube de palabras por tema
                st.markdown("##### ☁️ Nube de Palabras del Tema")
                if words and len(words) > 0:
                    # Crear frecuencias artificiales (decrecientes)
                    word_freq = {word: len(words) - i for i, word in enumerate(words[:30])}

                    wordcloud = WordCloud(
                        width=1000,
                        height=400,
                        background_color='white',
                        colormap=color_scheme,
                        relative_scaling=0.5,
                        min_font_size=10
                    ).generate_from_frequencies(word_freq)

                    fig_wc, ax = plt.subplots(figsize=(10, 4))
                    ax.imshow(wordcloud, interpolation='bilinear')
                    ax.axis('off')
                    st.pyplot(fig_wc)

                # Gráfico de barras de top palabras
                st.markdown("##### 📊 Top 15 Palabras del Tema")
                if words and len(words) >= 15:
                    top_words = words[:15]
                    word_importance = [len(words) - i for i in range(15)]

                    df_words = pd.DataFrame({
                        'Palabra': top_words,
                        'Importancia': word_importance
                    })

                    fig_bar = px.bar(
                        df_words,
                        x='Importancia',
                        y='Palabra',
                        orientation='h',
                        title=f'Top 15 Palabras - Tema {topic_id}',
                        color='Importancia',
                        color_continuous_scale=color_scheme
                    )
                    fig_bar.update_layout(yaxis={'categoryorder': 'total ascending'}, height=500)
                    st.plotly_chart(fig_bar, use_container_width=True)

                # Lista de palabras
                st.markdown("##### 🔤 Lista Completa de Palabras")
                st.write(", ".join(words[:30]))


def render():
    """Renderiza el dashboard de Topic Modeling (solo lectura)"""

    show_section_header("Modelado de Temas (LDA, NMF, LSA)", "Descubrimiento automático de temas latentes")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'topic_modeling' not in pipeline_manager.results:
        st.warning("⚠️ El modelado de temas aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    topic_results = pipeline_manager.results.get('topic_modeling', {})

    st.markdown("### 📊 Modelos Entrenados")

    models_trained = [k for k in topic_results.keys() if not k.endswith('_error')]
    col1, col2 = st.columns(2)
    col1.metric("Modelos Exitosos", len(models_trained))
    col2.metric("Total Modelos", len(topic_results))

    st.markdown("---")

    # Tabs para cada modelo
    tabs = st.tabs(["LDA", "NMF", "LSA"])

    with tabs[0]:
        st.markdown("### 🔍 Latent Dirichlet Allocation (LDA)")
        if 'lda' in topic_results:
            lda = topic_results['lda']
            render_topic_visualizations("LDA", lda, color_scheme='Greens')

            show_chart_interpretation(
                chart_type="Topic Modeling - LDA",
                title="Descubrimiento de Temas con LDA",
                interpretation=(
                    "**LDA (Latent Dirichlet Allocation)** es un modelo probabilístico que descubre automáticamente "
                    "**temas latentes** en el corpus. Cada tema es una distribución de palabras, y cada documento es "
                    "una mezcla de temas. Las visualizaciones muestran las palabras más representativas de cada tema."
                ),
                how_to_read=(
                    "- **Nubes de palabras**: Términos más característicos del tema\\n"
                    "- **Gráficos de barras**: Importancia relativa de cada palabra\\n"
                    "- **Múltiples temas**: Cada pestaña representa un tema diferente"
                ),
                what_to_look_for=[
                    "**Coherencia temática**: ¿Las palabras de un tema están relacionadas semánticamente?",
                    "**Diferenciación**: ¿Los temas son distintos entre sí?",
                    "**Interpretabilidad**: ¿Se puede asignar un concepto/etiqueta al tema?"
                ]
            )
        else:
            st.warning("LDA no completado")

    with tabs[1]:
        st.markdown("### 🔍 Non-negative Matrix Factorization (NMF)")
        if 'nmf' in topic_results:
            nmf = topic_results['nmf']
            render_topic_visualizations("NMF", nmf, color_scheme='Blues')

            show_chart_interpretation(
                chart_type="Topic Modeling - NMF",
                title="Descubrimiento de Temas con NMF",
                interpretation=(
                    "**NMF (Non-negative Matrix Factorization)** descompone la matriz de documentos en dos matrices "
                    "no-negativas: una de temas-palabras y otra de documentos-temas. Tiende a producir temas más "
                    "interpretables y específicos que LDA."
                ),
                how_to_read=(
                    "- **Nubes de palabras**: Términos dominantes del tema\\n"
                    "- **Gráficos de barras**: Peso/importancia de cada palabra\\n"
                    "- **Interpretación**: Temas suelen ser más específicos que LDA"
                ),
                what_to_look_for=[
                    "**Especificidad**: ¿Los temas son más focalizados que con LDA?",
                    "**Vocabulario técnico**: ¿Captura terminología especializada?",
                    "**Diferenciación**: ¿Hay solapamiento entre temas?"
                ]
            )
        else:
            st.warning("NMF no completado")

    with tabs[2]:
        st.markdown("### 🔍 Latent Semantic Analysis (LSA)")
        if 'lsa' in topic_results:
            lsa = topic_results['lsa']
            render_topic_visualizations("LSA", lsa, color_scheme='Oranges')

            show_chart_interpretation(
                chart_type="Topic Modeling - LSA",
                title="Análisis Semántico Latente (LSA)",
                interpretation=(
                    "**LSA (Latent Semantic Analysis)** utiliza descomposición SVD para reducir dimensionalidad "
                    "y descubrir **relaciones semánticas latentes** entre términos y documentos. Los componentes "
                    "resultantes capturan conceptos semánticos subyacentes."
                ),
                how_to_read=(
                    "- **Nubes de palabras**: Términos asociados al componente\\n"
                    "- **Gráficos de barras**: Carga/peso de cada término\\n"
                    "- **Componentes**: Representan dimensiones semánticas latentes"
                ),
                what_to_look_for=[
                    "**Conceptos semánticos**: ¿Los componentes capturan significados subyacentes?",
                    "**Relaciones semánticas**: ¿Aparecen sinónimos o términos relacionados juntos?",
                    "**Dimensionalidad**: ¿Los componentes simplifican la representación del corpus?"
                ]
            )
        else:
            st.warning("LSA no completado")

    st.markdown("---")
    st.success("✅ **Modelado de temas completado** - Temas latentes descubiertos y visualizados")

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

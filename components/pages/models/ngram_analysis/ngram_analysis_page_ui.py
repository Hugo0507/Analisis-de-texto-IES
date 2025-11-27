"""
Página de Análisis de N-gramas - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
import plotly.express as px
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from components.ui.helpers import show_section_header, show_return_to_dashboard_button, show_chart_interpretation


def render():
    """Renderiza el dashboard de N-gramas (solo lectura)"""

    show_section_header("Análisis de N-gramas", "Extracción de secuencias frecuentes de palabras")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    # Buscar resultados en pipeline_manager.results o en session_state
    ngram_analysis = None
    if hasattr(pipeline_manager, 'results') and 'ngram_analysis' in pipeline_manager.results:
        ngram_analysis = pipeline_manager.results.get('ngram_analysis', {})
    elif 'ngram_analysis' in st.session_state:
        ngram_analysis = st.session_state.ngram_analysis

    if not ngram_analysis:
        st.warning("⚠️ El análisis de N-gramas aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    ngrams_results = ngram_analysis.get('ngrams', {})

    st.markdown("### 📊 Resumen de N-gramas")

    # Extraer top n-gramas de cada tipo
    unigrams_data = ngrams_results.get('1grams', {}).get('top_ngrams', [])
    bigrams_data = ngrams_results.get('2grams', {}).get('top_ngrams', [])
    trigrams_data = ngrams_results.get('3grams', {}).get('top_ngrams', [])

    col1, col2, col3 = st.columns(3)
    col1.metric("Unigramas Únicos", len(unigrams_data))
    col2.metric("Bigramas Únicos", len(bigrams_data))
    col3.metric("Trigramas Únicos", len(trigrams_data))

    st.markdown("---")

    # Pestañas para cada tipo de n-grama
    tab1, tab2, tab3 = st.tabs(["Unigramas", "Bigramas", "Trigramas"])

    # ==========================
    # TAB 1: UNIGRAMAS
    # ==========================
    with tab1:
        if unigrams_data:
            st.markdown("### ☁️ Nube de Palabras - Unigramas")

            # Preparar datos para WordCloud
            df_uni = pd.DataFrame(unigrams_data[:100])
            if not df_uni.empty and 'ngram' in df_uni.columns and 'frequency' in df_uni.columns:
                freq_dict = dict(zip(df_uni['ngram'], df_uni['frequency']))

                wordcloud = WordCloud(
                    width=1200,
                    height=500,
                    background_color='white',
                    colormap='Blues',
                    relative_scaling=0.5,
                    min_font_size=10
                ).generate_from_frequencies(freq_dict)

                fig_wc, ax = plt.subplots(figsize=(12, 5))
                ax.imshow(wordcloud, interpolation='bilinear')
                ax.axis('off')
                st.pyplot(fig_wc)

                show_chart_interpretation(
                    chart_type="Nube de Palabras (Unigramas)",
                    title="Términos Individuales Más Frecuentes",
                    interpretation=(
                        "Esta nube visualiza los **términos individuales (unigramas)** más frecuentes en el corpus. "
                        "El tamaño es proporcional a la frecuencia. Unigramas ayudan a identificar conceptos principales "
                        "y vocabulario clave del análisis."
                    ),
                    how_to_read=(
                        "- **Tamaño**: Proporcional a la frecuencia del unigrama\\n"
                        "- **Color**: Diferencia visual (sin significado específico)"
                    ),
                    what_to_look_for=[
                        "**Conceptos centrales**: ¿Qué términos dominan el discurso?",
                        "**Vocabulario técnico**: Términos específicos del dominio"
                    ]
                )

            st.markdown("---")
            st.markdown("### 📊 Top 20 Unigramas por Frecuencia")

            # Gráfico de barras
            df_uni_top = pd.DataFrame(unigrams_data[:20])
            if not df_uni_top.empty and 'ngram' in df_uni_top.columns and 'frequency' in df_uni_top.columns:
                fig_bar = px.bar(
                    df_uni_top,
                    x='frequency',
                    y='ngram',
                    orientation='h',
                    title='Top 20 Unigramas',
                    labels={'ngram': 'Término', 'frequency': 'Frecuencia'},
                    color='frequency',
                    color_continuous_scale='Blues'
                )
                fig_bar.update_layout(yaxis={'categoryorder': 'total ascending'}, height=600)
                st.plotly_chart(fig_bar, use_container_width=True)

            st.markdown("### 🔤 Tabla Detallada de Unigramas")
            df_table = pd.DataFrame(unigrams_data[:30])
            if not df_table.empty and 'ngram' in df_table.columns and 'frequency' in df_table.columns:
                df_table = df_table[['ngram', 'frequency']]
                df_table.columns = ['Término', 'Frecuencia']
                df_table.insert(0, 'Ranking', range(1, len(df_table) + 1))
                st.dataframe(df_table, use_container_width=True, height=400)
        else:
            st.info("No hay unigramas disponibles")

    # ==========================
    # TAB 2: BIGRAMAS
    # ==========================
    with tab2:
        if bigrams_data:
            st.markdown("### ☁️ Nube de Palabras - Bigramas")

            # Preparar datos para WordCloud
            df_bi = pd.DataFrame(bigrams_data[:100])
            if not df_bi.empty and 'ngram' in df_bi.columns and 'frequency' in df_bi.columns:
                freq_dict = dict(zip(df_bi['ngram'], df_bi['frequency']))

                wordcloud = WordCloud(
                    width=1200,
                    height=500,
                    background_color='white',
                    colormap='Greens',
                    relative_scaling=0.5,
                    min_font_size=10
                ).generate_from_frequencies(freq_dict)

                fig_wc, ax = plt.subplots(figsize=(12, 5))
                ax.imshow(wordcloud, interpolation='bilinear')
                ax.axis('off')
                st.pyplot(fig_wc)

                show_chart_interpretation(
                    chart_type="Nube de Palabras (Bigramas)",
                    title="Secuencias de Dos Palabras Más Frecuentes",
                    interpretation=(
                        "Esta nube muestra **secuencias de dos palabras consecutivas (bigramas)** más frecuentes. "
                        "Los bigramas capturan relaciones entre términos y frases comunes que un análisis de palabras "
                        "individuales podría perder. Ayudan a identificar conceptos compuestos y colocaciones."
                    ),
                    how_to_read=(
                        "- **Tamaño**: Proporcional a la frecuencia del bigrama\\n"
                        "- **Frases**: Cada elemento es una secuencia de dos palabras"
                    ),
                    what_to_look_for=[
                        "**Conceptos compuestos**: Términos técnicos de dos palabras",
                        "**Colocaciones frecuentes**: Combinaciones que aparecen juntas",
                        "**Contexto temático**: ¿Qué relaciones revelan los bigramas?"
                    ]
                )

            st.markdown("---")
            st.markdown("### 📊 Top 20 Bigramas por Frecuencia")

            # Gráfico de barras
            df_bi_top = pd.DataFrame(bigrams_data[:20])
            if not df_bi_top.empty and 'ngram' in df_bi_top.columns and 'frequency' in df_bi_top.columns:
                fig_bar = px.bar(
                    df_bi_top,
                    x='frequency',
                    y='ngram',
                    orientation='h',
                    title='Top 20 Bigramas',
                    labels={'ngram': 'Bigrama', 'frequency': 'Frecuencia'},
                    color='frequency',
                    color_continuous_scale='Greens'
                )
                fig_bar.update_layout(yaxis={'categoryorder': 'total ascending'}, height=600)
                st.plotly_chart(fig_bar, use_container_width=True)

            st.markdown("### 🔤 Tabla Detallada de Bigramas")
            df_table = pd.DataFrame(bigrams_data[:30])
            if not df_table.empty and 'ngram' in df_table.columns and 'frequency' in df_table.columns:
                df_table = df_table[['ngram', 'frequency']]
                df_table.columns = ['Bigrama', 'Frecuencia']
                df_table.insert(0, 'Ranking', range(1, len(df_table) + 1))
                st.dataframe(df_table, use_container_width=True, height=400)
        else:
            st.info("No hay bigramas disponibles")

    # ==========================
    # TAB 3: TRIGRAMAS
    # ==========================
    with tab3:
        if trigrams_data:
            st.markdown("### ☁️ Nube de Palabras - Trigramas")

            # Preparar datos para WordCloud
            df_tri = pd.DataFrame(trigrams_data[:100])
            if not df_tri.empty and 'ngram' in df_tri.columns and 'frequency' in df_tri.columns:
                freq_dict = dict(zip(df_tri['ngram'], df_tri['frequency']))

                wordcloud = WordCloud(
                    width=1200,
                    height=500,
                    background_color='white',
                    colormap='Oranges',
                    relative_scaling=0.5,
                    min_font_size=10
                ).generate_from_frequencies(freq_dict)

                fig_wc, ax = plt.subplots(figsize=(12, 5))
                ax.imshow(wordcloud, interpolation='bilinear')
                ax.axis('off')
                st.pyplot(fig_wc)

                show_chart_interpretation(
                    chart_type="Nube de Palabras (Trigramas)",
                    title="Secuencias de Tres Palabras Más Frecuentes",
                    interpretation=(
                        "Esta nube muestra **secuencias de tres palabras consecutivas (trigramas)** más frecuentes. "
                        "Los trigramas capturan frases más largas y expresiones técnicas complejas. "
                        "Son especialmente útiles para identificar terminología específica del dominio y frases características."
                    ),
                    how_to_read=(
                        "- **Tamaño**: Proporcional a la frecuencia del trigrama\\n"
                        "- **Frases**: Cada elemento es una secuencia de tres palabras"
                    ),
                    what_to_look_for=[
                        "**Frases técnicas**: Terminología especializada de tres palabras",
                        "**Expresiones características**: Frases distintivas del corpus",
                        "**Contexto rico**: ¿Qué información adicional aportan vs bigramas?"
                    ]
                )

            st.markdown("---")
            st.markdown("### 📊 Top 20 Trigramas por Frecuencia")

            # Gráfico de barras
            df_tri_top = pd.DataFrame(trigrams_data[:20])
            if not df_tri_top.empty and 'ngram' in df_tri_top.columns and 'frequency' in df_tri_top.columns:
                fig_bar = px.bar(
                    df_tri_top,
                    x='frequency',
                    y='ngram',
                    orientation='h',
                    title='Top 20 Trigramas',
                    labels={'ngram': 'Trigrama', 'frequency': 'Frecuencia'},
                    color='frequency',
                    color_continuous_scale='Oranges'
                )
                fig_bar.update_layout(yaxis={'categoryorder': 'total ascending'}, height=600)
                st.plotly_chart(fig_bar, use_container_width=True)

            st.markdown("### 🔤 Tabla Detallada de Trigramas")
            df_table = pd.DataFrame(trigrams_data[:30])
            if not df_table.empty and 'ngram' in df_table.columns and 'frequency' in df_table.columns:
                df_table = df_table[['ngram', 'frequency']]
                df_table.columns = ['Trigrama', 'Frecuencia']
                df_table.insert(0, 'Ranking', range(1, len(df_table) + 1))
                st.dataframe(df_table, use_container_width=True, height=400)
        else:
            st.info("No hay trigramas disponibles")

    st.markdown("---")
    st.success("✅ **Análisis de N-gramas completado**")

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

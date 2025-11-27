"""
Página de Análisis de N-gramas - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
from components.ui.helpers import show_section_header, show_return_to_dashboard_button


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
    col1.metric("Unigramas", len(unigrams_data))
    col2.metric("Bigramas", len(bigrams_data))
    col3.metric("Trigramas", len(trigrams_data))

    st.markdown("---")

    # Mostrar top n-gramas
    tab1, tab2, tab3 = st.tabs(["Unigramas", "Bigramas", "Trigramas"])

    with tab1:
        if unigrams_data:
            # La estructura es una lista de diccionarios con 'ngram' y 'frequency'
            df = pd.DataFrame(unigrams_data[:20])
            if not df.empty and 'ngram' in df.columns and 'frequency' in df.columns:
                df = df[['ngram', 'frequency']]
                df.columns = ['Término', 'Frecuencia']
                st.dataframe(df, use_container_width=True, height=400)
        else:
            st.info("No hay unigramas disponibles")

    with tab2:
        if bigrams_data:
            df = pd.DataFrame(bigrams_data[:20])
            if not df.empty and 'ngram' in df.columns and 'frequency' in df.columns:
                df = df[['ngram', 'frequency']]
                df.columns = ['Bigrama', 'Frecuencia']
                st.dataframe(df, use_container_width=True, height=400)
        else:
            st.info("No hay bigramas disponibles")

    with tab3:
        if trigrams_data:
            df = pd.DataFrame(trigrams_data[:20])
            if not df.empty and 'ngram' in df.columns and 'frequency' in df.columns:
                df = df[['ngram', 'frequency']]
                df.columns = ['Trigrama', 'Frecuencia']
                st.dataframe(df, use_container_width=True, height=400)
        else:
            st.info("No hay trigramas disponibles")

    st.markdown("---")
    st.success("✅ **Análisis de N-gramas completado**")

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

"""
BERTopic - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
from components.ui.helpers import show_section_header


def render():
    """Renderiza el dashboard de BERTopic (solo lectura)"""

    show_section_header("BERTopic", "Topic Modeling con embeddings BERT")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'bertopic' not in pipeline_manager.results:
        st.warning("⚠️ BERTopic aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    bertopic_results = pipeline_manager.results.get('bertopic', {})

    st.markdown("### 📊 Resumen BERTopic")

    n_topics = bertopic_results.get('n_topics', 0)
    n_docs = bertopic_results.get('n_documents', 0)

    col1, col2 = st.columns(2)
    col1.metric("Temas Descubiertos", n_topics)
    col2.metric("Documentos", n_docs)

    st.markdown("---")
    st.markdown("### 🎯 Temas Identificados")

    topics = bertopic_results.get('topics', {})
    if topics:
        for topic_id, words in list(topics.items())[:10]:
            with st.expander(f"Tema {topic_id}"):
                st.write(", ".join(words[:15]) if isinstance(words, list) else words)

    st.markdown("---")
    st.success("✅ **BERTopic completado**")

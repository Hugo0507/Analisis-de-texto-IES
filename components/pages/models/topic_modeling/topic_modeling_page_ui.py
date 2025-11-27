"""
Modelado de Temas - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
from components.ui.helpers import show_section_header, show_return_to_dashboard_button


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
        if 'lda' in topic_results:
            lda = topic_results['lda']
            st.metric("Temas", lda.get('n_topics', 0))
            st.markdown("**Top Palabras por Tema**")
            topics = lda.get('topics', {})
            for topic_id, words in list(topics.items())[:5]:
                st.write(f"**Tema {topic_id}:** {', '.join(words[:10])}")
        else:
            st.warning("LDA no completado")

    with tabs[1]:
        if 'nmf' in topic_results:
            nmf = topic_results['nmf']
            st.metric("Temas", nmf.get('n_topics', 0))
        else:
            st.warning("NMF no completado")

    with tabs[2]:
        if 'lsa' in topic_results:
            lsa = topic_results['lsa']
            st.metric("Componentes", lsa.get('n_components', 0))
        else:
            st.warning("LSA no completado")

    st.markdown("---")
    st.success("✅ **Modelado de temas completado**")

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

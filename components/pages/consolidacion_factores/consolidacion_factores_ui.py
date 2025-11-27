"""
Consolidación de Factores - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
from components.ui.helpers import show_section_header


def render():
    """Renderiza el dashboard de Consolidación (solo lectura)"""

    show_section_header("Consolidación de Factores", "Síntesis de todos los análisis realizados")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'consolidation' not in pipeline_manager.results:
        st.warning("⚠️ La consolidación aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    consolidation = pipeline_manager.results.get('consolidation', {})

    st.markdown("### 📊 Resumen del Pipeline Completo")

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Etapas Completadas", consolidation.get('stages_completed', 0))
    col2.metric("Documentos", consolidation.get('n_documents', 0))
    col3.metric("Vocabulario", f"{consolidation.get('vocabulary_size', 0):,}")
    col4.metric("Entidades NER", f"{consolidation.get('total_entities', 0):,}")

    st.markdown("---")
    st.markdown("### 📈 Información del Procesamiento")

    info_df = pd.DataFrame([
        {"Métrica": "Duración Total", "Valor": consolidation.get('total_duration', 'N/A')},
        {"Métrica": "Inicio", "Valor": consolidation.get('pipeline_start', 'N/A')},
        {"Métrica": "Modelos de Temas", "Valor": ", ".join(consolidation.get('topic_models', []))},
    ])

    st.dataframe(info_df, use_container_width=True, hide_index=True)

    st.markdown("---")
    st.success("✅ **Pipeline completado exitosamente** - Todos los análisis consolidados")

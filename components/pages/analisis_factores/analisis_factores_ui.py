"""
Análisis de Factores - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
from components.ui.helpers import show_section_header


def render():
    """Renderiza el dashboard de Análisis de Factores (solo lectura)"""

    show_section_header("Análisis de Factores", "Identificación de factores clave de transformación digital")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'factor_analysis' not in pipeline_manager.results:
        st.warning("⚠️ El análisis de factores aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    factor_results = pipeline_manager.results.get('factor_analysis', {})
    top_factors = factor_results.get('top_factors', [])

    st.markdown("### 📊 Factores Identificados")

    col1, col2 = st.columns(2)
    col1.metric("Total Factores", len(top_factors))
    col2.metric("Documentos Analizados", factor_results.get('n_documents', 0))

    st.markdown("---")
    st.markdown("### 🔝 Top Factores de Transformación Digital")

    if top_factors:
        factor_df = pd.DataFrame(top_factors)
        st.dataframe(factor_df, use_container_width=True, height=400)
    else:
        st.info("No hay factores disponibles")

    st.markdown("---")
    st.success("✅ **Análisis de factores completado**")

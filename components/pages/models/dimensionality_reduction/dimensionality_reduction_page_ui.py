"""
Reducción de Dimensionalidad - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
from components.ui.helpers import show_section_header


def render():
    """Renderiza el dashboard de Reducción de Dimensionalidad (solo lectura)"""

    show_section_header("Reducción de Dimensionalidad", "Visualización de datos en espacios de menor dimensión (PCA, t-SNE, UMAP)")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'dimensionality_reduction' not in pipeline_manager.results:
        st.warning("⚠️ La reducción de dimensionalidad aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    dimred_results = pipeline_manager.results.get('dimensionality_reduction', {})

    st.markdown("### 📊 Métodos Aplicados")

    methods = [k for k in dimred_results.keys() if not k.endswith('_error')]
    col1, col2 = st.columns(2)
    col1.metric("Métodos Aplicados", len(methods))
    col2.metric("Dimensión Original", dimred_results.get('original_dimensions', 'N/A'))

    st.markdown("---")

    # Tabs para cada método
    tabs = st.tabs(["PCA", "t-SNE", "UMAP"])

    with tabs[0]:
        if 'pca' in dimred_results:
            pca = dimred_results['pca']
            st.metric("Componentes", pca.get('n_components', 0))
            st.metric("Varianza Explicada", f"{pca.get('explained_variance_ratio', 0):.2%}")
        else:
            st.warning("PCA no completado")

    with tabs[1]:
        if 'tsne' in dimred_results:
            tsne = dimred_results['tsne']
            st.metric("Componentes", tsne.get('n_components', 0))
        else:
            st.warning("t-SNE no completado")

    with tabs[2]:
        if 'umap' in dimred_results:
            umap = dimred_results['umap']
            st.metric("Componentes", umap.get('n_components', 0))
        else:
            st.info("UMAP no disponible")

    st.markdown("---")
    st.success("✅ **Reducción de dimensionalidad completada**")

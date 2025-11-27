"""
Página de Bolsa de Palabras - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
from components.ui.helpers import show_section_header


def render():
    """Renderiza el dashboard de Bolsa de Palabras (solo lectura)"""

    show_section_header("Bolsa de Palabras (BoW)", "Representación vectorial basada en frecuencia de términos")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'bow_matrix' not in pipeline_manager.results:
        st.warning("⚠️ El análisis BoW aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    # Obtener resultados
    bow_features = pipeline_manager.results.get('bow_feature_names', [])
    bow_stats = pipeline_manager.results.get('bow_stats', {})

    st.markdown("### 📊 Resumen de Bolsa de Palabras")

    vocab_size = len(bow_features)
    total_docs = bow_stats.get('n_documents', 0)
    sparsity = bow_stats.get('sparsity', 0)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Vocabulario", f"{vocab_size:,}")
    col2.metric("Documentos", total_docs)
    col3.metric("Esparsidad", f"{sparsity:.2%}")
    col4.metric("Términos/Doc", f"{vocab_size/total_docs if total_docs > 0 else 0:.0f}")

    st.markdown("---")
    st.markdown("### 🔤 Top Términos por Frecuencia")

    # Mostrar top términos si están disponibles
    if bow_features:
        top_n = min(20, len(bow_features))
        st.dataframe(
            pd.DataFrame({'Término': bow_features[:top_n], 'Ranking': range(1, top_n+1)}),
            use_container_width=True,
            height=400
        )

    st.markdown("---")
    st.info("""
    **Configuración Aplicada:**
    - N-gramas: (1, 2) - unigramas y bigramas
    - Mín. frecuencia documento: 2
    - Máx. frecuencia documento: 85%
    - Máx. características: 5000

    💡 Modificar en `src/pipeline_config.py` → `BOW`
    """)

    st.success("✅ **BoW completado** - Matriz de características lista para modelado")

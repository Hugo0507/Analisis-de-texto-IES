"""
Página de Análisis TF-IDF - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
from components.ui.helpers import show_section_header


def render():
    """Renderiza el dashboard de TF-IDF (solo lectura)"""

    show_section_header("Análisis TF-IDF", "Representación vectorial ponderada por importancia de términos")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'tfidf_matrix' not in pipeline_manager.results:
        st.warning("⚠️ El análisis TF-IDF aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    tfidf_features = pipeline_manager.results.get('tfidf_feature_names', [])
    tfidf_stats = pipeline_manager.results.get('tfidf_stats', {})

    st.markdown("### 📊 Resumen de TF-IDF")

    vocab_size = len(tfidf_features)
    total_docs = tfidf_stats.get('n_documents', 0)
    sparsity = tfidf_stats.get('sparsity', 0)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Vocabulario", f"{vocab_size:,}")
    col2.metric("Documentos", total_docs)
    col3.metric("Esparsidad", f"{sparsity:.2%}")
    col4.metric("Densidad", f"{(1-sparsity):.2%}")

    st.markdown("---")
    st.markdown("### 🔤 Top Términos TF-IDF")

    if tfidf_features:
        top_n = min(20, len(tfidf_features))
        st.dataframe(
            pd.DataFrame({'Término': tfidf_features[:top_n], 'Ranking': range(1, top_n+1)}),
            use_container_width=True, height=400
        )

    st.markdown("---")
    st.info("""
    **Configuración Aplicada:**
    - N-gramas: (1, 2)
    - Normalización: L2
    - IDF suavizado: Sí
    - TF sub-lineal: No

    💡 Modificar en `src/pipeline_config.py` → `TFIDF`
    """)

    st.success("✅ **TF-IDF completado** - Ponderación de términos lista")

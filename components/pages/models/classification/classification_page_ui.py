"""
Clasificación de Textos - Dashboard de Solo Lectura
"""

import streamlit as st
from components.ui.helpers import show_section_header


def render():
    """Renderiza el dashboard de Clasificación (solo lectura)"""

    show_section_header("Clasificación de Textos", "Clasificación supervisada de documentos")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    # La clasificación requiere etiquetas manuales, que pueden no estar disponibles
    if not hasattr(pipeline_manager, 'results') or 'classification' not in pipeline_manager.results:
        st.info("""
        ℹ️ **Clasificación Supervisada Opcional**

        La clasificación de textos requiere **etiquetas manuales** de entrenamiento.
        Esta etapa es opcional y se ejecuta solo si se proporcionan etiquetas.

        **Requisitos:**
        - Conjunto de documentos etiquetados manualmente
        - Al menos 2 clases diferentes
        - Mínimo 10 documentos por clase

        **Estado Actual:** No configurado
        """)
        return

    classification_results = pipeline_manager.results.get('classification', {})

    st.markdown("### 📊 Resultados de Clasificación")

    accuracy = classification_results.get('accuracy', 0)
    n_classes = classification_results.get('n_classes', 0)

    col1, col2 = st.columns(2)
    col1.metric("Precisión", f"{accuracy:.2%}")
    col2.metric("Clases", n_classes)

    st.markdown("---")
    st.success("✅ **Clasificación completada**")

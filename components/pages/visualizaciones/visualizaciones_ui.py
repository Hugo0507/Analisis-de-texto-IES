"""
Visualizaciones - Dashboard de Solo Lectura
"""

import streamlit as st
from components.ui.helpers import show_section_header, show_return_to_dashboard_button


def render():
    """Renderiza el dashboard de Visualizaciones (solo lectura)"""

    show_section_header("Visualizaciones", "Gráficos interactivos generados automáticamente")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'visualizations' not in pipeline_manager.results:
        st.warning("⚠️ Las visualizaciones aún no se han completado. Verifica el **Dashboard Principal**.")
        return

    viz_results = pipeline_manager.results.get('visualizations', {})
    available_viz = viz_results.get('available_visualizations', [])

    st.markdown("### 📊 Visualizaciones Disponibles")

    st.info(f"""
    **{len(available_viz)} tipos de visualizaciones preparadas:**

    {chr(10).join([f'- {viz}' for viz in available_viz])}

    Las visualizaciones se generan dinámicamente en cada página de análisis.
    Visita las páginas individuales para ver gráficos específicos:
    - **Detección de Idiomas**: Distribución de idiomas
    - **BoW/TF-IDF**: Frecuencias de términos
    - **Topic Modeling**: Distribución de temas
    - **NER**: Red de entidades
    - **Dimensionality Reduction**: Scatter plots 2D/3D
    """)

    st.markdown("---")
    st.success("✅ **Visualizaciones preparadas** - Disponibles en cada dashboard")

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

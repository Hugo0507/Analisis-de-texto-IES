"""
Módulo de UI - Visualizaciones
Componentes visuales con Streamlit
"""

import streamlit as st
from components.ui.helpers import show_section_header


def render():
    """Renderiza la página de visualizaciones"""

    show_section_header("Visualizaciones", "Gráficos interactivos de resultados")
    st.info("🚧 Sección en desarrollo")

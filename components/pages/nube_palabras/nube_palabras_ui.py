import streamlit as st
from components.ui.helpers import show_section_header, show_return_to_dashboard_button


def render():
    show_section_header("Nube de Palabras", "Visualización de términos frecuentes")
    st.info("Falta hacer esto, pero puede ser dentro de cada uno o algo asi")

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

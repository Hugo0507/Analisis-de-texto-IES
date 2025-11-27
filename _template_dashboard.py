"""
Template Genérico para Dashboards de Solo Lectura
Usar este template para crear rápidamente las páginas restantes
"""

import streamlit as st
import pandas as pd
from components.ui.helpers import show_section_header


def create_generic_dashboard(
    title: str,
    description: str,
    result_key: str,
    result_display_name: str = "resultados"
):
    """
    Genera un dashboard genérico de solo lectura

    Args:
        title: Título de la página
        description: Descripción de la página
        result_key: Clave en pipeline_manager.results para obtener datos
        result_display_name: Nombre para mostrar en mensajes
    """
    show_section_header(title, description)

    # Verificar pipeline
    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    # Verificar resultados
    if not hasattr(pipeline_manager, 'results') or result_key not in pipeline_manager.results:
        st.warning(f"⚠️ Los {result_display_name} aún no se han completado. Verifica el **Dashboard Principal**.")
        return

    # Obtener resultados
    results = pipeline_manager.results.get(result_key)

    if not results:
        st.warning(f"⚠️ No hay {result_display_name} disponibles.")
        return

    # Mostrar resultados genéricamente
    st.markdown(f"### 📊 {result_display_name.capitalize()} Disponibles")

    # Si es diccionario, mostrar como tabla
    if isinstance(results, dict):
        st.json(results)
    # Si es lista, mostrar como tabla
    elif isinstance(results, list):
        df = pd.DataFrame(results)
        st.dataframe(df, use_container_width=True, height=400)
    else:
        st.write(results)

    st.success(f"✅ **{title} completado** - Resultados disponibles")


# Ejemplos de uso para cada página:

# TF-IDF
def render_tfidf():
    create_generic_dashboard(
        "Análisis TF-IDF",
        "Representación vectorial ponderada por importancia",
        "tfidf_matrix",
        "análisis TF-IDF"
    )

# N-gramas
def render_ngrams():
    create_generic_dashboard(
        "Análisis de N-gramas",
        "Extracción de secuencias de palabras frecuentes",
        "ngrams",
        "n-gramas"
    )

# Y así sucesivamente...

"""
Módulo de UI - Página de Inicio
Componentes visuales con Streamlit
"""

import streamlit as st
from components.ui.helpers import show_section_header
from . import inicio as logic


def render():
    """Renderiza la página de inicio"""

    show_section_header(
        "Análisis de Transformación Digital en IES",
        "Sistema de análisis automático de texto con procesamiento de lenguaje natural"
    )

    col1, col2 = st.columns([1, 1])

    with col1:
        st.subheader("Metodología")
        st.markdown("""
        Este sistema implementa un **flujo secuencial con persistencia** para analizar
        documentos de transformación digital:

        1. **Conexión** a Google Drive
        2. **Filtrado** de archivos PDF
        3. **Detección** de idioma (foco en inglés)
        4. **Conversión** a formato TXT
        5. **Preprocesamiento** y limpieza
        6. **Análisis** con técnicas de NLP
        7. **Identificación** de factores clave
        8. **Visualización** de resultados

        Cada etapa guarda sus resultados en carpetas secuenciales,
        permitiendo reanudar el análisis desde cualquier punto.
        """)

    with col2:
        st.subheader("Factores Analizados")

        for factor, desc in logic.FACTORES_TRANSFORMACION_DIGITAL.items():
            st.markdown(f"**{factor}** · {desc}")

    st.markdown("---")

    if not st.session_state.authenticated:
        st.info("👉 Comienza conectándote a Google Drive en la sección **'1. Conexión Google Drive'**")
    else:
        st.success("✓ Sistema listo para el análisis")

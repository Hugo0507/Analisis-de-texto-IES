"""
Componentes de layout de la aplicación
Incluye sidebar, navegación, etc.
"""

import streamlit as st


def render_sidebar():
    """
    Renderiza el sidebar con navegación

    Returns:
        str: Página seleccionada por el usuario
    """
    with st.sidebar:
        st.title("🎓 Análisis TD")

        # Indicador de conexión simple
        if st.session_state.authenticated:
            st.success("✓ Conectado")
        else:
            st.info("○ No conectado")

        st.markdown("---")

        # Menú de navegación simple
        pagina = st.radio(
            "Navegación",
            [
                "Inicio",
                "1. Conexión Google Drive",
                "2. Estadísticas de Archivos",
                "3. Detección de Idiomas",
                "4. Conversión a TXT",
                "5. Preprocesamiento",
                "6. Bolsa de Palabras",
                "7. Análisis TF-IDF",
                "8. Análisis de Factores",
                "9. Visualizaciones",
                "10. Nube de Palabras",
                "---",
                "🤖 Modelos Avanzados",
                "🤖 Análisis NER",
                "🤖 Modelado de Temas",
                "🤖 Análisis de N-gramas",
                "🤖 BERTopic",
                "🤖 Clasificación de Textos",
                "🤖 Reducción de Dimensionalidad"
            ],
            label_visibility="collapsed"
        )

    return pagina

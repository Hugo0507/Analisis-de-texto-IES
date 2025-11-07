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

        # Menú de navegación organizado por fases
        pagina = st.radio(
            "Navegación",
            [
                "Inicio",
                "📁 FASE 1: PREPARACIÓN",
                "1. Conexión Google Drive",
                "2. Detección de Idiomas",
                "3. Conversión a TXT",
                "4. Preprocesamiento",
                "📁 FASE 2: REPRESENTACIÓN VECTORIAL",
                "5. Bolsa de Palabras",
                "6. Análisis TF-IDF",
                "7. Análisis de N-gramas",
                "📁 FASE 3: ANÁLISIS LINGÜÍSTICO",
                "8. Named Entity Recognition",
                "📁 FASE 4: MODELADO DE TEMAS",
                "9. Modelado de Temas",
                "10. BERTopic",
                "📁 FASE 5: DIMENSIONALIDAD Y CLASIFICACIÓN",
                "11. Reducción de Dimensionalidad",
                "12. Clasificación de Textos",
                "📁 FASE 6: ANÁLISIS INTEGRADO",
                "13. Análisis de Factores",
                "📁 FASE 7: VISUALIZACIÓN",
                "14. Visualizaciones y Nubes de Palabras"
            ],
            label_visibility="collapsed"
        )

    return pagina

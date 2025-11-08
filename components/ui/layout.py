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
                "2. Estadísticas de Archivos",
                "3. Detección de Idiomas",
                "4. Conversión a TXT",
                "5. Preprocesamiento",
                "📁 FASE 2: REPRESENTACIÓN VECTORIAL",
                "6. Bolsa de Palabras",
                "7. Análisis TF-IDF",
                "8. Análisis de N-gramas",
                "📁 FASE 3: ANÁLISIS LINGÜÍSTICO",
                "9. Named Entity Recognition",
                "📁 FASE 4: MODELADO DE TEMAS",
                "10. Modelado de Temas",
                "11. BERTopic",
                "📁 FASE 5: DIMENSIONALIDAD Y CLASIFICACIÓN",
                "12. Reducción de Dimensionalidad",
                "13. Clasificación de Textos",
                "📁 FASE 6: ANÁLISIS INTEGRADO",
                "14. Análisis de Factores",
                "15. Consolidación de Factores",
                "📁 FASE 7: VISUALIZACIÓN",
                "16. Visualizaciones y Nubes de Palabras",
                "📁 FASE 8: EVALUACIÓN",
                "17. Evaluación de Desempeño"
            ],
            label_visibility="collapsed"
        )

    return pagina

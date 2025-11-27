"""
Página de Preprocesamiento - Dashboard de Solo Lectura
Muestra resultados procesados automáticamente por el pipeline
"""

import streamlit as st
import pandas as pd
from components.ui.helpers import show_section_header


def render():
    """Renderiza el dashboard de preprocesamiento (solo lectura)"""

    show_section_header(
        "Preprocesamiento de Texto",
        "Resultados del preprocesamiento automático (limpieza, tokenización, normalización)"
    )

    # Verificar pipeline
    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    # Verificar resultados
    if not hasattr(pipeline_manager, 'results') or 'preprocessed_texts' not in pipeline_manager.results:
        st.warning("⚠️ El preprocesamiento aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    # Obtener resultados
    preprocessed_texts = pipeline_manager.results.get('preprocessed_texts', {})
    preprocessing_stats = pipeline_manager.results.get('preprocessing_stats', {})

    if not preprocessed_texts:
        st.warning("⚠️ No hay textos preprocesados disponibles.")
        return

    # Métricas
    st.markdown("### 📊 Resumen de Preprocesamiento")

    total_docs = len(preprocessed_texts)
    total_tokens = preprocessing_stats.get('total_tokens', 0)
    avg_tokens = total_tokens / total_docs if total_docs > 0 else 0
    vocab_size = preprocessing_stats.get('vocabulary_size', 0)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Documentos", total_docs)
    col2.metric("Tokens Totales", f"{total_tokens:,}")
    col3.metric("Promedio/Doc", f"{avg_tokens:.0f}")
    col4.metric("Vocabulario", f"{vocab_size:,}")

    st.markdown("---")

    # Tabla de documentos
    st.markdown("### 📋 Documentos Preprocesados")

    doc_data = []
    for doc_name, doc_text in preprocessed_texts.items():
        tokens = len(doc_text.split()) if isinstance(doc_text, str) else 0
        doc_data.append({
            'Documento': doc_name,
            'Tokens': tokens,
            'Preview': doc_text[:100] + '...' if len(doc_text) > 100 else doc_text
        })

    doc_df = pd.DataFrame(doc_data)

    # Filtro
    buscar = st.text_input("🔍 Buscar documento", "")
    if buscar:
        doc_df = doc_df[doc_df['Documento'].str.contains(buscar, case=False, na=False)]

    st.dataframe(doc_df, use_container_width=True, height=400)
    st.caption(f"Mostrando {len(doc_df)} documentos")

    st.markdown("---")
    st.info("""
    **Configuración Aplicada:**
    - Limpieza: Stopwords removidas, puntuación eliminada
    - Normalización: Lematización aplicada
    - Idioma: Inglés (seleccionado automáticamente)
    - Tokenización: Palabras individuales

    💡 Las configuraciones se pueden modificar en `src/pipeline_config.py`
    """)

    st.success("✅ **Preprocesamiento completado** - Textos listos para análisis vectorial")

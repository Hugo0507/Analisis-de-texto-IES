"""
Página de Análisis NER - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
from components.ui.helpers import show_section_header


def render():
    """Renderiza el dashboard de NER (solo lectura)"""

    show_section_header("Named Entity Recognition (NER)", "Identificación de entidades nombradas en el corpus")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'ner_corpus_analysis' not in pipeline_manager.results:
        st.warning("⚠️ El análisis NER aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    ner_results = pipeline_manager.results.get('ner_corpus_analysis', {})
    corpus_stats = ner_results.get('corpus_stats', {})

    st.markdown("### 📊 Resumen de Entidades")

    total_entities = corpus_stats.get('total_entities', 0)
    entities_by_type = corpus_stats.get('entities_by_type', {})

    col1, col2 = st.columns(2)
    col1.metric("Total Entidades", f"{total_entities:,}")
    col2.metric("Tipos de Entidades", len(entities_by_type))

    st.markdown("---")
    st.markdown("### 🏷️ Entidades por Tipo")

    if entities_by_type:
        entity_df = pd.DataFrame([
            {'Tipo': k, 'Cantidad': v} for k, v in entities_by_type.items()
        ]).sort_values('Cantidad', ascending=False)

        st.dataframe(entity_df, use_container_width=True, height=300)

        # Top entidades por tipo
        st.markdown("### 🔝 Top Entidades Detectadas")

        top_entities = ner_results.get('top_entities_by_type', {})
        for entity_type, entities in list(top_entities.items())[:3]:  # Mostrar top 3 tipos
            with st.expander(f"📌 {entity_type}"):
                if entities:
                    ent_df = pd.DataFrame(entities[:10], columns=['Entidad', 'Frecuencia'])
                    st.dataframe(ent_df, use_container_width=True)

    st.markdown("---")
    st.success("✅ **Análisis NER completado** - Entidades identificadas")

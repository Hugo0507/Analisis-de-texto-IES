"""
Página de Análisis NER - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
from components.ui.helpers import show_section_header, show_return_to_dashboard_button


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

        # Gráfico de torta: Distribución de tipos de entidades
        import plotly.graph_objects as go

        fig_pie = go.Figure(data=[go.Pie(
            labels=entity_df['Tipo'],
            values=entity_df['Cantidad'],
            hole=0.3,
            textinfo='label+percent',
            hovertemplate='<b>%{label}</b><br>Cantidad: %{value}<br>Porcentaje: %{percent}<extra></extra>'
        )])

        fig_pie.update_layout(
            title='Distribución de Tipos de Entidades',
            height=500,
            showlegend=True,
            legend=dict(orientation="v", yanchor="middle", y=0.5, xanchor="left", x=1.05)
        )

        st.plotly_chart(fig_pie, use_container_width=True)

        # Tabla de entidades por tipo
        st.dataframe(entity_df, use_container_width=True, height=200)

        # Top entidades por tipo
        st.markdown("### 🔝 Top Entidades Detectadas")

        top_entities = ner_results.get('top_entities_by_type', {})

        # Gráfica de Top Entidades GPE (Lugares/Países)
        if 'GPE' in top_entities and top_entities['GPE']:
            st.markdown("#### 🌍 Top 20 Entidades GPE (Lugares/Países)")
            gpe_df = pd.DataFrame(top_entities['GPE'][:20], columns=['Entidad', 'Frecuencia'])

            import plotly.express as px
            fig_gpe = px.bar(
                gpe_df,
                x='Frecuencia',
                y='Entidad',
                orientation='h',
                title='Top 20 Entidades GPE Más Frecuentes',
                color='Frecuencia',
                color_continuous_scale='Viridis'
            )
            fig_gpe.update_layout(
                yaxis={'categoryorder': 'total ascending'},
                height=600,
                xaxis_title='Frecuencia',
                yaxis_title='Entidad'
            )
            st.plotly_chart(fig_gpe, use_container_width=True)

        # Gráfica de Top Entidades ORG (Organizaciones)
        if 'ORG' in top_entities and top_entities['ORG']:
            st.markdown("#### 🏢 Top 20 Entidades ORG (Organizaciones)")
            org_df = pd.DataFrame(top_entities['ORG'][:20], columns=['Entidad', 'Frecuencia'])

            fig_org = px.bar(
                org_df,
                x='Frecuencia',
                y='Entidad',
                orientation='h',
                title='Top 20 Entidades ORG Más Frecuentes',
                color='Frecuencia',
                color_continuous_scale='Teal'
            )
            fig_org.update_layout(
                yaxis={'categoryorder': 'total ascending'},
                height=600,
                xaxis_title='Frecuencia',
                yaxis_title='Entidad'
            )
            st.plotly_chart(fig_org, use_container_width=True)

        # Gráfica de Top Entidades PERSON (Personas)
        if 'PERSON' in top_entities and top_entities['PERSON']:
            st.markdown("#### 👤 Top 20 Entidades PERSON (Personas)")
            person_df = pd.DataFrame(top_entities['PERSON'][:20], columns=['Entidad', 'Frecuencia'])

            fig_person = px.bar(
                person_df,
                x='Frecuencia',
                y='Entidad',
                orientation='h',
                title='Top 20 Entidades PERSON Más Frecuentes',
                color='Frecuencia',
                color_continuous_scale='Bluered'
            )
            fig_person.update_layout(
                yaxis={'categoryorder': 'total ascending'},
                height=600,
                xaxis_title='Frecuencia',
                yaxis_title='Entidad'
            )
            st.plotly_chart(fig_person, use_container_width=True)

        # Expandable con todas las entidades por tipo
        st.markdown("### 📋 Listado Completo por Tipo")
        for entity_type, entities in top_entities.items():
            with st.expander(f"📌 {entity_type} ({len(entities)} entidades únicas)"):
                if entities:
                    ent_df = pd.DataFrame(entities[:50], columns=['Entidad', 'Frecuencia'])
                    st.dataframe(ent_df, use_container_width=True, height=400)

    st.markdown("---")
    st.success("✅ **Análisis NER completado** - Entidades identificadas y visualizadas")

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

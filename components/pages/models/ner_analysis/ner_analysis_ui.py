"""
Página de Análisis NER - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from components.ui.helpers import show_section_header, show_return_to_dashboard_button, show_chart_interpretation


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

        show_chart_interpretation(
            chart_type="Gráfico de Torta (Donut Chart)",
            title="Distribución de Tipos de Entidades",
            interpretation=(
                "Este gráfico muestra la **distribución proporcional** de los diferentes tipos de entidades nombradas "
                "identificadas en el corpus mediante Named Entity Recognition (NER). Los tipos principales incluyen: "
                "PERSON (personas), ORG (organizaciones), GPE (lugares/países), DATE (fechas), etc."
            ),
            how_to_read=(
                "- **Segmentos**: Cada porción representa un tipo de entidad\\n"
                "- **Tamaño**: Proporcional a la cantidad de entidades de ese tipo\\n"
                "- **Porcentaje**: Muestra la proporción relativa de cada tipo"
            ),
            what_to_look_for=[
                "**Tipo dominante**: ¿Qué tipo de entidad aparece más frecuentemente?",
                "**Balance**: ¿Hay diversidad de tipos o domina un solo tipo?",
                "**Contexto del corpus**: ¿Los tipos reflejan la naturaleza del contenido?"
            ]
        )

        # Tabla de entidades por tipo
        st.markdown("### 📋 Tabla Resumen por Tipo")
        st.dataframe(entity_df, use_container_width=True, height=200)

        # Top entidades por tipo
        st.markdown("### 🔝 Top Entidades Detectadas")

        top_entities = ner_results.get('top_entities_by_type', {})

        import plotly.express as px

        # Gráfica de Top Entidades GPE (Lugares/Países)
        if 'GPE' in top_entities and top_entities['GPE']:
            st.markdown("---")
            st.markdown("#### 🌍 Top Entidades GPE (Lugares/Países)")

            # Nube de palabras GPE
            st.markdown("##### ☁️ Nube de Palabras - GPE")
            gpe_dict = dict(top_entities['GPE'][:50])
            if gpe_dict:
                wordcloud = WordCloud(
                    width=1200,
                    height=400,
                    background_color='white',
                    colormap='Greens',
                    relative_scaling=0.5,
                    min_font_size=10
                ).generate_from_frequencies(gpe_dict)

                fig_wc, ax = plt.subplots(figsize=(12, 4))
                ax.imshow(wordcloud, interpolation='bilinear')
                ax.axis('off')
                st.pyplot(fig_wc)

            # Gráfico de barras GPE
            st.markdown("##### 📊 Gráfico de Barras - Top 20 GPE")
            gpe_df = pd.DataFrame(top_entities['GPE'][:20], columns=['Entidad', 'Frecuencia'])

            fig_gpe = px.bar(
                gpe_df,
                x='Frecuencia',
                y='Entidad',
                orientation='h',
                title='Top 20 Entidades GPE Más Frecuentes',
                color='Frecuencia',
                color_continuous_scale='Greens'
            )
            fig_gpe.update_layout(
                yaxis={'categoryorder': 'total ascending'},
                height=500,
                xaxis_title='Frecuencia',
                yaxis_title='Entidad'
            )
            st.plotly_chart(fig_gpe, use_container_width=True)

            show_chart_interpretation(
                chart_type="Entidades GPE (Geopolitical Entity)",
                title="Lugares, Ciudades, Países y Regiones",
                interpretation=(
                    "Las entidades **GPE (Geopolitical Entity)** identifican **lugares geográficos**, incluyendo "
                    "países, ciudades, estados y regiones. Estas entidades ayudan a entender el **contexto geográfico** "
                    "del corpus y qué localizaciones son más relevantes o frecuentemente mencionadas."
                ),
                how_to_read=(
                    "- **Nube de palabras**: Visualiza los lugares más mencionados\\n"
                    "- **Gráfico de barras**: Muestra frecuencia exacta de menciones"
                ),
                what_to_look_for=[
                    "**Localización principal**: ¿Qué lugar geográfico domina el discurso?",
                    "**Alcance geográfico**: ¿El corpus es local, nacional o internacional?",
                    "**Contexto regional**: ¿Hay concentración en regiones específicas?"
                ]
            )

        # Gráfica de Top Entidades ORG (Organizaciones)
        if 'ORG' in top_entities and top_entities['ORG']:
            st.markdown("---")
            st.markdown("#### 🏢 Top Entidades ORG (Organizaciones)")

            # Nube de palabras ORG
            st.markdown("##### ☁️ Nube de Palabras - ORG")
            org_dict = dict(top_entities['ORG'][:50])
            if org_dict:
                wordcloud = WordCloud(
                    width=1200,
                    height=400,
                    background_color='white',
                    colormap='Blues',
                    relative_scaling=0.5,
                    min_font_size=10
                ).generate_from_frequencies(org_dict)

                fig_wc, ax = plt.subplots(figsize=(12, 4))
                ax.imshow(wordcloud, interpolation='bilinear')
                ax.axis('off')
                st.pyplot(fig_wc)

            # Gráfico de barras ORG
            st.markdown("##### 📊 Gráfico de Barras - Top 20 ORG")
            org_df = pd.DataFrame(top_entities['ORG'][:20], columns=['Entidad', 'Frecuencia'])

            fig_org = px.bar(
                org_df,
                x='Frecuencia',
                y='Entidad',
                orientation='h',
                title='Top 20 Entidades ORG Más Frecuentes',
                color='Frecuencia',
                color_continuous_scale='Blues'
            )
            fig_org.update_layout(
                yaxis={'categoryorder': 'total ascending'},
                height=500,
                xaxis_title='Frecuencia',
                yaxis_title='Entidad'
            )
            st.plotly_chart(fig_org, use_container_width=True)

            show_chart_interpretation(
                chart_type="Entidades ORG (Organization)",
                title="Organizaciones, Empresas, Instituciones y Agencias",
                interpretation=(
                    "Las entidades **ORG (Organization)** identifican **organizaciones**, incluyendo empresas, "
                    "instituciones académicas, agencias gubernamentales, ONG y otros organismos. Estas entidades "
                    "revelan los **actores institucionales clave** mencionados en el corpus."
                ),
                how_to_read=(
                    "- **Nube de palabras**: Visualiza las organizaciones más mencionadas\\n"
                    "- **Gráfico de barras**: Muestra frecuencia exacta de menciones"
                ),
                what_to_look_for=[
                    "**Organizaciones dominantes**: ¿Qué instituciones son centrales en el discurso?",
                    "**Sector**: ¿Predominan empresas privadas, instituciones públicas o académicas?",
                    "**Ecosistema institucional**: ¿Qué actores organizacionales son relevantes?"
                ]
            )

        # Gráfica de Top Entidades PERSON (Personas)
        if 'PERSON' in top_entities and top_entities['PERSON']:
            st.markdown("---")
            st.markdown("#### 👤 Top Entidades PERSON (Personas)")

            # Nube de palabras PERSON
            st.markdown("##### ☁️ Nube de Palabras - PERSON")
            person_dict = dict(top_entities['PERSON'][:50])
            if person_dict:
                wordcloud = WordCloud(
                    width=1200,
                    height=400,
                    background_color='white',
                    colormap='Oranges',
                    relative_scaling=0.5,
                    min_font_size=10
                ).generate_from_frequencies(person_dict)

                fig_wc, ax = plt.subplots(figsize=(12, 4))
                ax.imshow(wordcloud, interpolation='bilinear')
                ax.axis('off')
                st.pyplot(fig_wc)

            # Gráfico de barras PERSON
            st.markdown("##### 📊 Gráfico de Barras - Top 20 PERSON")
            person_df = pd.DataFrame(top_entities['PERSON'][:20], columns=['Entidad', 'Frecuencia'])

            fig_person = px.bar(
                person_df,
                x='Frecuencia',
                y='Entidad',
                orientation='h',
                title='Top 20 Entidades PERSON Más Frecuentes',
                color='Frecuencia',
                color_continuous_scale='Oranges'
            )
            fig_person.update_layout(
                yaxis={'categoryorder': 'total ascending'},
                height=500,
                xaxis_title='Frecuencia',
                yaxis_title='Entidad'
            )
            st.plotly_chart(fig_person, use_container_width=True)

            show_chart_interpretation(
                chart_type="Entidades PERSON (Persona)",
                title="Personas, Autores, Investigadores y Figuras Relevantes",
                interpretation=(
                    "Las entidades **PERSON** identifican **personas** mencionadas en el corpus, incluyendo "
                    "autores, investigadores, figuras históricas, líderes y otros individuos relevantes. "
                    "Estas entidades ayudan a identificar quiénes son los **actores humanos clave** en el discurso."
                ),
                how_to_read=(
                    "- **Nube de palabras**: Visualiza las personas más mencionadas\\n"
                    "- **Gráfico de barras**: Muestra frecuencia exacta de menciones"
                ),
                what_to_look_for=[
                    "**Figuras centrales**: ¿Qué personas son más frecuentemente citadas?",
                    "**Tipo de personajes**: ¿Son autores, investigadores, líderes políticos, etc.?",
                    "**Influencia**: ¿Las personas mencionadas reflejan autoridades en el tema?"
                ]
            )

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

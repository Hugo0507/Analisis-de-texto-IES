"""
Página de Bolsa de Palabras - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from components.ui.helpers import show_section_header, show_return_to_dashboard_button, show_chart_interpretation


def render():
    """Renderiza el dashboard de Bolsa de Palabras (solo lectura)"""

    show_section_header("Bolsa de Palabras (BoW)", "Representación vectorial basada en frecuencia de términos")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'bow_matrix' not in pipeline_manager.results:
        st.warning("⚠️ El análisis BoW aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    # Obtener resultados
    bow_matrix = pipeline_manager.results.get('bow_matrix')
    bow_features = pipeline_manager.results.get('bow_feature_names', [])
    bow_stats = pipeline_manager.results.get('bow_stats', {})

    st.markdown("### 📊 Resumen de Bolsa de Palabras")

    vocab_size = len(bow_features)
    total_docs = bow_stats.get('n_documents', 0)
    sparsity = bow_stats.get('sparsity', 0)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Vocabulario", f"{vocab_size:,}")
    col2.metric("Documentos", total_docs)
    col3.metric("Esparsidad", f"{sparsity:.2%}")
    col4.metric("Términos/Doc", f"{vocab_size/total_docs if total_docs > 0 else 0:.0f}")

    st.markdown("---")

    # VISUALIZACIÓN 1: Nube de Palabras
    st.markdown("### ☁️ Nube de Palabras - Términos Más Frecuentes")

    if bow_matrix is not None and len(bow_features) > 0:
        # Calcular frecuencias totales por término
        bow_df = pd.DataFrame(bow_matrix, columns=bow_features)
        term_frequencies = bow_df.sum(axis=0).sort_values(ascending=False)

        # Crear diccionario de frecuencias para WordCloud
        freq_dict = dict(term_frequencies.head(100))

        if freq_dict:
            wordcloud = WordCloud(
                width=1200,
                height=600,
                background_color='white',
                colormap='viridis',
                relative_scaling=0.5,
                min_font_size=10
            ).generate_from_frequencies(freq_dict)

            fig_wc, ax = plt.subplots(figsize=(12, 6))
            ax.imshow(wordcloud, interpolation='bilinear')
            ax.axis('off')
            st.pyplot(fig_wc)

            show_chart_interpretation(
                chart_type="Nube de Palabras",
                title="Términos Más Frecuentes en el Corpus",
                interpretation=(
                    "Esta nube de palabras visualiza los **términos más frecuentes** encontrados en todos los documentos. "
                    "El tamaño de cada palabra es proporcional a su frecuencia total en el corpus. "
                    "Palabras más grandes aparecen más veces en los documentos."
                ),
                how_to_read=(
                    "- **Tamaño de palabra**: Indica la frecuencia total del término\\n"
                    "- **Colores**: Ayudan a diferenciar visualmente los términos\\n"
                    "- **Posición**: Aleatoria, no tiene significado específico"
                ),
                what_to_look_for=[
                    "**Términos dominantes**: Palabras más grandes que definen el tema principal",
                    "**Vocabulario técnico**: Identifica términos específicos del dominio",
                    "**Balance temático**: ¿Hay diversidad de términos o domina un solo tema?"
                ]
            )

    st.markdown("---")

    # VISUALIZACIÓN 2: Gráfico de Barras - Top Términos
    st.markdown("### 📊 Top 20 Términos por Frecuencia")

    if bow_matrix is not None and len(bow_features) > 0:
        bow_df = pd.DataFrame(bow_matrix, columns=bow_features)
        term_frequencies = bow_df.sum(axis=0).sort_values(ascending=False)

        top_n = min(20, len(term_frequencies))
        top_terms_df = pd.DataFrame({
            'Término': term_frequencies.head(top_n).index,
            'Frecuencia': term_frequencies.head(top_n).values
        })

        fig_bar = px.bar(
            top_terms_df,
            x='Frecuencia',
            y='Término',
            orientation='h',
            title=f'Top {top_n} Términos Más Frecuentes',
            color='Frecuencia',
            color_continuous_scale='Blues'
        )
        fig_bar.update_layout(yaxis={'categoryorder': 'total ascending'}, height=600)
        st.plotly_chart(fig_bar, use_container_width=True)

        show_chart_interpretation(
            chart_type="Gráfico de Barras Horizontales",
            title="Top Términos por Frecuencia",
            interpretation=(
                "Este gráfico muestra los **20 términos más frecuentes** en orden descendente. "
                "La longitud de cada barra representa cuántas veces aparece el término en todo el corpus. "
                "Esto ayuda a identificar rápidamente el vocabulario central del análisis."
            ),
            how_to_read=(
                "- **Eje Y**: Lista de términos ordenados por frecuencia\\n"
                "- **Eje X**: Frecuencia absoluta (número de apariciones)\\n"
                "- **Color**: Intensidad proporcional a la frecuencia"
            ),
            what_to_look_for=[
                "**Término más frecuente**: ¿Cuál es el concepto más discutido?",
                "**Distribución**: ¿Hay grandes diferencias entre términos o están equilibrados?",
                "**Relevancia temática**: ¿Los términos top reflejan el tema esperado?"
            ]
        )

    st.markdown("---")

    # VISUALIZACIÓN 3: Mapa de Calor - Documentos vs Términos Top
    st.markdown("### 🔥 Mapa de Calor - Distribución de Términos por Documento")

    if bow_matrix is not None and len(bow_features) > 0:
        bow_df = pd.DataFrame(bow_matrix, columns=bow_features)

        # Obtener top 15 términos
        term_frequencies = bow_df.sum(axis=0).sort_values(ascending=False)
        top_terms = term_frequencies.head(15).index.tolist()

        # Crear subset con top términos
        heatmap_df = bow_df[top_terms]

        # Limitar a primeros 20 documentos si hay muchos
        if len(heatmap_df) > 20:
            heatmap_df = heatmap_df.head(20)
            st.info(f"ℹ️ Mostrando primeros 20 de {len(bow_df)} documentos")

        fig_heat = go.Figure(data=go.Heatmap(
            z=heatmap_df.values,
            x=heatmap_df.columns,
            y=[f"Doc {i+1}" for i in range(len(heatmap_df))],
            colorscale='YlOrRd',
            colorbar=dict(title="Frecuencia")
        ))

        fig_heat.update_layout(
            title="Distribución de Top 15 Términos por Documento",
            xaxis_title="Términos",
            yaxis_title="Documentos",
            height=600,
            xaxis={'tickangle': -45}
        )

        st.plotly_chart(fig_heat, use_container_width=True)

        show_chart_interpretation(
            chart_type="Mapa de Calor (Heatmap)",
            title="Distribución de Términos por Documento",
            interpretation=(
                "Este mapa de calor muestra cómo se **distribuyen los términos más frecuentes** "
                "a través de los diferentes documentos. Los colores más intensos indican mayor frecuencia "
                "de un término específico en un documento particular."
            ),
            how_to_read=(
                "- **Eje X**: Términos más frecuentes del corpus\\n"
                "- **Eje Y**: Documentos analizados\\n"
                "- **Color**: Intensidad = frecuencia del término en ese documento\\n"
                "- **Amarillo/Blanco**: Frecuencia baja o cero\\n"
                "- **Naranja/Rojo**: Frecuencia alta"
            ),
            what_to_look_for=[
                "**Patrones verticales**: Términos que aparecen en muchos documentos (generales)",
                "**Patrones horizontales**: Documentos con vocabulario específico",
                "**Celdas rojas intensas**: Términos muy frecuentes en documentos específicos",
                "**Especialización temática**: ¿Cada documento tiene términos únicos o comparten vocabulario?"
            ]
        )

    st.markdown("---")

    # Tabla de top términos
    st.markdown("### 🔤 Top Términos por Frecuencia (Tabla Detallada)")

    if bow_matrix is not None and len(bow_features) > 0:
        bow_df = pd.DataFrame(bow_matrix, columns=bow_features)
        term_frequencies = bow_df.sum(axis=0).sort_values(ascending=False)

        # Calcular frecuencia de documentos (en cuántos docs aparece)
        doc_freq = (bow_df > 0).sum(axis=0)

        top_n = min(30, len(term_frequencies))
        top_terms_table = pd.DataFrame({
            'Ranking': range(1, top_n + 1),
            'Término': term_frequencies.head(top_n).index,
            'Frecuencia Total': term_frequencies.head(top_n).values.astype(int),
            'Docs con Término': [doc_freq[term] for term in term_frequencies.head(top_n).index],
            '% Documentos': [f"{(doc_freq[term]/total_docs*100):.1f}%" for term in term_frequencies.head(top_n).index]
        })

        st.dataframe(top_terms_table, use_container_width=True, height=500)

    st.markdown("---")
    st.info("""
    **Configuración Aplicada:**
    - N-gramas: (1, 2) - unigramas y bigramas
    - Mín. frecuencia documento: 2
    - Máx. frecuencia documento: 85%
    - Máx. características: 5000

    💡 Modificar en `src/pipeline_config.py` → `BOW`
    """)

    st.success("✅ **BoW completado** - Matriz de características lista para modelado")

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

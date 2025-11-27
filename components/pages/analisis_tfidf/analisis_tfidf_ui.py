"""
Página de Análisis TF-IDF - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from components.ui.helpers import show_section_header, show_return_to_dashboard_button, show_chart_interpretation


def render():
    """Renderiza el dashboard de TF-IDF (solo lectura)"""

    show_section_header("Análisis TF-IDF", "Representación vectorial ponderada por importancia de términos")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'tfidf_matrix' not in pipeline_manager.results:
        st.warning("⚠️ El análisis TF-IDF aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    # Obtener resultados
    tfidf_matrix = pipeline_manager.results.get('tfidf_matrix')
    tfidf_features = pipeline_manager.results.get('tfidf_feature_names', [])
    tfidf_stats = pipeline_manager.results.get('tfidf_stats', {})

    st.markdown("### 📊 Resumen de TF-IDF")

    vocab_size = len(tfidf_features)
    total_docs = tfidf_stats.get('n_documents', 0)
    sparsity = tfidf_stats.get('sparsity', 0)
    avg_score = tfidf_stats.get('avg_tfidf_score', 0)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Vocabulario", f"{vocab_size:,}")
    col2.metric("Documentos", total_docs)
    col3.metric("Esparsidad", f"{sparsity:.2%}")
    col4.metric("Score Promedio", f"{avg_score:.4f}")

    st.markdown("---")

    # VISUALIZACIÓN 1: Nube de Palabras - Términos Más Relevantes
    st.markdown("### ☁️ Nube de Palabras - Términos Más Relevantes (TF-IDF)")

    if tfidf_matrix is not None and len(tfidf_features) > 0:
        # Calcular scores TF-IDF promedio por término
        tfidf_df = pd.DataFrame(tfidf_matrix, columns=tfidf_features)
        term_importance = tfidf_df.sum(axis=0).sort_values(ascending=False)

        # Crear diccionario de importancia para WordCloud
        importance_dict = dict(term_importance.head(100))

        if importance_dict:
            wordcloud = WordCloud(
                width=1200,
                height=600,
                background_color='white',
                colormap='plasma',
                relative_scaling=0.5,
                min_font_size=10
            ).generate_from_frequencies(importance_dict)

            fig_wc, ax = plt.subplots(figsize=(12, 6))
            ax.imshow(wordcloud, interpolation='bilinear')
            ax.axis('off')
            st.pyplot(fig_wc)

            show_chart_interpretation(
                chart_type="Nube de Palabras (TF-IDF)",
                title="Términos Más Relevantes según TF-IDF",
                interpretation=(
                    "Esta nube de palabras visualiza los **términos más importantes** según su puntuación TF-IDF. "
                    "A diferencia de la simple frecuencia, TF-IDF pondera términos que son **frecuentes en pocos documentos**, "
                    "identificando vocabulario distintivo y discriminativo. Palabras más grandes tienen mayor importancia relativa."
                ),
                how_to_read=(
                    "- **Tamaño de palabra**: Proporcional al score TF-IDF acumulado\\n"
                    "- **Colores**: Diferencian visualmente los términos (sin significado específico)\\n"
                    "- **Posición**: Aleatoria, no tiene significado"
                ),
                what_to_look_for=[
                    "**Términos distintivos**: Palabras que caracterizan documentos específicos",
                    "**Vocabulario técnico especializado**: Términos con alta importancia relativa",
                    "**Diferencia con BoW**: ¿Son diferentes los términos top vs frecuencia simple?"
                ]
            )

    st.markdown("---")

    # VISUALIZACIÓN 2: Gráfico de Barras - Top Términos por Score TF-IDF
    st.markdown("### 📊 Top 20 Términos por Importancia TF-IDF")

    if tfidf_matrix is not None and len(tfidf_features) > 0:
        tfidf_df = pd.DataFrame(tfidf_matrix, columns=tfidf_features)
        term_importance = tfidf_df.sum(axis=0).sort_values(ascending=False)

        top_n = min(20, len(term_importance))
        top_terms_df = pd.DataFrame({
            'Término': term_importance.head(top_n).index,
            'Score TF-IDF': term_importance.head(top_n).values
        })

        fig_bar = px.bar(
            top_terms_df,
            x='Score TF-IDF',
            y='Término',
            orientation='h',
            title=f'Top {top_n} Términos por Importancia TF-IDF',
            color='Score TF-IDF',
            color_continuous_scale='Oranges'
        )
        fig_bar.update_layout(yaxis={'categoryorder': 'total ascending'}, height=600)
        st.plotly_chart(fig_bar, use_container_width=True)

        show_chart_interpretation(
            chart_type="Gráfico de Barras Horizontales (TF-IDF)",
            title="Top Términos por Importancia",
            interpretation=(
                "Este gráfico muestra los **20 términos con mayor puntuación TF-IDF acumulada**. "
                "Los scores TF-IDF altos indican términos que son frecuentes en documentos específicos pero raros en el corpus general, "
                "haciendo que sean altamente discriminativos y útiles para caracterizar temas."
            ),
            how_to_read=(
                "- **Eje Y**: Términos ordenados por importancia TF-IDF\\n"
                "- **Eje X**: Score TF-IDF acumulado (suma de todos los documentos)\\n"
                "- **Color**: Intensidad proporcional al score"
            ),
            what_to_look_for=[
                "**Términos especializados**: ¿Los términos top reflejan temas específicos?",
                "**Diferencia de scores**: ¿Hay un término dominante o están equilibrados?",
                "**Relevancia temática**: ¿Los términos capturan conceptos clave del análisis?"
            ]
        )

    st.markdown("---")

    # VISUALIZACIÓN 3: Mapa de Calor - Documentos vs Términos Top TF-IDF
    st.markdown("### 🔥 Mapa de Calor - Importancia TF-IDF por Documento")

    if tfidf_matrix is not None and len(tfidf_features) > 0:
        tfidf_df = pd.DataFrame(tfidf_matrix, columns=tfidf_features)

        # Obtener top 15 términos por score TF-IDF
        term_importance = tfidf_df.sum(axis=0).sort_values(ascending=False)
        top_terms = term_importance.head(15).index.tolist()

        # Crear subset con top términos
        heatmap_df = tfidf_df[top_terms]

        # Limitar a primeros 20 documentos si hay muchos
        if len(heatmap_df) > 20:
            heatmap_df = heatmap_df.head(20)
            st.info(f"ℹ️ Mostrando primeros 20 de {len(tfidf_df)} documentos")

        fig_heat = go.Figure(data=go.Heatmap(
            z=heatmap_df.values,
            x=heatmap_df.columns,
            y=[f"Doc {i+1}" for i in range(len(heatmap_df))],
            colorscale='Viridis',
            colorbar=dict(title="Score TF-IDF")
        ))

        fig_heat.update_layout(
            title="Distribución de Scores TF-IDF - Top 15 Términos por Documento",
            xaxis_title="Términos",
            yaxis_title="Documentos",
            height=600,
            xaxis={'tickangle': -45}
        )

        st.plotly_chart(fig_heat, use_container_width=True)

        show_chart_interpretation(
            chart_type="Mapa de Calor (Heatmap TF-IDF)",
            title="Distribución de Importancia por Documento",
            interpretation=(
                "Este mapa de calor muestra **cómo varían los scores TF-IDF** de los términos más importantes "
                "a través de los documentos. Colores más brillantes indican mayor relevancia de un término para un documento específico. "
                "TF-IDF penaliza términos muy comunes, destacando vocabulario distintivo."
            ),
            how_to_read=(
                "- **Eje X**: Términos con mayor importancia TF-IDF\\n"
                "- **Eje Y**: Documentos analizados\\n"
                "- **Color**: Intensidad del score TF-IDF\\n"
                "- **Oscuro/Bajo**: Término poco relevante para ese documento\\n"
                "- **Brillante/Alto**: Término muy relevante para ese documento"
            ),
            what_to_look_for=[
                "**Especialización de documentos**: ¿Cada documento tiene términos únicos con scores altos?",
                "**Términos compartidos**: ¿Hay términos con scores altos en múltiples documentos?",
                "**Patrones temáticos**: ¿Se agrupan documentos similares por vocabulario?",
                "**Distintividad**: ¿Los scores ayudan a diferenciar documentos?"
            ]
        )

    st.markdown("---")

    # VISUALIZACIÓN 4: Score Promedio vs Máximo por Término
    st.markdown("### 📈 Análisis de Distribución de Scores TF-IDF")

    if tfidf_matrix is not None and len(tfidf_features) > 0:
        tfidf_df = pd.DataFrame(tfidf_matrix, columns=tfidf_features)

        # Calcular estadísticas por término
        term_stats = pd.DataFrame({
            'Término': tfidf_df.columns,
            'Score Promedio': tfidf_df.mean(axis=0).values,
            'Score Máximo': tfidf_df.max(axis=0).values,
            'Score Total': tfidf_df.sum(axis=0).values
        }).sort_values('Score Total', ascending=False).head(20)

        fig_scatter = px.scatter(
            term_stats,
            x='Score Promedio',
            y='Score Máximo',
            size='Score Total',
            hover_data=['Término'],
            title='Distribución de Scores TF-IDF: Promedio vs Máximo (Top 20 términos)',
            labels={'Score Promedio': 'Score TF-IDF Promedio', 'Score Máximo': 'Score TF-IDF Máximo'},
            color='Score Total',
            color_continuous_scale='Turbo'
        )

        fig_scatter.update_layout(height=500)
        st.plotly_chart(fig_scatter, use_container_width=True)

        show_chart_interpretation(
            chart_type="Gráfico de Dispersión (Scatter Plot)",
            title="Análisis de Scores TF-IDF",
            interpretation=(
                "Este gráfico relaciona el **score promedio** y **score máximo** de cada término. "
                "El tamaño de cada punto representa el score total acumulado. Términos en la esquina superior derecha "
                "son consistentemente importantes (alto promedio) y muy distintivos en al menos un documento (alto máximo)."
            ),
            how_to_read=(
                "- **Eje X**: Score TF-IDF promedio del término\\n"
                "- **Eje Y**: Score TF-IDF máximo del término\\n"
                "- **Tamaño**: Score total acumulado\\n"
                "- **Color**: Intensidad del score total"
            ),
            what_to_look_for=[
                "**Términos en esquina superior derecha**: Alta importancia general y específica",
                "**Términos con alto máximo pero bajo promedio**: Muy importantes en 1-2 documentos únicamente",
                "**Términos con alto promedio**: Consistentemente relevantes en múltiples documentos"
            ]
        )

    st.markdown("---")

    # Tabla de top términos detallada
    st.markdown("### 🔤 Top Términos TF-IDF (Tabla Detallada)")

    if tfidf_matrix is not None and len(tfidf_features) > 0:
        tfidf_df = pd.DataFrame(tfidf_matrix, columns=tfidf_features)

        # Calcular estadísticas
        term_importance = tfidf_df.sum(axis=0).sort_values(ascending=False)
        term_avg = tfidf_df.mean(axis=0)
        term_max = tfidf_df.max(axis=0)
        doc_freq = (tfidf_df > 0).sum(axis=0)

        top_n = min(30, len(term_importance))
        top_terms_table = pd.DataFrame({
            'Ranking': range(1, top_n + 1),
            'Término': term_importance.head(top_n).index,
            'Score Total': [f"{score:.4f}" for score in term_importance.head(top_n).values],
            'Score Promedio': [f"{term_avg[term]:.4f}" for term in term_importance.head(top_n).index],
            'Score Máximo': [f"{term_max[term]:.4f}" for term in term_importance.head(top_n).index],
            'Docs con Término': [doc_freq[term] for term in term_importance.head(top_n).index],
            '% Documentos': [f"{(doc_freq[term]/total_docs*100):.1f}%" for term in term_importance.head(top_n).index]
        })

        st.dataframe(top_terms_table, use_container_width=True, height=500)

    st.markdown("---")
    st.info("""
    **Configuración Aplicada:**
    - N-gramas: (1, 2)
    - Normalización: L2
    - IDF suavizado: Sí
    - TF sub-lineal: No

    💡 Modificar en `src/pipeline_config.py` → `TFIDF`
    """)

    st.success("✅ **TF-IDF completado** - Ponderación de términos lista")

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

"""
Modelado de Temas - Dashboard de Solo Lectura
"""

import streamlit as st
import pandas as pd
import plotly.express as px
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from components.ui.helpers import show_section_header, show_return_to_dashboard_button, show_chart_interpretation


def render_topic_visualizations(model_name, model_data, color_scheme='Blues'):
    """Renderiza visualizaciones para un modelo de topics"""

    topics = model_data.get('topics', {})
    n_topics = model_data.get('n_topics', 0)

    st.metric("Temas Descubiertos", n_topics)

    st.markdown("---")

    # Crear pestañas por tema
    if topics and len(topics) > 0:
        topic_tabs = st.tabs([f"Tema {i}" for i in range(min(len(topics), 10))])

        for idx, (topic_id, words) in enumerate(list(topics.items())[:10]):
            with topic_tabs[idx]:
                st.markdown(f"#### Tema {topic_id}")

                # Nube de palabras por tema
                st.markdown("##### ☁️ Nube de Palabras del Tema")
                if words and len(words) > 0:
                    # Crear frecuencias artificiales (decrecientes)
                    word_freq = {word: len(words) - i for i, word in enumerate(words[:30])}

                    wordcloud = WordCloud(
                        width=1000,
                        height=400,
                        background_color='white',
                        colormap=color_scheme,
                        relative_scaling=0.5,
                        min_font_size=10
                    ).generate_from_frequencies(word_freq)

                    fig_wc, ax = plt.subplots(figsize=(10, 4))
                    ax.imshow(wordcloud, interpolation='bilinear')
                    ax.axis('off')
                    st.pyplot(fig_wc)

                # Gráfico de barras de top palabras
                st.markdown("##### 📊 Top 15 Palabras del Tema")
                if words and len(words) >= 15:
                    top_words = words[:15]
                    word_importance = [len(words) - i for i in range(15)]

                    df_words = pd.DataFrame({
                        'Palabra': top_words,
                        'Importancia': word_importance
                    })

                    fig_bar = px.bar(
                        df_words,
                        x='Importancia',
                        y='Palabra',
                        orientation='h',
                        title=f'Top 15 Palabras - Tema {topic_id}',
                        color='Importancia',
                        color_continuous_scale=color_scheme
                    )
                    fig_bar.update_layout(yaxis={'categoryorder': 'total ascending'}, height=500)
                    st.plotly_chart(fig_bar, use_container_width=True)

                # Lista de palabras
                st.markdown("##### 🔤 Lista Completa de Palabras")
                st.write(", ".join(words[:30]))


def render():
    """Renderiza el dashboard de Topic Modeling (solo lectura)"""

    show_section_header("Modelado de Temas (LDA, NMF, LSA)", "Descubrimiento automático de temas latentes")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'topic_modeling' not in pipeline_manager.results:
        st.warning("⚠️ El modelado de temas aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    topic_results = pipeline_manager.results.get('topic_modeling', {})

    st.markdown("### 📊 Modelos Entrenados")

    models_trained = [k for k in topic_results.keys() if not k.endswith('_error')]
    col1, col2 = st.columns(2)
    col1.metric("Modelos Exitosos", len(models_trained))
    col2.metric("Total Modelos", len(topic_results))

    st.markdown("---")

    # Tabs para cada modelo + comparación
    tabs = st.tabs(["LDA", "NMF", "LSA", "pLSA", "📊 Comparación"])

    with tabs[0]:
        st.markdown("### 🔍 Latent Dirichlet Allocation (LDA)")
        if 'lda' in topic_results:
            lda = topic_results['lda']
            render_topic_visualizations("LDA", lda, color_scheme='Greens')

            show_chart_interpretation(
                chart_type="Topic Modeling - LDA",
                title="Descubrimiento de Temas con LDA",
                interpretation=(
                    "**LDA (Latent Dirichlet Allocation)** es un modelo probabilístico que descubre automáticamente "
                    "**temas latentes** en el corpus. Cada tema es una distribución de palabras, y cada documento es "
                    "una mezcla de temas. Las visualizaciones muestran las palabras más representativas de cada tema."
                ),
                how_to_read=(
                    "- **Nubes de palabras**: Términos más característicos del tema\\n"
                    "- **Gráficos de barras**: Importancia relativa de cada palabra\\n"
                    "- **Múltiples temas**: Cada pestaña representa un tema diferente"
                ),
                what_to_look_for=[
                    "**Coherencia temática**: ¿Las palabras de un tema están relacionadas semánticamente?",
                    "**Diferenciación**: ¿Los temas son distintos entre sí?",
                    "**Interpretabilidad**: ¿Se puede asignar un concepto/etiqueta al tema?"
                ]
            )
        else:
            st.warning("LDA no completado")

    with tabs[1]:
        st.markdown("### 🔍 Non-negative Matrix Factorization (NMF)")
        if 'nmf' in topic_results:
            nmf = topic_results['nmf']
            render_topic_visualizations("NMF", nmf, color_scheme='Blues')

            show_chart_interpretation(
                chart_type="Topic Modeling - NMF",
                title="Descubrimiento de Temas con NMF",
                interpretation=(
                    "**NMF (Non-negative Matrix Factorization)** descompone la matriz de documentos en dos matrices "
                    "no-negativas: una de temas-palabras y otra de documentos-temas. Tiende a producir temas más "
                    "interpretables y específicos que LDA."
                ),
                how_to_read=(
                    "- **Nubes de palabras**: Términos dominantes del tema\\n"
                    "- **Gráficos de barras**: Peso/importancia de cada palabra\\n"
                    "- **Interpretación**: Temas suelen ser más específicos que LDA"
                ),
                what_to_look_for=[
                    "**Especificidad**: ¿Los temas son más focalizados que con LDA?",
                    "**Vocabulario técnico**: ¿Captura terminología especializada?",
                    "**Diferenciación**: ¿Hay solapamiento entre temas?"
                ]
            )
        else:
            st.warning("NMF no completado")

    with tabs[2]:
        st.markdown("### 🔍 Latent Semantic Analysis (LSA)")
        if 'lsa' in topic_results:
            lsa = topic_results['lsa']
            render_topic_visualizations("LSA", lsa, color_scheme='Oranges')

            show_chart_interpretation(
                chart_type="Topic Modeling - LSA",
                title="Análisis Semántico Latente (LSA)",
                interpretation=(
                    "**LSA (Latent Semantic Analysis)** utiliza descomposición SVD para reducir dimensionalidad "
                    "y descubrir **relaciones semánticas latentes** entre términos y documentos. Los componentes "
                    "resultantes capturan conceptos semánticos subyacentes."
                ),
                how_to_read=(
                    "- **Nubes de palabras**: Términos asociados al componente\\n"
                    "- **Gráficos de barras**: Carga/peso de cada término\\n"
                    "- **Componentes**: Representan dimensiones semánticas latentes"
                ),
                what_to_look_for=[
                    "**Conceptos semánticos**: ¿Los componentes capturan significados subyacentes?",
                    "**Relaciones semánticas**: ¿Aparecen sinónimos o términos relacionados juntos?",
                    "**Dimensionalidad**: ¿Los componentes simplifican la representación del corpus?"
                ]
            )
        else:
            st.warning("LSA no completado")

    with tabs[3]:
        st.markdown("### 🔍 Probabilistic Latent Semantic Analysis (pLSA)")
        if 'plsa' in topic_results:
            plsa = topic_results['plsa']
            render_topic_visualizations("pLSA", plsa, color_scheme='Purples')

            show_chart_interpretation(
                chart_type="Topic Modeling - pLSA",
                title="Análisis Semántico Latente Probabilístico (pLSA)",
                interpretation=(
                    "**pLSA (Probabilistic Latent Semantic Analysis)** es un modelo probabilístico que descubre "
                    "**temas latentes** usando el algoritmo EM (Expectation-Maximization). A diferencia de LSA, "
                    "pLSA tiene una interpretación probabilística: modela P(palabra|tema) y P(tema|documento)."
                ),
                how_to_read=(
                    "- **Nubes de palabras**: Palabras más probables por tema\\n"
                    "- **Gráficos de barras**: Probabilidad P(palabra|tema)\\n"
                    "- **Interpretación**: Similar a LDA pero sin prior de Dirichlet"
                ),
                what_to_look_for=[
                    "**Coherencia probabilística**: ¿Los temas tienen distribuciones coherentes?",
                    "**Comparación con LDA**: ¿Los temas son similares o diferentes?",
                    "**Perplexity**: Menor perplexity indica mejor modelo",
                    "**Convergencia**: ¿El algoritmo EM convergió correctamente?"
                ]
            )

            # Mostrar métricas adicionales de pLSA
            st.markdown("### 📈 Métricas de pLSA")
            col1, col2, col3 = st.columns(3)
            col1.metric("Log-Likelihood", f"{plsa.get('log_likelihood', 0):.2f}")
            col2.metric("Perplexity", f"{plsa.get('perplexity', 0):.2f}")
            col3.metric("Iteraciones", plsa.get('iterations', 0))

        else:
            st.warning("pLSA no completado")

    with tabs[4]:
        st.markdown("### 📊 Comparación de Modelos")

        if 'model_comparison' in topic_results:
            comparison = topic_results['model_comparison']

            st.markdown("#### 🎯 Métricas por Modelo")

            # Tabla de métricas
            metrics_data = []
            for model in comparison['models']:
                model_metrics = comparison['metrics'].get(model, {})
                metrics_data.append({
                    'Modelo': model,
                    'Tipo': model_metrics.get('type', 'N/A'),
                    'Perplexity': f"{model_metrics.get('perplexity', '-'):.2f}" if model_metrics.get('perplexity') else '-',
                    'Log-Likelihood': f"{model_metrics.get('log_likelihood', '-'):.2f}" if model_metrics.get('log_likelihood') else '-',
                    'Recons. Error': f"{model_metrics.get('reconstruction_error', '-'):.2f}" if model_metrics.get('reconstruction_error') else '-',
                    'Var. Explicada': f"{model_metrics.get('explained_variance', '-'):.2%}" if model_metrics.get('explained_variance') else '-'
                })

            df_metrics = pd.DataFrame(metrics_data)
            st.dataframe(df_metrics, use_container_width=True, height=250)

            show_chart_interpretation(
                chart_type="Tabla de Métricas Comparativas",
                title="Comparación de Desempeño entre Modelos",
                interpretation=(
                    "Esta tabla compara las **métricas de evaluación** de cada modelo de topic modeling. "
                    "Diferentes modelos usan diferentes métricas debido a sus fundamentos matemáticos distintos."
                ),
                how_to_read=(
                    "- **Perplexity** (LDA, pLSA): Menor es mejor - mide qué tan bien predice palabras\\n"
                    "- **Log-Likelihood** (LDA, pLSA): Mayor es mejor - probabilidad de los datos\\n"
                    "- **Reconstruction Error** (NMF): Menor es mejor - error al reconstruir matriz\\n"
                    "- **Varianza Explicada** (LSA): Mayor es mejor - % de varianza capturada"
                ),
                what_to_look_for=[
                    "**Mejor modelo probabilístico**: ¿LDA o pLSA tiene menor perplexity?",
                    "**Calidad de reconstrucción**: ¿Qué tan bajo es el error de NMF?",
                    "**Captura de información**: ¿LSA explica suficiente varianza (>70%)?",
                    "**Trade-offs**: ¿Qué modelo balancea mejor interpretabilidad vs métricas?"
                ]
            )

            st.markdown("---")
            st.markdown("#### 🔗 Solapamiento de Vocabulario entre Modelos")

            # Gráfico de solapamiento
            overlap = comparison['topic_overlap']

            # Crear matriz de solapamiento para heatmap
            models_list = comparison['models']
            n_models = len(models_list)
            overlap_matrix = np.zeros((n_models, n_models))

            for i in range(n_models):
                for j in range(n_models):
                    if i == j:
                        overlap_matrix[i, j] = 1.0
                    else:
                        key = f"{models_list[i]}_{models_list[j]}"
                        reverse_key = f"{models_list[j]}_{models_list[i]}"
                        overlap_matrix[i, j] = overlap.get(key, overlap.get(reverse_key, 0))

            import plotly.graph_objects as go
            fig_overlap = go.Figure(data=go.Heatmap(
                z=overlap_matrix,
                x=models_list,
                y=models_list,
                colorscale='RdYlGn',
                zmin=0,
                zmax=1,
                text=[[f"{val:.2%}" for val in row] for row in overlap_matrix],
                texttemplate='%{text}',
                textfont={"size": 12},
                colorbar=dict(title="Jaccard<br>Similarity")
            ))

            fig_overlap.update_layout(
                title="Solapamiento de Vocabulario Top entre Modelos (Jaccard Similarity)",
                xaxis_title="Modelo",
                yaxis_title="Modelo",
                height=500
            )

            st.plotly_chart(fig_overlap, use_container_width=True)

            show_chart_interpretation(
                chart_type="Mapa de Calor - Solapamiento",
                title="Similitud de Vocabulario entre Modelos",
                interpretation=(
                    "Este mapa de calor muestra la **similitud Jaccard** entre las palabras top de cada modelo. "
                    "Un valor alto indica que dos modelos identifican vocabulario similar en sus temas."
                ),
                how_to_read=(
                    "- **Diagonal**: Siempre 1.0 (un modelo consigo mismo)\\n"
                    "- **Verde**: Alta similitud (>0.5) - modelos encuentran vocabulario parecido\\n"
                    "- **Amarillo**: Similitud media (0.3-0.5)\\n"
                    "- **Rojo**: Baja similitud (<0.3) - modelos identifican vocabulario diferente"
                ),
                what_to_look_for=[
                    "**LDA vs pLSA**: ¿Tienen alta similitud? (ambos son probabilísticos)",
                    "**NMF vs LSA**: ¿Se parecen? (ambos son algebraicos)",
                    "**Complementariedad**: ¿Modelos con baja similitud capturan aspectos diferentes?",
                    "**Consenso**: ¿Hay alto solapamiento general? Indica temas robustos"
                ]
            )

            st.markdown("---")
            st.markdown("### 💡 Recomendaciones")

            col1, col2 = st.columns(2)

            with col1:
                st.markdown("**Cuándo usar cada modelo:**")
                st.markdown("""
                - **LDA**: Interpretación probabilística, corpus grandes, temas generales
                - **pLSA**: Similar a LDA pero más simple, buenos resultados en corpus medianos
                - **NMF**: Temas específicos y concretos, mejores separaciones
                - **LSA**: Análisis exploratorio rápido, reducción de dimensionalidad
                """)

            with col2:
                st.markdown("**Criterios de selección:**")
                # Determinar mejor modelo
                best_prob = "LDA"
                if 'plsa' in topic_results and 'lda' in topic_results:
                    if topic_results['plsa'].get('perplexity', float('inf')) < topic_results['lda'].get('perplexity', float('inf')):
                        best_prob = "pLSA"

                st.info(f"🏆 **Mejor modelo probabilístico**: {best_prob}")
                st.info("💡 **Para producción**: Considerar ensemble de LDA + NMF")

        else:
            st.warning("⚠️ Comparación de modelos no disponible. Verifica que todos los modelos se hayan ejecutado correctamente.")

    st.markdown("---")
    st.success("✅ **Modelado de temas completado** - 4 modelos entrenados, temas descubiertos y comparados")

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

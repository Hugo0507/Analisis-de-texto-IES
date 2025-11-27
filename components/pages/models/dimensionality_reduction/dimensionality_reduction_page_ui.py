"""
Reducción de Dimensionalidad - Dashboard con Visualizaciones Completas
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import numpy as np
from components.ui.helpers import show_section_header, show_return_to_dashboard_button, show_chart_interpretation


def render():
    """Renderiza el dashboard de Reducción de Dimensionalidad (solo lectura)"""

    show_section_header("Reducción de Dimensionalidad", "Proyección de datos de alta dimensión a espacios visualizables")

    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal**.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    if not hasattr(pipeline_manager, 'results') or 'dimensionality_reduction' not in pipeline_manager.results:
        st.warning("⚠️ La reducción de dimensionalidad aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    dimred_results = pipeline_manager.results.get('dimensionality_reduction', {})

    st.markdown("### 📊 Resumen de Métodos Aplicados")

    methods = [k for k in dimred_results.keys() if not k.endswith('_error')]

    # Obtener dimensión original (de cualquier método que tenga datos)
    original_dim = None
    for method in methods:
        if 'transformed_data' in dimred_results[method]:
            original_dim = dimred_results[method]['transformed_data'].shape[1] if len(dimred_results[method]['transformed_data'].shape) > 1 else None
            break

    # Si no hay transformed_data, intentar obtener de otro lugar
    if original_dim is None:
        original_dim = pipeline_manager.results.get('tfidf_matrix', None)
        if original_dim is not None:
            original_dim = original_dim.shape[1]

    col1, col2, col3 = st.columns(3)
    col1.metric("Métodos Aplicados", len(methods))
    col2.metric("Dimensión Original", original_dim if original_dim else "N/A")
    col3.metric("Documentos", len(pipeline_manager.results.get('tfidf_doc_names', [])))

    st.markdown("---")

    # Tabs para cada método + comparación
    tabs = st.tabs(["PCA", "t-SNE", "UMAP", "📊 Comparación"])

    # ============================================================
    # TAB 1: PCA
    # ============================================================
    with tabs[0]:
        st.markdown("### 🔍 Principal Component Analysis (PCA)")

        if 'pca' in dimred_results:
            pca = dimred_results['pca']

            # Métricas principales
            col1, col2, col3 = st.columns(3)
            col1.metric("Componentes", pca.get('n_components', 0))

            explained_var_total = pca.get('cumulative_variance', [0])[-1]
            col2.metric("Varianza Explicada", f"{explained_var_total:.2%}")

            pc1_var = pca.get('explained_variance_ratio', [0])[0]
            col3.metric("Varianza PC1", f"{pc1_var:.2%}")

            st.markdown("---")

            # Gráfico de varianza explicada (Scree Plot)
            st.markdown("#### 📈 Scree Plot - Varianza Explicada por Componente")

            explained_variance_ratio = pca.get('explained_variance_ratio', [])
            if explained_variance_ratio:
                df_variance = pd.DataFrame({
                    'Componente': [f'PC{i+1}' for i in range(len(explained_variance_ratio))],
                    'Varianza Explicada (%)': [v * 100 for v in explained_variance_ratio]
                })

                fig_scree = px.bar(
                    df_variance,
                    x='Componente',
                    y='Varianza Explicada (%)',
                    title='Varianza Explicada por Componente Principal',
                    color='Varianza Explicada (%)',
                    color_continuous_scale='Blues'
                )
                fig_scree.update_layout(height=400, showlegend=False)
                st.plotly_chart(fig_scree, use_container_width=True)

                show_chart_interpretation(
                    chart_type="Scree Plot",
                    title="Varianza Explicada por Componente",
                    interpretation=(
                        "El **Scree Plot** muestra cuánta varianza de los datos originales captura cada componente principal. "
                        "Los primeros componentes capturan la mayor parte de la información, permitiendo reducir dimensionalidad "
                        "sin perder información crítica."
                    ),
                    how_to_read=(
                        "- **Altura de barras**: Porcentaje de varianza explicada por ese componente\\n"
                        "- **Primeros componentes**: Suelen tener mayor varianza (más información)\\n"
                        "- **Componentes finales**: Capturan ruido o variaciones menores"
                    ),
                    what_to_look_for=[
                        "**'Codo'**: El punto donde la caída de varianza se aplana indica componentes óptimos",
                        "**Primeros 2-3 componentes**: Idealmente deberían explicar >70% de varianza",
                        "**Distribución**: ¿Está concentrada en pocos componentes o distribuida uniformemente?"
                    ]
                )

            # Gráfico de varianza acumulada
            st.markdown("#### 📊 Varianza Acumulada")

            cumulative_variance = pca.get('cumulative_variance', [])
            if cumulative_variance:
                df_cumvar = pd.DataFrame({
                    'Componente': list(range(1, len(cumulative_variance) + 1)),
                    'Varianza Acumulada (%)': [v * 100 for v in cumulative_variance]
                })

                fig_cumvar = go.Figure()
                fig_cumvar.add_trace(go.Scatter(
                    x=df_cumvar['Componente'],
                    y=df_cumvar['Varianza Acumulada (%)'],
                    mode='lines+markers',
                    name='Varianza Acumulada',
                    line=dict(color='royalblue', width=3),
                    marker=dict(size=8)
                ))

                # Línea de referencia en 90%
                fig_cumvar.add_hline(
                    y=90,
                    line_dash="dash",
                    line_color="red",
                    annotation_text="90% varianza",
                    annotation_position="right"
                )

                fig_cumvar.update_layout(
                    title='Varianza Acumulada por Número de Componentes',
                    xaxis_title='Número de Componentes',
                    yaxis_title='Varianza Acumulada (%)',
                    height=400
                )
                st.plotly_chart(fig_cumvar, use_container_width=True)

                show_chart_interpretation(
                    chart_type="Varianza Acumulada",
                    title="Retención de Información vs Dimensionalidad",
                    interpretation=(
                        "Este gráfico muestra el **porcentaje acumulado de varianza** capturado al usar N componentes. "
                        "Ayuda a determinar cuántos componentes necesitas para retener cierto porcentaje de información "
                        "(comúnmente 90%, 95% o 99%)."
                    ),
                    how_to_read=(
                        "- **Eje X**: Número de componentes principales\\n"
                        "- **Eje Y**: Porcentaje total de varianza explicada\\n"
                        "- **Línea roja**: Umbral del 90% (valor comúnmente usado)"
                    ),
                    what_to_look_for=[
                        "**Punto del 90%**: ¿Cuántos componentes necesitas para 90% de varianza?",
                        "**Curva pronunciada**: Indica que pocos componentes capturan mucha información",
                        "**Plateau tardío**: Sugiere que los datos tienen alta dimensionalidad intrínseca"
                    ]
                )

            # Scatter Plot 2D (PC1 vs PC2)
            if 'transformed_data' in pca and pca['transformed_data'] is not None:
                st.markdown("#### 🎯 Proyección 2D - Primeros 2 Componentes Principales")

                transformed_data = pca['transformed_data']
                if len(transformed_data.shape) == 2 and transformed_data.shape[1] >= 2:
                    doc_names = pipeline_manager.results.get('tfidf_doc_names', [f"Doc {i+1}" for i in range(transformed_data.shape[0])])

                    df_pca = pd.DataFrame({
                        'PC1': transformed_data[:, 0],
                        'PC2': transformed_data[:, 1],
                        'Documento': doc_names
                    })

                    fig_scatter = px.scatter(
                        df_pca,
                        x='PC1',
                        y='PC2',
                        hover_data=['Documento'],
                        title='Documentos proyectados en espacio PCA (2D)',
                        labels={'PC1': f'PC1 ({pc1_var:.1%} varianza)', 'PC2': f'PC2 ({pca.get("explained_variance_ratio", [0, 0])[1]:.1%} varianza)'}
                    )
                    fig_scatter.update_traces(marker=dict(size=10, opacity=0.7, color='steelblue'))
                    fig_scatter.update_layout(height=600)
                    st.plotly_chart(fig_scatter, use_container_width=True)

                    show_chart_interpretation(
                        chart_type="Scatter Plot 2D - PCA",
                        title="Proyección de Documentos en Espacio Reducido",
                        interpretation=(
                            "Este scatter plot muestra los documentos proyectados en un espacio de **2 dimensiones** (PC1 y PC2). "
                            "Los componentes principales son combinaciones lineales de las features originales que capturan "
                            "la máxima varianza. Documentos cercanos comparten características similares."
                        ),
                        how_to_read=(
                            "- **Ejes**: Componentes principales (direcciones de máxima varianza)\\n"
                            "- **Puntos**: Cada punto es un documento\\n"
                            "- **Distancia**: Documentos cercanos son más similares\\n"
                            "- **% en etiquetas**: Varianza explicada por ese eje"
                        ),
                        what_to_look_for=[
                            "**Clusters**: ¿Se forman grupos naturales de documentos?",
                            "**Outliers**: Documentos alejados pueden ser atípicos o muy diferentes",
                            "**Distribución**: ¿Los documentos se distribuyen uniformemente o hay concentración?",
                            "**Interpretabilidad**: PCA es lineal, los ejes son combinaciones de features originales"
                        ]
                    )

            # Top features por componente
            if 'component_contributions' in pca:
                st.markdown("#### 🏆 Top Features por Componente")

                contributions = pca['component_contributions']
                for comp in contributions[:3]:  # Mostrar solo primeros 3 componentes
                    with st.expander(f"🔹 PC{comp['component']} - {comp['variance_explained']:.2%} varianza"):
                        top_features = comp['top_features'][:10]
                        df_features = pd.DataFrame(top_features)

                        fig_features = px.bar(
                            df_features,
                            x='abs_loading',
                            y='feature',
                            orientation='h',
                            title=f'Top 10 Features - PC{comp["component"]}',
                            labels={'abs_loading': 'Loading (importancia)', 'feature': 'Feature'},
                            color='abs_loading',
                            color_continuous_scale='Greens'
                        )
                        fig_features.update_layout(yaxis={'categoryorder': 'total ascending'}, height=400)
                        st.plotly_chart(fig_features, use_container_width=True)

            # Dimensionalidad óptima
            if 'optimal_dimensions' in pca:
                st.markdown("#### 💡 Recomendación de Dimensionalidad")
                optimal = pca['optimal_dimensions']

                col1, col2, col3 = st.columns(3)
                col1.metric("90% varianza", f"{optimal['90_percent']} componentes")
                col2.metric("95% varianza", f"{optimal['95_percent']} componentes")
                col3.metric("99% varianza", f"{optimal['99_percent']} componentes")

                st.info(
                    f"💡 **Recomendación**: Para retener **90% de la información**, necesitas "
                    f"**{optimal['90_percent']} componentes** de un total de {optimal['total_components']}. "
                    f"Esto reduce la dimensionalidad en **{(1 - optimal['90_percent']/optimal['total_components'])*100:.1f}%**."
                )

        else:
            st.warning("❌ PCA no completado o error en ejecución")
            if 'pca_error' in dimred_results:
                st.error(f"Error: {dimred_results['pca_error']}")

    # ============================================================
    # TAB 2: t-SNE
    # ============================================================
    with tabs[1]:
        st.markdown("### 🔍 t-Distributed Stochastic Neighbor Embedding (t-SNE)")

        if 'tsne' in dimred_results:
            tsne = dimred_results['tsne']

            # Métricas principales
            col1, col2, col3 = st.columns(3)
            col1.metric("Componentes", tsne.get('n_components', 0))
            col2.metric("Perplexity", tsne.get('perplexity', 0))
            col3.metric("KL Divergence", f"{tsne.get('kl_divergence', 0):.4f}")

            st.markdown("---")

            # Scatter Plot 2D
            if 'transformed_data' in tsne and tsne['transformed_data'] is not None:
                st.markdown("#### 🎯 Proyección t-SNE (2D)")

                transformed_data = tsne['transformed_data']
                if len(transformed_data.shape) == 2 and transformed_data.shape[1] >= 2:
                    doc_names = pipeline_manager.results.get('tfidf_doc_names', [f"Doc {i+1}" for i in range(transformed_data.shape[0])])

                    df_tsne = pd.DataFrame({
                        'Dim 1': transformed_data[:, 0],
                        'Dim 2': transformed_data[:, 1],
                        'Documento': doc_names
                    })

                    fig_scatter = px.scatter(
                        df_tsne,
                        x='Dim 1',
                        y='Dim 2',
                        hover_data=['Documento'],
                        title='Documentos proyectados con t-SNE (2D)',
                    )
                    fig_scatter.update_traces(marker=dict(size=10, opacity=0.7, color='orange'))
                    fig_scatter.update_layout(height=600)
                    st.plotly_chart(fig_scatter, use_container_width=True)

                    show_chart_interpretation(
                        chart_type="Scatter Plot 2D - t-SNE",
                        title="Proyección No-Lineal de Documentos",
                        interpretation=(
                            "**t-SNE** es una técnica **no-lineal** que preserva la **estructura local** de los datos. "
                            "Es excelente para descubrir clusters y patrones no lineales que PCA (lineal) no puede capturar. "
                            "Los grupos cerrados indican documentos muy similares."
                        ),
                        how_to_read=(
                            "- **Clusters densos**: Grupos de documentos muy similares\\n"
                            "- **Distancias locales**: Preservadas (cercanos son similares)\\n"
                            "- **Distancias globales**: NO preservadas (lejanos ≠ necesariamente disímiles)\\n"
                            "- **Ejes**: No tienen interpretación directa (son proyecciones no lineales)"
                        ),
                        what_to_look_for=[
                            "**Clusters bien definidos**: ¿Se forman grupos claros y separados?",
                            "**Superposición**: ¿Hay solapamiento entre clusters o están bien separados?",
                            "**Estructura**: ¿Hay subclusters dentro de clusters principales?",
                            "**Comparar con PCA**: ¿t-SNE revela clusters que PCA no muestra?"
                        ]
                    )

            # Métricas de calidad
            if 'distance_preservation' in tsne:
                st.markdown("#### 📊 Métricas de Calidad del Embedding")

                dist_pres = tsne['distance_preservation']

                col1, col2 = st.columns(2)
                col1.metric("Correlación de Distancias", f"{dist_pres['correlation']:.4f}")
                col2.metric("Iteraciones Realizadas", tsne.get('n_iter_final', 'N/A'))

                st.info(
                    f"💡 **Interpretación**: Una correlación de {dist_pres['correlation']:.3f} indica que t-SNE "
                    f"{'preserva bien' if dist_pres['correlation'] > 0.5 else 'preserva parcialmente'} las distancias "
                    f"entre puntos cercanos. KL Divergence: {tsne.get('kl_divergence', 0):.4f} "
                    f"(menor es mejor)."
                )

            st.markdown("#### ⚙️ Parámetros Utilizados")
            st.json({
                'n_components': tsne.get('n_components'),
                'perplexity': tsne.get('perplexity'),
                'learning_rate': tsne.get('learning_rate'),
                'n_iter': tsne.get('n_iter')
            })

        else:
            st.warning("❌ t-SNE no completado o error en ejecución")
            if 'tsne_error' in dimred_results:
                st.error(f"Error: {dimred_results['tsne_error']}")

    # ============================================================
    # TAB 3: UMAP
    # ============================================================
    with tabs[2]:
        st.markdown("### 🔍 Uniform Manifold Approximation and Projection (UMAP)")

        if 'umap' in dimred_results and 'error' not in dimred_results['umap']:
            umap = dimred_results['umap']

            # Métricas principales
            col1, col2, col3 = st.columns(3)
            col1.metric("Componentes", umap.get('n_components', 0))
            col2.metric("Vecinos", umap.get('n_neighbors', 0))
            col3.metric("Min Distance", umap.get('min_dist', 0))

            st.markdown("---")

            # Scatter Plot 2D
            if 'transformed_data' in umap and umap['transformed_data'] is not None:
                st.markdown("#### 🎯 Proyección UMAP (2D)")

                transformed_data = umap['transformed_data']
                if len(transformed_data.shape) == 2 and transformed_data.shape[1] >= 2:
                    doc_names = pipeline_manager.results.get('tfidf_doc_names', [f"Doc {i+1}" for i in range(transformed_data.shape[0])])

                    df_umap = pd.DataFrame({
                        'Dim 1': transformed_data[:, 0],
                        'Dim 2': transformed_data[:, 1],
                        'Documento': doc_names
                    })

                    fig_scatter = px.scatter(
                        df_umap,
                        x='Dim 1',
                        y='Dim 2',
                        hover_data=['Documento'],
                        title='Documentos proyectados con UMAP (2D)',
                    )
                    fig_scatter.update_traces(marker=dict(size=10, opacity=0.7, color='purple'))
                    fig_scatter.update_layout(height=600)
                    st.plotly_chart(fig_scatter, use_container_width=True)

                    show_chart_interpretation(
                        chart_type="Scatter Plot 2D - UMAP",
                        title="Proyección que Balancea Estructura Local y Global",
                        interpretation=(
                            "**UMAP** es una técnica moderna que preserva **tanto estructura local como global**. "
                            "Es más rápido que t-SNE y tiende a preservar mejor las distancias entre clusters. "
                            "Excelente para descubrir la topología verdadera de los datos."
                        ),
                        how_to_read=(
                            "- **Clusters**: Grupos de documentos similares\\n"
                            "- **Estructura local**: Documentos cercanos son similares\\n"
                            "- **Estructura global**: Distancias entre clusters son más confiables que en t-SNE\\n"
                            "- **Topología**: UMAP preserva la estructura topológica (conectividad)"
                        ),
                        what_to_look_for=[
                            "**Clusters más compactos**: UMAP tiende a crear clusters más densos que t-SNE",
                            "**Separación global**: ¿Están los clusters bien separados?",
                            "**Subclusters**: ¿Hay estructuras jerárquicas?",
                            "**Comparar con t-SNE**: ¿UMAP muestra estructura similar o diferente?"
                        ]
                    )

            # Métricas de calidad
            if 'distance_preservation' in umap:
                st.markdown("#### 📊 Métricas de Calidad del Embedding")

                dist_pres = umap['distance_preservation']
                embedding_quality = umap.get('embedding_quality', {})

                col1, col2 = st.columns(2)
                col1.metric("Correlación de Distancias", f"{dist_pres['correlation']:.4f}")
                col2.metric("Spread", f"{embedding_quality.get('spread', 0):.4f}")

                st.info(
                    f"💡 **Interpretación**: UMAP logró una correlación de {dist_pres['correlation']:.3f} "
                    f"en la preservación de distancias. Un spread de {embedding_quality.get('spread', 0):.3f} "
                    f"indica {'buena separación' if embedding_quality.get('spread', 0) > 1 else 'clusters compactos'}."
                )

            st.markdown("#### ⚙️ Parámetros Utilizados")
            st.json({
                'n_components': umap.get('n_components'),
                'n_neighbors': umap.get('n_neighbors'),
                'min_dist': umap.get('min_dist'),
                'metric': umap.get('metric')
            })

        else:
            st.info("ℹ️ UMAP no está disponible o no se ejecutó correctamente")
            if 'umap' in dimred_results and 'error' in dimred_results['umap']:
                st.warning(f"⚠️ {dimred_results['umap'].get('message', dimred_results['umap'].get('error', ''))}")

    # ============================================================
    # TAB 4: COMPARACIÓN
    # ============================================================
    with tabs[3]:
        st.markdown("### 📊 Comparación de Métodos")

        # Tabla comparativa
        st.markdown("#### 🎯 Características de Cada Método")

        comparison_data = []

        if 'pca' in dimred_results:
            pca_var = dimred_results['pca'].get('cumulative_variance', [0])[-1]
            comparison_data.append({
                'Método': 'PCA',
                'Tipo': 'Lineal',
                'Preserva': 'Varianza Global',
                'Interpretable': 'Sí',
                'Costo Computacional': 'Bajo',
                'Métrica Principal': f"{pca_var:.2%} varianza",
                'Ventajas': 'Rápido, interpretable, determinístico',
                'Desventajas': 'Solo captura relaciones lineales'
            })

        if 'tsne' in dimred_results:
            tsne_kl = dimred_results['tsne'].get('kl_divergence', 0)
            comparison_data.append({
                'Método': 't-SNE',
                'Tipo': 'No-Lineal',
                'Preserva': 'Estructura Local',
                'Interpretable': 'No',
                'Costo Computacional': 'Alto',
                'Métrica Principal': f"KL: {tsne_kl:.4f}",
                'Ventajas': 'Excelente para visualización de clusters',
                'Desventajas': 'No preserva distancias globales, lento'
            })

        if 'umap' in dimred_results and 'error' not in dimred_results['umap']:
            umap_corr = dimred_results['umap'].get('distance_preservation', {}).get('correlation', 0)
            comparison_data.append({
                'Método': 'UMAP',
                'Tipo': 'No-Lineal',
                'Preserva': 'Local + Global',
                'Interpretable': 'No',
                'Costo Computacional': 'Medio',
                'Métrica Principal': f"Corr: {umap_corr:.4f}",
                'Ventajas': 'Balance local/global, más rápido que t-SNE',
                'Desventajas': 'Hiperparámetros sensibles'
            })

        if comparison_data:
            df_comparison = pd.DataFrame(comparison_data)
            st.dataframe(df_comparison, use_container_width=True, height=250)

            show_chart_interpretation(
                chart_type="Tabla Comparativa",
                title="Elección del Método Apropiado",
                interpretation=(
                    "Cada método de reducción de dimensionalidad tiene **trade-offs** entre interpretabilidad, "
                    "preservación de estructura y costo computacional. La elección depende del objetivo del análisis."
                ),
                how_to_read=(
                    "- **Tipo**: Lineal vs No-Lineal (capacidad de capturar relaciones complejas)\\n"
                    "- **Preserva**: Qué aspecto de los datos prioriza\\n"
                    "- **Interpretable**: ¿Los ejes/componentes tienen significado directo?\\n"
                    "- **Costo**: Tiempo de ejecución y recursos necesarios"
                ),
                what_to_look_for=[
                    "**Para interpretabilidad**: Usar PCA (componentes = combinaciones lineales de features)",
                    "**Para visualización**: Usar t-SNE o UMAP (revelan clusters no lineales)",
                    "**Para preservar topología**: Usar UMAP (balancea local/global)",
                    "**Para velocidad**: PCA es el más rápido"
                ]
            )

        st.markdown("---")
        st.markdown("### 💡 Recomendaciones por Caso de Uso")

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**Análisis Exploratorio:**")
            st.markdown("""
            - **Primero**: PCA para entender varianza y dimensionalidad intrínseca
            - **Luego**: t-SNE o UMAP para descubrir clusters visuales
            - **Comparar**: ¿Los clusters aparecen en ambos métodos?
            """)

            st.markdown("**Feature Selection:**")
            st.markdown("""
            - **Usar**: PCA con análisis de loadings
            - **Identificar**: Features con alto loading en primeros componentes
            - **Reducir**: Eliminar features con bajo loading en todos los componentes
            """)

        with col2:
            st.markdown("**Preparación para ML:**")
            st.markdown("""
            - **Clasificación**: PCA para reducir dimensiones antes de entrenar
            - **Clustering**: UMAP + K-Means (UMAP preserva estructura para clustering)
            - **Anomalías**: t-SNE para visualizar outliers
            """)

            st.markdown("**Interpretación para Tesis:**")
            st.markdown("""
            - **PCA**: Reportar varianza explicada, scree plot, top features
            - **t-SNE/UMAP**: Visualizar clusters, validar con métricas de clustering
            - **Comparar**: Discutir diferencias entre métodos lineales vs no-lineales
            """)

    st.markdown("---")
    st.success("✅ **Reducción de dimensionalidad completada** - 3 métodos aplicados con visualizaciones completas")

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

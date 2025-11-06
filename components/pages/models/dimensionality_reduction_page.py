"""
Página de Reducción de Dimensionalidad
Análisis visual detallado de PCA, t-SNE, UMAP y Factor Analysis
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from datetime import datetime
import json
import pickle
import os
from pathlib import Path

from components.ui.helpers import get_or_load_cached_results
from src.models.dimensionality_reduction import DimensionalityReducer


def load_from_cache(data_type):
    """
    Carga datos desde caché local

    Args:
        data_type: 'tfidf' o 'bow'

    Returns:
        (matrix, feature_names) o (None, None)
    """
    try:
        # Buscar archivos de caché
        cache_dir = Path('.cache')

        if not cache_dir.exists():
            return None, None

        # Buscar el archivo más reciente
        if data_type == 'tfidf':
            pattern = 'tfidf_*.pkl'
        else:
            pattern = 'bow_*.pkl'

        cache_files = list(cache_dir.glob(pattern))

        if not cache_files:
            return None, None

        # Ordenar por fecha de modificación (más reciente primero)
        cache_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        latest_cache = cache_files[0]

        # Cargar desde pickle
        with open(latest_cache, 'rb') as f:
            data = pickle.load(f)

        matrix = data.get('matrix')
        feature_names = data.get('feature_names')

        if matrix is not None and feature_names is not None:
            return matrix, feature_names

        return None, None

    except Exception as e:
        print(f"Error cargando caché: {e}")
        return None, None


def generate_tfidf_quick():
    """Genera TF-IDF rápido con parámetros por defecto"""
    from sklearn.feature_extraction.text import TfidfVectorizer

    texts = st.session_state.preprocessed_texts
    corpus = list(texts.values())

    # Crear vectorizador con parámetros por defecto
    vectorizer = TfidfVectorizer(
        max_features=5000,
        min_df=2,
        max_df=0.95
    )

    # Generar matriz
    tfidf_matrix = vectorizer.fit_transform(corpus)
    feature_names = vectorizer.get_feature_names_out().tolist()

    # Guardar en session_state
    st.session_state.tfidf_matrix = tfidf_matrix
    st.session_state.tfidf_feature_names = feature_names


def generate_bow_quick():
    """Genera BoW rápido con parámetros por defecto"""
    from sklearn.feature_extraction.text import CountVectorizer

    texts = st.session_state.preprocessed_texts
    corpus = list(texts.values())

    # Crear vectorizador con parámetros por defecto
    vectorizer = CountVectorizer(
        max_features=5000,
        min_df=2,
        max_df=0.95
    )

    # Generar matriz
    bow_matrix = vectorizer.fit_transform(corpus)
    feature_names = vectorizer.get_feature_names_out().tolist()

    # Guardar en session_state
    st.session_state.bow_matrix = bow_matrix
    st.session_state.bow_feature_names = feature_names


def render():
    """Renderiza la página de reducción de dimensionalidad"""

    st.title("📉 Reducción de Dimensionalidad")
    st.markdown("""
    ### Análisis Profundo de Técnicas de Reducción
    Explora cómo cada método transforma tus datos de alta dimensión a espacios de baja dimensión.

    **Técnicas Disponibles:**
    - **Filtros**: Varianza baja y alta correlación
    - **PCA**: Principal Component Analysis (lineal)
    - **t-SNE**: t-Distributed Stochastic Neighbor Embedding (no lineal)
    - **UMAP**: Uniform Manifold Approximation and Projection (no lineal)
    - **Factor Analysis**: Análisis de factores latentes
    """)

    # Inicializar reductor
    if 'dimensionality_reducer' not in st.session_state:
        st.session_state.dimensionality_reducer = DimensionalityReducer()

    # Tabs principales
    tabs = st.tabs([
        "📊 Preparación",
        "🔍 Filtros",
        "🎯 PCA",
        "🌀 t-SNE",
        "🗺️ UMAP",
        "📐 Factor Analysis",
        "⚖️ Comparación",
        "💾 Exportar"
    ])

    # Tab 1: Preparación de datos
    with tabs[0]:
        render_preparation_tab()

    # Tab 2: Filtros
    with tabs[1]:
        render_filters_tab()

    # Tab 3: PCA
    with tabs[2]:
        render_pca_tab()

    # Tab 4: t-SNE
    with tabs[3]:
        render_tsne_tab()

    # Tab 5: UMAP
    with tabs[4]:
        render_umap_tab()

    # Tab 6: Factor Analysis
    with tabs[5]:
        render_factor_analysis_tab()

    # Tab 7: Comparación
    with tabs[6]:
        render_comparison_tab()

    # Tab 8: Exportar
    with tabs[7]:
        render_export_tab()


def render_preparation_tab():
    """Tab de preparación de datos"""

    st.header("📊 Preparación de Datos")

    st.info("""
    La reducción de dimensionalidad requiere una matriz de features numéricos.
    Puedes usar resultados de **TF-IDF** o **Bolsa de Palabras**.
    """)

    # Seleccionar fuente de datos
    data_source = st.radio(
        "Seleccionar fuente de datos:",
        ["TF-IDF", "Bolsa de Palabras (BoW)"]
    )

    matrix = None
    feature_names = None

    if data_source == "TF-IDF":
        # Intentar cargar desde session_state
        if 'tfidf_matrix' in st.session_state and st.session_state.tfidf_matrix is not None:
            matrix = st.session_state.tfidf_matrix.toarray()
            feature_names = st.session_state.tfidf_feature_names
            st.success("✓ Datos TF-IDF cargados desde sesión actual")
        # Auto-intentar cargar desde procesador (si existe)
        elif 'procesador' in st.session_state and hasattr(st.session_state.procesador, 'tfidf_matrix'):
            if st.session_state.procesador.tfidf_matrix is not None:
                matrix = st.session_state.procesador.tfidf_matrix.toarray()
                feature_names = st.session_state.procesador.tfidf_feature_names
                # Guardar en session_state para siguiente uso
                st.session_state.tfidf_matrix = st.session_state.procesador.tfidf_matrix
                st.session_state.tfidf_feature_names = feature_names
                st.success("✓ Datos TF-IDF cargados desde procesador de texto")
        else:
            # No hay datos disponibles
            st.warning("⚠️ No hay datos TF-IDF disponibles en la sesión actual")

            st.info("""
            **Para usar TF-IDF en Reducción de Dimensionalidad:**

            **Opción 1 (Recomendada):** Ejecutar TF-IDF en esta sesión
            1. Ve a la pestaña **7. Análisis TF-IDF**
            2. Configura los parámetros
            3. Ejecuta el análisis
            4. Vuelve a esta pestaña

            **Opción 2:** Generar TF-IDF rápido aquí
            - Usa el botón de abajo para generar TF-IDF con parámetros por defecto
            """)

            col1, col2 = st.columns(2)

            with col1:
                if st.button("🚀 Generar TF-IDF Rápido", type="primary"):
                    # Primero intentar cargar preprocesamiento desde Drive
                    if 'preprocessed_texts' not in st.session_state or not st.session_state.preprocessed_texts:
                        if st.session_state.get('parent_folder_id'):
                            with st.spinner("🔍 Buscando datos preprocesados en Drive..."):
                                preprocessing_results, _ = get_or_load_cached_results(
                                    "04_TXT_Preprocessed",
                                    "preprocessing_results.json",
                                    validate_file_ids=False
                                )

                                if preprocessing_results and 'documents' in preprocessing_results:
                                    preprocessed_texts = {}
                                    for doc_name, doc_data in preprocessing_results['documents'].items():
                                        preprocessed_texts[doc_name] = ' '.join(doc_data.get('tokens', []))
                                    st.session_state.preprocessed_texts = preprocessed_texts
                                    st.session_state.preprocessing_results = preprocessing_results
                                else:
                                    st.error("❌ No hay textos preprocesados. Ejecuta **5. Preprocesamiento** primero.")
                                    st.stop()
                        else:
                            st.error("❌ No hay textos preprocesados. Ejecuta **5. Preprocesamiento** primero.")
                            st.stop()

                    with st.spinner("Generando TF-IDF..."):
                        generate_tfidf_quick()
                        st.success("✓ TF-IDF generado!")
                        st.rerun()

            with col2:
                if st.button("🔄 Intentar Cargar desde Caché"):
                    with st.spinner("Buscando en caché..."):
                        matrix, feature_names = load_from_cache("tfidf")

                        if matrix is not None:
                            from scipy.sparse import csr_matrix
                            st.session_state.tfidf_matrix = csr_matrix(matrix)
                            st.session_state.tfidf_feature_names = feature_names
                            st.success("✓ TF-IDF cargado desde caché!")
                            st.rerun()
                        else:
                            st.error("❌ No se encontró en caché.")

            return

    else:  # BoW
        # Intentar cargar desde session_state
        if 'bow_matrix' in st.session_state and st.session_state.bow_matrix is not None:
            matrix = st.session_state.bow_matrix.toarray()
            feature_names = st.session_state.bow_feature_names
            st.success("✓ Datos BoW cargados desde sesión actual")
        # Auto-intentar cargar desde procesador (si existe)
        elif 'procesador' in st.session_state and hasattr(st.session_state.procesador, 'bow_matrix'):
            if st.session_state.procesador.bow_matrix is not None:
                matrix = st.session_state.procesador.bow_matrix.toarray()
                feature_names = st.session_state.procesador.bow_feature_names
                # Guardar en session_state para siguiente uso
                st.session_state.bow_matrix = st.session_state.procesador.bow_matrix
                st.session_state.bow_feature_names = feature_names
                st.success("✓ Datos BoW cargados desde procesador de texto")
        else:
            # No hay datos disponibles
            st.warning("⚠️ No hay datos BoW disponibles en la sesión actual")

            st.info("""
            **Para usar BoW en Reducción de Dimensionalidad:**

            **Opción 1 (Recomendada):** Ejecutar BoW en esta sesión
            1. Ve a la pestaña **6. Bolsa de Palabras**
            2. Configura los parámetros
            3. Ejecuta el análisis
            4. Vuelve a esta pestaña

            **Opción 2:** Generar BoW rápido aquí
            - Usa el botón de abajo para generar BoW con parámetros por defecto
            """)

            col1, col2 = st.columns(2)

            with col1:
                if st.button("🚀 Generar BoW Rápido", type="primary"):
                    if 'preprocessed_texts' not in st.session_state or not st.session_state.preprocessed_texts:
                        st.error("❌ No hay textos preprocesados. Ejecuta **5. Preprocesamiento** primero.")
                    else:
                        with st.spinner("Generando BoW..."):
                            generate_bow_quick()
                            st.success("✓ BoW generado!")
                            st.rerun()

            with col2:
                if st.button("🔄 Intentar Cargar desde Caché"):
                    with st.spinner("Buscando en caché..."):
                        matrix, feature_names = load_from_cache("bow")

                        if matrix is not None:
                            from scipy.sparse import csr_matrix
                            st.session_state.bow_matrix = csr_matrix(matrix)
                            st.session_state.bow_feature_names = feature_names
                            st.success("✓ BoW cargado desde caché!")
                            st.rerun()
                        else:
                            st.error("❌ No se encontró en caché.")

            return

    if matrix is None or feature_names is None:
        return

    st.success(f"✓ Datos cargados: {matrix.shape[0]} documentos × {matrix.shape[1]} features")

    st.markdown("---")

    # Información de los datos
    st.subheader("📈 Estadísticas de los Datos")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Documentos", matrix.shape[0])

    with col2:
        st.metric("Features", matrix.shape[1])

    with col3:
        sparsity = np.sum(matrix == 0) / matrix.size
        st.metric("Sparsity", f"{sparsity:.1%}")

    with col4:
        density = 1 - sparsity
        st.metric("Density", f"{density:.1%}")

    # Distribución de valores
    with st.expander("📊 Distribución de Valores", expanded=False):
        col1, col2 = st.columns(2)

        with col1:
            # Histograma de valores no-cero
            non_zero_values = matrix[matrix > 0].flatten()

            if len(non_zero_values) > 0:
                fig = go.Figure()
                fig.add_trace(go.Histogram(
                    x=non_zero_values,
                    nbinsx=50,
                    name='Valores no-cero'
                ))
                fig.update_layout(
                    title='Distribución de Valores No-Cero',
                    xaxis_title='Valor',
                    yaxis_title='Frecuencia'
                )
                st.plotly_chart(fig, width='stretch')

        with col2:
            # Top features por varianza
            variances = np.var(matrix, axis=0)
            top_indices = np.argsort(variances)[::-1][:20]

            df_var = pd.DataFrame({
                'Feature': [feature_names[i] for i in top_indices],
                'Varianza': variances[top_indices]
            })

            fig = px.bar(
                df_var,
                x='Varianza',
                y='Feature',
                orientation='h',
                title='Top 20 Features por Varianza'
            )
            fig.update_yaxes(autorange="reversed")
            st.plotly_chart(fig, width='stretch')

    st.markdown("---")

    # Botón para preparar datos
    if st.button("🚀 Preparar Datos para Reducción", type="primary", width='stretch'):
        with st.spinner("Preparando datos..."):
            reducer = st.session_state.dimensionality_reducer

            stats = reducer.prepare_data(matrix, feature_names)

            st.session_state.dim_reduction_prepared = True
            st.session_state.dim_reduction_data_source = data_source

            st.success("✓ Datos preparados correctamente")

            # Mostrar stats
            col1, col2 = st.columns(2)

            with col1:
                st.write("**Estadísticas:**")
                st.write(f"- Samples: {stats['n_samples']}")
                st.write(f"- Features: {stats['n_features']}")
                st.write(f"- Sparsity: {stats['sparsity']:.2%}")

            with col2:
                st.write("**Rango de valores (escalados):**")
                st.write(f"- Media: {np.mean(stats['mean']):.4f}")
                st.write(f"- Desv. Std: {np.mean(stats['std']):.4f}")


def render_filters_tab():
    """Tab de filtros de features"""

    st.header("🔍 Filtros de Features")

    if not st.session_state.get('dim_reduction_prepared', False):
        st.warning("⚠️ Prepara los datos primero en la pestaña **Preparación**")
        return

    reducer = st.session_state.dimensionality_reducer

    st.markdown("""
    Los filtros reducen dimensionalidad eliminando features poco informativos:
    - **Baja Varianza**: Elimina features con variación mínima
    - **Alta Correlación**: Elimina features redundantes
    """)

    # Subtabs para cada filtro
    filter_tabs = st.tabs(["🔻 Baja Varianza", "🔗 Alta Correlación"])

    # Filtro de baja varianza
    with filter_tabs[0]:
        st.subheader("Filtro de Baja Varianza")

        st.info("Elimina features cuya varianza está por debajo de un umbral")

        threshold = st.slider(
            "Umbral de varianza:",
            0.0, 0.5, 0.01, 0.01,
            help="Features con varianza < umbral serán eliminados"
        )

        if st.button("🔍 Aplicar Filtro de Baja Varianza", key="btn_low_var"):
            with st.spinner("Aplicando filtro..."):
                results = reducer.filter_low_variance(threshold=threshold)

                st.success(f"✓ Reducción: {results['reduction_ratio']:.1%}")

                # Mostrar resultados
                col1, col2, col3 = st.columns(3)

                with col1:
                    st.metric("Features Originales", results['original_features'])

                with col2:
                    st.metric("Features Conservadas", results['kept_features'])

                with col3:
                    st.metric("Features Removidas", results['removed_features'])

                # Visualización de varianzas
                st.markdown("---")
                st.subheader("📊 Análisis de Varianzas")

                variances = np.array(results['variances'])
                feature_names = reducer.feature_names

                df_var = pd.DataFrame({
                    'Feature': feature_names,
                    'Varianza': variances,
                    'Estado': ['Conservada' if v >= threshold else 'Removida' for v in variances]
                })

                df_var = df_var.sort_values('Varianza', ascending=False)

                # Gráfico
                fig = px.scatter(
                    df_var,
                    x=range(len(df_var)),
                    y='Varianza',
                    color='Estado',
                    hover_data=['Feature'],
                    title='Distribución de Varianzas de Features',
                    color_discrete_map={'Conservada': 'green', 'Removida': 'red'}
                )

                fig.add_hline(
                    y=threshold,
                    line_dash="dash",
                    line_color="blue",
                    annotation_text=f"Umbral: {threshold}"
                )

                st.plotly_chart(fig, width='stretch')

                # Tabla de features removidas
                if results['removed_features'] > 0:
                    with st.expander("🗑️ Features Removidas", expanded=False):
                        df_removed = df_var[df_var['Estado'] == 'Removida']
                        st.dataframe(df_removed, width='stretch')

    # Filtro de alta correlación
    with filter_tabs[1]:
        st.subheader("Filtro de Alta Correlación")

        st.info("Elimina features redundantes que están altamente correlacionadas")

        threshold_corr = st.slider(
            "Umbral de correlación:",
            0.5, 0.99, 0.9, 0.05,
            help="|Correlación| > umbral → eliminar uno de los features"
        )

        if st.button("🔍 Aplicar Filtro de Alta Correlación", key="btn_high_corr"):
            with st.spinner("Aplicando filtro..."):
                results = reducer.filter_high_correlation(threshold=threshold_corr)

                st.success(f"✓ Reducción: {results['reduction_ratio']:.1%}")

                # Mostrar resultados
                col1, col2, col3 = st.columns(3)

                with col1:
                    st.metric("Features Originales", results['original_features'])

                with col2:
                    st.metric("Pares Correlacionados", len(results['high_corr_pairs']))

                with col3:
                    st.metric("Features Removidas", results['removed_features'])

                # Heatmap de correlación
                if len(results['high_corr_pairs']) > 0:
                    st.markdown("---")
                    st.subheader("🔥 Pares Altamente Correlacionados")

                    df_pairs = pd.DataFrame(results['high_corr_pairs'])
                    df_pairs = df_pairs.sort_values('correlation', key=abs, ascending=False)

                    st.dataframe(df_pairs, width='stretch')

                    # Visualización
                    if st.checkbox("Mostrar matriz de correlación completa", key="show_corr_matrix"):
                        corr_matrix = np.array(results['correlation_matrix'])

                        # Limitar tamaño para visualización
                        max_features = 50
                        if len(corr_matrix) > max_features:
                            st.warning(f"Mostrando solo {max_features} features para mejor visualización")
                            corr_matrix = corr_matrix[:max_features, :max_features]
                            feature_names_plot = reducer.feature_names[:max_features]
                        else:
                            feature_names_plot = reducer.feature_names

                        fig = go.Figure(data=go.Heatmap(
                            z=corr_matrix,
                            x=feature_names_plot,
                            y=feature_names_plot,
                            colorscale='RdBu',
                            zmid=0,
                            text=np.round(corr_matrix, 2),
                            hovertemplate='%{x} vs %{y}<br>Corr: %{z:.3f}<extra></extra>'
                        ))

                        fig.update_layout(
                            title='Matriz de Correlación',
                            height=600,
                            xaxis_tickangle=-45
                        )

                        st.plotly_chart(fig, width='stretch')


def render_pca_tab():
    """Tab de PCA con análisis detallado"""

    st.header("🎯 Principal Component Analysis (PCA)")

    if not st.session_state.get('dim_reduction_prepared', False):
        st.warning("⚠️ Prepara los datos primero en la pestaña **Preparación**")
        return

    reducer = st.session_state.dimensionality_reducer

    st.markdown("""
    **PCA** es una técnica lineal que encuentra las direcciones de máxima varianza.

    **Características:**
    - ✅ Lineal y determinístico
    - ✅ Preserva varianza global
    - ✅ Componentes ortogonales
    - ✅ Interpretable (loadings)
    """)

    st.markdown("---")

    # Configuración
    st.subheader("⚙️ Configuración")

    col1, col2 = st.columns(2)

    with col1:
        n_components = st.slider(
            "Número de componentes:",
            2, min(10, reducer.scaled_data.shape[1]), 2, 1
        )

    with col2:
        analyze_detailed = st.checkbox(
            "Análisis detallado",
            value=True,
            help="Incluye loadings, varianza explicada, etc."
        )

    if st.button("🚀 Aplicar PCA", type="primary", width='stretch'):
        with st.spinner("Aplicando PCA..."):
            results = reducer.apply_pca(n_components=n_components, analyze=analyze_detailed)

            st.session_state.pca_results = results

            st.success("✓ PCA aplicado exitosamente")

    # Mostrar resultados si existen
    if 'pca_results' in st.session_state:
        results = st.session_state.pca_results

        st.markdown("---")
        st.subheader("📊 Resultados de PCA")

        # Métricas principales
        col1, col2, col3 = st.columns(3)

        with col1:
            st.metric(
                "Componentes",
                results['n_components']
            )

        with col2:
            st.metric(
                "Varianza PC1",
                f"{results['explained_variance_ratio'][0]:.2%}"
            )

        with col3:
            st.metric(
                "Varianza Total",
                f"{results['cumulative_variance'][-1]:.2%}"
            )

        # Gráfico de varianza explicada
        st.markdown("---")
        st.subheader("📈 Varianza Explicada")

        col1, col2 = st.columns(2)

        with col1:
            # Varianza por componente
            fig = go.Figure()

            fig.add_trace(go.Bar(
                x=[f'PC{i+1}' for i in range(results['n_components'])],
                y=results['explained_variance_ratio'],
                name='Varianza Individual',
                marker_color='lightblue'
            ))

            fig.update_layout(
                title='Varianza Explicada por Componente',
                xaxis_title='Componente',
                yaxis_title='Varianza Explicada',
                yaxis_tickformat='.0%'
            )

            st.plotly_chart(fig, width='stretch')

        with col2:
            # Varianza acumulada
            fig = go.Figure()

            fig.add_trace(go.Scatter(
                x=[f'PC{i+1}' for i in range(results['n_components'])],
                y=results['cumulative_variance'],
                mode='lines+markers',
                name='Varianza Acumulada',
                line=dict(color='darkblue', width=3),
                marker=dict(size=10)
            ))

            fig.add_hline(
                y=0.9,
                line_dash="dash",
                line_color="red",
                annotation_text="90%"
            )

            fig.update_layout(
                title='Varianza Acumulada',
                xaxis_title='Componente',
                yaxis_title='Varianza Acumulada',
                yaxis_tickformat='.0%'
            )

            st.plotly_chart(fig, width='stretch')

        # Dimensionalidad óptima
        if 'optimal_dimensions' in results:
            st.markdown("---")
            st.subheader("🎯 Dimensionalidad Óptima")

            opt = results['optimal_dimensions']

            col1, col2, col3, col4 = st.columns(4)

            with col1:
                st.metric("Total Componentes", opt['total_components'])

            with col2:
                st.metric("Para 90% varianza", opt['90_percent'])

            with col3:
                st.metric("Para 95% varianza", opt['95_percent'])

            with col4:
                st.metric("Para 99% varianza", opt['99_percent'])

        # Loadings (contribuciones de features)
        if 'component_contributions' in results:
            st.markdown("---")
            st.subheader("🔍 Interpretación de Componentes")

            st.info("""
            Los **loadings** muestran qué features contribuyen más a cada componente principal.
            Features con loadings altos (en valor absoluto) definen el significado del componente.
            """)

            for comp_data in results['component_contributions']:
                with st.expander(
                    f"📌 PC{comp_data['component']} "
                    f"({comp_data['variance_explained']:.2%} varianza)",
                    expanded=(comp_data['component'] <= 2)
                ):
                    # Top features
                    df_loadings = pd.DataFrame(comp_data['top_features'])

                    col1, col2 = st.columns([2, 1])

                    with col1:
                        # Gráfico de loadings
                        fig = go.Figure()

                        colors = ['green' if x > 0 else 'red' for x in df_loadings['loading']]

                        fig.add_trace(go.Bar(
                            x=df_loadings['loading'],
                            y=df_loadings['feature'],
                            orientation='h',
                            marker_color=colors
                        ))

                        fig.update_layout(
                            title=f'Top Features - PC{comp_data["component"]}',
                            xaxis_title='Loading',
                            yaxis_title='Feature',
                            height=400
                        )
                        fig.update_yaxes(autorange="reversed")

                        st.plotly_chart(fig, width='stretch')

                    with col2:
                        # Tabla
                        st.write("**Loadings:**")
                        st.dataframe(
                            df_loadings[['feature', 'loading']].round(4),
                            width='stretch',
                            height=400
                        )

        # Visualización 2D/3D
        st.markdown("---")
        st.subheader("🎨 Visualización del Espacio Reducido")

        transformed_data = results['transformed_data']

        if results['n_components'] >= 2:
            # 2D plot
            fig = go.Figure()

            fig.add_trace(go.Scatter(
                x=transformed_data[:, 0],
                y=transformed_data[:, 1],
                mode='markers',
                marker=dict(size=8, color=transformed_data[:, 0], colorscale='Viridis'),
                text=[f"Doc {i}" for i in range(len(transformed_data))],
                hovertemplate='<b>%{text}</b><br>PC1: %{x:.3f}<br>PC2: %{y:.3f}<extra></extra>'
            ))

            fig.update_layout(
                title='Proyección PCA (2D)',
                xaxis_title=f'PC1 ({results["explained_variance_ratio"][0]:.1%})',
                yaxis_title=f'PC2 ({results["explained_variance_ratio"][1]:.1%})',
                height=600
            )

            st.plotly_chart(fig, width='stretch')

        if results['n_components'] >= 3:
            # 3D plot
            with st.expander("🌐 Visualización 3D", expanded=False):
                fig = go.Figure(data=[go.Scatter3d(
                    x=transformed_data[:, 0],
                    y=transformed_data[:, 1],
                    z=transformed_data[:, 2],
                    mode='markers',
                    marker=dict(
                        size=6,
                        color=transformed_data[:, 0],
                        colorscale='Viridis',
                        showscale=True
                    ),
                    text=[f"Doc {i}" for i in range(len(transformed_data))],
                    hovertemplate='<b>%{text}</b><br>PC1: %{x:.3f}<br>PC2: %{y:.3f}<br>PC3: %{z:.3f}<extra></extra>'
                )])

                fig.update_layout(
                    title='Proyección PCA (3D)',
                    scene=dict(
                        xaxis_title=f'PC1 ({results["explained_variance_ratio"][0]:.1%})',
                        yaxis_title=f'PC2 ({results["explained_variance_ratio"][1]:.1%})',
                        zaxis_title=f'PC3 ({results["explained_variance_ratio"][2]:.1%})'
                    ),
                    height=700
                )

                st.plotly_chart(fig, width='stretch')


def render_tsne_tab():
    """Tab de t-SNE"""

    st.header("🌀 t-SNE (t-Distributed Stochastic Neighbor Embedding)")

    if not st.session_state.get('dim_reduction_prepared', False):
        st.warning("⚠️ Prepara los datos primero en la pestaña **Preparación**")
        return

    reducer = st.session_state.dimensionality_reducer

    st.markdown("""
    **t-SNE** es una técnica no-lineal que preserva la estructura local de los datos.

    **Características:**
    - ✅ No lineal
    - ✅ Excelente para visualización
    - ✅ Preserva vecindarios locales
    - ⚠️ No determinístico
    - ⚠️ No permite reconstrucción
    """)

    st.markdown("---")

    # Configuración
    st.subheader("⚙️ Configuración")

    col1, col2 = st.columns(2)

    with col1:
        perplexity = st.slider(
            "Perplexity:",
            5, 50, 30, 5,
            help="Balance entre estructura local y global (5-50)"
        )

        n_components = st.selectbox("Componentes:", [2, 3], index=0)

    with col2:
        learning_rate = st.slider(
            "Learning Rate:",
            10.0, 1000.0, 200.0, 50.0
        )

        n_iter = st.slider(
            "Iteraciones:",
            250, 2000, 1000, 250
        )

    st.warning("⚠️ t-SNE puede tardar varios minutos con muchos documentos")

    if st.button("🚀 Aplicar t-SNE", type="primary", width='stretch'):
        with st.spinner("Aplicando t-SNE... Esto puede tardar..."):
            results = reducer.apply_tsne(
                n_components=n_components,
                perplexity=perplexity,
                learning_rate=learning_rate,
                n_iter=n_iter
            )

            st.session_state.tsne_results = results

            st.success("✓ t-SNE aplicado exitosamente")

    # Mostrar resultados
    if 'tsne_results' in st.session_state:
        results = st.session_state.tsne_results

        st.markdown("---")
        st.subheader("📊 Resultados de t-SNE")

        # Métricas
        col1, col2, col3 = st.columns(3)

        with col1:
            st.metric("KL Divergence", f"{results['kl_divergence']:.4f}")

        with col2:
            st.metric("Iteraciones", results['n_iter_final'])

        with col3:
            if 'distance_preservation' in results:
                corr = results['distance_preservation']['correlation']
                st.metric("Preservación Distancias", f"{corr:.4f}")

        # Visualización
        st.markdown("---")
        st.subheader("🎨 Visualización t-SNE")

        transformed_data = results['transformed_data']

        if results['n_components'] == 2:
            fig = go.Figure()

            fig.add_trace(go.Scatter(
                x=transformed_data[:, 0],
                y=transformed_data[:, 1],
                mode='markers',
                marker=dict(
                    size=8,
                    color=np.arange(len(transformed_data)),
                    colorscale='Viridis',
                    showscale=True
                ),
                text=[f"Doc {i}" for i in range(len(transformed_data))],
                hovertemplate='<b>%{text}</b><br>Dim1: %{x:.3f}<br>Dim2: %{y:.3f}<extra></extra>'
            ))

            fig.update_layout(
                title=f't-SNE (perplexity={perplexity})',
                xaxis_title='Dimensión 1',
                yaxis_title='Dimensión 2',
                height=600
            )

            st.plotly_chart(fig, width='stretch')

        else:  # 3D
            fig = go.Figure(data=[go.Scatter3d(
                x=transformed_data[:, 0],
                y=transformed_data[:, 1],
                z=transformed_data[:, 2],
                mode='markers',
                marker=dict(
                    size=6,
                    color=np.arange(len(transformed_data)),
                    colorscale='Viridis',
                    showscale=True
                ),
                text=[f"Doc {i}" for i in range(len(transformed_data))],
                hovertemplate='<b>%{text}</b><br>Dim1: %{x:.3f}<br>Dim2: %{y:.3f}<br>Dim3: %{z:.3f}<extra></extra>'
            )])

            fig.update_layout(
                title=f't-SNE 3D (perplexity={perplexity})',
                scene=dict(
                    xaxis_title='Dimensión 1',
                    yaxis_title='Dimensión 2',
                    zaxis_title='Dimensión 3'
                ),
                height=700
            )

            st.plotly_chart(fig, width='stretch')

        # Análisis de distancias
        if 'distance_preservation' in results:
            st.markdown("---")
            st.subheader("📏 Preservación de Distancias")

            dist_pres = results['distance_preservation']

            col1, col2 = st.columns(2)

            with col1:
                st.write("**Espacio Original:**")
                st.write(f"- Media: {dist_pres['original_mean']:.4f}")
                st.write(f"- Desv. Std: {dist_pres['original_std']:.4f}")

            with col2:
                st.write("**Espacio t-SNE:**")
                st.write(f"- Media: {dist_pres['transformed_mean']:.4f}")
                st.write(f"- Desv. Std: {dist_pres['transformed_std']:.4f}")

            st.info(f"""
            **Correlación:** {dist_pres['correlation']:.4f}

            Un valor cercano a 1 indica que t-SNE preserva bien las distancias relativas.
            """)


def render_umap_tab():
    """Tab de UMAP"""

    st.header("🗺️ UMAP (Uniform Manifold Approximation)")

    if not st.session_state.get('dim_reduction_prepared', False):
        st.warning("⚠️ Prepara los datos primero en la pestaña **Preparación**")
        return

    reducer = st.session_state.dimensionality_reducer

    st.markdown("""
    **UMAP** es una técnica moderna que balancea estructura local y global.

    **Características:**
    - ✅ No lineal
    - ✅ Más rápido que t-SNE
    - ✅ Preserva estructura global mejor
    - ✅ Más escalable
    """)

    st.markdown("---")

    # Verificar si UMAP está disponible
    from src.models.dimensionality_reduction import UMAP_AVAILABLE

    if not UMAP_AVAILABLE:
        st.error("""
        ❌ UMAP no está instalado

        Para instalar UMAP, ejecuta:
        ```
        pip install umap-learn
        ```
        """)
        return

    # Configuración
    st.subheader("⚙️ Configuración")

    col1, col2 = st.columns(2)

    with col1:
        n_neighbors = st.slider(
            "N Neighbors:",
            5, 50, 15, 5,
            help="Balance entre estructura local (bajo) y global (alto)"
        )

        n_components = st.selectbox("Componentes:", [2, 3], index=0, key="umap_comp")

    with col2:
        min_dist = st.slider(
            "Min Distance:",
            0.0, 0.99, 0.1, 0.05,
            help="Distancia mínima entre puntos (bajo=más clustering)"
        )

        metric = st.selectbox(
            "Métrica:",
            ["euclidean", "cosine", "manhattan"]
        )

    if st.button("🚀 Aplicar UMAP", type="primary", width='stretch'):
        with st.spinner("Aplicando UMAP..."):
            results = reducer.apply_umap(
                n_components=n_components,
                n_neighbors=n_neighbors,
                min_dist=min_dist,
                metric=metric
            )

            if 'error' not in results:
                st.session_state.umap_results = results
                st.success("✓ UMAP aplicado exitosamente")
            else:
                st.error(results['message'])

    # Mostrar resultados
    if 'umap_results' in st.session_state:
        results = st.session_state.umap_results

        st.markdown("---")
        st.subheader("📊 Resultados de UMAP")

        # Métricas
        col1, col2 = st.columns(2)

        with col1:
            if 'distance_preservation' in results:
                corr = results['distance_preservation']['correlation']
                st.metric("Preservación Distancias", f"{corr:.4f}")

        with col2:
            if 'embedding_quality' in results:
                spread = results['embedding_quality']['spread']
                st.metric("Spread", f"{spread:.4f}")

        # Visualización
        st.markdown("---")
        st.subheader("🎨 Visualización UMAP")

        transformed_data = results['transformed_data']

        if results['n_components'] == 2:
            fig = go.Figure()

            fig.add_trace(go.Scatter(
                x=transformed_data[:, 0],
                y=transformed_data[:, 1],
                mode='markers',
                marker=dict(
                    size=8,
                    color=np.arange(len(transformed_data)),
                    colorscale='Plasma',
                    showscale=True
                ),
                text=[f"Doc {i}" for i in range(len(transformed_data))],
                hovertemplate='<b>%{text}</b><br>Dim1: %{x:.3f}<br>Dim2: %{y:.3f}<extra></extra>'
            ))

            fig.update_layout(
                title=f'UMAP (n_neighbors={n_neighbors}, min_dist={min_dist})',
                xaxis_title='Dimensión 1',
                yaxis_title='Dimensión 2',
                height=600
            )

            st.plotly_chart(fig, width='stretch')

        else:  # 3D
            fig = go.Figure(data=[go.Scatter3d(
                x=transformed_data[:, 0],
                y=transformed_data[:, 1],
                z=transformed_data[:, 2],
                mode='markers',
                marker=dict(
                    size=6,
                    color=np.arange(len(transformed_data)),
                    colorscale='Plasma',
                    showscale=True
                ),
                text=[f"Doc {i}" for i in range(len(transformed_data))],
                hovertemplate='<b>%{text}</b><br>Dim1: %{x:.3f}<br>Dim2: %{y:.3f}<br>Dim3: %{z:.3f}<extra></extra>'
            )])

            fig.update_layout(
                title=f'UMAP 3D (n_neighbors={n_neighbors})',
                scene=dict(
                    xaxis_title='Dimensión 1',
                    yaxis_title='Dimensión 2',
                    zaxis_title='Dimensión 3'
                ),
                height=700
            )

            st.plotly_chart(fig, width='stretch')


def render_factor_analysis_tab():
    """Tab de Factor Analysis"""

    st.header("📐 Factor Analysis")

    if not st.session_state.get('dim_reduction_prepared', False):
        st.warning("⚠️ Prepara los datos primero en la pestaña **Preparación**")
        return

    reducer = st.session_state.dimensionality_reducer

    st.markdown("""
    **Factor Analysis** encuentra factores latentes que explican las correlaciones entre variables.

    **Características:**
    - ✅ Modela estructura latente
    - ✅ Separación señal/ruido
    - ✅ Interpretable (loadings)
    - ✅ Rotación de factores
    """)

    st.markdown("---")

    # Configuración
    st.subheader("⚙️ Configuración")

    col1, col2 = st.columns(2)

    with col1:
        n_factors = st.slider(
            "Número de factores:",
            2, min(10, reducer.scaled_data.shape[1]), 2, 1
        )

    with col2:
        rotation = st.selectbox(
            "Rotación:",
            [None, "varimax"],
            format_func=lambda x: "Ninguna" if x is None else "Varimax"
        )

    if st.button("🚀 Aplicar Factor Analysis", type="primary", width='stretch'):
        with st.spinner("Aplicando Factor Analysis..."):
            results = reducer.apply_factor_analysis(
                n_factors=n_factors,
                rotation=rotation
            )

            st.session_state.fa_results = results

            st.success("✓ Factor Analysis aplicado")

    # Mostrar resultados
    if 'fa_results' in st.session_state:
        results = st.session_state.fa_results

        st.markdown("---")
        st.subheader("📊 Resultados de Factor Analysis")

        # Métricas
        col1, col2 = st.columns(2)

        with col1:
            st.metric("Factores", results['n_factors'])

        with col2:
            st.metric("Comunalidad Media", f"{results['mean_communality']:.4f}")

        # Comunalidades
        st.markdown("---")
        st.subheader("📊 Comunalidades")

        st.info("""
        La **comunalidad** indica qué proporción de la varianza de cada feature
        es explicada por los factores. Valores cercanos a 1 = bien explicado.
        """)

        communalities = np.array(results['communalities'])
        feature_names = reducer.feature_names

        df_comm = pd.DataFrame({
            'Feature': feature_names,
            'Comunalidad': communalities
        }).sort_values('Comunalidad', ascending=False)

        # Top y bottom features
        col1, col2 = st.columns(2)

        with col1:
            st.write("**Top 10 Features (mejor explicadas):**")
            st.dataframe(df_comm.head(10), width='stretch')

        with col2:
            st.write("**Bottom 10 Features (peor explicadas):**")
            st.dataframe(df_comm.tail(10), width='stretch')

        # Loadings por factor
        st.markdown("---")
        st.subheader("🔍 Interpretación de Factores")

        for factor_data in results['factor_contributions']:
            with st.expander(
                f"📌 Factor {factor_data['factor']} "
                f"({factor_data['variance_explained']:.2%} varianza)",
                expanded=(factor_data['factor'] <= 2)
            ):
                df_loadings = pd.DataFrame(factor_data['top_features'])

                col1, col2 = st.columns([2, 1])

                with col1:
                    fig = go.Figure()

                    colors = ['green' if x > 0 else 'red' for x in df_loadings['loading']]

                    fig.add_trace(go.Bar(
                        x=df_loadings['loading'],
                        y=df_loadings['feature'],
                        orientation='h',
                        marker_color=colors
                    ))

                    fig.update_layout(
                        title=f'Top Features - Factor {factor_data["factor"]}',
                        xaxis_title='Loading',
                        yaxis_title='Feature',
                        height=400
                    )
                    fig.update_yaxes(autorange="reversed")

                    st.plotly_chart(fig, width='stretch')

                with col2:
                    st.write("**Loadings:**")
                    st.dataframe(
                        df_loadings[['feature', 'loading']].round(4),
                        width='stretch',
                        height=400
                    )

        # Visualización 2D
        if results['n_factors'] >= 2:
            st.markdown("---")
            st.subheader("🎨 Visualización del Espacio de Factores")

            transformed_data = results['transformed_data']

            fig = go.Figure()

            fig.add_trace(go.Scatter(
                x=transformed_data[:, 0],
                y=transformed_data[:, 1],
                mode='markers',
                marker=dict(
                    size=8,
                    color=transformed_data[:, 0],
                    colorscale='Cividis',
                    showscale=True
                ),
                text=[f"Doc {i}" for i in range(len(transformed_data))],
                hovertemplate='<b>%{text}</b><br>F1: %{x:.3f}<br>F2: %{y:.3f}<extra></extra>'
            ))

            fig.update_layout(
                title='Proyección en Espacio de Factores',
                xaxis_title='Factor 1',
                yaxis_title='Factor 2',
                height=600
            )

            st.plotly_chart(fig, width='stretch')


def render_comparison_tab():
    """Tab de comparación entre métodos"""

    st.header("⚖️ Comparación de Métodos")

    if not st.session_state.get('dim_reduction_prepared', False):
        st.warning("⚠️ Prepara los datos primero y ejecuta al menos dos métodos")
        return

    reducer = st.session_state.dimensionality_reducer

    # Verificar qué métodos han sido ejecutados
    available_methods = list(reducer.results.keys())

    if len(available_methods) == 0:
        st.info("ℹ️ Ejecuta al menos un método de reducción para ver comparaciones")
        return

    st.info(f"📊 Métodos disponibles: {', '.join([m.upper() for m in available_methods])}")

    # Tabla comparativa
    st.subheader("📊 Tabla Comparativa")

    comparison_data = []

    for method in available_methods:
        result = reducer.results[method]

        row = {
            'Método': method.upper().replace('_', ' '),
            'Tipo': 'Lineal' if method in ['pca', 'factor_analysis'] else 'No Lineal',
            'Componentes': result.get('n_components', result.get('n_factors', 'N/A'))
        }

        # Métricas específicas
        if method == 'pca':
            row['Varianza Explicada'] = f"{result['cumulative_variance'][-1]:.2%}"
            row['Interpretabilidad'] = 'Alta'
            row['Costo Computacional'] = 'Bajo'

        elif method == 'tsne':
            row['KL Divergence'] = f"{result['kl_divergence']:.4f}"
            row['Interpretabilidad'] = 'Baja'
            row['Costo Computacional'] = 'Alto'

        elif method == 'umap':
            if 'distance_preservation' in result:
                row['Preservación'] = f"{result['distance_preservation']['correlation']:.4f}"
            row['Interpretabilidad'] = 'Media'
            row['Costo Computacional'] = 'Medio'

        elif method == 'factor_analysis':
            row['Comunalidad'] = f"{result['mean_communality']:.4f}"
            row['Interpretabilidad'] = 'Alta'
            row['Costo Computacional'] = 'Medio'

        comparison_data.append(row)

    df_comparison = pd.DataFrame(comparison_data)
    st.dataframe(df_comparison, width='stretch')

    # Visualización lado a lado
    if len(available_methods) >= 2:
        st.markdown("---")
        st.subheader("🎨 Comparación Visual")

        # Seleccionar métodos a comparar
        methods_to_compare = st.multiselect(
            "Seleccionar métodos:",
            available_methods,
            default=available_methods[:min(3, len(available_methods))]
        )

        if len(methods_to_compare) >= 2:
            # Crear subplots
            n_methods = len(methods_to_compare)
            cols = st.columns(n_methods)

            for idx, method in enumerate(methods_to_compare):
                with cols[idx]:
                    result = reducer.results[method]
                    transformed_data = result.get('transformed_data')

                    if transformed_data is not None and len(transformed_data[0]) >= 2:
                        fig = go.Figure()

                        fig.add_trace(go.Scatter(
                            x=transformed_data[:, 0],
                            y=transformed_data[:, 1],
                            mode='markers',
                            marker=dict(
                                size=6,
                                color=np.arange(len(transformed_data)),
                                colorscale='Viridis',
                                showscale=False
                            )
                        ))

                        fig.update_layout(
                            title=method.upper(),
                            xaxis_title='Dim 1',
                            yaxis_title='Dim 2',
                            height=400,
                            showlegend=False
                        )

                        st.plotly_chart(fig, width='stretch')

    # Recomendaciones
    st.markdown("---")
    st.subheader("💡 Recomendaciones")

    st.markdown("""
    ### ¿Cuándo usar cada método?

    **PCA:**
    - ✅ Análisis exploratorio inicial
    - ✅ Cuando necesitas interpretar componentes
    - ✅ Reducción de features para otros modelos
    - ✅ Datos con relaciones lineales

    **t-SNE:**
    - ✅ Visualización de clusters
    - ✅ Cuando la estructura local es importante
    - ✅ Presentaciones y publicaciones
    - ⚠️ NO para reducción previa a clasificación

    **UMAP:**
    - ✅ Balance entre local y global
    - ✅ Datasets grandes (más rápido que t-SNE)
    - ✅ Cuando necesitas preservar más estructura global
    - ✅ Puede usarse para reducción previa

    **Factor Analysis:**
    - ✅ Cuando crees que hay factores latentes
    - ✅ Análisis psicométrico y social
    - ✅ Interpretación de constructos teóricos
    - ✅ Separación de señal y ruido
    """)


def render_export_tab():
    """Tab de exportación"""

    st.header("💾 Exportar Resultados")

    if not st.session_state.get('dim_reduction_prepared', False):
        st.warning("⚠️ No hay resultados para exportar")
        return

    reducer = st.session_state.dimensionality_reducer
    available_methods = list(reducer.results.keys())

    if len(available_methods) == 0:
        st.info("ℹ️ Ejecuta al menos un método primero")
        return

    st.subheader("📊 Exportar Datos Transformados")

    # Seleccionar método
    method_to_export = st.selectbox(
        "Seleccionar método:",
        available_methods,
        format_func=lambda x: x.upper().replace('_', ' ')
    )

    result = reducer.results[method_to_export]
    transformed_data = result.get('transformed_data')

    if transformed_data is not None:
        # Crear DataFrame
        n_dims = transformed_data.shape[1]
        columns = [f'Dim_{i+1}' for i in range(n_dims)]

        df_export = pd.DataFrame(transformed_data, columns=columns)
        df_export.insert(0, 'Document_ID', range(len(df_export)))

        st.write("**Preview:**")
        st.dataframe(df_export.head(), width='stretch')

        # Botón de descarga
        csv = df_export.to_csv(index=False)

        st.download_button(
            "📥 Descargar CSV",
            data=csv,
            file_name=f"{method_to_export}_transformed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )

    st.markdown("---")

    # Exportar todos los resultados
    st.subheader("📦 Exportar Todos los Resultados")

    if st.button("💾 Exportar Todos (JSON)"):
        all_results = reducer.export_results()

        # Convertir a JSON serializable
        def convert_to_serializable(obj):
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            return obj

        # Limpiar resultados
        cleaned_results = json.loads(
            json.dumps(all_results, default=convert_to_serializable)
        )

        json_str = json.dumps(cleaned_results, indent=2)

        st.download_button(
            "📥 Descargar JSON",
            data=json_str,
            file_name=f"dimensionality_reduction_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json"
        )

        st.success("✓ Resultados exportados")

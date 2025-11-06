"""
Página de Análisis TF-IDF
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from components.ui.helpers import (
    show_section_header,
    get_connector,
    get_or_load_cached_results,
    save_results_to_cache,
    save_csv_to_drive,
    save_pickle_to_drive
)


def render():
    """Renderiza la página de análisis TF-IDF con 3 pestañas"""

    show_section_header("Análisis TF-IDF", "Análisis de importancia de términos")

    # Check if preprocessed texts exist
    if 'preprocessing_results' not in st.session_state:
        st.warning("⚠️ No hay textos preprocesados disponibles. Debes completar primero la Sección 5: Preprocesamiento.")
        return

    tabs = st.tabs(["⚙️ Configuración", "📊 Resumen de TF-IDF", "💾 Persistencia"])

    # Tab 1: Configuración
    with tabs[0]:
        st.markdown("### ⚙️ Configuración de TF-IDF (Método Colab)")

        st.info("🔬 **Método Colab Activado**\n\n"
                "Este análisis TF-IDF se calcula directamente desde la **Bolsa de Palabras** "
                "usando la misma metodología que en Google Colab:\n\n"
                "- **TF** (Term Frequency) = Frecuencia del término / Total de términos en el documento\n"
                "- **IDF** (Inverse Document Frequency) = log(Número de documentos / Documentos con el término)\n"
                "- **TF-IDF = TF × IDF**")

        st.markdown("---")

        st.markdown("**📖 ¿Qué es TF-IDF?**")
        st.info("""
        **TF-IDF (Term Frequency-Inverse Document Frequency)** mide la importancia de un término en un documento
        relativo a un corpus. A diferencia de BoW que solo cuenta frecuencias, TF-IDF penaliza términos muy comunes
        y resalta términos distintivos.

        - **TF**: Frecuencia del término en el documento
        - **IDF**: Penalización por frecuencia en todo el corpus
        - **TF-IDF = TF × IDF**: Términos frecuentes pero distintivos tienen scores altos
        """)

        st.markdown("---")

        # Verificar prerequisitos
        if 'bow_results' not in st.session_state:
            st.warning("⚠️ **Prerequisito:** Debes crear la Bolsa de Palabras primero en la Sección 6.")
            st.info("👉 Ve a **6. Bolsa de Palabras** y crea la matriz BoW antes de continuar.")
        else:
            bow_info = st.session_state.bow_results
            st.success(f"✅ Bolsa de Palabras disponible: {bow_info['document_count']} documentos, {bow_info['vocabulary_size']:,} términos")

            st.markdown("**Configuración**")
            st.info("""
            La matriz TF-IDF se generará automáticamente usando:
            - Todos los términos de la Bolsa de Palabras
            - Cálculo manual: TF × IDF (sin normalización)
            - Mismo método que en Colab
            """)

            if st.button("▶️ Crear Matriz TF-IDF (Método Colab)", type="primary", width='stretch'):
                st.session_state.tfidf_config = {
                    'method': 'colab_style'
                }
                st.success("✓ Configuración lista. Ve a la pestaña 'Resumen de TF-IDF' para ver los resultados.")
                st.rerun()

    # Tab 2: Resumen de TF-IDF
    with tabs[1]:
        st.markdown("### 📊 Resumen de TF-IDF")

        if 'tfidf_config' not in st.session_state:
            st.info("ℹ️ Configura los parámetros de TF-IDF en la pestaña 'Configuración' primero.")
            return

        config = st.session_state.tfidf_config

        if 'tfidf_results' not in st.session_state:
            # PRIMERO: Intentar cargar desde caché LOCAL
            from src.utils.local_cache import LocalCache

            local_cache = LocalCache('tfidf')
            cached_results = local_cache.load(config=config)

            if cached_results:
                # CARGAR DESDE CACHÉ LOCAL - ¡Instantáneo!
                st.success("✅ Resultados de TF-IDF cargados desde caché local")

                # Reconstruir si es necesario
                if isinstance(cached_results, dict) and 'dataframe_data' in cached_results:
                    from scipy.sparse import csr_matrix

                    tfidf_df = pd.DataFrame(
                        cached_results['dataframe_data']['values'],
                        columns=cached_results['dataframe_data']['columns'],
                        index=cached_results['dataframe_data']['index']
                    )
                    cached_results['dataframe'] = tfidf_df
                    cached_results['matrix'] = csr_matrix(tfidf_df.values)
                    cached_results['sparse_matrix'] = csr_matrix(tfidf_df.values)

                    # Reconstruir TF y IDF si existen
                    if 'tf_matrix_data' in cached_results:
                        cached_results['tf_matrix'] = pd.DataFrame(
                            cached_results['tf_matrix_data']['values'],
                            columns=cached_results['tf_matrix_data']['columns'],
                            index=cached_results['tf_matrix_data']['index']
                        )
                    if 'idf_values_data' in cached_results:
                        cached_results['idf_values'] = pd.Series(
                            cached_results['idf_values_data']['values'],
                            index=cached_results['idf_values_data']['index']
                        )

                st.session_state.tfidf_results = cached_results
                st.rerun()
            else:
                # Si no hay caché local, verificar caché de Drive
                # Intentar cargar desde caché de Drive
                cached_results_drive, folder_06 = get_or_load_cached_results(
                    "06_TFIDF_Results",
                    "tfidf_results.json",
                    source_files=None  # TF-IDF depende de BoW, no de archivos directos
                )

                if cached_results_drive and 'dataframe_data' in cached_results_drive:
                    # CARGAR DESDE CACHÉ DE DRIVE - reconstruir el DataFrame
                    st.success("✅ Resultados de TF-IDF cargados desde Drive")

                    from scipy.sparse import csr_matrix

                    # Reconstruir DataFrame desde datos guardados
                    tfidf_df = pd.DataFrame(
                        cached_results_drive['dataframe_data']['values'],
                        columns=cached_results_drive['dataframe_data']['columns'],
                        index=cached_results_drive['dataframe_data']['index']
                    )

                    # Reconstruir TF y IDF si existen (método Colab)
                    tf_matrix = None
                    idf_values = None
                    if 'tf_matrix_data' in cached_results_drive:
                        tf_matrix = pd.DataFrame(
                            cached_results_drive['tf_matrix_data']['values'],
                            columns=cached_results_drive['tf_matrix_data']['columns'],
                            index=cached_results_drive['tf_matrix_data']['index']
                        )
                    if 'idf_values_data' in cached_results_drive:
                        idf_values = pd.Series(
                            cached_results_drive['idf_values_data']['values'],
                            index=cached_results_drive['idf_values_data']['index']
                        )

                    # Reconstruir el resultado completo
                    tfidf_result = {
                        'matrix': csr_matrix(tfidf_df.values),
                        'dataframe': tfidf_df,
                        'vocabulary': cached_results_drive['vocabulary'],
                        'vocabulary_size': cached_results_drive['vocabulary_size'],
                        'document_count': cached_results_drive['document_count'],
                        'top_terms_per_doc': cached_results_drive['top_terms_per_doc'],
                        'sparse_matrix': csr_matrix(tfidf_df.values),
                        'method': cached_results_drive.get('method', 'colab_style'),
                        'dataframe_data': cached_results_drive['dataframe_data']
                    }

                    # Agregar TF e IDF si existen
                    if tf_matrix is not None:
                        tfidf_result['tf_matrix'] = tf_matrix
                        tfidf_result['tf_matrix_data'] = cached_results_drive['tf_matrix_data']
                    if idf_values is not None:
                        tfidf_result['idf_values'] = idf_values
                        tfidf_result['idf_values_data'] = cached_results_drive['idf_values_data']

                    st.session_state.tfidf_results = tfidf_result
                    st.session_state.persistence_folders['06_TFIDF_Results'] = folder_06

                    # Guardar en caché local para próxima vez
                    local_cache.save(
                        results=tfidf_result,
                        config=config,
                        metadata={'document_count': tfidf_result['document_count']}
                    )
                    st.rerun()

            # Si no hay caché, proceder con el procesamiento normal
            st.markdown("**Creando Matriz TF-IDF (Método Colab)...**")
            st.info("🔬 Usando el mismo método de cálculo que en Colab: TF-IDF = TF × IDF")

            preprocessor = st.session_state.text_preprocessor

            # PASO 1: Verificar si existe la Bolsa de Palabras
            if 'bow_results' not in st.session_state:
                st.error("❌ Se requiere la Bolsa de Palabras primero. Ve a la Sección 6: Bolsa de Palabras")
                return

            bow_result = st.session_state.bow_results

            with st.spinner("Calculando TF-IDF desde Bolsa de Palabras..."):
                # PASO 2: Crear TF-IDF desde BoW (método Colab)
                tfidf_result = preprocessor.create_tfidf_from_bow(bow_result)

                if tfidf_result:
                    # NUEVO: Guardar caché de resultados
                    connector = get_connector()
                    folder_06 = connector.get_or_create_folder(
                        st.session_state.parent_folder_id,
                        "06_TFIDF_Results"
                    )
                    st.session_state.persistence_folders['06_TFIDF_Results'] = folder_06

                    # Preparar datos serializables para caché
                    cache_data = {
                        'dataframe_data': {
                            'values': tfidf_result['dataframe'].values.tolist(),
                            'columns': tfidf_result['dataframe'].columns.tolist(),
                            'index': tfidf_result['dataframe'].index.tolist()
                        },
                        'vocabulary': tfidf_result['vocabulary'],
                        'vocabulary_size': tfidf_result['vocabulary_size'],
                        'document_count': tfidf_result['document_count'],
                        'top_terms_per_doc': tfidf_result['top_terms_per_doc'],
                        'method': tfidf_result.get('method', 'colab_style')
                    }

                    # Guardar TF y IDF si existen (método Colab)
                    if 'tf_matrix' in tfidf_result:
                        cache_data['tf_matrix_data'] = {
                            'values': tfidf_result['tf_matrix'].values.tolist(),
                            'columns': tfidf_result['tf_matrix'].columns.tolist(),
                            'index': tfidf_result['tf_matrix'].index.tolist()
                        }
                    if 'idf_values' in tfidf_result:
                        cache_data['idf_values_data'] = {
                            'values': tfidf_result['idf_values'].values.tolist(),
                            'index': tfidf_result['idf_values'].index.tolist()
                        }

                    save_results_to_cache(
                        folder_06,
                        "tfidf_results.json",
                        cache_data
                    )

                    # Guardar matrices usando las funciones helper mejoradas
                    # Guardar matriz TF-IDF como CSV
                    save_csv_to_drive(folder_06, "tfidf_matrix.csv", tfidf_result['dataframe'])

                    # Guardar matriz TF-IDF sparse en pickle para uso posterior
                    pickle_data = {
                        'matrix': tfidf_result['sparse_matrix'],
                        'vocabulary': tfidf_result['vocabulary'],
                        'feature_names': tfidf_result['vocabulary'],
                        'document_names': tfidf_result['dataframe'].index.tolist()
                    }
                    save_pickle_to_drive(folder_06, "tfidf_matrix.pkl", pickle_data)

                    # Guardar matriz TF como CSV (si existe)
                    if 'tf_matrix' in tfidf_result:
                        save_csv_to_drive(folder_06, "tf_matrix.csv", tfidf_result['tf_matrix'])

                    # Guardar IDF como CSV (si existe)
                    if 'idf_values' in tfidf_result:
                        idf_df = pd.DataFrame({'term': tfidf_result['idf_values'].index,
                                              'idf': tfidf_result['idf_values'].values})
                        save_csv_to_drive(folder_06, "idf_values.csv", idf_df)

                    # Guardar en caché local
                    local_cache.save(
                        results=tfidf_result,
                        config=config,
                        metadata={'document_count': tfidf_result['document_count']}
                    )

                    st.session_state.tfidf_results = tfidf_result
                    st.success(f"✓ Matriz TF-IDF creada correctamente ({tfidf_result['vocabulary_size']} términos)")
                    st.info("✅ **Método Colab aplicado:**\n"
                           "- TF = Frecuencia / Total palabras documento\n"
                           "- IDF = log(Total documentos / Documentos con término)\n"
                           "- TF-IDF = TF × IDF\n"
                           "- 💾 Resultados guardados en caché local, Drive y CSV exportados")
                    st.rerun()
                else:
                    st.error("❌ Error creando matriz TF-IDF desde Bolsa de Palabras")
                    return

        # Show results
        tfidf = st.session_state.tfidf_results

        # Metrics
        st.markdown("**📈 Estadísticas de la Matriz TF-IDF**")
        col1, col2, col3 = st.columns(3)

        col1.metric("Documentos", tfidf['document_count'])
        col2.metric("Vocabulario", f"{tfidf['vocabulary_size']:,}")
        col3.metric("Sparsity", f"{(1 - (tfidf['sparse_matrix'].nnz / (tfidf['document_count'] * tfidf['vocabulary_size']))) * 100:.1f}%")

        st.markdown("---")

        # Top terms globally (usando el método Colab)
        st.markdown("**🔝 Top 20 Términos Más Relevantes (TF-IDF)**")

        # Verificar método usado
        method = tfidf.get('method', 'sklearn')
        if method == 'colab_style':
            st.caption("📊 Calculado usando el método de Colab: Suma de TF-IDF a través de todos los documentos")
        else:
            st.caption("📊 Calculado usando normalización L2 y suma total")

        preprocessor = st.session_state.text_preprocessor
        top_terms_df = preprocessor.get_top_tfidf_terms(tfidf, top_n=20, use_normalized=False)

        # Obtener el nombre de la columna dinámicamente
        score_column = top_terms_df.columns[1]

        col1, col2 = st.columns([1, 1])

        with col1:
            st.dataframe(top_terms_df, width='stretch', height=400)

        with col2:
            # Bar chart of top terms con colores más llamativos
            fig = go.Figure(data=[
                go.Bar(
                    x=top_terms_df[score_column],
                    y=top_terms_df['Término'],
                    orientation='h',
                    marker=dict(
                        color=top_terms_df[score_column],
                        colorscale='Plasma',
                        showscale=True
                    )
                )
            ])
            fig.update_layout(
                title='Top 20 Términos Más Relevantes (TF-IDF)',
                xaxis_title=score_column,
                yaxis_title='Término',
                height=400,
                yaxis={'categoryorder': 'total ascending'}
            )
            st.plotly_chart(fig, width='stretch')

        st.markdown("---")

        # Top terms per document
        st.markdown("**📄 Top Términos por Documento**")

        doc_names = list(tfidf['top_terms_per_doc'].keys())
        selected_doc = st.selectbox("Selecciona un documento", doc_names, key="tfidf_doc_select")

        if selected_doc:
            doc_top_terms = tfidf['top_terms_per_doc'][selected_doc]

            # Create dataframe
            doc_terms_df = pd.DataFrame([
                {'Término': term, 'TF-IDF': score}
                for term, score in doc_top_terms.items()
            ]).sort_values('TF-IDF', ascending=False)

            col1, col2 = st.columns([1, 1])

            with col1:
                st.dataframe(doc_terms_df, width='stretch', height=300)

            with col2:
                fig = go.Figure(data=[
                    go.Bar(
                        x=doc_terms_df['TF-IDF'],
                        y=doc_terms_df['Término'],
                        orientation='h',
                        marker_color='lightseagreen'
                    )
                ])
                fig.update_layout(
                    title=f'Top Términos en {selected_doc[:30]}...',
                    xaxis_title='TF-IDF',
                    yaxis_title='Término',
                    height=300,
                    yaxis={'categoryorder': 'total ascending'}
                )
                st.plotly_chart(fig, width='stretch')

        st.markdown("---")

        # Matrix preview
        st.markdown("**📋 Vista Previa de la Matriz TF-IDF**")

        tfidf_df = tfidf['dataframe']

        # Show first 10 documents and top 20 terms
        preview_df = tfidf_df.iloc[:10, :20]

        st.dataframe(preview_df, width='stretch')
        st.caption(f"Mostrando primeros 10 documentos y primeros 20 términos de {tfidf['document_count']} x {tfidf['vocabulary_size']}")

        st.markdown("---")

        # Heatmap de términos más relevantes (como en Colab)
        st.markdown("**🔥 Mapa de Calor de Términos Más Relevantes**")

        # Verificar método usado
        if method == 'colab_style':
            st.caption("📊 Método Colab: Visualiza la distribución TF-IDF (TF × IDF) de los términos más importantes")
        else:
            st.caption("📊 Visualiza la distribución de los términos más importantes por documento")

        # Selector de número de términos
        num_terms_heatmap = st.slider(
            "Número de términos a mostrar",
            min_value=10, max_value=30, value=20, step=5,
            key="tfidf_heatmap_terms"
        )

        heatmap_df = preprocessor.get_tfidf_heatmap_data(tfidf, top_n=num_terms_heatmap, use_normalized=False)

        if heatmap_df is not None:
            # Crear heatmap con plotly
            fig = go.Figure(data=go.Heatmap(
                z=heatmap_df.values,
                x=heatmap_df.columns,
                y=heatmap_df.index,
                colorscale='YlGnBu',
                colorbar=dict(title="TF-IDF Score"),
                hoverongaps=False
            ))

            fig.update_layout(
                title=f'Mapa de Calor de los {num_terms_heatmap} Términos Más Relevantes',
                xaxis_title='Términos',
                yaxis_title='Documentos',
                height=max(400, len(heatmap_df) * 20),  # Altura dinámica según documentos
                xaxis={'tickangle': -45}
            )

            st.plotly_chart(fig, width='stretch')

        st.markdown("---")

        # Download full matrix option
        st.markdown("**💾 Descargar Matriz Completa**")

        csv_data = tfidf_df.to_csv().encode('utf-8')
        st.download_button(
            label="📥 Descargar matriz TF-IDF como CSV",
            data=csv_data,
            file_name="tfidf_matrix.csv",
            mime="text/csv"
        )

    # Tab 3: Persistencia
    with tabs[2]:
        st.markdown("### 💾 Persistencia de Resultados TF-IDF")

        if 'tfidf_results' not in st.session_state:
            st.info("ℹ️ Debes crear la matriz TF-IDF primero en la pestaña 'Resumen de TF-IDF'.")
            return

        tfidf = st.session_state.tfidf_results

        st.markdown("**📂 Resultados listos para guardar**")
        st.markdown(f"- Documentos: {tfidf['document_count']}")
        st.markdown(f"- Vocabulario: {tfidf['vocabulary_size']:,} términos")

        # Check if already saved
        if st.session_state.persistence_folders['06_TFIDF_Results'] is not None:
            folder_06 = st.session_state.persistence_folders['06_TFIDF_Results']
            st.success("✓ Los resultados de TF-IDF ya fueron guardados en Drive")
            st.info(f"**Carpeta:** 06_TFIDF_Results\n**ID:** {folder_06}")

            st.markdown("**📋 Archivos Guardados**")

            # Verificar método usado
            method = tfidf.get('method', 'sklearn')

            if method == 'colab_style':
                saved_files = [
                    "tfidf_matrix.csv - Matriz completa TF-IDF (TF × IDF)",
                    "tf_matrix.csv - Matriz TF (Term Frequency)",
                    "idf_values.csv - Valores IDF por término",
                    "tfidf_vocabulary.txt - Lista de vocabulario",
                    "tfidf_top_terms_global.csv - Top términos globales",
                    "tfidf_top_terms_per_doc.csv - Top términos por documento",
                    "tfidf_statistics.txt - Estadísticas generales"
                ]
            else:
                saved_files = [
                    "tfidf_matrix.csv - Matriz completa TF-IDF",
                    "tfidf_vocabulary.txt - Lista de vocabulario",
                    "tfidf_top_terms_global.csv - Top términos globales",
                    "tfidf_top_terms_per_doc.csv - Top términos por documento",
                    "tfidf_statistics.txt - Estadísticas generales"
                ]

            for f in saved_files:
                st.markdown(f"- {f}")

            st.success("✓ Los resultados están listos para la siguiente etapa: " +
                       "**Análisis de Factores**")
        else:
            if st.button("💾 Guardar Resultados TF-IDF en Drive", type="primary", width='stretch'):
                connector = get_connector()
                if not connector:
                    st.error("❌ Error de conexión con Google Drive")
                    return

                # Create 06_TFIDF_Results folder
                folder_06 = connector.get_or_create_folder(
                    st.session_state.parent_folder_id,
                    "06_TFIDF_Results"
                )
                st.session_state.persistence_folders['06_TFIDF_Results'] = folder_06

                progress_text = st.empty()

                # Save matrix as CSV
                progress_text.text("Guardando matriz TF-IDF...")
                tfidf_df = tfidf['dataframe']
                matrix_csv = tfidf_df.to_csv()
                connector.create_text_file(folder_06, "tfidf_matrix.csv", matrix_csv)

                # Save TF matrix if available (método Colab)
                if 'tf_matrix' in tfidf:
                    progress_text.text("Guardando matriz TF...")
                    tf_csv = tfidf['tf_matrix'].to_csv()
                    connector.create_text_file(folder_06, "tf_matrix.csv", tf_csv)

                # Save IDF values if available (método Colab)
                if 'idf_values' in tfidf:
                    progress_text.text("Guardando valores IDF...")
                    idf_df = pd.DataFrame({
                        'Término': tfidf['idf_values'].index,
                        'IDF': tfidf['idf_values'].values
                    })
                    idf_csv = idf_df.to_csv(index=False)
                    connector.create_text_file(folder_06, "idf_values.csv", idf_csv)

                # Save vocabulary
                progress_text.text("Guardando vocabulario...")
                vocabulary_text = "\n".join(tfidf['vocabulary'])
                connector.create_text_file(folder_06, "tfidf_vocabulary.txt",
                                           vocabulary_text)

                # Save top terms global
                progress_text.text("Guardando top términos globales...")
                preprocessor = st.session_state.text_preprocessor
                top_terms_df = preprocessor.get_top_tfidf_terms(tfidf, top_n=50)
                top_terms_csv = top_terms_df.to_csv(index=False)
                connector.create_text_file(folder_06, "tfidf_top_terms_global.csv",
                                           top_terms_csv)

                # Save top terms per document
                progress_text.text("Guardando top términos por documento...")
                per_doc_data = []
                for doc_name, terms_dict in tfidf['top_terms_per_doc'].items():
                    for term, score in terms_dict.items():
                        per_doc_data.append({
                            'Documento': doc_name,
                            'Término': term,
                            'TF-IDF': score
                        })
                per_doc_df = pd.DataFrame(per_doc_data)
                per_doc_csv = per_doc_df.to_csv(index=False)
                connector.create_text_file(folder_06, "tfidf_top_terms_per_doc.csv",
                                           per_doc_csv)

                # Save statistics
                progress_text.text("Guardando estadísticas...")

                # Verificar método usado
                method = tfidf.get('method', 'sklearn')

                if method == 'colab_style':
                    stats_text = f"""Estadísticas de TF-IDF (Método Colab)
=====================================

Documentos: {tfidf['document_count']}
Vocabulario: {tfidf['vocabulary_size']:,} términos
Sparsity: {(1 - (tfidf['sparse_matrix'].nnz / (tfidf['document_count'] * tfidf['vocabulary_size']))) * 100:.2f}%

Método de Cálculo:
- Tipo: Colab Style (TF × IDF manual)
- TF = Frecuencia término / Total términos documento
- IDF = log(Total documentos / Documentos con término)
- TF-IDF = TF × IDF

Fuente:
- Calculado desde: Bolsa de Palabras (BoW)
"""
                else:
                    stats_text = f"""Estadísticas de TF-IDF
=====================================

Documentos: {tfidf['document_count']}
Vocabulario: {tfidf['vocabulary_size']:,} términos
Sparsity: {(1 - (tfidf['sparse_matrix'].nnz / (tfidf['document_count'] * tfidf['vocabulary_size']))) * 100:.2f}%

Configuración:
- max_features: {st.session_state.tfidf_config.get('max_features', 'N/A')}
- min_df: {st.session_state.tfidf_config.get('min_df', 'N/A')}
- max_df: {st.session_state.tfidf_config.get('max_df', 'N/A')}
- ngram_range: {st.session_state.tfidf_config.get('ngram_range', 'N/A')}
"""

                connector.create_text_file(folder_06, "tfidf_statistics.txt",
                                           stats_text)

                progress_text.empty()

                st.success("✓ Resultados guardados en carpeta '06_TFIDF_Results'")
                st.info(f"**Carpeta ID:** {folder_06}")
                st.balloons()
                st.rerun()

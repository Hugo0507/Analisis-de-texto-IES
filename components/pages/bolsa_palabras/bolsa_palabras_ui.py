"""
Página de Bolsa de Palabras
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from components.ui.helpers import (
    show_section_header,
    show_chart_interpretation,
    get_connector,
    get_or_load_cached_results,
    save_results_to_cache,
    save_csv_to_drive,
    save_pickle_to_drive
)


def render():
    """Renderiza la página de bolsa de palabras con 3 pestañas"""

    show_section_header("Bolsa de Palabras", "Creación de matriz de términos")

    # Check if preprocessed texts exist
    if 'preprocessing_results' not in st.session_state:
        st.warning("⚠️ No hay textos preprocesados disponibles. Debes completar primero la Sección 5: Preprocesamiento.")
        return

    tabs = st.tabs(["⚙️ Configuración", "📊 Resumen de BoW", "💾 Persistencia"])

    # Tab 1: Configuración
    with tabs[0]:
        st.markdown("### ⚙️ Configuración de Bolsa de Palabras")

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**Parámetros de Vocabulario**")
            max_features = st.number_input(
                "Máximo de términos", min_value=100, max_value=10000,
                value=1000, step=100,
                help="Número máximo de términos a incluir en el vocabulario")

            min_df = st.number_input(
                "Frecuencia mínima de documento", min_value=1, max_value=50,
                value=1,
                help="Término debe aparecer en al menos N documentos")

        with col2:
            st.markdown("**N-Gramas**")
            ngram_type = st.selectbox(
                "Tipo de n-gramas",
                ["Unigramas (1,1)", "Uni + Bigramas (1,2)",
                 "Uni + Bi + Trigramas (1,3)", "Solo Bigramas (2,2)"],
                help="Selecciona el tipo de n-gramas a usar")

            ngram_map = {
                "Unigramas (1,1)": (1, 1),
                "Uni + Bigramas (1,2)": (1, 2),
                "Uni + Bi + Trigramas (1,3)": (1, 3),
                "Solo Bigramas (2,2)": (2, 2)
            }
            ngram_range = ngram_map[ngram_type]

            max_df = st.slider(
                "Frecuencia máxima de documento (%)", 50, 100, 95,
                help="Ignorar términos que aparecen en más del X% de "
                     "documentos") / 100

        st.markdown("---")

        st.markdown("**Vista Previa de Configuración**")
        config_summary = f"""
        - **Máximo de términos**: {max_features}
        - **Frecuencia mínima**: {min_df} documentos
        - **Frecuencia máxima**: {int(max_df * 100)}% documentos
        - **N-gramas**: {ngram_type}
        """
        st.info(config_summary)

        if st.button("▶️ Crear Bolsa de Palabras", type="primary", use_container_width=True):
            st.session_state.bow_config = {
                'max_features': max_features,
                'min_df': min_df,
                'max_df': max_df,
                'ngram_range': ngram_range
            }
            st.success("✓ Configuración guardada. Ve a la pestaña 'Resumen de BoW' para crear la matriz.")
            st.rerun()

    # Tab 2: Resumen de BoW
    with tabs[1]:
        st.markdown("### 📊 Resumen de Bolsa de Palabras")

        if 'bow_config' not in st.session_state:
            st.info("ℹ️ Configura los parámetros de BoW en la pestaña 'Configuración' primero.")
            return

        config = st.session_state.bow_config

        if 'bow_results' not in st.session_state:
            # PRIMERO: Intentar cargar desde caché LOCAL
            from src.utils.local_cache import LocalCache

            local_cache = LocalCache('bow')
            cached_results = local_cache.load(config=config)

            if cached_results:
                # CARGAR DESDE CACHÉ LOCAL - ¡Instantáneo!
                st.success("✅ Resultados de Bolsa de Palabras cargados desde caché local")

                # Reconstruir si es necesario
                if isinstance(cached_results, dict) and 'dataframe_data' in cached_results:
                    from scipy.sparse import csr_matrix
                    bow_df = pd.DataFrame(
                        cached_results['dataframe_data']['values'],
                        columns=cached_results['dataframe_data']['columns'],
                        index=cached_results['dataframe_data']['index']
                    )
                    cached_results['dataframe'] = bow_df
                    cached_results['matrix'] = csr_matrix(bow_df.values)
                    cached_results['sparse_matrix'] = csr_matrix(bow_df.values)

                st.session_state.bow_results = cached_results
                st.rerun()
            else:
                # Si no hay caché local, verificar caché de Drive
                # Intentar cargar desde caché de Drive
                cached_results_drive, folder_05 = get_or_load_cached_results(
                    "05_BagOfWords_Results",
                    "bow_results.json",
                    source_files=None  # BoW depende del preprocesamiento, no de archivos directos
                )

                if cached_results_drive and 'dataframe_data' in cached_results_drive:
                    # CARGAR DESDE CACHÉ DE DRIVE - reconstruir el DataFrame
                    st.success("✅ Resultados de Bolsa de Palabras cargados desde Drive")

                    from scipy.sparse import csr_matrix

                    # Reconstruir DataFrame desde datos guardados
                    bow_df = pd.DataFrame(
                        cached_results_drive['dataframe_data']['values'],
                        columns=cached_results_drive['dataframe_data']['columns'],
                        index=cached_results_drive['dataframe_data']['index']
                    )

                    # Reconstruir el resultado completo
                    bow_result = {
                        'matrix': csr_matrix(bow_df.values),
                        'dataframe': bow_df,
                        'vectorizer': None,  # No se puede serializar, pero no se necesita para visualización
                        'vocabulary': cached_results_drive['vocabulary'],
                        'vocabulary_size': cached_results_drive['vocabulary_size'],
                        'document_count': cached_results_drive['document_count'],
                        'total_terms': cached_results_drive['total_terms'],
                        'sparse_matrix': csr_matrix(bow_df.values),
                        'dataframe_data': cached_results_drive['dataframe_data']
                    }

                    st.session_state.bow_results = bow_result
                    st.session_state.persistence_folders['05_BagOfWords_Results'] = folder_05
                    # Guardar en caché local para próxima vez
                    local_cache.save(
                        results=bow_result,
                        config=config,
                        metadata={'document_count': bow_result['document_count']}
                    )
                    st.rerun()

            # Si no hay caché, proceder con el procesamiento normal
            st.markdown("**Creando Bolsa de Palabras...**")

            preprocessor = st.session_state.text_preprocessor

            # Get cleaned texts
            preprocessing_results = st.session_state.preprocessing_results
            # Los resultados están en preprocessing_results['documents']
            # Cada documento tiene 'tokens' (lista), convertirlos a texto
            documents = preprocessing_results['documents']
            texts_dict = {name: ' '.join(doc_data['tokens']) for name, doc_data in documents.items()}

            with st.spinner("Creando matriz de términos..."):
                # Create BoW
                bow_result = preprocessor.create_bag_of_words(
                    texts_dict,
                    max_features=config['max_features'],
                    min_df=config['min_df'],
                    max_df=config['max_df'],
                    ngram_range=config['ngram_range']
                )

                if bow_result:
                    # NUEVO: Guardar caché de resultados
                    connector = get_connector()
                    folder_05 = connector.get_or_create_folder(
                        st.session_state.parent_folder_id,
                        "05_BagOfWords_Results"
                    )
                    st.session_state.persistence_folders['05_BagOfWords_Results'] = folder_05

                    # Preparar datos serializables para caché
                    cache_data = {
                        'dataframe_data': {
                            'values': bow_result['dataframe'].values.tolist(),
                            'columns': bow_result['dataframe'].columns.tolist(),
                            'index': bow_result['dataframe'].index.tolist()
                        },
                        'vocabulary': bow_result['vocabulary'].tolist(),
                        'vocabulary_size': bow_result['vocabulary_size'],
                        'document_count': bow_result['document_count'],
                        'total_terms': int(bow_result['total_terms'])
                    }

                    save_results_to_cache(
                        folder_05,
                        "bow_results.json",
                        cache_data
                    )

                    # Guardar matriz como CSV en Drive
                    save_csv_to_drive(folder_05, "bow_matrix.csv", bow_result['dataframe'])

                    # Guardar matriz sparse completa en pickle para uso posterior
                    pickle_data = {
                        'matrix': bow_result['sparse_matrix'],
                        'vocabulary': bow_result['vocabulary'],
                        'feature_names': bow_result['vocabulary'].tolist(),
                        'document_names': bow_result['dataframe'].index.tolist()
                    }
                    save_pickle_to_drive(folder_05, "bow_matrix.pkl", pickle_data)

                    # Guardar en caché local
                    local_cache.save(
                        results=bow_result,
                        config=config,
                        metadata={'document_count': bow_result['document_count']}
                    )

                    st.session_state.bow_results = bow_result
                    st.success("✓ Bolsa de Palabras creada correctamente")
                    st.info("💾 Resultados guardados en caché local, Drive y CSV exportado")
                    st.rerun()
                else:
                    st.error("❌ Error creando Bolsa de Palabras")
                    return

        # Show results
        bow = st.session_state.bow_results

        # Metrics
        st.markdown("**📈 Estadísticas de la Matriz**")
        col1, col2, col3, col4 = st.columns(4)

        col1.metric("Documentos", bow['document_count'])
        col2.metric("Vocabulario", f"{bow['vocabulary_size']:,}")
        col3.metric("Total Términos", f"{int(bow['total_terms']):,}")
        col4.metric("Densidad", f"{(bow['total_terms'] / (bow['document_count'] * bow['vocabulary_size']) * 100):.1f}%")

        st.markdown("---")

        # Top terms
        st.markdown("**🔝 Top 20 Términos Más Frecuentes**")

        preprocessor = st.session_state.text_preprocessor
        top_terms_df = preprocessor.get_top_terms_global(bow, top_n=20)

        col1, col2 = st.columns([1, 1])

        with col1:
            st.dataframe(top_terms_df, width='stretch', height=400)

        with col2:
            # Bar chart of top terms
            fig = go.Figure(data=[
                go.Bar(
                    x=top_terms_df['Frecuencia'],
                    y=top_terms_df['Término'],
                    orientation='h'
                )
            ])
            fig.update_layout(
                title='Top 20 Términos',
                xaxis_title='Frecuencia',
                yaxis_title='Término',
                height=400,
                yaxis={'categoryorder': 'total ascending'}
            )
            st.plotly_chart(fig, use_container_width=True)

            show_chart_interpretation(
                chart_type="Gráfico de Barras Horizontales",
                title="Top 20 Términos más Frecuentes",
                interpretation=(
                    "Esta gráfica muestra los **20 términos más frecuentes** en todo el corpus después del preprocesamiento. "
                    "La **Bolsa de Palabras (BoW)** es una representación simple pero fundamental que cuenta cuántas veces "
                    "aparece cada palabra en el conjunto de documentos, ignorando el orden y la gramática. "
                    "Esta visualización te ayuda a identificar los conceptos más recurrentes en tu corpus de "
                    "transformación digital en IES."
                ),
                how_to_read=(
                    "- El **eje Y** (vertical) lista los términos ordenados por frecuencia\n"
                    "- El **eje X** (horizontal) muestra el número total de apariciones\n"
                    "- Los **términos en la parte superior** son los más frecuentes\n"
                    "- Las **barras más largas** indican mayor presencia en el corpus"
                ),
                what_to_look_for=[
                    "**Términos dominantes**: ¿Qué palabras aparecen con mucha más frecuencia que las demás?",
                    "**Conceptos clave**: ¿Los términos reflejan los temas centrales de transformación digital esperados?",
                    "**Palabras genéricas vs específicas**: ¿Predominan términos generales o conceptos específicos del dominio?",
                    "**Stopwords residuales**: ¿Quedaron palabras muy comunes que deberían haberse filtrado en preprocesamiento?",
                    "**Distribución de frecuencias**: ¿Hay una caída pronunciada o gradual entre los términos más y menos frecuentes?"
                ]
            )

        st.markdown("---")

        # Matrix preview
        st.markdown("**📋 Vista Previa de la Matriz**")

        bow_df = bow['dataframe']

        # Show first 10 documents and top 20 terms
        preview_df = bow_df.iloc[:10, :20]

        st.dataframe(preview_df, use_container_width=True)
        st.caption(f"Mostrando primeros 10 documentos y primeros 20 términos de {bow['document_count']} x {bow['vocabulary_size']}")

        st.markdown("---")

        # Download full matrix option
        st.markdown("**💾 Descargar Matriz Completa**")

        csv_data = bow_df.to_csv().encode('utf-8')
        st.download_button(
            label="📥 Descargar matriz como CSV",
            data=csv_data,
            file_name="bow_matrix.csv",
            mime="text/csv"
        )

    # Tab 3: Persistencia
    with tabs[2]:
        st.markdown("### 💾 Persistencia de Resultados BoW")

        if 'bow_results' not in st.session_state:
            st.info("ℹ️ Debes crear la Bolsa de Palabras primero en la pestaña 'Resumen de BoW'.")
            return

        bow = st.session_state.bow_results

        st.markdown("**📂 Resultados listos para guardar**")
        st.markdown(f"- Documentos: {bow['document_count']}")
        st.markdown(f"- Vocabulario: {bow['vocabulary_size']:,} términos")

        # Check if already saved
        if st.session_state.persistence_folders['05_BagOfWords_Results'] is not None:
            folder_05 = st.session_state.persistence_folders['05_BagOfWords_Results']
            st.success("✓ Los resultados de BoW ya fueron guardados en Drive")
            st.info(f"**Carpeta:** 05_BagOfWords_Results\n**ID:** {folder_05}")

            st.markdown("**📋 Archivos Guardados**")
            saved_files = [
                "bow_matrix.csv - Matriz completa de términos (formato CSV)",
                "bow_matrix.pkl - Matriz sparse (formato pickle, para modelos ML)",
                "bow_results.json - Resultados y metadatos",
                "bow_vocabulary.txt - Lista de vocabulario",
                "bow_top_terms.csv - Top términos más frecuentes",
                "bow_statistics.txt - Estadísticas generales"
            ]
            for f in saved_files:
                st.markdown(f"- {f}")

            st.success("✓ Los resultados están listos para la siguiente etapa: " +
                       "**Análisis TF-IDF**")
        else:
            if st.button("💾 Guardar Resultados BoW en Drive", type="primary", use_container_width=True):
                connector = get_connector()
                if not connector:
                    st.error("❌ Error de conexión con Google Drive")
                    return

                # Create 05_BagOfWords_Results folder
                folder_05 = connector.get_or_create_folder(
                    st.session_state.parent_folder_id,
                    "05_BagOfWords_Results"
                )
                st.session_state.persistence_folders['05_BagOfWords_Results'] = folder_05

                progress_text = st.empty()

                # Save matrix as CSV and Pickle
                progress_text.text("Guardando matriz completa...")

                bow_df = bow['dataframe']
                save_csv_to_drive(folder_05, "bow_matrix.csv", bow_df)

                # Guardar matriz sparse en pickle
                pickle_data = {
                    'matrix': bow['sparse_matrix'],
                    'vocabulary': bow['vocabulary'],
                    'feature_names': bow['vocabulary'].tolist(),
                    'document_names': bow_df.index.tolist()
                }
                save_pickle_to_drive(folder_05, "bow_matrix.pkl", pickle_data)

                # Save vocabulary
                progress_text.text("Guardando vocabulario...")
                vocabulary_text = "\n".join(bow['vocabulary'])
                connector.create_text_file(folder_05, "bow_vocabulary.txt",
                                           vocabulary_text)

                # Save top terms
                progress_text.text("Guardando top términos...")
                preprocessor = st.session_state.text_preprocessor
                top_terms_df = preprocessor.get_top_terms_global(bow, top_n=50)
                top_terms_csv = top_terms_df.to_csv(index=False)
                connector.create_text_file(folder_05, "bow_top_terms.csv",
                                           top_terms_csv)

                # Save statistics
                progress_text.text("Guardando estadísticas...")
                stats_text = f"""Estadísticas de Bolsa de Palabras
=====================================

Documentos: {bow['document_count']}
Vocabulario: {bow['vocabulary_size']:,} términos
Total de términos: {int(bow['total_terms']):,}
Densidad: {(bow['total_terms'] / (bow['document_count'] * bow['vocabulary_size']) * 100):.2f}%

Configuración:
- max_features: {st.session_state.bow_config['max_features']}
- min_df: {st.session_state.bow_config['min_df']}
- max_df: {st.session_state.bow_config['max_df']}
- ngram_range: {st.session_state.bow_config['ngram_range']}
"""
                connector.create_text_file(folder_05, "bow_statistics.txt",
                                           stats_text)

                progress_text.empty()

                st.success("✓ Resultados guardados en carpeta '05_BagOfWords_Results'")
                st.info(f"**Carpeta ID:** {folder_05}")
                st.balloons()
                st.rerun()

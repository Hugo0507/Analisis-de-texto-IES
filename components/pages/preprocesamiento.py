"""
Página de Preprocesamiento
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from components.ui.helpers import show_section_header, get_connector


def render():
    """Renderiza la página de preprocesamiento de textos con 3 pestañas"""

    show_section_header("Preprocesamiento", "Limpieza y normalización de textos")

    # Check if txt_files exist
    if 'txt_files' not in st.session_state or not st.session_state.txt_files:
        st.warning("⚠️ No hay archivos TXT disponibles. Debes completar primero la Sección 4: Conversión a TXT.")
        return

    tabs = st.tabs(["⚙️ Configuración", "📊 Resumen de Preprocesamiento", "💾 Persistencia"])

    # Tab 1: Configuración
    with tabs[0]:
        st.markdown("### ⚙️ Configuración de Preprocesamiento")

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**Opciones de Limpieza**")
            remove_stopwords = st.checkbox(
                "Remover stopwords", value=True,
                help="Elimina palabras comunes sin significado (ej: 'el', 'la', 'de', 'en')")

            st.markdown("**Opciones de Normalización**")
            normalization = st.radio(
                "Selecciona tipo de normalización",
                ["Ninguna", "Stemming", "Lematización"],
                index=2,
                help="Stemming: reduce palabras a su raíz | Lematización: reduce palabras a su forma base"
            )

        with col2:
            st.markdown("**Idioma**")
            language = st.selectbox(
                "Idioma para procesamiento",
                ["english", "spanish", "french", "german", "italian"],
                index=0,
                help="Selecciona el idioma para el procesamiento del texto"
            )

        st.markdown("---")

        st.markdown("**Vista Previa de Configuración**")
        apply_stemming = normalization == "Stemming"
        apply_lemmatization = normalization == "Lematización"

        config_summary = f"""
        - **Remover stopwords**: {'✓ Sí' if remove_stopwords else '✗ No'}
        - **Normalización**: {normalization}
        - **Idioma**: {language}
        """
        st.info(config_summary)

        if st.button("▶️ Procesar Textos", type="primary", width='stretch'):
            # Save config to session
            st.session_state.preprocessing_config = {
                'remove_stopwords': remove_stopwords,
                'apply_stemming': apply_stemming,
                'apply_lemmatization': apply_lemmatization,
                'language': language
            }
            st.success("✓ Configuración guardada. Ve a la pestaña 'Resumen de Preprocesamiento' para procesar.")
            st.rerun()

    # Tab 2: Resumen de Preprocesamiento
    with tabs[1]:
        st.markdown("### 📊 Resumen de Preprocesamiento")

        if 'preprocessing_config' not in st.session_state:
            st.info("ℹ️ Configura las opciones de preprocesamiento en la pestaña 'Configuración' primero.")
            return

        config = st.session_state.preprocessing_config

        if 'preprocessing_results' not in st.session_state:
            # PRIMERO: Intentar cargar desde caché LOCAL
            from src.utils.local_cache import LocalCache

            local_cache = LocalCache('preprocessing')
            cached_results = local_cache.load(config=config)

            if cached_results:
                # CARGAR DESDE CACHÉ LOCAL - ¡Instantáneo!
                st.success("✅ Resultados de preprocesamiento cargados desde caché local")
                st.session_state.preprocessing_results = cached_results
                st.session_state.preprocessing_config_used = config
                st.rerun()
            else:
                # Si no hay caché local, verificar caché de Drive
                from components.ui.helpers import get_or_load_cached_results

                # Intentar cargar desde caché de Drive
                cached_results_drive, folder_04 = get_or_load_cached_results(
                    "04_TXT_Preprocessed",
                    "preprocessing_results.json",
                    source_files=st.session_state.txt_files
                )

                if cached_results_drive:
                    # CARGAR DESDE CACHÉ DE DRIVE - sin reprocesar
                    st.success("✅ Resultados de preprocesamiento cargados desde Drive")
                    st.session_state.preprocessing_results = cached_results_drive
                    st.session_state.preprocessing_config_used = config
                    st.session_state.persistence_folders['04_TXT_Preprocessed'] = folder_04
                    # Guardar en caché local para próxima vez
                    local_cache.save(
                        results=cached_results_drive,
                        config=config,
                        metadata={'document_count': len(st.session_state.txt_files)}
                    )
                    st.rerun()

            # Si no hay caché, proceder con el procesamiento normal
            connector = get_connector()
            if not connector:
                st.error("❌ Error de conexión con Google Drive")
                return

            # Verificar si existe carpeta 04_TXT_Preprocessed
            folder_04 = st.session_state.persistence_folders.get('04_TXT_Preprocessed')

            # Initialize preprocessor
            preprocessor = st.session_state.text_preprocessor
            preprocessor.language = config['language']

            # Si existe carpeta preprocesada, cargar directamente como tokens procesados
            if folder_04:
                st.markdown("**✅ Cargando resultados preprocesados desde Drive...**")

                # Si no tenemos la lista de archivos preprocesados, listarlos desde Drive
                if 'preprocessed_txt_files' not in st.session_state:
                    try:
                        all_preprocessed_files = connector.list_files_in_folder(folder_04)
                        if all_preprocessed_files:
                            # Filtrar solo archivos .txt
                            preprocessed_files = [
                                f for f in all_preprocessed_files
                                if f.get('name', '').lower().endswith('.txt')
                            ]
                            st.session_state.preprocessed_txt_files = [
                                {'name': f['name'], 'file_id': f['id']}
                                for f in preprocessed_files
                            ]
                    except Exception:
                        pass

                # Cargar tokens preprocesados directamente
                if 'preprocessed_txt_files' in st.session_state:
                    progress_bar = st.progress(0)
                    status_text = st.empty()

                    preprocessed_files = st.session_state.preprocessed_txt_files
                    total = len(preprocessed_files)

                    # Diccionario para guardar tokens por documento
                    preprocessed_tokens_dict = {}

                    for i, file_info in enumerate(preprocessed_files):
                        file_id = file_info.get('file_id')
                        file_name = file_info.get('name', 'Unknown')

                        if file_id:
                            try:
                                status_text.text(f"📂 Cargando {i+1}/{total}: {file_name}")
                                file_content = connector.read_file_content(file_id, max_retries=3)

                                if file_content:
                                    text = file_content.read().decode('utf-8', errors='ignore')
                                    if text.strip():
                                        # Los archivos ya contienen tokens separados por espacio
                                        tokens = text.strip().split()
                                        preprocessed_tokens_dict[file_name] = tokens
                            except Exception:
                                pass

                        progress_bar.progress((i + 1) / total)

                    status_text.empty()
                    progress_bar.empty()

                    if preprocessed_tokens_dict:
                        # Crear resultados a partir de tokens preprocesados
                        preprocessor.document_word_bags = {}
                        results = {}

                        for doc_name, tokens in preprocessed_tokens_dict.items():
                            # Crear bolsa de palabras
                            bolsa = preprocessor.crear_bolsa_palabras_documento(tokens, doc_name)

                            results[doc_name] = {
                                'document_id': doc_name,
                                'tokens': tokens,
                                'token_count': len(tokens),
                                'original_token_count': len(tokens),  # No tenemos el original
                                'unique_words': len(bolsa),
                                'word_bag': bolsa,
                                'top_words': bolsa.most_common(10)
                            }

                        # Agregar estadísticas globales
                        global_stats = preprocessor.obtener_estadisticas_bolsas()

                        batch_results = {
                            'documents': results,
                            'global_stats': global_stats,
                            'global_bag': preprocessor.obtener_bolsa_palabras_global(),
                            'top_global_words': preprocessor.obtener_top_palabras_global(20)
                        }

                        st.session_state.preprocessing_results = batch_results
                        st.session_state.preprocessing_config_used = config
                        # Guardar en caché local
                        local_cache.save(
                            results=batch_results,
                            config=config,
                            metadata={'document_count': len(results)}
                        )
                        st.success(f"✓ {len(results)} archivos preprocesados cargados desde Drive y guardados en caché local")
                        st.rerun()
                    else:
                        st.error("❌ No se pudieron cargar los archivos preprocesados")
                        return
                else:
                    st.error("❌ No se encontraron archivos en la carpeta preprocesada")
                    return

            # Si no existe carpeta preprocesada, procesar desde TXT originales
            else:
                st.markdown("**Procesando archivos TXT...**")

                # Validar conexión
                status_text = st.empty()
                progress_bar = st.progress(0)

                status_text.text("🔍 Validando conexión con Google Drive...")

                if not connector.ensure_connection():
                    status_text.empty()
                    progress_bar.empty()
                    st.error("❌ No se pudo establecer conexión con Google Drive. Por favor, intenta reconectar en la Sección 1.")
                    st.info("💡 **Sugerencia:** Si el problema persiste, elimina el archivo `token.json` y vuelve a autenticarte.")
                    return

                # Obtener carpeta 03_TXT_Converted
                folder_03 = st.session_state.persistence_folders.get('03_TXT_Converted')

                if not folder_03:
                    status_text.empty()
                    progress_bar.empty()
                    st.error("❌ No se encontró la carpeta 03_TXT_Converted. Debes completar primero la Sección 4: Conversión a TXT.")
                    return

                # Listar archivos directamente desde la carpeta en Drive
                status_text.text("📂 Listando archivos TXT desde Drive...")
                try:
                    all_files_from_drive = connector.list_files_in_folder(folder_03)
                    if not all_files_from_drive:
                        status_text.empty()
                        progress_bar.empty()
                        st.error("❌ No se encontraron archivos en la carpeta 03_TXT_Converted")
                        return

                    # Filtrar solo archivos .txt (excluir archivos del sistema, metadata, etc.)
                    txt_files_from_drive = [
                        f for f in all_files_from_drive
                        if f.get('name', '').lower().endswith('.txt')
                    ]

                    if not txt_files_from_drive:
                        status_text.empty()
                        progress_bar.empty()
                        st.error("❌ No se encontraron archivos .txt en la carpeta 03_TXT_Converted")
                        return

                    st.info(f"📁 Encontrados {len(txt_files_from_drive)} archivos .txt")

                except Exception as e:
                    status_text.empty()
                    progress_bar.empty()
                    st.error(f"❌ Error listando archivos: {type(e).__name__}")
                    return

                # Leer archivos
                texts_dict = {}
                total = len(txt_files_from_drive)
                error_count = 0
                success_count = 0

                status_text.text("Leyendo archivos TXT desde Drive...")
                for i, file_info in enumerate(txt_files_from_drive):
                    file_id = file_info.get('id')
                    file_name = file_info.get('name', 'Unknown')

                    if not file_id:
                        error_count += 1
                        progress_bar.progress((i + 1) / total * 0.5)
                        continue

                    try:
                        status_text.text(f"Leyendo archivo {i+1}/{total}: {file_name}")
                        file_content = connector.read_file_content(file_id, max_retries=3)

                        if file_content:
                            text = file_content.read().decode('utf-8', errors='ignore')
                            if text.strip():
                                texts_dict[file_name] = text
                                success_count += 1
                            else:
                                error_count += 1
                        else:
                            error_count += 1

                    except Exception:
                        error_count += 1

                    progress_bar.progress((i + 1) / total * 0.5)

                # Validar que se leyeron archivos
                if len(texts_dict) == 0:
                    status_text.empty()
                    progress_bar.empty()
                    st.error(f"❌ No se pudo leer ningún archivo. Total de errores: {error_count}")
                    st.info("💡 **Sugerencias:**\n"
                            "- Verifica tu conexión a Internet\n"
                            "- Elimina el archivo `token.json` y vuelve a autenticarte\n"
                            "- Revisa que los archivos TXT existan en Drive")
                    return

                status_text.text("Procesando textos (tokenización, limpieza, normalización)...")

                # Procesar textos
                try:
                    batch_results = preprocessor.procesar_batch_completo(
                        texts_dict,
                        remove_stopwords=config['remove_stopwords'],
                        apply_stemming=config['apply_stemming'],
                        apply_lemmatization=config['apply_lemmatization']
                    )
                except Exception as e:
                    status_text.empty()
                    progress_bar.empty()
                    st.error(f"❌ Error procesando textos: {type(e).__name__}: {e}")
                    return

                progress_bar.progress(1.0)
                status_text.empty()
                progress_bar.empty()

                # Guardar resultados
                st.session_state.preprocessing_results = batch_results
                st.session_state.preprocessing_config_used = config

                # Guardar en caché local
                local_cache.save(
                    results=batch_results,
                    config=config,
                    metadata={'document_count': len(batch_results['documents'])}
                )

                # NUEVO: Guardar caché de resultados en Drive
                from components.ui.helpers import save_results_to_cache

                # Asegurar que la carpeta 04_TXT_Preprocessed exista
                if not folder_04:
                    folder_04 = connector.get_or_create_folder(
                        st.session_state.parent_folder_id,
                        "04_TXT_Preprocessed"
                    )
                    st.session_state.persistence_folders['04_TXT_Preprocessed'] = folder_04

                # Guardar caché JSON con los resultados
                save_results_to_cache(
                    folder_04,
                    "preprocessing_results.json",
                    batch_results
                )

                # Mostrar resumen
                if error_count > 0:
                    st.warning(f"⚠️ {success_count} archivos procesados correctamente, {error_count} archivos con errores")
                else:
                    st.success(f"✓ {len(batch_results['documents'])} archivos procesados correctamente")

                st.info("💾 Resultados guardados en caché")

                st.rerun()

        # Show results
        results = st.session_state.preprocessing_results
        global_stats = results['global_stats']
        documents = results['documents']

        # Metrics
        st.markdown("**📈 Estadísticas Globales**")
        col1, col2, col3, col4 = st.columns(4)

        col1.metric("Total Documentos", global_stats['total_documents'])
        col2.metric("Palabras Únicas", f"{global_stats['total_unique_words']:,}")
        col3.metric("Total Palabras", f"{global_stats['total_words']:,}")
        col4.metric("Promedio por Doc", f"{global_stats['avg_words_per_doc']:.0f}")

        st.markdown("---")

        # Graphs
        st.markdown("**📊 Visualizaciones**")

        col1, col2 = st.columns(2)

        with col1:
            # Bar chart: Top 15 palabras globales
            top_words = results['top_global_words'][:15]
            words = [w[0] for w in top_words]
            freqs = [w[1] for w in top_words]

            fig = go.Figure(data=[
                go.Bar(x=words, y=freqs)
            ])
            fig.update_layout(
                title='Top 15 Palabras Más Frecuentes',
                xaxis_title='Palabra',
                yaxis_title='Frecuencia',
                height=300
            )
            st.plotly_chart(fig, width='stretch')

        with col2:
            # Pie chart: Distribución de tokens por documento
            doc_names = list(documents.keys())[:10]  # Top 10 docs
            doc_counts = [documents[name]['token_count'] for name in doc_names]

            fig = go.Figure(data=[go.Pie(
                labels=doc_names,
                values=doc_counts,
                hole=0.3
            )])
            fig.update_layout(title='Distribución de Tokens (Top 10 Docs)', height=300)
            st.plotly_chart(fig, width='stretch')

        st.markdown("---")

        # Detailed table
        st.markdown("**📋 Detalle por Documento**")

        report_data = []
        for doc_name, doc_result in documents.items():
            report_data.append({
                'Documento': doc_name,
                'Tokens Originales': doc_result['original_token_count'],
                'Tokens Procesados': doc_result['token_count'],
                'Palabras Únicas': doc_result['unique_words'],
                'Reducción (%)': round((1 - doc_result['token_count'] / doc_result['original_token_count']) * 100, 2) if doc_result['original_token_count'] > 0 else 0
            })

        report_df = pd.DataFrame(report_data)
        st.dataframe(report_df, width='stretch')

        st.markdown("---")

        # Top words per document
        st.markdown("**🔍 Top Palabras por Documento**")

        selected_doc = st.selectbox("Selecciona un documento", list(documents.keys()))

        if selected_doc:
            doc_result = documents[selected_doc]

            col1, col2 = st.columns(2)

            with col1:
                st.markdown("**Top 20 Palabras del Documento**")
                top_words_doc = doc_result['top_words'][:20] if len(doc_result['top_words']) >= 20 else doc_result['top_words']

                words_doc = [w[0] for w in top_words_doc]
                freqs_doc = [w[1] for w in top_words_doc]

                fig = go.Figure(data=[go.Bar(x=words_doc, y=freqs_doc)])
                fig.update_layout(
                    xaxis_title='Palabra',
                    yaxis_title='Frecuencia',
                    height=400
                )
                st.plotly_chart(fig, width='stretch')

            with col2:
                st.markdown("**Estadísticas del Documento**")
                st.metric("Tokens Procesados", doc_result['token_count'])
                st.metric("Palabras Únicas", doc_result['unique_words'])
                st.metric("Tokens Originales", doc_result['original_token_count'])

                st.markdown("**Muestra de Tokens Procesados**")
                tokens_preview = ' '.join(doc_result['tokens'][:100])
                if len(doc_result['tokens']) > 100:
                    tokens_preview += "..."
                st.text_area("Tokens", tokens_preview, height=200, disabled=True)

    # Tab 3: Persistencia
    with tabs[2]:
        st.markdown("### 💾 Persistencia de Textos Preprocesados")

        if 'preprocessing_results' not in st.session_state:
            st.info("ℹ️ Debes procesar los textos primero en la pestaña 'Resumen de Preprocesamiento'.")
            return

        results = st.session_state.preprocessing_results
        documents = results['documents']

        st.markdown(f"**📂 Archivos listos para guardar:** {len(documents)}")

        # Check if already saved
        if st.session_state.persistence_folders['04_TXT_Preprocessed'] is not None:
            folder_04 = st.session_state.persistence_folders['04_TXT_Preprocessed']
            st.success("✓ Los archivos preprocesados ya fueron guardados en Drive")
            st.info(f"**Carpeta:** 04_TXT_Preprocessed\n**ID:** {folder_04}")

            # Show saved files info
            st.markdown("**📋 Archivos Guardados**")
            saved_data = []
            for name, doc_result in documents.items():
                saved_data.append({
                    'Nombre': name,
                    'Tokens': doc_result['token_count'],
                    'Palabras Únicas': doc_result['unique_words'],
                    'Reducción (%)': round((1 - doc_result['token_count'] / doc_result['original_token_count']) * 100, 2) if doc_result['original_token_count'] > 0 else 0
                })

            saved_df = pd.DataFrame(saved_data)
            st.dataframe(saved_df, width='stretch')

            st.success("✓ Los archivos están listos para la siguiente etapa: **Bolsa de Palabras**")
        else:
            # Save button
            if st.button("💾 Guardar Textos Preprocesados en Drive", type="primary", width='stretch'):
                connector = get_connector()
                if not connector:
                    st.error("❌ Error de conexión con Google Drive")
                    return

                # Create 04_TXT_Preprocessed folder
                folder_04 = connector.get_or_create_folder(
                    st.session_state.parent_folder_id,
                    "04_TXT_Preprocessed"
                )
                st.session_state.persistence_folders['04_TXT_Preprocessed'] = folder_04

                # Save preprocessed texts (tokens como texto)
                progress_bar = st.progress(0)
                status_text = st.empty()

                total = len(documents)
                saved_files = []

                for i, (name, doc_result) in enumerate(documents.items()):
                    status_text.text(f"Guardando {i+1}/{total}: {name}")

                    # Convertir tokens a texto
                    processed_text = ' '.join(doc_result['tokens'])

                    # Save to Drive
                    file_id = connector.create_text_file(
                        folder_04,
                        name,
                        processed_text
                    )

                    if file_id:
                        saved_files.append({
                            'name': name,
                            'file_id': file_id,
                            'token_count': doc_result['token_count'],
                            'unique_words': doc_result['unique_words']
                        })

                    progress_bar.progress((i + 1) / total)

                status_text.empty()
                progress_bar.empty()

                # Save to session
                st.session_state.preprocessed_txt_files = saved_files

                st.success(f"✓ {len(saved_files)} archivos guardados en carpeta '04_TXT_Preprocessed'")
                st.info(f"**Carpeta ID:** {folder_04}")
                st.balloons()
                st.rerun()

"""
Página de Detección de Idiomas
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from components.ui.helpers import (
    show_section_header, show_chart_interpretation, get_connector, get_or_load_cached_results,
    save_results_to_cache, check_folder_has_files
)


def render():
    """Renderiza la página de detección de idiomas con cache y persistencia optimizada"""

    show_section_header(
        "Detección de Idiomas",
        "Visualiza la distribución de idiomas y prepara el subconjunto de análisis (PDF en inglés)"
    )

    if len(st.session_state.drive_files) == 0:
        st.warning("⚠️ Lista archivos primero en 'Estadísticas de Archivos'")
        return

    # Verificar si parent_folder_id está disponible
    if not st.session_state.parent_folder_id:
        st.error("❌ Error: No se pudo obtener la carpeta principal. Reconecta a Google Drive.")
        return

    tab1, tab2 = st.tabs(["📊 Resumen de Detección", "💾 Persistencia (Inglés)"])

    # ========== TAB 1: RESUMEN DE DETECCIÓN ==========
    with tab1:
        st.markdown("### Detección Automática de Idiomas")

        # Obtener PDFs para validación
        pdf_files = [f for f in st.session_state.drive_files
                     if f['name'].lower().endswith('.pdf')]

        # Verificar si ya existen resultados en cache
        # Validar contra la cantidad de PDFs actuales
        cached_results, folder_id = get_or_load_cached_results(
            "02_Language_Detection",
            "language_detection_results.json",
            source_files=pdf_files
        )

        if cached_results:
            # CARGAR DESDE CACHE
            st.success("✅ Resultados cargados desde cache (sin reprocesar)")

            # Restaurar a session_state
            st.session_state.pdf_files = [
                f for f in st.session_state.drive_files
                if f['name'].lower().endswith('.pdf')
            ]
            st.session_state.language_detection_results = (
                cached_results['files']
            )
            st.session_state.persistence_folders['02_Language_Detection'] = folder_id

            # Mostrar métricas
            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Total PDFs", cached_results['total_files'])
            col2.metric("Detectados", cached_results['detected'])
            col3.metric("Fallidos", cached_results.get('failed', 0))
            col4.metric("Idiomas Únicos", len(cached_results['languages']))

            st.markdown("---")

            # Gráfico de distribución de idiomas
            st.markdown("**📊 Distribución por Idioma**")

            # Verificar si hay idiomas detectados
            languages_dict = cached_results.get('languages', {})
            if languages_dict and len(languages_dict) > 0:
                col1, col2 = st.columns([1, 1])

                with col1:
                    # Mapeo de códigos de idioma a nombres completos
                    language_names = {
                        'en': 'Inglés',
                        'es': 'Español',
                        'fr': 'Francés',
                        'de': 'Alemán',
                        'it': 'Italiano',
                        'pt': 'Portugués',
                        'ru': 'Ruso',
                        'zh': 'Chino',
                        'ja': 'Japonés',
                        'ko': 'Coreano',
                        'ar': 'Árabe',
                        'hi': 'Hindi',
                        'nl': 'Holandés',
                        'pl': 'Polaco',
                        'tr': 'Turco',
                        'sv': 'Sueco',
                        'da': 'Danés',
                        'no': 'Noruego',
                        'fi': 'Finlandés',
                        'cs': 'Checo',
                        'hu': 'Húngaro',
                        'ro': 'Rumano',
                        'hr': 'Croata',
                        'sk': 'Eslovaco',
                        'bg': 'Búlgaro',
                        'el': 'Griego',
                        'he': 'Hebreo',
                        'th': 'Tailandés',
                        'vi': 'Vietnamita',
                        'id': 'Indonesio',
                        'ms': 'Malayo',
                        'uk': 'Ucraniano',
                        'ca': 'Catalán',
                        'et': 'Estonio',
                        'lt': 'Lituano',
                        'lv': 'Letón',
                        'sl': 'Esloveno',
                    }

                    # Crear lista para DataFrame con nombres completos
                    lang_data = [
                        {'Idioma': f"{language_names.get(k, k.upper())} ({k})", 'Cantidad': v}
                        for k, v in languages_dict.items()
                    ]
                    # Crear DataFrame y ordenar
                    lang_df = pd.DataFrame(lang_data)
                    if len(lang_df) > 0:
                        lang_df = lang_df.sort_values(
                            'Cantidad',
                            ascending=False
                        )

                    st.dataframe(lang_df, width='stretch', height=300)

                with col2:
                    fig = go.Figure(data=[go.Pie(
                        labels=lang_df['Idioma'],
                        values=lang_df['Cantidad'],
                        hole=0.3
                    )])
                    fig.update_layout(
                        title='Distribución de Idiomas',
                        height=300
                    )
                    st.plotly_chart(fig, use_container_width=True)

                    show_chart_interpretation(
                        chart_type="Gráfico Circular con Hueco (Donut Chart)",
                        title="Distribución de Idiomas Detectados",
                        interpretation=(
                            "Este gráfico muestra la **distribución porcentual de idiomas** detectados automáticamente "
                            "en tu corpus de documentos. Cada segmento representa un idioma diferente, y su tamaño "
                            "es proporcional a la cantidad de documentos escritos en ese idioma. Esto es crucial para "
                            "determinar si necesitas modelos de procesamiento multilingüe o si tu corpus es predominantemente "
                            "monolingüe."
                        ),
                        how_to_read=(
                            "- Cada **segmento de color** representa un idioma detectado\n"
                            "- El **tamaño del segmento** es proporcional al número de documentos en ese idioma\n"
                            "- El **hueco central** (estilo donut) facilita la lectura de los porcentajes\n"
                            "- Los **porcentajes** muestran la proporción de documentos en cada idioma"
                        ),
                        what_to_look_for=[
                            "**Idioma dominante**: ¿Hay un idioma que representa > 80% del corpus? Esto indica un corpus monolingüe predominante",
                            "**Multilingüismo**: ¿Hay múltiples idiomas con porcentajes significativos? Requerirás modelos y análisis específicos por idioma",
                            "**Idiomas inesperados**: ¿Aparecen idiomas que no esperabas? Puede indicar errores de detección o contenido mixto en documentos",
                            "**Implicaciones para análisis**: Solo documentos en el idioma objetivo (ej: inglés) pasarán a las siguientes fases de procesamiento"
                        ]
                    )
            else:
                st.warning(
                    "⚠️ No se detectaron idiomas exitosamente en ningún "
                    "archivo. Todos los archivos tuvieron errores."
                )
                # Crear DataFrame vacío para usar en filtros
                lang_df = pd.DataFrame(columns=['Idioma', 'Cantidad'])

            st.markdown("---")

            # Tabla detallada
            st.markdown("**📋 Detalle de Archivos**")

            files_df = pd.DataFrame(cached_results['files'])
            files_df = files_df[[
                'file_name', 'language_name', 'language_code', 'confidence'
            ]]
            files_df.columns = ['Archivo', 'Idioma', 'Código', 'Confianza']
            files_df['Confianza'] = files_df['Confianza'].apply(
                lambda x: f"{x:.2%}" if x > 0 else "Error"
            )

            # Filtros
            col1, col2 = st.columns(2)
            with col1:
                idioma_options = ["Todos"]
                if len(lang_df) > 0:
                    idioma_options += list(lang_df['Idioma'])
                idioma_filter = st.selectbox(
                    "Filtrar por idioma",
                    idioma_options
                )
            with col2:
                buscar = st.text_input("Buscar archivo", "")

            # Aplicar filtros
            df_filtered = files_df.copy()
            if idioma_filter != "Todos":
                df_filtered = df_filtered[
                    df_filtered['Código'] == idioma_filter.lower()
                ]
            if buscar:
                df_filtered = df_filtered[
                    df_filtered['Archivo'].str.contains(
                        buscar, case=False, na=False
                    )
                ]

            st.dataframe(df_filtered, width='stretch', height=400)
            st.caption(
                f"Mostrando {len(df_filtered)} de {len(files_df)} archivos"
            )

            # Mostrar archivos con error si existen
            error_files = [
                f for f in cached_results['files']
                if f.get('language_code') == 'error'
            ]
            if error_files:
                with st.expander(
                    f"⚠️ Ver {len(error_files)} archivos con error "
                    f"en detección"
                ):
                    error_df = pd.DataFrame(error_files)
                    error_df = error_df[['file_name']]
                    error_df.columns = ['Archivo con Error']
                    st.dataframe(error_df, use_container_width=True)
                    st.info(
                        "💡 Estos archivos no pudieron ser procesados. "
                        "Pueden ser PDFs corruptos, protegidos o sin texto."
                    )

        else:
            # PROCESAR (NO HAY CACHE)
            st.info("ℹ️ No se encontraron resultados previos. Inicia la detección de idiomas.")

            # Paso 1: Filtrar PDFs
            if len(st.session_state.pdf_files) == 0:
                if st.button(
                    "🔍 Filtrar Archivos PDF",
                    type="primary",
                    width='stretch'
                ):
                    with st.spinner("Filtrando archivos PDF..."):
                        pdf_files = [
                            f for f in st.session_state.drive_files
                            if f['name'].lower().endswith('.pdf')
                        ]
                        st.session_state.pdf_files = pdf_files
                    if pdf_files:
                        st.success(f"✓ {len(pdf_files)} archivos PDF encontrados")
                        st.rerun()
                    else:
                        st.warning("No se encontraron archivos PDF")
            else:
                st.success(
                    f"✓ {len(st.session_state.pdf_files)} "
                    f"archivos PDF filtrados"
                )

                # Paso 2: Detectar idiomas
                if len(st.session_state.language_detection_results) == 0:
                    st.markdown("---")
                    st.markdown("### Paso 2: Detección de Idiomas")
                    st.info(
                        "Detecta el idioma de cada PDF leyéndolo en "
                        "memoria (sin descargar)"
                    )

                    if st.button(
                        "🌍 Detectar Idiomas",
                        type="primary",
                        width='stretch'
                    ):
                        with st.spinner("Detectando idiomas..."):
                            progress_bar = st.progress(0)
                            status_text = st.empty()
                            results = []

                            connector = get_connector()
                            converter = st.session_state.document_converter
                            detector = st.session_state.language_detector

                            for idx, pdf_file in enumerate(
                                st.session_state.pdf_files
                            ):
                                status_text.text(
                                    f"Procesando {idx+1}/"
                                    f"{len(st.session_state.pdf_files)}: "
                                    f"{pdf_file['name']}"
                                )

                                try:
                                    # Leer PDF en memoria
                                    file_bytes = connector.read_file_content(pdf_file['id'])

                                    if file_bytes:
                                        # Convertir a texto
                                        conversion = converter.convert_from_bytes(
                                            file_bytes,
                                            pdf_file['name'],
                                            '.pdf'
                                        )

                                        if (conversion['success'] and
                                                conversion['text']):
                                            # Detectar idioma
                                            lang_result = (
                                                detector.detect_language(
                                                    conversion['text']
                                                )
                                            )

                                            # Validar resultado tenga claves necesarias
                                            if (not isinstance(lang_result, dict) or
                                                    'language_code' not in
                                                    lang_result):
                                                lang_result = {
                                                    'language_code': 'error',
                                                    'language_name': 'Error',
                                                    'confidence': 0
                                                }

                                            lang_result['file_id'] = pdf_file['id']
                                            lang_result['file_name'] = pdf_file['name']
                                            results.append(lang_result)
                                        else:
                                            results.append({
                                                'file_id': pdf_file['id'],
                                                'file_name': pdf_file['name'],
                                                'language_code': 'error',
                                                'language_name': 'Error',
                                                'confidence': 0
                                            })
                                    else:
                                        results.append({
                                            'file_id': pdf_file['id'],
                                            'file_name': pdf_file['name'],
                                            'language_code': 'error',
                                            'language_name': 'Error',
                                            'confidence': 0
                                        })
                                except Exception:
                                    # Manejar cualquier excepción y registrar el error
                                    results.append({
                                        'file_id': pdf_file['id'],
                                        'file_name': pdf_file['name'],
                                        'language_code': 'error',
                                        'language_name': 'Error',
                                        'confidence': 0
                                    })

                                progress_bar.progress(
                                    (idx + 1) /
                                    len(st.session_state.pdf_files)
                                )

                            status_text.empty()
                            progress_bar.empty()

                            # Guardar resultados
                            st.session_state.language_detection_results = (
                                results
                            )

                            # Calcular estadísticas
                            detected = len([
                                r for r in results
                                if r.get('language_code') != 'error'
                            ])
                            failed = len([
                                r for r in results
                                if r.get('language_code') == 'error'
                            ])

                            lang_counts = {}
                            for r in results:
                                lang_code = r.get('language_code')
                                if lang_code and lang_code != 'error':
                                    lang_counts[lang_code] = (
                                        lang_counts.get(lang_code, 0) + 1
                                    )

                            # Crear estructura para guardar
                            cache_data = {
                                'total_files': len(results),
                                'detected': detected,
                                'failed': failed,
                                'languages': lang_counts,
                                'files': results
                            }

                            # Guardar en Drive
                            if not folder_id:
                                folder_id = connector.get_or_create_folder(
                                    st.session_state.parent_folder_id,
                                    "02_Language_Detection"
                                )
                                st.session_state.persistence_folders[
                                    '02_Language_Detection'
                                ] = folder_id

                            save_results_to_cache(
                                folder_id,
                                "language_detection_results.json",
                                cache_data
                            )

                        st.success(
                            f"✓ {detected} idiomas detectados "
                            f"correctamente, {failed} con error"
                        )
                        st.info(
                            "💾 Resultados guardados en carpeta "
                            "'02_Language_Detection'"
                        )
                        st.rerun()

    # ========== TAB 2: PERSISTENCIA (INGLÉS) ==========
    with tab2:
        st.markdown("### 💾 Persistencia de PDFs en Inglés")

        if len(st.session_state.language_detection_results) == 0:
            st.info(
                "ℹ️ Debes detectar idiomas primero en la pestaña "
                "'Resumen de Detección'."
            )
            return

        # Filtrar PDFs en inglés
        english_pdfs = [
            r for r in st.session_state.language_detection_results
            if r.get('language_code') == 'en'
        ]

        st.markdown(f"**📂 Archivos en inglés identificados:** {len(english_pdfs)}")

        # Verificar si ya se guardaron
        connector = get_connector()
        parent_folder = st.session_state.persistence_folders.get(
            '02_Language_Detection')

        if parent_folder:
            # Buscar subcarpeta de PDFs en inglés
            subfolder = connector.get_or_create_folder(
                parent_folder, "02_Language_Detection")

            # Verificar si ya existen archivos en la carpeta
            folder_check = check_folder_has_files(
                subfolder,
                expected_count=len(english_pdfs),
                file_extension='.pdf'
            )

            if folder_check['valid'] and folder_check['has_files']:
                # Ya existen todos los archivos
                st.success(
                    f"✓ Los {folder_check['count']} PDFs en inglés "
                    f"ya están guardados"
                )
                st.info(
                    f"**Subcarpeta:** 02_PDF_EN_Detected\n"
                    f"**ID:** {subfolder}"
                )

                # Guardar en session state
                st.session_state.persistence_folders['02_Language_Detection'] = (
                    subfolder)
                st.session_state.english_pdf_files = english_pdfs

                # Mostrar tabla
                df = pd.DataFrame(english_pdfs)
                df = df[['file_name', 'confidence']]
                df.columns = ['Archivo', 'Confianza']
                df['Confianza'] = df['Confianza'].apply(lambda x: f"{x:.2%}")
                st.dataframe(df, use_container_width=True)

                st.success(
                    "✓ Los archivos están listos para la siguiente etapa: "
                    "**Conversión a TXT**"
                )
            elif folder_check['has_files'] and not folder_check['valid']:
                # Hay archivos pero no coincide la cantidad
                st.warning(
                    f"⚠️ La carpeta tiene {folder_check['count']} archivos "
                    f"pero se esperan {len(english_pdfs)}. "
                    f"Debes volver a copiar los archivos."
                )

                if st.button(
                    "🔄 Recopiar todos los archivos",
                    type="primary",
                    width='stretch'
                ):
                    with st.spinner("Copiando archivos..."):
                        progress_bar = st.progress(0)
                        status_text = st.empty()

                        pdf_ids = [r['file_id'] for r in english_pdfs]

                        for i, file_id in enumerate(pdf_ids):
                            status_text.text(f"Copiando {i+1}/{len(pdf_ids)}")
                            connector.copy_file(file_id, subfolder)
                            progress_bar.progress((i + 1) / len(pdf_ids))

                        status_text.empty()
                        progress_bar.empty()

                    st.session_state.persistence_folders['02_Language_Detection'] = (
                        subfolder)
                    st.session_state.english_pdf_files = english_pdfs

                    st.success(
                        f"✓ {len(english_pdfs)} archivos copiados a "
                        f"'02_Language_Detection'"
                    )
                    st.balloons()
                    st.rerun()
            else:
                # Guardar PDFs
                if st.button(
                    "💾 Copiar PDFs en Inglés a Drive",
                    type="primary",
                    width='stretch'
                ):
                    if not subfolder:
                        subfolder = connector.create_folder("02_Language_Detection", parent_folder)

                    with st.spinner("Copiando archivos..."):
                        progress_bar = st.progress(0)
                        status_text = st.empty()

                        pdf_ids = [r['file_id'] for r in english_pdfs]

                        for i, file_id in enumerate(pdf_ids):
                            status_text.text(f"Copiando {i+1}/{len(pdf_ids)}")
                            connector.copy_file(file_id, subfolder)
                            progress_bar.progress((i + 1) / len(pdf_ids))

                        status_text.empty()
                        progress_bar.empty()

                    st.session_state.persistence_folders['02_Language_Detection'] = subfolder
                    st.session_state.english_pdf_files = english_pdfs

                    st.success(f"✓ {len(english_pdfs)} archivos copiados a '02_Language_Detection'")
                    st.balloons()
                    st.rerun()
        else:
            st.warning("⚠️ Debes completar la detección de idiomas primero.")

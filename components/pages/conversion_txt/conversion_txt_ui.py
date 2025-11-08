"""
Módulo de UI - Conversión a TXT
Componentes visuales con Streamlit
"""

import streamlit as st
import plotly.express as px
from components.ui.helpers import (
    show_section_header, get_connector, check_folder_has_files,
    get_or_load_cached_results, save_results_to_cache
)
from . import conversion_txt as logic


def render_summary_tab():
    """Renderiza tab de resumen de conversión"""
    st.subheader("Conversión de PDF a TXT")

    st.info(
        f"📁 Trabajando con {len(st.session_state.english_pdf_files)} "
        f"archivos PDF en inglés"
    )

    # Verificar si ya existen resultados en cache
    cached_results, folder_id = get_or_load_cached_results(
        "03_TXT_Converted",
        "conversion_results.json",
        source_files=st.session_state.english_pdf_files
    )

    # Si hay cache válido, cargar resultados
    if cached_results and len(st.session_state.conversion_results) == 0:
        st.success("✅ Resultados de conversión cargados desde cache")
        st.session_state.conversion_results = cached_results.get('files', [])
        st.session_state.persistence_folders['03_TXT_Converted'] = folder_id

        # Extraer txt_files del cache usando lógica
        txt_files = logic.extract_txt_files_from_results(st.session_state.conversion_results)
        st.session_state.txt_files = txt_files

    # Conversión
    if len(st.session_state.conversion_results) == 0:
        if st.button("🔄 Convertir PDFs a TXT", type="primary", use_container_width=True):
            with st.spinner("Convirtiendo archivos..."):
                progress_bar = st.progress(0)
                results = []

                for idx, pdf_file in enumerate(st.session_state.english_pdf_files):
                    # Leer PDF en memoria
                    file_bytes = (st.session_state.drive_connector
                                  .read_file_content(pdf_file['file_id']))

                    if file_bytes:
                        # Convertir a texto
                        conversion = st.session_state.document_converter.convert_from_bytes(
                            file_bytes,
                            pdf_file['file_name'],
                            '.pdf'
                        )

                        conversion['original_file'] = pdf_file
                        results.append(conversion)
                    else:
                        results.append({
                            'file': pdf_file['file_name'],
                            'extension': '.pdf',
                            'success': False,
                            'error': 'No se pudo leer el archivo',
                            'text': None,
                            'text_length': 0,
                            'original_file': pdf_file
                        })

                    progress_bar.progress((idx + 1) / len(st.session_state.english_pdf_files))

                st.session_state.conversion_results = results

                # Guardar resultados en cache JSON usando lógica
                connector = get_connector()
                if not folder_id:
                    folder_id = connector.get_or_create_folder(
                        st.session_state.parent_folder_id,
                        "03_TXT_Converted"
                    )

                cache_data = logic.prepare_cache_data(results)
                save_results_to_cache(
                    folder_id,
                    "conversion_results.json",
                    cache_data
                )

            st.success("✓ Conversión completada")
            st.info("💾 Resultados guardados en cache")
            st.rerun()
    else:
        st.success(f"✓ {len(st.session_state.conversion_results)} archivos procesados")

        # Estadísticas usando lógica
        results = st.session_state.conversion_results
        stats = logic.calculate_conversion_stats(results)
        successful = logic.filter_successful_conversions(results)
        failed = logic.filter_failed_conversions(results)

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Archivos", stats['total'])
        with col2:
            st.metric("Convertidos", stats['successful'])
        with col3:
            st.metric("Fallidos", stats['failed'])
        with col4:
            st.metric("Tasa de Éxito", f"{stats['success_rate']:.1f}%")

        # Gráficas
        st.markdown("### Resultados de Conversión")

        col1, col2 = st.columns(2)

        with col1:
            # Gráfico de pastel usando lógica
            conversion_df = logic.prepare_conversion_distribution_df(stats)

            fig1 = px.pie(
                conversion_df, values='Cantidad', names='Estado',
                title='Distribución de Conversión',
                color='Estado',
                color_discrete_map={
                    'Exitosos': '#28a745', 'Fallidos': '#dc3545'
                }
            )
            st.plotly_chart(fig1, use_container_width=True)

        with col2:
            # Estadísticas de longitud de texto usando lógica
            if successful:
                text_stats = logic.calculate_text_length_stats(successful)
                stats_df = logic.prepare_text_stats_df(text_stats)
                st.markdown("**Estadísticas de Texto Extraído**")
                st.dataframe(stats_df, width='stretch', hide_index=True)

        # Tabla detallada usando lógica
        st.markdown("### Detalle por Archivo")
        detail_df = logic.prepare_detail_dataframe(results)
        st.dataframe(detail_df, width='stretch', height=300)

        # Archivos fallidos (si hay)
        if failed:
            with st.expander(
                f"⚠️ Ver {len(failed)} archivos con error "
                f"en conversión"
            ):
                failed_df = logic.prepare_failed_dataframe(failed)
                st.dataframe(failed_df, use_container_width=True)
                st.info(
                    "💡 Estos archivos no pudieron ser convertidos. "
                    "Pueden ser PDFs corruptos, protegidos, sin texto "
                    "extraíble o con formato no compatible."
                )


def render_persistence_tab():
    """Renderiza tab de persistencia TXT"""
    st.subheader("Guardar Archivos TXT en Drive")

    if len(st.session_state.conversion_results) == 0:
        st.info(
            "ℹ️ Primero convierte los PDFs en la pestaña "
            "'Resumen de Conversión'"
        )
        return

    connector = get_connector()

    # Verificar si ya existe la carpeta y archivos
    folder_03 = st.session_state.persistence_folders.get('03_TXT_Converted')

    if not folder_03:
        folder_03 = connector.get_or_create_folder(
            st.session_state.parent_folder_id,
            "03_TXT_Converted"
        )

    # Verificar archivos existentes
    successful = logic.filter_successful_conversions(st.session_state.conversion_results)

    folder_check = check_folder_has_files(
        folder_03,
        expected_count=len(successful),
        file_extension='.txt'
    )

    # Si ya existen todos los archivos
    if folder_check['valid'] and folder_check['has_files']:
        st.success(
            f"✓ Los {folder_check['count']} archivos TXT ya están "
            f"guardados en Drive"
        )

        # Guardar referencias en session_state
        st.session_state.persistence_folders['03_TXT_Converted'] = folder_03

        if not st.session_state.txt_files:
            txt_files = []
            for f in folder_check['files']:
                txt_files.append({
                    'name': f['name'],
                    'id': f['id'],
                    'length': int(f.get('size', 0))
                })
            st.session_state.txt_files = txt_files

        st.info(f"""
        **Carpeta en Google Drive:**
        - Nombre: `03_TXT_Converted`
        - Archivos: {len(st.session_state.txt_files)} archivos TXT
        - ID: `{folder_03}`

        Esta carpeta contiene los archivos de texto convertidos desde
        los PDFs en inglés, listos para el preprocesamiento.
        """)

        # Tabla de archivos guardados usando lógica
        st.markdown("### Archivos TXT Guardados")

        if st.session_state.txt_files:
            txt_df = logic.prepare_txt_files_dataframe(st.session_state.txt_files)
            st.dataframe(txt_df, width='stretch', height=300)

        st.success(
            "✅ **Proceso completado** - Los archivos están listos "
            "para el preprocesamiento"
        )

    elif folder_check['has_files'] and not folder_check['valid']:
        # Hay archivos pero no coincide la cantidad
        st.warning(
            f"⚠️ La carpeta tiene {folder_check['count']} archivos "
            f"pero se esperan {len(successful)}. "
            f"Debes volver a guardar los archivos."
        )

        if st.button(
            "🔄 Volver a guardar todos los archivos TXT",
            type="primary",
            use_container_width=True
        ):
            _save_txt_files_to_drive(connector, folder_03, successful)

    else:
        # No hay archivos, guardarlos
        st.info(
            f"Guarda los {len(successful)} archivos TXT exitosos "
            f"en Google Drive"
        )

        if st.button(
            "💾 Guardar TXTs en Drive (03_TXT_Converted)",
            type="primary",
            use_container_width=True
        ):
            _save_txt_files_to_drive(connector, folder_03, successful)


def _save_txt_files_to_drive(connector, folder_03, successful):
    """
    Función auxiliar para guardar archivos TXT en Drive

    Args:
        connector: Conector de Google Drive
        folder_03: ID de la carpeta 03_TXT_Converted
        successful: Lista de conversiones exitosas
    """
    with st.spinner("Creando carpeta y guardando archivos TXT..."):
        # Crear carpeta 03_TXT_Converted si no existe
        if not folder_03:
            folder_03 = connector.get_or_create_folder(
                st.session_state.parent_folder_id,
                "03_TXT_Converted"
            )
        st.session_state.persistence_folders['03_TXT_Converted'] = folder_03

        # Guardar cada TXT exitoso
        progress_bar = st.progress(0)
        saved_files = []

        for idx, result in enumerate(successful):
            # Nombre del archivo TXT
            original_name = result['file']
            txt_name = original_name.replace('.pdf', '.txt')

            # Crear archivo TXT en Drive
            file_id = connector.create_text_file(
                folder_03,
                txt_name,
                result['text']
            )

            if file_id:
                saved_files.append({
                    'name': txt_name,
                    'id': file_id,
                    'length': result['text_length']
                })
                # Actualizar el resultado de conversión con el file_id
                result['file_id'] = file_id

            progress_bar.progress((idx + 1) / len(successful))

        st.session_state.txt_files = saved_files

        # Actualizar cache con los file_ids usando lógica
        cache_data = logic.prepare_cache_data(st.session_state.conversion_results)
        save_results_to_cache(
            folder_03,
            "conversion_results.json",
            cache_data
        )

    st.success(
        f"✓ {len(saved_files)} archivos TXT guardados en Drive"
    )
    st.balloons()
    st.rerun()


def render():
    """Renderiza la página de conversión de PDF a TXT con 2 pestañas"""

    show_section_header(
        "Conversión a TXT",
        "Convierte los archivos PDF en inglés a formato TXT y asegura la persistencia"
    )

    if len(st.session_state.english_pdf_files) == 0:
        st.warning("⚠️ Primero filtra los PDFs en inglés en la sección 'Detección de Idiomas'")
        return

    tab1, tab2 = st.tabs(["Resumen de Conversión", "Persistencia (TXT)"])

    with tab1:
        render_summary_tab()

    with tab2:
        render_persistence_tab()

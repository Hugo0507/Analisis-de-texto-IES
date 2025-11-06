"""
Página de Conversión a TXT
"""

import streamlit as st
import pandas as pd
import plotly.express as px
from components.ui.helpers import (
    show_section_header, get_connector, check_folder_has_files,
    get_or_load_cached_results, save_results_to_cache
)


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

            # Extraer txt_files del cache
            txt_files = []
            for result in st.session_state.conversion_results:
                if result.get('success'):
                    txt_files.append({
                        'name': result['file'].replace('.pdf', '.txt'),
                        'id': result.get('file_id', ''),
                        'length': result.get('text_length', 0)
                    })
            st.session_state.txt_files = txt_files

        # Conversión
        if len(st.session_state.conversion_results) == 0:
            if st.button("🔄 Convertir PDFs a TXT", type="primary", width='stretch'):
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

                    # Guardar resultados en cache JSON
                    connector = get_connector()
                    if not folder_id:
                        folder_id = connector.get_or_create_folder(
                            st.session_state.parent_folder_id,
                            "03_TXT_Converted"
                        )

                    cache_data = {
                        'total_files': len(results),
                        'successful': len([r for r in results if r['success']]),
                        'failed': len([r for r in results if not r['success']]),
                        'files': results
                    }

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

            # Estadísticas
            results = st.session_state.conversion_results
            successful = [r for r in results if r['success']]
            failed = [r for r in results if not r['success']]

            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Total Archivos", len(results))
            with col2:
                st.metric("Convertidos", len(successful))
            with col3:
                st.metric("Fallidos", len(failed))
            with col4:
                success_rate = (len(successful) / len(results) * 100) if results else 0
                st.metric("Tasa de Éxito", f"{success_rate:.1f}%")

            # Gráficas
            st.markdown("### Resultados de Conversión")

            col1, col2 = st.columns(2)

            with col1:
                # Gráfico de pastel
                conversion_df = pd.DataFrame([
                    {'Estado': 'Exitosos', 'Cantidad': len(successful)},
                    {'Estado': 'Fallidos', 'Cantidad': len(failed)}
                ])

                fig1 = px.pie(
                    conversion_df, values='Cantidad', names='Estado',
                    title='Distribución de Conversión',
                    color='Estado',
                    color_discrete_map={
                        'Exitosos': '#28a745', 'Fallidos': '#dc3545'
                    }
                )
                st.plotly_chart(fig1, width='stretch')

            with col2:
                # Estadísticas de longitud de texto
                if successful:
                    lengths = [r['text_length'] for r in successful]
                    stats_df = pd.DataFrame({
                        'Métrica': ['Promedio', 'Mínimo', 'Máximo', 'Total'],
                        'Caracteres': [
                            f"{sum(lengths) / len(lengths):,.0f}",
                            f"{min(lengths):,.0f}",
                            f"{max(lengths):,.0f}",
                            f"{sum(lengths):,.0f}"
                        ]
                    })
                    st.markdown("**Estadísticas de Texto Extraído**")
                    st.dataframe(stats_df, width='stretch', hide_index=True)

            # Tabla detallada
            st.markdown("### Detalle por Archivo")

            detail_df = pd.DataFrame([
                {
                    'Archivo': r['file'],
                    'Estado': '✓ Exitoso' if r['success'] else '✗ Fallido',
                    'Longitud Texto': f"{r['text_length']:,}" if r['success'] else '-',
                    'Error': r.get('error', '-') if not r['success'] else '-'
                }
                for r in results
            ])

            st.dataframe(detail_df, width='stretch', height=300)

            # Archivos fallidos (si hay)
            if failed:
                with st.expander(
                    f"⚠️ Ver {len(failed)} archivos con error "
                    f"en conversión"
                ):
                    failed_df = pd.DataFrame([
                        {
                            'Archivo': r['file'],
                            'Error': r.get('error', 'Desconocido')
                        }
                        for r in failed
                    ])
                    st.dataframe(failed_df, width='stretch')
                    st.info(
                        "💡 Estos archivos no pudieron ser convertidos. "
                        "Pueden ser PDFs corruptos, protegidos, sin texto "
                        "extraíble o con formato no compatible."
                    )

    with tab2:
        st.subheader("Guardar Archivos TXT en Drive")

        if len(st.session_state.conversion_results) == 0:
            st.info(
                "ℹ️ Primero convierte los PDFs en la pestaña "
                "'Resumen de Conversión'"
            )
        else:
            connector = get_connector()

            # Verificar si ya existe la carpeta y archivos
            folder_03 = st.session_state.persistence_folders.get(
                '03_TXT_Converted')

            if not folder_03:
                folder_03 = connector.get_or_create_folder(
                    st.session_state.parent_folder_id,
                    "03_TXT_Converted"
                )

            # Verificar archivos existentes
            successful = [r for r in st.session_state.conversion_results
                          if r['success']]

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
                st.session_state.persistence_folders['03_TXT_Converted'] = (
                    folder_03)

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

                # Tabla de archivos guardados
                st.markdown("### Archivos TXT Guardados")

                if st.session_state.txt_files:
                    txt_df = pd.DataFrame([
                        {
                            'Archivo': f['name'],
                            'ID en Drive': f['id'][:30] + '...'
                        }
                        for f in st.session_state.txt_files
                    ])
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
                    width='stretch'
                ):
                    with st.spinner("Guardando archivos TXT..."):
                        progress_bar = st.progress(0)
                        saved_files = []

                        for idx, result in enumerate(successful):
                            original_name = result['file']
                            txt_name = original_name.replace('.pdf', '.txt')

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
                        st.session_state.persistence_folders[
                            '03_TXT_Converted'] = folder_03

                        # Actualizar cache con los file_ids
                        cache_data = {
                            'total_files': len(st.session_state.conversion_results),
                            'successful': len([r for r in st.session_state.conversion_results if r['success']]),
                            'failed': len([r for r in st.session_state.conversion_results if not r['success']]),
                            'files': st.session_state.conversion_results
                        }
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

            else:
                # No hay archivos, guardarlos
                st.info(
                    f"Guarda los {len(successful)} archivos TXT exitosos "
                    f"en Google Drive"
                )

                if st.button(
                    "💾 Guardar TXTs en Drive (03_TXT_Converted)",
                    type="primary",
                    width='stretch'
                ):
                    with st.spinner(
                        "Creando carpeta y guardando archivos TXT..."
                    ):
                        # Crear carpeta 03_TXT_Converted
                        if not folder_03:
                            folder_03 = connector.get_or_create_folder(
                                st.session_state.parent_folder_id,
                                "03_TXT_Converted"
                            )
                        st.session_state.persistence_folders[
                            '03_TXT_Converted'] = folder_03

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

                        # Actualizar cache con los file_ids
                        cache_data = {
                            'total_files': len(st.session_state.conversion_results),
                            'successful': len([r for r in st.session_state.conversion_results if r['success']]),
                            'failed': len([r for r in st.session_state.conversion_results if not r['success']]),
                            'files': st.session_state.conversion_results
                        }
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

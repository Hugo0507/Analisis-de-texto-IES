"""
Página de Estadísticas de Archivos
"""

import streamlit as st
import pandas as pd
import plotly.express as px
from components.ui.helpers import show_section_header
from src.drive_connector import format_size


# Constante
DEFAULT_DRIVE_FOLDER_URL = "https://drive.google.com/drive/u/2/folders/1tDUZ4PnQen_lSr6z4ZALji2zdtrJf-sS"


def render():
    """Renderiza la página de estadísticas de archivos con 3 pestañas"""

    show_section_header(
        "Estadísticas de Archivos",
        "Visualiza la distribución de archivos en tu carpeta de Google Drive"
    )

    if not st.session_state.authenticated:
        st.warning("⚠️ Conéctate a Google Drive primero")
        return

    # Pestañas horizontales
    tab1, tab2, tab3 = st.tabs(["Configuración", "Resumen General", "Distribución por Carpeta"])

    with tab1:
        st.subheader("Configuración")

        folder_url = st.text_input(
            "URL o ID de Google Drive",
            value=DEFAULT_DRIVE_FOLDER_URL,
            help="Pega la URL completa o el ID de la carpeta"
        )

        col1, col2 = st.columns([1, 3])
        with col1:
            if st.button("Listar Archivos", type="primary", width='stretch'):
                folder_id = st.session_state.drive_connector.get_folder_id_from_url(folder_url)
                st.session_state.source_folder_id = folder_id

                with st.spinner("Listando archivos..."):
                    files = st.session_state.drive_connector.list_files_in_folder(folder_id, recursive=True)
                    st.session_state.drive_files = files

                if files:
                    st.success(f"✓ {len(files)} archivos encontrados")
                    st.rerun()
                else:
                    st.warning("No se encontraron archivos")

    with tab2:
        if len(st.session_state.drive_files) == 0:
            st.info("ℹ️ Lista archivos primero en la pestaña 'Configuración'")
        else:
            files = st.session_state.drive_files
            stats = st.session_state.drive_connector.get_file_statistics(files)

            # Métricas
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Total Archivos", stats['total_files'])
            with col2:
                st.metric("Directorios", len(stats['by_directory']))
            with col3:
                st.metric("Tipos", len(stats['by_extension']))
            with col4:
                st.metric("Tamaño", format_size(stats['total_size']))

            st.markdown("### Archivos por Directorio")

            table_df = st.session_state.drive_connector.create_directory_summary_table(files)
            st.dataframe(table_df, width='stretch', hide_index=True)

            st.markdown("### Lista Detallada")

            df_files = st.session_state.drive_connector.create_file_dataframe(files)

            col1, col2, col3 = st.columns(3)
            with col1:
                filter_ext = st.multiselect("Filtrar por extensión", df_files['Extensión'].unique())
            with col2:
                filter_dir = st.multiselect("Filtrar por directorio", df_files['Directorio'].unique())
            with col3:
                search = st.text_input("Buscar por nombre")

            df_filtered = df_files.copy()
            if filter_ext:
                df_filtered = df_filtered[df_filtered['Extensión'].isin(filter_ext)]
            if filter_dir:
                df_filtered = df_filtered[df_filtered['Directorio'].isin(filter_dir)]
            if search:
                df_filtered = df_filtered[df_filtered['Nombre'].str.contains(search, case=False, na=False)]

            st.caption(f"Mostrando {len(df_filtered)} de {len(df_files)} archivos")
            st.dataframe(df_filtered, width='stretch', height=400)

    with tab3:
        if len(st.session_state.drive_files) == 0:
            st.info("ℹ️ Lista archivos primero")
        else:
            files = st.session_state.drive_files
            stats = st.session_state.drive_connector.get_file_statistics(files)

            # Gráfico por directorio
            dir_data = pd.DataFrame([
                {'Directorio': d if d else '/', 'Cantidad': c}
                for d, c in stats['by_directory'].items()
            ]).sort_values('Cantidad', ascending=False)

            fig1 = px.bar(
                dir_data, x='Cantidad', y='Directorio', orientation='h',
                title='Archivos por Directorio')
            st.plotly_chart(fig1, width='stretch')

            # Gráficos por extensión
            col1, col2 = st.columns(2)

            with col1:
                ext_data = pd.DataFrame([
                    {'Extensión': e, 'Cantidad': c}
                    for e, c in stats['by_extension'].items()
                ]).sort_values('Cantidad', ascending=False)

                fig2 = px.pie(
                    ext_data, values='Cantidad', names='Extensión',
                    title='Distribución por Extensión')
                st.plotly_chart(fig2, width='stretch')

            with col2:
                top_10 = ext_data.head(10)
                fig3 = px.bar(
                    top_10, x='Cantidad', y='Extensión',
                    title='Top 10 Extensiones', orientation='h')
                st.plotly_chart(fig3, width='stretch')

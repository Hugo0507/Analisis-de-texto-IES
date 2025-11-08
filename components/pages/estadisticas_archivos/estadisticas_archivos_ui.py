"""
Módulo de UI - Estadísticas de Archivos
Componentes visuales con Streamlit
"""

import streamlit as st
import plotly.express as px
from components.ui.helpers import show_section_header
from src.drive_connector import format_size
from . import estadisticas_archivos as logic


# Constante
DEFAULT_DRIVE_FOLDER_URL = "https://drive.google.com/drive/u/2/folders/1tDUZ4PnQen_lSr6z4ZALji2zdtrJf-sS"


def render_configuration_tab():
    """Renderiza tab de configuración"""
    st.subheader("Configuración")

    folder_url = st.text_input(
        "URL o ID de Google Drive",
        value=DEFAULT_DRIVE_FOLDER_URL,
        help="Pega la URL completa o el ID de la carpeta"
    )

    col1, col2 = st.columns([1, 3])
    with col1:
        if st.button("Listar Archivos", type="primary", use_container_width=True):
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


def render_summary_tab():
    """Renderiza tab de resumen general"""
    if len(st.session_state.drive_files) == 0:
        st.info("ℹ️ Lista archivos primero en la pestaña 'Configuración'")
        return

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

    # Filtros
    col1, col2, col3 = st.columns(3)
    with col1:
        filter_ext = st.multiselect("Filtrar por extensión", df_files['Extensión'].unique())
    with col2:
        filter_dir = st.multiselect("Filtrar por directorio", df_files['Directorio'].unique())
    with col3:
        search = st.text_input("Buscar por nombre")

    # Aplicar filtros usando lógica
    df_filtered = logic.filter_files_dataframe(df_files, filter_ext, filter_dir, search)

    st.caption(f"Mostrando {len(df_filtered)} de {len(df_files)} archivos")
    st.dataframe(df_filtered, width='stretch', height=400)


def render_distribution_tab():
    """Renderiza tab de distribución por carpeta"""
    if len(st.session_state.drive_files) == 0:
        st.info("ℹ️ Lista archivos primero")
        return

    files = st.session_state.drive_files
    stats = st.session_state.drive_connector.get_file_statistics(files)

    # Gráfico por directorio usando lógica
    dir_data = logic.prepare_directory_data(stats)

    fig1 = px.bar(
        dir_data, x='Cantidad', y='Directorio', orientation='h',
        title='Archivos por Directorio')
    st.plotly_chart(fig1, use_container_width=True)

    # Gráficos por extensión
    col1, col2 = st.columns(2)

    with col1:
        ext_data = logic.prepare_extension_data(stats)

        fig2 = px.pie(
            ext_data, values='Cantidad', names='Extensión',
            title='Distribución por Extensión')
        st.plotly_chart(fig2, use_container_width=True)

    with col2:
        top_10 = logic.get_top_n_extensions(ext_data, n=10)
        fig3 = px.bar(
            top_10, x='Cantidad', y='Extensión',
            title='Top 10 Extensiones', orientation='h')
        st.plotly_chart(fig3, use_container_width=True)


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
        render_configuration_tab()

    with tab2:
        render_summary_tab()

    with tab3:
        render_distribution_tab()

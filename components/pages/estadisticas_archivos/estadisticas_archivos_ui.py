"""
Módulo de UI - Estadísticas de Archivos
Componentes visuales con Streamlit
"""

import streamlit as st
import plotly.express as px
from components.ui.helpers import show_section_header, show_chart_interpretation, show_return_to_dashboard_button
from src.drive_connector import format_size
from src import file_statistics as logic


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
        if st.button("📋 Listar Archivos", type="primary", use_container_width=True):
            folder_id = st.session_state.drive_connector.get_folder_id_from_url(folder_url)
            st.session_state.source_folder_id = folder_id

            with st.spinner("Listando archivos..."):
                files = st.session_state.drive_connector.list_files_in_folder(folder_id, recursive=True)
                st.session_state.drive_files = files

            if files:
                st.success(f"✓ {len(files)} archivos encontrados")

                # === AUTO-LANZAR PIPELINE ===
                # Inicializar parent_folder_id si no existe
                if 'parent_folder_id' not in st.session_state or not st.session_state.parent_folder_id:
                    # Crear carpeta de proyecto en Drive
                    from datetime import datetime
                    project_name = f"Analisis_TD_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                    parent_id = st.session_state.drive_connector.get_or_create_folder(
                        folder_id,
                        project_name
                    )
                    st.session_state.parent_folder_id = parent_id
                    st.session_state.project_folder_id = parent_id

                # Marcar que el pipeline debe iniciarse
                st.session_state.pipeline_should_start = True
                st.session_state.pipeline_trigger = 'file_listing_complete'

                st.info("🚀 Iniciando análisis automático en el Dashboard Principal...")
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

    show_chart_interpretation(
        chart_type="Gráfico de Barras Horizontales",
        title="Archivos por Directorio",
        interpretation=(
            "Esta gráfica muestra la **distribución de archivos** a través de las diferentes carpetas "
            "en tu repositorio de Google Drive. Cada barra representa un directorio diferente, y su longitud "
            "indica la cantidad de archivos que contiene. Esto te ayuda a identificar dónde se concentra "
            "la mayor cantidad de documentos en tu corpus de análisis."
        ),
        how_to_read=(
            "- El **eje Y** (vertical) lista los nombres de los directorios\n"
            "- El **eje X** (horizontal) muestra la cantidad de archivos\n"
            "- Las **barras más largas** indican directorios con más archivos\n"
            "- Los directorios se ordenan de mayor a menor cantidad"
        ),
        what_to_look_for=[
            "**Directorios dominantes**: ¿Qué carpeta tiene la mayor concentración de archivos?",
            "**Distribución equilibrada vs concentrada**: ¿Los archivos están distribuidos uniformemente o concentrados en pocas carpetas?",
            "**Implicaciones para el análisis**: Directorios con más archivos tendrán mayor peso en el análisis global"
        ]
    )

    # Gráficos por extensión
    col1, col2 = st.columns(2)

    with col1:
        ext_data = logic.prepare_extension_data(stats)

        fig2 = px.pie(
            ext_data, values='Cantidad', names='Extensión',
            title='Distribución por Extensión')
        st.plotly_chart(fig2, use_container_width=True)

        show_chart_interpretation(
            chart_type="Gráfico Circular (Pie Chart)",
            title="Distribución por Extensión",
            interpretation=(
                "Este gráfico circular muestra la **composición porcentual** de los archivos según "
                "su tipo (extensión). Cada 'rebanada' representa un tipo de archivo diferente (PDF, DOCX, TXT, etc.), "
                "y su tamaño es proporcional a la cantidad de archivos de ese tipo en tu corpus. "
                "Esto te permite entender rápidamente qué formatos predominan en tu colección de documentos."
            ),
            how_to_read=(
                "- Cada **segmento de color** representa un tipo de archivo diferente\n"
                "- El **tamaño del segmento** es proporcional a la cantidad de archivos\n"
                "- Los **porcentajes** muestran la proporción relativa de cada tipo\n"
                "- Al pasar el cursor, verás el conteo exacto de archivos"
            ),
            what_to_look_for=[
                "**Formato dominante**: ¿Qué extensión tiene la mayor porción del total?",
                "**Homogeneidad del corpus**: ¿Predomina un solo formato o hay diversidad?",
                "**Compatibilidad de procesamiento**: Algunos formatos (PDF) requieren conversión previa al análisis de texto"
            ]
        )

    with col2:
        top_10 = logic.get_top_n_extensions(ext_data, n=10)
        fig3 = px.bar(
            top_10, x='Cantidad', y='Extensión',
            title='Top 10 Extensiones', orientation='h')
        st.plotly_chart(fig3, use_container_width=True)

        show_chart_interpretation(
            chart_type="Gráfico de Barras Horizontales (Top 10)",
            title="Top 10 Extensiones más Comunes",
            interpretation=(
                "Esta gráfica muestra las **10 extensiones de archivo más frecuentes** en tu corpus, "
                "ordenadas de mayor a menor cantidad. A diferencia del gráfico circular, este formato "
                "permite comparar fácilmente las cantidades exactas entre diferentes tipos de archivo "
                "y ver claramente el ranking de formatos más utilizados."
            ),
            how_to_read=(
                "- El **eje Y** (vertical) lista las extensiones de archivo\n"
                "- El **eje X** (horizontal) muestra la cantidad exacta de archivos\n"
                "- Las extensiones están **ordenadas de mayor a menor** frecuencia\n"
                "- Solo se muestran las 10 extensiones más comunes"
            ),
            what_to_look_for=[
                "**Extensiones dominantes**: ¿Los primeros 3-5 tipos concentran la mayoría de archivos?",
                "**Diferencias de magnitud**: ¿Hay grandes gaps entre las extensiones o están más equilibradas?",
                "**Formatos procesables**: ¿La mayoría son formatos que se pueden procesar para análisis de texto?"
            ]
        )


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

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

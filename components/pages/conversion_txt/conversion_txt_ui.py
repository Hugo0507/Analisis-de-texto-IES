"""
Módulo de UI - Conversión a TXT - Dashboard de Solo Lectura
Muestra resultados procesados automáticamente por el pipeline
"""

import streamlit as st
import plotly.express as px
import pandas as pd
from components.ui.helpers import show_section_header, show_return_to_dashboard_button


def render():
    """Renderiza el dashboard de conversión a TXT (solo lectura)"""

    show_section_header(
        "Conversión a TXT",
        "Resultados de la conversión automática de PDF a TXT"
    )

    # Verificar si existe pipeline_manager con resultados
    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal** para iniciar el análisis automático.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    # Verificar si hay resultados de conversión
    if not hasattr(pipeline_manager, 'results') or 'txt_files' not in pipeline_manager.results:
        st.warning("⚠️ La conversión a TXT aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    # Obtener resultados
    txt_files = pipeline_manager.results.get('txt_files', [])
    conversion_stats = pipeline_manager.results.get('conversion_stats', {})

    if not txt_files:
        st.warning("⚠️ No hay archivos TXT disponibles.")
        return

    # ========== MÉTRICAS GENERALES ==========
    st.markdown("### 📊 Resumen de Conversión")

    total = conversion_stats.get('total', len(txt_files))
    successful = conversion_stats.get('successful', len(txt_files))
    failed = conversion_stats.get('failed', 0)
    success_rate = (successful / total * 100) if total > 0 else 0

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Archivos", total)
    col2.metric("Convertidos", successful)
    col3.metric("Fallidos", failed)
    col4.metric("Tasa de Éxito", f"{success_rate:.1f}%")

    st.markdown("---")

    # ========== GRÁFICOS ==========
    st.markdown("### 📊 Distribución de Conversión")

    col1, col2 = st.columns(2)

    with col1:
        # Gráfico de pastel
        conversion_df = pd.DataFrame({
            'Estado': ['Exitosos', 'Fallidos'],
            'Cantidad': [successful, failed]
        })

        fig1 = px.pie(
            conversion_df,
            values='Cantidad',
            names='Estado',
            title='Distribución de Conversión',
            color='Estado',
            color_discrete_map={'Exitosos': '#28a745', 'Fallidos': '#dc3545'}
        )
        st.plotly_chart(fig1, use_container_width=True)

    with col2:
        # Estadísticas de longitud de texto
        if txt_files:
            lengths = [f.get('text_length', 0) for f in txt_files if f.get('text_length', 0) > 0]

            if lengths:
                stats_data = {
                    'Métrica': ['Promedio', 'Mínimo', 'Máximo', 'Total'],
                    'Caracteres': [
                        f"{sum(lengths) / len(lengths):,.0f}",
                        f"{min(lengths):,}",
                        f"{max(lengths):,}",
                        f"{sum(lengths):,}"
                    ]
                }
                stats_df = pd.DataFrame(stats_data)
                st.markdown("**Estadísticas de Texto Extraído**")
                st.dataframe(stats_df, use_container_width=True, hide_index=True)

    st.markdown("---")

    # ========== TABLA DETALLADA ==========
    st.markdown("### 📋 Archivos Convertidos")

    # Preparar DataFrame
    detail_data = []
    for f in txt_files:
        detail_data.append({
            'Archivo': f.get('name', f.get('file', 'Desconocido')),
            'Longitud': f.get('text_length', 0),
            'Estado': '✅ Exitoso' if f.get('success', True) else '❌ Fallido'
        })

    detail_df = pd.DataFrame(detail_data)

    # Filtro de búsqueda
    buscar = st.text_input("🔍 Buscar archivo", "")

    if buscar:
        df_filtered = detail_df[
            detail_df['Archivo'].str.contains(buscar, case=False, na=False)
        ]
    else:
        df_filtered = detail_df

    # Formatear columna de longitud
    if 'Longitud' in df_filtered.columns:
        df_display = df_filtered.copy()
        df_display['Longitud'] = df_display['Longitud'].apply(lambda x: f"{x:,}")
        st.dataframe(df_display, use_container_width=True, height=400)
    else:
        st.dataframe(df_filtered, use_container_width=True, height=400)

    st.caption(f"Mostrando {len(df_filtered)} de {len(detail_df)} archivos")

    # ========== ARCHIVOS FALLIDOS ==========
    if failed > 0:
        failed_files = [f for f in txt_files if not f.get('success', True)]

        if failed_files:
            with st.expander(f"⚠️ Ver {len(failed_files)} archivos con error en conversión"):
                failed_data = []
                for f in failed_files:
                    failed_data.append({
                        'Archivo': f.get('name', f.get('file', 'Desconocido')),
                        'Error': f.get('error', 'Error desconocido')
                    })

                failed_df = pd.DataFrame(failed_data)
                st.dataframe(failed_df, use_container_width=True)
                st.info(
                    "💡 Estos archivos no pudieron ser convertidos. "
                    "Pueden ser PDFs corruptos, protegidos, sin texto extraíble o con formato no compatible."
                )

    # ========== INFORMACIÓN ADICIONAL ==========
    st.markdown("---")
    st.markdown("### 💾 Persistencia")

    st.info(f"""
    **Carpeta en Google Drive:**
    - Nombre: `03_TXT_Converted`
    - Archivos: {successful} archivos TXT
    - Procesamiento: Automático por el pipeline

    Los archivos de texto convertidos están almacenados en Google Drive y listos para el preprocesamiento.
    """)

    st.success("✅ **Conversión completada** - Los archivos están listos para el preprocesamiento")

    # Botón de retorno al Dashboard Principal
    show_return_to_dashboard_button()

"""
Página de Detección de Idiomas - Dashboard de Solo Lectura
Muestra resultados procesados automáticamente por el pipeline
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from components.ui.helpers import show_section_header, show_chart_interpretation


def render():
    """Renderiza el dashboard de detección de idiomas (solo lectura)"""

    show_section_header(
        "Detección de Idiomas",
        "Resultados de la detección automática de idiomas en el corpus"
    )

    # Verificar si existe pipeline_manager con resultados
    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado. Ve al **Dashboard Principal** para iniciar el análisis automático.")
        st.markdown("👈 Selecciona **📊 Dashboard Principal** en el menú lateral")
        return

    pipeline_manager = st.session_state.pipeline_manager

    # Verificar si hay resultados de detección de idiomas
    if not hasattr(pipeline_manager, 'results') or 'language_detection_results' not in pipeline_manager.results:
        st.warning("⚠️ La detección de idiomas aún no se ha completado. Verifica el **Dashboard Principal**.")
        return

    # Obtener resultados
    lang_results = pipeline_manager.results.get('language_detection_results', [])

    if not lang_results:
        st.warning("⚠️ No hay resultados de detección de idiomas disponibles.")
        return

    # ========== MÉTRICAS GENERALES ==========
    st.markdown("### 📊 Resumen de Detección")

    total_files = len(lang_results)
    detected = len([r for r in lang_results if r.get('language_code') != 'error'])
    failed = len([r for r in lang_results if r.get('language_code') == 'error'])

    # Contar idiomas
    lang_counts = {}
    for r in lang_results:
        lang_code = r.get('language_code')
        if lang_code and lang_code != 'error':
            lang_counts[lang_code] = lang_counts.get(lang_code, 0) + 1

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total PDFs", total_files)
    col2.metric("Detectados", detected)
    col3.metric("Fallidos", failed)
    col4.metric("Idiomas Únicos", len(lang_counts))

    st.markdown("---")

    # Mapeo de códigos de idioma a nombres completos (global para toda la página)
    language_names = {
        'en': 'Inglés', 'es': 'Español', 'fr': 'Francés', 'de': 'Alemán',
        'it': 'Italiano', 'pt': 'Portugués', 'ru': 'Ruso', 'zh': 'Chino',
        'ja': 'Japonés', 'ko': 'Coreano', 'ar': 'Árabe', 'hi': 'Hindi',
        'nl': 'Holandés', 'pl': 'Polaco', 'tr': 'Turco', 'sv': 'Sueco',
        'da': 'Danés', 'no': 'Noruego', 'fi': 'Finlandés', 'cs': 'Checo',
        'hu': 'Húngaro', 'ro': 'Rumano', 'hr': 'Croata', 'sk': 'Eslovaco',
        'bg': 'Búlgaro', 'el': 'Griego', 'he': 'Hebreo', 'th': 'Tailandés',
        'vi': 'Vietnamita', 'id': 'Indonesio', 'ms': 'Malayo', 'uk': 'Ucraniano',
        'ca': 'Catalán', 'et': 'Estonio', 'lt': 'Lituano', 'lv': 'Letón',
        'sl': 'Esloveno',
    }

    # ========== DISTRIBUCIÓN DE IDIOMAS ==========
    st.markdown("### 📊 Distribución por Idioma")

    if lang_counts:
        col1, col2 = st.columns([1, 1])

        with col1:

            # Crear DataFrame
            lang_data = [
                {'Idioma': f"{language_names.get(k, k.upper())} ({k})", 'Cantidad': v}
                for k, v in lang_counts.items()
            ]
            lang_df = pd.DataFrame(lang_data).sort_values('Cantidad', ascending=False)

            st.dataframe(lang_df, use_container_width=True, height=300)

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
                chart_type="Gráfico Circular (Donut Chart)",
                title="Distribución de Idiomas Detectados",
                interpretation=(
                    "Este gráfico muestra la **distribución porcentual de idiomas** detectados automáticamente "
                    "en el corpus. Cada segmento representa un idioma, y su tamaño es proporcional a la cantidad "
                    "de documentos en ese idioma."
                ),
                how_to_read=(
                    "- Cada **segmento** representa un idioma detectado\n"
                    "- El **tamaño** es proporcional al número de documentos\n"
                    "- Los **porcentajes** muestran la proporción de cada idioma"
                ),
                what_to_look_for=[
                    "**Idioma dominante**: Si un idioma representa >80%, es un corpus monolingüe",
                    "**Multilingüismo**: Múltiples idiomas requieren procesamiento específico por idioma",
                    "**Idiomas inesperados**: Pueden indicar errores de detección o contenido mixto",
                    "**Idioma seleccionado**: El pipeline procesa automáticamente el idioma mayoritario"
                ]
            )
    else:
        st.warning("⚠️ No se detectaron idiomas exitosamente.")

    st.markdown("---")

    # ========== TABLA DETALLADA ==========
    st.markdown("### 📋 Detalle de Archivos")

    files_df = pd.DataFrame(lang_results)

    # Verificar qué columnas están disponibles y adaptarse
    available_cols = files_df.columns.tolist()

    # Intentar usar las columnas esperadas o buscar alternativas
    col_mapping = {}
    if 'file_name' in available_cols:
        col_mapping['file_name'] = 'Archivo'
    elif 'name' in available_cols:
        col_mapping['name'] = 'Archivo'

    if 'language_name' in available_cols:
        col_mapping['language_name'] = 'Idioma'
    elif 'detected_language' in available_cols:
        col_mapping['detected_language'] = 'Idioma'

    if 'language_code' in available_cols:
        col_mapping['language_code'] = 'Código'
    elif 'language' in available_cols:
        col_mapping['language'] = 'Código'

    if 'confidence' in available_cols:
        col_mapping['confidence'] = 'Confianza'

    # Seleccionar solo las columnas que existen
    if col_mapping:
        files_df = files_df[list(col_mapping.keys())]
        files_df.columns = list(col_mapping.values())

        if 'Confianza' in files_df.columns:
            files_df['Confianza'] = files_df['Confianza'].apply(
                lambda x: f"{x:.2%}" if x > 0 else "Error"
            )
    else:
        st.error("❌ Estructura de datos no reconocida. Columnas disponibles: " + ", ".join(available_cols))

    # Filtros (solo si tenemos datos válidos)
    if col_mapping:
        col1, col2 = st.columns(2)
        with col1:
            idioma_options = ["Todos"]
            if lang_counts and 'lang_df' in locals():
                idioma_options += list(lang_df['Idioma'])
            idioma_filter = st.selectbox("Filtrar por idioma", idioma_options)
        with col2:
            buscar = st.text_input("Buscar archivo", "")

        # Aplicar filtros
        df_filtered = files_df.copy()
        if idioma_filter != "Todos" and 'Código' in df_filtered.columns:
            # Extraer código entre paréntesis
            codigo = idioma_filter.split('(')[-1].rstrip(')')
            df_filtered = df_filtered[df_filtered['Código'] == codigo]
        if buscar and 'Archivo' in df_filtered.columns:
            df_filtered = df_filtered[
                df_filtered['Archivo'].str.contains(buscar, case=False, na=False)
            ]

        st.dataframe(df_filtered, use_container_width=True, height=400)
        st.caption(f"Mostrando {len(df_filtered)} de {len(files_df)} archivos")

    # ========== ARCHIVOS CON ERROR ==========
    error_files = [f for f in lang_results if f.get('language_code') == 'error']
    if error_files:
        with st.expander(f"⚠️ Ver {len(error_files)} archivos con error en detección"):
            error_df = pd.DataFrame(error_files)
            error_df = error_df[['file_name']]
            error_df.columns = ['Archivo con Error']
            st.dataframe(error_df, use_container_width=True)
            st.info(
                "💡 Estos archivos no pudieron ser procesados. "
                "Pueden ser PDFs corruptos, protegidos o sin texto extraíble."
            )

    # ========== IDIOMA SELECCIONADO PARA ANÁLISIS ==========
    if 'selected_language' in pipeline_manager.results:
        st.markdown("---")
        st.markdown("### 🎯 Idioma Seleccionado para Análisis")

        selected_lang = pipeline_manager.results['selected_language']
        selected_count = pipeline_manager.results.get('selected_language_count', 0)

        st.success(
            f"✓ El pipeline seleccionó automáticamente **{language_names.get(selected_lang, selected_lang.upper())}** "
            f"como idioma mayoritario ({selected_count} documentos)"
        )
        st.info("📌 Solo los documentos en este idioma continúan a las siguientes etapas del análisis.")

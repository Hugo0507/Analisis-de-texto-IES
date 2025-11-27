"""
Dashboard Principal - Vista de Progreso del Pipeline en Tiempo Real
Muestra el estado de todas las etapas del análisis automático
"""

import streamlit as st
import time
from datetime import datetime
import json
from typing import Dict, Any

from components.ui.helpers import show_section_header


def render():
    """Renderiza el dashboard principal con progreso del pipeline"""

    show_section_header(
        "Dashboard Principal",
        "Monitor del análisis automático en tiempo real"
    )

    # Verificar si debe iniciarse el pipeline
    if st.session_state.get('pipeline_should_start', False):
        _initialize_and_start_pipeline()

    # Mostrar estado del pipeline
    if 'pipeline_manager' in st.session_state:
        _render_pipeline_status()
    else:
        _render_waiting_state()


def _sync_results_to_session_state(results: dict):
    """
    Sincroniza los resultados del pipeline con session_state
    para que las páginas individuales puedan acceder a ellos
    """
    from src.utils.logger import get_logger
    logger = get_logger(__name__)

    logger.info("=" * 60)
    logger.info("SINCRONIZANDO RESULTADOS DEL PIPELINE CON SESSION_STATE")
    logger.info("=" * 60)
    logger.info(f"Total de claves en results: {len(results)}")
    logger.info(f"Claves disponibles: {list(results.keys())}")

    try:
        # Detección de idiomas
        if 'language_detection_results' in results:
            st.session_state.language_detection_results = results['language_detection_results']
            logger.info(f"  ✓ Sincronizado language_detection_results: {len(results['language_detection_results'])} archivos")

        if 'english_pdf_files' in results:
            st.session_state.english_pdf_files = results['english_pdf_files']
            logger.info(f"  ✓ Sincronizado english_pdf_files: {len(results['english_pdf_files'])} archivos")

        # Conversión TXT
        if 'txt_files' in results:
            st.session_state.txt_files = results['txt_files']
            logger.info(f"  ✓ Sincronizado txt_files: {len(results['txt_files'])} archivos")

        if 'conversion_stats' in results:
            st.session_state.conversion_stats = results['conversion_stats']
            logger.info(f"  ✓ Sincronizado conversion_stats")

        # Preprocesamiento
        if 'preprocessed_texts' in results:
            st.session_state.preprocessed_texts = results['preprocessed_texts']
            logger.info(f"  ✓ Sincronizado preprocessed_texts: {len(results['preprocessed_texts'])} documentos")

        if 'preprocessing_stats' in results:
            st.session_state.preprocessing_stats = results['preprocessing_stats']
            logger.info(f"  ✓ Sincronizado preprocessing_stats")

        # BoW
        if 'bow_matrix' in results:
            st.session_state.bow_matrix = results['bow_matrix']
            st.session_state.bow_feature_names = results.get('bow_feature_names', [])
            st.session_state.bow_vectorizer = results.get('bow_vectorizer')
            logger.info(f"  ✓ Sincronizado BoW matrix")

        if 'bow_stats' in results:
            st.session_state.bow_stats = results['bow_stats']
            logger.info(f"  ✓ Sincronizado bow_stats")

        # TF-IDF
        if 'tfidf_matrix' in results:
            st.session_state.tfidf_matrix = results['tfidf_matrix']
            st.session_state.tfidf_feature_names = results.get('tfidf_feature_names', [])
            st.session_state.tfidf_vectorizer = results.get('tfidf_vectorizer')
            logger.info(f"  ✓ Sincronizado TF-IDF matrix")

        if 'tfidf_stats' in results:
            st.session_state.tfidf_stats = results['tfidf_stats']
            logger.info(f"  ✓ Sincronizado tfidf_stats")

        # N-gramas
        if 'ngram_analysis' in results:
            st.session_state.ngram_analysis = results['ngram_analysis']
            logger.info(f"  ✓ Sincronizado ngram_analysis")

        # NER
        if 'ner_corpus_analysis' in results:
            st.session_state.ner_corpus_analysis = results['ner_corpus_analysis']
            logger.info(f"  ✓ Sincronizado ner_corpus_analysis")

        # Topic Modeling
        if 'topic_modeling' in results:
            st.session_state.topic_modeling = results['topic_modeling']
            logger.info(f"  ✓ Sincronizado topic_modeling")

        # BERTopic
        if 'bertopic' in results:
            st.session_state.bertopic = results['bertopic']
            logger.info(f"  ✓ Sincronizado bertopic")

        # Dimensionality Reduction
        if 'dimensionality_reduction' in results:
            st.session_state.dimensionality_reduction = results['dimensionality_reduction']
            logger.info(f"  ✓ Sincronizado dimensionality_reduction")

        # Factor Analysis
        if 'factor_analysis' in results:
            st.session_state.factor_analysis = results['factor_analysis']
            logger.info(f"  ✓ Sincronizado factor_analysis")

        logger.info("✓ Sincronización completada exitosamente")

    except Exception as e:
        logger.error(f"Error sincronizando resultados: {e}", exc_info=True)


def _initialize_and_start_pipeline():
    """Inicializa y arranca el pipeline automático EN UN THREAD SEPARADO"""
    import threading
    from src.pipeline_manager import PipelineManager
    from src.pipeline_config import PipelineConfig
    from src.utils.logger import get_logger

    logger = get_logger(__name__)
    logger.info("=== INICIALIZANDO PIPELINE DESDE DASHBOARD ===")

    # Verificar prerequisites
    if not st.session_state.get('drive_files'):
        logger.error("No hay archivos listados en session_state")
        st.error("❌ No hay archivos listados. Ve a 'Estadísticas de Archivos' primero.")
        st.session_state.pipeline_should_start = False
        return

    if not st.session_state.get('parent_folder_id'):
        logger.error("No hay parent_folder_id en session_state")
        st.error("❌ No se pudo crear carpeta de proyecto.")
        st.session_state.pipeline_should_start = False
        return

    logger.info(f"Archivos a procesar: {len(st.session_state.drive_files)}")
    logger.info(f"Parent folder ID: {st.session_state.parent_folder_id}")

    # Crear PipelineManager
    if 'pipeline_manager' not in st.session_state:
        logger.info("Creando PipelineManager...")
        st.session_state.pipeline_manager = PipelineManager(
            drive_connector=st.session_state.drive_connector,
            config=PipelineConfig()
        )
        logger.info("PipelineManager creado exitosamente")

    # Marcar que ya no debe iniciarse (evitar re-ejecuciones)
    st.session_state.pipeline_should_start = False

    # Verificar si ya hay un thread corriendo
    if st.session_state.get('pipeline_thread') and st.session_state.pipeline_thread.is_alive():
        logger.info("Pipeline ya está corriendo en otro thread")
        return

    # COPIAR referencias ANTES de crear el thread (session_state no está disponible en threads)
    manager = st.session_state.pipeline_manager
    files = st.session_state.drive_files
    folder_id = st.session_state.parent_folder_id

    # Función que ejecutará el pipeline en un thread separado
    def run_pipeline(manager, files, folder_id):
        logger.info("Thread de pipeline iniciado")

        try:
            # Ejecutar pipeline (con variables locales, NO session_state)
            results = manager.execute_pipeline(
                files=files,
                parent_folder_id=folder_id,
                progress_callback=None
            )

            logger.info("Pipeline ejecutado exitosamente")
            logger.info(f"Resultados: {len(results)} keys")

            # Marcar como completado
            # NOTA: NO podemos escribir a session_state desde un thread
            # Los resultados se quedarán en el manager.results
            # y se sincronizarán cuando el usuario haga click en "Actualizar Progreso"

            if results.get('pipeline_error'):
                logger.error(f"Pipeline completado con error: {results.get('pipeline_error')}")
            else:
                logger.info("Pipeline completado exitosamente")

        except Exception as e:
            logger.error(f"Error ejecutando pipeline: {e}", exc_info=True)

        logger.info("Thread de pipeline finalizado")

    # Iniciar thread (pasando variables como argumentos)
    logger.info("Iniciando pipeline en thread separado...")
    pipeline_thread = threading.Thread(
        target=run_pipeline,
        args=(manager, files, folder_id),
        daemon=True
    )
    pipeline_thread.start()
    st.session_state.pipeline_thread = pipeline_thread
    st.session_state.pipeline_status = 'running'

    st.success("✅ Pipeline iniciado en segundo plano. Haz click en 'Actualizar Progreso' para ver el avance.")
    logger.info("Thread iniciado exitosamente")


def _render_waiting_state():
    """Muestra estado de espera cuando no hay pipeline activo"""
    st.info("""
    ### 👋 Bienvenido al Dashboard Principal

    **Para iniciar el análisis automático:**
    1. Ve a **"Estadísticas de Archivos"**
    2. Haz click en **"📋 Listar Archivos"**
    3. El pipeline se iniciará automáticamente

    **¿Qué hace el pipeline automático?**
    - Detecta idiomas y selecciona el corpus principal
    - Convierte PDFs a texto
    - Preprocesa los textos
    - Ejecuta análisis de BoW, TF-IDF, N-gramas
    - Identifica entidades con NER
    - Aplica Topic Modeling (LDA, NMF, LSA)
    - Ejecuta BERTopic
    - Reduce dimensionalidad (PCA, t-SNE, UMAP)
    - Analiza factores clave
    - Consolida todos los resultados

    **Todo sin intervención manual!** 🎉
    """)


def _render_pipeline_status():
    """Muestra el estado actual del pipeline"""
    pipeline_manager = st.session_state.pipeline_manager
    progress_dict = pipeline_manager.get_progress_dict()

    from src.utils.logger import get_logger
    logger = get_logger(__name__)

    # SIEMPRE sincronizar si hay resultados disponibles en el pipeline_manager
    if hasattr(pipeline_manager, 'results') and len(pipeline_manager.results) > 0:
        if not st.session_state.get('_results_synced', False):
            logger.info("Detectados resultados en pipeline_manager, sincronizando...")
            _sync_results_to_session_state(pipeline_manager.results)
            st.session_state._results_synced = True

    # Verificar si el thread terminó y sincronizar resultados
    if st.session_state.get('pipeline_thread'):
        thread = st.session_state.pipeline_thread
        current_status = st.session_state.get('pipeline_status', 'unknown')
        thread_alive = thread.is_alive()

        logger.info(f"Verificando thread: alive={thread_alive}, status={current_status}")

        if not thread_alive and current_status == 'running':
            logger.info("Thread terminó, sincronizando resultados...")
            # El thread terminó, sincronizar resultados
            st.session_state.pipeline_status = 'completed' if pipeline_manager.is_complete else 'failed'
            st.session_state.pipeline_results = pipeline_manager.results

            # Sincronizar con session_state
            _sync_results_to_session_state(pipeline_manager.results)
            logger.info("✅ Sincronización completada")
        elif not thread_alive:
            logger.info(f"Thread terminó pero status no es 'running' (es '{current_status}')")

    # BARRA DE PROGRESO GRANDE Y VISIBLE
    overall_progress = progress_dict.get('overall_progress', 0.0)
    is_complete = progress_dict.get('is_complete', False)
    is_running = st.session_state.get('pipeline_status') == 'running'

    # Título con estado
    if is_complete:
        st.success("✅ Pipeline Completado")
    elif is_running:
        st.info(f"⏳ Pipeline en Ejecución - {overall_progress:.0%} completado")
    else:
        st.warning("⏸️ Pipeline Detenido")

    # BARRA DE PROGRESO PROMINENTE
    st.progress(overall_progress)

    # Mensaje de progreso detallado
    stages = progress_dict.get('stages', [])
    current_stage = None
    for stage in stages:
        if stage.get('status') == 'running':
            current_stage = stage
            break

    if current_stage:
        st.markdown(f"**Etapa actual:** {current_stage.get('name', 'Procesando...')}")
        stage_progress = current_stage.get('progress', 0.0)
        st.progress(stage_progress, text=f"{stage_progress:.0%}")

    st.markdown("---")

    # Header con métricas
    col1, col2, col3, col4 = st.columns(4)

    status_summary = progress_dict.get('status_summary', {})
    total_duration = progress_dict.get('total_duration', 0)

    with col1:
        st.metric(
            "Progreso Global",
            f"{overall_progress:.0%}",
            delta=None if is_complete else "En progreso..."
        )

    with col2:
        st.metric(
            "Etapas Completadas",
            status_summary.get('completed', 0),
            delta=f"de {len(stages)}"
        )

    with col3:
        st.metric(
            "Fallidas",
            status_summary.get('failed', 0),
            delta="Con errores" if status_summary.get('failed', 0) > 0 else "Todo OK"
        )

    with col4:
        minutes = int(total_duration / 60)
        seconds = int(total_duration % 60)
        st.metric(
            "Duración",
            f"{minutes}m {seconds}s"
        )

    # Separador
    st.markdown("---")

    # Detalle de etapas
    st.markdown("### 📋 Estado de Etapas")

    stages = progress_dict.get('stages', [])

    for i, stage in enumerate(stages):
        _render_stage_card(i + 1, stage)

    # Botones de control
    st.markdown("---")
    _render_control_buttons(progress_dict)

    # Auto-actualización cada 1.5 segundos si el pipeline está corriendo
    if not progress_dict.get('is_complete', False) and st.session_state.get('pipeline_status') == 'running':
        st.info("⏳ El pipeline está ejecutándose en segundo plano... (actualizándose automáticamente)")

        # Auto-refresh cada 1.5 segundos
        import time
        time.sleep(1.5)
        st.rerun()
    elif progress_dict.get('is_complete', False):
        st.success("✅ Pipeline completado. Navega a las páginas individuales en el menú lateral para ver los resultados")


def _render_stage_card(number: int, stage: Dict[str, Any]):
    """Renderiza una tarjeta de etapa"""
    status = stage.get('status', 'pending')
    name = stage.get('name', 'Sin nombre')
    description = stage.get('description', '')
    progress = stage.get('progress', 0.0)
    duration = stage.get('duration', 0)
    error = stage.get('error')

    # Icono según estado
    status_icons = {
        'pending': '⏸',
        'running': '⏳',
        'completed': '✅',
        'failed': '❌',
        'skipped': '⏭'
    }

    icon = status_icons.get(status, '❓')

    # Colores
    status_colors = {
        'pending': '#888888',
        'running': '#3498db',
        'completed': '#27ae60',
        'failed': '#e74c3c',
        'skipped': '#95a5a6'
    }

    color = status_colors.get(status, '#888888')

    # Expandir solo si está en progreso o falló
    if status in ['running', 'failed']:
        with st.expander(f"{icon} **Etapa {number}: {name}**", expanded=True):
            st.caption(description)

            if status == 'running':
                st.progress(progress)
                st.caption(f"Progreso: {progress:.0%}")

            if error:
                st.error(f"**Error:** {error}")

            if duration > 0:
                st.caption(f"⏱ Duración: {duration:.1f}s")
    else:
        # Solo mostrar en línea
        col1, col2, col3 = st.columns([1, 4, 2])

        with col1:
            st.markdown(f"### {icon}")

        with col2:
            st.markdown(f"**Etapa {number}: {name}**")
            st.caption(description)

        with col3:
            if status == 'completed' and duration > 0:
                st.caption(f"⏱ {duration:.1f}s")
            elif status == 'failed':
                st.markdown(f"<span style='color: {color};'>**Error**</span>", unsafe_allow_html=True)
            elif status == 'skipped':
                st.caption("Omitida")


def _render_control_buttons(progress_dict: Dict[str, Any]):
    """Renderiza botones de control"""
    col1, col2, col3 = st.columns(3)

    with col1:
        if st.button("🔄 Actualizar Estado", use_container_width=True):
            st.rerun()

    with col2:
        if progress_dict.get('is_complete') and st.button("📊 Ver Dashboards", type="primary", use_container_width=True):
            st.info("Los dashboards están disponibles en el menú lateral")

    with col3:
        if st.button("⚙️ Re-procesar con Configuración", use_container_width=True):
            st.session_state.show_reprocess_modal = True
            st.rerun()

    # Modal de re-procesamiento
    if st.session_state.get('show_reprocess_modal', False):
        _render_reprocess_modal()


def _render_reprocess_modal():
    """Muestra modal para re-procesar con configuración personalizada"""
    st.markdown("---")
    st.markdown("## ⚙️ Re-procesar con Configuración Personalizada")

    st.warning("""
    **Nota:** Esta funcionalidad permite modificar parámetros avanzados del análisis.

    Para cambiar la configuración:
    1. Edita el archivo `src/pipeline_config.py`
    2. Modifica los parámetros que desees (están todos documentados)
    3. Guarda el archivo
    4. Haz click en "Re-ejecutar Pipeline" abajo
    """)

    with st.expander("📝 Ejemplo de Parámetros Configurables"):
        st.code("""
# En src/pipeline_config.py

# Cambiar número de topics para LDA
TOPIC_MODELING = {
    'lda': {
        'n_topics': 15,  # Cambiar de 10 a 15
        ...
    }
}

# Cambiar perplexity de t-SNE
DIMENSIONALITY_REDUCTION = {
    'tsne': {
        'perplexity': 40,  # Cambiar de 30 a 40
        ...
    }
}

# Cambiar n-gramas para BoW
BOW = {
    'ngram_range': (1, 3),  # Cambiar de (1,2) a (1,3) para incluir trigramas
    ...
}
        """, language='python')

    col1, col2 = st.columns(2)

    with col1:
        if st.button("🚀 Re-ejecutar Pipeline", type="primary", use_container_width=True):
            # Limpiar resultados anteriores
            if 'pipeline_manager' in st.session_state:
                del st.session_state.pipeline_manager
            if 'pipeline_results' in st.session_state:
                del st.session_state.pipeline_results

            # Marcar para reiniciar
            st.session_state.pipeline_should_start = True
            st.session_state.show_reprocess_modal = False

            st.success("✓ Pipeline reiniciado")
            st.rerun()

    with col2:
        if st.button("❌ Cancelar", use_container_width=True):
            st.session_state.show_reprocess_modal = False
            st.rerun()

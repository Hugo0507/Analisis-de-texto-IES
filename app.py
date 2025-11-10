import streamlit as st
import sys
import os
from typing import Optional

# Agregar directorio src al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Importar configuración y logging PRIMERO
import config  # noqa: E402
from src.utils.logger import LoggerManager, get_logger  # noqa: E402

# Inicializar sistema de logging
LoggerManager.initialize(log_dir=config.LOG_DIR, log_level=config.LOG_LEVEL)
logger = get_logger(__name__)

# Importar módulos de src (lógica de negocio)
from src.nlp_processor import ProcessadorTexto  # noqa: E402
from src.factor_analyzer import AnalizadorFactores  # noqa: E402
from src.drive_connector import GoogleDriveConnector  # noqa: E402
from src.language_detector import LanguageDetector  # noqa: E402
from src.document_converter import DocumentConverter  # noqa: E402
from src.text_preprocessor import TextPreprocessor  # noqa: E402

# Importar componentes UI
from components.ui.styles import apply_custom_styles  # noqa: E402
from components.ui.layout import render_sidebar  # noqa: E402

# Importar páginas
from components.pages import (  # noqa: E402
    inicio,
    conexion_drive,
    estadisticas_archivos,
    deteccion_idiomas,
    conversion_txt,
    preprocesamiento,
    bolsa_palabras,
    analisis_tfidf,
    analisis_factores,
    consolidacion_factores,
    visualizaciones,
    nube_palabras,
    evaluacion_desempeno
)

# Importar páginas de modelos avanzados
from components.pages.models import ner_analysis  # noqa: E402
from components.pages.models import topic_modeling as topic_modeling_page  # noqa: E402
from components.pages.models import ngram_analysis as ngram_analysis_page  # noqa: E402
from components.pages.models import bertopic as bertopic_page  # noqa: E402
from components.pages.models import classification as classification_page  # noqa: E402
from components.pages.models import dimensionality_reduction as dimensionality_reduction_page  # noqa: E402

# ==================== CONFIGURACIÓN ====================

st.set_page_config(
    page_title="Análisis Transformación Digital",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Constantes desde configuración
DEFAULT_FOLDER_ID: str = config.GOOGLE_DRIVE_FOLDER_ID

logger.info("=" * 60)
logger.info("INICIANDO APLICACIÓN - Análisis Transformación Digital")
logger.info(f"Entorno: {config.ENVIRONMENT}")
logger.info(f"Nivel de log: {config.LOG_LEVEL}")
logger.info("=" * 60)

# ==================== INICIALIZACIÓN SESSION STATE ====================


def init_session_state() -> None:
    """Inicializa el estado de sesión"""
    logger.debug("Inicializando session state de Streamlit")

    # Inicializar conectores
    if 'drive_connector' not in st.session_state:
        logger.info("Creando GoogleDriveConnector")
        st.session_state.drive_connector = GoogleDriveConnector(
            credentials_path=config.CREDENTIALS_PATH,
            token_path=config.TOKEN_PATH
        )
    if 'language_detector' not in st.session_state:
        logger.info("Creando LanguageDetector")
        st.session_state.language_detector = LanguageDetector()
    if 'document_converter' not in st.session_state:
        logger.info("Creando DocumentConverter")
        st.session_state.document_converter = DocumentConverter()
    if 'text_preprocessor' not in st.session_state:
        logger.info("Creando TextPreprocessor")
        st.session_state.text_preprocessor = TextPreprocessor(language=config.IDIOMA)
    if 'procesador' not in st.session_state:
        logger.info("Creando ProcessadorTexto")
        st.session_state.procesador = ProcessadorTexto(idioma=config.IDIOMA)
    if 'analizador' not in st.session_state:
        logger.info("Creando AnalizadorFactores")
        st.session_state.analizador = AnalizadorFactores()

    # Estados del workflow
    if 'authenticated' not in st.session_state:
        st.session_state.authenticated = False
    if 'drive_files' not in st.session_state:
        st.session_state.drive_files = []
    if 'source_folder_id' not in st.session_state:
        st.session_state.source_folder_id = DEFAULT_FOLDER_ID
    if 'parent_folder_id' not in st.session_state:
        st.session_state.parent_folder_id = None

    # Sistema de carpetas de persistencia secuencial (actualizado con nuevo flujo)
    if 'project_folder_id' not in st.session_state:
        st.session_state.project_folder_id = None
    if 'persistence_folders' not in st.session_state:
        st.session_state.persistence_folders = {
            # FASE 1: PREPARACIÓN
            '01_PDF_Files': None,
            '02_Language_Detection': None,
            '03_TXT_Converted': None,
            '04_TXT_Preprocessed': None,
            # FASE 2: REPRESENTACIÓN VECTORIAL
            '05_BagOfWords_Results': None,
            '06_TFIDF_Results': None,
            '07_Ngram_Analysis': None,
            # FASE 3: ANÁLISIS LINGÜÍSTICO
            '08_NER_Analysis': None,
            # FASE 4: MODELADO DE TEMAS
            '09_Topic_Modeling': None,
            '10_BERTopic_Analysis': None,
            # FASE 5: DIMENSIONALIDAD Y CLASIFICACIÓN
            '11_Dimensionality_Reduction': None,
            '12_Classification_Results': None,
            # FASE 6: ANÁLISIS INTEGRADO
            '13_Factor_Analysis': None,
        }

    # Datos procesados por etapa
    if 'pdf_files' not in st.session_state:
        st.session_state.pdf_files = []
    if 'language_detection_results' not in st.session_state:
        st.session_state.language_detection_results = []
    if 'english_pdf_files' not in st.session_state:
        st.session_state.english_pdf_files = []
    if 'conversion_results' not in st.session_state:
        st.session_state.conversion_results = []
    if 'txt_files' not in st.session_state:
        st.session_state.txt_files = []


# ==================== FUNCIÓN PRINCIPAL ====================

def main() -> None:
    """Función principal de la aplicación"""
    try:
        logger.debug("Ejecutando función main()")

        # Inicializar estado
        init_session_state()

        # Aplicar estilos
        apply_custom_styles()

        # Renderizar sidebar y obtener página seleccionada
        pagina: Optional[str] = render_sidebar()
        logger.debug(f"Página seleccionada: {pagina}")

        # Routing de páginas - Reorganizado por flujo lógico
        if pagina == "Inicio":
            inicio.render()

        # FASE 1: PREPARACIÓN
        elif pagina == "1. Conexión Google Drive":
            conexion_drive.render()
        elif pagina == "2. Estadísticas de Archivos":
            estadisticas_archivos.render()
        elif pagina == "3. Detección de Idiomas":
            deteccion_idiomas.render()
        elif pagina == "4. Conversión a TXT":
            conversion_txt.render()
        elif pagina == "5. Preprocesamiento":
            preprocesamiento.render()

        # FASE 2: REPRESENTACIÓN VECTORIAL
        elif pagina == "6. Bolsa de Palabras":
            bolsa_palabras.render()
        elif pagina == "7. Análisis TF-IDF":
            analisis_tfidf.render()
        elif pagina == "8. Análisis de N-gramas":
            ngram_analysis_page.render()

        # FASE 3: ANÁLISIS LINGÜÍSTICO
        elif pagina == "9. Named Entity Recognition":
            ner_analysis.render()

        # FASE 4: MODELADO DE TEMAS
        elif pagina == "10. Modelado de Temas":
            topic_modeling_page.render()
        elif pagina == "11. BERTopic":
            bertopic_page.render()

        # FASE 5: DIMENSIONALIDAD Y CLASIFICACIÓN
        elif pagina == "12. Reducción de Dimensionalidad":
            dimensionality_reduction_page.render()
        elif pagina == "13. Clasificación de Textos":
            classification_page.render()

        # FASE 6: ANÁLISIS INTEGRADO
        elif pagina == "14. Análisis de Factores":
            analisis_factores.render()
        elif pagina == "15. Consolidación de Factores":
            consolidacion_factores.render()

        # FASE 7: VISUALIZACIÓN
        elif pagina == "16. Visualizaciones y Nubes de Palabras":
            # Combinar ambas páginas de visualización
            visualizaciones.render()
            st.markdown("---")
            st.markdown("## 🔤 Nube de Palabras")
            nube_palabras.render()

        # FASE 8: EVALUACIÓN
        elif pagina == "17. Evaluación de Desempeño":
            evaluacion_desempeno.render()

        # Manejo de separadores de fase (son solo títulos, mostrar página de inicio)
        elif "FASE" in pagina and pagina.strip().startswith("FASE"):
            st.info("👈 Selecciona una opción específica del menú lateral")
            st.markdown("""
            ### 🎯 Flujo de Análisis Organizado por Fases

            El análisis está estructurado en **8 fases secuenciales**:

            **📁 FASE 1: PREPARACIÓN**
            - Conexión a Google Drive
            - Detección de idiomas
            - Conversión de documentos
            - Preprocesamiento de texto

            **📁 FASE 2: REPRESENTACIÓN VECTORIAL**
            - Bolsa de Palabras (BoW)
            - TF-IDF
            - Análisis de N-gramas

            **📁 FASE 3: ANÁLISIS LINGÜÍSTICO**
            - Named Entity Recognition (NER)

            **📁 FASE 4: MODELADO DE TEMAS**
            - Topic Modeling clásico (LDA/NMF/LSA/pLSA)
            - BERTopic (moderno)

            **📁 FASE 5: DIMENSIONALIDAD Y CLASIFICACIÓN**
            - Reducción de Dimensionalidad (PCA/t-SNE/UMAP)
            - Clasificación de Textos

            **📁 FASE 6: ANÁLISIS INTEGRADO**
            - Análisis de Factores (consolida todos los análisis)

            **📁 FASE 7: VISUALIZACIÓN**
            - Visualizaciones y Nubes de Palabras

            **📁 FASE 8: EVALUACIÓN**
            - Evaluación de Desempeño del Pipeline Completo
            """)

        else:
            logger.warning(f"Página desconocida: {pagina}")
            st.error(f"❌ Página no encontrada: {pagina}")

    except Exception as e:
        logger.error(f"Error crítico en main(): {e}", exc_info=True)
        st.error(f"❌ Error crítico en la aplicación: {e}")
        st.error("Por favor, revisa los logs para más detalles.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Aplicación interrumpida por el usuario")
    except Exception as e:
        logger.critical(f"Error fatal en la aplicación: {e}", exc_info=True)
    finally:
        logger.info("Cerrando aplicación")
        LoggerManager.shutdown()

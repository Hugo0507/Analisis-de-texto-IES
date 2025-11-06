# 📄 Documentación Detallada: `app.py`

## 📍 Ubicación

```
analisis_transformacion_digital/app.py
```

## 🎯 Propósito

`app.py` es el **punto de entrada principal** de la aplicación. Es el archivo que se ejecuta para iniciar la aplicación web de Streamlit. Su responsabilidad es **orquestar** todos los componentes del sistema, inicializar configuraciones, gestionar el estado de la aplicación y renderizar la interfaz de usuario.

## 🔄 Flujo de Ejecución

```
streamlit run app.py
    ↓
Importar config.py (cargar variables de entorno)
    ↓
Inicializar sistema de logging
    ↓
Importar módulos de negocio (src/*)
    ↓
Importar componentes UI (components/*)
    ↓
main() → init_session_state() → render UI
```

---

## 📚 Librerías Utilizadas

### Líneas 8-11: Librerías Estándar de Python

```python
import streamlit as st
import sys
import os
from typing import Optional
```

**¿Qué hace cada librería?**

- **`streamlit as st`**: Framework principal para crear la aplicación web interactiva
  - **Dónde se usa**: En toda la aplicación para crear elementos UI (botones, selectboxes, etc.)
  - **Para qué**: Renderizar la interfaz de usuario web

- **`sys`**: Módulo del sistema de Python
  - **Dónde se usa**: Línea 14 - para manipular `sys.path`
  - **Para qué**: Agregar el directorio `src/` al path de Python para poder importar módulos

- **`os`**: Operaciones del sistema operativo
  - **Dónde se usa**: Línea 14 - para obtener rutas de directorios
  - **Para qué**: Manipular rutas de archivos y directorios

- **`typing.Optional`**: Type hints de Python
  - **Dónde se usa**: Líneas 80, 163 - para anotaciones de tipos
  - **Para qué**: Indicar que un valor puede ser de un tipo o `None`

### Líneas 14-18: Configuración de Path e Importación de Config

```python
# Agregar directorio src al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Importar configuración y logging PRIMERO
import config  # noqa: E402
from src.utils.logger import LoggerManager, get_logger  # noqa: E402
```

**¿Qué hace este código?**

1. **`sys.path.append(...)`**: Agrega el directorio `src/` al path de búsqueda de módulos de Python
   - **Por qué**: Para poder importar módulos de `src/` directamente (ej: `from src.nlp_processor import ...`)
   - **`os.path.dirname(__file__)`**: Obtiene el directorio donde está `app.py`
   - **`os.path.join(..., 'src')`**: Une el directorio actual con 'src' para formar la ruta completa

2. **`import config`**: Importa el módulo de configuración
   - **Por qué primero**: Necesitamos las variables de entorno cargadas antes de inicializar otros componentes
   - **`# noqa: E402`**: Comentario para linters que ignora el warning "import no está al principio del archivo"

3. **`from src.utils.logger import ...`**: Importa el sistema de logging
   - **Por qué segundo**: El logging se necesita para registrar eventos en toda la aplicación

### Líneas 20-22: Inicialización de Logging

```python
# Inicializar sistema de logging
LoggerManager.initialize(log_dir=config.LOG_DIR, log_level=config.LOG_LEVEL)
logger = get_logger(__name__)
```

**¿Qué hace este código?**

- **`LoggerManager.initialize(...)`**: Inicializa el sistema de logging centralizado
  - **Parámetro `log_dir`**: Directorio donde se guardarán los logs (desde `config.LOG_DIR`)
  - **Parámetro `log_level`**: Nivel de logging (DEBUG, INFO, WARNING, ERROR) desde `config.LOG_LEVEL`

- **`get_logger(__name__)`**: Obtiene un logger específico para este módulo
  - **`__name__`**: En el módulo principal, es `'__main__'`
  - **Para qué**: Registrar eventos específicos de `app.py`

### Líneas 24-30: Importación de Módulos de Negocio

```python
# Importar módulos de src (lógica de negocio)
from src.nlp_processor import ProcessadorTexto  # noqa: E402
from src.factor_analyzer import AnalizadorFactores  # noqa: E402
from src.drive_connector import GoogleDriveConnector  # noqa: E402
from src.language_detector import LanguageDetector  # noqa: E402
from src.document_converter import DocumentConverter  # noqa: E402
from src.text_preprocessor import TextPreprocessor  # noqa: E402
```

**¿Qué hace cada importación?**

- **`ProcessadorTexto`** (de `nlp_processor.py`): Clase para procesamiento de lenguaje natural
  - **Para qué**: Tokenización, stemming, análisis de frecuencias
  - **Dónde se usa**: Línea 102 - se instancia en `session_state`

- **`AnalizadorFactores`** (de `factor_analyzer.py`): Clase para análisis de factores y clustering
  - **Para qué**: Agrupar documentos, identificar factores
  - **Dónde se usa**: Línea 105 - se instancia en `session_state`

- **`GoogleDriveConnector`** (de `drive_connector.py`): Clase para conexión con Google Drive
  - **Para qué**: Autenticar, listar, descargar y subir archivos a Drive
  - **Dónde se usa**: Línea 87 - se instancia en `session_state`

- **`LanguageDetector`** (de `language_detector.py`): Clase para detección de idiomas
  - **Para qué**: Detectar el idioma de documentos PDF
  - **Dónde se usa**: Línea 93 - se instancia en `session_state`

- **`DocumentConverter`** (de `document_converter.py`): Clase para conversión de documentos
  - **Para qué**: Convertir PDF a TXT
  - **Dónde se usa**: Línea 96 - se instancia en `session_state`

- **`TextPreprocessor`** (de `text_preprocessor.py`): Clase para preprocesamiento de textos
  - **Para qué**: Limpiar, normalizar y preprocesar textos
  - **Dónde se usa**: Línea 99 - se instancia en `session_state`

### Líneas 32-49: Importación de Componentes UI y Páginas

```python
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
    visualizaciones,
    nube_palabras
)
```

**¿Qué hace cada importación?**

**Componentes UI:**

- **`apply_custom_styles`**: Función que aplica estilos CSS personalizados
  - **Dónde se usa**: Línea 160 - se llama en `main()`
  - **Para qué**: Personalizar la apariencia de la aplicación

- **`render_sidebar`**: Función que renderiza la barra lateral de navegación
  - **Dónde se usa**: Línea 163 - se llama en `main()`
  - **Para qué**: Mostrar el menú de navegación y retornar la página seleccionada

**Páginas:**

Todas las páginas importadas tienen una función `render()` que se llama cuando el usuario navega a esa página:

- **`inicio`**: Página de inicio con información general
- **`conexion_drive`**: Conexión y autenticación con Google Drive
- **`estadisticas_archivos`**: Estadísticas de archivos PDF
- **`deteccion_idiomas`**: Detección de idiomas de PDFs
- **`conversion_txt`**: Conversión de PDF a TXT
- **`preprocesamiento`**: Preprocesamiento de textos
- **`bolsa_palabras`**: Análisis de Bolsa de Palabras (Bag of Words)
- **`analisis_tfidf`**: Análisis TF-IDF
- **`analisis_factores`**: Análisis de factores y clustering
- **`visualizaciones`**: Visualizaciones generales
- **`nube_palabras`**: Generación de nube de palabras

### Líneas 52-57: Importación de Páginas de Modelos Avanzados

```python
# Importar páginas de modelos avanzados
from components.pages.models import ner_analysis  # noqa: E402
from components.pages.models import topic_modeling_page  # noqa: E402
from components.pages.models import ngram_analysis_page  # noqa: E402
from components.pages.models import bertopic_page  # noqa: E402
from components.pages.models import classification_page  # noqa: E402
from components.pages.models import dimensionality_reduction_page  # noqa: E402
```

**¿Qué hace cada importación?**

- **`ner_analysis`**: Análisis de Reconocimiento de Entidades Nombradas (NER)
- **`topic_modeling_page`**: Modelado de temas (LDA, NMF, LSA)
- **`ngram_analysis_page`**: Análisis de n-gramas (bigramas, trigramas)
- **`bertopic_page`**: Topic modeling con BERTopic (basado en transformers)
- **`classification_page`**: Clasificación de textos
- **`dimensionality_reduction_page`**: Reducción de dimensionalidad (PCA, t-SNE, UMAP)

---

## 🔧 Funciones Principales

### Líneas 61-66: Configuración de Streamlit

```python
st.set_page_config(
    page_title="Análisis Transformación Digital",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)
```

**¿Qué hace este código?**

Configura la página de Streamlit con opciones básicas:

- **`page_title`**: Título que aparece en la pestaña del navegador
- **`page_icon`**: Icono emoji que aparece en la pestaña
- **`layout="wide"`**: Usa todo el ancho de la pantalla (en lugar de centrado)
- **`initial_sidebar_state="expanded"`**: La barra lateral se muestra expandida al inicio

**⚠️ IMPORTANTE**: Esta configuración DEBE ser la primera llamada de Streamlit en el archivo.

### Líneas 68-75: Constantes y Logging Inicial

```python
# Constantes desde configuración
DEFAULT_FOLDER_ID: str = config.GOOGLE_DRIVE_FOLDER_ID

logger.info("=" * 60)
logger.info("INICIANDO APLICACIÓN - Análisis Transformación Digital")
logger.info(f"Entorno: {config.ENVIRONMENT}")
logger.info(f"Nivel de log: {config.LOG_LEVEL}")
logger.info("=" * 60)
```

**¿Qué hace este código?**

- **Línea 69**: Obtiene el ID de carpeta de Google Drive desde la configuración
- **Líneas 71-75**: Registra el inicio de la aplicación en los logs con información del entorno

---

### 🔑 Función: `init_session_state()`

**Líneas 80-147**

```python
def init_session_state() -> None:
    """Inicializa el estado de sesión"""
```

**¿Qué hace esta función?**

Inicializa el **estado de sesión de Streamlit** (`st.session_state`). El session_state es como una "memoria" de la aplicación que persiste entre reruns (cuando el usuario interactúa con la aplicación).

**¿Por qué es importante?**

Streamlit re-ejecuta todo el script cada vez que el usuario interactúa con la aplicación. Sin session_state, todas las variables se perderían. El session_state permite:

1. **Mantener objetos creados** (conectores, procesadores)
2. **Conservar datos procesados** (archivos, resultados)
3. **Recordar el estado del flujo** (autenticado, carpetas creadas)

#### Inicialización de Conectores (Líneas 85-105)

```python
if 'drive_connector' not in st.session_state:
    logger.info("Creando GoogleDriveConnector")
    st.session_state.drive_connector = GoogleDriveConnector(
        credentials_path=config.CREDENTIALS_PATH,
        token_path=config.TOKEN_PATH
    )
```

**¿Qué hace este bloque?**

1. **Línea 85**: Verifica si `drive_connector` ya existe en session_state
2. **Línea 86**: Si no existe, registra en log que se va a crear
3. **Líneas 87-90**: Crea una instancia de `GoogleDriveConnector` con las credenciales configuradas

**¿Por qué el patrón `if 'x' not in st.session_state`?**

- **Evita re-crear objetos** en cada rerun de Streamlit
- **Optimiza performance**: Los objetos se crean solo una vez
- **Mantiene estado**: Las conexiones y configuraciones se preservan

Este patrón se repite para todos los componentes:

- **`language_detector`**: Detector de idiomas
- **`document_converter`**: Convertidor de documentos
- **`text_preprocessor`**: Preprocesador de textos
- **`procesador`**: Procesador NLP
- **`analizador`**: Analizador de factores

#### Inicialización de Estados del Workflow (Líneas 108-115)

```python
if 'authenticated' not in st.session_state:
    st.session_state.authenticated = False
if 'drive_files' not in st.session_state:
    st.session_state.drive_files = []
# ... más estados
```

**¿Qué hace este bloque?**

Inicializa variables de estado que controlan el flujo de la aplicación:

- **`authenticated`**: Indica si el usuario está autenticado con Google Drive
- **`drive_files`**: Lista de archivos de Google Drive
- **`source_folder_id`**: ID de la carpeta fuente en Drive
- **`parent_folder_id`**: ID de la carpeta padre

#### Sistema de Carpetas de Persistencia (Líneas 118-134)

```python
if 'project_folder_id' not in st.session_state:
    st.session_state.project_folder_id = None
if 'persistence_folders' not in st.session_state:
    st.session_state.persistence_folders = {
        '01_PDF_Files': None,
        '02_PDF_EN_Detected': None,
        '03_TXT_Converted': None,
        '04_TXT_Preprocessed': None,
        '05_BagOfWords_Results': None,
        '06_TFIDF_Results': None,
        '07_NER_Analysis': None,
        '08_Topic_Modeling': None,
        '09_Ngram_Analysis': None,
        '10_BERTopic_Analysis': None,
        '11_Classification_Results': None,
        '12_Dimensionality_Reduction': None,
    }
```

**¿Qué hace este bloque?**

Crea un **sistema de carpetas secuencial** en Google Drive para organizar los resultados:

- **`project_folder_id`**: ID de la carpeta raíz del proyecto en Drive
- **`persistence_folders`**: Diccionario con nombres de carpetas y sus IDs

**¿Por qué este sistema?**

- **Organización**: Cada etapa del procesamiento tiene su carpeta
- **Trazabilidad**: Se puede ver el progreso del análisis
- **Persistencia**: Los resultados se guardan en Drive para acceso futuro

#### Inicialización de Datos Procesados (Líneas 137-147)

```python
if 'pdf_files' not in st.session_state:
    st.session_state.pdf_files = []
if 'language_detection_results' not in st.session_state:
    st.session_state.language_detection_results = []
# ... más listas de datos
```

**¿Qué hace este bloque?**

Inicializa listas para almacenar datos procesados en cada etapa:

- **`pdf_files`**: Lista de archivos PDF descargados
- **`language_detection_results`**: Resultados de detección de idiomas
- **`english_pdf_files`**: PDFs filtrados en inglés
- **`conversion_results`**: Resultados de conversión PDF→TXT
- **`txt_files`**: Archivos TXT procesados

---

### 🎨 Función: `main()`

**Líneas 151-209**

```python
def main() -> None:
    """Función principal de la aplicación"""
```

**¿Qué hace esta función?**

Es el **punto de entrada principal** que orquesta toda la aplicación. Se ejecuta cada vez que Streamlit hace un rerun.

#### Estructura de Try-Except (Líneas 153-209)

```python
try:
    logger.debug("Ejecutando función main()")

    # Inicializar estado
    init_session_state()

    # Aplicar estilos
    apply_custom_styles()

    # Renderizar sidebar y obtener página seleccionada
    pagina: Optional[str] = render_sidebar()
    logger.debug(f"Página seleccionada: {pagina}")

    # Routing de páginas
    if pagina == "Inicio":
        inicio.render()
    elif pagina == "1. Conexión Google Drive":
        conexion_drive.render()
    # ... más páginas
    else:
        logger.warning(f"Página desconocida: {pagina}")

except Exception as e:
    logger.error(f"Error crítico en main(): {e}", exc_info=True)
    st.error(f"❌ Error crítico en la aplicación: {e}")
    st.error("Por favor, revisa los logs para más detalles.")
```

**¿Qué hace cada parte?**

1. **Línea 157**: Llama a `init_session_state()` para inicializar componentes
2. **Línea 160**: Aplica estilos CSS personalizados
3. **Línea 163**: Renderiza el sidebar y obtiene la página seleccionada
4. **Líneas 166-201**: **Routing de páginas** - ejecuta la función `render()` de la página seleccionada
5. **Líneas 205-208**: Manejo de errores - captura excepciones y las muestra al usuario

#### Routing de Páginas (Líneas 167-201)

**¿Qué es el routing?**

El routing es el proceso de **decidir qué página mostrar** basándose en la selección del usuario.

```python
if pagina == "Inicio":
    inicio.render()
elif pagina == "1. Conexión Google Drive":
    conexion_drive.render()
```

**¿Cómo funciona?**

1. `render_sidebar()` retorna el nombre de la página seleccionada
2. Se compara con `if/elif` para encontrar la página correcta
3. Se llama a la función `render()` de esa página

**Páginas principales:**
- Inicio
- 1-10: Páginas del flujo de trabajo principal
- 🤖: Páginas de modelos avanzados

---

### 🚀 Bloque de Ejecución Principal

**Líneas 211-220**

```python
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
```

**¿Qué hace este código?**

**`if __name__ == "__main__":`**

- Solo se ejecuta cuando el archivo se ejecuta directamente (`python app.py` o `streamlit run app.py`)
- NO se ejecuta si el archivo es importado como módulo

**Try-Except-Finally:**

1. **`try: main()`**: Ejecuta la función principal
2. **`except KeyboardInterrupt`**: Captura Ctrl+C (interrupción del usuario)
3. **`except Exception`**: Captura cualquier otro error fatal
4. **`finally`**: Se ejecuta SIEMPRE, incluso si hay errores
   - Registra el cierre de la aplicación
   - Llama a `LoggerManager.shutdown()` para cerrar correctamente los logs

---

## 🔗 Dependencias de Otros Archivos

### Archivos que `app.py` IMPORTA:

```
app.py
  ├─→ config.py (configuración)
  ├─→ src/utils/logger.py (logging)
  ├─→ src/nlp_processor.py
  ├─→ src/factor_analyzer.py
  ├─→ src/drive_connector.py
  ├─→ src/language_detector.py
  ├─→ src/document_converter.py
  ├─→ src/text_preprocessor.py
  ├─→ components/ui/styles.py
  ├─→ components/ui/layout.py
  ├─→ components/pages/*.py (todas las páginas)
  └─→ components/pages/models/*.py (páginas de modelos)
```

### Archivos que DEPENDEN de `app.py`:

Ninguno. `app.py` es el punto de entrada y no es importado por otros archivos.

---

## 📊 Diagrama de Flujo

```
┌─────────────────────────────────────────┐
│   streamlit run app.py                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   Importar config.py                    │
│   (Cargar variables de entorno)         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   Inicializar LoggerManager             │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   Importar módulos src/* y components/* │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   st.set_page_config()                  │
│   (Configurar página)                   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   main()                                │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   init_session_state()                  │
│   • Crear conectores                    │
│   • Inicializar variables de estado     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   apply_custom_styles()                 │
│   (Aplicar CSS)                         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   pagina = render_sidebar()             │
│   (Renderizar menú y obtener selección) │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   Routing: Llamar a pagina.render()    │
│   (Renderizar página seleccionada)      │
└─────────────────────────────────────────┘
```

---

## 💡 Conceptos Clave para Principiantes

### 1. ¿Qué es Streamlit?

Streamlit es un framework de Python para crear aplicaciones web interactivas fácilmente. En lugar de escribir HTML/CSS/JavaScript, escribes Python y Streamlit lo convierte en una interfaz web.

### 2. ¿Qué es session_state?

`st.session_state` es como una "memoria" de la aplicación. Guarda datos entre ejecuciones del script. Sin él, cada vez que haces clic en un botón, la aplicación "olvida" todo.

### 3. ¿Por qué tantas importaciones?

El proyecto sigue el principio de **modularidad**: cada archivo tiene una responsabilidad específica. `app.py` importa todos estos módulos para orquestarlos.

### 4. ¿Qué es el routing?

El routing es decidir qué mostrar según la acción del usuario. En este caso, según la página seleccionada en el sidebar.

### 5. ¿Por qué `# noqa: E402`?

Es un comentario para linters (herramientas que verifican código). `E402` es el error "import no está al principio del archivo". Se ignora porque necesitamos modificar `sys.path` antes de importar.

---

## 🔍 Resumen

**`app.py`** es el **corazón de la aplicación**. Es responsable de:

✅ Inicializar configuración y logging
✅ Crear instancias de conectores y procesadores
✅ Mantener el estado de la aplicación
✅ Renderizar la interfaz de usuario
✅ Dirigir al usuario a la página correcta (routing)
✅ Manejar errores de forma centralizada

**Flujo simplificado:**
1. Cargar configuración
2. Inicializar logging
3. Crear componentes (solo una vez)
4. Renderizar UI según selección del usuario
5. Manejar errores si ocurren

**Para modificar este archivo:**
- Para agregar una nueva página: Importarla e incluirla en el routing
- Para agregar un nuevo componente: Agregarlo en `init_session_state()`
- Para cambiar configuración: Modificar `config.py`, no `app.py`

---

**Archivo**: `app.py`
**Líneas de código**: 221
**Complejidad**: Media
**Importancia**: ⭐⭐⭐⭐⭐ (Crítico - Punto de entrada)

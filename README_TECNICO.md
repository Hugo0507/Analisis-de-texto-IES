# 📚 Manual Técnico - Análisis de Transformación Digital

## 📋 Tabla de Contenido

1. [Introducción](#introducción)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Flujo de Ejecución](#flujo-de-ejecución)
5. [Componentes Principales](#componentes-principales)
6. [Dependencias del Proyecto](#dependencias-del-proyecto)
7. [Sistema de Configuración](#sistema-de-configuración)
8. [Sistema de Logging](#sistema-de-logging)
9. [Sistema de Caché](#sistema-de-caché)
10. [Guía de Instalación](#guía-de-instalación)
11. [Guía de Uso](#guía-de-uso)
12. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Introducción

Este proyecto es una **aplicación web de análisis de transformación digital** desarrollada en Python utilizando Streamlit como framework de visualización. Su objetivo es procesar documentos PDF académicos, extraer información relevante y realizar análisis de procesamiento de lenguaje natural (NLP) para identificar tendencias, temas y factores clave en la transformación digital.

### Características Principales

- ✅ Conexión con Google Drive para gestión de archivos
- ✅ Detección automática de idiomas
- ✅ Conversión de PDF a TXT
- ✅ Preprocesamiento avanzado de textos
- ✅ Análisis de Bolsa de Palabras (Bag of Words)
- ✅ Análisis TF-IDF (Term Frequency-Inverse Document Frequency)
- ✅ Análisis de Factores con técnicas de clustering
- ✅ Visualizaciones interactivas
- ✅ Modelos avanzados de NLP (NER, Topic Modeling, N-gramas, BERTopic, Clasificación)
- ✅ Sistema de caché para optimización de rendimiento
- ✅ Sistema de logging centralizado

---

## 🏗️ Arquitectura del Proyecto

El proyecto sigue una **arquitectura modular en capas** con separación clara de responsabilidades:

```
┌─────────────────────────────────────────────────────┐
│              CAPA DE PRESENTACIÓN                   │
│        (Streamlit - components/pages/)              │
├─────────────────────────────────────────────────────┤
│              CAPA DE COMPONENTES UI                 │
│         (components/ui/ - Helpers, Layout)          │
├─────────────────────────────────────────────────────┤
│           CAPA DE LÓGICA DE NEGOCIO                 │
│  (src/ - Procesadores, Conectores, Modelos)         │
├─────────────────────────────────────────────────────┤
│              CAPA DE UTILIDADES                     │
│      (src/utils/ - Logger, Cache)                   │
├─────────────────────────────────────────────────────┤
│           CAPA DE CONFIGURACIÓN                     │
│           (config.py - Variables)                   │
├─────────────────────────────────────────────────────┤
│              CAPA DE DATOS                          │
│  (Google Drive API, Sistema de Archivos Local)      │
└─────────────────────────────────────────────────────┘
```

### Principios de Diseño

1. **Separación de Responsabilidades**: Cada módulo tiene una función específica
2. **Modularidad**: Componentes independientes y reutilizables
3. **Configurabilidad**: Variables de entorno para personalización
4. **Trazabilidad**: Sistema de logging para debugging
5. **Performance**: Sistema de caché para optimizar operaciones costosas

---

## 📁 Estructura de Carpetas

### Estructura Completa del Proyecto

```
analisis_transformacion_digital/
│
├── 📄 app.py                          # PUNTO DE ENTRADA principal de la aplicación
├── 📄 config.py                       # Configuración centralizada (variables de entorno)
│
├── 📂 src/                            # CAPA DE NEGOCIO - Lógica principal del proyecto
│   ├── __init__.py
│   ├── nlp_processor.py               # Procesamiento de lenguaje natural (NLP)
│   ├── drive_connector.py             # Conexión con Google Drive API
│   ├── text_preprocessor.py           # Preprocesamiento de textos
│   ├── document_converter.py          # Conversión de documentos PDF a TXT
│   ├── language_detector.py           # Detección de idiomas
│   ├── factor_analyzer.py             # Análisis de factores y clustering
│   │
│   ├── 📂 models/                     # Modelos avanzados de Machine Learning
│   │   ├── __init__.py
│   │   ├── ner_analyzer.py            # Named Entity Recognition (NER)
│   │   ├── ner_cache.py               # Sistema de caché para NER
│   │   ├── topic_modeling.py          # Modelado de temas (LDA, NMF, LSA)
│   │   ├── bertopic_analyzer.py       # BERTopic para topic modeling
│   │   ├── text_classifier.py         # Clasificación de textos
│   │   ├── ngram_analyzer.py          # Análisis de n-gramas
│   │   ├── dimensionality_reduction.py # Reducción de dimensionalidad (PCA, t-SNE, UMAP)
│   │   ├── factor_identification.py   # Identificación de factores
│   │   └── science_mapping.py         # Science mapping y análisis bibliométrico
│   │
│   └── 📂 utils/                      # Utilidades transversales
│       ├── __init__.py
│       ├── logger.py                  # Sistema de logging centralizado
│       └── local_cache.py             # Sistema de caché local
│
├── 📂 components/                     # CAPA DE PRESENTACIÓN - UI de Streamlit
│   ├── __init__.py
│   │
│   ├── 📂 ui/                         # Componentes de interfaz de usuario
│   │   ├── __init__.py
│   │   ├── styles.py                  # Estilos CSS personalizados
│   │   ├── layout.py                  # Layout principal y sidebar
│   │   └── helpers.py                 # Funciones auxiliares UI
│   │
│   └── 📂 pages/                      # Páginas de la aplicación Streamlit
│       ├── __init__.py
│       ├── inicio.py                  # Página de inicio
│       ├── conexion_drive.py          # Conexión a Google Drive
│       ├── estadisticas_archivos.py   # Estadísticas de archivos PDF
│       ├── deteccion_idiomas.py       # Detección de idiomas de PDFs
│       ├── conversion_txt.py          # Conversión PDF → TXT
│       ├── preprocesamiento.py        # Preprocesamiento de textos
│       ├── bolsa_palabras.py          # Análisis Bag of Words
│       ├── analisis_tfidf.py          # Análisis TF-IDF
│       ├── analisis_factores.py       # Análisis de factores
│       ├── visualizaciones.py         # Visualizaciones generales
│       ├── nube_palabras.py           # Nube de palabras
│       │
│       └── 📂 models/                 # Páginas de modelos avanzados
│           ├── __init__.py
│           ├── ner_analysis.py        # Página de análisis NER
│           ├── topic_modeling_page.py # Página de topic modeling
│           ├── ngram_analysis_page.py # Página de n-gramas
│           ├── bertopic_page.py       # Página de BERTopic
│           ├── classification_page.py # Página de clasificación
│           └── dimensionality_reduction_page.py # Página de reducción dimensionalidad
│
├── 📂 tests/                          # Tests unitarios
│   ├── __init__.py
│   ├── conftest.py                    # Configuración de pytest
│   ├── test_nlp_processor.py
│   ├── test_text_preprocessor.py
│   ├── test_drive_connector.py
│   └── test_factor_analyzer.py
│
├── 📂 docs/                           # DOCUMENTACIÓN del proyecto
│   ├── README.md                      # Índice de documentación
│   ├── GUIA_USO.md                    # Guía de uso
│   ├── INSTALACION.md                 # Guía de instalación
│   ├── REFERENCIA_RAPIDA.md           # Referencia rápida
│   │
│   ├── 📂 arquitectura/               # Documentación de arquitectura
│   ├── 📂 cache/                      # Documentación del sistema de caché
│   ├── 📂 estado/                     # Estado del proyecto
│   ├── 📂 implementaciones/           # Implementaciones específicas
│   ├── 📂 instalacion/                # Guías de instalación
│   ├── 📂 optimizaciones/             # Optimizaciones realizadas
│   ├── 📂 testing/                    # Documentación de testing
│   └── 📂 detalle_archivos/           # ⭐ DOCUMENTACIÓN DETALLADA DE CADA ARCHIVO
│
├── 📂 cache/                          # Sistema de caché para optimización
│   ├── 📂 bow_cache/                  # Caché de Bag of Words
│   ├── 📂 tfidf_cache/                # Caché de TF-IDF
│   ├── 📂 preprocessing_cache/        # Caché de preprocesamiento
│   ├── 📂 ner_analysis_cache/         # Caché de análisis NER
│   └── 📂 topic_modeling_cache/       # Caché de topic modeling
│
├── 📂 logs/                           # Logs de la aplicación
│   ├── app.log                        # Log general de la aplicación
│   └── errors.log                     # Log específico de errores
│
├── 📂 data/                           # Datos del proyecto (vacío inicialmente)
├── 📂 output/                         # Resultados de análisis (vacío inicialmente)
│
├── 📂 scripts/                        # Scripts de instalación y ejecución
│   ├── ejecutar.bat                   # Script para ejecutar la app (Windows)
│   ├── ejecutar.sh                    # Script para ejecutar la app (Linux/Mac)
│   ├── instalar.bat                   # Script de instalación (Windows)
│   ├── instalar.sh                    # Script de instalación (Linux/Mac)
│   └── README.txt                     # Instrucciones de scripts
│
├── 📄 requirements.txt                # Dependencias del proyecto (completo)
├── 📄 requirements-minimal.txt        # Dependencias mínimas
├── 📄 .env                            # Variables de entorno (NO incluir en git)
├── 📄 credentials.json                # Credenciales Google Drive (NO incluir en git)
├── 📄 token.json                      # Token de autenticación Google (generado automáticamente)
│
├── 📄 pytest.ini                      # Configuración de pytest
├── 📄 mypy.ini                        # Configuración de mypy (type checking)
│
└── 📄 README.md                       # README principal del proyecto

```

### Descripción de Carpetas Principales

#### 📂 `src/` - Lógica de Negocio

Contiene toda la lógica de procesamiento y análisis del proyecto. Aquí se encuentran las clases y funciones que realizan el trabajo real de la aplicación, independiente de la interfaz de usuario.

**Archivos principales:**

- `nlp_processor.py`: Procesamiento de lenguaje natural (tokenización, stemming, análisis de frecuencias)
- `drive_connector.py`: Gestión de conexión con Google Drive API
- `text_preprocessor.py`: Limpieza y normalización de textos
- `document_converter.py`: Conversión de documentos PDF a texto plano
- `language_detector.py`: Detección automática de idiomas
- `factor_analyzer.py`: Análisis de factores mediante clustering

**Subcarpetas:**

- `models/`: Modelos avanzados de Machine Learning y NLP
- `utils/`: Utilidades compartidas (logging, caché)

#### 📂 `components/` - Interfaz de Usuario

Contiene todos los componentes de la interfaz de usuario construida con Streamlit.

**Subcarpetas:**

- `ui/`: Componentes reutilizables de UI (estilos, layout, helpers)
- `pages/`: Páginas individuales de la aplicación
- `pages/models/`: Páginas de modelos avanzados

#### 📂 `docs/` - Documentación

Toda la documentación del proyecto organizada por categorías:

- Guías de instalación
- Guías de uso
- Arquitectura del sistema
- Implementaciones específicas
- **`detalle_archivos/`**: Documentación detallada línea por línea de cada archivo Python

#### 📂 `cache/` - Sistema de Caché

Sistema de caché para optimizar operaciones costosas. Cada subdirectorio almacena resultados en caché de diferentes análisis.

#### 📂 `logs/` - Registros de Ejecución

Almacena los logs de la aplicación:

- `app.log`: Registro general de eventos
- `errors.log`: Registro específico de errores

---

## 🔄 Flujo de Ejecución

### 1. Inicio de la Aplicación

```
Usuario ejecuta: streamlit run app.py
         ↓
[app.py] - Punto de entrada principal
         ↓
[config.py] - Carga variables de entorno (.env)
         ↓
[src/utils/logger.py] - Inicializa sistema de logging
         ↓
[app.py:init_session_state()] - Inicializa componentes en session_state
         ↓
[components/ui/styles.py] - Aplica estilos CSS
         ↓
[components/ui/layout.py] - Renderiza sidebar y navegación
```

### 2. Inicialización de Componentes (session_state)

```python
# En app.py:init_session_state()

1. GoogleDriveConnector      → Maneja conexión con Google Drive
2. LanguageDetector           → Detecta idiomas de documentos
3. DocumentConverter          → Convierte PDF a TXT
4. TextPreprocessor           → Preprocesa textos
5. ProcessadorTexto           → Procesa NLP
6. AnalizadorFactores         → Analiza factores
```

### 3. Flujo de Procesamiento de Documentos

```
┌──────────────────────────────────────────────────────────┐
│  1. CONEXIÓN GOOGLE DRIVE                                │
│  [components/pages/conexion_drive.py]                    │
│  → Autentica con Google Drive                            │
│  → Lista archivos PDF de carpeta                         │
│  → Crea estructura de carpetas de persistencia           │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  2. ESTADÍSTICAS DE ARCHIVOS                             │
│  [components/pages/estadisticas_archivos.py]             │
│  → Descarga metadatos de PDFs                            │
│  → Muestra estadísticas (tamaño, fechas, etc.)           │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  3. DETECCIÓN DE IDIOMAS                                 │
│  [components/pages/deteccion_idiomas.py]                 │
│  → Descarga PDFs de Google Drive                         │
│  → Extrae texto con pdfplumber                           │
│  → Detecta idioma con langdetect/langid                  │
│  → Filtra solo PDFs en inglés                            │
│  → Sube resultados a Google Drive                        │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  4. CONVERSIÓN A TXT                                     │
│  [components/pages/conversion_txt.py]                    │
│  → Descarga PDFs en inglés                               │
│  → Convierte PDF → TXT con DocumentConverter             │
│  → Sube archivos TXT a Google Drive                      │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  5. PREPROCESAMIENTO                                     │
│  [components/pages/preprocesamiento.py]                  │
│  → Descarga archivos TXT                                 │
│  → Limpia texto (minúsculas, puntuación, números)        │
│  → Tokeniza palabras                                     │
│  → Remueve stopwords                                     │
│  → Aplica stemming/lematización                          │
│  → Genera estadísticas de limpieza                       │
│  → Sube TXT preprocesados a Google Drive                 │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  6. ANÁLISIS - BOLSA DE PALABRAS                         │
│  [components/pages/bolsa_palabras.py]                    │
│  → Crea matriz documento-término (CountVectorizer)       │
│  → Calcula frecuencias de palabras por documento         │
│  → Identifica palabras más frecuentes                    │
│  → Genera visualizaciones                                │
│  → Sistema de caché para optimización                    │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  7. ANÁLISIS TF-IDF                                      │
│  [components/pages/analisis_tfidf.py]                    │
│  → Calcula TF-IDF (TfidfVectorizer)                      │
│  → Identifica términos más relevantes por documento      │
│  → Genera ranking de importancia                         │
│  → Visualizaciones interactivas                          │
│  → Sistema de caché para optimización                    │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  8. ANÁLISIS DE FACTORES                                 │
│  [components/pages/analisis_factores.py]                 │
│  → Clustering (K-Means) sobre TF-IDF                     │
│  → Identifica factores principales                       │
│  → Agrupa documentos por similitud                       │
│  → Exporta resultados a Drive                            │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  9. VISUALIZACIONES                                      │
│  [components/pages/visualizaciones.py]                   │
│  → Gráficos de barras, líneas, dispersión               │
│  → Visualizaciones de clustering                         │
│  → Gráficos interactivos con Plotly                      │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  10. NUBE DE PALABRAS                                    │
│  [components/pages/nube_palabras.py]                     │
│  → Genera nube de palabras visual                        │
│  → Muestra términos más frecuentes                       │
└──────────────────────────────────────────────────────────┘
```

### 4. Modelos Avanzados (Opcionales)

```
┌──────────────────────────────────────────────────────────┐
│  🤖 ANÁLISIS NER (Named Entity Recognition)              │
│  [components/pages/models/ner_analysis.py]               │
│  → Identifica entidades (personas, organizaciones, etc.) │
│  → Usa modelos de spaCy/transformers                     │
│  → Sistema de caché optimizado                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  🤖 MODELADO DE TEMAS (Topic Modeling)                   │
│  [components/pages/models/topic_modeling_page.py]        │
│  → LDA (Latent Dirichlet Allocation)                     │
│  → NMF (Non-negative Matrix Factorization)               │
│  → LSA (Latent Semantic Analysis)                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  🤖 ANÁLISIS DE N-GRAMAS                                 │
│  [components/pages/models/ngram_analysis_page.py]        │
│  → Bigramas, trigramas, n-gramas                         │
│  → Identificación de frases frecuentes                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  🤖 BERTOPIC                                             │
│  [components/pages/models/bertopic_page.py]              │
│  → Topic modeling basado en transformers                 │
│  → Embeddings contextuales                               │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  🤖 CLASIFICACIÓN DE TEXTOS                              │
│  [components/pages/models/classification_page.py]        │
│  → Clasificación supervisada de documentos               │
│  → Naive Bayes, SVM, Random Forest                       │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  🤖 REDUCCIÓN DE DIMENSIONALIDAD                         │
│  [components/pages/models/dimensionality_reduction_page.py]│
│  → PCA, t-SNE, UMAP                                      │
│  → Visualización de documentos en 2D/3D                  │
└──────────────────────────────────────────────────────────┘
```

---

## 🧩 Componentes Principales

### 1. `app.py` - Punto de Entrada

**Ubicación**: Raíz del proyecto
**Responsabilidad**: Orquestar toda la aplicación

**Funciones principales:**

- `init_session_state()`: Inicializa todos los componentes en session_state de Streamlit
- `main()`: Función principal que renderiza la aplicación
- Routing de páginas según selección del usuario

**Importa:**

- `config.py` → Variables de configuración
- `src/utils/logger.py` → Sistema de logging
- `src/*` → Módulos de lógica de negocio
- `components/ui/*` → Componentes de UI
- `components/pages/*` → Páginas de la aplicación

### 2. `config.py` - Configuración

**Ubicación**: Raíz del proyecto
**Responsabilidad**: Gestión centralizada de configuración

**Variables principales:**

- `GOOGLE_DRIVE_FOLDER_ID`: ID de carpeta de Google Drive
- `CREDENTIALS_PATH`: Ruta a credentials.json
- `LOG_LEVEL`: Nivel de logging (DEBUG, INFO, WARNING, ERROR)
- `CACHE_ENABLED`: Habilitar/deshabilitar caché
- `IDIOMA`: Idioma por defecto para procesamiento
- `N_CLUSTERS_DEFAULT`: Número de clusters por defecto

**Funciones:**

- `get_env()`: Obtiene variable de entorno con validación
- `get_env_bool()`: Obtiene variable booleana
- `get_env_int()`: Obtiene variable entera
- `print_config()`: Imprime configuración actual

### 3. `src/drive_connector.py` - Google Drive

**Clase**: `GoogleDriveConnector`

**Responsabilidades:**

- Autenticación con Google Drive API (OAuth2)
- Listar archivos de carpetas
- Descargar archivos
- Subir archivos
- Crear carpetas
- Copiar archivos entre carpetas

**Métodos principales:**

- `authenticate()`: Autentica con Google Drive
- `list_files()`: Lista archivos de una carpeta
- `download_file()`: Descarga un archivo
- `upload_file()`: Sube un archivo
- `create_folder()`: Crea una carpeta
- `copy_file()`: Copia un archivo

### 4. `src/language_detector.py` - Detección de Idiomas

**Clase**: `LanguageDetector`

**Responsabilidades:**

- Detectar idioma de textos usando múltiples librerías (langdetect, langid)
- Extracción de texto de PDFs

**Métodos principales:**

- `detect_language()`: Detecta idioma de un texto
- `detect_pdf_language()`: Detecta idioma de un PDF

### 5. `src/document_converter.py` - Conversión de Documentos

**Clase**: `DocumentConverter`

**Responsabilidades:**

- Convertir PDF a TXT usando múltiples métodos (pdfplumber, PyPDF2, pdfminer)
- Manejo de errores y fallback

**Métodos principales:**

- `convert_pdf_to_txt()`: Convierte PDF a texto plano

### 6. `src/text_preprocessor.py` - Preprocesamiento

**Clase**: `TextPreprocessor`

**Responsabilidades:**

- Limpieza de textos (minúsculas, puntuación, números)
- Tokenización
- Remoción de stopwords
- Stemming/Lematización
- Generación de bolsa de palabras
- Cálculo de TF-IDF

**Métodos principales:**

- `clean_text()`: Limpia un texto
- `preprocess_text()`: Preprocesa un texto completo
- `create_bag_of_words()`: Crea bolsa de palabras
- `calculate_tfidf()`: Calcula TF-IDF

### 7. `src/nlp_processor.py` - Procesamiento NLP

**Clase**: `ProcessadorTexto`

**Responsabilidades:**

- Procesamiento de lenguaje natural
- Análisis de frecuencias de palabras
- Extracción de términos clave

**Métodos principales:**

- `procesar_texto()`: Procesa un texto
- `obtener_frecuencias()`: Obtiene frecuencias de palabras
- `obtener_terminos_clave()`: Extrae términos clave

### 8. `src/factor_analyzer.py` - Análisis de Factores

**Clase**: `AnalizadorFactores`

**Responsabilidades:**

- Clustering con K-Means
- Identificación de factores principales
- Análisis de similitud entre documentos

**Métodos principales:**

- `analizar_factores()`: Realiza análisis de factores
- `agrupar_documentos()`: Agrupa documentos por similitud

### 9. `src/utils/logger.py` - Sistema de Logging

**Clases**: `LoggerManager`, función `get_logger()`

**Responsabilidades:**

- Logging centralizado
- Múltiples handlers (consola, archivo, errores)
- Formateo consistente
- Rotación de logs

**Uso:**

```python
from src.utils.logger import get_logger

logger = get_logger(__name__)
logger.info("Mensaje informativo")
logger.error("Mensaje de error")
```

### 10. `src/utils/local_cache.py` - Sistema de Caché

**Clase**: `LocalCache`

**Responsabilidades:**

- Almacenar resultados de operaciones costosas
- Invalidación de caché por hash
- Serialización con pickle
- Gestión de metadatos

**Métodos principales:**

- `get()`: Obtiene valor de caché
- `set()`: Guarda valor en caché
- `clear()`: Limpia caché
- `is_valid()`: Verifica validez de caché

---

## 📦 Dependencias del Proyecto

### Dependencias Principales

Las dependencias se encuentran en `requirements.txt`:

#### 1. Framework Web

- **streamlit** (≥1.31.0): Framework para crear aplicaciones web interactivas

#### 2. Procesamiento de Lenguaje Natural (NLP)

- **nltk** (≥3.8.1): Natural Language Toolkit - tokenización, stemming, stopwords
- **spacy** (≥3.7.0): Procesamiento NLP avanzado
- **transformers** (≥4.36.0): Modelos de transformers (BERT, etc.)
- **sentence-transformers** (≥2.3.0): Embeddings de oraciones

#### 3. Análisis de Datos

- **numpy** (≥1.24.0): Operaciones numéricas
- **pandas** (≥2.1.0): Manipulación de datos tabulares
- **scikit-learn** (≥1.4.0): Machine Learning (clustering, TF-IDF, etc.)

#### 4. Visualización

- **plotly** (≥5.18.0): Gráficos interactivos
- **matplotlib** (≥3.8.0): Gráficos estáticos
- **seaborn** (≥0.13.0): Visualización estadística
- **wordcloud** (≥1.9.0): Generación de nubes de palabras

#### 5. Google Drive

- **google-auth** (≥2.26.0): Autenticación de Google
- **google-auth-oauthlib** (≥1.2.0): OAuth2 para Google
- **google-api-python-client** (≥2.115.0): Cliente de API de Google Drive

#### 6. Procesamiento de Documentos

- **PyPDF2** (≥3.0.0): Lectura de PDFs
- **pdfplumber** (≥0.10.0): Extracción avanzada de texto de PDFs
- **python-docx** (≥1.1.0): Procesamiento de archivos Word
- **openpyxl** (≥3.1.0): Procesamiento de archivos Excel

#### 7. Detección de Idiomas

- **langdetect** (≥1.0.9): Detección de idiomas
- **langid** (≥1.1.6): Detección de idiomas alternativa

#### 8. Utilidades

- **python-dotenv** (≥1.0.0): Gestión de variables de entorno
- **tqdm** (≥4.66.0): Barras de progreso
- **networkx** (≥3.1): Análisis de redes

#### 9. Testing (Opcional)

- **pytest** (≥7.4.0): Framework de testing
- **pytest-cov** (≥4.1.0): Cobertura de tests
- **pytest-mock** (≥3.12.0): Mocking para tests

#### 10. Type Checking (Opcional)

- **mypy** (≥1.7.0): Verificación de tipos
- **types-requests** (≥2.31.0): Tipos para requests

### Instalación de Dependencias

```bash
# Opción 1: Instalación completa
pip install -r requirements.txt

# Opción 2: Instalación mínima (sin testing ni type checking)
pip install -r requirements-minimal.txt

# Opción 3: Usando scripts automatizados
# Windows:
scripts\instalar.bat

# Linux/Mac:
bash scripts/instalar.sh
```

### Recursos NLTK

Algunos recursos de NLTK se descargan automáticamente:

- `punkt`: Tokenizador
- `stopwords`: Palabras vacías
- `punkt_tab`: Tabla de tokenización

---

## ⚙️ Sistema de Configuración

### Archivo `.env`

El proyecto usa variables de entorno definidas en un archivo `.env` (no incluido en el repositorio por seguridad).

**Ejemplo de `.env`:**

```env
# Google Drive
GOOGLE_DRIVE_FOLDER_ID=1tDUZ4PnQen_lSr6z4ZALji2zdtrJf-sS
CREDENTIALS_PATH=credentials.json
TOKEN_PATH=token.json

# Logging
LOG_LEVEL=INFO
LOG_DIR=logs

# Caché
CACHE_ENABLED=True
CACHE_DIR=cache

# Procesamiento NLP
DEFAULT_LANGUAGE=english
USE_STEMMING=True
MIN_WORD_LENGTH=3

# Machine Learning
N_CLUSTERS_DEFAULT=3
N_TOPICS_DEFAULT=5
N_WORDS_PER_TOPIC=10

# Análisis
MAX_PALABRAS_NUBE=100
TOP_N_PALABRAS=20
TOP_N_FACTORES=5

# Visualización
ANCHO_NUBE_PALABRAS=1200
ALTO_NUBE_PALABRAS=600
COLOR_SCHEME=Blues
COLORMAP_WORDCLOUD=viridis

# Rutas
DATA_DIR=data
OUTPUT_DIR=output

# Desarrollo
DEBUG=False
ENVIRONMENT=development
```

### Configuración desde `config.py`

Todas las variables se cargan automáticamente desde `.env` al importar `config.py`:

```python
import config

# Acceder a variables
folder_id = config.GOOGLE_DRIVE_FOLDER_ID
log_level = config.LOG_LEVEL
cache_enabled = config.CACHE_ENABLED
```

---

## 📝 Sistema de Logging

### Características

- **Logging centralizado**: Un solo sistema para toda la aplicación
- **Múltiples niveles**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Múltiples handlers**:
  - Consola (INFO y superior)
  - Archivo general (`logs/app.log`)
  - Archivo de errores (`logs/errors.log`)
- **Formato consistente**: Timestamp, nivel, módulo, mensaje
- **Rotación automática**: Logs se rotan por tamaño/fecha

### Uso

```python
from src.utils.logger import get_logger

logger = get_logger(__name__)

# Diferentes niveles
logger.debug("Mensaje de debugging detallado")
logger.info("Información general")
logger.warning("Advertencia")
logger.error("Error recuperable")
logger.critical("Error crítico")

# Con información de excepción
try:
    # código
except Exception as e:
    logger.error(f"Error: {e}", exc_info=True)
```

### Configuración

Nivel de logging se configura en `.env`:

```env
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
```

---

## 💾 Sistema de Caché

### Propósito

Optimizar operaciones costosas almacenando resultados:

- Preprocesamiento de textos
- Análisis de Bag of Words
- Análisis TF-IDF
- Análisis NER
- Topic Modeling

### Estructura

```
cache/
├── bow_cache/
│   ├── bow_results.pkl           # Resultados serializados
│   └── bow_metadata.json         # Metadatos (hash, fecha)
├── tfidf_cache/
├── preprocessing_cache/
├── ner_analysis_cache/
└── topic_modeling_cache/
```

### Funcionamiento

1. **Antes de ejecutar operación costosa**: Verificar si existe en caché
2. **Si existe y es válido**: Cargar de caché
3. **Si no existe o es inválido**: Ejecutar operación y guardar en caché

### Invalidación de Caché

El caché se invalida automáticamente si:

- Los archivos de entrada cambian (hash diferente)
- Los parámetros de procesamiento cambian
- El usuario limpia manualmente el caché

### Uso en Código

```python
from src.utils.local_cache import LocalCache

cache = LocalCache("bow_cache")

# Intentar obtener de caché
result = cache.get(hash_key)

if result is None:
    # No está en caché, calcular
    result = expensive_operation()
    cache.set(hash_key, result, metadata)
else:
    # Usar resultado de caché
    print("Cargado de caché")
```

---

## 🚀 Guía de Instalación

### Requisitos Previos

- **Python 3.11** o superior (recomendado 3.11 para mejor compatibilidad)
- **pip** (gestor de paquetes de Python)
- **Git** (opcional, para clonar repositorio)

### Pasos de Instalación

#### 1. Clonar o Descargar el Proyecto

```bash
# Con Git
git clone <url-del-repositorio>
cd analisis_transformacion_digital

# O descargar ZIP y extraer
```

#### 2. Crear Entorno Virtual (Recomendado)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

#### 3. Instalar Dependencias

```bash
# Opción automática (recomendada)
# Windows:
scripts\instalar.bat

# Linux/Mac:
bash scripts/instalar.sh

# Opción manual:
pip install -r requirements.txt
```

#### 4. Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
# Copiar plantilla
cp .env.example .env  # Linux/Mac
copy .env.example .env  # Windows

# Editar .env con tus valores
```

#### 5. Configurar Google Drive (Opcional)

Si vas a usar Google Drive:

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto
3. Habilitar Google Drive API
4. Crear credenciales OAuth 2.0
5. Descargar `credentials.json` y colocar en raíz del proyecto

#### 6. Verificar Instalación

```bash
python -c "import streamlit; import nltk; import pandas; print('Todo OK')"
```

#### 7. Ejecutar la Aplicación

```bash
# Opción 1: Directamente
streamlit run app.py

# Opción 2: Script automático
# Windows:
scripts\ejecutar.bat

# Linux/Mac:
bash scripts/ejecutar.sh
```

La aplicación se abrirá automáticamente en el navegador en `http://localhost:8501`

---

## 📖 Guía de Uso

### Flujo de Trabajo Recomendado

#### 1. Conexión a Google Drive

- Ir a **"1. Conexión Google Drive"**
- Hacer clic en **"Conectar con Google Drive"**
- Autorizar la aplicación (primera vez)
- Seleccionar carpeta con PDFs o usar la por defecto
- Verificar que se listan los archivos

#### 2. Estadísticas de Archivos

- Ir a **"2. Estadísticas de Archivos"**
- Ver estadísticas generales de los PDFs
- Identificar tamaños, fechas de modificación, etc.

#### 3. Detección de Idiomas

- Ir a **"3. Detección de Idiomas"**
- Hacer clic en **"Detectar Idiomas"**
- El sistema descarga PDFs, extrae texto y detecta idioma
- Se filtran solo PDFs en inglés (configurable)
- Resultados se guardan en Google Drive

#### 4. Conversión a TXT

- Ir a **"4. Conversión a TXT"**
- Hacer clic en **"Convertir PDFs a TXT"**
- Se convierten los PDFs filtrados a texto plano
- Archivos TXT se suben a Google Drive

#### 5. Preprocesamiento

- Ir a **"5. Preprocesamiento"**
- Configurar opciones:
  - Remover stopwords
  - Tipo de normalización (stemming/lematización)
  - Idioma
- Hacer clic en **"Preprocesar Textos"**
- Se limpian y normalizan los textos
- Ver estadísticas de limpieza
- Textos preprocesados se suben a Drive

#### 6. Análisis - Bolsa de Palabras

- Ir a **"6. Bolsa de Palabras"**
- Hacer clic en **"Generar Bolsa de Palabras"**
- Se crea matriz documento-término
- Ver palabras más frecuentes
- Visualizaciones de frecuencias

#### 7. Análisis TF-IDF

- Ir a **"7. Análisis TF-IDF"**
- Configurar parámetros (min_df, max_df, etc.)
- Hacer clic en **"Calcular TF-IDF"**
- Ver términos más importantes por documento
- Exportar resultados

#### 8. Análisis de Factores

- Ir a **"8. Análisis de Factores"**
- Configurar número de clusters
- Hacer clic en **"Analizar Factores"**
- Ver agrupación de documentos
- Identificar factores principales
- Exportar resultados a Drive

#### 9. Visualizaciones

- Ir a **"9. Visualizaciones"**
- Explorar diferentes visualizaciones:
  - Gráficos de barras de frecuencias
  - Dispersión de documentos
  - Dendrogramas de clustering

#### 10. Nube de Palabras

- Ir a **"10. Nube de Palabras"**
- Configurar opciones (colores, tamaño)
- Generar nube de palabras visual

### Modelos Avanzados (Opcionales)

#### Análisis NER

- Ir a **"🤖 Análisis NER"**
- Seleccionar modelo (spaCy o transformers)
- Ejecutar análisis
- Ver entidades identificadas (personas, organizaciones, lugares)

#### Topic Modeling

- Ir a **"🤖 Modelado de Temas"**
- Seleccionar algoritmo (LDA, NMF, LSA)
- Configurar número de temas
- Ejecutar análisis
- Ver temas identificados y palabras clave

#### Otros Modelos

- N-gramas: Identificar frases frecuentes
- BERTopic: Topic modeling con transformers
- Clasificación: Clasificar documentos en categorías
- Reducción de Dimensionalidad: Visualizar documentos en 2D/3D

---

## 🔧 Solución de Problemas

### Error: "No module named 'streamlit'"

**Causa**: Streamlit no está instalado

**Solución**:

```bash
pip install streamlit
```

### Error: "credentials.json not found"

**Causa**: No se ha configurado Google Drive

**Solución**:

1. Descargar `credentials.json` de Google Cloud Console
2. Colocar en raíz del proyecto
3. O configurar `CREDENTIALS_PATH` en `.env`

### Error: SSL Certificate

**Causa**: Problemas con certificados SSL (común en Windows)

**Solución**:

```bash
pip install --upgrade certifi
```

### Error: "Resource 'punkt' not found"

**Causa**: Recursos NLTK no descargados

**Solución**:

```python
import nltk
nltk.download('punkt')
nltk.download('stopwords')
```

### La aplicación es muy lenta

**Solución**:

1. Verificar que el caché está habilitado (`CACHE_ENABLED=True`)
2. Revisar tamaño de archivos de entrada
3. Reducir número de documentos para pruebas
4. Aumentar nivel de logging a WARNING para reducir overhead

### Error: "Memory Error"

**Causa**: Demasiados documentos o documentos muy grandes

**Solución**:

1. Procesar en lotes más pequeños
2. Aumentar memoria disponible
3. Usar sampling de documentos

### Error: spaCy model "Can't find model 'en_core_web_sm'" (OSError [E050])

**Causa**: El modelo spaCy se descargó pero no se puede cargar inmediatamente

**Solución** (✅ **CORREGIDO EN v3.1**):

El código ahora descarga e instala automáticamente el modelo. Si ves este error:

1. **Reinicia la aplicación Streamlit** (importante):
   ```bash
   # Detén la aplicación (Ctrl+C)
   # Vuelve a iniciarla
   streamlit run app.py
   ```

2. Si el problema persiste, instala manualmente:
   ```bash
   python -m spacy download en_core_web_sm
   ```

**Archivo corregido**: `src/models/ner_analyzer.py` - Ahora usa el intérprete correcto del entorno virtual y recarga spaCy después de la descarga.

### Warnings de Plotly: "keyword arguments have been deprecated"

**Causa**: Uso de parámetros deprecados en `st.plotly_chart()`

**Solución** (✅ **CORREGIDO EN v3.1**):

Se actualizaron 150 instancias en 11 archivos:
- Reemplazado `width='stretch'` → `use_container_width=True`
- Los warnings ya no aparecerán

**Archivos corregidos**: Todas las páginas en `components/pages/` y `components/pages/models/`

### Warning: "Página desconocida: 🤖 Modelos Avanzados"

**Causa**: El menú tenía separadores que no estaban manejados en el routing

**Solución** (✅ **CORREGIDO EN v3.1**):

El routing ahora maneja correctamente separadores y headers del menú.

**Archivo corregido**: `app.py` - Agregado manejo de separadores en el routing (líneas 202-215)

---

## 📚 Documentación Adicional

Para información más detallada, consulta:

- **`docs/GUIA_USO.md`**: Guía completa de uso
- **`docs/INSTALACION.md`**: Guía detallada de instalación
- **`docs/arquitectura/ARQUITECTURA.md`**: Arquitectura del sistema
- **`docs/detalle_archivos/`**: Documentación detallada de cada archivo Python

---

## 📞 Soporte

Para preguntas o problemas:

1. Revisar documentación en `docs/`
2. Consultar logs en `logs/app.log` y `logs/errors.log`
3. Revisar issues en el repositorio (si aplica)

---

## 📄 Licencia

[Especificar licencia del proyecto]

---

## 📝 Historial de Cambios

### Versión 3.1 (2025-11-06)

**Correcciones de Errores**:
- ✅ Corregido error de carga del modelo spaCy `en_core_web_sm` (OSError [E050])
- ✅ Eliminados 150 warnings de Plotly por uso de parámetros deprecados
- ✅ Corregido routing para manejar separadores del menú ("🤖 Modelos Avanzados")

**Archivos Modificados**:
- `src/models/ner_analyzer.py` - Mejora en descarga e instalación de modelos spaCy
- `app.py` - Agregado manejo de separadores en routing
- 11 archivos en `components/pages/` - Actualización de parámetros de Plotly

### Versión 3.0 (2025-11-05)

**Nuevas Funcionalidades**:
- 📚 Documentación técnica completa (README_TECNICO.md)
- 📝 Documentación detallada de 36 archivos Python
- 🏗️ Arquitectura modular mejorada
- 🎨 Sistema de componentes UI separado

---

**Última actualización**: 2025-11-06
**Versión del proyecto**: 3.1
**Versión del manual**: 1.1.0

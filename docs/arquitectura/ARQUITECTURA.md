# Arquitectura del Proyecto - Análisis de Transformación Digital

## Versión 4.0 - Arquitectura con Pipeline Automático

---

## Estructura de Archivos

```
analisis_transformacion_digital/
│
├── app.py                          # 🎯 Archivo principal de la aplicación
├── config.py                       # Configuración global del entorno
├── requirements.txt                # Dependencias Python
├── _template_dashboard.py          # Plantilla para nuevos dashboards
│
├── components/                     # 🎨 CAPA DE PRESENTACIÓN (UI)
│   ├── __init__.py
│   │
│   ├── ui/                        # Componentes visuales reutilizables
│   │   ├── __init__.py
│   │   ├── styles.py              # CSS y estilos personalizados
│   │   ├── layout.py              # Sidebar, navegación, estructura
│   │   └── helpers.py             # Funciones auxiliares UI
│   │
│   └── pages/                     # 📄 Páginas de la aplicación
│       ├── __init__.py
│       │
│       ├── inicio.py              # Página de inicio
│       ├── dashboard_principal.py # 📊 NUEVO: Monitor de Pipeline
│       │
│       # FASE 1: PREPARACIÓN
│       ├── conexion_drive.py      # Conexión Google Drive
│       ├── estadisticas_archivos.py   # Estadísticas de archivos
│       ├── deteccion_idiomas.py   # Detección de idiomas
│       │
│       # FASE 2: PROCESAMIENTO
│       ├── conversion_txt.py      # Conversión PDF→TXT
│       ├── preprocesamiento.py    # Preprocesamiento de texto
│       │
│       # FASE 3: ANÁLISIS BÁSICO
│       ├── bolsa_palabras.py      # Bolsa de Palabras (BoW)
│       ├── analisis_tfidf.py      # Análisis TF-IDF
│       │
│       # FASE 4: ANÁLISIS AVANZADO
│       ├── analisis_factores/     # Análisis de factores
│       ├── consolidacion_factores/# Consolidación de factores
│       │
│       # FASE 5: VISUALIZACIÓN
│       ├── visualizaciones/       # Visualizaciones generales
│       ├── nube_palabras/         # Nube de palabras
│       │
│       # FASE 6: EVALUACIÓN
│       ├── evaluacion_desempeno/  # Evaluación de desempeño
│       │
│       └── models/                # 🤖 MODELOS AVANZADOS DE NLP
│           ├── __init__.py
│           ├── ner_analysis/      # Named Entity Recognition
│           ├── topic_modeling/    # Modelado de Temas (LDA, NMF, LSA)
│           ├── ngram_analysis/    # Análisis de N-gramas
│           ├── bertopic/          # BERTopic (Topic Modeling con BERT)
│           ├── classification/    # Clasificación de textos
│           └── dimensionality_reduction/  # PCA, t-SNE, UMAP
│
├── src/                            # 🧠 CAPA DE LÓGICA (Business Logic)
│   ├── __init__.py
│   │
│   # COMPONENTES CORE
│   ├── nlp_processor.py           # Procesamiento NLP general
│   ├── factor_analyzer.py         # Análisis de factores
│   ├── drive_connector.py         # Conexión Google Drive
│   ├── language_detector.py       # Detección de idiomas
│   ├── document_converter.py      # Conversión de documentos
│   ├── text_preprocessor.py       # Preprocesamiento de texto
│   │
│   # 🚀 NUEVO: SISTEMA DE PIPELINE AUTOMÁTICO
│   ├── pipeline_manager.py        # Orquestador central del pipeline
│   ├── pipeline_config.py         # Configuración centralizada (470 líneas)
│   │
│   ├── models/                    # Modelos de análisis avanzados
│   │   ├── __init__.py
│   │   ├── topic_modeling.py      # Topic modeling (LDA, NMF, LSA, pLSA)
│   │   ├── bertopic_analyzer.py   # BERTopic
│   │   ├── ngram_analyzer.py      # Análisis de n-gramas
│   │   ├── dimensionality_reduction.py  # PCA, t-SNE, UMAP
│   │   ├── ner_cache.py           # Cache para NER
│   │   └── science_mapping.py     # Mapeo científico
│   │
│   └── utils/                     # Utilidades del sistema
│       ├── __init__.py
│       ├── logger.py              # Sistema de logging
│       ├── local_cache.py         # Cache local
│       ├── progress_tracker.py    # 🆕 Seguimiento de progreso del pipeline
│       └── pipeline_cache.py      # 🆕 Cache inteligente del pipeline
│
├── docs/                           # 📚 DOCUMENTACIÓN
│   ├── arquitectura/
│   │   └── ARQUITECTURA.md        # Este archivo
│   ├── README.md                  # Documentación principal
│   ├── INSTALACION.md             # Guía de instalación
│   ├── GUIA_USO.md               # Guía de uso
│   ├── REFERENCIA_RAPIDA.md      # Referencia rápida
│   └── CONFIGURACION_DRIVE.md    # Configuración de Drive
│
├── scripts/                        # 🔧 Scripts de utilidad
│   ├── ejecutar.bat               # Script ejecución Windows
│   ├── ejecutar.sh                # Script ejecución Unix
│   ├── instalar.bat               # Script instalación Windows
│   └── instalar.sh                # Script instalación Unix
│
├── tail_logs.py                   # 🆕 Utilidad para monitoreo de logs
│
├── tests/                         # 🧪 Suite de pruebas
│   ├── __init__.py
│   ├── conftest.py                # Configuración de pytest
│   ├── test_ner.py
│   ├── test_cache_ner.py
│   ├── test_nltk_optimization.py
│   ├── test_nlp_processor.py
│   ├── test_text_preprocessor.py
│   ├── test_drive_connector.py
│   └── test_factor_analyzer.py
│
├── credentials.json               # Credenciales Google Drive (no en git)
├── token.json                     # Token autenticación (no en git)
├── .gitignore                     # Git ignore
└── venv/                          # Entorno virtual (no en git)
```

---

## Separación de Responsabilidades

### 1. **app.py** - Orquestador Principal
- **Responsabilidad**: Inicializar la aplicación y enrutar páginas
- **Hace**:
  - Configura Streamlit
  - Inicializa session_state y componentes core
  - Importa y renderiza sidebar
  - Enruta a las páginas correspondientes
- **No hace**: Lógica de negocio ni renderizado complejo

### 2. **components/ui/** - Componentes Visuales

#### `styles.py`
- Contiene todos los estilos CSS
- Función única: `apply_custom_styles()`
- Paleta de colores centralizada

#### `layout.py`
- Sidebar con navegación jerárquica
- Función: `render_sidebar()` retorna página seleccionada
- Estructura por fases del análisis

#### `helpers.py`
- Funciones auxiliares UI:
  - `show_section_header()` - Encabezados de sección
  - `get_connector()` - Obtener conector de Drive
  - `get_or_load_cached_results()` - Cargar cache
  - `save_results_to_cache()` - Guardar cache

### 3. **components/pages/** - Páginas de la Aplicación

Cada página es un módulo independiente con:
- Función `render()` que renderiza toda la página
- Importa helpers y estilos según necesite
- **No contiene lógica de negocio** (solo llama a src/)

#### **Páginas Principales:**

**✅ TODAS LAS PÁGINAS COMPLETADAS:**

1. **Dashboard Principal** (`dashboard_principal.py`) 🆕
   - Monitor en tiempo real del pipeline
   - Visualización del progreso de cada etapa
   - Resumen de resultados consolidados
   - Acceso rápido a cada análisis

2. **Inicio** (`inicio.py`)
   - Página de bienvenida

3. **FASE 1: Preparación**
   - Conexión Google Drive
   - Estadísticas de archivos
   - Detección de idiomas

4. **FASE 2: Procesamiento**
   - Conversión PDF→TXT
   - Preprocesamiento de texto

5. **FASE 3: Análisis Básico**
   - Bolsa de Palabras (BoW)
   - Análisis TF-IDF

6. **FASE 4: Análisis Avanzado**
   - Análisis de Factores
   - Consolidación de Factores

7. **FASE 5: Visualización**
   - Visualizaciones generales
   - Nube de palabras

8. **FASE 6: Evaluación**
   - Evaluación de desempeño

#### **Modelos Avanzados** (`components/pages/models/`)

Módulos especializados de NLP:

1. **Named Entity Recognition (NER)**
   - Identifica entidades nombradas (personas, organizaciones, lugares)
   - Cache optimizado

2. **Topic Modeling**
   - LDA (Latent Dirichlet Allocation)
   - NMF (Non-negative Matrix Factorization)
   - LSA (Latent Semantic Analysis)
   - pLSA (Probabilistic LSA)

3. **N-gram Analysis**
   - Extracción de unigramas, bigramas, trigramas
   - Análisis de patrones lingüísticos

4. **BERTopic**
   - Topic modeling con embeddings de BERT
   - Clusters semánticamente coherentes

5. **Classification**
   - Naive Bayes
   - SVM (Support Vector Machines)
   - KNN (K-Nearest Neighbors)

6. **Dimensionality Reduction**
   - PCA (Principal Component Analysis)
   - t-SNE (t-Distributed Stochastic Neighbor Embedding)
   - UMAP (Uniform Manifold Approximation and Projection)

### 4. **src/** - Lógica de Negocio

Módulos que **NO conocen Streamlit**:
- Procesamiento de datos
- Conexión a servicios externos (Drive)
- Algoritmos NLP
- Análisis de factores

**Principio**: Estos módulos son reutilizables en cualquier contexto (CLI, API, etc.)

---

## 🚀 NOVEDAD: Sistema de Pipeline Automático

### **pipeline_manager.py** - Orquestador Central

**Responsabilidades:**
- Ejecuta automáticamente todas las etapas del análisis
- Gestiona el flujo de ejecución completo
- Sistema de caché inteligente (solo procesa lo necesario)
- Manejo robusto de errores y recuperación
- Seguimiento de progreso en tiempo real

**Características principales:**
```python
class PipelineManager:
    def execute_pipeline(files, parent_folder_id):
        """
        Ejecuta pipeline completo:
        1. Detección de idiomas
        2. Conversión PDF→TXT
        3. Preprocesamiento
        4. Bolsa de Palabras
        5. TF-IDF
        6. N-gramas
        7. NER
        8. Topic Modeling
        9. BERTopic
        10. Reducción de Dimensionalidad
        11. Clasificación (si hay etiquetas)
        12. Análisis de Factores
        13. Consolidación
        14. Visualizaciones
        """
```

### **pipeline_config.py** - Configuración Centralizada

**470 líneas de configuración detallada:**

Contiene TODOS los parámetros configurables del pipeline:

1. **Selección de idioma** - Auto-detecta idioma mayoritario
2. **Preprocesamiento** - Stemming, stopwords, normalización
3. **BoW** - N-gramas, max_features, min/max_df
4. **TF-IDF** - Ponderación, normalización
5. **N-gramas** - Unigramas, bigramas, trigramas
6. **Topic Modeling** - LDA, NMF, LSA, pLSA (n_topics, iterations)
7. **BERTopic** - Embedding model, min_topic_size
8. **NER** - Modelo de spaCy, entity types
9. **Reducción de Dimensionalidad** - PCA, t-SNE, UMAP
10. **Clasificación** - Naive Bayes, SVM, KNN
11. **Análisis de Factores** - K-means, clustering
12. **Consolidación** - Pesos por fuente de análisis
13. **Visualizaciones** - Wordclouds, gráficos
14. **Performance** - Métricas, benchmarks
15. **Cache** - Local y Drive
16. **Pipeline** - Timeout por etapa, auto-ejecución

**Ejemplo de configuración:**
```python
class PipelineConfig:
    TOPIC_MODELING = {
        'lda': {
            'n_topics': 10,  # ← Modificar aquí
            'max_iter': 20,
            'random_state': 42
        }
    }

    PIPELINE = {
        'stages': {
            'language_detection': True,
            'txt_conversion': True,
            'preprocessing': True,
            'bow': True,
            'tfidf': True,
            'ngrams': True,
            'ner': True,
            'topic_modeling': True,
            'bertopic': True,
            'dimensionality_reduction': True,
            'classification': False,  # Requiere etiquetado
            'factor_analysis': True,
            'consolidation': True,
            'visualizations': True
        }
    }
```

### **progress_tracker.py** - Seguimiento de Progreso

**Funcionalidades:**
- Tracking de cada etapa del pipeline
- Estados: `pending`, `in_progress`, `completed`, `error`, `skipped`
- Estimación de tiempo restante
- Visualización en tiempo real
- Logs estructurados

### **pipeline_cache.py** - Cache Inteligente

**Características:**
- Cache local + cache en Google Drive
- Invalidación automática si cambia configuración
- Solo procesa archivos nuevos o modificados
- Persistencia de resultados intermedios
- Recuperación ante fallos

---

## Ventajas de la Arquitectura Actual

### ✅ Ventajas Generales

- **Modularidad**: Cada componente tiene una responsabilidad única
- **Mantenibilidad**: Fácil localizar y modificar funcionalidad específica
- **Escalabilidad**: Agregar nuevas páginas es trivial
- **Reutilización**: Componentes UI y lógica son reutilizables
- **Testing**: Fácil hacer pruebas unitarias
- **Colaboración**: Varios desarrolladores pueden trabajar sin conflictos
- **Legibilidad**: Archivos pequeños y específicos

### ✅ Ventajas del Pipeline Automático

- **Automatización completa**: Un solo botón ejecuta todo el análisis
- **Reproducibilidad**: Configuración centralizada garantiza resultados consistentes
- **Eficiencia**: Sistema de caché evita reprocesar datos
- **Robustez**: Manejo de errores y recuperación automática
- **Visibilidad**: Dashboard muestra progreso en tiempo real
- **Flexibilidad**: Habilitar/deshabilitar etapas según necesidad

---

## Flujo de Ejecución del Pipeline

```
┌─────────────────────────────────────────────────────┐
│ 1. Usuario conecta Google Drive                    │
│    └─> Detecta carpeta con PDFs                    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. Dashboard Principal muestra opciones             │
│    ├─> Ejecutar pipeline completo automáticamente  │
│    └─> O navegar manualmente por fases             │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. Pipeline Manager inicia ejecución                │
│    └─> Carga PipelineConfig                        │
│    └─> Inicializa ProgressTracker                  │
│    └─> Crea/carga PipelineCache                    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 4. Ejecución secuencial de etapas                   │
│    ├─> Detección de idiomas                        │
│    ├─> Conversión PDF→TXT                          │
│    ├─> Preprocesamiento                            │
│    ├─> Bolsa de Palabras                           │
│    ├─> TF-IDF                                      │
│    ├─> N-gramas                                    │
│    ├─> NER                                         │
│    ├─> Topic Modeling (LDA, NMF, LSA, pLSA)       │
│    ├─> BERTopic                                    │
│    ├─> Reducción de Dimensionalidad               │
│    ├─> Análisis de Factores                        │
│    ├─> Consolidación                               │
│    └─> Visualizaciones                             │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 5. Cada etapa:                                      │
│    ├─> Verifica si existe en cache                 │
│    ├─> Si existe: carga desde cache                │
│    ├─> Si no existe: ejecuta procesamiento         │
│    ├─> Guarda resultados en cache (local + Drive)  │
│    └─> Actualiza ProgressTracker                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 6. Dashboard muestra resultados finales             │
│    ├─> Resumen ejecutivo                           │
│    ├─> Factores clave identificados                │
│    ├─> Temas descubiertos                          │
│    ├─> Entidades reconocidas                       │
│    ├─> Visualizaciones interactivas                │
│    └─> Métricas de desempeño                       │
└─────────────────────────────────────────────────────┘
```

---

## Cómo Ejecutar

```bash
# Windows
cd scripts
./ejecutar.bat

# Linux/Mac
cd scripts
./ejecutar.sh

# O directamente
streamlit run app.py
```

---

## Cómo Usar el Pipeline Automático

### Opción 1: Ejecución Automática (Recomendado)

1. Conectar a Google Drive
2. Ir al **Dashboard Principal**
3. Clic en "Ejecutar Pipeline Completo"
4. Esperar mientras se procesan todas las etapas
5. Ver resultados consolidados

### Opción 2: Navegación Manual por Fases

1. Conectar a Google Drive
2. Navegar por cada fase manualmente:
   - FASE 1: Preparación
   - FASE 2: Procesamiento
   - FASE 3: Análisis Básico
   - FASE 4: Análisis Avanzado
   - FASE 5: Visualización
   - FASE 6: Evaluación

---

## Cómo Agregar una Nueva Página

1. Crear archivo en `components/pages/nueva_pagina.py`:
```python
import streamlit as st
from components.ui.helpers import show_section_header

def render():
    show_section_header("Título", "Descripción")
    st.write("Contenido...")
```

2. Importar en `components/pages/__init__.py`:
```python
from . import nueva_pagina
```

3. Agregar ruta en `app.py`:
```python
from components.pages import nueva_pagina

def main():
    # ...
    if pagina == "Nueva Página":
        nueva_pagina.render()
```

4. Agregar opción en sidebar (`components/ui/layout.py`)

---

## Cómo Agregar una Nueva Etapa al Pipeline

1. Crear función de procesamiento en `src/`
2. Agregar configuración en `src/pipeline_config.py`:
```python
NEW_STAGE = {
    'param1': valor1,
    'param2': valor2
}

PIPELINE = {
    'stages': {
        'new_stage': True  # Habilitar etapa
    },
    'stage_timeout': {
        'new_stage': 600  # 10 minutos timeout
    }
}
```

3. Agregar etapa en `src/pipeline_manager.py`:
```python
def _initialize_stages(self):
    self.progress_tracker.add_stage(
        "Nueva Etapa",
        "Descripción de la etapa"
    )

def _execute_new_stage(self, data):
    """Ejecuta nueva etapa del pipeline"""
    # Lógica de procesamiento
    return resultados
```

4. Integrar en método `execute_pipeline()`

---

## Cómo Modificar Configuración del Pipeline

Editar `src/pipeline_config.py`:

```python
# Cambiar número de temas en LDA
TOPIC_MODELING = {
    'lda': {
        'n_topics': 15,  # Era 10, ahora 15
    }
}

# Deshabilitar una etapa
PIPELINE = {
    'stages': {
        'bertopic': False,  # Deshabilitar BERTopic
    }
}

# Cambiar timeout
PIPELINE = {
    'stage_timeout': {
        'ner': 3600,  # Aumentar a 1 hora
    }
}
```

**Los cambios se aplican automáticamente en la siguiente ejecución.**

---

## Testing

Suite de pruebas completa en `tests/`:

```bash
# Ejecutar todos los tests
pytest

# Ejecutar test específico
pytest tests/test_nlp_processor.py

# Con cobertura
pytest --cov=src tests/
```

---

## Logging

Sistema de logging estructurado en `src/utils/logger.py`:

```python
from src.utils.logger import get_logger

logger = get_logger(__name__)
logger.info("Mensaje de información")
logger.warning("Advertencia")
logger.error("Error")
```

Monitorear logs en tiempo real:
```bash
python tail_logs.py
```

---

## Estado del Proyecto

### ✅ Completado

- Arquitectura modular implementada
- Todas las páginas migradas y funcionales
- Sistema de pipeline automático
- Configuración centralizada
- Sistema de caché inteligente
- Tracking de progreso
- Dashboard principal
- Modelos avanzados de NLP
- Suite de testing
- Sistema de logging
- Documentación completa

### 🚀 Próximas Mejoras Potenciales

- Exportación de reportes PDF/DOCX
- API REST para acceso programático
- Procesamiento paralelo de documentos
- Integración con más fuentes de datos (Dropbox, OneDrive)
- Dashboard de métricas de desempeño histórico
- Sistema de alertas y notificaciones

---

**Autor**: Sistema de Análisis de Transformación Digital
**Versión**: 4.0 - Pipeline Automático
**Fecha**: Noviembre 2025
**Última Actualización**: 2025-11-26

# 📖 Índice General de Documentación del Proyecto

## 🎯 Análisis de Transformación Digital

Este índice organiza toda la documentación del proyecto para facilitar su navegación.

---

## 📁 Estructura de Documentación

```
docs/
├── INDICE_DOCUMENTACION.md ← Este archivo (índice general)
├── RESUMEN_ARCHIVOS_RESTANTES.md ← Consolidado de 27 archivos
│
└── detalle_archivos/ ← Documentaciones detalladas individuales
    ├── text_preprocessor.py.md
    ├── drive_connector.py.md
    ├── nlp_processor.py.md
    ├── document_converter.py.md
    ├── language_detector.py.md
    ├── factor_analyzer.py.md
    ├── helpers.py.md
    ├── layout.py.md
    └── styles.py.md
```

---

## 📚 Documentaciones Detalladas (9 archivos)

### 🔧 PRIORIDAD 1: Capa de Negocio (src/)

#### 1. [`text_preprocessor.py`](detalle_archivos/text_preprocessor.py.md) ⭐⭐⭐⭐⭐
**Líneas:** 1,039 | **Complejidad:** Muy Alta

**Núcleo del preprocesamiento de texto**
- Limpieza y normalización de texto
- Tokenización, stemming, lematización
- Bolsa de palabras (BoW)
- Matrices TF-IDF (2 métodos)
- Estadísticas y análisis de vocabulario

**Para principiantes:**
- Conceptos: Tokenización, Stopwords, Stemming, Lematización, BoW, TF-IDF
- Flujo completo de preprocesamiento
- Diferencia entre stemming y lematización

#### 2. [`drive_connector.py`](detalle_archivos/drive_connector.py.md) ⭐⭐⭐⭐⭐
**Líneas:** 932 | **Complejidad:** Muy Alta

**Integración con Google Drive**
- Autenticación OAuth2
- Operaciones CRUD en Drive
- Sistema de reintentos automáticos
- Lectura de archivos en memoria (BytesIO)
- Creación de carpetas y archivos (TXT, JSON)

**Para principiantes:**
- Qué es OAuth2
- Tokens y credenciales
- Backoff exponencial
- Lectura en memoria vs descarga

#### 3. [`nlp_processor.py`](detalle_archivos/nlp_processor.py.md) ⭐⭐⭐⭐
**Líneas:** 278 | **Complejidad:** Media

**Procesador NLP simplificado**
- Limpieza y tokenización básica
- Identificación de factores de TD
- Análisis de frecuencias
- Alternativa ligera a text_preprocessor.py

**Para principiantes:**
- Diferencia con text_preprocessor.py
- Factores de transformación digital
- Procesamiento rápido

#### 4. [`document_converter.py`](detalle_archivos/document_converter.py.md) ⭐⭐⭐⭐⭐
**Líneas:** 541 | **Complejidad:** Alta

**Conversión de documentos a texto**
- Soporte PDF, DOCX, TXT
- 3 métodos de extracción PDF (fallback)
- Conversión desde archivo o BytesIO
- Estadísticas de conversión

**Para principiantes:**
- Por qué 3 métodos para PDF
- Diferencia entre archivo en disco y BytesIO
- Validación de texto extraído

#### 5. [`language_detector.py`](detalle_archivos/language_detector.py.md) ⭐⭐⭐⭐
**Líneas:** 373 | **Complejidad:** Media

**Detección automática de idiomas**
- 2 métodos: langdetect, langid
- Soporte para 30+ idiomas
- Cálculo de confianza
- Estadísticas y filtrado por idioma

**Para principiantes:**
- Cómo funciona la detección
- Qué es "confianza"
- Códigos ISO de idiomas

#### 6. [`factor_analyzer.py`](detalle_archivos/factor_analyzer.py.md) ⭐⭐⭐⭐⭐
**Líneas:** 340 | **Complejidad:** Alta

**Análisis de factores de transformación digital**
- 8 categorías de factores
- Identificación por palabras clave
- K-Means clustering
- LDA (Latent Dirichlet Allocation)
- Matriz de co-ocurrencia

**Para principiantes:**
- Factores de transformación digital
- Qué es clustering
- Qué es LDA
- Matriz de co-ocurrencia

---

### 🎨 PRIORIDAD 2: Componentes UI (components/ui/)

#### 7. [`helpers.py`](detalle_archivos/helpers.py.md) ⭐⭐⭐⭐⭐
**Líneas:** 441 | **Complejidad:** Media

**Sistema de utilidades y caché**
- Gestión de caché en Google Drive
- Validación avanzada (cantidad + IDs)
- Funciones auxiliares para UI
- Obtención de conector desde session_state

**Para principiantes:**
- Qué es caché
- Por qué validar el caché
- session_state en Streamlit

#### 8. [`layout.py`](detalle_archivos/layout.py.md) ⭐⭐⭐⭐⭐
**Líneas:** 55 | **Complejidad:** Baja

**Sistema de navegación principal**
- Renderiza sidebar
- Menú de navegación
- Indicador de conexión
- Retorna página seleccionada

**Para principiantes:**
- Qué es un sidebar
- Flujo de navegación
- Integración con app.py

#### 9. [`styles.py`](detalle_archivos/styles.py.md) ⭐⭐⭐⭐
**Líneas:** 270 | **Complejidad:** Media

**Sistema de estilos CSS**
- Tema oscuro completo
- Paleta de colores profesional
- Estilos para todos los componentes
- Animaciones y transiciones

**Para principiantes:**
- Qué es CSS
- Variables CSS
- Selectores de Streamlit
- Tema oscuro vs claro

---

## 📄 Resumen Consolidado (27 archivos)

### [`RESUMEN_ARCHIVOS_RESTANTES.md`](RESUMEN_ARCHIVOS_RESTANTES.md)

Este documento consolida la información de **27 archivos** organizados en 4 categorías:

#### PRIORIDAD 3: Páginas Principales (10 archivos)
- `inicio.py` - Página de bienvenida
- `conexion_drive.py` - Autenticación OAuth2
- `estadisticas_archivos.py` - Estadísticas de Drive
- `deteccion_idiomas.py` - Detección de idiomas
- `conversion_txt.py` - Conversión PDF/DOCX a TXT
- `bolsa_palabras.py` - Bag of Words
- `analisis_tfidf.py` - Análisis TF-IDF
- `analisis_factores.py` - Análisis de factores
- `visualizaciones.py` - Visualizaciones avanzadas
- `nube_palabras.py` - Word clouds

#### PRIORIDAD 4: Modelos Avanzados (9 archivos)
- `ner_analyzer.py` - Named Entity Recognition
- `ner_cache.py` - Caché de NER
- `topic_modeling.py` - Modelado de temas LDA
- `bertopic_analyzer.py` - BERTopic
- `text_classifier.py` - Clasificación de textos
- `ngram_analyzer.py` - Análisis de N-gramas
- `dimensionality_reduction.py` - PCA, t-SNE, UMAP
- `factor_identification.py` - Análisis factorial
- `science_mapping.py` - Mapeo científico

#### PRIORIDAD 5: Páginas de Modelos (6 archivos)
- `ner_analysis.py` - UI para NER
- `topic_modeling_page.py` - UI para LDA
- `ngram_analysis_page.py` - UI para N-gramas
- `bertopic_page.py` - UI para BERTopic
- `classification_page.py` - UI para clasificación
- `dimensionality_reduction_page.py` - UI para reducción

#### PRIORIDAD 6: Utilidades (2 archivos)
- `logger.py` - Sistema de logging
- `local_cache.py` - Caché local en disco

---

## 🗺️ Mapa Conceptual del Proyecto

```
┌─────────────────────────────────────────────────────────┐
│                    APP.PY (Entrada)                      │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼────┐          ┌──────▼──────┐
    │ ESTILOS │          │  NAVEGACIÓN │
    │ (CSS)   │          │  (Sidebar)  │
    └─────────┘          └──────┬──────┘
                                │
                    ┌───────────┴───────────┐
                    │  PÁGINAS PRINCIPALES  │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   ┌────▼────┐          ┌──────▼──────┐         ┌─────▼─────┐
   │ CAPA DE │          │   MODELOS   │         │ UTILIDADES│
   │ NEGOCIO │◄─────────┤  AVANZADOS  │◄────────┤  (Logger) │
   └────┬────┘          └─────────────┘         └───────────┘
        │
   ┌────▼────┐
   │  DRIVE  │
   │ (Datos) │
   └─────────┘
```

---

## 🎓 Guía de Lectura Recomendada

### Para Principiantes:

**1. Entender la estructura:**
- Leer: [`layout.py`](detalle_archivos/layout.py.md) - Navegación
- Leer: [`styles.py`](detalle_archivos/styles.py.md) - Apariencia

**2. Comprender el flujo de datos:**
- Leer: [`drive_connector.py`](detalle_archivos/drive_connector.py.md) - Persistencia
- Leer: [`helpers.py`](detalle_archivos/helpers.py.md) - Caché

**3. Aprender procesamiento de texto:**
- Leer: [`document_converter.py`](detalle_archivos/document_converter.py.md) - Conversión
- Leer: [`text_preprocessor.py`](detalle_archivos/text_preprocessor.py.md) - Preprocesamiento

**4. Explorar análisis:**
- Leer: [`language_detector.py`](detalle_archivos/language_detector.py.md) - Idiomas
- Leer: [`factor_analyzer.py`](detalle_archivos/factor_analyzer.py.md) - Factores

**5. Modelos avanzados:**
- Leer: [`RESUMEN_ARCHIVOS_RESTANTES.md`](RESUMEN_ARCHIVOS_RESTANTES.md) - Sección PRIORIDAD 4

### Para Desarrolladores:

**Modificar UI:**
- `styles.py` - Cambiar colores, tamaños, animaciones
- `layout.py` - Agregar/quitar páginas del menú
- `helpers.py` - Agregar funciones de utilidad

**Agregar funcionalidades:**
- `text_preprocessor.py` - Agregar métodos de procesamiento
- `factor_analyzer.py` - Agregar categorías de factores
- `drive_connector.py` - Agregar operaciones de Drive

**Crear nuevas páginas:**
1. Crear archivo en `components/pages/`
2. Agregar opción en `layout.py`
3. Importar en `app.py`

---

## 📊 Estadísticas del Proyecto

### Documentación:
- **Archivos documentados en detalle:** 9
- **Archivos resumidos:** 27
- **Total de archivos Python:** 36
- **Líneas de código estimadas:** ~14,000-19,000

### Complejidad:
- **Muy Alta (⭐⭐⭐⭐⭐):** 9 archivos
- **Alta (⭐⭐⭐⭐):** 12 archivos
- **Media (⭐⭐⭐):** 10 archivos
- **Baja (⭐):** 5 archivos

### Categorías:
- **Capa de Negocio (src/):** 15 archivos
- **Componentes UI (components/ui/):** 3 archivos
- **Páginas (components/pages/):** 16 archivos
- **Utilidades (src/utils/):** 2 archivos

---

## 🔗 Enlaces Útiles

### Documentación Externa:
- [Streamlit Docs](https://docs.streamlit.io/)
- [Google Drive API](https://developers.google.com/drive/api)
- [NLTK Documentation](https://www.nltk.org/)
- [scikit-learn](https://scikit-learn.org/)
- [spaCy](https://spacy.io/)

### Archivos del Proyecto:
- [app.py.md](app.py.md) - Documentación del archivo principal
- [config.py.md](config.py.md) - Configuración
- [preprocesamiento.py.md](preprocesamiento.py.md) - Página de preprocesamiento

---

## 📝 Notas

### Convenciones:
- ⭐ = Nivel de complejidad (1-5 estrellas)
- ✅ = Documentado en detalle
- 📝 = Resumido en documento consolidado

### Actualizaciones:
- **Versión:** 1.0
- **Fecha:** 2025-11-05
- **Autor:** Claude Code Documentation System
- **Estado:** Completo

---

**Para navegación rápida:**
- Usa Ctrl+F para buscar archivos específicos
- Los enlaces funcionan en editores Markdown
- Cada documentación tiene su propio índice interno

---

© 2025 - Proyecto Análisis de Transformación Digital

# 📚 Resumen Consolidado: Archivos Restantes del Proyecto

## 📋 Índice

Este documento consolida la documentación de los **27 archivos restantes** del proyecto de Análisis de Transformación Digital, organizados por categorías funcionales.

---

## 🎯 PRIORIDAD 3: Páginas Principales (10 archivos)

### 1. `components/pages/inicio.py`
**Propósito:** Página de bienvenida de la aplicación
- **Función principal:** `render()` - Muestra página de inicio
- **Contenido:**
  - Título y descripción del proyecto
  - Instrucciones de uso
  - Flujo de trabajo recomendado
  - Links a documentación
- **Complejidad:** Baja ⭐
- **Líneas estimadas:** ~100-150

### 2. `components/pages/conexion_drive.py`
**Propósito:** Página de autenticación con Google Drive
- **Función principal:** `render()` - Interfaz de conexión
- **Funcionalidades:**
  - Botón de autenticación OAuth2
  - Mostrar estado de conexión
  - Configurar carpeta padre
  - Guardar estado en `session_state`
- **Usa:** `GoogleDriveConnector` de `src/drive_connector.py`
- **Complejidad:** Media ⭐⭐⭐
- **Líneas estimadas:** ~200-300

### 3. `components/pages/estadisticas_archivos.py`
**Propósito:** Análisis estadístico de archivos en Drive
- **Función principal:** `render()` - Muestra estadísticas
- **Funcionalidades:**
  - Listar archivos en carpeta de Drive
  - Generar estadísticas (cantidad, tamaño, tipo)
  - Mostrar tablas y gráficos
  - Filtrar por extensión
- **Usa:** `GoogleDriveConnector.list_files_in_folder()`
- **Componentes:**
  - DataFrames de pandas
  - Gráficos (plotly o altair)
- **Complejidad:** Media ⭐⭐⭐
- **Líneas estimadas:** ~250-350

### 4. `components/pages/deteccion_idiomas.py`
**Propósito:** Detectar idioma de documentos
- **Función principal:** `render()` - Interfaz de detección
- **Flujo:**
  1. Verificar caché (`get_or_load_cached_results()`)
  2. Si no hay caché: leer archivos y detectar idioma
  3. Guardar resultados en Drive
  4. Mostrar estadísticas y distribución
- **Usa:**
  - `LanguageDetector` de `src/language_detector.py`
  - `helpers.get_or_load_cached_results()`
- **Salida:** Archivo `language_results.json` en carpeta `02_Language_Detection/`
- **Complejidad:** Media ⭐⭐⭐
- **Líneas estimadas:** ~300-400

### 5. `components/pages/conversion_txt.py`
**Propósito:** Convertir PDFs/DOCX a TXT
- **Función principal:** `render()` - Interfaz de conversión
- **Flujo:**
  1. Listar archivos PDF/DOCX
  2. Leer archivo desde Drive (BytesIO)
  3. Convertir a texto con `DocumentConverter`
  4. Guardar TXT en carpeta `03_TXT_Files/`
  5. Mostrar progreso y resultados
- **Usa:**
  - `DocumentConverter` de `src/document_converter.py`
  - `GoogleDriveConnector.read_file_content()`
  - `GoogleDriveConnector.create_text_file()`
- **Complejidad:** Alta ⭐⭐⭐⭐
- **Líneas estimadas:** ~400-500

### 6. `components/pages/bolsa_palabras.py`
**Propósito:** Crear bolsa de palabras (Bag of Words)
- **Función principal:** `render()` - Interfaz BoW
- **Flujo:**
  1. Verificar caché
  2. Leer textos preprocesados
  3. Crear matriz BoW con `create_bag_of_words()`
  4. Mostrar vocabulario, frecuencias
  5. Visualizar top términos
- **Usa:**
  - `TextPreprocessor.create_bag_of_words()`
  - `TextPreprocessor.get_top_terms_global()`
- **Visualizaciones:**
  - Tabla de frecuencias
  - Gráfico de barras de top términos
- **Complejidad:** Media-Alta ⭐⭐⭐⭐
- **Líneas estimadas:** ~350-450

### 7. `components/pages/analisis_tfidf.py`
**Propósito:** Análisis TF-IDF de documentos
- **Función principal:** `render()` - Interfaz TF-IDF
- **Funcionalidades:**
  - Crear matriz TF-IDF
  - Mostrar términos más importantes
  - Heatmap de TF-IDF
  - Comparación entre documentos
- **Usa:**
  - `TextPreprocessor.create_tfidf_from_bow()` (método Colab)
  - `TextPreprocessor.create_tfidf_matrix()` (método sklearn)
  - `TextPreprocessor.get_top_tfidf_terms()`
  - `TextPreprocessor.get_tfidf_heatmap_data()`
- **Visualizaciones:**
  - Heatmap interactivo
  - Tabla de top términos por documento
- **Complejidad:** Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~450-600

### 8. `components/pages/analisis_factores.py`
**Propósito:** Identificar factores de transformación digital
- **Función principal:** `render()` - Interfaz de análisis de factores
- **Funcionalidades:**
  - Analizar documentos con `AnalizadorFactores`
  - Identificar 8 categorías de factores
  - Mostrar menciones por categoría
  - Matriz de co-ocurrencia
  - Clustering de documentos
  - Extracción de temas (LDA)
- **Usa:**
  - `AnalizadorFactores` de `src/factor_analyzer.py`
- **Visualizaciones:**
  - Gráficos de barras por factor
  - Matriz de co-ocurrencia (heatmap)
  - Dendrograma de clustering
- **Complejidad:** Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~500-700

### 9. `components/pages/visualizaciones.py`
**Propósito:** Visualizaciones avanzadas de datos
- **Función principal:** `render()` - Dashboard de visualizaciones
- **Funcionalidades:**
  - Gráficos de distribución de términos
  - Análisis temporal (si aplica)
  - Comparaciones entre categorías
  - Visualizaciones interactivas
- **Usa:**
  - Plotly / Altair para gráficos
  - Datos de análisis previos (BoW, TF-IDF, Factores)
- **Complejidad:** Media-Alta ⭐⭐⭐⭐
- **Líneas estimadas:** ~400-600

### 10. `components/pages/nube_palabras.py`
**Propósito:** Generar nubes de palabras
- **Función principal:** `render()` - Interfaz de wordclouds
- **Funcionalidades:**
  - Generar nube de palabras global
  - Nubes por documento
  - Personalizar colores, forma
  - Filtrar por frecuencia mínima
- **Usa:**
  - `wordcloud` (librería externa)
  - Datos de bolsa de palabras
- **Visualizaciones:**
  - Nube de palabras interactiva
  - Opciones de configuración (máscara, colores)
- **Complejidad:** Media ⭐⭐⭐
- **Líneas estimadas:** ~250-350

---

## 🤖 PRIORIDAD 4: Modelos Avanzados (9 archivos)

### 11. `src/models/ner_analyzer.py`
**Propósito:** Análisis de Entidades Nombradas (NER - Named Entity Recognition)
- **Clase principal:** `NERAnalyzer`
- **Funcionalidades:**
  - Identificar personas, organizaciones, lugares
  - Usar spaCy para NER
  - Categorizar entidades
  - Contar frecuencias de entidades
- **Modelo:** spaCy (es_core_news_sm / en_core_web_sm)
- **Complejidad:** Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~300-450

### 12. `src/models/ner_cache.py`
**Propósito:** Sistema de caché para NER
- **Funcionalidades:**
  - Cachear resultados de NER (procesamiento lento)
  - Persistir en disco o Drive
  - Validar caché
- **Complejidad:** Media ⭐⭐⭐
- **Líneas estimadas:** ~150-250

### 13. `src/models/topic_modeling.py`
**Propósito:** Modelado de temas con LDA
- **Clase principal:** `TopicModeler`
- **Funcionalidades:**
  - Latent Dirichlet Allocation (LDA)
  - Identificar temas latentes
  - Asignar documentos a temas
  - Calcular coherencia de temas
- **Librería:** gensim o sklearn
- **Complejidad:** Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~400-600

### 14. `src/models/bertopic_analyzer.py`
**Propósito:** Análisis de temas con BERTopic
- **Clase principal:** `BERTopicAnalyzer`
- **Funcionalidades:**
  - Modelado de temas con BERT embeddings
  - Más preciso que LDA tradicional
  - Visualizaciones de temas
  - Reducción de dimensionalidad
- **Librería:** bertopic
- **Complejidad:** Muy Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~450-700

### 15. `src/models/text_classifier.py`
**Propósito:** Clasificación de textos
- **Clase principal:** `TextClassifier`
- **Funcionalidades:**
  - Entrenar clasificadores
  - Clasificar documentos en categorías
  - Validación cruzada
  - Métricas de evaluación
- **Modelos:** Naive Bayes, SVM, Random Forest
- **Complejidad:** Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~400-600

### 16. `src/models/ngram_analyzer.py`
**Propósito:** Análisis de N-gramas
- **Clase principal:** `NGramAnalyzer`
- **Funcionalidades:**
  - Extraer bigramas, trigramas, n-gramas
  - Calcular frecuencias
  - Identificar colocaciones
  - PMI (Pointwise Mutual Information)
- **Complejidad:** Media-Alta ⭐⭐⭐⭐
- **Líneas estimadas:** ~300-450

### 17. `src/models/dimensionality_reduction.py`
**Propósito:** Reducción de dimensionalidad
- **Clase principal:** `DimensionalityReducer`
- **Funcionalidades:**
  - PCA (Principal Component Analysis)
  - t-SNE
  - UMAP
  - Visualizar en 2D/3D
- **Librería:** sklearn, umap-learn
- **Complejidad:** Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~350-500

### 18. `src/models/factor_identification.py`
**Propósito:** Identificación avanzada de factores
- **Funcionalidades:**
  - Análisis factorial (PCA, FA)
  - Identificar factores latentes
  - Rotación de factores (Varimax)
  - Cargas factoriales
- **Complejidad:** Muy Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~400-600

### 19. `src/models/science_mapping.py`
**Propósito:** Mapeo científico y bibliometría
- **Funcionalidades:**
  - Co-citación
  - Acoplamiento bibliográfico
  - Análisis de redes
  - Métricas bibliométricas
- **Complejidad:** Muy Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~500-800

---

## 📄 PRIORIDAD 5: Páginas de Modelos Avanzados (6 archivos)

### 20. `components/pages/models/ner_analysis.py`
**Propósito:** Interfaz para análisis NER
- **Función principal:** `render()`
- **Interfaz para:** `NERAnalyzer`
- **Funcionalidades:**
  - Seleccionar documentos
  - Ejecutar NER
  - Mostrar entidades identificadas
  - Visualizar por categoría
- **Complejidad:** Alta ⭐⭐⭐⭐
- **Líneas estimadas:** ~400-550

### 21. `components/pages/models/topic_modeling_page.py`
**Propósito:** Interfaz para modelado de temas LDA
- **Función principal:** `render()`
- **Interfaz para:** `TopicModeler`
- **Funcionalidades:**
  - Configurar número de temas
  - Entrenar modelo LDA
  - Visualizar temas
  - Asignar documentos a temas
- **Complejidad:** Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~450-650

### 22. `components/pages/models/ngram_analysis_page.py`
**Propósito:** Interfaz para análisis de N-gramas
- **Función principal:** `render()`
- **Interfaz para:** `NGramAnalyzer`
- **Funcionalidades:**
  - Seleccionar N (2, 3, 4, etc.)
  - Extraer n-gramas
  - Mostrar frecuencias
  - Visualizar colocaciones
- **Complejidad:** Media-Alta ⭐⭐⭐⭐
- **Líneas estimadas:** ~350-500

### 23. `components/pages/models/bertopic_page.py`
**Propósito:** Interfaz para BERTopic
- **Función principal:** `render()`
- **Interfaz para:** `BERTopicAnalyzer`
- **Funcionalidades:**
  - Entrenar BERTopic
  - Visualizar temas en 2D
  - Explorar palabras por tema
  - Documentos por tema
- **Complejidad:** Muy Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~500-750

### 24. `components/pages/models/classification_page.py`
**Propósito:** Interfaz para clasificación de textos
- **Función principal:** `render()`
- **Interfaz para:** `TextClassifier`
- **Funcionalidades:**
  - Cargar datos de entrenamiento
  - Entrenar clasificador
  - Evaluar modelo
  - Clasificar nuevos documentos
- **Complejidad:** Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~450-650

### 25. `components/pages/models/dimensionality_reduction_page.py`
**Propósito:** Interfaz para reducción de dimensionalidad
- **Función principal:** `render()`
- **Interfaz para:** `DimensionalityReducer`
- **Funcionalidades:**
  - Seleccionar método (PCA, t-SNE, UMAP)
  - Configurar parámetros
  - Visualizar en 2D/3D
  - Explorar clusters
- **Complejidad:** Alta ⭐⭐⭐⭐⭐
- **Líneas estimadas:** ~450-650

---

## 🛠️ PRIORIDAD 6: Utilidades (2 archivos)

### 26. `src/utils/logger.py`
**Propósito:** Sistema de logging centralizado
- **Función principal:** `get_logger(name)` - Retorna logger configurado
- **Funcionalidades:**
  - Configurar formato de logs
  - Niveles: DEBUG, INFO, WARNING, ERROR
  - Guardar logs en archivo
  - Console output con colores
- **Uso:** Importado por TODOS los módulos del proyecto
- **Ejemplo:**
  ```python
  from src.utils.logger import get_logger
  logger = get_logger(__name__)
  logger.info("Proceso iniciado")
  logger.error("Error al procesar archivo", exc_info=True)
  ```
- **Complejidad:** Baja-Media ⭐⭐
- **Líneas estimadas:** ~100-200

### 27. `src/utils/local_cache.py`
**Propósito:** Sistema de caché local (en disco)
- **Funcionalidades:**
  - Cachear resultados en archivos locales
  - Serialización (pickle, JSON)
  - Validación de caché por timestamp
  - Limpieza de caché antiguo
- **Ventaja vs Drive cache:**
  - Más rápido (acceso local)
  - No requiere conexión a internet
- **Desventaja:**
  - No portable entre máquinas
- **Complejidad:** Media ⭐⭐⭐
- **Líneas estimadas:** ~200-300

---

## 📊 Resumen Estadístico

### Archivos documentados en detalle (9):
1. ✅ `text_preprocessor.py` (1039 líneas)
2. ✅ `drive_connector.py` (932 líneas)
3. ✅ `nlp_processor.py` (278 líneas)
4. ✅ `document_converter.py` (541 líneas)
5. ✅ `language_detector.py` (373 líneas)
6. ✅ `factor_analyzer.py` (340 líneas)
7. ✅ `helpers.py` (441 líneas)
8. ✅ `layout.py` (55 líneas)
9. ✅ `styles.py` (270 líneas)

**Total documentado en detalle:** 4,269 líneas

### Archivos resumidos (27):
- Páginas principales: 10 archivos (~3,500-5,000 líneas estimadas)
- Modelos avanzados: 9 archivos (~3,500-5,500 líneas estimadas)
- Páginas de modelos: 6 archivos (~2,500-3,800 líneas estimadas)
- Utilidades: 2 archivos (~300-500 líneas estimadas)

**Total resumido:** ~9,800-14,800 líneas estimadas

### TOTAL DEL PROYECTO:
**~14,000-19,000 líneas de código** distribuidas en **36 archivos Python**

---

## 🔗 Mapa de Dependencias Global

```
app.py (Punto de entrada)
  ↓
├─ components/ui/styles.py (estilos)
├─ components/ui/layout.py (navegación)
│   └─ Retorna página seleccionada
│
├─ PÁGINAS (components/pages/)
│   ├─ inicio.py
│   ├─ conexion_drive.py
│   │   └─ src/drive_connector.py
│   ├─ estadisticas_archivos.py
│   │   └─ src/drive_connector.py
│   ├─ deteccion_idiomas.py
│   │   ├─ src/language_detector.py
│   │   ├─ src/drive_connector.py
│   │   └─ components/ui/helpers.py (caché)
│   ├─ conversion_txt.py
│   │   ├─ src/document_converter.py
│   │   └─ src/drive_connector.py
│   ├─ preprocesamiento.py (NO listada, pero existe)
│   │   ├─ src/text_preprocessor.py
│   │   └─ components/ui/helpers.py
│   ├─ bolsa_palabras.py
│   │   ├─ src/text_preprocessor.py
│   │   └─ components/ui/helpers.py
│   ├─ analisis_tfidf.py
│   │   ├─ src/text_preprocessor.py
│   │   └─ components/ui/helpers.py
│   ├─ analisis_factores.py
│   │   ├─ src/factor_analyzer.py
│   │   └─ components/ui/helpers.py
│   ├─ visualizaciones.py
│   └─ nube_palabras.py
│
├─ MODELOS AVANZADOS (components/pages/models/)
│   ├─ ner_analysis.py
│   │   └─ src/models/ner_analyzer.py
│   ├─ topic_modeling_page.py
│   │   └─ src/models/topic_modeling.py
│   ├─ ngram_analysis_page.py
│   │   └─ src/models/ngram_analyzer.py
│   ├─ bertopic_page.py
│   │   └─ src/models/bertopic_analyzer.py
│   ├─ classification_page.py
│   │   └─ src/models/text_classifier.py
│   └─ dimensionality_reduction_page.py
│       └─ src/models/dimensionality_reduction.py
│
└─ UTILIDADES (src/utils/)
    ├─ logger.py (usado por TODO)
    └─ local_cache.py
```

---

## 💡 Conceptos Técnicos Clave

### 1. **Arquitectura de 3 Capas**
```
PRESENTACIÓN (components/pages/)
  ↓ usa
NEGOCIO (src/)
  ↓ usa
DATOS (Google Drive + Caché)
```

### 2. **Patrón de Caché**
Todas las páginas que procesan datos usan el mismo patrón:
```python
# 1. Verificar caché
results, folder_id = get_or_load_cached_results(...)

# 2. Si no hay caché, procesar
if not results:
    # Procesar datos
    results = process_data()
    # Guardar en caché
    save_results_to_cache(folder_id, filename, results)

# 3. Mostrar resultados
display_results(results)
```

### 3. **Flujo de Procesamiento**
```
PDFs/DOCX en Drive
  → Conversión a TXT (document_converter.py)
  → Detección de idioma (language_detector.py)
  → Preprocesamiento (text_preprocessor.py)
  → Análisis (BoW, TF-IDF, Factores)
  → Modelos avanzados (NER, Topics, BERTopic)
  → Visualizaciones
```

### 4. **Estado de Sesión**
Streamlit usa `session_state` para mantener datos entre páginas:
```python
st.session_state.drive_connector
st.session_state.authenticated
st.session_state.parent_folder_id
st.session_state.pdf_files
st.session_state.preprocessed_texts
# etc...
```

---

## 📖 Recursos de Aprendizaje

Para entender mejor cada componente:

1. **Streamlit:** https://docs.streamlit.io/
2. **Google Drive API:** https://developers.google.com/drive/api
3. **NLTK:** https://www.nltk.org/
4. **scikit-learn:** https://scikit-learn.org/
5. **spaCy (NER):** https://spacy.io/
6. **BERTopic:** https://maartengr.github.io/BERTopic/
7. **Gensim (LDA):** https://radimrehurek.com/gensim/

---

**Documento creado:** 2025-11-05
**Archivos totales:** 36 Python files
**Archivos documentados en detalle:** 9
**Archivos resumidos:** 27
**Líneas de código estimadas:** ~14,000-19,000

---

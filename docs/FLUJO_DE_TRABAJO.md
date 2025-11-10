# 🔄 Flujo de Trabajo Completo - Análisis de Transformación Digital

Guía detallada del flujo de trabajo completo del sistema, organizado en 7 fases secuenciales.

---

## 📋 Tabla de Contenidos

1. [Visión General](#-visión-general)
2. [FASE 1: Preparación](#-fase-1-preparación)
3. [FASE 2: Representación Vectorial](#-fase-2-representación-vectorial)
4. [FASE 3: Análisis Lingüístico](#-fase-3-análisis-lingüístico)
5. [FASE 4: Modelado de Temas](#-fase-4-modelado-de-temas)
6. [FASE 5: Dimensionalidad y Clasificación](#-fase-5-dimensionalidad-y-clasificación)
7. [FASE 6: Análisis Integrado](#-fase-6-análisis-integrado)
8. [FASE 7: Visualización](#-fase-7-visualización)
9. [Sistema de Persistencia](#-sistema-de-persistencia)
10. [Buenas Prácticas](#-buenas-prácticas)

---

## 🎯 Visión General

El sistema de análisis de transformación digital sigue un flujo de trabajo secuencial de **7 fases**, donde cada fase construye sobre los resultados de las fases anteriores. Este diseño modular permite:

- ✅ **Progresión lógica**: De preparación básica a análisis avanzado
- ✅ **Reutilización de resultados**: Cada fase guarda sus resultados para fases posteriores
- ✅ **Flexibilidad**: Puedes ejecutar solo las fases que necesites
- ✅ **Persistencia**: Todos los resultados se guardan en Google Drive automáticamente
- ✅ **Caché inteligente**: Ejecuciones posteriores son ~100x más rápidas

### Diagrama de Flujo General

```
┌─────────────────────────────────────────────────────────────────┐
│                      FASE 1: PREPARACIÓN                        │
│  Conexión Drive → Detección Idiomas → Conversión → Preproc.    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                FASE 2: REPRESENTACIÓN VECTORIAL                 │
│              BoW → TF-IDF → N-gramas                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                FASE 3: ANÁLISIS LINGÜÍSTICO                     │
│                    Named Entity Recognition                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                   FASE 4: MODELADO DE TEMAS                     │
│                  Topic Modeling → BERTopic                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│           FASE 5: DIMENSIONALIDAD Y CLASIFICACIÓN               │
│            Reducción Dimensionalidad → Clasificación            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                  FASE 6: ANÁLISIS INTEGRADO                     │
│            Análisis de Factores (integra todo)                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    FASE 7: VISUALIZACIÓN                        │
│              Visualizaciones y Nubes de Palabras                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📥 FASE 1: PREPARACIÓN

**Objetivo**: Preparar los datos para el análisis, desde la conexión a Drive hasta el preprocesamiento de textos.

### 1.1. Conexión a Google Drive

**Ubicación**: `01. Conexión a Google Drive`

**Propósito**:
- Autenticar con OAuth2
- Establecer conexión con carpeta del proyecto
- Crear estructura de carpetas de persistencia

**Proceso**:
```
1. Usuario carga credentials.json
2. Sistema inicia flujo OAuth2
3. Usuario autoriza en navegador
4. Sistema guarda token.json para futuras sesiones
5. Sistema crea 14 carpetas de persistencia en Drive:
   - 01_PDF_Files
   - 02_Language_Detection
   - 03_TXT_Converted
   - 04_TXT_Preprocessed
   - 05_BagOfWords_Results
   - 06_TFIDF_Results
   - 07_Ngram_Analysis
   - 08_NER_Analysis
   - 09_Topic_Modeling
   - 10_BERTopic_Results
   - 11_Dimensionality_Reduction
   - 12_Classification_Results
   - 13_Factor_Analysis
   - 14_Visualizations
```

**Salidas**:
- `token.json` (local)
- Estructura de carpetas en Google Drive
- Estado de conexión en `st.session_state`

**Archivos relacionados**:
- `src/drive_connector.py:181-263` - Método `authenticate()`
- `components/pages/conexion_drive.py` - UI de conexión

---

### 1.2. Detección de Idiomas

**Ubicación**: `02. Detección de Idiomas`

**Propósito**:
- Identificar idioma de cada documento
- Filtrar documentos por idioma (ej: solo inglés)
- Preparar corpus homogéneo para análisis

**Proceso**:
```
1. Lee archivos desde Drive (01_PDF_Files o TXT convertidos)
2. Para cada archivo:
   a. Extrae muestra de texto
   b. Aplica langdetect + langid
   c. Calcula confianza de detección
   d. Asigna idioma
3. Muestra estadísticas por idioma
4. Usuario selecciona idiomas a incluir
5. Filtra y guarda en 02_Language_Detection
```

**Visualizaciones con interpretación**:
- Gráfico de barras de distribución de idiomas
- Tabla de documentos por idioma con confianza

**Salidas**:
- Archivos filtrados en `02_Language_Detection/`
- Metadatos de detección en JSON
- Lista de archivos en `st.session_state.detected_files`

**Archivos relacionados**:
- `src/language_detector.py` - Lógica de detección
- `components/pages/deteccion_idiomas.py` - UI

---

### 1.3. Conversión a TXT

**Ubicación**: `03. Conversión de Archivos a TXT`

**Propósito**:
- Convertir PDFs y DOCX a texto plano
- Extraer texto de manera robusta con fallbacks
- Validar calidad de extracción

**Proceso**:
```
1. Lee archivos desde 02_Language_Detection
2. Para cada archivo:
   a. Detecta formato (PDF, DOCX, TXT)
   b. Aplica extractor apropiado:
      - PDF: PyPDF2 → pdfplumber → pytesseract (fallback)
      - DOCX: python-docx
      - TXT: lectura directa
   c. Valida que texto no esté vacío
   d. Calcula estadísticas (palabras, caracteres)
3. Guarda TXT en 03_TXT_Converted
```

**Visualizaciones con interpretación**:
- Tabla de conversiones exitosas/fallidas
- Estadísticas de palabras extraídas

**Salidas**:
- Archivos `.txt` en `03_TXT_Converted/`
- `conversion_stats.json` con metadatos
- Textos cargados en `st.session_state.converted_texts`

**Archivos relacionados**:
- `src/document_converter.py` - Conversión con 3 métodos PDF
- `components/pages/conversion_txt.py` - UI

---

### 1.4. Preprocesamiento

**Ubicación**: `04. Preprocesamiento de Textos`

**Propósito**:
- Limpiar y normalizar textos
- Tokenizar, eliminar stopwords
- Aplicar stemming/lematización
- Preparar corpus para vectorización

**Proceso**:
```
1. Carga textos desde 03_TXT_Converted
2. Para cada texto:
   a. Limpieza:
      - Lowercase
      - Eliminar caracteres especiales
      - Eliminar números (opcional)
      - Eliminar URLs, emails
   b. Tokenización (NLTK)
   c. Eliminar stopwords (inglés/español)
   d. Stemming (PorterStemmer) o Lematización (WordNetLemmatizer)
   e. Construir vocabulario
3. Calcula estadísticas de vocabulario
4. Guarda en LocalCache + Drive
```

**Visualizaciones con interpretación**:
- Gráfico de distribución de longitud de documentos
- Top 20 palabras más frecuentes
- Estadísticas de vocabulario

**Salidas**:
- Textos preprocesados en `04_TXT_Preprocessed/`
- `preprocessing_results.json` con config y stats
- `cache/preprocessing_cache/` para reutilización
- Textos en `st.session_state.preprocessed_texts`

**Caché**:
- Primera ejecución: 2-5 minutos
- Con caché: 2-5 segundos (⚡ ~60x más rápido)

**Archivos relacionados**:
- `src/text_preprocessor.py:85-240` - Métodos de preprocesamiento
- `components/pages/preprocesamiento.py` - UI
- `src/utils/local_cache.py` - Sistema de caché

---

## 📊 FASE 2: REPRESENTACIÓN VECTORIAL

**Objetivo**: Transformar textos preprocesados en representaciones numéricas (vectores) para análisis cuantitativo.

### 2.1. Bag of Words (BoW)

**Ubicación**: `05. Bolsa de Palabras`

**Propósito**:
- Crear matriz documento-término con frecuencias
- Representación básica pero interpretable
- Base para topic modeling

**Proceso**:
```
1. Carga textos preprocesados desde FASE 1.4
2. Configura CountVectorizer:
   - max_features: 1000 (configurable)
   - min_df: 2 (palabra en al menos 2 docs)
   - max_df: 0.95 (filtrar palabras muy comunes)
3. Genera matriz documento-término (sparse)
4. Guarda en LocalCache + Drive + CSV
```

**Visualizaciones con interpretación**:
- Top 20 términos más frecuentes (barras horizontales)
- Tabla de matriz (primeras filas)

**Salidas**:
- `bow_matrix.csv` en `05_BagOfWords_Results/`
- `bow_results.json` con configuración y vocabulario
- `cache/bow_cache/bow_results.pkl`
- Matriz en `st.session_state.bow_results`

**Caché**:
- Primera ejecución: 1-3 minutos
- Con caché: 1-2 segundos (⚡ ~90x más rápido)

**Archivos relacionados**:
- `src/text_preprocessor.py:517-600` - Método `calculate_bow()`
- `components/pages/bolsa_palabras.py` - UI

---

### 2.2. TF-IDF

**Ubicación**: `06. Análisis TF-IDF`

**Propósito**:
- Crear matriz TF-IDF (peso por importancia)
- Identificar términos distintivos de cada documento
- Base para clasificación y similitud

**Proceso**:
```
1. Carga textos preprocesados desde FASE 1.4
2. Configura TfidfVectorizer:
   - max_features: 1000
   - min_df: 2
   - max_df: 0.95
   - use_idf: True
   - sublinear_tf: False (configurable)
3. Genera 3 matrices:
   a. TF-IDF matrix (principal)
   b. TF matrix (frecuencias normalizadas)
   c. IDF values (importancia de términos)
4. Guarda 3 CSV en Drive + LocalCache
```

**Visualizaciones con interpretación**:
- Top 20 términos por TF-IDF score (barras)
- Heatmap de términos relevantes por documento
- Tabla de IDF values

**Salidas**:
- `tfidf_matrix.csv` en `06_TFIDF_Results/`
- `tf_matrix.csv`
- `idf_values.csv`
- `tfidf_results.json` con metadatos
- `cache/tfidf_cache/tfidf_results.pkl`

**Caché**:
- Primera ejecución: 1-3 minutos
- Con caché: 1-2 segundos (⚡ ~90x más rápido)

**Archivos relacionados**:
- `src/text_preprocessor.py:604-730` - Método `calculate_tfidf()`
- `components/pages/analisis_tfidf.py` - UI

---

### 2.3. Análisis de N-gramas

**Ubicación**: `07. Análisis de N-gramas`

**Propósito**:
- Identificar bigramas y trigramas frecuentes
- Descubrir frases y colocaciones importantes
- Análisis de contexto multi-palabra

**Proceso**:
```
1. Carga textos preprocesados
2. Configura NGramAnalyzer:
   - max_n: 3 (uni, bi, trigramas)
   - top_n: 20 (top N-gramas)
   - min_frequency: 2
3. Calcula frecuencias de n-gramas
4. Calcula PMI (Pointwise Mutual Information) para bigramas
5. Identifica colocaciones con alta PMI
6. Guarda resultados en Drive + LocalCache
```

**Visualizaciones con interpretación**:
- Top bigramas (barras horizontales)
- Top trigramas (barras horizontales)
- Tabla de colocaciones con PMI scores

**Salidas**:
- `ngram_results.json` en `07_Ngram_Analysis/`
- `cache/ngram_cache/ngram_results.pkl`
- Resultados en `st.session_state.ngram_results`

**Caché**:
- Primera ejecución: 3-5 minutos
- Con caché: 2-3 segundos (⚡ ~100x más rápido)

**Archivos relacionados**:
- `src/models/ngram_analyzer.py` - Lógica de n-gramas
- `components/pages/models/ngram_analysis_page.py` - UI

---

## 🔤 FASE 3: ANÁLISIS LINGÜÍSTICO

**Objetivo**: Extraer información lingüística estructurada de los textos.

### 3.1. Named Entity Recognition (NER)

**Ubicación**: `08. Análisis NER`

**Propósito**:
- Identificar entidades nombradas (países, organizaciones, personas, fechas)
- Extraer información estructurada del corpus
- Análisis de actores y contexto

**Proceso**:
```
1. Carga modelo spaCy (en_core_web_sm o lg)
2. Para cada documento:
   a. Procesa con pipeline spaCy
   b. Extrae entidades por categoría:
      - PERSON (personas)
      - ORG (organizaciones)
      - GPE (países, ciudades)
      - DATE (fechas)
      - MONEY, PERCENT, etc.
   c. Calcula frecuencias por entidad
3. Agrega estadísticas del corpus completo
4. Identifica top entidades por categoría
5. Guarda en Drive + LocalCache
```

**Visualizaciones con interpretación**:
- Distribución de entidades por categoría (barras)
- Top 10 entidades por tipo (tablas)
- Timeline de entidades DATE (si aplica)
- Heatmap de co-ocurrencia de entidades

**Salidas**:
- `ner_analysis_results.json` en `08_NER_Analysis/`
- `cache/ner_analysis_cache/` con resultados completos
- Resultados en `st.session_state.ner_results`

**Caché**:
- Primera ejecución: 5-15 minutos (depende del corpus)
- Con caché: 2-5 segundos (⚡ ~180x más rápido)

**Archivos relacionados**:
- `src/models/ner_analyzer.py` - Procesamiento NER con spaCy
- `components/pages/models/ner_analysis.py` - UI con visualizaciones

---

## 🎯 FASE 4: MODELADO DE TEMAS

**Objetivo**: Descubrir temas latentes en el corpus de manera no supervisada.

### 4.1. Topic Modeling (LDA, NMF, LSA)

**Ubicación**: `09. Modelado de Temas (LDA/NMF/LSA)`

**Propósito**:
- Descubrir temas ocultos en documentos
- Comparar 3 algoritmos complementarios
- Asignar documentos a temas

**Proceso**:
```
1. Carga textos preprocesados
2. Configura parámetros:
   - n_topics: 10 (configurable)
   - max_features: 1000
   - min_df: 2, max_df: 0.95
3. Ejecuta 3 modelos en paralelo:

   a. LDA (Latent Dirichlet Allocation):
      - Tipo: Probabilístico
      - Vectorización: CountVectorizer (BoW)
      - Métricas: Perplejidad, Log-likelihood

   b. NMF (Non-negative Matrix Factorization):
      - Tipo: Algebraico
      - Vectorización: TfidfVectorizer
      - Métricas: Reconstruction Error

   c. LSA (Latent Semantic Analysis):
      - Tipo: SVD
      - Vectorización: TfidfVectorizer
      - Métricas: Explained Variance
4. Para cada modelo:
   - Extrae top 10 palabras por tema
   - Calcula matriz documento-tema
   - Identifica tema dominante por documento
5. Compara modelos (Topic Overlap)
6. Exporta 10 archivos (3 CSV por modelo + JSON)
```

**Visualizaciones con interpretación** (por modelo):
- Distribución de temas por documento (barras apiladas)
- Top palabras por tema (barras horizontales por tema)
- Distribución general de temas (histograma)
- Tabla comparativa de modelos con métricas

**Salidas en `09_Topic_Modeling/`**:

LDA:
- `lda_matrix.csv` - Matriz documento-tema
- `lda_topic_words.csv` - Top palabras por tema
- `lda_results.json` - Metadatos y config

NMF:
- `nmf_matrix.csv`
- `nmf_topic_words.csv`
- `nmf_results.json`

LSA:
- `lsa_matrix.csv`
- `lsa_topic_words.csv`
- `lsa_results.json`

Comparación:
- `comparison_results.json` - Métricas y overlap

**Caché**:
- Primera ejecución: 2-5 minutos (3 modelos)
- Con caché: 2-5 segundos (⚡ ~100x más rápido)

**Archivos relacionados**:
- `src/models/topic_modeling.py:45-461` - Clase TopicModelingAnalyzer
- `components/pages/models/topic_modeling_page.py` - UI con 6 pestañas

---

### 4.2. BERTopic

**Ubicación**: `10. BERTopic`

**Propósito**:
- Modelado de temas con transformers (BERT)
- Temas más coherentes semánticamente
- Visualizaciones interactivas avanzadas

**Proceso**:
```
1. Carga textos preprocesados
2. Configura BERTopic:
   - Embedding model: sentence-transformers (all-MiniLM-L6-v2)
   - nr_topics: auto o fijo
   - min_topic_size: 5
3. Entrena modelo:
   a. Genera embeddings con BERT
   b. Reduce dimensionalidad (UMAP)
   c. Clustering (HDBSCAN)
   d. Extracción de palabras (c-TF-IDF)
4. Extrae información:
   - Top palabras por tema
   - Documentos por tema
   - Topic probabilities
5. Genera visualizaciones t-SNE 2D y 3D
6. Guarda modelo completo (pickle) + resultados
```

**Visualizaciones con interpretación**:
- ✅ Proyección t-SNE 2D (scatter interactivo por tema)
- ✅ Proyección t-SNE 3D (scatter 3D rotable)
- ✅ Top palabras por tema (barras horizontales)
- ✅ Distribución de documentos por tema (histograma)
- ✅ Proporción de documentos por tema (pie chart)

**Salidas en `10_BERTopic_Results/`**:
- `bertopic_model.pkl` - Modelo completo entrenado
- `bertopic_results.json` - Metadatos y configuración
- `bertopic_topics.csv` - Información de temas
- `bertopic_document_info.csv` - Asignaciones documento-tema

**Caché**:
- Primera ejecución: 5-10 minutos (embedding con BERT)
- Con caché: 3-5 segundos (⚡ ~120x más rápido)

**Archivos relacionados**:
- `src/models/bertopic_analyzer.py` - Wrapper de BERTopic
- `components/pages/models/bertopic/bertopic_page_ui.py` - UI con interpretaciones

---

## 📉 FASE 5: DIMENSIONALIDAD Y CLASIFICACIÓN

**Objetivo**: Reducir dimensionalidad para visualización y clasificar documentos.

### 5.1. Reducción de Dimensionalidad

**Ubicación**: `11. Reducción de Dimensionalidad`

**Propósito**:
- Proyectar alta dimensionalidad a 2D/3D para visualización
- Comparar PCA, t-SNE, UMAP
- Preservar estructura de datos

**Proceso**:
```
1. Carga matrices TF-IDF/BoW desde FASE 2
2. Aplica 3 métodos de reducción:

   a. PCA (Principal Component Analysis):
      - Tipo: Lineal
      - n_components: 2
      - Calcula varianza explicada
      - Rápido, determinista

   b. t-SNE (t-Distributed Stochastic Neighbor Embedding):
      - Tipo: No-lineal (local)
      - perplexity: 30
      - Preserva estructura local (clusters)
      - No determinista

   c. UMAP (Uniform Manifold Approximation and Projection):
      - Tipo: No-lineal (global + local)
      - n_neighbors: 15
      - Balance entre estructura global y local
      - Más rápido que t-SNE
3. Para cada método:
   - Proyecta a 2D
   - Calcula métricas de calidad
   - Colorea por temas (si están disponibles)
4. Compara métodos
5. Guarda proyecciones en Drive
```

**Visualizaciones con interpretación**:
- ✅ Varianza explicada acumulada PCA (curva de codo)
- ✅ Proyección PCA 2D (scatter con colores por tema)
- ✅ Proyección t-SNE 2D (scatter con clusters)
- ✅ Proyección UMAP 2D (scatter balanceado)
- ✅ Tabla comparativa de métodos con métricas

**Salidas en `11_Dimensionality_Reduction/`**:
- `pca_projection.csv` - Coordenadas 2D (PCA)
- `tsne_projection.csv` - Coordenadas 2D (t-SNE)
- `umap_projection.csv` - Coordenadas 2D (UMAP)
- `dimensionality_reduction_results.json` - Metadatos y config

**Caché**:
- Primera ejecución: 2-5 minutos
- Con caché: 1 segundo (⚡ ~200x más rápido)

**Archivos relacionados**:
- `src/models/dimensionality_reduction.py` - Implementación de 3 métodos
- `components/pages/models/dimensionality_reduction_page.py` - UI con interpretaciones

---

### 5.2. Clasificación de Textos

**Ubicación**: `12. Clasificación de Textos`

**Propósito**:
- Clasificar documentos en categorías supervisadas
- Comparar múltiples algoritmos de ML
- Predecir categorías de nuevos documentos

**Proceso**:
```
1. Carga textos preprocesados y etiquetas manuales
2. Configura clasificador:
   - Vectorización: TF-IDF o BoW
   - max_features: 1000
   - test_size: 0.3 (70% train, 30% test)
3. Entrena 3 modelos:

   a. Logistic Regression:
      - C: 1.0
      - Rápido, baseline sólido

   b. Random Forest:
      - n_estimators: 100
      - Maneja no-linealidad

   c. SVM (Support Vector Machine):
      - kernel: linear
      - C: 1.0
      - Robusto con alta dimensionalidad
4. Para cada modelo:
   - Entrena con datos de entrenamiento
   - Evalúa con datos de prueba
   - Calcula métricas:
     * Accuracy
     * Precision (weighted)
     * Recall (weighted)
     * F1-Score (weighted)
     * Matriz de confusión
     * Cross-validation (5-fold)
5. Compara modelos
6. Permite predicción de documentos no etiquetados
7. Guarda modelos (pickle) + resultados
```

**Visualizaciones con interpretación**:
- ✅ Comparación de modelos (barras horizontales con métricas)
- ✅ Matriz de confusión (heatmap interactivo)
- ✅ Distribución de confianza (histograma de probabilidades)
- ✅ Scores de cross-validation (box plot)
- ✅ **NUEVO**: Distribución de predicciones (barras de conteo por categoría)

**Salidas en `12_Classification_Results/`**:
- `Logistic Regression_model.pkl` - Modelo entrenado
- `Random Forest_model.pkl`
- `SVM_model.pkl`
- `vectorizer.pkl` - Vectorizador TF-IDF/BoW
- `classification_results.json` - Métricas y configuración
- `predictions.csv` - Predicciones de documentos no etiquetados

**Caché**:
- Primera ejecución: 3-7 minutos (entrena 3 modelos)
- Con caché: 2-3 segundos (⚡ ~120x más rápido)

**Archivos relacionados**:
- `src/models/text_classifier.py:26-327` - Clase TextClassifier
- `components/pages/models/classification/classification_page_ui.py` - UI con interpretaciones

---

## 🔬 FASE 6: ANÁLISIS INTEGRADO

**Objetivo**: Integrar todos los análisis anteriores para identificar factores clave de transformación digital.

### 6.1. Análisis Automático de Factores

**Ubicación**: `13. Análisis Automático de Factores Relevantes`

**Propósito**:
- Consolidar resultados de todas las fases
- Identificar factores de transformación digital
- Generar análisis cualitativo formal
- Crear matriz de co-ocurrencia de factores

**Proceso**:
```
1. Carga resultados de fases anteriores:
   - Preprocesamiento (FASE 1.4)
   - TF-IDF (FASE 2.2)
   - NER (FASE 3.1)
   - Topic Modeling (FASE 4.1)
   - Clasificación (FASE 5.2) - opcional

2. Identifica 8 categorías de factores:
   a. Tecnología e Infraestructura
   b. Capacitación y Desarrollo
   c. Gestión y Liderazgo
   d. Procesos y Metodologías
   e. Cultura Organizacional
   f. Innovación y Cambio
   g. Comunicación y Colaboración
   h. Resultados e Impacto

3. Para cada documento:
   a. Extrae términos TF-IDF relevantes
   b. Identifica entidades NER
   c. Asigna tema dominante
   d. Mapea términos a categorías de factores
   e. Calcula score de relevancia por factor

4. Análisis del corpus:
   - Top factores globales
   - Distribución de factores por documento
   - Matriz de co-ocurrencia (qué factores aparecen juntos)
   - Red de conocimiento (NetworkX)

5. Genera análisis cualitativo:
   - Matriz temática (temas × factores)
   - Dimensiones teóricas
   - Triangulación de datos
   - Interpretaciones guiadas

6. Guarda en Drive + LocalCache
```

**Visualizaciones**:
- Distribución de factores por categoría (barras)
- Top 20 factores globales (barras horizontales)
- Heatmap de matriz de co-ocurrencia
- Red de conocimiento (NetworkX graph)
- Matriz temática (temas × dimensiones teóricas)
- Tabla de análisis cualitativo

**Salidas en `13_Factor_Analysis/`**:
- `factor_analysis_results.json` - Resultados completos
- `factor_matrix.csv` - Matriz documento × factores
- `cooccurrence_matrix.csv` - Matriz de co-ocurrencia
- `qualitative_analysis.json` - Análisis cualitativo formal
- `network_data.json` - Datos para visualización de red

**Caché**:
- Primera ejecución: 10-20 minutos (procesa todo)
- Con caché: 3-5 segundos (⚡ ~200x más rápido)

**Archivos relacionados**:
- `src/models/factor_identification.py:24-445` - Clase FactorIdentification
- `components/pages/consolidacion_factores/consolidacion_factores.py` - Lógica de consolidación
- `components/pages/consolidacion_factores/consolidacion_factores_ui.py` - UI
- `components/pages/analisis_factores.py` - UI legacy (factores básicos)

---

## 📊 FASE 7: VISUALIZACIÓN

**Objetivo**: Generar visualizaciones finales y nubes de palabras para presentación.

### 7.1. Visualizaciones y Nubes de Palabras

**Ubicación**: `14. Visualizaciones y Nubes de Palabras`

**Propósito**:
- Crear visualizaciones finales para presentaciones
- Generar nubes de palabras por tema/factor
- Exportar gráficos en alta resolución

**Proceso**:
```
1. Carga resultados de fases anteriores
2. Genera visualizaciones avanzadas:
   a. Nubes de palabras:
      - Por tema (Topic Modeling)
      - Por factor (Análisis de Factores)
      - Por categoría NER
      - Global del corpus

   b. Gráficos de resumen:
      - Timeline de publicaciones
      - Mapa de calor de términos × documentos
      - Dendrograma de clustering jerárquico
      - Gráfico de red de co-ocurrencia

   c. Dashboards interactivos:
      - Comparación multi-dimensional
      - Explorador de documentos
      - Filtros dinámicos

3. Permite exportar en múltiples formatos:
   - PNG (alta resolución)
   - HTML interactivo (Plotly)
   - SVG (vectorial)

4. Guarda visualizaciones en Drive
```

**Visualizaciones**:
- Nubes de palabras personalizables (WordCloud)
- Gráficos de resumen del análisis completo
- Dashboards interactivos con Plotly
- Exportaciones en alta resolución para tesis

**Salidas en `14_Visualizations/`**:
- `wordcloud_global.png` - Nube de palabras general
- `wordcloud_by_topic_*.png` - Nubes por tema
- `wordcloud_by_factor_*.png` - Nubes por factor
- `dashboard.html` - Dashboard interactivo
- `visualizations_metadata.json` - Configuraciones de visualizaciones

**Archivos relacionados**:
- `components/pages/visualizaciones.py` - Visualizaciones avanzadas
- `components/pages/nube_palabras.py` - Generación de wordclouds

---

## 💾 Sistema de Persistencia

### Estructura de Carpetas en Google Drive

El sistema crea automáticamente 14 carpetas en Google Drive:

```
Carpeta del Proyecto/
├── 01_PDF_Files/                    # PDFs originales subidos
├── 02_Language_Detection/           # PDFs filtrados por idioma
├── 03_TXT_Converted/                # Textos extraídos de PDFs/DOCX
├── 04_TXT_Preprocessed/             # Textos preprocesados (limpios)
├── 05_BagOfWords_Results/           # Matriz BoW + metadatos
├── 06_TFIDF_Results/                # Matrices TF-IDF (3 archivos)
├── 07_Ngram_Analysis/               # Resultados de n-gramas
├── 08_NER_Analysis/                 # Entidades nombradas
├── 09_Topic_Modeling/               # LDA/NMF/LSA (10 archivos)
├── 10_BERTopic_Results/             # Modelo BERTopic + resultados
├── 11_Dimensionality_Reduction/     # Proyecciones PCA/t-SNE/UMAP
├── 12_Classification_Results/       # Modelos ML + predicciones
├── 13_Factor_Analysis/              # Factores + análisis cualitativo
└── 14_Visualizations/               # Gráficos y nubes de palabras
```

### Sistema de Caché Local

El sistema mantiene caché local en `cache/` para cada módulo:

```
cache/
├── preprocessing_cache/             # Textos preprocesados
├── bow_cache/                       # Matriz BoW
├── tfidf_cache/                     # Matriz TF-IDF
├── ngram_cache/                     # N-gramas
├── ner_analysis_cache/              # Resultados NER
├── topic_modeling_cache/            # LDA/NMF/LSA
├── bertopic_cache/                  # BERTopic
├── dimensionality_cache/            # Proyecciones
├── classification_cache/            # Modelos ML
└── factor_analysis_cache/           # Factores identificados
```

**Ventajas del caché**:
- ⚡ Primera ejecución: Procesa y guarda (minutos)
- ⚡ Siguientes ejecuciones: Carga instantánea (segundos)
- ⚡ Aceleración promedio: ~100x más rápido
- ⚡ Validación automática de configuración

---

## ✅ Buenas Prácticas

### Orden de Ejecución Recomendado

```
1. FASE 1.1 → Conexión a Drive (una vez)
2. FASE 1.2 → Detección de idiomas (filtrar corpus)
3. FASE 1.3 → Conversión a TXT (extraer textos)
4. FASE 1.4 → Preprocesamiento (OBLIGATORIO para todo lo demás)

Después del preprocesamiento, puedes ejecutar en cualquier orden:

5. FASE 2.1 → BoW (rápido, base para topic modeling)
6. FASE 2.2 → TF-IDF (necesario para clasificación y reducción)
7. FASE 2.3 → N-gramas (opcional, independiente)

8. FASE 3.1 → NER (independiente, lento sin caché)

9. FASE 4.1 → Topic Modeling (requiere preprocesamiento)
10. FASE 4.2 → BERTopic (independiente, más lento)

11. FASE 5.1 → Reducción Dimensionalidad (requiere TF-IDF/BoW)
12. FASE 5.2 → Clasificación (requiere TF-IDF/BoW + etiquetas)

13. FASE 6.1 → Análisis de Factores (integra todo, ejecutar al final)

14. FASE 7.1 → Visualizaciones (últimas, para presentación)
```

### Gestión de Caché

**¿Cuándo se invalida el caché?**
- Cambio en configuración (ej: max_features, n_topics)
- Cambio en corpus de documentos
- Cambio en parámetros del modelo

**¿Cómo forzar recálculo?**
- Opción "Forzar re-procesamiento" en cada módulo
- Borrar carpeta `cache/` manualmente
- Cambiar configuración intencionalmente

**¿Cómo optimizar rendimiento?**
1. Primera sesión: Ejecuta todo en orden, deja que guarde caché
2. Siguientes sesiones: Todo carga en ~1-2 minutos total
3. Si cambias configuración, solo se recalcula ese módulo

### Interpretación de Gráficos

Todos los gráficos importantes ahora incluyen interpretaciones guiadas con:

- **Tipo de visualización**: Qué tipo de gráfico es
- **Interpretación**: Qué muestra el gráfico y por qué importa
- **Cómo leer**: Guía de lectura del gráfico
- **Qué buscar**: Puntos clave para el análisis de tesis

**Ejemplo de uso**:
```
📊 Interpretación: Proyección t-SNE en 2D
- Tipo: Scatter Plot 2D
- Interpretación: t-SNE proyecta alta dimensionalidad a 2D preservando
  estructura local. Clusters cercanos indican documentos similares.
- Qué buscar:
  1. Clusters bien definidos: Grupos compactos indican temas coherentes
  2. Outliers: Documentos alejados pueden ser únicos o errores
  3. Estructura: ¿Los temas se separan bien o se superponen?
```

### Resolución de Problemas Comunes

**Problema**: "No hay textos preprocesados"
- **Solución**: Ejecuta FASE 1.4 (Preprocesamiento) primero

**Problema**: "Caché inválido, recalculando..."
- **Causa**: Cambiaste configuración
- **Solución**: Normal, espera a que recalcule (solo esta vez)

**Problema**: "Error en conexión a Drive"
- **Solución**: Verifica `token.json` y vuelve a autenticar en FASE 1.1

**Problema**: "Modelo spaCy no encontrado"
- **Solución**: La primera vez descarga automáticamente, reinicia app después

**Problema**: "Análisis muy lento"
- **Primera vez**: Normal (procesa y guarda caché)
- **Siguientes veces**: Si sigue lento, verifica que caché se creó en `cache/`

---

## 📚 Recursos Adicionales

### Documentación por Módulo

- [Instalación](instalacion/INICIO_RAPIDO.md) - Inicio rápido
- [Topic Modeling](implementaciones/TOPIC_MODELING_COMPLETO.md) - Guía completa LDA/NMF/LSA
- [Clasificación](implementaciones/CLASIFICACION_TEXTOS.md) - Guía de clasificación
- [Reducción Dimensionalidad](implementaciones/REDUCCION_DIMENSIONALIDAD.md) - PCA/t-SNE/UMAP
- [Sistema de Caché](cache/SISTEMA_CACHE_COMPLETO.md) - Funcionamiento del caché
- [Arquitectura](arquitectura/ARQUITECTURA.md) - Diseño del sistema

### Archivos Clave

- `README.md` - Descripción general del proyecto
- `CHANGELOG.md` - Historial de cambios detallado
- `README_TECNICO.md` - Manual técnico completo
- `requirements.txt` - Dependencias del proyecto

---

**Última actualización**: 2025-11-09
**Versión del documento**: 1.0
**Versión del sistema**: 3.5.0

# 🔄 Fase 3: Backend - Servicios y Casos de Uso - EN PROGRESO

**Fecha**: 2025-12-04

## ✅ Servicios Completados (5/9)

### 1. ✅ LanguageDetectorService (260 lineas)
**Ubicacion**: `backend/apps/documents/services/language_detector.py`

**Funcionalidades**:
- ✅ `detect_from_text()` - Detectar idioma desde texto plano con confidence
- ✅ `detect_from_pdf()` - Detectar idioma desde PDF (usando pdfminer)
- ✅ `detect_from_file()` - Auto-detecta PDF o TXT
- ✅ `get_all_probabilities()` - Lista de probabilidades para todos los idiomas
- ✅ `detect_batch()` - Procesamiento en lote
- ✅ `is_supported_language()` - Validar idiomas soportados
- ✅ `_clean_text()` - Limpieza de texto (URLs, emails, numeros)

**Tecnologias**:
- `langdetect` - Deteccion de 55+ idiomas
- `pdfminer.six` - Extraccion de texto desde PDF

**Idiomas soportados**: Spanish, English, Portuguese, French, German, Italian, Catalan, Galician, Basque

**Ejemplo de uso**:
```python
from apps.documents.services.language_detector import LanguageDetectorService

detector = LanguageDetectorService()
result = detector.detect_from_text("Este es un texto en espanol")
# {'language': 'es', 'confidence': 0.9999}
```

---

### 2. ✅ DocumentConverterService (380 lineas)
**Ubicacion**: `backend/apps/documents/services/document_converter.py`

**Funcionalidades**:
- ✅ `convert_pdf_to_text()` - Convertir PDF a texto con multiples fallbacks
- ✅ `_try_pdfplumber()` - Estrategia 1 (mejor para tablas y layouts complejos)
- ✅ `_try_pdfminer()` - Estrategia 2 (balance velocidad/precision)
- ✅ `_try_pypdf2()` - Estrategia 3 (rapido, fallback final)
- ✅ `convert_batch()` - Conversion en lote
- ✅ `validate_pdf()` - Validar PDF sin extraer texto
- ✅ `get_pdf_metadata()` - Extraer metadata (titulo, autor, etc.)

**Tecnologias**:
- `pdfplumber` - Mejor para tablas
- `pdfminer.six` - Uso general
- `PyPDF2` - Rapido y simple

**Estrategia de fallback**: pdfplumber → pdfminer → PyPDF2

**Ejemplo de uso**:
```python
from apps.documents.services.document_converter import DocumentConverterService

converter = DocumentConverterService()
result = converter.convert_pdf_to_text("/path/to/document.pdf")
# {
#   'text': 'Contenido extraido...',
#   'method': 'pdfplumber',
#   'success': True,
#   'page_count': 10,
#   'char_count': 5000
# }
```

---

### 3. ✅ TextPreprocessorService (340 lineas)
**Ubicacion**: `backend/apps/documents/services/text_preprocessor.py`

**Funcionalidades**:
- ✅ `preprocess()` - Preprocesamiento completo con opciones configurables
- ✅ `tokenize_words()` - Tokenizacion de palabras
- ✅ `tokenize_sentences()` - Tokenizacion de oraciones
- ✅ `remove_stopwords()` - Eliminacion de stopwords (200+ para Spanish)
- ✅ `apply_stemming()` - Stemming con SnowballStemmer
- ✅ `get_word_frequency()` - Calculo de frecuencias
- ✅ `get_vocabulary()` - Vocabulario unico
- ✅ `preprocess_batch()` - Procesamiento en lote
- ✅ `get_statistics()` - Estadisticas de texto

**Tecnologias**:
- `NLTK` - Tokenizacion, stopwords, stemming
- `SnowballStemmer` - Stemming multilingue

**Stopwords**: 200+ palabras para Spanish (incluye stopwords academicas)

**Opciones de preprocesamiento**:
- Lowercase
- Remove stopwords
- Remove punctuation
- Remove numbers
- Apply stemming
- Min/max word length

**Ejemplo de uso**:
```python
from apps.documents.services.text_preprocessor import TextPreprocessorService

preprocessor = TextPreprocessorService('spanish')
result = preprocessor.preprocess(
    "Este es un texto de ejemplo con palabras comunes.",
    remove_stopwords=True,
    remove_punctuation=True
)
# {
#   'preprocessed_text': 'texto ejemplo palabras comunes',
#   'tokens': ['texto', 'ejemplo', 'palabras', 'comunes'],
#   'token_count': 4,
#   'sentence_count': 1
# }
```

---

### 4. ✅ BowService (280 lineas)
**Ubicacion**: `backend/apps/analysis/services/bow_service.py`

**Funcionalidades**:
- ✅ `fit()` - Ajustar modelo BoW
- ✅ `transform()` - Transformar documentos a matriz BoW
- ✅ `fit_transform()` - Ajustar y transformar en un paso
- ✅ `get_feature_names()` - Obtener vocabulario
- ✅ `get_top_terms_per_document()` - Top N terminos por documento
- ✅ `get_global_term_frequency()` - Frecuencia global de terminos
- ✅ `get_document_frequency()` - Frecuencia por documento
- ✅ `get_vocabulary_dict()` - Vocabulario como diccionario

**Tecnologias**:
- `scikit-learn CountVectorizer` - Vectorizacion BoW
- `scipy.sparse` - Matrices sparse eficientes

**Parametros configurables**:
- `max_features`: 5000 (tamano vocabulario maximo)
- `min_df`: 2 (minimo documentos con el termino)
- `max_df`: 0.85 (maximo % documentos con el termino)
- `ngram_range`: (1, 1) - unigrams

**Ejemplo de uso**:
```python
from apps.analysis.services.bow_service import BowService

bow_service = BowService(max_features=1000)
documents = ["texto uno", "texto dos", "texto tres"]

# Ajustar y transformar
result = bow_service.fit_transform(documents)
# {
#   'success': True,
#   'matrix': <sparse matrix>,
#   'shape': (3, 4),
#   'sparsity': 0.25
# }

# Top terminos globales
top_terms = bow_service.get_global_term_frequency(result['matrix'], top_n=10)
# [('texto', 3), ('uno', 1), ('dos', 1), ('tres', 1)]
```

---

### 5. ✅ TfidfService (360 lineas)
**Ubicacion**: `backend/apps/analysis/services/tfidf_service.py`

**Funcionalidades**:
- ✅ `fit()` - Ajustar modelo TF-IDF
- ✅ `transform()` - Transformar documentos a matriz TF-IDF
- ✅ `fit_transform()` - Ajustar y transformar en un paso
- ✅ `get_feature_names()` - Obtener vocabulario
- ✅ `get_idf_scores()` - Scores IDF para todos los terminos
- ✅ `get_top_terms_per_document()` - Top N terminos por documento
- ✅ `get_global_tfidf_scores()` - Scores TF-IDF globales (mean, sum, max)
- ✅ `get_document_similarity()` - Similitud coseno entre documentos
- ✅ `get_all_similarities()` - Matriz de similitud pairwise
- ✅ `get_vocabulary_dict()` - Vocabulario como diccionario
- ✅ `get_dense_matrix()` - Convertir sparse a dense (warning)

**Tecnologias**:
- `scikit-learn TfidfVectorizer` - Vectorizacion TF-IDF
- `scipy.sparse` - Matrices sparse eficientes
- `sklearn.metrics.pairwise.cosine_similarity` - Similitud coseno

**Parametros configurables**:
- `max_features`: 5000
- `min_df`: 2
- `max_df`: 0.85
- `ngram_range`: (1, 1)
- `norm`: 'l2' (normalizacion L2)
- `use_idf`: True (habilitar IDF)
- `sublinear_tf`: False (escala logaritmica)

**Ejemplo de uso**:
```python
from apps.analysis.services.tfidf_service import TfidfService

tfidf_service = TfidfService(max_features=1000)
documents = ["texto importante", "texto relevante", "otro documento"]

# Ajustar y transformar
result = tfidf_service.fit_transform(documents)

# Top terminos por documento
top_terms = tfidf_service.get_top_terms_per_document(result['matrix'], top_n=5)
# [
#   {'document_index': 0, 'terms': [('importante', 0.7071), ('texto', 0.7071)]},
#   {'document_index': 1, 'terms': [('relevante', 0.7071), ('texto', 0.7071)]},
#   ...
# ]

# Similitud entre documentos
sim = tfidf_service.get_document_similarity(result['matrix'], 0, 1)
# 0.5000 (50% similar)
```

---

## 🔄 Servicios Pendientes (4/9)

### 6. ⏳ TopicModelingService (PENDIENTE)
**Ubicacion**: `backend/apps/analysis/services/topic_modeling_service.py`

**Funcionalidades a implementar**:
- [ ] LDA (Latent Dirichlet Allocation)
- [ ] NMF (Non-negative Matrix Factorization)
- [ ] LSA (Latent Semantic Analysis)
- [ ] pLSA (Probabilistic LSA)
- [ ] Calculo de coherencia
- [ ] Visualizaciones de temas
- [ ] Comparacion de modelos

**Tecnologias**:
- `sklearn.decomposition.LatentDirichletAllocation`
- `sklearn.decomposition.NMF`
- `sklearn.decomposition.TruncatedSVD`
- `gensim` - Para pLSA y coherencia

---

### 7. ⏳ FactorAnalyzerService (PENDIENTE)
**Ubicacion**: `backend/apps/analysis/services/factor_analyzer_service.py`

**Funcionalidades a implementar**:
- [ ] Busqueda de keywords en documentos
- [ ] Conteo de menciones por factor
- [ ] Calculo de relevancia normalizada
- [ ] Analisis por categoria (8 categorias)
- [ ] Consolidacion de resultados
- [ ] Visualizaciones de factores

**Integracion**:
- Usar los 16 factores precargados desde fixtures
- Buscar keywords en texto preprocesado
- Normalizar scores por longitud de documento

---

### 8. ⏳ DriveGateway (PENDIENTE)
**Ubicacion**: `backend/apps/infrastructure/storage/drive_gateway.py`

**Funcionalidades a implementar**:
- [ ] OAuth2 autenticacion Google Drive
- [ ] Listar archivos desde carpeta
- [ ] Descargar archivos (PDF, TXT)
- [ ] Subir archivos (pickle, JSON)
- [ ] Gestionar estructura de carpetas (14 carpetas)
- [ ] Metadatos de archivos

**Tecnologias**:
- `google-api-python-client`
- `google-auth-httplib2`
- `google-auth-oauthlib`

---

### 9. ⏳ RedisCacheService + TripleLayerCacheService (PENDIENTE)
**Ubicacion**: `backend/apps/infrastructure/cache/`

**Funcionalidades a implementar**:
- [ ] Conexion Redis
- [ ] Cache GET/SET/DELETE
- [ ] TTL configurable
- [ ] Cache triple (Redis → MySQL → Drive)
- [ ] Invalidacion de cache
- [ ] Hash de configuracion para cache keys

**Tecnologias**:
- `redis-py` - Cliente Redis
- `django-redis` - Integracion Django

**Estrategia de cache**:
```
Capa 1 (Caliente): Redis - TTL 1 hora - Rapido
Capa 2 (Tibia): MySQL - Persistente - Medio
Capa 3 (Fria): Google Drive - Pickle - Lento
```

---

## 🔄 Casos de Uso Pendientes (8 casos)

### Documentos (4 casos)
- [ ] `UploadDocumentsUseCase`
- [ ] `DetectLanguageUseCase`
- [ ] `ConvertDocumentsUseCase`
- [ ] `PreprocessTextUseCase`

### Analisis (4 casos)
- [ ] `GenerateBowUseCase`
- [ ] `CalculateTfidfUseCase`
- [ ] `TrainTopicModelsUseCase`
- [ ] `AnalyzeFactorsUseCase`

---

## 📊 Metricas de Progreso

### Completado:
- **5/9 servicios** (55.6%)
- **~1,600 lineas de codigo**
- **3 apps** (documents, analysis, infrastructure)

### Pendiente:
- **4/9 servicios** (44.4%)
- **8 casos de uso**
- **~1,200 lineas estimadas**

### Tiempo estimado restante:
- Servicios pendientes: ~2-3 horas
- Casos de uso: ~2-3 horas
- **Total restante: ~4-6 horas**

---

## Siguiente Paso

**Opcion 1**: Continuar con TopicModelingService (LDA, NMF, LSA, pLSA)
**Opcion 2**: Crear FactorAnalyzerService primero (mas critico para el proyecto)
**Opcion 3**: Crear infraestructura (DriveGateway, Cache) primero

¿Que prefieres que continue?

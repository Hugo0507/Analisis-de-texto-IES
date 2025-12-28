# ✅ Use Cases Completados - Clean Architecture

**Fecha**: 2025-12-04

## 🎉 Resumen Ejecutivo

**8/8 Use Cases Completados** (100%)
- **~2,200 líneas de código** escritas
- **2 apps** (documents, analysis)
- **Arquitectura Clean** - Capa de casos de uso implementada

---

## ✅ Todos los Use Cases Completados (8/8)

### **DOCUMENTOS** (4 use cases)

#### 1. ✅ UploadDocumentsUseCase (255 líneas)
**Ubicación**: `backend/apps/documents/use_cases/upload_documents.py`

**Responsabilidades**:
- Descargar documentos desde Google Drive
- Guardar registros en base de datos
- Validar duplicados
- Procesamiento por lotes

**Orquesta**:
- `DriveGateway` (descarga de archivos)
- `Document` model (persistencia)

**Métodos principales**:
```python
def execute(folder_id, mime_type, max_files) -> Dict
    # Descarga documentos desde carpeta de Drive

def execute_single(file_id, filename) -> Dict
    # Descarga un solo documento
```

**Características**:
- Validación de duplicados por `drive_file_id`
- Gestión de archivos temporales
- Manejo de errores robusto

---

#### 2. ✅ DetectLanguageUseCase (257 líneas)
**Ubicación**: `backend/apps/documents/use_cases/detect_language.py`

**Responsabilidades**:
- Detectar idioma de documentos
- Actualizar campos `language_code` y `language_confidence`
- Procesamiento por lotes
- Detección desde PDF directa

**Orquesta**:
- `LanguageDetectorService` (detección de idioma)
- `Document` model (persistencia)

**Métodos principales**:
```python
def execute(document_id) -> Dict
    # Detecta idioma desde txt_content

def execute_batch(document_ids) -> Dict
    # Detecta idioma para múltiples documentos

def execute_from_pdf(document_id, pdf_path, max_pages) -> Dict
    # Detecta idioma directamente desde PDF
```

**Características**:
- Detección con confidence score
- Batch processing optimizado
- Soporte para 9 idiomas

---

#### 3. ✅ ConvertDocumentsUseCase (294 líneas)
**Ubicación**: `backend/apps/documents/use_cases/convert_documents.py`

**Responsabilidades**:
- Convertir PDF a TXT
- Descargar PDF desde Drive si es necesario
- Actualizar campo `txt_content`
- Procesamiento por lotes

**Orquesta**:
- `DocumentConverterService` (conversión PDF→TXT)
- `DriveGateway` (descarga de PDF)
- `Document` model (persistencia)

**Métodos principales**:
```python
def execute(document_id, pdf_path, download_from_drive) -> Dict
    # Convierte un documento PDF a TXT

def execute_batch(document_ids, download_from_drive) -> Dict
    # Convierte múltiples documentos
```

**Características**:
- Estrategia de fallback (pdfplumber → pdfminer → PyPDF2)
- Descarga automática desde Drive
- Limpieza de archivos temporales

---

#### 4. ✅ PreprocessTextUseCase (284 líneas)
**Ubicación**: `backend/apps/documents/use_cases/preprocess_text.py`

**Responsabilidades**:
- Preprocesar texto con NLTK
- Actualizar campo `preprocessed_text`
- Procesamiento por lotes
- Obtener estadísticas de texto

**Orquesta**:
- `TextPreprocessorService` (preprocesamiento)
- `Document` model (persistencia)

**Métodos principales**:
```python
def execute(document_id, remove_stopwords, remove_punctuation, ...) -> Dict
    # Preprocesa un documento

def execute_batch(document_ids, ...) -> Dict
    # Preprocesa múltiples documentos

def get_statistics(document_id) -> Dict
    # Obtiene estadísticas de texto
```

**Características**:
- Configuración flexible (stopwords, punctuation, numbers, stemming)
- 200+ stopwords en español
- Longitud mínima/máxima de palabras

---

### **ANÁLISIS** (4 use cases)

#### 5. ✅ GenerateBowUseCase (354 líneas)
**Ubicación**: `backend/apps/analysis/use_cases/generate_bow.py`

**Responsabilidades**:
- Generar matriz Bag of Words
- Guardar vocabulario en DB
- Guardar matriz BoW en DB
- Cache de resultados

**Orquesta**:
- `BowService` (generación de matriz)
- `Vocabulary` model (términos)
- `BowMatrix` model (matriz documento-término)
- `TripleLayerCacheService` (caché)

**Métodos principales**:
```python
def execute(document_ids, max_features, min_df, max_df, ngram_range, use_cache) -> Dict
    # Genera matriz BoW

def get_document_bow(document_id, top_n) -> Dict
    # Obtiene BoW para un documento

def get_vocabulary_stats() -> Dict
    # Obtiene estadísticas de vocabulario
```

**Características**:
- Config hash para invalidación de caché
- Bulk insert (1000 registros por batch)
- Top 50 términos globales
- Matriz sparse en DB

---

#### 6. ✅ CalculateTfidfUseCase (364 líneas)
**Ubicación**: `backend/apps/analysis/use_cases/calculate_tfidf.py`

**Responsabilidades**:
- Calcular matriz TF-IDF
- Guardar vocabulario con IDF scores
- Guardar matriz TF-IDF en DB
- Calcular similitud entre documentos

**Orquesta**:
- `TfidfService` (cálculo de TF-IDF)
- `Vocabulary` model (términos + IDF)
- `TfidfMatrix` model (matriz documento-término)
- `TripleLayerCacheService` (caché)

**Métodos principales**:
```python
def execute(document_ids, max_features, norm, use_idf, sublinear_tf, use_cache) -> Dict
    # Calcula matriz TF-IDF

def get_document_tfidf(document_id, top_n) -> Dict
    # Obtiene TF-IDF para un documento

def calculate_similarity(doc_id1, doc_id2) -> Dict
    # Calcula similitud coseno entre 2 documentos
```

**Características**:
- Normalización L2
- IDF scores persistidos
- Top términos por documento
- Cache triple layer

---

#### 7. ✅ TrainTopicModelsUseCase (297 líneas)
**Ubicación**: `backend/apps/analysis/use_cases/train_topic_models.py`

**Responsabilidades**:
- Entrenar modelos de topic modeling (LDA, NMF, LSA, pLSA)
- Guardar temas en DB
- Comparar modelos
- Cache de resultados

**Orquesta**:
- `TopicModelingService` (entrenamiento de modelos)
- `TfidfService` (matriz TF-IDF previa)
- `Topic` model (temas)
- `DocumentTopic` model (relación documento-tema)
- `TripleLayerCacheService` (caché)

**Métodos principales**:
```python
def execute(model_type, n_topics, document_ids, use_cache) -> Dict
    # Entrena un modelo de topic modeling

def compare_models(document_ids, n_topics) -> Dict
    # Compara los 4 modelos y selecciona el mejor
```

**Métodos privados**:
```python
def _train_lda(texts, doc_ids) -> Dict
def _train_nmf(texts, doc_ids) -> Dict
def _train_lsa(texts, doc_ids) -> Dict
def _train_plsa(texts, doc_ids) -> Dict
def _save_topics(model_type, topics) -> None
```

**Características**:
- 4 algoritmos (LDA, NMF, LSA, pLSA)
- Métricas: perplexity, coherence, reconstruction_error, explained_variance
- Comparación automática de modelos
- Selección del mejor por coherence

---

#### 8. ✅ AnalyzeFactorsUseCase (354 líneas)
**Ubicación**: `backend/apps/analysis/use_cases/analyze_factors.py`

**Responsabilidades**:
- Analizar 16 factores de transformación digital
- Guardar relaciones documento-factor
- Actualizar estadísticas globales
- Calcular co-ocurrencia y consolidación

**Orquesta**:
- `FactorAnalyzerService` (análisis de factores)
- `Factor` model (16 factores)
- `DocumentFactor` model (relación documento-factor)
- `TripleLayerCacheService` (caché)

**Métodos principales**:
```python
def execute(document_ids, normalize_by_length, use_cache) -> Dict
    # Analiza factores para corpus completo

def get_document_factors(document_id, top_n) -> Dict
    # Obtiene factores para un documento

def get_factor_statistics() -> Dict
    # Obtiene estadísticas globales de factores
```

**Métodos privados**:
```python
def _save_document_factors(document_results) -> None
def _update_factor_statistics(global_statistics) -> None
```

**Características**:
- 16 factores en 8 categorías
- Regex matching con 230+ keywords
- Co-ocurrencia de factores
- Consolidación con pesos (global_freq × 0.5 + coverage × 0.3 + relevance × 0.2)
- Top factores por documento

---

## 📊 Métricas Finales

### Código escrito:
- **~2,200 líneas** en 8 use cases
- **Promedio 275 líneas** por use case
- **100% completado**

### Distribución por app:
- **Documentos**: 4 use cases (~1,090 líneas)
- **Análisis**: 4 use cases (~1,369 líneas)

### Patrones implementados:
- **Dependency Injection**: Servicios inyectables en constructores
- **Result Objects**: Diccionarios estandarizados con `success`, `error`, datos
- **Batch Processing**: Métodos `execute_batch()` para operaciones en lote
- **Cache Integration**: Triple-layer cache con config hashing
- **Database Optimization**: Bulk insert (1000 registros/batch)
- **Error Handling**: Try-except con logging detallado

---

## 🏗️ Arquitectura de Use Cases

### Estructura de carpetas:
```
backend/apps/
├── documents/
│   └── use_cases/
│       ├── __init__.py
│       ├── upload_documents.py
│       ├── detect_language.py
│       ├── convert_documents.py
│       └── preprocess_text.py
│
└── analysis/
    └── use_cases/
        ├── __init__.py
        ├── generate_bow.py
        ├── calculate_tfidf.py
        ├── train_topic_models.py
        └── analyze_factors.py
```

### Capas de Clean Architecture:

```
┌─────────────────────────────────────────┐
│  API Layer (ViewSets - Pendiente)      │ ← Fase 4
├─────────────────────────────────────────┤
│  Use Cases (8 casos - COMPLETADO) ✅   │ ← Capa actual
├─────────────────────────────────────────┤
│  Services (9 servicios - COMPLETADO) ✅│ ← Fase 3
├─────────────────────────────────────────┤
│  Domain Models (10 modelos - COMPLETADO) ✅│ ← Fase 2
├─────────────────────────────────────────┤
│  Infrastructure (Drive, Redis, Cache) ✅│ ← Fase 3
└─────────────────────────────────────────┘
```

---

## 🔄 Ejemplo de Flujo Completo

### Pipeline completo usando Use Cases:

```python
from apps.documents.use_cases.upload_documents import UploadDocumentsUseCase
from apps.documents.use_cases.detect_language import DetectLanguageUseCase
from apps.documents.use_cases.convert_documents import ConvertDocumentsUseCase
from apps.documents.use_cases.preprocess_text import PreprocessTextUseCase
from apps.analysis.use_cases.generate_bow import GenerateBowUseCase
from apps.analysis.use_cases.calculate_tfidf import CalculateTfidfUseCase
from apps.analysis.use_cases.train_topic_models import TrainTopicModelsUseCase
from apps.analysis.use_cases.analyze_factors import AnalyzeFactorsUseCase

# 1. Subir documentos desde Drive
upload_uc = UploadDocumentsUseCase()
upload_result = upload_uc.execute(folder_id='abc123', mime_type='application/pdf')
# {'success': True, 'uploaded_count': 10, 'failed_count': 0, ...}

# 2. Detectar idioma
detect_uc = DetectLanguageUseCase()
detect_result = detect_uc.execute_batch()
# {'success': True, 'success_count': 10, 'failed_count': 0, ...}

# 3. Convertir PDF a TXT
convert_uc = ConvertDocumentsUseCase()
convert_result = convert_uc.execute_batch(download_from_drive=True)
# {'success': True, 'success_count': 10, 'failed_count': 0, ...}

# 4. Preprocesar texto
preprocess_uc = PreprocessTextUseCase()
preprocess_result = preprocess_uc.execute_batch(
    remove_stopwords=True,
    remove_punctuation=True
)
# {'success': True, 'success_count': 10, 'failed_count': 0, ...}

# 5. Generar Bag of Words
bow_uc = GenerateBowUseCase()
bow_result = bow_uc.execute(max_features=5000, use_cache=True)
# {'success': True, 'vocabulary_size': 1500, 'document_count': 10, ...}

# 6. Calcular TF-IDF
tfidf_uc = CalculateTfidfUseCase()
tfidf_result = tfidf_uc.execute(max_features=5000, use_cache=True)
# {'success': True, 'vocabulary_size': 1500, 'document_count': 10, ...}

# 7. Topic Modeling
topic_uc = TrainTopicModelsUseCase()
lda_result = topic_uc.execute(model_type='lda', n_topics=10, use_cache=True)
# {'success': True, 'n_topics': 10, 'perplexity': 450.23, 'coherence': 0.45, ...}

# Comparar modelos
comparison = topic_uc.compare_models(n_topics=10)
# {'success': True, 'best_model': 'nmf', 'models': {...}}

# 8. Análisis de Factores
factors_uc = AnalyzeFactorsUseCase()
factors_result = factors_uc.execute(normalize_by_length=True, use_cache=True)
# {
#   'success': True,
#   'document_count': 10,
#   'factor_count': 16,
#   'global_statistics': [...],
#   'category_statistics': {...},
#   'consolidated_ranking': [...]
# }
```

---

## 📝 Próximo Paso: Fase 4 - API REST

**Estado**: Los Use Cases están completos y listos para ser expuestos vía API REST.

### Tareas de Fase 4:

#### **ViewSets a crear** (20+ endpoints):

**Documentos** (5 endpoints):
- [ ] `POST /api/documents/upload/` → `UploadDocumentsUseCase.execute()`
- [ ] `POST /api/documents/{id}/detect-language/` → `DetectLanguageUseCase.execute()`
- [ ] `POST /api/documents/{id}/convert/` → `ConvertDocumentsUseCase.execute()`
- [ ] `POST /api/documents/{id}/preprocess/` → `PreprocessTextUseCase.execute()`
- [ ] `GET /api/documents/{id}/statistics/` → `PreprocessTextUseCase.get_statistics()`

**BoW** (3 endpoints):
- [ ] `POST /api/analysis/bow/generate/` → `GenerateBowUseCase.execute()`
- [ ] `GET /api/analysis/bow/{document_id}/` → `GenerateBowUseCase.get_document_bow()`
- [ ] `GET /api/analysis/bow/vocabulary/` → `GenerateBowUseCase.get_vocabulary_stats()`

**TF-IDF** (4 endpoints):
- [ ] `POST /api/analysis/tfidf/calculate/` → `CalculateTfidfUseCase.execute()`
- [ ] `GET /api/analysis/tfidf/{document_id}/` → `CalculateTfidfUseCase.get_document_tfidf()`
- [ ] `GET /api/analysis/tfidf/similarity/` → `CalculateTfidfUseCase.calculate_similarity()`

**Topic Modeling** (6 endpoints):
- [ ] `POST /api/analysis/topics/train/` → `TrainTopicModelsUseCase.execute()`
- [ ] `GET /api/analysis/topics/lda/` → `TrainTopicModelsUseCase.execute(model_type='lda')`
- [ ] `GET /api/analysis/topics/nmf/` → `TrainTopicModelsUseCase.execute(model_type='nmf')`
- [ ] `GET /api/analysis/topics/lsa/` → `TrainTopicModelsUseCase.execute(model_type='lsa')`
- [ ] `GET /api/analysis/topics/plsa/` → `TrainTopicModelsUseCase.execute(model_type='plsa')`
- [ ] `GET /api/analysis/topics/compare/` → `TrainTopicModelsUseCase.compare_models()`

**Factores** (3 endpoints):
- [ ] `POST /api/analysis/factors/analyze/` → `AnalyzeFactorsUseCase.execute()`
- [ ] `GET /api/analysis/factors/{document_id}/` → `AnalyzeFactorsUseCase.get_document_factors()`
- [ ] `GET /api/analysis/factors/statistics/` → `AnalyzeFactorsUseCase.get_factor_statistics()`

**Total**: 21 endpoints REST

### Arquitectura de ViewSets:

```python
# backend/apps/documents/views.py
from rest_framework import viewsets
from apps.documents.use_cases.upload_documents import UploadDocumentsUseCase

class DocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for documents."""

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Upload documents from Google Drive."""
        use_case = UploadDocumentsUseCase()
        result = use_case.execute(
            folder_id=request.data.get('folder_id'),
            mime_type=request.data.get('mime_type', 'application/pdf')
        )
        return Response(result)

    @action(detail=True, methods=['post'])
    def detect_language(self, request, pk=None):
        """Detect language for document."""
        use_case = DetectLanguageUseCase()
        result = use_case.execute(document_id=pk)
        return Response(result)
```

### Configuración adicional:

- [ ] Configurar URLs (`urls.py`)
- [ ] Configurar CORS (`django-cors-headers`)
- [ ] Documentación OpenAPI (Swagger UI con `drf-spectacular`)
- [ ] Permisos y autenticación (opcional)

**Tiempo estimado**: 2-3 horas

---

## ✨ Logros de esta Fase

- ✅ **8 Use Cases** implementados con Clean Architecture
- ✅ **~2,200 líneas** de código de negocio
- ✅ **Integración completa** con servicios y modelos
- ✅ **Cache triple-layer** con config hashing
- ✅ **Batch processing** optimizado
- ✅ **Error handling** robusto
- ✅ **Result objects** estandarizados
- ✅ **Dependency injection** en todos los use cases

**Estado del Proyecto**:
- Fase 1 (Setup) ✅
- Fase 2 (Dominio + Modelos) ✅
- Fase 3 (Servicios) ✅
- **Fase 3.5 (Use Cases) ✅ COMPLETADA**
- Fase 4 (API REST) 🔄 PENDIENTE

---

**¿Continuar con Fase 4 (API REST + ViewSets)?**

# API REST - Documentación de Endpoints

**Base URL**: `http://localhost:8000/api/v1`

**Documentación Interactiva**:
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/
- OpenAPI Schema: http://localhost:8000/api/schema/

---

## 📋 Tabla de Contenidos

1. [Autenticación y Permisos](#autenticación-y-permisos)
2. [Documents API](#documents-api)
3. [Analysis API - Bag of Words](#analysis-api---bag-of-words)
4. [Analysis API - TF-IDF](#analysis-api---tf-idf)
5. [Analysis API - Topic Modeling](#analysis-api---topic-modeling)
6. [Analysis API - Factor Analysis](#analysis-api---factor-analysis)
7. [Códigos de Estado HTTP](#códigos-de-estado-http)
8. [Formato de Respuestas](#formato-de-respuestas)

---

## 🔐 Autenticación y Permisos

**Configuración Actual**:
- `AllowAny` en desarrollo (sin autenticación requerida)
- CORS habilitado para `localhost:3000`

**TODO**: Configurar autenticación JWT/Token para producción.

---

## 📄 Documents API

### 1. Listar Documentos

```http
GET /api/v1/documents/
```

**Parámetros Query (Opcionales)**:
- `page`: Número de página (default: 1)
- `page_size`: Tamaño de página (default: 50)
- `search`: Búsqueda por filename
- `ordering`: Ordenar por campo (ej: `created_at`, `-created_at`)

**Respuesta Exitosa (200 OK)**:
```json
{
  "count": 150,
  "next": "http://localhost:8000/api/v1/documents/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "filename": "documento_01.pdf",
      "drive_file_id": "1abc123...",
      "language_code": "es",
      "language_confidence": 0.99,
      "status": "completed",
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:35:00"
    }
  ]
}
```

---

### 2. Obtener Documento por ID

```http
GET /api/v1/documents/{id}/
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "id": 1,
  "drive_file_id": "1abc123...",
  "filename": "documento_01.pdf",
  "language_code": "es",
  "language_confidence": 0.99,
  "txt_content": "Texto completo del documento...",
  "preprocessed_text": "texto preprocesado documento...",
  "status": "completed",
  "created_at": "2024-01-15 10:30:00",
  "updated_at": "2024-01-15 10:35:00"
}
```

---

### 3. Subir Documentos desde Google Drive

```http
POST /api/v1/documents/upload/
```

**Body**:
```json
{
  "folder_id": "1xyz789...",
  "mime_type": "application/pdf",
  "max_files": 100
}
```

**Respuesta Exitosa (201 CREATED)**:
```json
{
  "success": true,
  "uploaded_count": 45,
  "failed_count": 2,
  "skipped_count": 3,
  "documents": [
    {
      "id": 1,
      "filename": "documento_01.pdf",
      "drive_file_id": "1abc123..."
    }
  ],
  "failed_files": [
    {
      "filename": "corrupted.pdf",
      "error": "File could not be downloaded"
    }
  ]
}
```

---

### 4. Detectar Idioma (Individual)

```http
POST /api/v1/documents/{id}/detect-language/
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "document_id": 1,
  "filename": "documento_01.pdf",
  "language_code": "es",
  "language_confidence": 0.99,
  "detection_time": 0.15
}
```

---

### 5. Detectar Idioma (Batch)

```http
POST /api/v1/documents/detect-language-batch/
```

**Body** (Opcional):
```json
{
  "document_ids": [1, 2, 3]
}
```

Si `document_ids` es `null`, procesa todos los documentos pendientes.

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "processed_count": 45,
  "failed_count": 2,
  "results": [
    {
      "document_id": 1,
      "language_code": "es",
      "language_confidence": 0.99
    }
  ]
}
```

---

### 6. Convertir PDF a TXT (Individual)

```http
POST /api/v1/documents/{id}/convert/
```

**Body** (Opcional):
```json
{
  "download_from_drive": true
}
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "document_id": 1,
  "filename": "documento_01.pdf",
  "txt_length": 15234,
  "conversion_method": "pdfplumber",
  "conversion_time": 2.45
}
```

---

### 7. Convertir PDF a TXT (Batch)

```http
POST /api/v1/documents/convert-batch/
```

**Body** (Opcional):
```json
{
  "document_ids": [1, 2, 3],
  "download_from_drive": true
}
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "processed_count": 45,
  "failed_count": 2,
  "results": [
    {
      "document_id": 1,
      "txt_length": 15234,
      "conversion_method": "pdfplumber"
    }
  ]
}
```

---

### 8. Preprocesar Texto (Individual)

```http
POST /api/v1/documents/{id}/preprocess/
```

**Body** (Todos opcionales):
```json
{
  "remove_stopwords": true,
  "remove_punctuation": true,
  "remove_numbers": true,
  "apply_stemming": false,
  "min_word_length": 3,
  "max_word_length": 30
}
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "document_id": 1,
  "filename": "documento_01.pdf",
  "preprocessed_length": 12500,
  "removed_tokens": 2734,
  "processing_time": 0.85,
  "config": {
    "remove_stopwords": true,
    "remove_punctuation": true,
    "apply_stemming": false
  }
}
```

---

### 9. Preprocesar Texto (Batch)

```http
POST /api/v1/documents/preprocess-batch/
```

**Body**:
```json
{
  "document_ids": [1, 2, 3],
  "remove_stopwords": true,
  "remove_punctuation": true,
  "remove_numbers": true,
  "apply_stemming": false,
  "min_word_length": 3,
  "max_word_length": 30
}
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "processed_count": 45,
  "failed_count": 2,
  "total_tokens_removed": 125000,
  "processing_time": 38.5
}
```

---

### 10. Obtener Estadísticas de Texto

```http
GET /api/v1/documents/{id}/statistics/
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "document_id": 1,
  "filename": "documento_01.pdf",
  "statistics": {
    "raw_text": {
      "length": 15234,
      "word_count": 2567,
      "unique_words": 892
    },
    "preprocessed_text": {
      "length": 12500,
      "token_count": 2100,
      "vocabulary_size": 750
    },
    "removed": {
      "stopwords": 467,
      "punctuation": 234,
      "numbers": 33
    }
  }
}
```

---

## 🔤 Analysis API - Bag of Words

### 1. Generar Matriz BoW

```http
POST /api/v1/analysis/bow/generate/
```

**Body** (Todos opcionales):
```json
{
  "document_ids": [1, 2, 3],
  "max_features": 5000,
  "min_df": 2,
  "max_df": 0.85,
  "ngram_range": [1, 1],
  "use_cache": true
}
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "cached": false,
  "document_count": 150,
  "vocabulary_size": 4567,
  "matrix_shape": [150, 4567],
  "sparsity": 0.023,
  "processing_time": 45.2,
  "config": {
    "max_features": 5000,
    "min_df": 2,
    "max_df": 0.85,
    "ngram_range": [1, 1]
  }
}
```

---

### 2. Obtener BoW de un Documento

```http
GET /api/v1/analysis/bow/{document_id}/?top_n=50
```

**Parámetros Query**:
- `top_n`: Número de términos a retornar (default: 50)

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "document_id": 1,
  "filename": "documento_01.pdf",
  "top_terms": [
    {
      "term": "transformación",
      "frequency": 45
    },
    {
      "term": "digital",
      "frequency": 38
    },
    {
      "term": "educación",
      "frequency": 32
    }
  ],
  "total_terms": 750
}
```

---

### 3. Obtener Estadísticas de Vocabulario

```http
GET /api/v1/analysis/bow/vocabulary/
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "vocabulary_size": 4567,
  "total_documents": 150,
  "avg_terms_per_document": 30.5,
  "top_global_terms": [
    {
      "term": "transformación",
      "global_frequency": 1234,
      "document_frequency": 89
    }
  ]
}
```

---

## 📊 Analysis API - TF-IDF

### 1. Calcular Matriz TF-IDF

```http
POST /api/v1/analysis/tfidf/calculate/
```

**Body** (Todos opcionales):
```json
{
  "document_ids": [1, 2, 3],
  "max_features": 5000,
  "norm": "l2",
  "use_idf": true,
  "sublinear_tf": false,
  "use_cache": true
}
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "cached": false,
  "document_count": 150,
  "vocabulary_size": 4567,
  "matrix_shape": [150, 4567],
  "avg_tfidf_score": 0.045,
  "processing_time": 52.3,
  "config": {
    "max_features": 5000,
    "norm": "l2",
    "use_idf": true
  }
}
```

---

### 2. Obtener TF-IDF de un Documento

```http
GET /api/v1/analysis/tfidf/{document_id}/?top_n=50
```

**Parámetros Query**:
- `top_n`: Número de términos a retornar (default: 50)

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "document_id": 1,
  "filename": "documento_01.pdf",
  "top_terms": [
    {
      "term": "transformación",
      "tfidf_score": 0.234
    },
    {
      "term": "digital",
      "tfidf_score": 0.198
    }
  ],
  "total_terms": 750
}
```

---

### 3. Calcular Similitud entre Documentos

```http
GET /api/v1/analysis/tfidf/similarity/?doc_id1=1&doc_id2=2
```

**Parámetros Query** (Requeridos):
- `doc_id1`: ID del primer documento
- `doc_id2`: ID del segundo documento

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "doc_id1": 1,
  "doc_id2": 2,
  "filename1": "documento_01.pdf",
  "filename2": "documento_02.pdf",
  "cosine_similarity": 0.78,
  "common_terms": 234
}
```

---

## 🎯 Analysis API - Topic Modeling

### 1. Entrenar Modelo de Tópicos

```http
POST /api/v1/analysis/topics/train/
```

**Body**:
```json
{
  "model_type": "lda",
  "n_topics": 10,
  "document_ids": [1, 2, 3],
  "use_cache": true
}
```

**Opciones de `model_type`**: `lda`, `nmf`, `lsa`, `plsa`

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "cached": false,
  "model_type": "lda",
  "n_topics": 10,
  "topics": [
    {
      "topic_id": 0,
      "top_words": [
        {"word": "transformación", "weight": 0.045},
        {"word": "digital", "weight": 0.038},
        {"word": "educación", "weight": 0.032}
      ],
      "coherence_score": 0.52
    }
  ],
  "perplexity": 245.6,
  "coherence": 0.48,
  "processing_time": 128.5
}
```

---

### 2. Obtener Resultados LDA

```http
GET /api/v1/analysis/topics/lda/?n_topics=10&use_cache=true
```

**Parámetros Query**:
- `n_topics`: Número de tópicos (default: 10)
- `use_cache`: Usar caché (default: true)

**Respuesta**: Igual a `/train/` endpoint

---

### 3. Obtener Resultados NMF

```http
GET /api/v1/analysis/topics/nmf/?n_topics=10&use_cache=true
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "model_type": "nmf",
  "n_topics": 10,
  "topics": [...],
  "reconstruction_error": 1234.5,
  "coherence": 0.51
}
```

---

### 4. Obtener Resultados LSA

```http
GET /api/v1/analysis/topics/lsa/?n_topics=10&use_cache=true
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "model_type": "lsa",
  "n_topics": 10,
  "topics": [...],
  "explained_variance": [0.15, 0.12, 0.09, ...],
  "coherence": 0.45
}
```

---

### 5. Obtener Resultados pLSA

```http
GET /api/v1/analysis/topics/plsa/?n_topics=10&use_cache=true
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "model_type": "plsa",
  "n_topics": 10,
  "topics": [...],
  "coherence": 0.47
}
```

---

### 6. Comparar Todos los Modelos

```http
GET /api/v1/analysis/topics/compare/?n_topics=10
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "models": {
    "lda": {
      "n_topics": 10,
      "coherence": 0.48,
      "perplexity": 245.6
    },
    "nmf": {
      "n_topics": 10,
      "coherence": 0.51,
      "reconstruction_error": 1234.5
    },
    "lsa": {
      "n_topics": 10,
      "coherence": 0.45,
      "explained_variance": 0.68
    },
    "plsa": {
      "n_topics": 10,
      "coherence": 0.47
    }
  },
  "best_model": "nmf"
}
```

---

## 🔍 Analysis API - Factor Analysis

### 1. Analizar Factores

```http
POST /api/v1/analysis/factors/analyze/
```

**Body** (Todos opcionales):
```json
{
  "document_ids": [1, 2, 3],
  "normalize_by_length": true,
  "use_cache": true
}
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "cached": false,
  "document_count": 150,
  "factor_count": 16,
  "global_statistics": [
    {
      "factor_id": 1,
      "factor_name": "Infraestructura Tecnológica",
      "category": "tecnologico",
      "global_frequency": 1234,
      "document_coverage": 0.85,
      "relevance_score": 0.78
    }
  ],
  "category_statistics": {
    "tecnologico": {
      "factor_count": 3,
      "avg_relevance": 0.72,
      "total_mentions": 4567
    }
  },
  "co_occurrence": [
    {
      "factor1": "Infraestructura Tecnológica",
      "factor2": "Capacitación Docente",
      "co_occurrence_count": 89,
      "correlation": 0.65
    }
  ],
  "consolidated_ranking": [
    {
      "rank": 1,
      "factor_id": 1,
      "factor_name": "Infraestructura Tecnológica",
      "consolidated_score": 0.82
    }
  ],
  "processing_time": 25.3
}
```

---

### 2. Obtener Factores de un Documento

```http
GET /api/v1/analysis/factors/{document_id}/?top_n=16
```

**Parámetros Query**:
- `top_n`: Número de factores a retornar (default: 16)

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "document_id": 1,
  "filename": "documento_01.pdf",
  "factors": [
    {
      "factor_id": 1,
      "factor_name": "Infraestructura Tecnológica",
      "category": "tecnologico",
      "mention_count": 12,
      "relevance_score": 0.78
    }
  ],
  "total_factors": 16
}
```

---

### 3. Obtener Estadísticas Globales de Factores

```http
GET /api/v1/analysis/factors/statistics/
```

**Respuesta Exitosa (200 OK)**:
```json
{
  "success": true,
  "total_factors": 16,
  "factors": [
    {
      "factor_id": 1,
      "factor_name": "Infraestructura Tecnológica",
      "category": "tecnologico",
      "global_frequency": 1234,
      "relevance_score": 0.78,
      "keyword_count": 15
    }
  ],
  "by_category": {
    "tecnologico": [
      {
        "factor_id": 1,
        "factor_name": "Infraestructura Tecnológica",
        "global_frequency": 1234
      }
    ],
    "organizacional": [...],
    "humano": [...]
  }
}
```

---

## 📌 Códigos de Estado HTTP

| Código | Descripción | Uso |
|--------|-------------|-----|
| **200** | OK | Operación exitosa (GET, PUT, PATCH) |
| **201** | Created | Recurso creado exitosamente (POST) |
| **400** | Bad Request | Error en parámetros o validación |
| **404** | Not Found | Recurso no encontrado |
| **500** | Internal Server Error | Error del servidor |

---

## 🔧 Formato de Respuestas

### Respuesta Exitosa

```json
{
  "success": true,
  "cached": false,
  "...data": "..."
}
```

### Respuesta con Error

```json
{
  "success": false,
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

### Respuesta Paginada (Lista de Recursos)

```json
{
  "count": 150,
  "next": "http://localhost:8000/api/v1/documents/?page=2",
  "previous": null,
  "results": [...]
}
```

---

## 🚀 Ejemplo de Uso Completo

### Pipeline Completo: Desde Subida hasta Análisis

```bash
# 1. Subir documentos desde Google Drive
curl -X POST http://localhost:8000/api/v1/documents/upload/ \
  -H "Content-Type: application/json" \
  -d '{
    "folder_id": "1xyz789...",
    "max_files": 100
  }'

# 2. Detectar idiomas (batch)
curl -X POST http://localhost:8000/api/v1/documents/detect-language-batch/

# 3. Convertir PDFs (batch)
curl -X POST http://localhost:8000/api/v1/documents/convert-batch/

# 4. Preprocesar textos (batch)
curl -X POST http://localhost:8000/api/v1/documents/preprocess-batch/ \
  -H "Content-Type: application/json" \
  -d '{
    "remove_stopwords": true,
    "remove_punctuation": true
  }'

# 5. Generar matriz BoW
curl -X POST http://localhost:8000/api/v1/analysis/bow/generate/ \
  -H "Content-Type: application/json" \
  -d '{
    "max_features": 5000,
    "min_df": 2
  }'

# 6. Calcular TF-IDF
curl -X POST http://localhost:8000/api/v1/analysis/tfidf/calculate/

# 7. Entrenar modelos de tópicos
curl -X POST http://localhost:8000/api/v1/analysis/topics/train/ \
  -H "Content-Type: application/json" \
  -d '{
    "model_type": "lda",
    "n_topics": 10
  }'

# 8. Analizar factores
curl -X POST http://localhost:8000/api/v1/analysis/factors/analyze/
```

---

## 📝 Notas Adicionales

### Cache

- Todos los endpoints de análisis soportan el parámetro `use_cache`
- El sistema usa caché de triple capa: **Redis → MySQL → Google Drive**
- TTL por defecto: **1 hora**
- El hash de configuración determina la clave de caché

### Batch Processing

- Los endpoints batch procesan múltiples documentos en paralelo
- Si `document_ids` es `null`, procesan **todos** los documentos elegibles
- Retornan contadores de éxito/fallo por documento

### Paginación

- Paginación habilitada en listas de recursos (GET /documents/)
- Tamaño de página por defecto: **50**
- Parámetro `page_size` personalizable

### Filtros y Búsqueda

- Filtrado por campos: `?status=completed`
- Búsqueda de texto: `?search=transformación`
- Ordenamiento: `?ordering=-created_at` (descendente)

---

## ✅ Checklist de Testing

- [ ] Probar subida de documentos desde Google Drive
- [ ] Verificar detección de idiomas
- [ ] Probar conversión PDF → TXT
- [ ] Verificar preprocesamiento de texto
- [ ] Generar matriz BoW y verificar resultados
- [ ] Calcular TF-IDF y verificar scores
- [ ] Entrenar los 4 modelos de topic modeling
- [ ] Analizar factores y verificar resultados
- [ ] Probar endpoints de consulta individual
- [ ] Verificar funcionamiento de caché
- [ ] Probar paginación y filtros
- [ ] Verificar CORS desde frontend (localhost:3000)

---

**Última actualización**: 2024-01-15
**Versión API**: v1.0.0

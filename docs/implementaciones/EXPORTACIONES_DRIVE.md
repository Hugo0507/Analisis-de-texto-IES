# 📁 Exportaciones Automáticas a Google Drive

## Resumen

Todos los módulos de análisis ahora **guardan automáticamente** sus resultados en Google Drive, incluyendo archivos CSV para uso externo.

---

## 🗂️ Estructura de Carpetas en Drive

Cuando ejecutas el flujo completo, se crean estas carpetas en tu Drive:

```
📁 [Carpeta Raíz del Proyecto]/
├── 01_PDF_Files/              (PDFs originales)
├── 02_PDF_EN_Detected/        (PDFs en inglés detectados)
├── 03_TXT_Converted/          (Archivos TXT convertidos)
├── 04_TXT_Preprocessed/       (Textos preprocesados)
├── 05_BagOfWords_Results/     (Resultados Bolsa de Palabras)
│   ├── bow_results.json       (Metadatos y configuración)
│   └── bow_matrix.csv         📊 EXPORTACIÓN CSV
├── 06_TFIDF_Results/          (Resultados TF-IDF)
│   ├── tfidf_results.json     (Metadatos y configuración)
│   ├── tfidf_matrix.csv       📊 EXPORTACIÓN CSV
│   ├── tf_matrix.csv          📊 EXPORTACIÓN CSV (Matriz TF)
│   └── idf_values.csv         📊 EXPORTACIÓN CSV (Valores IDF)
└── 07_NER_Analysis/           (Resultados Análisis NER)
    └── ner_analysis_results.json (Resultados completos del análisis)
```

---

## 📊 Archivos CSV Exportados

### 1. Bolsa de Palabras (BoW)

**Archivo:** `05_BagOfWords_Results/bow_matrix.csv`

**Formato:**
```
            término1  término2  término3  ...
documento1      5         0         2    ...
documento2      1         3         0    ...
documento3      0         2         1    ...
```

**Uso externo:**
```python
import pandas as pd

# Cargar matriz BoW
bow_matrix = pd.read_csv('bow_matrix.csv', index_col=0)

# Ver dimensiones
print(f"Documentos: {len(bow_matrix)}")
print(f"Términos: {len(bow_matrix.columns)}")

# Términos más frecuentes
top_terms = bow_matrix.sum().sort_values(ascending=False).head(10)
print(top_terms)
```

---

### 2. Matriz TF-IDF

**Archivo:** `06_TFIDF_Results/tfidf_matrix.csv`

**Formato:**
```
            término1  término2  término3  ...
documento1    0.234     0.000    0.156   ...
documento2    0.089     0.421    0.000   ...
documento3    0.000     0.167    0.092   ...
```

**Valores:** Scores TF-IDF (0.0 a ~1.0)

**Uso externo:**
```python
import pandas as pd

# Cargar matriz TF-IDF
tfidf_matrix = pd.read_csv('tfidf_matrix.csv', index_col=0)

# Top términos por documento
for doc in tfidf_matrix.index[:3]:
    top_terms = tfidf_matrix.loc[doc].sort_values(ascending=False).head(5)
    print(f"\nDocumento: {doc}")
    print(top_terms)
```

---

### 3. Matriz TF (Term Frequency)

**Archivo:** `06_TFIDF_Results/tf_matrix.csv`

**Formato:** Igual que TF-IDF pero con frecuencias normalizadas

**Valores:** Frecuencia relativa (0.0 a 1.0)

**Uso externo:**
```python
import pandas as pd

# Cargar matriz TF
tf_matrix = pd.read_csv('tf_matrix.csv', index_col=0)

# Frecuencias de un documento
doc_freq = tf_matrix.loc['documento1.txt']
print(doc_freq[doc_freq > 0].sort_values(ascending=False))
```

---

### 4. Valores IDF (Inverse Document Frequency)

**Archivo:** `06_TFIDF_Results/idf_values.csv`

**Formato:**
```
término1,2.345
término2,1.234
término3,3.456
...
```

**Valores:** Log de frecuencia inversa de documentos

**Uso externo:**
```python
import pandas as pd

# Cargar valores IDF
idf_values = pd.read_csv('idf_values.csv', index_col=0, header=None, names=['IDF'])

# Términos más distintivos (IDF alto)
distinctive_terms = idf_values.sort_values('IDF', ascending=False).head(20)
print(distinctive_terms)

# Términos más comunes (IDF bajo)
common_terms = idf_values.sort_values('IDF').head(20)
print(common_terms)
```

---

## 📄 Archivos JSON

### Bolsa de Palabras

**Archivo:** `05_BagOfWords_Results/bow_results.json`

**Contiene:**
- Vocabulario completo
- Número de documentos
- Total de términos
- Configuración usada (max_features, min_df, max_df, ngram_range)

---

### TF-IDF

**Archivo:** `06_TFIDF_Results/tfidf_results.json`

**Contiene:**
- Vocabulario
- Top términos por documento
- Configuración del método
- Estadísticas generales

---

### Análisis NER

**Archivo:** `07_NER_Analysis/ner_analysis_results.json`

**Contiene:**
- Estadísticas del corpus
- Distribución de países
- Distribución de años
- Top entidades por categoría
- Insights geográficos
- Insights temporales
- Co-ocurrencias de entidades
- Métricas de diversidad
- Estadísticas de entidades

**Uso externo:**
```python
import json

# Cargar resultados NER
with open('ner_analysis_results.json', 'r', encoding='utf-8') as f:
    ner_results = json.load(f)

# Top países mencionados
top_countries = ner_results['geographical_insights']['top_countries']
print("Top 10 países:", top_countries[:10])

# Años más mencionados
top_years = ner_results['temporal_insights']['top_years']
print("Top años:", top_years[:10])

# Estadísticas generales
stats = ner_results['corpus_stats']
print(f"Documentos analizados: {stats['total_documents']}")
print(f"Total entidades: {stats['total_entities']}")
print(f"Países únicos: {stats['unique_countries']}")
```

---

## 🔄 Uso en Otros Proyectos

### Ejemplo: Análisis de Clustering

```python
import pandas as pd
from sklearn.cluster import KMeans

# Cargar matriz TF-IDF
tfidf = pd.read_csv('tfidf_matrix.csv', index_col=0)

# Clustering de documentos
kmeans = KMeans(n_clusters=5, random_state=42)
clusters = kmeans.fit_predict(tfidf.values)

# Asignar clusters
tfidf['cluster'] = clusters
print(tfidf['cluster'].value_counts())
```

### Ejemplo: Análisis de Similitud

```python
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

# Cargar matriz TF-IDF
tfidf = pd.read_csv('tfidf_matrix.csv', index_col=0)

# Calcular similitud entre documentos
similarity_matrix = cosine_similarity(tfidf.values)
similarity_df = pd.DataFrame(
    similarity_matrix,
    index=tfidf.index,
    columns=tfidf.index
)

# Documentos más similares a uno específico
doc = 'documento1.txt'
similar_docs = similarity_df[doc].sort_values(ascending=False)[1:6]
print(f"Documentos similares a {doc}:")
print(similar_docs)
```

### Ejemplo: Visualización

```python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Cargar resultados BoW
bow = pd.read_csv('bow_matrix.csv', index_col=0)

# Top 20 términos más frecuentes
top_terms = bow.sum().sort_values(ascending=False).head(20)

# Visualizar
plt.figure(figsize=(12, 6))
top_terms.plot(kind='barh')
plt.title('Top 20 Términos Más Frecuentes')
plt.xlabel('Frecuencia')
plt.tight_layout()
plt.show()
```

---

## 📥 Cómo Descargar los Archivos

### Opción 1: Desde la Interfaz de Streamlit

Algunos módulos tienen botones de descarga directa en la pestaña "Persistencia"

### Opción 2: Directamente desde Google Drive

1. Abre Google Drive en tu navegador
2. Navega a la carpeta del proyecto
3. Entra a la carpeta correspondiente (05_BagOfWords_Results, etc.)
4. Descarga los archivos CSV o JSON que necesites

### Opción 3: Usando la API de Google Drive

```python
from googleapiclient.discovery import build
from google.oauth2 import service_account

# Configurar credenciales
creds = service_account.Credentials.from_service_account_file('credentials.json')
service = build('drive', 'v3', credentials=creds)

# Buscar archivo
query = "name='bow_matrix.csv'"
results = service.files().list(q=query, fields='files(id, name)').execute()
files = results.get('files', [])

if files:
    file_id = files[0]['id']
    # Descargar archivo
    request = service.files().get_media(fileId=file_id)
    with open('bow_matrix.csv', 'wb') as f:
        downloader = MediaIoBaseDownload(f, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
```

---

## ✨ Ventajas de las Exportaciones

✅ **Portabilidad** - Usa los datos en cualquier herramienta (Python, R, Excel, etc.)
✅ **Respaldo** - Datos guardados en la nube automáticamente
✅ **Reutilización** - Importa matrices en otros proyectos sin re-procesar
✅ **Interoperabilidad** - Formato CSV universal y compatible
✅ **Transparencia** - JSON legible para auditoría y verificación

---

## 📝 Notas Importantes

1. **Los CSV se generan automáticamente** al crear las matrices (no hay que hacer nada extra)
2. **Los archivos se sobrescriben** si ejecutas el análisis de nuevo con la misma configuración
3. **El tamaño de los archivos** depende del número de documentos y términos (pueden ser grandes)
4. **Los JSON contienen metadatos** útiles para entender cómo se generaron los datos
5. **El análisis NER solo guarda JSON** (no CSV) porque contiene datos estructurados complejos

---

## 🔮 Uso Avanzado

### Combinar Matrices

```python
import pandas as pd

# Cargar BoW y TF-IDF
bow = pd.read_csv('bow_matrix.csv', index_col=0)
tfidf = pd.read_csv('tfidf_matrix.csv', index_col=0)

# Asegurar mismo orden
assert list(bow.index) == list(tfidf.index)
assert list(bow.columns) == list(tfidf.columns)

# Análisis comparativo
correlation = bow.corrwith(tfidf, axis=1)
print("Correlación BoW vs TF-IDF por documento:")
print(correlation)
```

### Enriquecimiento con NER

```python
import json
import pandas as pd

# Cargar TF-IDF y NER
tfidf = pd.read_csv('tfidf_matrix.csv', index_col=0)
with open('ner_analysis_results.json', 'r') as f:
    ner = json.load(f)

# Agregar información de países al análisis
for doc_name in tfidf.index:
    # Obtener entidades del documento
    if doc_name in ner['corpus_stats']:
        countries = ner['country_distribution']
        print(f"{doc_name}: {countries}")
```

---

**Fecha:** 18 de Octubre, 2025
**Versión:** 1.0

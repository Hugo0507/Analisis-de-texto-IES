# 📄 Documentación Detallada: `preprocesamiento.py`

## 📍 Ubicación

```
analisis_transformacion_digital/components/pages/preprocesamiento.py
```

## 🎯 Propósito

`preprocesamiento.py` es una **página de la interfaz de usuario** que permite configurar y ejecutar el preprocesamiento de textos. Esta es la **Etapa 5** del flujo de trabajo principal.

**Responsabilidades:**
- Configurar opciones de limpieza (stopwords, normalización, idioma)
- Procesar textos TXT descargados en etapa anterior
- Mostrar estadísticas y visualizaciones de los resultados
- Persistir textos preprocesados en Google Drive
- Gestionar caché local y remoto para optimización

## 🔄 Flujo de Ejecución

```
Usuario navega a "5. Preprocesamiento"
    ↓
render() → Muestra 3 pestañas
    ↓
Pestaña 1: CONFIGURACIÓN
    ├─→ Usuario configura opciones
    ├─→ Guarda config en session_state
    └─→ Rerun de la página
    ↓
Pestaña 2: RESUMEN DE PREPROCESAMIENTO
    ├─→ Verificar caché local → Si existe, cargar
    ├─→ Si no, verificar caché Drive → Si existe, cargar
    ├─→ Si no, verificar si existe carpeta 04_TXT_Preprocessed
    │   ├─→ Si existe → Cargar textos preprocesados
    │   └─→ Si no → Procesar desde TXT originales
    ├─→ Mostrar estadísticas globales
    ├─→ Mostrar gráficos (barras, pie chart)
    └─→ Mostrar tabla detallada por documento
    ↓
Pestaña 3: PERSISTENCIA
    ├─→ Crear carpeta 04_TXT_Preprocessed en Drive
    ├─→ Guardar textos preprocesados
    └─→ Confirmar éxito
```

---

## 📚 Librerías Utilizadas

### Líneas 5-8: Importaciones

```python
import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from components.ui.helpers import show_section_header, get_connector
```

**¿Qué hace cada librería?**

- **`streamlit as st`**: Framework para crear UI web
  - **Dónde se usa**: En toda la página para crear elementos UI
  - **Ejemplos**: `st.tabs()`, `st.button()`, `st.checkbox()`, `st.plotly_chart()`

- **`pandas as pd`**: Manipulación de datos tabulares
  - **Dónde se usa**: Líneas 465, 537 - para crear DataFrames con resultados
  - **Para qué**: Mostrar tablas con estadísticas de preprocesamiento

- **`plotly.graph_objects as go`**: Creación de gráficos interactivos
  - **Dónde se usa**: Líneas 426-448 - para gráficos de barras y pie charts
  - **Para qué**: Visualizar frecuencias de palabras y distribución de tokens

- **`components.ui.helpers`**: Funciones auxiliares de UI
  - **`show_section_header`**: Muestra encabezado de sección
  - **`get_connector`**: Obtiene el conector de Google Drive del session_state

---

## 🔧 Función Principal: `render()`

### Estructura General (Líneas 11-596)

```python
def render():
    """Renderiza la página de preprocesamiento de textos con 3 pestañas"""
```

Esta función es la **única función exportada** del módulo y se llama desde `app.py` cuando el usuario navega a esta página.

**Estructura:**
1. Encabezado y validación
2. Pestaña 1: Configuración
3. Pestaña 2: Resumen de Preprocesamiento
4. Pestaña 3: Persistencia

---

## 📋 Pestaña 1: Configuración (Líneas 24-74)

### Propósito

Permitir al usuario configurar las opciones de preprocesamiento.

### Código Clave

#### Líneas 27-50: Controles de Configuración

```python
col1, col2 = st.columns(2)

with col1:
    remove_stopwords = st.checkbox(
        "Remover stopwords", value=True,
        help="Elimina palabras comunes sin significado (ej: 'el', 'la', 'de', 'en')")

    normalization = st.radio(
        "Selecciona tipo de normalización",
        ["Ninguna", "Stemming", "Lematización"],
        index=2,
        help="Stemming: reduce palabras a su raíz | Lematización: reduce palabras a su forma base"
    )

with col2:
    language = st.selectbox(
        "Idioma para procesamiento",
        ["english", "spanish", "french", "german", "italian"],
        index=0,
        help="Selecciona el idioma para el procesamiento del texto"
    )
```

**¿Qué hace este código?**

- **`st.columns(2)`**: Crea dos columnas para layout
- **Columna 1**:
  - **`st.checkbox`**: Checkbox para habilitar/deshabilitar remoción de stopwords
    - **`value=True`**: Habilitado por defecto
  - **`st.radio`**: Radio buttons para seleccionar tipo de normalización
    - **Opciones**: Ninguna, Stemming, Lematización
    - **`index=2`**: "Lematización" seleccionada por defecto
- **Columna 2**:
  - **`st.selectbox`**: Dropdown para seleccionar idioma
    - **Default**: English (index 0)

#### Líneas 55-72: Guardar Configuración

```python
apply_stemming = normalization == "Stemming"
apply_lemmatization = normalization == "Lematización"

if st.button("▶️ Procesar Textos", type="primary", width='stretch'):
    st.session_state.preprocessing_config = {
        'remove_stopwords': remove_stopwords,
        'apply_stemming': apply_stemming,
        'apply_lemmatization': apply_lemmatization,
        'language': language
    }
    st.success("✓ Configuración guardada...")
    st.rerun()
```

**¿Qué hace este código?**

1. **Líneas 55-56**: Convierte la selección de radio button a booleanos
   - Si "Stemming" → `apply_stemming = True`
   - Si "Lematización" → `apply_lemmatization = True`

2. **Línea 65**: Botón para procesar
   - **`type="primary"`**: Estilo destacado (azul)
   - **`width='stretch'`**: Ocupa todo el ancho disponible

3. **Líneas 67-72**: Cuando se hace clic:
   - Guarda configuración en `session_state.preprocessing_config`
   - Muestra mensaje de éxito
   - **`st.rerun()`**: Recarga la página para aplicar cambios

---

## 📊 Pestaña 2: Resumen (Líneas 77-506)

Esta es la pestaña más compleja. Implementa un **sistema de caché multinivel** y procesamiento de textos.

### Sistema de Caché Multinivel

El sistema tiene 3 niveles de caché:

1. **Caché Local** (más rápido)
2. **Caché en Google Drive** (medio)
3. **Archivos preprocesados en Drive** (más lento)
4. **Procesamiento desde cero** (más lento aún)

### Nivel 1: Caché Local (Líneas 88-98)

```python
from src.utils.local_cache import LocalCache

local_cache = LocalCache('preprocessing')
cached_results = local_cache.load(config=config)

if cached_results:
    st.success("✅ Resultados de preprocesamiento cargados desde caché local")
    st.session_state.preprocessing_results = cached_results
    st.rerun()
```

**¿Qué hace este código?**

- Intenta cargar resultados del caché local
- Si existen → Carga instantánea
- Si no existen → Continúa al siguiente nivel

**Ventaja**: Instantáneo (sin conexión a Drive)

### Nivel 2: Caché en Drive (Líneas 100-122)

```python
from components.ui.helpers import get_or_load_cached_results

cached_results_drive, folder_04 = get_or_load_cached_results(
    "04_TXT_Preprocessed",
    "preprocessing_results.json",
    source_files=st.session_state.txt_files
)

if cached_results_drive:
    st.success("✅ Resultados de preprocesamiento cargados desde Drive")
    st.session_state.preprocessing_results = cached_results_drive
    # Guardar en caché local para próxima vez
    local_cache.save(...)
    st.rerun()
```

**¿Qué hace este código?**

- Busca archivo `preprocessing_results.json` en Drive
- Si existe → Descarga y carga
- **Guarda en caché local** para siguiente ejecución
- Si no existe → Continúa al siguiente nivel

**Ventaja**: No reprocesa, solo descarga JSON

### Nivel 3: Archivos Preprocesados (Líneas 138-236)

```python
# Si existe carpeta 04_TXT_Preprocessed, cargar directamente
if folder_04:
    # Listar archivos preprocesados
    all_preprocessed_files = connector.list_files_in_folder(folder_04)

    # Descargar y tokenizar
    for file_info in preprocessed_files:
        file_content = connector.read_file_content(file_id)
        text = file_content.read().decode('utf-8')
        tokens = text.strip().split()

        # Crear bolsa de palabras
        bolsa = preprocessor.crear_bolsa_palabras_documento(tokens, doc_name)
```

**¿Qué hace este código?**

- Si ya se procesaron textos en ejecución anterior:
  - Descarga archivos TXT preprocesados de Drive
  - Los tokeniza (split por espacios)
  - Crea bolsas de palabras
- **Guarda en caché local** para próximas ejecuciones

**Ventaja**: No preprocesa desde cero, solo lee tokens

### Nivel 4: Procesamiento Desde Cero (Líneas 239-397)

```python
# Listar archivos TXT originales desde carpeta 03_TXT_Converted
txt_files_from_drive = connector.list_files_in_folder(folder_03)

# Leer archivos
for file_info in txt_files_from_drive:
    file_content = connector.read_file_content(file_id)
    text = file_content.read().decode('utf-8')
    texts_dict[file_name] = text

# Procesar textos
batch_results = preprocessor.procesar_batch_completo(
    texts_dict,
    remove_stopwords=config['remove_stopwords'],
    apply_stemming=config['apply_stemming'],
    apply_lemmatization=config['apply_lemmatization']
)

# Guardar en caché local
local_cache.save(results=batch_results, config=config)

# Guardar caché JSON en Drive
save_results_to_cache(folder_04, "preprocessing_results.json", batch_results)
```

**¿Qué hace este código?**

1. **Lee archivos TXT originales** de carpeta `03_TXT_Converted`
2. **Procesa textos** con `TextPreprocessor.procesar_batch_completo()`:
   - Limpia texto (minúsculas, puntuación)
   - Tokeniza
   - Remueve stopwords (si configurado)
   - Aplica stemming/lematización (si configurado)
   - Crea bolsas de palabras
3. **Guarda en caché local**
4. **Guarda en caché Drive** (JSON)

**Resultado**: `batch_results` contiene:
```python
{
    'documents': {
        'doc1.txt': {
            'tokens': [...],
            'token_count': 1500,
            'original_token_count': 2000,
            'unique_words': 400,
            'word_bag': Counter(...),
            'top_words': [('digital', 50), ...]
        },
        ...
    },
    'global_stats': {
        'total_documents': 10,
        'total_unique_words': 5000,
        'total_words': 20000,
        'avg_words_per_doc': 2000
    },
    'global_bag': Counter(...),
    'top_global_words': [('digital', 500), ...]
}
```

### Visualizaciones (Líneas 404-505)

#### Métricas Globales (Líneas 405-411)

```python
col1, col2, col3, col4 = st.columns(4)

col1.metric("Total Documentos", global_stats['total_documents'])
col2.metric("Palabras Únicas", f"{global_stats['total_unique_words']:,}")
col3.metric("Total Palabras", f"{global_stats['total_words']:,}")
col4.metric("Promedio por Doc", f"{global_stats['avg_words_per_doc']:.0f}")
```

**¿Qué muestra?**

4 métricas en tarjetas:
- Total de documentos procesados
- Total de palabras únicas en corpus
- Total de palabras (con repeticiones)
- Promedio de palabras por documento

#### Gráfico de Barras: Top Palabras (Líneas 420-435)

```python
top_words = results['top_global_words'][:15]
words = [w[0] for w in top_words]
freqs = [w[1] for w in top_words]

fig = go.Figure(data=[go.Bar(x=words, y=freqs)])
fig.update_layout(
    title='Top 15 Palabras Más Frecuentes',
    xaxis_title='Palabra',
    yaxis_title='Frecuencia',
    height=300
)
st.plotly_chart(fig, width='stretch')
```

**¿Qué hace este código?**

- Extrae las 15 palabras más frecuentes
- Crea un gráfico de barras con Plotly
- Muestra frecuencia de cada palabra

#### Gráfico Pie: Distribución de Tokens (Líneas 437-448)

```python
doc_names = list(documents.keys())[:10]
doc_counts = [documents[name]['token_count'] for name in doc_names]

fig = go.Figure(data=[go.Pie(
    labels=doc_names,
    values=doc_counts,
    hole=0.3  # Donut chart
)])
fig.update_layout(title='Distribución de Tokens (Top 10 Docs)', height=300)
st.plotly_chart(fig, width='stretch')
```

**¿Qué hace este código?**

- Toma los 10 primeros documentos
- Crea un gráfico de donut (pie chart con hueco)
- Muestra proporción de tokens por documento

#### Tabla Detallada (Líneas 452-466)

```python
report_data = []
for doc_name, doc_result in documents.items():
    report_data.append({
        'Documento': doc_name,
        'Tokens Originales': doc_result['original_token_count'],
        'Tokens Procesados': doc_result['token_count'],
        'Palabras Únicas': doc_result['unique_words'],
        'Reducción (%)': round((1 - doc_result['token_count'] / doc_result['original_token_count']) * 100, 2)
    })

report_df = pd.DataFrame(report_data)
st.dataframe(report_df, width='stretch')
```

**¿Qué hace este código?**

- Crea una fila por cada documento
- Calcula % de reducción: `(1 - procesados/originales) * 100`
- Muestra tabla interactiva con Pandas

**Ejemplo de tabla:**

| Documento | Tokens Originales | Tokens Procesados | Palabras Únicas | Reducción (%) |
|-----------|-------------------|-------------------|-----------------|---------------|
| doc1.txt  | 2000              | 1500              | 400             | 25.00         |
| doc2.txt  | 3000              | 2200              | 550             | 26.67         |

#### Análisis por Documento (Líneas 470-505)

```python
selected_doc = st.selectbox("Selecciona un documento", list(documents.keys()))

if selected_doc:
    doc_result = documents[selected_doc]

    # Gráfico de top palabras del documento
    top_words_doc = doc_result['top_words'][:20]
    words_doc = [w[0] for w in top_words_doc]
    freqs_doc = [w[1] for w in top_words_doc]

    fig = go.Figure(data=[go.Bar(x=words_doc, y=freqs_doc)])
    st.plotly_chart(fig)

    # Muestra de tokens
    tokens_preview = ' '.join(doc_result['tokens'][:100])
    st.text_area("Tokens", tokens_preview, height=200, disabled=True)
```

**¿Qué hace este código?**

- Permite seleccionar un documento específico
- Muestra top 20 palabras de ese documento
- Muestra vista previa de los primeros 100 tokens

---

## 💾 Pestaña 3: Persistencia (Líneas 508-596)

### Propósito

Guardar los textos preprocesados en Google Drive para:
- Persistencia entre sesiones
- Compartir con otros usuarios
- Usar en siguientes etapas del pipeline

### Código Clave (Líneas 543-594)

```python
if st.button("💾 Guardar Textos Preprocesados en Drive"):
    # Crear carpeta 04_TXT_Preprocessed
    folder_04 = connector.get_or_create_folder(
        st.session_state.parent_folder_id,
        "04_TXT_Preprocessed"
    )

    # Guardar cada documento
    for name, doc_result in documents.items():
        # Convertir tokens a texto
        processed_text = ' '.join(doc_result['tokens'])

        # Crear archivo TXT en Drive
        file_id = connector.create_text_file(
            folder_04,
            name,
            processed_text
        )

        saved_files.append({
            'name': name,
            'file_id': file_id,
            'token_count': doc_result['token_count'],
            'unique_words': doc_result['unique_words']
        })

    st.success(f"✓ {len(saved_files)} archivos guardados")
    st.balloons()  # Animación de celebración
```

**¿Qué hace este código?**

1. **Crea carpeta** `04_TXT_Preprocessed` en Drive (si no existe)
2. **Para cada documento**:
   - Une tokens con espacios: `['digital', 'transform'] → "digital transform"`
   - Crea archivo TXT en Drive con el texto procesado
   - Guarda metadata (nombre, ID, estadísticas)
3. **Muestra éxito** con animación de globos

**Formato de archivos guardados:**

```
04_TXT_Preprocessed/
├── doc1.txt          → "digital transform technolog busi innov..."
├── doc2.txt          → "artifici intellig machin learn data..."
└── doc3.txt          → "cloud comput servic platform infrastuctur..."
```

Cada archivo contiene los tokens procesados separados por espacios.

---

## 🔗 Dependencias de Otros Archivos

### Archivos que `preprocesamiento.py` IMPORTA:

```
preprocesamiento.py
  ├─→ streamlit (framework UI)
  ├─→ pandas (tablas)
  ├─→ plotly.graph_objects (gráficos)
  ├─→ components/ui/helpers.py
  │   ├─→ show_section_header()
  │   ├─→ get_connector()
  │   ├─→ get_or_load_cached_results()
  │   └─→ save_results_to_cache()
  ├─→ src/utils/local_cache.py
  │   └─→ LocalCache
  └─→ session_state (Streamlit)
      ├─→ txt_files (de etapa anterior)
      ├─→ text_preprocessor (TextPreprocessor)
      ├─→ drive_connector (GoogleDriveConnector)
      └─→ persistence_folders
```

### Archivos que USAN los resultados de `preprocesamiento.py`:

- **`bolsa_palabras.py`**: Usa `preprocessing_results` para análisis BoW
- **`analisis_tfidf.py`**: Usa textos preprocesados para TF-IDF
- **`analisis_factores.py`**: Usa resultados para clustering
- **Todos los modelos avanzados**: Usan textos preprocesados

---

## 💡 Conceptos Clave para Principiantes

### 1. ¿Qué es el Preprocesamiento de Textos?

Es **limpiar y normalizar textos** para análisis. Incluye:

- **Limpieza**:
  - Convertir a minúsculas
  - Eliminar puntuación
  - Eliminar números
  - Eliminar caracteres especiales

- **Tokenización**: Dividir texto en palabras
  - **Antes**: `"Digital transformation is key"`
  - **Después**: `['Digital', 'transformation', 'is', 'key']`

- **Remoción de Stopwords**: Eliminar palabras comunes sin significado
  - **Antes**: `['Digital', 'transformation', 'is', 'key']`
  - **Después**: `['Digital', 'transformation', 'key']`

- **Normalización**:
  - **Stemming**: Reducir a raíz (simple pero impreciso)
    - `running → run`, `transformation → transform`
  - **Lematización**: Reducir a forma base (preciso pero lento)
    - `running → run`, `better → good`

### 2. ¿Por qué Preprocesar?

**Ventajas:**
- **Reduce dimensionalidad**: Menos palabras únicas
- **Mejora análisis**: Agrupa variaciones (`transform`, `transforming`, `transformed` → `transform`)
- **Elimina ruido**: Stopwords no aportan significado

**Ejemplo:**

```
Texto original (10 palabras):
"Digital transformation is transforming businesses and enterprises"

Después de preprocesamiento (4 palabras):
"digital transform transform busi enterpris"
```

### 3. ¿Qué es una Bolsa de Palabras (Bag of Words)?

Es un **contador de palabras** por documento:

```python
{
    'digital': 5,
    'transform': 3,
    'business': 2,
    ...
}
```

**Uso**: Identificar términos más importantes de un documento.

### 4. ¿Por qué Sistema de Caché Multinivel?

**Problema**: Procesar textos es costoso (tiempo y recursos)

**Solución**: Caché en múltiples niveles:
1. **Local**: Instantáneo, no requiere internet
2. **Drive**: Rápido, solo descarga JSON
3. **Archivos preprocesados**: Medio, solo tokeniza
4. **Desde cero**: Lento, procesa todo

**Beneficio**: Mejora dramática de performance en ejecuciones posteriores.

### 5. ¿Qué es `session_state`?

Es la **memoria de la aplicación Streamlit**. Guarda datos entre reruns:

```python
# Guardar
st.session_state.preprocessing_results = resultados

# Usar después
if 'preprocessing_results' in st.session_state:
    resultados = st.session_state.preprocessing_results
```

---

## 🎯 Mejores Prácticas Implementadas

### 1. Validación de Prerequisitos

```python
if 'txt_files' not in st.session_state or not st.session_state.txt_files:
    st.warning("⚠️ No hay archivos TXT disponibles...")
    return
```

Evita errores mostrando mensaje claro al usuario.

### 2. Sistema de Caché Multinivel

Optimiza performance con 4 niveles de caché.

### 3. Progress Bars y Status Text

```python
progress_bar = st.progress(0)
status_text = st.empty()

for i, file in enumerate(files):
    status_text.text(f"Procesando {i+1}/{total}: {file}")
    # ... proceso
    progress_bar.progress((i + 1) / total)

status_text.empty()
progress_bar.empty()
```

Feedback visual al usuario durante operaciones largas.

### 4. Manejo de Errores

```python
try:
    # operación
except Exception as e:
    st.error(f"❌ Error: {type(e).__name__}: {e}")
    return
```

Captura y muestra errores de forma amigable.

### 5. Separación en Pestañas

Organiza funcionalidad relacionada en pestañas:
- **Configuración**: Solo configurar
- **Resumen**: Solo visualizar
- **Persistencia**: Solo guardar

Evita saturar al usuario.

---

## 🔍 Resumen

**`preprocesamiento.py`** es una **página compleja de UI** responsable de:

✅ Configurar opciones de preprocesamiento
✅ Implementar caché multinivel para performance
✅ Procesar textos (limpieza, tokenización, normalización)
✅ Mostrar estadísticas y visualizaciones detalladas
✅ Persistir resultados en Google Drive

**Flujo simplificado:**

1. Usuario configura opciones
2. Sistema busca en caché (local → Drive → preprocesados)
3. Si no existe, procesa desde TXT originales
4. Muestra resultados con gráficos y tablas
5. Usuario guarda en Drive para siguientes etapas

**Para modificar:**
- Agregar nueva opción de normalización: Modificar línea 36-41
- Cambiar gráficos: Modificar líneas 415-505
- Agregar validaciones: Modificar líneas 16-19

---

**Archivo**: `preprocesamiento.py`
**Líneas de código**: 596
**Complejidad**: Alta
**Importancia**: ⭐⭐⭐⭐⭐ (Crítico - Etapa clave del pipeline)

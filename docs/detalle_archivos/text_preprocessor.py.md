# 📄 Documentación Detallada: `text_preprocessor.py`

## 📍 Ubicación
```
C:\Projects\Tesis\analisis_transformacion_digital\src\text_preprocessor.py
```

## 🎯 Propósito
Este archivo es el motor de **preprocesamiento de texto avanzado** del proyecto. Se encarga de limpiar, normalizar y transformar textos en bruto en datos estructurados listos para análisis. Implementa técnicas de NLP (Procesamiento de Lenguaje Natural) como tokenización, eliminación de stopwords, stemming, lematización y creación de bolsas de palabras.

Es el archivo **más complejo del proyecto** en términos de procesamiento de texto, con 1039 líneas de código altamente especializado.

## 🔄 Flujo de Ejecución
```
INICIO
  ↓
1. INICIALIZACIÓN
   - Descargar recursos NLTK (si no existen)
   - Cargar stopwords (inglés + español + personalizadas)
   - Configurar stemmer y lemmatizer
   ↓
2. LIMPIEZA DE TEXTO
   - Convertir a minúsculas
   - Eliminar URLs, emails, caracteres especiales
   - Normalizar espacios
   ↓
3. TOKENIZACIÓN
   - Dividir texto en palabras individuales
   - Filtrar palabras muy cortas/largas
   ↓
4. ELIMINACIÓN DE STOPWORDS
   - Remover palabras comunes sin significado
   - Aplicar lista personalizada de exclusiones
   ↓
5. STEMMING/LEMATIZACIÓN (opcional)
   - Reducir palabras a su raíz
   ↓
6. CREACIÓN DE BOLSA DE PALABRAS
   - Contar frecuencias de cada palabra
   - Generar estadísticas
   ↓
7. ANÁLISIS TF-IDF (opcional)
   - Calcular importancia de términos
   - Normalizar valores
   ↓
FIN
```

## 📚 Librerías Utilizadas

### Líneas 6-19: Importaciones Principales
```python
import re
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.preprocessing import normalize
import nltk
from nltk.corpus import stopwords
from nltk.stem import SnowballStemmer
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from collections import defaultdict, Counter
from typing import Dict, List, Tuple, Set, Optional, Union, Any
from scipy.sparse import csr_matrix
from numpy.typing import NDArray
```

**¿Qué hace cada librería?**

- **`re`**: Expresiones regulares para búsqueda y limpieza de patrones de texto
  - **Dónde se usa**: Líneas 200-216 (limpiar URLs, emails, caracteres especiales)
  - **Para qué**: Eliminar elementos no deseados del texto con patrones

- **`pandas`**: Manipulación de datos tabulares
  - **Dónde se usa**: Líneas 669-674, 818-822 (crear DataFrames)
  - **Para qué**: Organizar resultados en tablas para visualización

- **`numpy`**: Operaciones numéricas y matriciales
  - **Dónde se usa**: Línea 722 (cálculo de IDF)
  - **Para qué**: Operaciones matemáticas eficientes en matrices

- **`sklearn.feature_extraction.text`**: Vectorización de texto
  - **Dónde se usa**: Líneas 655, 795 (CountVectorizer, TfidfVectorizer)
  - **Para qué**: Convertir texto en matrices numéricas (BoW y TF-IDF)

- **`sklearn.preprocessing.normalize`**: Normalización de datos
  - **Dónde se usa**: Línea 825 (normalización L2)
  - **Para qué**: Normalizar vectores TF-IDF para comparación justa

- **`nltk`**: Natural Language Toolkit - herramientas NLP
  - **Dónde se usa**: Líneas 40-65, 305-314 (recursos, tokenización)
  - **Para qué**: Procesamiento avanzado de lenguaje natural

- **`nltk.corpus.stopwords`**: Lista de palabras vacías
  - **Dónde se usa**: Líneas 68-81 (cargar stopwords)
  - **Para qué**: Identificar palabras sin significado relevante

- **`nltk.stem.SnowballStemmer`**: Algoritmo de stemming
  - **Dónde se usa**: Línea 160, 285-286 (reducir palabras a raíz)
  - **Para qué**: "corriendo" → "corr", "corrió" → "corr"

- **`nltk.tokenize.word_tokenize`**: Tokenizador de palabras
  - **Dónde se usa**: Línea 306 (dividir texto en palabras)
  - **Para qué**: Separar texto en tokens individuales

- **`nltk.stem.WordNetLemmatizer`**: Lematizador de palabras
  - **Dónde se usa**: Líneas 165-168, 368 (lematización)
  - **Para qué**: "corriendo" → "correr", "corrió" → "correr"

- **`collections.defaultdict, Counter`**: Estructuras de datos especializadas
  - **Dónde se usa**: Líneas 36, 172, 182, 392 (conteo de palabras)
  - **Para qué**: Contar frecuencias de forma eficiente

- **`scipy.sparse.csr_matrix`**: Matrices dispersas (sparse)
  - **Dónde se usa**: Líneas 18, 738-739 (matrices TF-IDF)
  - **Para qué**: Almacenar matrices grandes de forma eficiente

## 🔧 Clase Principal: `TextPreprocessor`

### Clase: `TextPreprocessor`
**Líneas 22-1039**

La clase principal que encapsula todas las funciones de preprocesamiento de texto.

**Parámetros del Constructor:**
- `language` (str): Idioma para procesamiento (default: 'english')

**Métodos principales (49 métodos en total):**

#### 1. **Inicialización y Configuración**
- `__init__()`: Inicializa el preprocesador (líneas 25-41)
- `_ensure_nltk_resources()`: Descarga recursos NLTK necesarios (líneas 42-169)

#### 2. **Limpieza de Texto**
- `clean_text_basic()`: Limpieza básica (líneas 183-221)
- `clean_text_advanced()`: Limpieza avanzada con filtros (líneas 223-251)
- `remove_stopwords()`: Elimina palabras vacías (líneas 253-269)
- `apply_stemming()`: Aplica stemming (líneas 271-287)

#### 3. **Tokenización Especializada**
- `tokenizar_texto()`: Divide texto en tokens (líneas 291-314)
- `eliminar_stopwords_tokens()`: Elimina stopwords de tokens (líneas 316-332)
- `aplicar_stemming_tokens()`: Aplica stemming a tokens (líneas 334-350)
- `lematizar_tokens()`: Aplica lematización a tokens (líneas 352-368)

#### 4. **Bolsa de Palabras**
- `crear_bolsa_palabras_documento()`: Crea BoW para un documento (líneas 370-383)
- `obtener_bolsa_palabras_global()`: BoW combinada de todos los docs (líneas 385-395)
- `obtener_estadisticas_bolsas()`: Estadísticas de BoW (líneas 397-424)
- `obtener_top_palabras_documento()`: Top N palabras de un doc (líneas 426-440)
- `obtener_top_palabras_global()`: Top N palabras globales (líneas 442-453)

#### 5. **Procesamiento Completo**
- `procesar_texto_completo()`: Pipeline completo para 1 texto (líneas 455-505)
- `procesar_batch_completo()`: Pipeline para múltiples textos (líneas 507-545)

#### 6. **Análisis TF-IDF**
- `create_bag_of_words()`: Crea matriz BoW con sklearn (líneas 631-689)
- `create_tfidf_from_bow()`: TF-IDF desde BoW (estilo Colab) (líneas 691-752)
- `create_tfidf_matrix()`: TF-IDF directo con sklearn (líneas 754-856)

#### 7. **Análisis y Reportes**
- `get_top_terms_global()`: Términos más frecuentes globalmente (líneas 858-881)
- `get_top_tfidf_terms()`: Términos con mayor TF-IDF (líneas 883-924)
- `get_tfidf_heatmap_data()`: Datos para heatmap de TF-IDF (líneas 926-963)
- `analyze_vocabulary_overlap()`: Analiza solapamiento de vocabulario (líneas 1000-1038)

**Cómo funciona el flujo principal:**

```python
# 1. Crear instancia del preprocesador
preprocessor = TextPreprocessor(language='spanish')

# 2. Procesar un texto individual
resultado = preprocessor.procesar_texto_completo(
    text="Este es un texto de ejemplo...",
    document_id="doc1",
    remove_stopwords=True,
    apply_lemmatization=True
)

# 3. Procesar múltiples documentos
textos_dict = {
    "doc1": "Primer documento...",
    "doc2": "Segundo documento..."
}
resultados = preprocessor.procesar_batch_completo(
    textos_dict,
    remove_stopwords=True,
    apply_lemmatization=True
)

# 4. Crear bolsa de palabras
bow_result = preprocessor.create_bag_of_words(textos_dict)

# 5. Calcular TF-IDF desde BoW (método Colab)
tfidf_result = preprocessor.create_tfidf_from_bow(bow_result)

# 6. Obtener top términos
top_terms = preprocessor.get_top_tfidf_terms(tfidf_result, top_n=20)
```

## 💡 Conceptos Clave para Principiantes

### 1. **¿Qué es Tokenización?**
Es dividir un texto en "palabras" individuales (tokens).
```
Texto: "El gato come pescado"
Tokens: ["El", "gato", "come", "pescado"]
```

### 2. **¿Qué son Stopwords?**
Son palabras muy comunes que no aportan significado ("el", "la", "de", "en", etc.). Se eliminan para enfocarse en palabras importantes.
```
Original: ["El", "gato", "come", "pescado"]
Sin stopwords: ["gato", "come", "pescado"]
```

### 3. **¿Qué es Stemming?**
Reduce palabras a su raíz eliminando sufijos/prefijos.
```
"corriendo", "corrió", "correr" → "corr"
```
**Ventaja**: Agrupa variantes de la misma palabra
**Desventaja**: La raíz puede no ser una palabra real

### 4. **¿Qué es Lematización?**
Similar al stemming, pero produce palabras reales.
```
"corriendo", "corrió", "correr" → "correr"
```
**Ventaja**: Produce palabras válidas
**Desventaja**: Más lento que stemming

### 5. **¿Qué es Bolsa de Palabras (BoW)?**
Cuenta cuántas veces aparece cada palabra en un documento.
```
Texto: "gato come pescado, gato duerme"
BoW: {"gato": 2, "come": 1, "pescado": 1, "duerme": 1}
```

### 6. **¿Qué es TF-IDF?**
**TF** (Term Frequency): Frecuencia de la palabra en el documento
**IDF** (Inverse Document Frequency): Qué tan rara es la palabra en todos los documentos

```
TF-IDF alto = Palabra frecuente en ESTE documento pero rara en OTROS
TF-IDF bajo = Palabra muy común en todos los documentos
```

**Fórmula simplificada:**
```
TF = (veces que aparece la palabra) / (total de palabras en el doc)
IDF = log(total de documentos / documentos que tienen la palabra)
TF-IDF = TF × IDF
```

### 7. **¿Por qué dos métodos de TF-IDF?**
- **`create_tfidf_from_bow()`**: Calcula TF-IDF manualmente (como en Colab) para entender la fórmula
- **`create_tfidf_matrix()`**: Usa sklearn (más rápido y optimizado) para producción

### 8. **¿Qué es Normalización L2?**
Escala los vectores para que tengan longitud 1, permitiendo comparación justa entre documentos de diferente tamaño.

## 🔗 Dependencias de Otros Archivos

### Archivos que ESTE archivo IMPORTA:
```
NINGUNO (es un módulo independiente)
```

### Archivos que USAN este archivo:
```
→ components/pages/preprocesamiento.py (usa TextPreprocessor para limpiar textos)
→ components/pages/bolsa_palabras.py (usa métodos de BoW)
→ components/pages/analisis_tfidf.py (usa métodos TF-IDF)
→ src/nlp_processor.py (podría usar funcionalidades)
```

## 🔍 Resumen

**`text_preprocessor.py`** es responsable de:
✅ Limpiar y normalizar textos en bruto
✅ Tokenizar textos en palabras individuales
✅ Eliminar palabras vacías (stopwords)
✅ Aplicar stemming y lematización
✅ Crear bolsas de palabras por documento
✅ Calcular matrices TF-IDF con dos métodos diferentes
✅ Generar estadísticas y reportes de procesamiento
✅ Analizar vocabulario y solapamiento entre documentos
✅ Preparar datos para análisis avanzados (clustering, clasificación)

**Flujo simplificado:**
```
1. Texto sucio → 2. Limpieza → 3. Tokenización →
4. Eliminar stopwords → 5. Stemming/Lematización →
6. Bolsa de palabras → 7. TF-IDF → 8. Listo para análisis
```

**Para modificar:**
- **Agregar stopwords personalizadas**: Editar líneas 84-153
- **Cambiar algoritmo de limpieza**: Modificar `clean_text_basic()` (líneas 183-221)
- **Ajustar parámetros TF-IDF**: Cambiar `max_features`, `min_df`, `max_df` en líneas 655-660 o 795-800

**Archivo**: `text_preprocessor.py`
**Líneas de código**: 1039
**Complejidad**: Alta (⭐⭐⭐⭐⭐)
**Importancia**: ⭐⭐⭐⭐⭐ (Crítico - núcleo del preprocesamiento)

---

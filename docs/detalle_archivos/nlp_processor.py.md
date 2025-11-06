# 📄 Documentación Detallada: `nlp_processor.py`

## 📍 Ubicación
```
C:\Projects\Tesis\analisis_transformacion_digital\src\nlp_processor.py
```

## 🎯 Propósito
Este archivo es el **procesador de NLP simplificado** del proyecto. Mientras que `text_preprocessor.py` es muy completo y complejo, este archivo ofrece una interfaz más simple y enfocada en el análisis de **factores de transformación digital**. Identifica menciones de palabras clave relacionadas con tecnología, innovación, capacitación, etc.

Es ideal para análisis rápidos y detección de temas específicos del dominio de transformación digital.

## 🔄 Flujo de Ejecución
```
INICIO
  ↓
1. INICIALIZACIÓN
   - Descargar recursos NLTK
   - Cargar stopwords del idioma
   - Configurar stemmer
   - Definir palabras clave por factor
   ↓
2. LIMPIEZA DE TEXTO
   - Minúsculas
   - Eliminar URLs y emails
   - Normalizar caracteres
   ↓
3. TOKENIZACIÓN
   - Dividir en palabras
   - Aplicar NLTK tokenizer
   ↓
4. PROCESAMIENTO
   - Eliminar stopwords
   - Aplicar stemming
   - Contar frecuencias
   ↓
5. IDENTIFICACIÓN DE FACTORES
   - Buscar palabras clave por categoría
   - Contar menciones por factor
   ↓
6. GENERACIÓN DE RESULTADOS
   - Estadísticas por documento
   - Factores identificados
   ↓
FIN
```

## 📚 Librerías Utilizadas

### Líneas 6-14: Importaciones
```python
import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.stem import SnowballStemmer
from collections import Counter
from typing import Dict, List, Tuple, Set, Union, Optional, Counter as CounterType
import pandas as pd
from src.utils.logger import get_logger
```

**¿Qué hace cada librería?**
- **`nltk`**: Herramientas de NLP (tokenización, stopwords, stemming)
- **`re`**: Expresiones regulares para limpieza de texto
- **`Counter`**: Conteo eficiente de frecuencias
- **`pandas`**: Crear DataFrames con resultados

## 🔧 Funciones y Clases

### Función: `descargar_recursos_nltk()`
**Líneas 20-42**

Descarga recursos NLTK necesarios solo si no están instalados.

```python
def descargar_recursos_nltk():
    recursos_necesarios = {
        'tokenizers/punkt': 'punkt',
        'corpora/stopwords': 'stopwords',
        'tokenizers/punkt_tab': 'punkt_tab'
    }
```

**Para qué**: Evita descargas innecesarias, optimiza tiempo de inicio

### Clase: `ProcessadorTexto`
**Líneas 44-278**

Clase principal para procesar textos con enfoque en transformación digital.

**Parámetros del Constructor:**
- `idioma` (str): Idioma para procesamiento (default: 'spanish')

**Atributos especiales:**
- `palabras_clave_transformacion`: Diccionario con 12 categorías de factores de transformación digital (líneas 66-81)

**Métodos principales (9 métodos):**

#### 1. **Limpieza**
- `limpiar_texto()`: Limpia y normaliza texto (líneas 83-115)
  - Convierte a minúsculas
  - Elimina URLs, emails
  - Normaliza espacios

#### 2. **Tokenización**
- `tokenizar()`: Divide texto en palabras (líneas 117-131)
  - Usa NLTK word_tokenize
  - Maneja errores gracefully

#### 3. **Procesamiento**
- `remover_stopwords()`: Elimina palabras vacías (líneas 133-143)
- `aplicar_stemming()`: Reduce palabras a raíz (líneas 145-155)

#### 4. **Análisis Completo**
- `procesar_texto_completo()`: Pipeline completo (líneas 157-194)
  - Limpia, tokeniza, filtra stopwords, aplica stemming
  - Calcula frecuencias
  - Retorna diccionario con todos los resultados

#### 5. **Extracción de Información**
- `extraer_oraciones()`: Divide texto en oraciones (líneas 196-210)
- `identificar_factores_mencionados()`: Identifica factores de TD (líneas 212-234)

#### 6. **Procesamiento Batch**
- `procesar_documentos()`: Procesa múltiples docs (líneas 236-263)
- `obtener_palabras_mas_frecuentes()`: Top N palabras (líneas 265-277)

## 💡 Conceptos Clave para Principiantes

### 1. **Diferencia con `text_preprocessor.py`**
```
nlp_processor.py:
  - Simple y enfocado
  - Identifica factores de transformación digital
  - Ideal para análisis rápidos
  - 278 líneas

text_preprocessor.py:
  - Completo y complejo
  - Todas las técnicas NLP
  - TF-IDF, BoW, normalización
  - 1039 líneas
```

### 2. **¿Qué son los Factores de Transformación Digital?**
Son las categorías clave que definen la transformación digital:

```python
self.palabras_clave_transformacion = {
    'tecnología': ['tecnología', 'digital', 'digitalización'],
    'innovación': ['innovación', 'innovar', 'innovador'],
    'datos': ['datos', 'data', 'información', 'analítica'],
    'capacitación': ['capacitación', 'formación', 'entrenamiento'],
    # ... más categorías
}
```

### 3. **¿Cómo identifica factores?**
Busca palabras clave en el texto y cuenta cuántas veces aparecen:

```python
texto = "La tecnología digital y la innovación son clave"
factores = identificar_factores_mencionados(texto)
# Resultado:
# {
#   'tecnología': 2,  # "tecnología" + "digital"
#   'innovación': 1
# }
```

### 4. **Procesamiento Simplificado**
```python
procesador = ProcessadorTexto(idioma='spanish')

resultado = procesador.procesar_texto_completo(
    "La transformación digital requiere capacitación"
)

# resultado contiene:
# {
#   'texto_limpio': "transformación digital requiere capacitación",
#   'tokens': ["transformación", "digital", "requiere", "capacitación"],
#   'tokens_stem': ["transform", "digit", "requier", "capacit"],
#   'frecuencias': Counter({'transformación': 1, 'digital': 1, ...}),
#   'num_palabras': 4
# }
```

## 🔗 Dependencias de Otros Archivos

### Archivos que ESTE archivo IMPORTA:
```
→ src/utils/logger.py (línea 14) - Para logging
```

### Archivos que USAN este archivo:
```
→ Potencialmente usado por análisis de factores
→ Puede ser usado como alternativa a text_preprocessor.py
```

## 🔍 Resumen

**`nlp_processor.py`** es responsable de:
✅ Procesamiento NLP simplificado y rápido
✅ Identificación de factores de transformación digital
✅ Limpieza y normalización de texto
✅ Tokenización y stemming
✅ Análisis de frecuencias de palabras
✅ Extracción de oraciones
✅ Procesamiento batch de múltiples documentos

**Flujo simplificado:**
```
1. Texto → 2. Limpiar → 3. Tokenizar →
4. Eliminar stopwords → 5. Stemming →
6. Identificar factores → 7. Resultados
```

**Para modificar:**
- **Agregar factores**: Editar `palabras_clave_transformacion` (líneas 66-81)
- **Cambiar stopwords**: Modificar línea 60
- **Ajustar limpieza**: Editar `limpiar_texto()` (líneas 83-115)

**Archivo**: `nlp_processor.py`
**Líneas de código**: 278
**Complejidad**: Media (⭐⭐⭐)
**Importancia**: ⭐⭐⭐⭐ (Importante - análisis de factores)

---

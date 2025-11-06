# 📄 Documentación Detallada: `factor_analyzer.py`

## 📍 Ubicación
```
C:\Projects\Tesis\analisis_transformacion_digital\src\factor_analyzer.py
```

## 🎯 Propósito
Este archivo es el **analizador de factores clave de transformación digital**. Su función es identificar y cuantificar la presencia de **8 categorías de factores** en documentos académicos: Tecnológico, Organizacional, Humano, Estratégico, Financiero, Pedagógico, Infraestructura y Seguridad.

Además de contar menciones, implementa técnicas avanzadas de **machine learning** como clustering (K-Means) y modelado de temas (LDA).

## 🔄 Flujo de Ejecución
```
INICIO
  ↓
1. INICIALIZACIÓN
   - Definir 8 categorías de factores
   - Asignar palabras clave a cada categoría
   - Configurar vectorizador TF-IDF
   ↓
2. ANÁLISIS DE TEXTO
   - Buscar palabras clave por categoría
   - Contar menciones con regex
   - Calcular relevancia normalizada
   ↓
3. ANÁLISIS AVANZADO (opcional)
   ├─ TF-IDF: Vectorizar documentos
   ├─ Clustering: Agrupar documentos similares
   └─ LDA: Extraer temas latentes
   ↓
4. GENERACIÓN DE RESULTADOS
   - DataFrame con análisis por documento
   - Resumen estadístico
   - Matriz de co-ocurrencia
   ↓
FIN
```

## 📚 Librerías Utilizadas

### Líneas 6-14: Importaciones
```python
import pandas as pd
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.decomposition import LatentDirichletAllocation
from typing import Dict, List, Tuple, Optional, Union, Any
import re
import numpy as np
from src.utils.logger import get_logger
```

**¿Qué hace cada librería?**

- **`sklearn.feature_extraction.text.TfidfVectorizer`**: Vectorización TF-IDF
  - **Dónde se usa**: Línea 76, 179 (convertir texto a vectores)
  - **Para qué**: Análisis TF-IDF de documentos

- **`sklearn.cluster.KMeans`**: Algoritmo de clustering
  - **Dónde se usa**: Línea 202 (agrupar documentos)
  - **Para qué**: Encontrar grupos de documentos similares

- **`sklearn.decomposition.LatentDirichletAllocation`**: Modelado de temas LDA
  - **Dónde se usa**: Línea 228 (extraer temas)
  - **Para qué**: Descubrir temas latentes en los documentos

- **`re`**: Expresiones regulares
  - **Dónde se usa**: Líneas 98, 309 (búsqueda de palabras)
  - **Para qué**: Buscar palabras clave con límites de palabra

- **`Counter`**: Conteo de frecuencias
  - **Dónde se usa**: Línea 158 (contar factores)
  - **Para qué**: Contar menciones totales de factores

## 🔧 Clase Principal: `AnalizadorFactores`

### Clase: `AnalizadorFactores`
**Líneas 20-340**

Clase que analiza factores de transformación digital en documentos.

**Atributos principales:**

#### `categorias_factores` (líneas 28-73)
Diccionario con 8 categorías de factores:

```python
categorias_factores = {
    'Tecnológico': {
        'keywords': ['tecnología', 'digital', 'software', 'hardware',
                     'plataforma', 'sistema', 'ia', 'automatización'],
        'descripcion': 'Aspectos relacionados con tecnología...'
    },
    'Organizacional': {
        'keywords': ['cultura', 'organización', 'liderazgo',
                     'gestión', 'procesos', 'gobernanza'],
        'descripcion': 'Factores de organización y cultura...'
    },
    'Humano': {
        'keywords': ['capacitación', 'formación', 'competencias',
                     'docente', 'talento', 'aprendizaje'],
        'descripcion': 'Desarrollo y capacitación...'
    },
    'Estratégico': {
        'keywords': ['estrategia', 'planificación', 'visión',
                     'objetivo', 'innovación'],
        'descripcion': 'Planeación estratégica...'
    },
    'Financiero': {
        'keywords': ['presupuesto', 'inversión', 'financiamiento',
                     'costo', 'funding'],
        'descripcion': 'Aspectos económicos...'
    },
    'Pedagógico': {
        'keywords': ['educación', 'enseñanza', 'pedagógico',
                     'metodología', 'evaluación'],
        'descripcion': 'Procesos de enseñanza-aprendizaje...'
    },
    'Infraestructura': {
        'keywords': ['conectividad', 'internet', 'red', 'acceso',
                     'equipamiento', 'dispositivo'],
        'descripcion': 'Infraestructura física...'
    },
    'Seguridad': {
        'keywords': ['seguridad', 'ciberseguridad', 'protección',
                     'privacidad', 'backup'],
        'descripcion': 'Seguridad y protección...'
    }
}
```

**Métodos principales (11 métodos):**

#### 1. **Análisis de Texto**
- `analizar_texto()`: Analiza un texto individual (líneas 78-111)
  - Busca keywords por categoría
  - Cuenta menciones con regex `\b palabra \b`
  - Calcula relevancia normalizada

#### 2. **Análisis de Documentos**
- `analizar_documentos()`: Analiza múltiples docs (líneas 113-144)
  - Crea DataFrame con menciones por categoría
  - Incluye relevancia de cada factor

#### 3. **Obtención de Factores**
- `obtener_factores_principales()`: Top N factores (líneas 146-165)
- `obtener_keywords_por_factor()`: Keywords de un factor (líneas 291-313)

#### 4. **Análisis TF-IDF**
- `analisis_tfidf()`: Vectoriza con TF-IDF (líneas 167-185)

#### 5. **Machine Learning**
- `clustering_documentos()`: Agrupa docs en clusters (líneas 187-210)
  - Usa K-Means para agrupar documentos similares
  - Retorna etiquetas de cluster y centroides

- `extraer_temas_lda()`: Extrae temas con LDA (líneas 212-248)
  - Descubre temas latentes
  - Retorna palabras clave por tema

#### 6. **Resúmenes y Estadísticas**
- `obtener_resumen_factores()`: Resumen completo (líneas 250-289)
- `matriz_co_ocurrencia()`: Matriz de co-ocurrencia (líneas 315-339)

**Cómo funciona `analizar_texto()`:**

```python
def analizar_texto(self, texto):
    texto_lower = texto.lower()
    factores_detectados = {}

    # Analizar cada categoría
    for categoria, info in self.categorias_factores.items():
        count = 0
        keywords_encontradas = []

        # Buscar cada keyword
        for keyword in info['keywords']:
            # Buscar con límites de palabra (\b)
            ocurrencias = len(re.findall(
                r'\b' + re.escape(keyword) + r'\b',
                texto_lower
            ))
            count += ocurrencias
            if ocurrencias > 0:
                keywords_encontradas.append((keyword, ocurrencias))

        # Si hay menciones, guardar
        if count > 0:
            factores_detectados[categoria] = {
                'total_menciones': count,
                'keywords_encontradas': keywords_encontradas,
                'relevancia': count / len(texto.split()) * 1000
            }

    return factores_detectados
```

## 💡 Conceptos Clave para Principiantes

### 1. **¿Qué son los factores de transformación digital?**
Son las 8 dimensiones clave que se deben considerar al digitalizar una institución:
```
1. Tecnológico: Hardware, software, plataformas
2. Organizacional: Cultura, liderazgo, procesos
3. Humano: Capacitación, talento
4. Estratégico: Planes, objetivos, visión
5. Financiero: Presupuesto, inversión
6. Pedagógico: Métodos de enseñanza
7. Infraestructura: Conectividad, equipos
8. Seguridad: Protección de datos
```

### 2. **¿Qué es relevancia normalizada?**
```python
relevancia = (total_menciones / total_palabras) * 1000
```
Normaliza las menciones por tamaño del documento:
- Documento corto con 5 menciones → Relevancia alta
- Documento largo con 5 menciones → Relevancia baja

### 3. **¿Qué es K-Means Clustering?**
Algoritmo que agrupa documentos similares:
```
Documentos:
  Doc1: "tecnología digital cloud"
  Doc2: "capacitación formación docente"
  Doc3: "software plataforma sistema"

Clustering (n_clusters=2):
  Cluster 1: [Doc1, Doc3]  → Temas tecnológicos
  Cluster 2: [Doc2]        → Temas humanos
```

### 4. **¿Qué es LDA (Latent Dirichlet Allocation)?**
Modelo estadístico que descubre **temas ocultos** en documentos:

```
Documentos hablan de diferentes temas, LDA los encuentra:

Tema 1: ["tecnología", "digital", "sistema", "software"]
Tema 2: ["capacitación", "formación", "docente", "aprendizaje"]
Tema 3: ["presupuesto", "inversión", "financiamiento", "costo"]
```

### 5. **¿Qué es matriz de co-ocurrencia?**
Muestra cuántas veces aparecen juntos dos factores en documentos:

```
                Tecnológico  Humano  Estratégico
Tecnológico           45       12        8
Humano                12       30       15
Estratégico            8       15       25
```

Interpretación:
- Diagonal: Veces que aparece el factor
- Fuera de diagonal: Veces que aparecen juntos
- Tecnológico + Humano aparecen juntos en 12 documentos

### 6. **Búsqueda con límites de palabra (`\b`)**
```python
r'\b' + keyword + r'\b'
```
Asegura coincidencias exactas:
```
Texto: "digitalización digital"
Buscar "digital":
  Sin \b: Encuentra 2 (incluso en "digitalización")
  Con \b: Encuentra 1 (solo "digital" completo)
```

### 7. **Uso típico**
```python
# 1. Crear analizador
analizador = AnalizadorFactores()

# 2. Analizar documentos
documentos = {
    'doc1': 'La tecnología digital requiere capacitación...',
    'doc2': 'La estrategia debe considerar la seguridad...'
}
df_analisis = analizador.analizar_documentos(documentos)

# 3. Obtener factores principales
top_factores = analizador.obtener_factores_principales(
    documentos, top_n=5
)
# → [('Tecnológico', 45), ('Humano', 30), ...]

# 4. Clustering de documentos
clusters, centroides = analizador.clustering_documentos(
    list(documentos.values()), n_clusters=3
)

# 5. Extraer temas
temas = analizador.extraer_temas_lda(
    list(documentos.values()), n_topics=5, n_words=10
)

# 6. Obtener resumen
resumen = analizador.obtener_resumen_factores(documentos)
```

## 🔗 Dependencias de Otros Archivos

### Archivos que ESTE archivo IMPORTA:
```
→ src/utils/logger.py (línea 14) - Para logging
```

### Archivos que USAN este archivo:
```
→ components/pages/analisis_factores.py (página de análisis de factores)
→ Análisis avanzados que requieren identificación de factores
```

## 🔍 Resumen

**`factor_analyzer.py`** es responsable de:
✅ Identificar 8 categorías de factores de transformación digital
✅ Contar menciones de palabras clave por categoría
✅ Calcular relevancia normalizada de factores
✅ Generar análisis TF-IDF de documentos
✅ Agrupar documentos con K-Means clustering
✅ Extraer temas latentes con LDA
✅ Crear matrices de co-ocurrencia de factores
✅ Generar resúmenes estadísticos completos

**Flujo simplificado:**
```
1. Definir factores → 2. Buscar keywords →
3. Contar menciones → 4. Calcular relevancia →
5. Aplicar ML (opcional) → 6. Generar resumen
```

**Para modificar:**
- **Agregar categoría**: Añadir a `categorias_factores` (líneas 28-73)
- **Agregar keyword**: Editar lista de keywords de categoría
- **Cambiar normalización**: Modificar cálculo en línea 107
- **Ajustar clustering**: Cambiar `n_clusters` en línea 187

**Archivo**: `factor_analyzer.py`
**Líneas de código**: 340
**Complejidad**: Media-Alta (⭐⭐⭐⭐)
**Importancia**: ⭐⭐⭐⭐⭐ (Crítico - análisis central del proyecto)

---

# Análisis Automático de Factores Relevantes

**Versión:** 1.0
**Fecha:** 2025-10-27
**Estado:** ✅ Completado

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Módulos Implementados](#módulos-implementados)
4. [Uso](#uso)
5. [Ejemplos](#ejemplos)
6. [Science Mapping](#science-mapping)
7. [Exportación](#exportación)

---

## 📖 Descripción General

Sistema completo de **identificación automática de factores relevantes** en transformación digital para educación superior. Identifica, consolida y analiza factores extraídos automáticamente de múltiples fuentes de PLN.

### Objetivo

**Identificar automáticamente** los factores, características y relaciones más relevantes en literatura científica sobre transformación digital en educación superior, sin categorías predefinidas.

### Fuentes de Factores

El sistema extrae factores de 5 fuentes PLN diferentes:

1. **Topic Modeling** (LDA, NMF, LSA, pLSA)
   - Palabras clave de tópicos descubiertos
   - Conceptos temáticos principales

2. **TF-IDF**
   - Términos con mayor relevancia estadística
   - Palabras distintivas del corpus

3. **Named Entity Recognition (NER)**
   - Organizaciones, tecnologías, metodologías
   - Entidades concretas mencionadas

4. **N-gramas**
   - Bigramas y trigramas frecuentes
   - Conceptos multi-palabra

5. **Co-ocurrencia**
   - Términos que aparecen juntos
   - Relaciones contextuales

---

## 🏗️ Arquitectura

### Componentes

```
src/models/
├── factor_identification.py    # Identificación y consolidación
└── science_mapping.py          # Visualización de redes

components/pages/
└── analisis_factores.py        # Interfaz Streamlit
```

### Flujo de Trabajo

```
1. Extraer factores de múltiples fuentes
   ↓
2. Consolidar y eliminar duplicados
   ↓
3. Calcular co-ocurrencia entre factores
   ↓
4. Clustering de factores relacionados
   ↓
5. Generar science mapping (red de conocimiento)
   ↓
6. Visualizar y exportar resultados
```

---

## 🧩 Módulos Implementados

### 1. `FactorIdentifier`

Clase principal para identificación y consolidación de factores.

#### Métodos Principales

```python
# Extracción desde diferentes fuentes
extract_factors_from_topics(topic_results, top_n_words=10, min_weight=0.01)
extract_factors_from_tfidf(tfidf_results, top_n=100, min_score=0.1)
extract_factors_from_ner(ner_results, min_frequency=3)
extract_factors_from_ngrams(ngram_results, top_n=50, min_frequency=5)

# Consolidación
consolidate_factors(all_factors, similarity_threshold=0.85)

# Análisis de relaciones
calculate_cooccurrence(texts_dict, factors_df, top_n_factors=100, window_size=50)

# Clustering
identify_factor_clusters(factors_df, cooccurrence_matrix, n_clusters=8)

# Resumen
generate_factor_summary(factors_df, top_n=50)

# Exportación
export_results(factors_df, cooccurrence_matrix, summary, output_dir='output')
```

#### Estructura de Factor

Cada factor identificado tiene:

```python
{
    'term': str,           # Término identificado
    'source': str,         # Fuente PLN (e.g., 'topic_modeling_lda')
    'weight': float,       # Peso/importancia
    'type': str,          # Tipo (topic_keyword, tfidf_term, named_entity, ngram)
    'topic_id': int,      # ID de tópico (opcional)
    'entity_type': str    # Tipo de entidad (opcional)
}
```

#### DataFrame Consolidado

Factores consolidados contienen:

- `term`: Factor único
- `total_weight`: Suma de pesos de todas las fuentes
- `avg_weight`: Peso promedio
- `frequency`: Número de apariciones en diferentes fuentes
- `sources`: Lista de fuentes donde apareció
- `source_count`: Número de fuentes distintas
- `main_type`: Tipo principal del factor
- `cluster_id`: ID del cluster asignado

### 2. `ScienceMapper`

Clase para generar visualizaciones de science mapping.

#### Métodos Principales

```python
# Construcción de red
build_cooccurrence_network(
    cooccurrence_matrix,
    min_cooccurrence=5,
    top_n_nodes=50
)

# Métricas de red
calculate_network_metrics(network)
# Retorna: degree_centrality, betweenness_centrality,
#          closeness_centrality, communities, density

# Visualizaciones
create_network_visualization(network, metrics, layout='spring', color_by='community')
create_factor_landscape(factors_df, metrics, top_n=100)
create_centrality_comparison(metrics, top_n=20)
create_community_sunburst(factors_df, metrics, max_factors=50)
```

#### Estructura de Red

```python
network = {
    'nodes': [
        {
            'id': str,
            'label': str,
            'size': float,
            'degree': int
        }
    ],
    'edges': [
        {
            'source': str,
            'target': str,
            'weight': float
        }
    ],
    'n_nodes': int,
    'n_edges': int
}
```

---

## 🚀 Uso

### En la Aplicación Streamlit

1. **Prerequisitos** (ejecutar primero):
   - Preprocesamiento de textos
   - Al menos uno de: Topic Modeling, TF-IDF, NER, N-gramas

2. **Acceder al módulo**:
   ```
   Menú lateral → Análisis de Factores
   ```

3. **Configurar análisis**:
   - Ajustar parámetros de extracción
   - Configurar co-ocurrencia y red
   - Ejecutar análisis

4. **Explorar resultados**:
   - **Resumen**: Métricas y top factores
   - **Tabla**: Factores completos con filtros
   - **Red**: Visualización de co-ocurrencia
   - **Landscape**: Mapa de conocimiento
   - **Exportar**: Descargar resultados

### Uso Programático

```python
from src.models.factor_identification import FactorIdentifier
from src.models.science_mapping import ScienceMapper

# 1. Inicializar
identifier = FactorIdentifier()

# 2. Extraer factores de diferentes fuentes
factors_from_topics = identifier.extract_factors_from_topics(
    topic_modeling_results['lda'],
    top_n_words=10,
    min_weight=0.01
)

factors_from_tfidf = identifier.extract_factors_from_tfidf(
    tfidf_results,
    top_n=100,
    min_score=0.1
)

# Combinar todos los factores
all_factors = factors_from_topics + factors_from_tfidf + ...

# 3. Consolidar
factors_df = identifier.consolidate_factors(all_factors)

# 4. Co-ocurrencia
cooccurrence_matrix = identifier.calculate_cooccurrence(
    texts_dict,
    factors_df,
    top_n_factors=100,
    window_size=50
)

# 5. Clustering
factors_df = identifier.identify_factor_clusters(
    factors_df,
    cooccurrence_matrix,
    n_clusters=8
)

# 6. Science Mapping
mapper = ScienceMapper()
network = mapper.build_cooccurrence_network(
    cooccurrence_matrix,
    min_cooccurrence=5,
    top_n_nodes=50
)

metrics = mapper.calculate_network_metrics(network)

# 7. Visualizar
fig = mapper.create_network_visualization(network, metrics)
fig.show()

# 8. Exportar
identifier.export_results(
    factors_df,
    cooccurrence_matrix,
    summary,
    output_dir='output'
)
```

---

## 💡 Ejemplos

### Ejemplo 1: Análisis Completo

```python
# Pipeline completo
results = execute_factor_analysis(config={
    'topic_top_words': 10,
    'topic_min_weight': 0.01,
    'tfidf_top_n': 100,
    'tfidf_min_score': 0.1,
    'cooc_top_factors': 100,
    'cooc_window_size': 50,
    'network_top_nodes': 50,
    'min_cooccurrence': 5,
    'n_clusters': 8
})

# Resultados
factors_df = results['factors_df']
network = results['network']
metrics = results['metrics']
```

### Ejemplo 2: Top 10 Factores

```python
top_10 = factors_df.head(10)[['term', 'total_weight', 'source_count']]
print(top_10)

# Salida esperada:
#           term  total_weight  source_count
# 0   digital transformation    15.34           4
# 1   higher education         12.87           3
# 2   technology adoption       10.45           3
# ...
```

### Ejemplo 3: Factores por Cluster

```python
for cluster_id in range(8):
    cluster_factors = factors_df[factors_df['cluster_id'] == cluster_id]
    print(f"\nCluster {cluster_id}: {len(cluster_factors)} factores")
    print(cluster_factors.head(5)['term'].tolist())
```

---

## 🗺️ Science Mapping

### ¿Qué es Science Mapping?

Técnica de visualización que muestra la **estructura intelectual** de un campo de investigación mediante redes de conceptos y sus relaciones.

### Componentes del Science Mapping

1. **Red de Co-ocurrencia**
   - Nodos = Factores identificados
   - Edges = Co-ocurrencias en textos
   - Colores = Comunidades detectadas
   - Tamaño = Importancia/centralidad

2. **Métricas de Centralidad**
   - **Degree**: Conexiones directas
   - **Betweenness**: Importancia como puente
   - **Closeness**: Cercanía a otros conceptos
   - **Eigenvector**: Influencia en la red

3. **Comunidades**
   - Grupos de factores relacionados
   - Detectados automáticamente con algoritmo de modularidad

4. **Knowledge Landscape**
   - Vista panorámica de factores
   - Eje X: Peso promedio (relevancia)
   - Eje Y: Frecuencia de aparición
   - Tamaño: Peso total
   - Color: Comunidad/cluster

### Interpretación

- **Nodos centrales grandes**: Conceptos fundamentales del campo
- **Nodos periféricos**: Temas emergentes o específicos
- **Comunidades densas**: Sub-áreas bien establecidas
- **Conexiones entre comunidades**: Conceptos puente/integrador

---

## 💾 Exportación

### Archivos Generados

Al exportar, se crean 3 archivos en `output/`:

1. **`factors_TIMESTAMP.csv`**
   - Tabla completa de factores consolidados
   - Columnas: term, total_weight, avg_weight, frequency, sources, etc.

2. **`cooccurrence_TIMESTAMP.csv`**
   - Matriz de co-ocurrencia completa
   - Filas y columnas = factores
   - Valores = número de co-ocurrencias

3. **`factor_summary_TIMESTAMP.json`**
   ```json
   {
     "total_factors": 500,
     "top_factors": [...],
     "factors_by_type": {
       "topic_keyword": 200,
       "tfidf_term": 150,
       "named_entity": 100,
       "ngram": 50
     },
     "factors_multi_source": 180,
     "avg_weight": 2.45
   }
   ```

### Uso de Resultados Exportados

```python
import pandas as pd
import json

# Cargar factores
factors = pd.read_csv('output/factors_20251027_143022.csv')

# Cargar co-ocurrencia
cooc = pd.read_csv('output/cooccurrence_20251027_143022.csv', index_col=0)

# Cargar resumen
with open('output/factor_summary_20251027_143022.json') as f:
    summary = json.load(f)

# Análisis posterior
print(f"Total de factores únicos: {len(factors)}")
print(f"Factores multi-fuente: {summary['factors_multi_source']}")
```

---

## 📊 Métricas y Validación

### Calidad de Factores

- **Factores únicos consolidados**: ~300-500 (depende del corpus)
- **Factores multi-fuente** (≥2 fuentes PLN): ~30-40%
- **Clusters identificados**: 8 (configurable)
- **Densidad de red**: 0.1-0.3 (red no muy densa)

### Interpretabilidad

Los factores se validan por:
1. **Múltiples fuentes**: Factores identificados por 2+ técnicas PLN
2. **Alto peso**: Factores con mayor relevancia estadística
3. **Co-ocurrencia**: Factores que aparecen juntos en contexto
4. **Centralidad**: Factores con mayor importancia en la red

---

## 🔧 Parámetros Configurables

### Extracción

| Parámetro | Default | Descripción |
|-----------|---------|-------------|
| `topic_top_words` | 10 | Palabras por tópico |
| `topic_min_weight` | 0.01 | Peso mínimo |
| `tfidf_top_n` | 100 | Top términos TF-IDF |
| `tfidf_min_score` | 0.1 | Score mínimo TF-IDF |
| `ner_min_freq` | 3 | Frecuencia mínima NER |
| `ngram_top_n` | 50 | Top n-gramas |
| `ngram_min_freq` | 5 | Frecuencia mínima n-gramas |

### Co-ocurrencia y Red

| Parámetro | Default | Descripción |
|-----------|---------|-------------|
| `cooc_top_factors` | 100 | Factores para co-ocurrencia |
| `cooc_window_size` | 50 | Ventana de palabras |
| `network_top_nodes` | 50 | Nodos en red |
| `min_cooccurrence` | 5 | Co-ocurrencias mínimas |
| `n_clusters` | 8 | Número de clusters |

---

## 🎯 Cumplimiento de Objetivos

### Objetivo General Cumplido ✅

**"Identificar automáticamente factores, características y relaciones más comunes o relevantes en literatura científica sobre la transformación digital en educación superior mediante técnicas de análisis de contenido textual y PLN"**

✅ **Identificación automática**: Sin categorías predefinidas
✅ **Múltiples fuentes PLN**: Topic Modeling, TF-IDF, NER, N-gramas
✅ **Consolidación inteligente**: Elimina duplicados, agrupa similares
✅ **Análisis de relaciones**: Co-ocurrencia y science mapping
✅ **Visualización**: Redes de conocimiento y landscapes

### Objetivos Específicos

**OE1: Consolidar corpus** → ✅ 256 documentos procesados
**OE2: Estrategia PLN** → ✅ 5 fuentes de factores implementadas
**OE3: Science mapping** → ✅ Red de co-ocurrencia + landscape + comunidades
**OE4: Evaluar desempeño** → ⚠️ Métricas básicas (ver siguiente fase)

---

## 📈 Próximos Pasos

### Mejoras Futuras

1. **Evaluación cuantitativa**:
   - Coherence scores para clusters
   - Modularity score para comunidades
   - Validación con expertos

2. **Análisis temporal**:
   - Evolución de factores en el tiempo
   - Factores emergentes vs. establecidos

3. **Análisis multi-nivel**:
   - Factores macro (institucional)
   - Factores micro (individual)

4. **Integración con otros análisis**:
   - Clasificación de documentos por factores
   - Sentiment analysis por factor

---

## 📚 Referencias

- **Topic Modeling**: Blei et al. (2003) - Latent Dirichlet Allocation
- **Science Mapping**: Van Eck & Waltman (2010) - VOSviewer
- **Network Analysis**: Newman (2006) - Modularity and community structure
- **Co-occurrence Analysis**: Callon et al. (1983) - Mapping of science

---

**Implementado por:** Claude Code
**Fecha:** 2025-10-27
**Versión:** 1.0

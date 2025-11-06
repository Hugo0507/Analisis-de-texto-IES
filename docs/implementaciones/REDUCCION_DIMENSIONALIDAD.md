# 📉 Reducción de Dimensionalidad

## Descripción General

Sistema completo de **Reducción de Dimensionalidad** con análisis visual profundo de cada técnica. Implementa 6 métodos diferentes con comparaciones detalladas y métricas de calidad.

### Técnicas Implementadas

1. **Filtro de Baja Varianza**: Elimina features con variación mínima
2. **Filtro de Alta Correlación**: Elimina features redundantes
3. **PCA (Principal Component Analysis)**: Proyección lineal de máxima varianza
4. **t-SNE (t-Distributed Stochastic Neighbor Embedding)**: Embedding no lineal para visualización
5. **UMAP (Uniform Manifold Approximation)**: Balance entre estructura local y global
6. **Factor Analysis**: Descubrimiento de factores latentes

## Características Principales

### 🎯 Análisis Visual Detallado

Cada método incluye:
- ✅ Visualización 2D y 3D interactiva
- ✅ Métricas de calidad específicas
- ✅ Interpretación de componentes/factores
- ✅ Comparación lado a lado
- ✅ Exportación de resultados

### 📊 8 Pestañas Especializadas

1. **Preparación**: Carga y exploración de datos
2. **Filtros**: Varianza y correlación
3. **PCA**: Análisis de componentes principales
4. **t-SNE**: Embedding no lineal
5. **UMAP**: Manifold learning
6. **Factor Analysis**: Factores latentes
7. **Comparación**: Evaluación lado a lado
8. **Exportar**: Descarga de resultados

---

## Métodos Implementados

### 1. Filtro de Baja Varianza

**Objetivo**: Eliminar features con poca variación (poco informativos)

#### Cómo Funciona
```python
variance = Var(feature)
if variance < threshold:
    remove_feature()
```

#### Parámetros
- **threshold**: Umbral de varianza mínima (default: 0.01)
  - Valor bajo (0.001): Más estricto, conserva más features
  - Valor alto (0.1): Menos estricto, elimina más features

#### Visualizaciones
- Scatter plot de varianzas de todos los features
- Distinción visual entre conservados y eliminados
- Línea de umbral
- Tabla de features removidos

#### Cuándo Usar
- ✅ Preprocesamiento inicial
- ✅ Datasets con muchas constantes o casi-constantes
- ✅ Antes de aplicar otros métodos de reducción
- ⚠️ Puede eliminar features importantes si threshold es muy alto

#### Ejemplo de Salida
```
Features Originales: 1000
Features Conservadas: 873
Features Removidas: 127
Reducción: 12.7%
```

---

### 2. Filtro de Alta Correlación

**Objetivo**: Eliminar features redundantes (altamente correlacionados)

#### Cómo Funciona
```python
for each pair (feature_i, feature_j):
    correlation = corr(feature_i, feature_j)
    if |correlation| > threshold:
        # Remover feature con menor varianza
        remove_feature_with_lower_variance()
```

#### Parámetros
- **threshold**: Umbral de correlación (default: 0.9)
  - 0.95: Muy estricto, elimina solo extremadamente correlacionados
  - 0.7: Menos estricto, elimina más features

#### Visualizaciones
- Tabla de pares altamente correlacionados
- Heatmap de matriz de correlación
- Valores de correlación para cada par

#### Métricas
- Pares correlacionados encontrados
- Features removidos vs conservados
- Ratio de reducción

#### Cuándo Usar
- ✅ Cuando sospechas redundancia entre features
- ✅ Antes de modelos lineales (regresión, SVM)
- ✅ Para reducir multicolinealidad
- ⚠️ Puede perder información si features correlacionados son importantes

#### Ejemplo de Salida
```
Features Originales: 873
Pares Correlacionados: 42
Features Removidas: 38
Reducción: 4.4%
```

---

### 3. PCA (Principal Component Analysis)

**Objetivo**: Encontrar direcciones de máxima varianza en los datos

#### Algoritmo
```
1. Centrar datos (media = 0)
2. Calcular matriz de covarianza
3. Eigendecomposición → eigenvectors (PCs) y eigenvalues (varianza)
4. Proyectar datos en PCs seleccionados
```

#### Parámetros
- **n_components**: Número de componentes (2-10)
  - 2-3: Para visualización
  - Más alto: Para reducción de features manteniendo varianza

#### Matemáticas
- **Varianza Explicada**: λᵢ / Σλⱼ
- **Loadings**: Contribución de cada feature a cada PC
- **Scores**: Coordenadas de documentos en nuevo espacio

#### Visualizaciones Incluidas

**1. Varianza Explicada por Componente**
- Gráfico de barras
- Muestra cuánta información aporta cada PC

**2. Varianza Acumulada**
- Línea con markers
- Línea de referencia en 90%
- Ayuda a elegir número óptimo de componentes

**3. Dimensionalidad Óptima**
- Componentes necesarios para 90%, 95%, 99% varianza
- Guía para decidir reducción

**4. Loadings (Interpretación)**
- Top 10 features por componente
- Gráficos de barras horizontales
- Colores según signo (positivo/negativo)
- Permite entender QUÉ representa cada PC

**5. Visualización 2D**
- Scatter plot de PC1 vs PC2
- Coloreado por PC1
- Hover con nombre de documento

**6. Visualización 3D** (si n_components ≥ 3)
- Scatter 3D interactivo
- Rotación libre
- PC1, PC2, PC3

#### Métricas de Calidad
- **Varianza Explicada Total**: % de información preservada
- **Reconstruction Error**: MSE entre datos originales y reconstruidos
- **Loadings**: Interpretabilidad de componentes

#### Interpretación de Loadings

**Ejemplo:**
```
PC1 (45.2% varianza):
- digital: +0.42
- transformation: +0.38
- technology: +0.35
→ PC1 representa "Digitalización"

PC2 (23.1% varianza):
- education: +0.51
- learning: +0.48
- student: +0.39
→ PC2 representa "Educación"
```

#### Ventajas
- ✅ Determinístico (mismo resultado siempre)
- ✅ Altamente interpretable
- ✅ Rápido computacionalmente
- ✅ Permite reconstrucción
- ✅ Componentes ortogonales (independientes)

#### Desventajas
- ⚠️ Solo captura relaciones lineales
- ⚠️ Sensible a outliers
- ⚠️ Asume que máxima varianza = máxima información

#### Cuándo Usar
- ✅ Análisis exploratorio inicial
- ✅ Reducción de features para otros modelos
- ✅ Cuando necesitas interpretar componentes
- ✅ Visualización de estructura general
- ✅ Compresión de datos

---

### 4. t-SNE (t-Distributed Stochastic Neighbor Embedding)

**Objetivo**: Embedding no lineal que preserva vecindarios locales

#### Algoritmo Simplificado
```
1. Calcular similitudes en espacio original (Gaussiana)
2. Inicializar embedding aleatorio en 2D/3D
3. Optimizar para que similitudes en 2D/3D coincidan con originales
4. Usar distribución t-Student en espacio reducido
```

#### Parámetros

**perplexity** (5-50, default: 30)
- Balance entre estructura local y global
- Bajo (5-10): Enfatiza clusters pequeños
- Alto (40-50): Enfatiza estructura global
- Regla: perplexity ≈ √(n_samples)

**learning_rate** (10-1000, default: 200)
- Velocidad de optimización
- Bajo: Convergencia lenta pero estable
- Alto: Más rápido pero puede no converger

**n_iter** (250-2000, default: 1000)
- Número de iteraciones
- Más iteraciones = mejor resultado (pero más lento)

**random_state**
- Semilla aleatoria
- t-SNE es estocástico: diferentes runs → diferentes resultados

#### Visualizaciones

**1. Scatter Plot 2D/3D**
- Puntos coloreados por índice
- Hover con nombre de documento
- Interactivo (zoom, pan)

**2. Métricas de Calidad**
- **KL Divergence**: Distancia entre distribuciones
  - Menor = mejor
  - Típicamente: 0.5 - 3.0
- **Preservation Correlation**: Correlación de distancias
  - -1 a 1, cercano a 1 = buena preservación

#### Interpretación

**KL Divergence**
- < 1.0: Excelente
- 1.0 - 2.0: Bueno
- 2.0 - 3.0: Aceptable
- \> 3.0: Pobre (ajustar parámetros)

**Clusters Visibles**
- Clusters bien separados → grupos naturales en datos
- Clusters superpuestos → límites difusos
- Outliers alejados → documentos únicos

#### Ventajas
- ✅ Excelente para visualización
- ✅ Captura estructura no lineal
- ✅ Revela clusters locales
- ✅ Muy utilizado en papers

#### Desventajas
- ⚠️ No determinístico
- ⚠️ Lento con muchos datos
- ⚠️ No permite reconstrucción
- ⚠️ Distancias entre clusters no son significativas
- ⚠️ No apto para reducción previa a clasificación

#### Cuándo Usar
- ✅ Visualización de clusters
- ✅ Exploración de estructura local
- ✅ Presentaciones y publicaciones
- ✅ Identificar outliers
- ❌ NO para reducción antes de clasificadores

#### Recomendaciones por Dataset Size
- < 100 samples: perplexity = 5-15
- 100-500: perplexity = 20-30
- 500-1000: perplexity = 30-50
- \> 1000: Considerar usar UMAP (más rápido)

---

### 5. UMAP (Uniform Manifold Approximation)

**Objetivo**: Embedding no lineal más rápido que t-SNE con mejor estructura global

#### Fundamento Matemático
- Basado en topología algebraica
- Construye grafo de vecinos cercanos
- Optimiza embedding en espacio de baja dimensión

#### Parámetros

**n_neighbors** (5-50, default: 15)
- Balance local vs global
- Bajo (5-10): Estructura LOCAL (clusters finos)
- Alto (30-50): Estructura GLOBAL (grandes grupos)

**min_dist** (0.0-0.99, default: 0.1)
- Distancia mínima entre puntos
- Bajo (0.01): Puntos muy juntos, clusters compactos
- Alto (0.5): Puntos más separados, distribución uniforme

**metric** (euclidean, cosine, manhattan)
- Métrica de distancia
- cosine: Recomendado para texto (TF-IDF)
- euclidean: Para features numéricos generales

**n_components** (2-3)
- Dimensiones del embedding

#### Visualizaciones

**1. Scatter Plot 2D/3D**
- Similar a t-SNE pero con mejor estructura global
- Colorscale 'Plasma' para distinguir de t-SNE

**2. Métricas**
- **Distance Preservation Correlation**
  - Mide qué tan bien se preservan distancias
  - Cercano a 1 = excelente
- **Spread**: Dispersión de puntos
  - Mayor spread = más distribución uniforme

#### Ventajas sobre t-SNE
- ✅ 10-100x más rápido
- ✅ Mejor preservación de estructura global
- ✅ Más escalable (funciona con millones de puntos)
- ✅ Puede usarse como reducción previa a clasificadores
- ✅ Más determinístico (menos variación entre runs)

#### Desventajas
- ⚠️ Menos conocido que t-SNE
- ⚠️ Requiere instalación adicional
- ⚠️ Parámetros menos intuitivos

#### Cuándo Usar
- ✅ Datasets grandes (> 1000 samples)
- ✅ Cuando necesitas estructura global preservada
- ✅ Reducción previa a clasificación
- ✅ Alternativa más rápida a t-SNE
- ✅ Exploración de topología de datos

#### Comparación t-SNE vs UMAP

| Aspecto | t-SNE | UMAP |
|---------|-------|------|
| Velocidad | Lento | Rápido |
| Estructura Local | Excelente | Muy Buena |
| Estructura Global | Pobre | Buena |
| Determinismo | Bajo | Medio |
| Escalabilidad | Limitada | Alta |
| Uso en Pipeline | No | Sí |

---

### 6. Factor Analysis

**Objetivo**: Descubrir factores latentes que explican correlaciones observadas

#### Modelo
```
X = L * F + ε
donde:
- X: Datos observados
- L: Loadings (matriz de cargas)
- F: Factores latentes
- ε: Ruido específico de cada variable
```

#### Diferencia con PCA
- **PCA**: Maximiza varianza, todos los features contribuyen
- **FA**: Modela estructura latente + ruido, separa señal de ruido

#### Parámetros

**n_factors** (2-10)
- Número de factores latentes
- Equivalente a n_components en PCA

**rotation** (None, 'varimax')
- **None**: Factores sin rotar
- **Varimax**: Rotación que simplifica interpretación
  - Maximiza carga de cada variable en un solo factor
  - Hace interpretación más clara

#### Visualizaciones

**1. Comunalidades**
- Proporción de varianza de cada feature explicada por factores
- Valores cercanos a 1 = bien explicado
- Valores bajos = mayormente ruido

**Top y Bottom Features**
- Top 10: Features mejor explicadas por los factores
- Bottom 10: Features con más ruido/unicidad

**2. Loadings por Factor**
- Top 10 features para cada factor
- Gráficos de barras con signo
- Permite interpretar QUÉ representa cada factor

**3. Scatter Plot**
- Proyección en espacio de factores
- Similar a PCA pero con interpretación de factores latentes

#### Métricas

**Comunalidad Media**
- 0.0 - 0.3: Pobre (mucho ruido)
- 0.3 - 0.6: Aceptable
- 0.6 - 0.9: Bueno
- 0.9 - 1.0: Excelente

**Log-Likelihood**
- Mayor = mejor ajuste del modelo
- Útil para comparar diferentes números de factores

#### Interpretación de Factores

**Ejemplo:**
```
Factor 1 (Comunalidad media: 0.72):
- innovation: +0.81
- digital: +0.76
- technology: +0.69
→ Factor de "Innovación Digital"

Factor 2:
- education: +0.84
- learning: +0.79
- student: +0.71
→ Factor de "Educación"
```

#### Ventajas
- ✅ Interpretación teórica (factores latentes)
- ✅ Separa señal de ruido
- ✅ Rotación para mejor interpretabilidad
- ✅ Útil en ciencias sociales y psicometría

#### Desventajas
- ⚠️ Asume estructura latente existe
- ⚠️ Más complejo que PCA
- ⚠️ Puede no converger

#### Cuándo Usar
- ✅ Análisis de constructos teóricos
- ✅ Validación de encuestas/cuestionarios
- ✅ Cuando crees que hay factores subyacentes
- ✅ Investigación en ciencias sociales
- ✅ Reducción de dimensionalidad con interpretación teórica

---

## Comparación de Métodos

### Tabla Comparativa Completa

| Método | Tipo | Lineal | Interpretable | Velocidad | Preserva Global | Preserva Local | Reconstrucción |
|--------|------|--------|---------------|-----------|----------------|----------------|----------------|
| **Filtro Varianza** | Filtro | - | ✅ Alta | ⚡ Muy Rápido | ✅ | ✅ | ✅ |
| **Filtro Correlación** | Filtro | - | ✅ Alta | ⚡ Rápido | ✅ | ✅ | ✅ |
| **PCA** | Proyección | ✅ | ✅ Alta | ⚡ Rápido | ✅ Sí | ⚠️ Parcial | ✅ Sí |
| **t-SNE** | Embedding | ❌ | ❌ Baja | 🐌 Lento | ❌ No | ✅ Excelente | ❌ No |
| **UMAP** | Embedding | ❌ | ⚠️ Media | ⚡ Rápido | ⚠️ Bueno | ✅ Excelente | ❌ No |
| **Factor Analysis** | Latente | ✅ | ✅ Alta | ⚡ Medio | ✅ Sí | ⚠️ Parcial | ✅ Sí |

### Guía de Selección

#### Para Exploración Visual
1. **Primera visualización**: PCA (rápido, interpretable)
2. **Clusters**: t-SNE (mejor visualización local)
3. **Dataset grande**: UMAP (más rápido que t-SNE)

#### Para Reducción de Features
1. **Preprocesamiento**: Filtros (varianza + correlación)
2. **Modelo lineal**: PCA (rápido, interpretable)
3. **Modelo complejo**: UMAP (preserva más información)

#### Para Interpretación
1. **Componentes principales**: PCA (loadings claros)
2. **Factores teóricos**: Factor Analysis (constructos latentes)

#### Para Publicación
1. **Visualización**: t-SNE (más conocido, clusters claros)
2. **Análisis**: PCA (explicación de varianza)
3. **Moderno**: UMAP (más técnico)

---

## Flujo de Trabajo Recomendado

### Paso 1: Preparación
```
1. Seleccionar fuente: TF-IDF o BoW
2. Verificar estadísticas (sparsity, varianza)
3. Preparar datos → escala y normaliza automáticamente
```

### Paso 2: Filtrado (Opcional pero Recomendado)
```
1. Filtro de baja varianza (threshold = 0.01)
   → Elimina features casi-constantes
2. Filtro de alta correlación (threshold = 0.9)
   → Elimina redundancia
```

### Paso 3: Aplicar Métodos

**Para Exploración:**
```
1. PCA con n_components = 2-3
   → Visualización inicial, varianza explicada
2. t-SNE o UMAP
   → Visualización refinada de clusters
```

**Para Interpretación:**
```
1. PCA con análisis detallado = True
   → Revisar loadings por componente
2. Factor Analysis con rotation = 'varimax'
   → Interpretar factores latentes
```

### Paso 4: Comparación
```
1. Ejecutar múltiples métodos
2. Comparar visualizaciones lado a lado
3. Seleccionar método apropiado para tu caso
```

### Paso 5: Exportación
```
1. Exportar datos transformados (CSV)
2. Exportar todos los resultados (JSON)
3. Guardar en Google Drive (opcional)
```

---

## Métricas de Calidad

### PCA
- **Varianza Explicada**: % de información preservada
  - 80%+: Excelente
  - 60-80%: Bueno
  - <60%: Considerar más componentes
- **Reconstruction Error**: MSE entre original y reconstruido
  - Menor = mejor

### t-SNE
- **KL Divergence**: Calidad del embedding
  - <1.0: Excelente
  - 1.0-2.0: Bueno
  - \>3.0: Pobre
- **Distance Correlation**: Preservación de distancias
  - >0.7: Bueno
  - <0.5: Pobre

### UMAP
- **Distance Correlation**: Similar a t-SNE
- **Spread**: Uniformidad de distribución

### Factor Analysis
- **Comunalidad Media**: Calidad del modelo
  - >0.6: Bueno
  - <0.3: Pobre
- **Log-Likelihood**: Ajuste del modelo

---

## Casos de Uso

### Análisis Exploratorio de Corpus
```
1. PCA (2-3 componentes)
   → Ver estructura general
2. Analizar loadings
   → Identificar temas principales
3. t-SNE
   → Visualizar clusters de documentos similares
```

### Reducción para Clasificación
```
1. Filtro de varianza + correlación
   → Eliminar ruido
2. PCA (varianza acumulada 90%)
   → Reducir dimensionalidad
3. Entrenar clasificador en espacio reducido
```

### Validación de Estructura Teórica
```
1. Factor Analysis
   → Identificar factores latentes
2. Comparar con teoría
   → Validar constructos
3. Analizar comunalidades
   → Verificar calidad del modelo
```

### Visualización para Paper
```
1. PCA
   → Mostrar varianza explicada (2-3 componentes)
2. t-SNE con diferentes perplexities
   → Mostrar clusters a diferentes escalas
3. Comparación lado a lado
   → PCA vs t-SNE
```

---

## Troubleshooting

### "No aparecen clusters en PCA"
- ✅ Normal: PCA es lineal
- ✅ Probar t-SNE o UMAP
- ✅ Clusters pueden estar en componentes superiores (PC3, PC4)

### "t-SNE muy lento"
- ✅ Reducir n_samples (muestreo)
- ✅ Reducir dimensionalidad primero con PCA (50-100 componentes)
- ✅ Usar UMAP en su lugar

### "t-SNE diferente cada vez"
- ✅ Normal: es estocástico
- ✅ Fijar random_state
- ✅ Ejecutar múltiples veces, buscar patrones consistentes

### "UMAP no disponible"
```bash
pip install umap-learn
```

### "PCA solo explica 30% varianza"
- ✅ Normal con texto (alta dimensionalidad)
- ✅ Revisar varianza acumulada para 10-20 componentes
- ✅ Texto es inherentemente de alta dimensión

### "Factor Analysis no converge"
- ✅ Reducir n_factors
- ✅ Aumentar max_iter
- ✅ Datos pueden no tener estructura factorial clara

---

## Referencias

### Papers Fundamentales

**PCA:**
- Pearson, K. (1901). "On Lines and Planes of Closest Fit to Systems of Points in Space"
- Jolliffe, I. (2002). "Principal Component Analysis"

**t-SNE:**
- van der Maaten & Hinton (2008). "Visualizing Data using t-SNE"
- Wattenberg et al. (2016). "How to Use t-SNE Effectively"

**UMAP:**
- McInnes et al. (2018). "UMAP: Uniform Manifold Approximation and Projection"

**Factor Analysis:**
- Thurstone, L. L. (1947). "Multiple Factor Analysis"

### Librerías
- scikit-learn: https://scikit-learn.org/stable/modules/decomposition.html
- UMAP: https://umap-learn.readthedocs.io/
- t-SNE guide: https://distill.pub/2016/misread-tsne/

---

**Autor**: Sistema de Análisis de Transformación Digital
**Versión**: 1.0
**Fecha**: 2025

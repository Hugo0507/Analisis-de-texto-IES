# 🤖 Clasificación de Textos

## Descripción General

Sistema completo de clasificación supervisada de textos implementando tres algoritmos clásicos de Machine Learning:

- **Naive Bayes**: Clasificador probabilístico basado en el teorema de Bayes
- **SVM (Support Vector Machines)**: Clasificador basado en hiperplanos de separación
- **KNN (K-Nearest Neighbors)**: Clasificador basado en similitud con vecinos cercanos

## Características Principales

### 1. Sistema de Etiquetado Flexible

#### Etiquetado Manual Individual
- Selección de documentos uno por uno
- Vista previa del contenido
- Sugerencias de etiquetas existentes
- Filtrado por estado (etiquetado/sin etiquetar)

#### Etiquetado por Lotes
- Selección múltiple de documentos
- Asignación de una etiqueta a todos
- Perfecto para categorización rápida

#### Importación desde CSV
- Formato: `document, label`
- Ideal para etiquetas predefinidas
- Validación automática de nombres de documentos

#### Etiquetado Automático
- Basado en reglas de palabras clave
- Define: `etiqueta → [keywords]`
- Aplicación automática a todo el corpus
- Ejemplo:
  ```
  technology → [ai, machine learning, software, digital]
  education → [learning, teaching, student, university]
  ```

### 2. Modelos Implementados

#### Naive Bayes
**Algoritmo**: Clasificador probabilístico basado en el teorema de Bayes con suposición de independencia.

**Variantes**:
- **Multinomial**: Para frecuencias de términos (recomendado para TF-IDF)
- **Complement**: Mejor para datasets desbalanceados
- **Bernoulli**: Para features binarias (presencia/ausencia)

**Hiperparámetros**:
- `alpha`: Suavizado de Laplace (default: 1.0)
  - α < 1: menos suavizado
  - α > 1: más suavizado

**Ventajas**:
- Extremadamente rápido
- Funciona bien con poco datos
- Interpretable (probabilidades por clase)

**Desventajas**:
- Asume independencia entre features
- Sensible a features irrelevantes

#### SVM (Support Vector Machines)
**Algoritmo**: Encuentra hiperplano óptimo que maximiza el margen entre clases.

**Kernels**:
- **Linear**: Separación lineal (más rápido, recomendado para texto)
- **RBF**: Radial Basis Function, para relaciones no lineales
- **Poly**: Polinomial, relaciones de alto orden
- **Sigmoid**: Similar a redes neuronales

**Hiperparámetros**:
- `C`: Parámetro de regularización (default: 1.0)
  - C bajo: margen amplio, más generalización
  - C alto: margen estrecho, menos errores en training
- `gamma`: Influencia de cada punto (para kernels no lineales)
  - 'scale': 1 / (n_features * X.var())
  - 'auto': 1 / n_features

**Ventajas**:
- Excelente con datos de alta dimensionalidad
- Efectivo con poco memoria
- Versátil (diferentes kernels)

**Desventajas**:
- Entrenamiento lento con datasets grandes
- Sensible a escala de features
- Difícil de interpretar

#### KNN (K-Nearest Neighbors)
**Algoritmo**: Clasifica basándose en las K instancias más similares.

**Hiperparámetros**:
- `n_neighbors`: Número de vecinos (default: 5)
  - K bajo: más sensible a ruido
  - K alto: límites de decisión más suaves
- `weights`: Ponderación de vecinos
  - 'uniform': todos los vecinos iguales
  - 'distance': vecinos más cercanos tienen más peso
- `metric`: Métrica de distancia
  - 'cosine': similitud angular (recomendado para texto)
  - 'euclidean': distancia L2
  - 'manhattan': distancia L1

**Ventajas**:
- No requiere entrenamiento (lazy learning)
- Adaptativo a cambios en datos
- Intuitivo y simple

**Desventajas**:
- Predicción lenta con muchos datos
- Sensible a features irrelevantes
- Requiere mucha memoria

### 3. Preparación de Datos

#### Vectorización
- **TF-IDF** (recomendado): Captura importancia relativa de términos
- **Count (BoW)**: Frecuencias absolutas

#### Parámetros
- `max_features`: Número máximo de términos (default: 5000)
- `test_size`: Proporción de datos de prueba (default: 0.2)
- Stratified split: Mantiene distribución de clases

### 4. Evaluación Completa

#### Métricas Principales
- **Accuracy**: Proporción de predicciones correctas
  ```
  Accuracy = (TP + TN) / Total
  ```

- **Precision**: De las predicciones positivas, cuántas son correctas
  ```
  Precision = TP / (TP + FP)
  ```

- **Recall**: De los casos positivos, cuántos detectamos
  ```
  Recall = TP / (TP + FN)
  ```

- **F1-Score**: Media armónica de Precision y Recall
  ```
  F1 = 2 * (Precision * Recall) / (Precision + Recall)
  ```

#### Validación Cruzada
- K-Fold Cross-Validation (default: 5 folds)
- Proporciona estimación robusta del rendimiento
- Muestra media y desviación estándar

#### Matriz de Confusión
- Visualización interactiva con Plotly
- Muestra errores de clasificación
- Identifica confusiones entre clases

#### ROC y AUC
- Área bajo la curva ROC
- Mide capacidad discriminativa del modelo
- Multiclase: promedio ponderado

#### Métricas por Clase
- Precision, Recall, F1 para cada categoría
- Support: número de instancias
- Identifica clases problemáticas

#### Feature Importance
- **Naive Bayes**: Log-probabilidades por clase
- **SVM Linear**: Pesos del hiperplano
- Top features más importantes para cada categoría
- Visualización con gráficos de barras

### 5. Visualizaciones

#### Comparación de Modelos
- Tabla con todas las métricas
- Highlighting del mejor modelo
- Gráficos de barras comparativos
- Selección de métricas a visualizar

#### Matrices de Confusión
- Heatmap interactivo
- Valores absolutos
- Colores por intensidad

#### Feature Importance
- Top 20 features por clase
- Gráficos horizontales
- Ordenados por importancia

### 6. Predicción

#### Texto Directo
- Ingresa cualquier texto nuevo
- Predicción instantánea
- Probabilidades por clase (si disponible)

#### Documentos sin Etiquetar
- Clasifica automáticamente documentos sin etiqueta
- Opción de guardar predicciones como etiquetas
- Útil para semi-supervisado

### 7. Persistencia

#### Exportar Etiquetas
- Formato CSV: `document, label`
- Formato JSON: diccionario completo
- Timestamp en nombre de archivo

#### Exportar Resultados
- Métricas de cada modelo en CSV
- Métricas por clase
- Configuración utilizada

#### Google Drive
- Integración con sistema de persistencia
- Carpeta: `11_Classification_Results`
- Todos los resultados en un solo lugar

## Flujo de Trabajo Recomendado

### 1. Preparación
```
1. Ejecutar pasos 1-5 (hasta Preprocesamiento)
2. Tener textos preprocesados disponibles
```

### 2. Etiquetado
```
1. Ir a tab "Etiquetado"
2. Método recomendado:
   - Manual: Para datasets pequeños (<100 docs)
   - Automático + Manual: Para datasets medianos
   - CSV Import: Para datasets con etiquetas existentes
3. Objetivo: Al menos 10-20 ejemplos por clase
```

### 3. Entrenamiento
```
1. Ir a tab "Configuración"
2. Configurar parámetros:
   - Vectorización: TF-IDF (recomendado)
   - Test size: 20-30%
   - Max features: 3000-5000
3. Configurar cada modelo:
   - Naive Bayes: Multinomial, alpha=1.0
   - SVM: Linear kernel, C=1.0
   - KNN: n_neighbors=5, metric=cosine
4. Entrenar todos los modelos
```

### 4. Análisis
```
1. Revisar resultados en tabs individuales
2. Comparar modelos en tab "Comparación"
3. Identificar mejor modelo
4. Analizar matriz de confusión
5. Revisar feature importance
```

### 5. Predicción
```
1. Usar modelo seleccionado
2. Predecir documentos sin etiquetar
3. Validar predicciones manualmente
4. Guardar como etiquetas si es correcto
```

### 6. Exportación
```
1. Exportar etiquetas finales
2. Exportar resultados de modelos
3. Guardar en Google Drive
```

## Casos de Uso

### Categorización de Documentos Académicos
```python
Categorías:
- technology
- education
- healthcare
- business
- social_sciences

Modelo recomendado: SVM Linear
Features: 5000
Test size: 0.25
```

### Detección de Tópicos
```python
Categorías:
- digital_transformation
- innovation
- sustainability
- quality_management

Modelo recomendado: Naive Bayes Multinomial
Features: 3000
Alpha: 0.5
```

### Clasificación Binaria
```python
Categorías:
- relevant
- not_relevant

Modelo recomendado: SVM Linear
C: 0.5 (más generalización)
Features: 2000
```

## Recomendaciones y Mejores Prácticas

### Tamaño de Dataset
- **Mínimo**: 50 documentos (10-20 por clase)
- **Ideal**: 200+ documentos (50+ por clase)
- **Grande**: 1000+ documentos

### Desbalanceo de Clases
- Si una clase tiene <10% de los datos:
  - Usar Naive Bayes Complement
  - Ajustar class_weight en SVM
  - Aumentar datos de clase minoritaria

### Número de Clases
- **2-3 clases**: Cualquier modelo funciona bien
- **4-7 clases**: SVM o Naive Bayes preferibles
- **8+ clases**: Considerar modelos más complejos o reducir clases

### Features (max_features)
- Regla general: `max_features ≈ sqrt(n_docs) * 100`
- Mínimo: 500
- Máximo práctico: 10000
- Más features ≠ mejor rendimiento

### Interpretabilidad vs Performance
- **Más interpretable**: Naive Bayes (probabilidades, feature importance)
- **Mejor performance**: SVM con kernel apropiado
- **Balance**: SVM Linear (buen rendimiento + cierta interpretabilidad)

### Validación
- Siempre usar validación cruzada
- Si accuracy >> CV accuracy → overfitting
- Si diferencia <5% → modelo generaliza bien

## Limitaciones Conocidas

1. **Memoria**: KNN requiere todo el dataset en memoria
2. **Velocidad**: SVM con kernels no lineales es lento con >1000 docs
3. **Nuevas clases**: Requiere re-entrenamiento completo
4. **Interpretabilidad**: SVM con RBF/Poly difícil de interpretar
5. **Features categóricas**: Solo soporta texto, no metadata categórica

## Próximas Mejoras

- [ ] Ensemble methods (Voting, Stacking)
- [ ] Random Forest
- [ ] Gradient Boosting (XGBoost)
- [ ] Deep Learning (BERT fine-tuning)
- [ ] Active Learning para etiquetado
- [ ] Explicabilidad con LIME/SHAP
- [ ] Balanceo automático de clases (SMOTE)
- [ ] Optimización de hiperparámetros (Grid Search)

## Referencias

### Papers
- "Naive Bayes and Text Classification" - McCallum & Nigam (1998)
- "Support Vector Machines for Text Categorization" - Joachims (1998)
- "A Comparison of Event Models for Naive Bayes Text Classification" - McCallum & Nigam (1998)

### Librerías
- scikit-learn: https://scikit-learn.org/
- NLTK: https://www.nltk.org/
- spaCy: https://spacy.io/

### Tutoriales
- Text Classification Guide: https://scikit-learn.org/stable/tutorial/text_analytics/working_with_text_data.html
- SVM Tutorial: https://scikit-learn.org/stable/modules/svm.html
- Model Evaluation: https://scikit-learn.org/stable/modules/model_evaluation.html

---

**Autor**: Sistema de Análisis de Transformación Digital
**Versión**: 1.0
**Fecha**: 2025

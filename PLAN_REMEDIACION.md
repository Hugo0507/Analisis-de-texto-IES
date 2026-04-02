# Plan de Remediacion Tecnica — Analisis de Texto IES

> Generado: 2026-04-01
> Basado en: Informe de Auditoria Tecnica vs. Propuesta de Tesis (Universidad de los Llanos, 2024)
> Objetivo: Resolver las brechas identificadas entre la propuesta aprobada y la implementacion actual
> Destinatario: Sesion de desarrollo (Claude Code) para implementacion secuencial

---

## CONTEXTO RAPIDO PARA LA SESION DE IMPLEMENTACION

El proyecto es una plataforma NLP de tesis (Django REST + React + PostgreSQL) que analiza
literatura cientifica sobre transformacion digital en educacion superior. La auditoria contra
la propuesta de tesis revelo 3 brechas criticas y 3 mejoras menores. Este documento define
el diseno de solucion para cada una SIN codigo fuente — solo arquitectura, flujos y pasos logicos.

El repositorio esta en `C:\Projects\Analisis-de-texto-IES`.
El archivo de contexto del proyecto esta en `CONTEXTO_LOCAL.md`.
La rama de trabajo es `main` (push directo).

---

## HALLAZGO 1 — MODELO DE LENGUAJE NEURONAL (RNN/LSTM)

### Severidad: ALTA
### Referencia en la propuesta: Fase 3, Actividad 9

La propuesta exige: "Implementar un metodo de modelo de lenguaje entre N-gramas, Recurrent
Neural Networks (RNN) o Long Short Term Memory (LSTM) o Transformers para identificar
terminos relevantes o sus relaciones."

N-gramas ya esta implementado (app `ngram_analysis`). Transformers pre-entrenados se usan
en BERTopic. Pero NO existe ningun modelo RNN o LSTM entrenado sobre el corpus.

### Estrategia de Solucion

Implementar un modelo LSTM ligero para **clasificacion de documentos por topico dominante**
usando PyTorch (ya en `requirements-hf.txt`). El modelo tomara los textos preprocesados del
corpus, los representara con embeddings simples, y los clasificara en los topicos previamente
identificados por LDA/NMF. Esto demuestra la capacidad de un modelo de lenguaje neuronal
para identificar relaciones entre terminos y documentos.

Se elige clasificacion por tema (en vez de generacion de texto o prediccion de secuencias)
porque:
- Se integra directamente con el pipeline existente (usa la misma data que topic modeling)
- Produce metricas cuantificables (accuracy, loss, confusion matrix)
- Es interpretable para la sustentacion (muestra que los temas son distinguibles por NN)
- No requiere GPU (el corpus es pequeno, ~274 docs, viable en CPU)

### Diseno Paso a Paso

**PASO 1 — Nuevo app Django: `lstm_analysis`**

Crear un nuevo app Django siguiendo la misma convencion de las apps existentes
(`bag_of_words`, `topic_modeling`, etc.):

- Modelo `LstmAnalysis` con campos:
  - Relacion a `DataPreparation` (fuente de textos preprocesados)
  - Relacion a `TopicModeling` (fuente de etiquetas de topico por documento)
  - Hiperparametros: `embedding_dim` (64), `hidden_dim` (128), `num_layers` (1),
    `num_epochs` (20), `learning_rate` (0.001), `batch_size` (16),
    `train_split` (0.8), `max_vocab_size` (5000), `max_seq_length` (500)
  - Resultados: `accuracy` (float), `loss_history` (JSONField lista de floats),
    `confusion_matrix` (JSONField matriz NxN), `classification_report` (JSONField),
    `training_time_seconds` (float)
  - Metadata: `status`, `progress_percentage`, `current_stage`, `error_message`
  - Artefactos: `model_artifact_bin` (BinaryField para el modelo serializado)

- Archivo `processor.py` con pipeline de 8 etapas:
  1. Cargar textos preprocesados del DataPreparation
  2. Cargar etiquetas de topico dominante del TopicModeling seleccionado
  3. Construir vocabulario (word-to-index) del corpus, limitado a `max_vocab_size`
  4. Convertir textos a secuencias de indices, padding/truncate a `max_seq_length`
  5. Dividir en train/test segun `train_split`
  6. Definir arquitectura LSTM: Embedding -> LSTM -> Linear -> Softmax
  7. Entrenar: loop de epochs con CrossEntropyLoss, Adam optimizer, tracking de loss
  8. Evaluar: accuracy sobre test set, confusion matrix, classification report por clase

- Archivo `views.py` siguiendo el patron existente (POST para crear, GET para detalle,
  GET progress para polling)

- Archivo `urls.py` con endpoints:
  - `POST /lstm-analysis/` — crear y ejecutar analisis
  - `GET /lstm-analysis/{id}/` — detalle con resultados
  - `GET /lstm-analysis/{id}/progress/` — polling de progreso
  - `DELETE /lstm-analysis/{id}/` — eliminar

**PASO 2 — Logica del procesador LSTM**

El procesador debe seguir este flujo logico:

1. Leer `DataPreparation.processed_texts` (lista de textos limpios, tokenizados)
2. Leer `TopicModeling.document_topics` (lista de asignaciones documento -> temas dominante)
3. Filtrar documentos que tengan tanto texto preprocesado como tema asignado
4. Construir vocabulario: contar frecuencia de todas las palabras, tomar las top N,
   asignar indice secuencial. Reservar indice 0 para padding, 1 para unknown.
5. Codificar cada documento como secuencia de indices de palabras
6. Aplicar padding (rellenar con 0s) o truncamiento a `max_seq_length`
7. Codificar etiquetas de topico como enteros secuenciales (0, 1, 2, ..., num_topics-1)
8. Separar aleatoriamente en train (80%) y test (20%) con semilla fija para reproducibilidad
9. Crear DataLoader de PyTorch con `batch_size`
10. Definir modelo secuencial:
    - Capa Embedding: vocab_size x embedding_dim
    - Capa LSTM: embedding_dim -> hidden_dim, num_layers capas
    - Tomar el hidden state final del LSTM (ultimo timestep)
    - Capa Linear: hidden_dim -> num_clases
11. Entrenar con CrossEntropyLoss y Adam
12. En cada epoch: calcular loss promedio, guardar en loss_history
13. Al finalizar: evaluar en test set, generar confusion matrix y classification report
14. Serializar modelo con torch.save() y guardar en model_artifact_bin

**PASO 3 — Frontend: pagina de LSTM**

Crear los componentes frontend siguiendo el patron de `TopicModelingCreate.tsx` y
`TopicModelingView.tsx`:

- `LstmAnalysisCreate.tsx`: Formulario con selects para DataPreparation y TopicModeling,
  inputs numericos para hiperparametros con valores por defecto
- `LstmAnalysisView.tsx`: Pagina de resultados con:
  - KPI cards: accuracy, epochs, training time
  - Grafico de linea (Nivo Line o Chart.js): loss por epoch (curva de aprendizaje)
  - Heatmap (Nivo Heatmap): confusion matrix (filas=real, columnas=predicho)
  - Tabla: classification report (precision, recall, f1 por clase/topico)
- `LstmAnalysisList.tsx`: Lista de analisis con status badges

Agregar rutas en `App.tsx`:
- `/admin/modelado/lstm` — lista
- `/admin/modelado/lstm/nuevo` — crear
- `/admin/modelado/lstm/:id` — ver resultados

Agregar entrada en el Sidebar bajo la seccion "Modelado".

**PASO 4 — Integracion con el dashboard de Modelado**

En `ModeladoDashboard.tsx`, agregar una seccion para LSTM que muestre:
- Accuracy del ultimo modelo entrenado
- Mini curva de loss (sparkline)
- Link a la vista detallada

### Flujo de Integracion

```
DataPreparation (textos limpios)
        |
        v
TopicModeling (etiquetas de topico por documento)
        |
        v
LSTM Analysis (entrena clasificador neuronal)
        |
        +-- loss_history --> LineChart (curva de aprendizaje)
        +-- confusion_matrix --> Heatmap (prediccion vs real)
        +-- accuracy + classification_report --> KPI cards + tabla
        +-- model_artifact_bin --> Serializado para futura inferencia
```

El LSTM NO reemplaza ni modifica ningun componente existente. Es un modulo adicional
que consume los mismos datos que ya existen (textos del DataPreparation, topicos del
TopicModeling) y produce resultados nuevos.

### Artefactos de Ingenieria Recomendados

- Diagrama de arquitectura del modelo LSTM (capas Embedding -> LSTM -> Linear)
- Diagrama de flujo de datos desde DataPreparation hasta los resultados del LSTM
- Tabla comparativa: N-gramas vs LSTM vs Transformers (BERTopic) en el contexto del proyecto
- Matriz de confusion con interpretacion cualitativa de los resultados por topico

---

## HALLAZGO 2 — VISUALIZACION DE REDUCCION DIMENSIONAL (PCA / t-SNE / UMAP)

### Severidad: MEDIA
### Referencia en la propuesta: Fase 3, Actividad 10

La propuesta exige: "Implementar un metodo de reduccion de la dimensionalidad y visualizacion
de datos para analisis de texto basado en aprendizaje automatico como PCA, t-SNE o UMAP."

UMAP se usa internamente en BERTopic pero no se expone como visualizacion independiente.
PCA y t-SNE no estan implementados. No hay scatter plot de documentos en el frontend.

### Estrategia de Solucion

Agregar una funcionalidad de **proyeccion 2D de documentos** al dashboard de Modelado.
Se usaran los embeddings que BERTopic ya calcula (sentence-transformers) y se proyectaran
a 2D con tres metodos: PCA, t-SNE y UMAP. Cada documento sera un punto en el scatter
plot, coloreado por su topico dominante.

Se elige extender la app `bertopic` existente (en vez de crear una app nueva) porque:
- Los embeddings ya se calculan en el pipeline de BERTopic
- Solo falta almacenar las proyecciones 2D y exponerlas via API
- El frontend ya tiene `@nivo/scatterplot` instalado como dependencia

### Diseno Paso a Paso

**PASO 1 — Extender el procesador de BERTopic**

Agregar una etapa adicional al pipeline de `bertopic/processor.py` (actualmente 9 etapas,
pasaria a 10) que, despues de calcular los topicos, ejecute:

1. Tomar los embeddings de documentos (ya calculados en la etapa de sentence-transformers)
2. Aplicar PCA (sklearn PCA, n_components=2) sobre los embeddings
3. Aplicar t-SNE (sklearn TSNE, n_components=2, perplexity=30) sobre los embeddings
4. Aplicar UMAP (umap-learn, n_components=2, n_neighbors=15) sobre los embeddings
5. Almacenar las 3 proyecciones como JSONField en el modelo BERTopicAnalysis

El resultado seria un nuevo campo `projections_2d` (JSONField) con estructura:
```
{
  "pca": [{"x": float, "y": float, "doc_index": int, "topic_id": int}, ...],
  "tsne": [{"x": float, "y": float, "doc_index": int, "topic_id": int}, ...],
  "umap": [{"x": float, "y": float, "doc_index": int, "topic_id": int}, ...]
}
```

**PASO 2 — Exponer via API**

Agregar un endpoint (o incluir en el detalle existente de BERTopic) que devuelva
las proyecciones 2D. Si el campo `projections_2d` es muy grande, considerar un
endpoint dedicado: `GET /bertopic/{id}/projections/`.

**PASO 3 — Componente frontend: ScatterPlotProjection**

Crear un componente reutilizable `ScatterPlotProjection.tsx` en `components/organisms/`
que reciba los datos de proyeccion y renderice un scatter plot interactivo con Nivo:

- Selector de metodo: tabs o dropdown para alternar entre PCA, t-SNE y UMAP
- Cada punto representa un documento
- Color por topico dominante (misma paleta que el resto del dashboard)
- Tooltip al hover: nombre del documento, topico asignado, palabras clave del topico
- Leyenda de colores por topico
- Ejes con labels descriptivos ("Componente 1", "Componente 2")

**PASO 4 — Integracion en dashboards**

- En `BERTopicView.tsx`: agregar seccion "Proyeccion de documentos" despues de la
  distribucion de topicos, con el scatter plot y los 3 tabs de metodos
- En `ModeladoDashboard.tsx`: agregar version compacta del scatter plot (solo UMAP,
  sin tabs) como representacion visual del science mapping

### Flujo de Integracion

```
BERTopic processor (etapa existente: sentence-transformers embeddings)
        |
        v
Nueva etapa: PCA + t-SNE + UMAP sobre los mismos embeddings
        |
        v
projections_2d JSONField en BERTopicAnalysis
        |
        v
API endpoint: GET /bertopic/{id}/ (incluye projections_2d)
        |
        v
ScatterPlotProjection component (frontend, Nivo scatterplot)
        |
        +-- Tab PCA: scatter plot 2D
        +-- Tab t-SNE: scatter plot 2D
        +-- Tab UMAP: scatter plot 2D
```

Los componentes existentes NO se modifican (donut de distribucion, barras de top words).
El scatter plot se agrega como seccion adicional debajo de los resultados actuales.

### Artefactos de Ingenieria Recomendados

- Diagrama comparativo visual de las 3 proyecciones (PCA vs t-SNE vs UMAP) con
  sus propiedades matematicas (lineal vs no lineal, preservacion global vs local)
- Capturas de pantalla de los scatter plots en la sustentacion mostrando los clusters
  de documentos por topico
- Analisis cualitativo de la separabilidad de los clusters en cada metodo



## HALLAZGO 4 — SCATTER PLOT DE SCIENCE MAPPING EN EL FRONTEND

### Severidad: BAJA
### Referencia en la propuesta: Fase 4, Actividad 12

Este hallazgo se resuelve automaticamente al implementar el Hallazgo 2 (proyecciones 2D).
El scatter plot de documentos coloreado por topico constituye el "science mapping" visual
requerido por la propuesta.

### Accion adicional

En el `ModeladoDashboard.tsx`, agregar una seccion titulada "Mapa de Ciencia" o "Science Map"
que muestre el scatter plot UMAP con los documentos del corpus. Esto debe estar visible
en el dashboard publico (no solo en la vista admin de BERTopic).

La seccion debe incluir:
- Titulo descriptivo: "Mapa de ciencia del corpus — proyeccion UMAP"
- El scatter plot con documentos coloreados por topico
- Leyenda con nombre de cada topico y su color
- Texto explicativo breve: "Cada punto representa un documento del corpus. Los documentos
  cercanos tratan temas similares. El color indica el topico dominante asignado."

---

## HALLAZGO 5 — DEPRECACION DE CODIGO LEGACY

### Severidad: BAJA
### No referenciado directamente en la propuesta

La app `analysis/` contiene implementaciones originales (bow_service, tfidf_service,
topic_modeling_service) que duplican funcionalidad de las apps mas nuevas.

### Estrategia de Solucion

NO eliminar el codigo legacy antes de la sustentacion. Eliminar codigo introduce riesgo de
regresion sin beneficio funcional. En su lugar:

1. Agregar un comentario docstring en `analysis/__init__.py` indicando que esta app es legacy
   y que las implementaciones activas estan en `bag_of_words`, `tfidf_analysis` y
   `topic_modeling`
2. En la documentacion del trabajo de grado, explicar la evolucion arquitectonica: por que
   se migraron las funcionalidades a apps separadas (mejor modularidad, procesadores
   independientes con tracking de progreso, serializers especificos)
3. Verificar que ninguna ruta de la API activa dependa de los services legacy. Si alguna lo
   hace, migrarla a las apps nuevas antes de la sustentacion.

---

## HALLAZGO 6 — TESTS AUTOMATIZADOS

### Severidad: BAJA
### No referenciado directamente en la propuesta, pero esperado en una tesis de Ingenieria de Sistemas

### Estrategia de Solucion

Implementar un set minimo de tests que demuestre buenas practicas de ingenieria de software.
No es necesario cobertura completa; se buscan tests representativos de cada capa.

### Tests recomendados (en orden de prioridad)

1. **Test de modelo** (1 test): Verificar que se puede crear un `BagOfWords` con los campos
   requeridos y que los valores por defecto son correctos.

2. **Test de procesador** (1 test): Dado un conjunto pequeno de textos fijos (3 textos cortos),
   verificar que `CountVectorizer` produce un vocabulario y una matriz del tamano esperado.

3. **Test de API** (1 test): Hacer POST a `/datasets/` con un archivo de prueba y verificar
   que retorna 201.

4. **Test de preprocesamiento** (1 test): Dado un texto con URLs, numeros y stopwords,
   verificar que `preprocess_for_inference()` los elimina correctamente.

Ubicacion: `backend/tests/` siguiendo la estructura existente de pytest.

---

## ORDEN DE IMPLEMENTACION RECOMENDADO

Priorizado por impacto en la sustentacion y dependencias tecnicas:

| Orden | Hallazgo | Descripcion | Esfuerzo estimado | Dependencias |
|-------|----------|-------------|-------------------|--------------|
| 1 | H2 | Proyecciones 2D (PCA/t-SNE/UMAP) | 1 sesion | Requiere BERTopic existente |
| 2 | H4 | Science Map en dashboard | 0.5 sesion | Requiere H2 completado |
| 3 | H1 | Modelo LSTM | 2 sesiones | Requiere DataPreparation + TopicModeling || 
| 4 | H5 | Deprecacion legacy | 0.5 sesion | Independiente |
| 5 | H6 | Tests automatizados | 0.5 sesion | Independiente |

**Total estimado: 5-6 sesiones de trabajo.**

---

## NOTAS PARA LA SESION DE IMPLEMENTACION

- Leer `CONTEXTO_LOCAL.md` antes de empezar para entender el estado actual del proyecto
- Leer `MEMORY.md` y sus archivos vinculados para reglas del proyecto (push directo a main,
  no correr servidor local, planificar antes de implementar)
- PyTorch ya esta en `requirements-hf.txt` (CPU-only) — no agregar dependencias nuevas
  para el LSTM
- scikit-learn ya tiene PCA y TSNE — no agregar dependencias nuevas para las proyecciones
- `@nivo/scatterplot` ya esta en `package.json` del frontend — no agregar dependencias nuevas
  para el scatter plot
- Todas las dependencias necesarias YA ESTAN INSTALADAS. No se necesita agregar nada
  a requirements ni package.json.
- Seguir el patron de las apps existentes (processor.py con etapas, views.py con REST,
  polling de progreso, serializers.py, urls.py)
- Actualizar `CONTEXTO_LOCAL.md` al finalizar cada hallazgo resuelto

---

## ARTEFACTOS DE INGENIERIA PARA EL DOCUMENTO DE TESIS

Lista consolidada de diagramas y documentos que el estudiante debe elaborar para respaldar
estas soluciones en su trabajo de grado:

1. **Diagrama de componentes C4** — Vista general de la arquitectura del sistema
   (frontend, backend, DB, servicios externos)
2. **Diagrama de flujo ETL** — Desde la busqueda en bases de datos hasta la carga
   en la plataforma
3. **Diagrama de arquitectura LSTM** — Capas del modelo neuronal con dimensiones
4. **Diagrama de flujo de datos del pipeline NLP** — DataPreparation -> BoW -> TF-IDF ->
   Topic Modeling -> LSTM -> Visualizacion
5. **Tabla comparativa de algoritmos** — LDA vs NMF vs LSA vs pLSA vs BERTopic,
   con metricas (coherencia, perplejidad, tiempo de entrenamiento)
6. **Tabla comparativa de proyecciones** — PCA vs t-SNE vs UMAP con propiedades
   matematicas y aplicabilidad
7. **Capturas de pantalla** — Todos los dashboards, scatter plots, confusion matrix,
   curvas de aprendizaje
8. **Diagrama de casos de uso** — Actores (investigador, administrador) y funcionalidades
   del sistema
9. **Diagrama de despliegue** — Vercel + HuggingFace Spaces + Neon PostgreSQL + GitHub CI/CD

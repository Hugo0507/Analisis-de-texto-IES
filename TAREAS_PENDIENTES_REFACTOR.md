# 📋 TAREAS PENDIENTES - REFACTOR COMPLETO DEL PROYECTO

**Fecha**: 2025-01-27
**Estado**: En progreso
**Prioridad**: Alta

---

## ✅ COMPLETADO

### 1. Analizadores BoW y TF-IDF
- ✅ Creado `src/bow_analyzer.py`
- ✅ Creado `src/tfidf_analyzer.py`
- ✅ Verificado que el pipeline ya tiene BoW y TF-IDF integrados

### 2. Mejoras en Detección de Idiomas
- ✅ Cambiado de PyPDF2 a pdfminer.six (más robusto)
- ✅ Agregada validación temprana (primeros 10 archivos)
- ✅ Mejorado logging diagnóstico

### 3. Correcciones UX
- ✅ Botones de retorno en conversion_txt_ui.py
- ✅ Botones de retorno en deteccion_idiomas_ui.py
- ✅ Botones de retorno en preprocesamiento_ui.py
- ✅ Mensajes informativos cuando no hay datos

### 4. Conceptos Documentados
- ✅ Explicado relación N-gramas con TF-IDF

---

## ⏳ PENDIENTE - ALTA PRIORIDAD

### 1. Agregar Botones de Retorno a TODAS las Páginas

**Problema**: Algunas páginas no tienen botón de retorno o se "congelan" sin datos.

**Páginas a corregir**:
```
components/pages/bolsa_palabras/bolsa_palabras_ui.py
components/pages/analisis_tfidf/analisis_tfidf_ui.py
components/pages/analisis_factores/analisis_factores_ui.py
components/pages/consolidacion_factores/consolidacion_factores_ui.py
components/pages/visualizaciones/visualizaciones_ui.py
components/pages/estadisticas_archivos/estadisticas_archivos_ui.py
components/pages/evaluacion_desempeno/evaluacion_desempeno_ui.py
components/pages/nube_palabras/nube_palabras_ui.py
components/pages/models/bertopic/bertopic_page_ui.py
components/pages/models/classification/classification_page_ui.py
components/pages/models/dimensionality_reduction/dimensionality_reduction_page_ui.py
components/pages/models/ner_analysis/ner_analysis_ui.py
components/pages/models/ngram_analysis/ngram_analysis_page_ui.py
components/pages/models/topic_modeling/topic_modeling_page_ui.py
```

**Acción requerida**:
- Agregar `from components.ui.helpers import show_return_to_dashboard_button`
- Llamar `show_return_to_dashboard_button()` en TODOS los returns tempranos
- Asegurar que siempre se muestre el botón incluso con errores

**Patrón a seguir**:
```python
def render():
    if 'pipeline_manager' not in st.session_state:
        st.info("ℹ️ El pipeline aún no se ha ejecutado...")
        show_return_to_dashboard_button()  # ← SIEMPRE mostrar
        return

    # ... resto del código ...

    show_return_to_dashboard_button()  # ← Al final
```

---

### 2. Corregir NER para Mostrar Gráficas y Estadísticas

**Problema**: NER solo muestra "✅ Análisis NER completado" pero sin gráficas.

**Archivo**: `components/pages/models/ner_analysis/ner_analysis_ui.py`

**Referencia**: Ver líneas 1220-1295 del archivo `trabajo_de_grado_(epi).py`:
- Gráfico de barras de Top Entidades GPE
- Gráfico de barras de Top Entidades ORG
- Distribución de entidades (barplot)
- Gráfico de torta de etiquetas de entidades

**Acción requerida**:
1. Leer resultados NER del pipeline: `pipeline_manager.results.get('ner_corpus_analysis', {})`
2. Crear gráficos con Plotly:
   - Top entidades GPE (países/ciudades)
   - Top entidades ORG (organizaciones)
   - Distribución general de entidades
   - Gráfico circular de tipos de entidades
3. Mostrar estadísticas detalladas

---

### 3. Eliminar Archivos Vacíos/Innecesarios

**Archivos a eliminar** (solo tienen comentarios TODO, no aportan lógica):

```bash
# Archivos de lógica vacíos (7 líneas = solo comentarios)
components/pages/analisis_factores/analisis_factores.py
components/pages/analisis_tfidf/analisis_tfidf.py
components/pages/bolsa_palabras/bolsa_palabras.py
components/pages/deteccion_idiomas/deteccion_idiomas.py
components/pages/preprocesamiento/preprocesamiento.py
components/pages/models/bertopic/bertopic_page.py
components/pages/models/classification/classification_page.py
components/pages/models/dimensionality_reduction/dimensionality_reduction_page.py
components/pages/models/ner_analysis/ner_analysis.py
components/pages/models/ngram_analysis/ngram_analysis_page.py
components/pages/models/topic_modeling/topic_modeling_page.py

# Archivos incompletos
components/pages/nube_palabras/nube_palabras.py (1 línea)
components/pages/visualizaciones/visualizaciones.py (1 línea)
```

**Comando para eliminar**:
```bash
git rm components/pages/analisis_factores/analisis_factores.py
git rm components/pages/analisis_tfidf/analisis_tfidf.py
git rm components/pages/bolsa_palabras/bolsa_palabras.py
# ... etc para todos los archivos vacíos
```

**IMPORTANTE**: Después de eliminar, actualizar los `__init__.py` de cada carpeta para no importar estos archivos.

---

### 4. Mover Lógica de Estadísticas a src/

**Archivo a mover**:
- `components/pages/estadisticas_archivos/estadisticas_archivos.py` → `src/file_statistics.py`

**Razón**: Este archivo contiene lógica de negocio (cálculos de estadísticas), no UI.

**Acción**:
1. Mover archivo a `src/file_statistics.py`
2. Actualizar imports en `estadisticas_archivos_ui.py`:
   ```python
   from src.file_statistics import ...
   ```
3. Eliminar `components/pages/estadisticas_archivos/estadisticas_archivos.py`

---

### 5. Eliminar Referencias al Menú Lateral (Legacy Code)

**Buscar y eliminar en todos los archivos**:

```bash
# Buscar referencias
grep -r "sidebar" components/ src/
grep -r "st.sidebar" components/ src/
grep -r "with st.sidebar" components/ src/
```

**Archivos probables**:
- `app.py` (configuración inicial)
- Cualquier componente que tenga código legacy

**Qué eliminar**:
- Configuración de `st.sidebar`
- Widgets en sidebar (st.sidebar.*)
- Lógica de navegación con sidebar

**Qué conservar**:
- Solo navegación por `st.session_state.current_page`
- Botones de retorno al Dashboard

---

### 6. Actualizar Documentación en docs/

**Archivos a actualizar** (contienen información obsoleta):

```
docs/
├── arquitectura/
│   ├── ARQUITECTURA.md (✅ YA ACTUALIZADO)
│   ├── flujo_datos.md
│   └── estructura_proyecto.md
├── configuracion/
│   ├── CONFIGURACION_DRIVE.md
│   ├── instalacion.md
│   └── requisitos.md
├── guias/
│   ├── guia_despliegue.md
│   ├── guia_usuario.md
│   └── troubleshooting.md
└── api/
    └── referencia_api.md
```

**Información obsoleta a eliminar**:
- Referencias al menú lateral
- Referencias a inicio.py
- Flujos de navegación antiguos
- Capturas de pantalla desactualizadas

**Información a agregar/actualizar**:
- Pipeline automático al conectar Drive
- Dashboard Principal como hub único
- Botones de retorno en todas las páginas
- Nuevo flujo: Drive → Pipeline → Dashboard → Páginas de resultados
- Validación temprana de idiomas (primeros 10 archivos)
- Uso de pdfminer.six en lugar de PyPDF2

---

## ⚙️ VERIFICACIONES ADICIONALES

### 7. Verificar Llamadas del Pipeline

**Archivo**: `src/pipeline_manager.py`

**Verificar que estas etapas se llamen correctamente**:
```python
# Líneas ~200-300 aproximadamente
if self.config.PIPELINE['stages'].get('bow', True):
    self._execute_stage(stage_idx, self._stage_bow, ...)
    stage_idx += 1

if self.config.PIPELINE['stages'].get('tfidf', True):
    self._execute_stage(stage_idx, self._stage_tfidf, ...)
    stage_idx += 1
```

**Estado**: ✅ Ya verificado - BoW y TF-IDF están integrados correctamente

---

### 8. Módulo de Clasificación Manual

**Requisito**: El módulo de clasificación DEBE permitir etiquetado manual.

**Archivo**: `components/pages/models/classification/classification_page_ui.py`

**Funcionalidad requerida**:
1. Interface para cargar/crear conjunto de entrenamiento etiquetado
2. Formulario para etiquetar documentos manualmente
3. Guardar etiquetas en Drive
4. Entrenar modelos con datos etiquetados
5. Evaluar modelos (accuracy, precision, recall, F1)

**Estado**: PENDIENTE - Requiere diseño UI completo

---

## 📊 RESUMEN DE TAREAS

| Tarea | Prioridad | Complejidad | Tiempo Estimado |
|-------|-----------|-------------|-----------------|
| Botones de retorno en TODAS las páginas | ALTA | Baja | 30 min |
| Corregir NER (gráficas) | ALTA | Media | 1 hora |
| Eliminar archivos vacíos | MEDIA | Baja | 15 min |
| Mover estadisticas_archivos.py | MEDIA | Baja | 10 min |
| Eliminar referencias sidebar | MEDIA | Media | 30 min |
| Actualizar documentación | MEDIA | Media | 2 horas |
| Módulo clasificación manual | BAJA | Alta | 4 horas |

**TOTAL**: ~8-9 horas de trabajo

---

## 🚀 PLAN DE ACCIÓN SUGERIDO

### Fase 1: Correcciones Críticas (1-2 horas)
1. Agregar botones de retorno a TODAS las páginas
2. Corregir NER para mostrar gráficas
3. Probar flujo completo

### Fase 2: Limpieza de Código (1 hora)
4. Eliminar archivos vacíos
5. Mover estadisticas_archivos.py a src/
6. Eliminar referencias al sidebar

### Fase 3: Documentación (2 horas)
7. Actualizar todos los archivos en docs/
8. Crear guías actualizadas

### Fase 4: Funcionalidad Adicional (4 horas)
9. Implementar módulo de clasificación manual (si es prioritario)

---

## 📝 NOTAS

- **BoW y TF-IDF**: Ya están completamente integrados en el pipeline (líneas 955-1170 de pipeline_manager.py)
- **N-gramas**: Se usan en BoW y TF-IDF para capturar frases (ej: "digital transformation")
- **Validación temprana**: Ya implementada, detecta problemas en los primeros 10 archivos
- **pdfminer.six**: Ya en uso para extracción de texto robusta

---

## 🔗 ARCHIVOS CLAVE

### Para Referencia:
- `trabajo_de_grado_(epi).py` - Código original de referencia
- `src/pipeline_config.py` - Configuración centralizada
- `src/pipeline_manager.py` - Lógica del pipeline
- `components/ui/helpers.py` - Helper para botones de retorno

### Para Modificar:
- Todas las páginas UI en `components/pages/`
- Documentación en `docs/`
- Módulo de clasificación (a desarrollar)

---

**Última actualización**: 2025-01-27 por Claude Code

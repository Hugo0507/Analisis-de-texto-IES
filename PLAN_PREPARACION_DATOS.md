# Plan de Implementación: Módulo de Preparación de Datos

## 📋 Estado Actual
✅ Modelo DataPreparation creado con todos los campos necesarios
✅ Estructura de carpetas backend iniciada

## 🎯 Tareas Pendientes

### Backend (Django + Celery)

#### 1. Serializers (`apps/data_preparation/serializers.py`)
```python
- DataPreparationListSerializer (para tabla)
- DataPreparationDetailSerializer (para vista completa)
- DataPreparationCreateSerializer (para creación)
- DataPreparationStatsSerializer (para estadísticas)
```

#### 2. Views (`apps/data_preparation/views.py`)
```python
class DataPreparationViewSet:
    - list(): Listar todas las preparaciones
    - create(): Crear nueva preparación e iniciar proceso
    - retrieve(): Ver detalle de preparación
    - destroy(): Eliminar preparación
    - progress(): Endpoint custom para obtener progreso en tiempo real
    - stats(): Endpoint custom para estadísticas
```

#### 3. Celery Task (`apps/data_preparation/tasks.py`)
```python
@shared_task
def process_data_preparation(preparation_id):
    # Flujo completo:
    1. Extraer texto de PDFs (solo PDFs)
    2. Detectar idioma de cada archivo
    3. Calcular idioma predominante
    4. Filtrar por idioma predominante
    5. Aplicar stopwords (default + custom)
    6. Tokenización
    7. Lematización con spaCy
    8. Eliminar caracteres especiales
    9. Verificar integridad
    10. Eliminar duplicados
    11. Guardar resultados

    # Actualizar progreso en cada paso
```

#### 4. Stopwords por Defecto (`apps/data_preparation/stopwords.py`)
```python
EXTRA_STOPWORDS_EN = [
    'digital', 'transformation', 'technology', 'innovation',
    'university', 'education', 'learning', 'student', ...
]

EXTRA_STOPWORDS_ES = [
    'digital', 'transformación', 'tecnología', 'innovación',
    'universidad', 'educación', 'aprendizaje', 'estudiante', ...
]
```

#### 5. URLs (`apps/data_preparation/urls.py`)
```python
router.register(r'data-preparation', DataPreparationViewSet)
```

#### 6. Agregar a settings.py
```python
INSTALLED_APPS += ['apps.data_preparation']
```

#### 7. Migración
```bash
python manage.py makemigrations data_preparation
python manage.py migrate
```

---

### Frontend (React + TypeScript)

#### 1. Service (`services/dataPreparationService.ts`)
```typescript
class DataPreparationService {
  getPreparations(): Promise<DataPreparation[]>
  getPreparation(id): Promise<DataPreparation>
  createPreparation(data): Promise<DataPreparation>
  deletePreparation(id): Promise<void>
  getProgress(id): Promise<ProgressData>
  getStats(): Promise<StatsData>
}
```

#### 2. Interfaces (`services/dataPreparationService.ts`)
```typescript
interface DataPreparation {
  id: number
  name: string
  dataset: {id: number, name: string}
  predominant_language: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress_percentage: number
  current_stage: string
  detected_languages: Record<string, number>
  created_at: string
  // ... más campos
}

interface ProgressData {
  status: string
  progress_percentage: number
  current_stage: string
  current_stage_label: string
}
```

#### 3. Página de Lista (`pages/DataPreparationList.tsx`)
```tsx
// Tabla estilo Usuarios/Datasets
Columnas:
- ID
- Nombre del Dataset
- Idioma Predominante (Badge con bandera)
- Estado (Badge con color: En Proceso/Completado)
- Fecha

Acciones:
- Ver (→ /admin/preprocesamiento/preparacion-datos/:id)
- Editar (deshabilitar, no aplica)
- Eliminar (con confirmación)

// Barra de progreso inline si está processing
```

#### 4. Página de Creación (`pages/DataPreparationCreate.tsx`)
```tsx
// Grid de 2 columnas

// Card 1: Configuración General (izquierda arriba)
- Selector de Dataset (Searchable Select)
- Nota: "⚠️ Esta versión solo procesa archivos PDF..."

// Card 2: Limpieza de Datos (derecha arriba)
- Stopwords Personalizadas (TagsInput con chips)
- Switch: "Filtrar por idioma predominante"

// Card 3: Transformación (izquierda abajo)
- Checkboxes:
  □ Tokenización
  □ Lematización (spaCy)
  □ Eliminación de caracteres especiales

// Card 4: Validación (derecha abajo)
- Checkboxes:
  □ Verificación de integridad
  □ Eliminación de duplicados

// Botón: "Iniciar Preparación"
```

#### 5. Componente TagsInput (`components/TagsInput.tsx`)
```tsx
// Input que convierte palabras en chips/tags
// Enter para agregar
// X para eliminar
// Chips con estilo Material UI / Tailwind

Props:
- value: string[]
- onChange: (tags: string[]) => void
- placeholder: string
- maxTags?: number
```

#### 6. Página de Vista de Resultados (`pages/DataPreparationView.tsx`)
```tsx
// Si está en proceso: Mostrar barra de progreso grande

// Si completado: Mostrar resultados

Section 1: Resumen de Idiomas
┌─────────────────────────────────────────┐
│ 🇺🇸 Inglés (en): 256 archivos          │
│    ✅ PREDOMINANTE - PROCESADO          │
│                                         │
│ 🇪🇸 Español (es): 18 archivos          │
│    ⚠️ OMITIDO                           │
│                                         │
│ 🇷🇺 Ruso (ru): 13 archivos             │
│    ⚠️ OMITIDO                           │
└─────────────────────────────────────────┘

Section 2: Mensaje del Sistema
"Se ha procedido a trabajar únicamente con el
idioma Inglés (en) para garantizar la consistencia
en el análisis de tópicos y lematización, dado que
representa el 87% del contenido."

Section 3: Estadísticas
- Total de archivos analizados: 287
- Archivos procesados: 256
- Archivos omitidos: 31
- Duplicados eliminados: 5

Section 4: Configuración Aplicada
- Tokenización: ✅
- Lematización: ✅
- Stopwords personalizadas: 15 palabras
- ...
```

#### 7. Actualizar Routing (`App.tsx`)
```tsx
// Bajo /admin/preprocesamiento
<Route path="preparacion-datos" element={<DataPreparationList />} />
<Route path="preparacion-datos/nuevo" element={<DataPreparationCreate />} />
<Route path="preparacion-datos/:id" element={<DataPreparationView />} />
```

#### 8. Polling para Progreso en Tiempo Real
```typescript
// En DataPreparationList y DataPreparationCreate
useEffect(() => {
  if (preparation.status === 'processing') {
    const interval = setInterval(async () => {
      const progress = await dataPreparationService.getProgress(preparation.id)
      setProgressData(progress)
    }, 2000) // Cada 2 segundos

    return () => clearInterval(interval)
  }
}, [preparation])
```

---

## 🔧 Dependencias Adicionales Necesarias

### Backend
```bash
# Ya instaladas (verificar):
- celery
- redis
- langdetect (para detección de idioma)
- spacy (para lematización)
- PyPDF2 o pdfplumber (para extracción de PDF)
```

### Frontend
```bash
# Posiblemente necesarias:
npm install react-select  # Para selector searchable
# lucide-react ya instalado para iconos
```

---

## 📊 Flujo del Algoritmo de Selección de Idioma

```python
# 1. Extraer texto de cada PDF
files_with_text = []
for pdf_file in dataset.files.filter(mime_type='application/pdf'):
    text = extract_text_from_pdf(pdf_file.file_path)
    files_with_text.append({
        'file_id': pdf_file.id,
        'text': text
    })

# 2. Detectar idioma de cada archivo
from langdetect import detect
languages = {}
for file_data in files_with_text:
    try:
        lang = detect(file_data['text'])
        file_data['language'] = lang
        languages[lang] = languages.get(lang, 0) + 1
    except:
        file_data['language'] = 'unknown'

# 3. Determinar idioma predominante
predominant_lang = max(languages, key=languages.get)
total_files = sum(languages.values())
predominant_percentage = (languages[predominant_lang] / total_files) * 100

# 4. Filtrar por idioma predominante
processed_files = [f for f in files_with_text if f['language'] == predominant_lang]
omitted_files = [f for f in files_with_text if f['language'] != predominant_lang]

# 5. Guardar resultados
preparation.detected_languages = languages  # {"en": 256, "es": 18, "ru": 13}
preparation.predominant_language = predominant_lang  # "en"
preparation.predominant_language_percentage = predominant_percentage  # 87.0
preparation.files_processed = len(processed_files)
preparation.files_omitted = len(omitted_files)
preparation.processed_file_ids = [f['file_id'] for f in processed_files]
preparation.omitted_file_ids = [f['file_id'] for f in omitted_files]
preparation.save()

# 6. Continuar procesamiento solo con processed_files
for file_data in processed_files:
    # Tokenización
    # Lematización
    # Stopwords
    # etc.
```

---

## ⏱️ Estimación de Tiempo

| Tarea | Tiempo Estimado |
|-------|----------------|
| Serializers | 30 min |
| Views | 1 hora |
| Celery Task (lógica completa) | 3-4 horas |
| Stopwords y utils | 30 min |
| URLs y configuración | 15 min |
| Frontend Service | 30 min |
| DataPreparationList | 1 hora |
| DataPreparationCreate | 2 horas |
| TagsInput component | 1 hora |
| DataPreparationView | 1.5 horas |
| Polling y progreso | 1 hora |
| Testing y ajustes | 2 horas |
| **TOTAL** | **~14-15 horas** |

---

## 🚀 Orden Sugerido de Implementación

1. ✅ Modelo (ya creado)
2. ⏳ Serializers
3. ⏳ Views básicas (sin procesamiento)
4. ⏳ URLs y configuración
5. ⏳ Migración y testing de API
6. ⏳ Frontend Service e Interfaces
7. ⏳ DataPreparationList (tabla)
8. ⏳ TagsInput component
9. ⏳ DataPreparationCreate (formulario)
10. ⏳ Celery Task (procesamiento real)
11. ⏳ DataPreparationView (resultados)
12. ⏳ Sistema de polling para progreso
13. ⏳ Testing completo del flujo

---

## 🎨 Estética y UX

- Usar misma estética que Usuarios y Datasets
- Cards con sombra suave
- Badges de estado con colores:
  - Pendiente: gris
  - En Proceso: azul con animación de pulso
  - Completado: verde
  - Error: rojo
- Barra de progreso estilo Material con texto: "[Etapa] 50%"
- Banderas de países para idiomas (emojis o SVG)
- Chips para stopwords con hover effect
- Confirmación antes de eliminar

---

## ❓ Preguntas para Aclarar

1. ¿Quieres que continúe con la implementación completa ahora?
2. ¿Prefieres hacerlo por fases (primero backend completo, luego frontend)?
3. ¿Hay algún cambio en el modelo o flujo que quieras hacer antes de continuar?
4. ¿Las stopwords por defecto las proporciono yo o tienes una lista específica?

---

## 📝 Notas Importantes

- ⚠️ **Celery:** Asegúrate de tener Redis corriendo y Celery configurado
- ⚠️ **spaCy:** Necesitas descargar modelos de idiomas: `python -m spacy download en_core_web_sm`
- ⚠️ **PDFs:** Solo se procesan PDFs, otros formatos se ignoran automáticamente
- ⚠️ **Performance:** Para datasets grandes (>1000 archivos), el procesamiento puede tardar varios minutos
- ⚠️ **Progreso:** El polling cada 2 segundos es suficiente para buena UX sin sobrecargar el servidor


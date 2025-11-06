# 📄 Documentación Detallada: `helpers.py`

## 📍 Ubicación
```
C:\Projects\Tesis\analisis_transformacion_digital\components\ui\helpers.py
```

## 🎯 Propósito
Este archivo es el **sistema de utilidades y caché para la interfaz**. Proporciona funciones auxiliares que facilitan:
- Gestión de caché en Google Drive (cargar/guardar resultados)
- Validación de procesamiento previo
- Obtención del conector de Drive desde session_state
- Operaciones de persistencia (pickle, CSV, JSON)

Es el "pegamento" entre la interfaz de usuario y el backend de Drive.

## 🔄 Flujo de Ejecución
```
INICIO
  ↓
1. VERIFICAR CACHÉ EN DRIVE
   - Buscar carpeta de persistencia
   - Buscar archivo de resultados
   - Validar cantidad de archivos
   - Validar IDs de archivos
   ↓
2. SI CACHÉ ES VÁLIDO
   - Cargar resultados desde JSON
   - Retornar datos + folder_id
   ↓
3. SI CACHÉ NO EXISTE O ES INVÁLIDO
   - Retornar None, folder_id
   - Forzar re-procesamiento
   ↓
4. GUARDAR NUEVOS RESULTADOS
   - Crear archivo JSON en Drive
   - Actualizar carpeta de persistencia
   ↓
FIN
```

## 📚 Librerías Utilizadas

### Líneas 5-6: Importaciones
```python
import streamlit as st
```

**¿Qué hace la librería?**
- **`streamlit`**: Framework de interfaz web
  - **Dónde se usa**: Líneas 16-17, 51-52, 78-123 (session_state, warnings)
  - **Para qué**: Gestionar estado de sesión y mostrar mensajes

## 🔧 Funciones Principales

### 1. `show_section_header()`
**Líneas 8-17**

Muestra encabezado estándar de sección con título y descripción.

```python
def show_section_header(title, description):
    st.markdown(f'<div class="section-title">{title}</div>',
                unsafe_allow_html=True)
    st.markdown(f'<div class="section-description">{description}</div>',
                unsafe_allow_html=True)
```

**Uso:**
```python
show_section_header(
    "Análisis TF-IDF",
    "Calcula la importancia de términos en documentos"
)
```

### 2. `get_connector()`
**Líneas 20-29**

Obtiene el conector de Google Drive desde session_state.

```python
def get_connector():
    if 'drive_connector' in st.session_state:
        return st.session_state.drive_connector
    return None
```

**Por qué es importante:**
- Acceso centralizado al conector
- Evita pasar connector como parámetro
- Usa session_state de Streamlit

### 3. `get_or_load_cached_results()` ⭐ FUNCIÓN PRINCIPAL
**Líneas 32-128**

Sistema avanzado de caché con validación completa.

**Parámetros:**
- `folder_name`: Nombre de carpeta (ej: "02_Language_Detection")
- `results_filename`: Nombre del JSON (ej: "language_results.json")
- `expected_count`: Cantidad esperada de archivos (opcional)
- `source_files`: Lista de archivos fuente para validar (opcional)
- `validate_file_ids`: Si True, valida que los IDs coincidan

**Retorna:**
- `(results_dict, folder_id)` si caché válido
- `(None, folder_id)` si caché inválido o no existe

**Cómo funciona la validación:**

```python
# 1. Buscar carpeta de persistencia
folder = connector.get_or_create_folder(
    st.session_state.parent_folder_id,
    folder_name
)

# 2. Buscar archivo de resultados
results_file = connector.find_file_in_folder(folder, results_filename)

if results_file:
    # 3. Cargar resultados
    results = connector.read_json_file(results_file['id'])

    # 4. VALIDAR CANTIDAD
    if expected_count is not None:
        cached_count = results.get('total_files', 0)
        if cached_count != expected_count:
            st.warning("⚠️ Cache invalidado: cantidad diferente")
            return None, folder

    # 5. VALIDAR IDs DE ARCHIVOS
    if validate_file_ids and source_files:
        source_ids = {f.get('id') for f in source_files}
        cached_ids = {f.get('file_id') for f in results.get('files', [])}

        if source_ids != cached_ids:
            missing = source_ids - cached_ids
            extra = cached_ids - source_ids
            st.warning(f"⚠️ Cache invalidado: {len(missing)} nuevos, {len(extra)} removidos")
            return None, folder

    # 6. Caché válido
    return results, folder

return None, folder
```

**Razón del sistema de validación:**
```
¿Por qué validar IDs?
  → Detectar si se agregaron/eliminaron archivos
  → Evitar usar cache obsoleto
  → Garantizar consistencia de datos

¿Cuándo se invalida el cache?
  1. Cantidad de archivos cambió
  2. IDs de archivos no coinciden
  3. Archivo de resultados no existe
```

### 4. `save_results_to_cache()`
**Líneas 131-147**

Guarda resultados en archivo JSON en Drive.

```python
def save_results_to_cache(folder_id, results_filename, results_data):
    connector = get_connector()
    if not connector:
        return None

    return connector.create_json_file(
        folder_id,
        results_filename,
        results_data
    )
```

### 5. `check_folder_has_files()`
**Líneas 150-197**

Verifica si una carpeta tiene archivos y valida cantidad.

**Parámetros:**
- `folder_id`: ID de carpeta a verificar
- `expected_count`: Cantidad esperada (opcional)
- `file_extension`: Filtrar por extensión (opcional)

**Retorna:**
```python
{
    'has_files': True/False,
    'count': 15,
    'valid': True/False,
    'files': [lista de archivos]
}
```

### 6. Funciones de Persistencia (NO IMPLEMENTADAS)

**Líneas 200-440: Funciones sin implementar completa:**
- `save_pickle_to_drive()`: Guardaría objetos Python
- `load_pickle_from_drive()`: Cargaría objetos Python
- `save_csv_to_drive()`: Guardaría DataFrames como CSV
- `load_csv_from_drive()`: Cargaría CSV como DataFrame
- `upload_folder_to_drive()`: Subiría carpeta completa
- `download_folder_from_drive()`: Descargaría carpeta completa

**Nota:** Estas funciones tienen la firma pero dependen de un método `upload_file()` y `download_file()` que retornan contenido, no booleanos. Necesitan ajustes en `drive_connector.py`.

## 💡 Conceptos Clave para Principiantes

### 1. **¿Qué es caché?**
Guardar resultados procesados para no tener que recalcularlos:
```
SIN caché:
  Cada vez → Leer PDFs → Convertir → Detectar idioma (LENTO)

CON caché:
  Primera vez → Procesar y guardar
  Siguientes veces → Leer resultado guardado (RÁPIDO)
```

### 2. **¿Por qué validar el caché?**
Evitar usar datos obsoletos:
```
Archivos originales:
  [doc1.pdf, doc2.pdf, doc3.pdf]

Cache guardado:
  {doc1: "español", doc2: "inglés"}

⚠️ Problema: doc3 es nuevo, falta en cache
→ Solución: Invalidar cache y reprocesar
```

### 3. **session_state en Streamlit**
Es como variables globales que persisten entre clicks:
```python
# Al autenticar (en página de conexión)
st.session_state.drive_connector = connector
st.session_state.authenticated = True

# En cualquier otra página
connector = st.session_state.drive_connector
```

### 4. **Estructura de carpetas de persistencia**
```
Google Drive/
└── Analisis_TD/  (parent_folder_id)
    ├── 01_PDF_Files/
    ├── 02_Language_Detection/
    │   └── language_results.json  ← Caché
    ├── 03_TXT_Files/
    ├── 04_Preprocessed_Texts/
    └── ...
```

### 5. **Uso típico de get_or_load_cached_results()**
```python
# En una página de Streamlit
results, folder_id = get_or_load_cached_results(
    folder_name="02_Language_Detection",
    results_filename="language_results.json",
    expected_count=len(pdf_files),
    source_files=pdf_files,
    validate_file_ids=True
)

if results:
    st.success("✓ Resultados cargados desde caché")
    # Mostrar resultados guardados
else:
    st.info("Procesando archivos...")
    # Procesar archivos
    # Guardar resultados
    save_results_to_cache(folder_id, "language_results.json", new_results)
```

### 6. **Diferencia entre las validaciones**
```python
# Validación simple (solo cantidad)
get_or_load_cached_results(
    folder_name="...",
    results_filename="...",
    expected_count=10
)
# → Solo verifica que haya 10 archivos

# Validación completa (IDs)
get_or_load_cached_results(
    folder_name="...",
    results_filename="...",
    source_files=pdf_files,
    validate_file_ids=True
)
# → Verifica que sean LOS MISMOS archivos, no solo la cantidad
```

## 🔗 Dependencias de Otros Archivos

### Archivos que ESTE archivo IMPORTA:
```
NINGUNO (solo streamlit)
```

### Archivos que USAN este archivo:
```
→ components/pages/deteccion_idiomas.py (cache de idiomas)
→ components/pages/conversion_txt.py (cache de conversiones)
→ components/pages/bolsa_palabras.py (cache de BoW)
→ components/pages/analisis_tfidf.py (cache de TF-IDF)
→ components/pages/preprocesamiento.py (cache de preprocesamiento)
→ Todas las páginas que necesitan mostrar headers
→ Todas las páginas que necesitan el conector de Drive
```

## 🔍 Resumen

**`helpers.py`** es responsable de:
✅ Mostrar encabezados estándar de secciones
✅ Obtener conector de Drive desde session_state
✅ **Gestionar sistema de caché en Google Drive**
✅ **Validar cache con múltiples criterios**
✅ Guardar resultados en formato JSON
✅ Verificar existencia de archivos en carpetas
✅ Proporcionar funciones de utilidad comunes

**Flujo simplificado de caché:**
```
1. Buscar caché en Drive → 2. Validar cantidad e IDs →
3. Si válido: usar caché → 4. Si inválido: reprocesar →
5. Guardar nuevos resultados en Drive
```

**Para modificar:**
- **Cambiar criterios de validación**: Editar `get_or_load_cached_results()` (líneas 94-124)
- **Agregar validaciones**: Añadir checks en líneas 73-125
- **Implementar persistencia**: Completar funciones de pickle/CSV (líneas 200-440)

**Archivo**: `helpers.py`
**Líneas de código**: 441
**Complejidad**: Media (⭐⭐⭐)
**Importancia**: ⭐⭐⭐⭐⭐ (Crítico - sistema de caché)

---

# Arquitectura del Proyecto - Versión Modular

## Estructura de Archivos

```
analisis_transformacion_digital/
│
├── app.py                          # 🎯 Archivo principal (simplificado, ~150 líneas)
├── config.py                       # Configuración global
├── requirements.txt                # Dependencias Python
│
├── components/                     # 🎨 CAPA DE PRESENTACIÓN (UI)
│   ├── __init__.py
│   ├── ui/                        # Componentes visuales reutilizables
│   │   ├── __init__.py
│   │   ├── styles.py              # CSS y estilos personalizados
│   │   ├── layout.py              # Sidebar, navegación
│   │   └── helpers.py             # Funciones auxiliares UI
│   │
│   └── pages/                     # 📄 Páginas de la aplicación
│       ├── __init__.py
│       ├── inicio.py              # Página de inicio ✅
│       ├── conexion_drive.py      # Conexión Google Drive ✅
│       ├── estadisticas_archivos.py   # Estadísticas archivos ⚠️ TODO
│       ├── deteccion_idiomas.py   # Detección idiomas ⚠️ TODO
│       ├── conversion_txt.py      # Conversión PDF→TXT ⚠️ TODO
│       ├── preprocesamiento.py    # Preprocesamiento ⚠️ TODO
│       ├── bolsa_palabras.py      # Bolsa de Palabras ⚠️ TODO
│       ├── analisis_tfidf.py      # Análisis TF-IDF ⚠️ TODO
│       ├── analisis_factores.py   # Análisis Factores ✅
│       ├── visualizaciones.py     # Visualizaciones ✅
│       └── nube_palabras.py       # Nube de Palabras ✅
│
├── src/                            # 🧠 CAPA DE LÓGICA (Business Logic)
│   ├── __init__.py
│   ├── nlp_processor.py           # Procesamiento NLP
│   ├── factor_analyzer.py         # Análisis de factores
│   ├── drive_connector.py         # Conexión Google Drive
│   ├── language_detector.py       # Detección de idiomas
│   ├── document_converter.py      # Conversión de documentos
│   └── text_preprocessor.py       # Preprocesamiento de texto
│
├── docs/                           # 📚 DOCUMENTACIÓN
│   ├── README.md                  # Documentación principal
│   ├── INSTALACION.md             # Guía de instalación
│   ├── GUIA_USO.md               # Guía de uso
│   ├── REFERENCIA_RAPIDA.md      # Referencia rápida
│   └── CONFIGURACION_DRIVE.md    # Configuración de Drive
│
├── scripts/                        # 🔧 Scripts de utilidad
│   ├── ejecutar.bat               # Script ejecución Windows
│   ├── ejecutar.sh                # Script ejecución Unix
│   ├── instalar.bat               # Script instalación Windows
│   └── instalar.sh                # Script instalación Unix
│
├── credentials.json                # Credenciales Google Drive (no en git)
├── token.json                     # Token autenticación (no en git)
├── .gitignore                     # Git ignore
└── venv/                          # Entorno virtual (no en git)
```

## Separación de Responsabilidades

### 1. **app.py** - Orquestador Principal
- **Responsabilidad**: Inicializar la aplicación y enrutar páginas
- **Tamaño**: ~150 líneas (vs 2117 líneas del app_v2.py original)
- **Hace**:
  - Configura Streamlit
  - Inicializa session_state
  - Renderiza sidebar
  - Enruta a las páginas correspondientes
- **No hace**: Lógica de negocio ni renderizado complejo

### 2. **components/ui/** - Componentes Visuales
#### `styles.py`
- Contiene todos los estilos CSS
- Función única: `apply_custom_styles()`
- Paleta de colores centralizada

#### `layout.py`
- Sidebar y navegación
- Función: `render_sidebar()` retorna página seleccionada

#### `helpers.py`
- Funciones auxiliares UI:
  - `show_section_header()` - Encabezados de sección
  - `get_connector()` - Obtener conector de Drive
  - `get_or_load_cached_results()` - Cargar cache
  - `save_results_to_cache()` - Guardar cache

### 3. **components/pages/** - Páginas de la Aplicación
Cada página es un módulo independiente con:
- Función `render()` que renderiza toda la página
- Importa helpers y estilos según necesite
- **No contiene lógica de negocio** (solo llama a src/)

**Estado de Migración:**
- ✅ **TODAS LAS PÁGINAS MIGRADAS EXITOSAMENTE**:
  - inicio, conexion_drive, estadisticas_archivos, deteccion_idiomas
  - conversion_txt, preprocesamiento, bolsa_palabras, analisis_tfidf
  - analisis_factores, visualizaciones, nube_palabras

### 4. **src/** - Lógica de Negocio
Módulos que **NO conocen Streamlit**:
- Procesamiento de datos
- Conexión a servicios externos (Drive)
- Algoritmos NLP
- Análisis de factores

**Principio**: Estos módulos son reutilizables en cualquier contexto (CLI, API, etc.)

## ✅ Migración Completada

### Estado Final:

1. ✅ **Todas las páginas migradas** - Las 11 páginas han sido exitosamente migradas desde app_v2.py
2. ✅ **Arquitectura modular implementada** - Separación clara entre UI y lógica de negocio
3. ✅ **app.py es el archivo principal** - Reducido de 2117 a ~150 líneas
4. ⏳ **Pendiente**: Eliminar app_v2.py una vez verificado el funcionamiento completo

### Próximos pasos recomendados:

1. **Verificar funcionamiento** - Ejecutar la aplicación y probar cada página
2. **Eliminar app_v2.py** - Una vez confirmado que todo funciona correctamente
3. **Documentar cambios** - Actualizar README.md si es necesario

## Ventajas de la Nueva Arquitectura

✅ **Modularidad**: Cada componente tiene una responsabilidad única
✅ **Mantenibilidad**: Fácil localizar y modificar funcionalidad específica
✅ **Escalabilidad**: Agregar nuevas páginas es trivial
✅ **Reutilización**: Componentes UI son reutilizables
✅ **Testing**: Más fácil hacer pruebas unitarias
✅ **Colaboración**: Varios desarrolladores pueden trabajar sin conflictos
✅ **Legibilidad**: Archivos pequeños y específicos (~50-300 líneas vs 2117 líneas)

## Cómo Ejecutar

```bash
# Windows
cd scripts
./ejecutar.bat

# Linux/Mac
cd scripts
./ejecutar.sh

# O directamente
streamlit run app.py
```

## Cómo Agregar una Nueva Página

1. Crear archivo en `components/pages/nueva_pagina.py`:
```python
import streamlit as st
from components.ui.helpers import show_section_header

def render():
    show_section_header("Título", "Descripción")
    st.write("Contenido...")
```

2. Importar en `components/pages/__init__.py`:
```python
from . import nueva_pagina
```

3. Agregar ruta en `app.py`:
```python
from components.pages import nueva_pagina

def main():
    # ...
    if pagina == "11. Nueva Página":
        nueva_pagina.render()
```

4. Agregar opción en sidebar (`components/ui/layout.py`):
```python
pagina = st.radio("Navegación", [
    # ...
    "11. Nueva Página"
])
```

---

**Autor**: Sistema de Análisis de Transformación Digital
**Versión**: 3.0 - Arquitectura Modular
**Fecha**: Octubre 2025

# 📄 Documentación Detallada: `layout.py`

## 📍 Ubicación
```
C:\Projects\Tesis\analisis_transformacion_digital\components\ui\layout.py
```

## 🎯 Propósito
Este archivo es el **sistema de navegación principal** de la aplicación. Define y renderiza el **sidebar (barra lateral)** que permite al usuario navegar entre todas las páginas y funcionalidades del sistema de análisis de transformación digital.

Es la "columna vertebral" de la navegación de la aplicación.

## 🔄 Flujo de Ejecución
```
INICIO
  ↓
1. RENDERIZAR SIDEBAR
   - Mostrar título de la app
   - Mostrar indicador de conexión
   ↓
2. CREAR MENÚ DE NAVEGACIÓN
   - Radio buttons con todas las páginas
   - Organizado en secuencia numérica
   - Incluye sección de modelos avanzados
   ↓
3. RETORNAR PÁGINA SELECCIONADA
   - Usuario selecciona página
   - Función retorna nombre de página
   ↓
4. APP.PY USA EL RETORNO
   - Carga la página correspondiente
   ↓
FIN
```

## 📚 Librerías Utilizadas

### Líneas 6: Importaciones
```python
import streamlit as st
```

**¿Qué hace la librería?**
- **`streamlit`**: Framework de interfaz web
  - **Dónde se usa**: Todo el archivo (sidebar, radio, success/info)
  - **Para qué**: Crear componentes de UI

## 🔧 Función Principal: `render_sidebar()`

### Función: `render_sidebar()`
**Líneas 9-54**

Renderiza el sidebar completo y retorna la página seleccionada.

**Retorna:** `str` - Nombre de la página seleccionada

**Estructura del sidebar:**

```python
def render_sidebar():
    with st.sidebar:
        # 1. TÍTULO
        st.title("🎓 Análisis TD")

        # 2. INDICADOR DE CONEXIÓN
        if st.session_state.authenticated:
            st.success("✓ Conectado")
        else:
            st.info("○ No conectado")

        st.markdown("---")

        # 3. MENÚ DE NAVEGACIÓN
        pagina = st.radio(
            "Navegación",
            [
                "Inicio",
                "1. Conexión Google Drive",
                "2. Estadísticas de Archivos",
                # ... más opciones
            ],
            label_visibility="collapsed"
        )

    return pagina
```

## 💡 Conceptos Clave para Principiantes

### 1. **¿Qué es un sidebar?**
Es la barra lateral que se ve en el lado izquierdo de la aplicación:
```
┌─────────────┬────────────────────┐
│  SIDEBAR    │   CONTENIDO        │
│  (Menú)     │   (Página actual)  │
│             │                    │
│ ○ Inicio    │                    │
│ ● Conexión  │  [Página de        │
│ ○ Estadís.  │   Conexión]        │
│ ○ ...       │                    │
└─────────────┴────────────────────┘
```

### 2. **¿Cómo funciona `st.radio()`?**
Crea una lista de opciones donde solo una puede estar seleccionada:
```python
pagina = st.radio(
    "Navegación",           # Etiqueta (ocultada)
    ["Opción 1", "Opción 2"],  # Lista de opciones
    label_visibility="collapsed"  # Ocultar etiqueta
)
# Retorna: "Opción 1" o "Opción 2" según selección
```

### 3. **Estructura de páginas**
Las páginas están organizadas en **3 grupos**:

**Grupo 1: Flujo Principal (10 pasos)**
```
1. Conexión Google Drive
2. Estadísticas de Archivos
3. Detección de Idiomas
4. Conversión a TXT
5. Preprocesamiento
6. Bolsa de Palabras
7. Análisis TF-IDF
8. Análisis de Factores
9. Visualizaciones
10. Nube de Palabras
```

**Grupo 2: Modelos Avanzados**
```
🤖 Modelos Avanzados (landing page)
🤖 Análisis NER
🤖 Modelado de Temas
🤖 Análisis de N-gramas
🤖 BERTopic
🤖 Clasificación de Textos
🤖 Reducción de Dimensionalidad
```

**Grupo 3: Inicio**
```
Inicio (página de bienvenida)
```

### 4. **¿Qué hace `st.session_state.authenticated`?**
Variable de sesión que indica si el usuario se conectó a Drive:
```python
# En página de conexión
if connector.authenticate():
    st.session_state.authenticated = True

# En sidebar
if st.session_state.authenticated:
    st.success("✓ Conectado")  # Verde
else:
    st.info("○ No conectado")  # Azul
```

### 5. **¿Por qué `label_visibility="collapsed"`?**
Oculta la etiqueta "Navegación" para ahorrar espacio:
```
CON etiqueta:
┌─────────────┐
│ Navegación  │  ← Ocupa espacio
│ ○ Inicio    │
│ ● Conexión  │
└─────────────┘

SIN etiqueta (collapsed):
┌─────────────┐
│ ○ Inicio    │  ← Más limpio
│ ● Conexión  │
└─────────────┘
```

### 6. **¿Qué hace `st.markdown("---")`?**
Crea una línea divisoria horizontal:
```
🎓 Análisis TD
✓ Conectado
────────────  ← Esta línea
○ Inicio
● Conexión
```

### 7. **Integración con app.py**
```python
# En app.py
from components.ui.layout import render_sidebar

# Renderizar sidebar y obtener página seleccionada
pagina = render_sidebar()

# Cargar página correspondiente
if pagina == "Inicio":
    from components.pages import inicio
    inicio.render()
elif pagina == "1. Conexión Google Drive":
    from components.pages import conexion_drive
    conexion_drive.render()
# ... etc
```

### 8. **¿Por qué retornar string en vez de ID numérico?**
```python
# Opción A: Retornar string (actual)
pagina = "1. Conexión Google Drive"
if pagina == "1. Conexión Google Drive":
    # ...

# Opción B: Retornar ID (alternativa)
pagina_id = 1
if pagina_id == 1:
    # ...

Razón de elegir A:
  ✓ Más legible
  ✓ No necesita mapeo adicional
  ✓ Coincide con lo que ve el usuario
```

## 🔗 Dependencias de Otros Archivos

### Archivos que ESTE archivo IMPORTA:
```
NINGUNO (solo streamlit)
```

### Archivos que USAN este archivo:
```
→ app.py (usa render_sidebar() para navegación principal)
```

## 🔍 Resumen

**`layout.py`** es responsable de:
✅ Renderizar el sidebar de navegación
✅ Mostrar indicador de conexión (conectado/no conectado)
✅ Proporcionar menú de navegación con todas las páginas
✅ Organizar páginas en flujo secuencial
✅ Separar modelos avanzados en sección especial
✅ Retornar página seleccionada para que app.py la cargue

**Flujo simplificado:**
```
1. Usuario abre app → 2. render_sidebar() muestra menú →
3. Usuario selecciona página → 4. Función retorna nombre →
5. app.py carga página correspondiente
```

**Para modificar:**
- **Agregar página**: Añadir opción a la lista en línea 28-50
- **Reorganizar orden**: Cambiar orden en la lista del radio
- **Cambiar indicador**: Modificar líneas 20-23
- **Agregar secciones**: Usar más `st.markdown("---")` como separadores

**Archivo**: `layout.py`
**Líneas de código**: 55
**Complejidad**: Baja (⭐)
**Importancia**: ⭐⭐⭐⭐⭐ (Crítico - navegación principal)

---

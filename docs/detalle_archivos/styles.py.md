# 📄 Documentación Detallada: `styles.py`

## 📍 Ubicación
```
C:\Projects\Tesis\analisis_transformacion_digital\components\ui\styles.py
```

## 🎯 Propósito
Este archivo es el **sistema de estilos CSS personalizado** de la aplicación. Define toda la apariencia visual de la interfaz: colores, tipografías, botones, tablas, inputs y animaciones. Transforma la interfaz predeterminada de Streamlit en una experiencia visual profesional y moderna con **tema oscuro**.

Es el "maquillaje" de la aplicación.

## 🔄 Flujo de Ejecución
```
INICIO (en app.py)
  ↓
1. LLAMAR apply_custom_styles()
   - Inyectar CSS en la página
   ↓
2. CSS SE APLICA AUTOMÁTICAMENTE
   - Navegador renderiza con estilos
   - Todos los componentes heredan estilos
   ↓
FIN (usuario ve interfaz estilizada)
```

## 📚 Librerías Utilizadas

### Líneas 6: Importaciones
```python
import streamlit as st
```

**¿Qué hace la librería?**
- **`streamlit`**: Framework de interfaz web
  - **Dónde se usa**: Línea 12 (`st.markdown()`)
  - **Para qué**: Inyectar CSS personalizado con `unsafe_allow_html=True`

## 🔧 Función Principal: `apply_custom_styles()`

### Función: `apply_custom_styles()`
**Líneas 9-269**

Aplica todos los estilos CSS personalizados a la aplicación.

**No tiene parámetros ni retorno.** Solo inyecta CSS.

## 🎨 Estructura de Estilos

### 1. **Paleta de Colores (Líneas 14-34)**

**Variables CSS (`:root`):**

```css
:root {
    /* Fondos */
    --bg-primary: #1A1A1A;      /* Fondo principal - gris muy oscuro */
    --bg-secondary: #252525;    /* Contenedores - gris oscuro */
    --bg-tertiary: #2D2D2D;     /* Hover - gris medio */

    /* Textos */
    --text-primary: #F0F0F0;    /* Texto principal - blanco suave */
    --text-secondary: #B0B0B0;  /* Texto secundario - gris claro */
    --text-muted: #808080;      /* Texto atenuado - gris medio */

    /* Acentos */
    --accent-primary: #4A90E2;  /* Azul profundo - acción */
    --accent-hover: #5BA3F5;    /* Azul claro - hover */

    /* Estados */
    --success: #5FB878;         /* Verde tenue - éxito */
    --warning: #F0AD4E;         /* Amarillo anaranjado - advertencia */
    --error: #E57373;           /* Rojo suave - error */
    --info: #64B5F6;            /* Azul claro - info */

    /* Fondos semitransparentes */
    --success-bg: rgba(95, 184, 120, 0.15);
    --warning-bg: rgba(240, 173, 78, 0.15);
    --error-bg: rgba(229, 115, 115, 0.15);
    --info-bg: rgba(100, 181, 246, 0.15);

    /* Bordes */
    --border-subtle: #3A3A3A;   /* Bordes sutiles */
    --border-medium: #4A4A4A;   /* Bordes medios */
}
```

### 2. **Fondo y Base (Líneas 36-44)**
```css
.stApp {
    background-color: var(--bg-primary);  /* Fondo gris oscuro */
    color: var(--text-primary);           /* Texto blanco */
}

/* Ocultar menú y footer de Streamlit */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
```

### 3. **Sidebar (Líneas 46-54)**
```css
[data-testid="stSidebar"] {
    background-color: var(--bg-secondary);
    border-right: 1px solid var(--border-subtle);
}
```

### 4. **Encabezados (Líneas 56-74)**
```css
.section-title {
    font-size: 2rem;           /* Grande */
    font-weight: 600;          /* Semi-bold */
    color: var(--text-primary);
    margin-bottom: 0.3rem;
    letter-spacing: -0.5px;    /* Más compacto */
}

.section-description {
    font-size: 0.9rem;         /* Pequeño */
    color: var(--text-secondary);  /* Gris */
    margin-bottom: 2rem;
}
```

### 5. **Tabs (Pestañas) (Líneas 76-99)**
```css
.stTabs [data-baseweb="tab"] {
    padding: 0.5rem 0rem;
    color: var(--text-muted);          /* Gris */
    border-bottom: 2px solid transparent;
}

.stTabs [aria-selected="true"] {
    color: var(--accent-primary);      /* Azul cuando activo */
    border-bottom: 2px solid var(--accent-primary);
}

.stTabs [data-baseweb="tab"]:hover {
    color: var(--text-primary);        /* Blanco al pasar mouse */
}
```

### 6. **Métricas (Líneas 101-110)**
```css
[data-testid="stMetricValue"] {
    font-size: 1.8rem;
    font-weight: 600;
    color: var(--text-primary);
}

[data-testid="stMetricLabel"] {
    color: var(--text-secondary);
}
```

### 7. **Botones (Líneas 112-142)**

**Botones normales:**
```css
.stButton button {
    border-radius: 0.4rem;
    border: 1px solid var(--border-medium);
    padding: 0.6rem 1.5rem;
    background-color: transparent;
    transition: all 0.2s ease;  /* Animación suave */
}

.stButton button:hover {
    border-color: var(--accent-primary);
    background-color: var(--bg-tertiary);
    transform: translateY(-1px);        /* Sube 1px */
    box-shadow: 0 2px 8px rgba(74, 144, 226, 0.2);
}
```

**Botones primarios:**
```css
.stButton button[kind="primary"] {
    background-color: var(--accent-primary);  /* Azul */
    color: white;
}

.stButton button[kind="primary"]:hover {
    background-color: var(--accent-hover);    /* Azul más claro */
}
```

### 8. **Cajas de Mensajes (Líneas 144-179)**
```css
/* Cada tipo tiene su color */
.stSuccess {
    background-color: var(--success-bg);  /* Verde semitransparente */
    border-left: 3px solid var(--success);  /* Borde verde */
}

.stWarning {
    background-color: var(--warning-bg);
    border-left: 3px solid var(--warning);
}

.stError {
    background-color: var(--error-bg);
    border-left: 3px solid var(--error);
}

.stInfo {
    background-color: var(--info-bg);
    border-left: 3px solid var(--info);
}
```

### 9. **Inputs (Líneas 188-205)**
```css
.stTextInput input,
.stNumberInput input,
.stSelectbox select,
.stTextArea textarea {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-medium);
}

/* Al hacer focus */
.stTextInput input:focus {
    border-color: var(--accent-primary);  /* Borde azul */
    box-shadow: 0 0 0 1px var(--accent-primary);
}
```

### 10. **Tablas (Líneas 207-221)**
```css
.dataframe th {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border-bottom: 2px solid var(--border-medium);
}

.dataframe td {
    border-bottom: 1px solid var(--border-subtle);
}
```

### 11. **Scrollbar Personalizado (Líneas 234-251)**
```css
::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}

::-webkit-scrollbar-track {
    background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
    background: var(--border-medium);
    border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
}
```

## 💡 Conceptos Clave para Principiantes

### 1. **¿Qué es CSS?**
**C**ascading **S**tyle **S**heets - lenguaje para dar estilo a páginas web:
```
HTML → Estructura (contenido)
CSS  → Estilo (colores, tamaños, posiciones)
```

### 2. **¿Qué son variables CSS (`:root`)?**
Valores reutilizables que se pueden usar en todo el CSS:
```css
:root {
    --color-azul: #4A90E2;
}

.boton {
    background-color: var(--color-azul);  /* Usa la variable */
}

.titulo {
    color: var(--color-azul);  /* Reutiliza el mismo azul */
}
```

**Ventaja:** Cambiar el valor en `:root` actualiza TODO.

### 3. **¿Qué significa `rgba()`?**
Define un color con transparencia:
```css
rgba(95, 184, 120, 0.15)
     │   │    │     └─ Alpha (transparencia): 0.15 = 15%
     │   │    └─ Blue: 120
     │   └─ Green: 184
     └─ Red: 95
```

### 4. **¿Qué es `hover`?**
Estilos que se aplican cuando el mouse pasa por encima:
```css
.boton {
    background: blue;
}

.boton:hover {
    background: lightblue;  /* Cambia al pasar mouse */
}
```

### 5. **¿Qué es `transition`?**
Hace que los cambios sean suaves en vez de instantáneos:
```css
transition: all 0.2s ease;
            │   │    └─ Curva de animación (suave)
            │   └─ Duración (0.2 segundos)
            └─ Propiedades a animar (todas)
```

**Efecto:**
```
Sin transition: Color cambia INSTANTÁNEAMENTE
Con transition: Color cambia GRADUALMENTE en 0.2s
```

### 6. **¿Qué es `transform`?**
Aplica transformaciones visuales sin afectar el layout:
```css
transform: translateY(-1px);  /* Mover hacia arriba 1px */
transform: scale(1.05);        /* Aumentar 5% */
transform: rotate(45deg);      /* Rotar 45 grados */
```

### 7. **Selectores de Streamlit**
```css
[data-testid="stSidebar"]  → Sidebar
[data-testid="stMetricValue"]  → Valor de métrica
.stButton button  → Botones
.stSuccess  → Mensaje de éxito
```

Streamlit genera estos atributos automáticamente.

### 8. **¿Por qué `unsafe_allow_html=True`?**
Por defecto, Streamlit no permite HTML/CSS por seguridad:
```python
# Esto NO funciona:
st.markdown("<style>...</style>")

# Esto SÍ funciona:
st.markdown("<style>...</style>", unsafe_allow_html=True)
```

### 9. **¿Cómo se usa en la app?**
```python
# En app.py
from components.ui.styles import apply_custom_styles

# Al inicio de la app
apply_custom_styles()

# Ahora TODOS los componentes usan estos estilos
st.title("Título")  # ← Usa estilos personalizados
st.button("Click")  # ← Usa estilos personalizados
st.success("OK")    # ← Usa estilos personalizados
```

### 10. **Tema oscuro vs claro**
Este archivo implementa un **tema oscuro**:
```
Fondo: #1A1A1A (casi negro)
Texto: #F0F0F0 (casi blanco)

Ventajas:
  ✓ Reduce fatiga visual
  ✓ Aspecto moderno/profesional
  ✓ Ahorra batería en pantallas OLED
```

## 🔗 Dependencias de Otros Archivos

### Archivos que ESTE archivo IMPORTA:
```
NINGUNO (solo streamlit)
```

### Archivos que USAN este archivo:
```
→ app.py (aplica estilos al iniciar la app)
```

## 🔍 Resumen

**`styles.py`** es responsable de:
✅ Definir paleta de colores completa (fondos, textos, acentos)
✅ Aplicar tema oscuro a toda la aplicación
✅ Estilizar todos los componentes de Streamlit
✅ Crear animaciones y transiciones suaves
✅ Personalizar scrollbars
✅ Ocultar elementos innecesarios (menú, footer)
✅ Crear diseño visual profesional y consistente

**Flujo simplificado:**
```
1. app.py llama apply_custom_styles() →
2. CSS se inyecta en la página →
3. Navegador aplica estilos →
4. Usuario ve interfaz estilizada
```

**Para modificar:**
- **Cambiar colores**: Editar variables en `:root` (líneas 15-33)
- **Ajustar tamaños**: Modificar `font-size`, `padding`, `margin`
- **Cambiar animaciones**: Editar `transition` y `transform`
- **Tema claro**: Invertir colores (fondos oscuros → claros)

**Archivo**: `styles.py`
**Líneas de código**: 270
**Complejidad**: Baja-Media (⭐⭐)
**Importancia**: ⭐⭐⭐⭐ (Importante - apariencia profesional)

---

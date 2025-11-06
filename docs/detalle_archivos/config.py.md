# 📄 Documentación Detallada: `config.py`

## 📍 Ubicación

```
analisis_transformacion_digital/config.py
```

## 🎯 Propósito

`config.py` es el **módulo de configuración centralizada** de la aplicación. Su responsabilidad es **cargar y gestionar todas las variables de configuración** desde variables de entorno (archivo `.env`) y proporcionar valores por defecto si no están definidas.

## 🔄 Flujo de Ejecución

```
import config
    ↓
load_dotenv() → Carga variables del archivo .env
    ↓
Definir funciones de utilidad (get_env, get_env_bool, get_env_int)
    ↓
Cargar variables de configuración por categorías
    ↓
Crear directorios necesarios
    ↓
Variables están disponibles para el resto de la aplicación
```

---

## 📚 Librerías Utilizadas

### Líneas 6-9: Importaciones

```python
import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
```

**¿Qué hace cada librería?**

- **`os`**: Módulo estándar de Python para operaciones del sistema operativo
  - **Dónde se usa**: Para obtener variables de entorno con `os.getenv()`
  - **Para qué**: Acceder a variables de entorno del sistema

- **`pathlib.Path`**: Módulo para manipulación de rutas de archivos
  - **Dónde se usa**: Líneas 91-94 para crear directorios
  - **Para qué**: Crear directorios de forma multiplataforma (funciona en Windows, Linux, Mac)

- **`typing.Optional`**: Type hints de Python
  - **Dónde se usa**: En las anotaciones de tipo de las funciones
  - **Para qué**: Indicar que un valor puede ser de un tipo específico o `None`

- **`dotenv.load_dotenv`**: Carga variables de entorno desde archivo `.env`
  - **Dónde se usa**: Línea 12
  - **Para qué**: Leer el archivo `.env` y cargar las variables en el entorno

### Línea 12: Carga de Variables de Entorno

```python
load_dotenv()
```

**¿Qué hace esta línea?**

Lee el archivo `.env` (si existe) y carga todas las variables definidas en él como variables de entorno del sistema operativo.

**Ejemplo de archivo `.env`:**

```env
GOOGLE_DRIVE_FOLDER_ID=1tDUZ4PnQen_lSr6z4ZALji2zdtrJf-sS
LOG_LEVEL=INFO
CACHE_ENABLED=True
```

Después de `load_dotenv()`, estas variables están disponibles con `os.getenv()`.

---

## 🔧 Funciones de Utilidad

### Función: `get_env()`

**Líneas 15-32**

```python
def get_env(key: str, default: Optional[str] = None, required: bool = False) -> Optional[str]:
    """
    Obtiene variable de entorno con validación

    Args:
        key: Nombre de la variable
        default: Valor por defecto si no existe
        required: Si es requerida, lanza error si no existe

    Returns:
        Valor de la variable o default
    """
    value = os.getenv(key, default)

    if required and value is None:
        raise ValueError(f"Variable de entorno requerida no encontrada: {key}")

    return value
```

**¿Qué hace esta función?**

Obtiene una variable de entorno de forma segura con validación.

**Parámetros:**

- **`key`**: Nombre de la variable (ej: `'LOG_LEVEL'`)
- **`default`**: Valor por defecto si la variable no existe
- **`required`**: Si es `True`, lanza un error si la variable no está definida

**Cómo funciona:**

1. **Línea 27**: Intenta obtener la variable con `os.getenv(key, default)`
   - Si la variable existe, retorna su valor
   - Si no existe, retorna `default`

2. **Líneas 29-30**: Si la variable es requerida y no existe, lanza un error
   - **`if required and value is None`**: Verifica si es requerida y está vacía
   - **`raise ValueError(...)`**: Lanza un error descriptivo

3. **Línea 32**: Retorna el valor

**Ejemplo de uso:**

```python
# Obligatoria - lanza error si no existe
api_key = get_env('API_KEY', required=True)

# Opcional con default
log_level = get_env('LOG_LEVEL', default='INFO')
```

### Función: `get_env_bool()`

**Líneas 35-38**

```python
def get_env_bool(key: str, default: bool = False) -> bool:
    """Obtiene variable de entorno como booleano"""
    value = os.getenv(key, str(default))
    return value.lower() in ('true', '1', 'yes', 'on')
```

**¿Qué hace esta función?**

Convierte una variable de entorno de texto a booleano.

**Cómo funciona:**

1. **Línea 37**: Obtiene la variable como string
   - **`str(default)`**: Convierte el default booleano a string

2. **Línea 38**: Verifica si el valor es "verdadero"
   - **`.lower()`**: Convierte a minúsculas para comparación insensible a mayúsculas
   - **`in ('true', '1', 'yes', 'on')`**: Acepta múltiples formas de expresar "verdadero"

**Ejemplos de valores que retornan `True`:**

```env
CACHE_ENABLED=true
CACHE_ENABLED=TRUE
CACHE_ENABLED=1
CACHE_ENABLED=yes
CACHE_ENABLED=on
```

**Cualquier otro valor retorna `False`:**

```env
CACHE_ENABLED=false
CACHE_ENABLED=0
CACHE_ENABLED=no
CACHE_ENABLED=cualquier_cosa
```

### Función: `get_env_int()`

**Líneas 41-47**

```python
def get_env_int(key: str, default: int = 0) -> int:
    """Obtiene variable de entorno como entero"""
    value = os.getenv(key, str(default))
    try:
        return int(value)
    except ValueError:
        return default
```

**¿Qué hace esta función?**

Convierte una variable de entorno de texto a entero de forma segura.

**Cómo funciona:**

1. **Línea 43**: Obtiene la variable como string
2. **Líneas 44-47**: Intenta convertir a entero
   - **`try: return int(value)`**: Intenta convertir
   - **`except ValueError`**: Si falla (valor no numérico), retorna el default

**Ejemplo:**

```env
N_CLUSTERS_DEFAULT=5  # Retorna 5
N_CLUSTERS_DEFAULT=abc  # Retorna el default (0)
```

---

## ⚙️ Variables de Configuración

### Categoría: Google Drive (Líneas 51-53)

```python
GOOGLE_DRIVE_FOLDER_ID = get_env('GOOGLE_DRIVE_FOLDER_ID', '1tDUZ4PnQen_lSr6z4ZALji2zdtrJf-sS')
CREDENTIALS_PATH = get_env('CREDENTIALS_PATH', 'credentials.json')
TOKEN_PATH = get_env('TOKEN_PATH', 'token.json')
```

**¿Para qué sirven?**

- **`GOOGLE_DRIVE_FOLDER_ID`**: ID de la carpeta de Google Drive donde están los PDFs
  - **Dónde se usa**: En `GoogleDriveConnector` para acceder a los archivos
  - **Cómo obtener el ID**: Desde la URL de la carpeta en Drive
  - **Ejemplo de URL**: `https://drive.google.com/drive/folders/1tDUZ4PnQen...`
  - El ID es la parte después de `/folders/`

- **`CREDENTIALS_PATH`**: Ruta al archivo de credenciales de Google OAuth2
  - **Dónde se usa**: En `GoogleDriveConnector` para autenticación
  - **Cómo obtenerlo**: Desde Google Cloud Console

- **`TOKEN_PATH`**: Ruta donde se guarda el token de autenticación
  - **Se genera automáticamente** después de la primera autenticación
  - **Contiene**: El token de acceso y refresh token

### Categoría: Logging (Líneas 56-57)

```python
LOG_LEVEL = get_env('LOG_LEVEL', 'INFO').upper()
LOG_DIR = get_env('LOG_DIR', 'logs')
```

**¿Para qué sirven?**

- **`LOG_LEVEL`**: Nivel de logging
  - **Valores posibles**: `'DEBUG'`, `'INFO'`, `'WARNING'`, `'ERROR'`, `'CRITICAL'`
  - **`.upper()`**: Convierte a mayúsculas para normalizar
  - **Dónde se usa**: En `LoggerManager` para configurar el nivel de detalle de los logs

- **`LOG_DIR`**: Directorio donde se guardan los archivos de log
  - **Default**: `'logs'`
  - **Se crea automáticamente** en la línea 91

**Niveles de logging explicados:**

- **DEBUG**: Información muy detallada para debugging (más verboso)
- **INFO**: Información general de eventos normales
- **WARNING**: Advertencias - algo inusual pero no crítico
- **ERROR**: Errores que necesitan atención
- **CRITICAL**: Errores críticos que pueden causar fallo de la aplicación

### Categoría: Caché (Líneas 60-61)

```python
CACHE_ENABLED = get_env_bool('CACHE_ENABLED', True)
CACHE_DIR = get_env('CACHE_DIR', 'cache')
```

**¿Para qué sirven?**

- **`CACHE_ENABLED`**: Habilita/deshabilita el sistema de caché
  - **Default**: `True` (habilitado)
  - **Dónde se usa**: En los módulos que usan caché (BoW, TF-IDF, NER, etc.)
  - **Por qué deshabilitarlo**: Para testing o cuando quieres forzar recálculo

- **`CACHE_DIR`**: Directorio donde se almacena el caché
  - **Default**: `'cache'`
  - **Contenido**: Archivos `.pkl` (pickle) con resultados cacheados

### Categoría: Procesamiento NLP (Líneas 64-68)

```python
IDIOMA = get_env('DEFAULT_LANGUAGE', 'english')  # Mantener nombre antiguo por compatibilidad
DEFAULT_LANGUAGE = IDIOMA
USE_STEMMING = get_env_bool('USE_STEMMING', True)
MIN_PALABRA_LENGTH = get_env_int('MIN_WORD_LENGTH', 3)
MIN_WORD_LENGTH = MIN_PALABRA_LENGTH  # Alias
```

**¿Para qué sirven?**

- **`IDIOMA` / `DEFAULT_LANGUAGE`**: Idioma por defecto para procesamiento de texto
  - **Valores posibles**: `'english'`, `'spanish'`, `'french'`, `'german'`, `'italian'`
  - **Dónde se usa**: En `TextPreprocessor` y `ProcessadorTexto` para configurar stopwords y stemmer
  - **Dos nombres**: Compatibilidad con código antiguo

- **`USE_STEMMING`**: Habilita/deshabilita stemming
  - **Stemming**: Reducir palabras a su raíz (ej: "running" → "run")
  - **Default**: `True`

- **`MIN_PALABRA_LENGTH` / `MIN_WORD_LENGTH`**: Longitud mínima de palabras a considerar
  - **Default**: `3` caracteres
  - **Por qué**: Eliminar palabras muy cortas que suelen ser poco informativas
  - **Dos nombres**: Compatibilidad

### Categoría: Machine Learning (Líneas 71-73)

```python
N_CLUSTERS_DEFAULT = get_env_int('N_CLUSTERS_DEFAULT', 3)
N_TOPICS_DEFAULT = get_env_int('N_TOPICS_DEFAULT', 5)
N_WORDS_PER_TOPIC = get_env_int('N_WORDS_PER_TOPIC', 10)
```

**¿Para qué sirven?**

- **`N_CLUSTERS_DEFAULT`**: Número de clusters por defecto para K-Means
  - **Dónde se usa**: En análisis de factores y clustering
  - **Default**: 3 clusters

- **`N_TOPICS_DEFAULT`**: Número de temas por defecto para topic modeling
  - **Dónde se usa**: En LDA, NMF, LSA, BERTopic
  - **Default**: 5 temas

- **`N_WORDS_PER_TOPIC`**: Número de palabras clave por tema
  - **Dónde se usa**: Al mostrar resultados de topic modeling
  - **Default**: 10 palabras

### Categoría: Análisis (Líneas 76-78)

```python
MAX_PALABRAS_NUBE = get_env_int('MAX_PALABRAS_NUBE', 100)
TOP_N_PALABRAS = get_env_int('TOP_N_PALABRAS', 20)
TOP_N_FACTORES = get_env_int('TOP_N_FACTORES', 5)
```

**¿Para qué sirven?**

- **`MAX_PALABRAS_NUBE`**: Número máximo de palabras en la nube de palabras
  - **Default**: 100 palabras

- **`TOP_N_PALABRAS`**: Número de palabras más frecuentes a mostrar en análisis
  - **Default**: 20 palabras

- **`TOP_N_FACTORES`**: Número de factores principales a mostrar
  - **Default**: 5 factores

### Categoría: Visualización (Líneas 81-84)

```python
ANCHO_NUBE_PALABRAS = get_env_int('ANCHO_NUBE_PALABRAS', 1200)
ALTO_NUBE_PALABRAS = get_env_int('ALTO_NUBE_PALABRAS', 600)
COLOR_SCHEME = get_env('COLOR_SCHEME', 'Blues')
COLORMAP_WORDCLOUD = get_env('COLORMAP_WORDCLOUD', 'viridis')
```

**¿Para qué sirven?**

- **`ANCHO_NUBE_PALABRAS`**: Ancho en píxeles de la nube de palabras
  - **Default**: 1200 px

- **`ALTO_NUBE_PALABRAS`**: Alto en píxeles de la nube de palabras
  - **Default**: 600 px

- **`COLOR_SCHEME`**: Esquema de colores para gráficos de Plotly
  - **Valores posibles**: `'Blues'`, `'Reds'`, `'Greens'`, `'Viridis'`, etc.
  - **Ver más**: [Plotly color scales](https://plotly.com/python/builtin-colorscales/)

- **`COLORMAP_WORDCLOUD`**: Mapa de colores para la nube de palabras
  - **Valores posibles**: `'viridis'`, `'plasma'`, `'inferno'`, `'magma'`, etc.
  - **Ver más**: [Matplotlib colormaps](https://matplotlib.org/stable/tutorials/colors/colormaps.html)

### Categoría: Rutas (Líneas 87-88)

```python
DATA_DIR = get_env('DATA_DIR', 'data')
OUTPUT_DIR = get_env('OUTPUT_DIR', 'output')
```

**¿Para qué sirven?**

- **`DATA_DIR`**: Directorio para datos del proyecto
  - **Default**: `'data'`
  - **Uso**: Almacenar archivos descargados, datasets, etc.

- **`OUTPUT_DIR`**: Directorio para resultados de análisis
  - **Default**: `'output'`
  - **Uso**: Guardar gráficos, reportes, exportaciones

### Creación de Directorios (Líneas 91-94)

```python
Path(LOG_DIR).mkdir(exist_ok=True)
Path(CACHE_DIR).mkdir(exist_ok=True)
Path(DATA_DIR).mkdir(exist_ok=True)
Path(OUTPUT_DIR).mkdir(exist_ok=True)
```

**¿Qué hace este código?**

Crea los directorios necesarios si no existen.

- **`Path(directorio)`**: Crea un objeto Path
- **`.mkdir()`**: Crea el directorio
- **`exist_ok=True`**: No lanza error si el directorio ya existe

**¿Por qué aquí?**

Para asegurar que los directorios existen antes de que la aplicación intente usarlos.

### Categoría: Streamlit (Líneas 97-98)

```python
STREAMLIT_PORT = get_env_int('STREAMLIT_PORT', 8501)
STREAMLIT_SERVER_ADDRESS = get_env('STREAMLIT_SERVER_ADDRESS', '0.0.0.0')
```

**¿Para qué sirven?**

- **`STREAMLIT_PORT`**: Puerto donde se ejecuta Streamlit
  - **Default**: 8501 (puerto por defecto de Streamlit)
  - **Uso**: `streamlit run app.py --server.port 8501`

- **`STREAMLIT_SERVER_ADDRESS`**: Dirección del servidor
  - **Default**: `'0.0.0.0'` (accesible desde cualquier IP)
  - **Alternativa**: `'localhost'` (solo accesible localmente)

### Categoría: Desarrollo (Líneas 101-102)

```python
DEBUG = get_env_bool('DEBUG', False)
ENVIRONMENT = get_env('ENVIRONMENT', 'development')
```

**¿Para qué sirven?**

- **`DEBUG`**: Modo debug
  - **Default**: `False`
  - **Uso**: Habilitar funcionalidades de debugging, logs más verbosos

- **`ENVIRONMENT`**: Entorno de ejecución
  - **Valores posibles**: `'development'`, `'production'`, `'testing'`
  - **Uso**: Adaptar comportamiento según entorno

---

## 🔧 Función de Información

### Función: `print_config()`

**Líneas 105-117**

```python
def print_config():
    """Imprime la configuración actual (para debug)"""
    print("=" * 60)
    print("CONFIGURACIÓN DE LA APLICACIÓN")
    print("=" * 60)
    print(f"Entorno: {ENVIRONMENT}")
    print(f"Debug: {DEBUG}")
    print(f"Nivel de Log: {LOG_LEVEL}")
    print(f"Idioma: {IDIOMA}")
    print(f"Caché habilitado: {CACHE_ENABLED}")
    print(f"Directorio de logs: {LOG_DIR}")
    print(f"Directorio de caché: {CACHE_DIR}")
    print("=" * 60)
```

**¿Para qué sirve?**

Imprime un resumen de la configuración actual de la aplicación.

**Cómo usarla:**

```python
import config
config.print_config()
```

**Salida de ejemplo:**

```
============================================================
CONFIGURACIÓN DE LA APLICACIÓN
============================================================
Entorno: development
Debug: False
Nivel de Log: INFO
Idioma: english
Caché habilitado: True
Directorio de logs: logs
Directorio de caché: cache
============================================================
```

### Bloque de Ejecución Directa (Líneas 120-122)

```python
if __name__ == "__main__":
    # Mostrar configuración cuando se ejecuta directamente
    print_config()
```

**¿Qué hace?**

Si ejecutas `python config.py` directamente (no como import), muestra la configuración.

---

## 🔗 Cómo se Usa en Otros Archivos

### Ejemplo en `app.py`:

```python
import config

# Usar variables de configuración
logger.info(f"Entorno: {config.ENVIRONMENT}")
logger.info(f"Nivel de log: {config.LOG_LEVEL}")

# Crear conectores con configuración
drive_connector = GoogleDriveConnector(
    credentials_path=config.CREDENTIALS_PATH,
    token_path=config.TOKEN_PATH
)
```

### Ejemplo en `TextPreprocessor`:

```python
import config

class TextPreprocessor:
    def __init__(self, language: str = config.DEFAULT_LANGUAGE):
        self.language = language
        # ... resto del código
```

---

## 💡 Conceptos Clave para Principiantes

### 1. ¿Qué son las variables de entorno?

Son variables que existen en el sistema operativo, independientes de tu código. Se usan para:

- **Configuración sin código duro**: No incluir valores sensibles en el código
- **Flexibilidad**: Cambiar configuración sin modificar código
- **Seguridad**: No subir credenciales al repositorio

### 2. ¿Qué es el archivo `.env`?

Es un archivo de texto plano que contiene variables en formato `CLAVE=valor`:

```env
LOG_LEVEL=DEBUG
CACHE_ENABLED=True
```

**⚠️ IMPORTANTE**: Este archivo NO debe incluirse en el repositorio (agregar a `.gitignore`)

### 3. ¿Por qué centralizar la configuración?

**Ventajas:**

- **Un solo lugar**: Todas las configuraciones en un archivo
- **Fácil mantenimiento**: Cambiar un valor afecta toda la aplicación
- **Type safety**: Funciones de utilidad aseguran tipos correctos
- **Defaults sensatos**: Si falta una variable, hay un valor por defecto

### 4. ¿Qué pasa si no existe el `.env`?

La aplicación funciona igual, usando los valores por defecto definidos en `config.py`.

### 5. ¿Cómo agregar una nueva variable de configuración?

```python
# En config.py
MI_VARIABLE = get_env('MI_VARIABLE', 'valor_por_defecto')

# En .env (opcional)
MI_VARIABLE=mi_valor_personalizado

# Usar en cualquier archivo
import config
print(config.MI_VARIABLE)
```

---

## 🎯 Mejores Prácticas

### 1. Nombres Descriptivos

```python
# ✅ Bueno
MAX_PALABRAS_NUBE = 100

# ❌ Malo
MAX = 100
```

### 2. Categorizar Variables

Agrupar variables relacionadas con comentarios:

```python
# ==================== GOOGLE DRIVE ====================
GOOGLE_DRIVE_FOLDER_ID = ...
CREDENTIALS_PATH = ...
```

### 3. Proporcionar Defaults Sensatos

```python
# ✅ Bueno - Default útil
LOG_LEVEL = get_env('LOG_LEVEL', 'INFO')

# ❌ Malo - Default poco práctico
LOG_LEVEL = get_env('LOG_LEVEL', None)
```

### 4. Validar Variables Críticas

```python
# Para variables obligatorias
API_KEY = get_env('API_KEY', required=True)
```

### 5. Documentar Variables

Incluir comentarios explicando qué hace cada variable:

```python
# Número de clusters para K-Means (default: 3)
N_CLUSTERS_DEFAULT = get_env_int('N_CLUSTERS_DEFAULT', 3)
```

---

## 🔍 Resumen

**`config.py`** es el **centro de configuración** de la aplicación. Es responsable de:

✅ Cargar variables de entorno desde `.env`
✅ Proporcionar valores por defecto para todas las configuraciones
✅ Validar y convertir tipos de datos
✅ Crear directorios necesarios
✅ Centralizar configuración para fácil mantenimiento

**Flujo simplificado:**

1. `load_dotenv()` lee el archivo `.env`
2. Variables se obtienen con `get_env()`, `get_env_bool()`, `get_env_int()`
3. Se crean directorios necesarios
4. Otras partes de la aplicación importan y usan estas variables

**Para modificar configuración:**

1. **Temporal**: Editar `.env` (no afecta código)
2. **Permanente**: Cambiar defaults en `config.py`

---

**Archivo**: `config.py`
**Líneas de código**: 123
**Complejidad**: Baja
**Importancia**: ⭐⭐⭐⭐⭐ (Crítico - Configuración)

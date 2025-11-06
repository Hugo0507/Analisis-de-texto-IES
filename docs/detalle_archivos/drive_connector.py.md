# 📄 Documentación Detallada: `drive_connector.py`

## 📍 Ubicación
```
C:\Projects\Tesis\analisis_transformacion_digital\src\drive_connector.py
```

## 🎯 Propósito
Este archivo es el **puente de conexión con Google Drive**. Permite autenticar, listar, descargar, subir y gestionar archivos en Google Drive. Es fundamental para la persistencia de datos del proyecto, ya que todos los archivos (PDFs, TXTs, JSONs) se almacenan y recuperan desde Google Drive.

Es el archivo que implementa la integración con la **API de Google Drive v3** usando OAuth2.

## 🔄 Flujo de Ejecución
```
INICIO
  ↓
1. AUTENTICACIÓN OAuth2
   - Verificar si existe token.json
   - Si existe y es válido → Usar token
   - Si expiró → Refrescar token
   - Si no existe → Abrir navegador para login
   ↓
2. CREAR SERVICIO DE DRIVE API
   - Construir servicio con credenciales
   - Validar conexión
   ↓
3. OPERACIONES DISPONIBLES
   ├─ Listar archivos/carpetas
   ├─ Leer archivos (sin descargar)
   ├─ Descargar archivos a disco
   ├─ Crear carpetas
   ├─ Copiar archivos
   ├─ Crear archivos (TXT, JSON)
   └─ Buscar archivos
   ↓
4. MANEJO DE ERRORES
   - Reintentos automáticos (SSL, red)
   - Re-autenticación si expira sesión
   - Backoff exponencial
   ↓
FIN
```

## 📚 Librerías Utilizadas

### Líneas 6-20: Importaciones
```python
import os
import io
import time
from typing import List, Dict, Optional, Union, Any
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from googleapiclient.errors import HttpError
from collections import defaultdict
import pandas as pd
import ssl
import socket
from src.utils.logger import get_logger
```

**¿Qué hace cada librería?**

- **`io`**: Manejo de streams en memoria (BytesIO)
  - **Dónde se usa**: Líneas 247, 354, 773 (leer archivos sin descargar)
  - **Para qué**: Trabajar con archivos en memoria sin guardarlos en disco

- **`time`**: Control de tiempo
  - **Dónde se usa**: Líneas 263, 287, 300, 321 (reintentos)
  - **Para qué**: Esperas entre reintentos (backoff exponencial)

- **`google.auth.transport.requests.Request`**: Manejo de requests OAuth
  - **Dónde se usa**: Líneas 70, 145 (refrescar token)
  - **Para qué**: Refrescar tokens expirados

- **`google.oauth2.credentials.Credentials`**: Credenciales OAuth2
  - **Dónde se usa**: Líneas 44, 60, 93-94 (autenticación)
  - **Para qué**: Almacenar y gestionar credenciales de usuario

- **`google_auth_oauthlib.flow.InstalledAppFlow`**: Flujo OAuth2
  - **Dónde se usa**: Líneas 83-85 (autenticación inicial)
  - **Para qué**: Iniciar proceso de login con Google

- **`googleapiclient.discovery.build`**: Cliente API Google
  - **Dónde se usa**: Líneas 103, 146, 273 (crear servicio)
  - **Para qué**: Construir cliente de Drive API v3

- **`googleapiclient.http.MediaIoBaseDownload`**: Descarga de archivos
  - **Dónde se usa**: Líneas 248, 355 (descargar contenido)
  - **Para qué**: Descargar archivos grandes en chunks

- **`googleapiclient.errors.HttpError`**: Errores HTTP de API
  - **Dónde se usa**: Líneas 293-306 (manejo de errores)
  - **Para qué**: Capturar errores 403, 404, 500, etc.

- **`ssl, socket`**: Manejo de conexiones de red
  - **Dónde se usa**: Líneas 260-290 (errores SSL/red)
  - **Para qué**: Manejar errores de conexión y reintentar

- **`pandas`**: Manipulación de datos
  - **Dónde se usa**: Líneas 468, 489 (crear DataFrames)
  - **Para qué**: Organizar información de archivos en tablas

## 🔧 Clase Principal: `GoogleDriveConnector`

### Clase: `GoogleDriveConnector`
**Líneas 30-915**

Clase que encapsula todas las operaciones con Google Drive.

**Parámetros del Constructor:**
- `credentials_path` (str): Ruta a credentials.json (default: 'credentials.json')
- `token_path` (str): Ruta donde guardar token.json (default: 'token.json')

**Métodos principales (37 métodos en total):**

#### 1. **Autenticación**
- `authenticate()`: Autentica con Google Drive OAuth2 (líneas 47-108)
- `validate_connection()`: Valida que la conexión esté activa (líneas 110-128)
- `ensure_connection()`: Asegura conexión activa, re-autentica si es necesario (líneas 130-154)

#### 2. **Operaciones de Lectura**
- `list_files_in_folder()`: Lista archivos en una carpeta (líneas 170-217)
- `read_file_content()`: Lee archivo EN MEMORIA sin descargar (líneas 219-329)
- `download_file()`: Descarga archivo a disco (líneas 331-367)
- `download_folder()`: Descarga carpeta completa (líneas 369-404)

#### 3. **Gestión de Carpetas**
- `create_folder()`: Crea carpeta nueva (líneas 501-537)
- `get_or_create_folder()`: Busca o crea carpeta (líneas 672-714)
- `get_parent_folder_id()`: Obtiene ID de carpeta padre (líneas 638-670)

#### 4. **Operaciones de Escritura**
- `copy_file()`: Copia archivo a otra carpeta (líneas 539-585)
- `copy_files_to_folder()`: Copia múltiples archivos (líneas 587-609)
- `create_text_file()`: Crea archivo de texto (líneas 743-789)
- `create_json_file()`: Crea archivo JSON (líneas 829-879)

#### 5. **Búsqueda y Filtrado**
- `find_file_in_folder()`: Busca archivo por nombre (líneas 791-827)
- `filter_files_by_extension()`: Filtra archivos por extensión (líneas 611-636)

#### 6. **Lectura de Formatos**
- `read_json_file()`: Lee y parsea archivo JSON (líneas 881-914)

#### 7. **Estadísticas y Reportes**
- `get_file_statistics()`: Obtiene estadísticas de archivos (líneas 406-444)
- `create_file_dataframe()`: Crea DataFrame con info de archivos (líneas 446-468)
- `create_directory_summary_table()`: Tabla resumen por directorio (líneas 470-499)

#### 8. **Utilidades**
- `get_folder_id_from_url()`: Extrae ID de URL de Drive (líneas 156-168)

**Cómo funciona el sistema de reintentos:**

```python
# read_file_content() implementa reintentos con backoff exponencial
for attempt in range(max_retries):  # Intenta 3 veces
    try:
        # Intentar leer archivo
        return file_content
    except ssl.SSLError as e:
        if attempt < max_retries - 1:
            wait_time = (2 ** attempt)  # 1s, 2s, 4s
            time.sleep(wait_time)

            # Re-autenticar si persiste el error
            if attempt == 1:
                self.creds.refresh(Request())
                self.service = build('drive', 'v3', credentials=self.creds)
            continue
```

**Flujo de autenticación:**

```python
# 1. Crear conector
connector = GoogleDriveConnector(
    credentials_path='credentials.json',
    token_path='token.json'
)

# 2. Autenticar (solo la primera vez abre navegador)
if connector.authenticate():
    print("✓ Autenticado correctamente")

    # 3. Listar archivos
    files = connector.list_files_in_folder(folder_id='...')

    # 4. Leer archivo sin descargar
    file_content = connector.read_file_content(file_id='...')

    # 5. Crear archivo JSON
    connector.create_json_file(
        folder_id='...',
        file_name='datos.json',
        json_data={'key': 'value'}
    )
```

## 💡 Conceptos Clave para Principiantes

### 1. **¿Qué es OAuth2?**
Es un protocolo de autenticación que permite a la aplicación acceder a Google Drive **sin conocer tu contraseña**.

**Flujo:**
```
1. App solicita permiso → 2. Usuario acepta en navegador →
3. Google da token → 4. App usa token para acceder a Drive
```

### 2. **¿Qué es un Token?**
Es una "llave temporal" que permite acceder a Google Drive sin pedir contraseña cada vez.

```
credentials.json → (información de la app)
token.json → (llave temporal del usuario, se crea después del primer login)
```

### 3. **¿Por qué `read_file_content()` usa BytesIO?**
Para leer archivos **en memoria** sin guardarlos en disco. Es más rápido y no ocupa espacio.

```
Método tradicional: Drive → Disco → Memoria (2 pasos)
Con BytesIO: Drive → Memoria (1 paso)
```

### 4. **¿Qué es Backoff Exponencial?**
Estrategia de reintentos donde cada espera es el doble de la anterior.

```
Intento 1: falla → espera 1 segundo
Intento 2: falla → espera 2 segundos
Intento 3: falla → espera 4 segundos
```

### 5. **¿Por qué reintentos?**
Las conexiones a internet pueden fallar temporalmente. Los reintentos permiten recuperarse automáticamente de errores transitorios.

### 6. **¿Qué es un MIME Type?**
Identifica el tipo de archivo.

```
'text/plain' → Archivo de texto
'application/json' → Archivo JSON
'application/pdf' → Archivo PDF
'application/vnd.google-apps.folder' → Carpeta de Google Drive
```

### 7. **¿Diferencia entre `download_file()` y `read_file_content()`?**
```
download_file():
  - Guarda archivo en disco
  - Usa FileIO (archivo físico)
  - Retorna True/False

read_file_content():
  - Lee archivo en memoria
  - Usa BytesIO (archivo virtual)
  - Retorna contenido (BytesIO)
```

### 8. **¿Qué es `recursive=True` en `list_files_in_folder()`?**
Decide si buscar solo en la carpeta actual o también en subcarpetas.

```
recursive=False: Solo carpeta actual
recursive=True: Carpeta actual + todas las subcarpetas
```

## 🔗 Dependencias de Otros Archivos

### Archivos que ESTE archivo IMPORTA:
```
→ src/utils/logger.py (línea 20) - Para logging
```

### Archivos que USAN este archivo:
```
→ components/pages/conexion_drive.py (autenticación y listado)
→ components/pages/estadisticas_archivos.py (obtener estadísticas)
→ components/pages/deteccion_idiomas.py (leer archivos)
→ components/pages/conversion_txt.py (leer PDFs, crear TXTs)
→ components/pages/bolsa_palabras.py (leer textos procesados)
→ components/pages/analisis_tfidf.py (leer textos procesados)
→ components/ui/helpers.py (funciones de caché en Drive)
→ app.py (inicialización del conector)
```

## 🔍 Resumen

**`drive_connector.py`** es responsable de:
✅ Autenticar con Google Drive usando OAuth2
✅ Listar archivos y carpetas recursivamente
✅ Leer archivos en memoria (sin descargar)
✅ Descargar archivos a disco
✅ Crear carpetas y subcarpetas
✅ Copiar archivos entre carpetas
✅ Crear archivos de texto y JSON
✅ Buscar archivos por nombre
✅ Filtrar archivos por extensión
✅ Generar estadísticas de archivos
✅ Manejar errores de red con reintentos automáticos
✅ Re-autenticar automáticamente si expira el token

**Flujo simplificado:**
```
1. Autenticación OAuth2 → 2. Validar conexión →
3. Operaciones CRUD (Crear, Leer, Actualizar, Borrar*) →
4. Manejo automático de errores → 5. Persistencia de resultados
```
*Nota: No implementa DELETE por seguridad

**Para modificar:**
- **Cambiar número de reintentos**: Editar `max_retries` en línea 219
- **Ajustar tiempo de espera**: Modificar backoff en líneas 263, 287, 300
- **Agregar permisos**: Modificar `SCOPES` en línea 27

**Archivo**: `drive_connector.py`
**Líneas de código**: 932
**Complejidad**: Alta (⭐⭐⭐⭐⭐)
**Importancia**: ⭐⭐⭐⭐⭐ (Crítico - único medio de persistencia)

---

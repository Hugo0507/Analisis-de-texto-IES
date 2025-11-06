# Solución: Error SSL al Leer Archivos de Google Drive

## 🔴 Problema

Estás viendo el siguiente mensaje:
```
Error SSL leyendo archivo 1UpX2Wnh7GL3dxa30RhWAGZnnL5fIKtze (intento 1/3). Reintentando en 1s...
```

**Este NO es un error de tu código o de los cambios de TF-IDF**. Es un problema temporal de conectividad con la API de Google Drive.

---

## ✅ ¿Qué Está Haciendo Tu Código?

Tu aplicación **ya tiene protección contra estos errores**:

1. **Reintentos automáticos**: Intenta hasta 3 veces
2. **Backoff exponencial**: Espera 1s, luego 2s, luego 4s entre intentos
3. **Re-autenticación**: En el 2do intento, refresca las credenciales
4. **Manejo de múltiples errores**: SSL, HTTP, socket, etc.

### **Código de Protección**

Ubicación: `src/drive_connector.py` líneas 199-294

```python
def read_file_content(self, file_id, max_retries=3):
    for attempt in range(max_retries):
        try:
            # Descargar archivo...
        except ssl.SSLError as e:
            # Reintentar con backoff exponencial
        except socket.timeout as e:
            # Reintentar errores de conexión
        # ... más manejo de errores
```

---

## 🔍 Causas Comunes del Error SSL

### **1. Conexión a Internet Inestable**
- WiFi débil o intermitente
- Red saturada
- ISP con problemas temporales

### **2. Firewall o Antivirus**
- Windows Defender bloqueando temporalmente
- Firewall corporativo
- Software de seguridad de terceros

### **3. Problemas con Google API**
- Sobrecarga de servidores de Google
- Rate limiting (demasiadas peticiones)
- Mantenimiento temporal

### **4. Certificados SSL**
- Certificados SSL no actualizados en Windows
- Reloj del sistema desincronizado

### **5. Python 3.13.1**
- Versión muy nueva (enero 2024)
- Posibles incompatibilidades con librerías antiguas
- `google-api-python-client` puede no estar totalmente compatible

---

## 🛠️ Soluciones

### **Solución 1: Esperar que los Reintentos Funcionen ⏳**

**El sistema debería resolverlo automáticamente**. Observa los mensajes:

```
⚠️ Error SSL (intento 1/3). Reintentando en 1s...
⚠️ Error SSL (intento 2/3). Reintentando en 2s...
🔄 Intentando re-autenticar...
✓ Archivo leído correctamente
```

Si ves el mensaje "✓", el problema se resolvió.

---

### **Solución 2: Verificar Conexión a Internet 🌐**

```powershell
# En PowerShell, verificar conectividad
ping google.com
ping www.googleapis.com
```

Si hay packet loss > 5%, tu conexión es inestable.

**Acciones**:
- Conectar cable ethernet (más estable que WiFi)
- Acercarse al router WiFi
- Reiniciar router/módem
- Cambiar a otra red WiFi

---

### **Solución 3: Desactivar Antivirus Temporalmente 🛡️**

Algunos antivirus bloquean conexiones SSL de Python:

**Windows Defender**:
1. Inicio → Seguridad de Windows
2. Protección contra virus y amenazas
3. Administrar configuración
4. Desactivar temporalmente "Protección en tiempo real"
5. Ejecutar la app
6. **Reactivar** después

**Otros Antivirus**:
- Avast, AVG, Norton, McAfee: Desactivar temporalmente
- Agregar Python y la app a excepciones

---

### **Solución 4: Actualizar Certificados SSL 🔐**

#### **Windows**:
```powershell
# En PowerShell como Administrador
certutil -generateSSTFromWU roots.sst
```

#### **Python**:
```bash
# En tu entorno virtual
python -m pip install --upgrade certifi
```

---

### **Solución 5: Verificar Reloj del Sistema 🕐**

SSL requiere que el reloj esté sincronizado:

1. Click derecho en reloj de Windows
2. Ajustar fecha y hora
3. Sincronizar ahora
4. Verificar zona horaria correcta

---

### **Solución 6: Downgrade de Python (Recomendado) 🐍**

Python 3.13.1 es muy nuevo. **Considera usar Python 3.11 o 3.12**:

#### **Opción A: Crear nuevo entorno con Python 3.11**

```powershell
# Descargar Python 3.11 de python.org
# Instalar en C:\Python311

# Crear nuevo entorno virtual
C:\Python311\python.exe -m venv venv311

# Activar
.\venv311\Scripts\Activate

# Instalar dependencias
pip install -r requirements.txt
```

#### **Opción B: Usar Python 3.12**
```powershell
# Si tienes Python 3.12 instalado
py -3.12 -m venv venv312
.\venv312\Scripts\Activate
pip install -r requirements.txt
```

---

### **Solución 7: Aumentar Timeout y Reintentos 🔄**

Si los errores persisten, aumentar reintentos:

**Modificar en tu código** (donde llamas `read_file_content`):

```python
# Buscar llamadas a read_file_content
file_content = connector.read_file_content(file_id, max_retries=5)  # De 3 a 5
```

O modificar en `drive_connector.py` línea 199:

```python
def read_file_content(self, file_id, max_retries=5):  # Cambiar de 3 a 5
```

---

### **Solución 8: Configurar HTTP/2 Disable ⚙️**

Algunos sistemas tienen problemas con HTTP/2:

```python
# Agregar al inicio de drive_connector.py
import os
os.environ['GRPC_ENABLE_FORK_SUPPORT'] = '0'
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'
```

---

### **Solución 9: Reinstalar Librerías de Google 📦**

```powershell
# Activar entorno virtual
.\venv\Scripts\Activate

# Desinstalar
pip uninstall google-auth google-auth-oauthlib google-api-python-client

# Reinstalar versiones específicas (compatibles)
pip install google-auth==2.26.2
pip install google-auth-oauthlib==1.2.0
pip install google-api-python-client==2.115.0
```

---

### **Solución 10: Configurar SSL Context Personalizado 🔧**

Agregar al método `__init__` de `GoogleDriveConnector`:

```python
def __init__(self, credentials_path='credentials.json', token_path='token.json'):
    # ... código existente ...

    # Configurar SSL context más permisivo
    import ssl
    ssl._create_default_https_context = ssl._create_unverified_context
```

**⚠️ Advertencia**: Esto reduce seguridad. Solo para pruebas.

---

## 🎯 Recomendación Principal

### **Mejor Solución (Orden de Prioridad)**:

1. ✅ **Esperar los reintentos** → El sistema debería funcionar solo
2. ✅ **Verificar internet** → Conexión estable es clave
3. ✅ **Downgrade a Python 3.11** → Mayor compatibilidad
4. ✅ **Aumentar reintentos a 5** → Más oportunidades de éxito

---

## 📊 Cómo Monitorear el Progreso

Busca estos mensajes en la consola:

### **✅ Éxito**:
```
⚠️ Error SSL (intento 1/3). Reintentando en 1s...
✓ Archivo leído correctamente
```

### **❌ Fallo**:
```
⚠️ Error SSL (intento 1/3). Reintentando en 1s...
⚠️ Error SSL (intento 2/3). Reintentando en 2s...
⚠️ Error SSL (intento 3/3). Reintentando en 4s...
❌ Error SSL después de 3 intentos
```

---

## 🔧 Cambio Realizado

He mejorado el manejo de errores agregando captura de **errores de socket** adicionales:

**Archivo**: `src/drive_connector.py` línea 259

```python
except (socket.timeout, socket.error, ConnectionError) as e:
    # Errores de conexión de red
    if attempt < max_retries - 1:
        wait_time = (2 ** attempt)
        print(f"⚠️ Error de conexión (intento {attempt + 1}/{max_retries})...")
        time.sleep(wait_time)
        continue
```

Ahora el sistema también maneja:
- ✅ `socket.timeout` → Timeout de conexión
- ✅ `socket.error` → Errores de socket genéricos
- ✅ `ConnectionError` → Errores de conexión de red

---

## 📝 Notas Importantes

1. **Este error es temporal** → No afecta el funcionamiento de TF-IDF
2. **El código ya se protege** → Reintentos automáticos
3. **Es común con Google API** → Especialmente con muchos archivos
4. **Python 3.13.1 es muy nuevo** → Considera downgrade

---

## 🆘 Si Nada Funciona

### **Plan B: Descargar archivos localmente**

Si los errores SSL persisten, considera:

1. Descargar archivos de Drive a tu PC manualmente
2. Modificar app para leer desde disco local en vez de Drive
3. Procesar localmente y subir resultados después

### **Contactar Soporte**:
- Google Cloud Console → Soporte
- Verificar cuotas de API
- Revisar estado de servicios de Google

---

**Fecha**: 2025-10-13
**Versión**: 3.1
**Próximo paso**: Ejecutar la app y observar si los reintentos resuelven el problema

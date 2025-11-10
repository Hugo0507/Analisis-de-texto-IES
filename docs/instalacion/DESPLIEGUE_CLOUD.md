# 🚀 Guía de Despliegue en la Nube

Guía completa para desplegar la aplicación de Análisis de Transformación Digital en plataformas cloud gratuitas.

---

## 📋 Tabla de Contenidos

1. [Streamlit Community Cloud](#-opción-1-streamlit-community-cloud-recomendado) ⭐ **RECOMENDADO**
2. [Render](#-opción-2-render)
3. [Railway](#-opción-3-railway)
4. [Consideraciones Importantes](#-consideraciones-importantes)
5. [Troubleshooting](#-troubleshooting)

---

## 🌟 OPCIÓN 1: Streamlit Community Cloud (RECOMENDADO)

### ✅ Ventajas

- **100% Gratis** para siempre
- Diseñado específicamente para aplicaciones Streamlit
- **Súper fácil de usar** (despliegue en 3 clicks)
- Actualizaciones automáticas desde GitHub
- **1 GB RAM** y **1 CPU core** (suficiente para esta app)
- Dominio gratis: `tu-app.streamlit.app`
- SSL/HTTPS automático

### ⚠️ Limitaciones

- Solo para apps Streamlit
- 1 GB RAM (suficiente, pero no para datasets muy grandes)
- No soporta bases de datos persistentes (usa Google Drive)

---

### 📝 Pasos para Desplegar

#### **Paso 1: Preparar el Repositorio**

```bash
# 1. Asegúrate de estar en el directorio del proyecto
cd C:\Projects\Tesis\analisis_transformacion_digital

# 2. Verifica que .gitignore proteja credenciales
cat .gitignore
# Debe incluir: credentials.json, token.json, .env, .streamlit/secrets.toml

# 3. Haz commit de todos los cambios
git add -A
git commit -m "Preparar para despliegue en Streamlit Cloud"

# 4. Sube a GitHub (si aún no lo has hecho)
# Primero crea un repositorio en github.com
git remote add origin https://github.com/TU-USUARIO/analisis-transformacion-digital.git
git branch -M main
git push -u origin main
```

#### **Paso 2: Crear Cuenta en Streamlit Cloud**

1. **Ve a**: https://streamlit.io/cloud
2. **Haz clic en**: "Sign up" o "Get started"
3. **Autentícate** con tu cuenta de GitHub
4. **Autoriza** a Streamlit para acceder a tus repositorios

#### **Paso 3: Desplegar la Aplicación**

1. **En el dashboard**, haz clic en **"New app"**

2. **Configura el despliegue**:
   ```
   Repository:    tu-usuario/analisis-transformacion-digital
   Branch:        main
   Main file:     app.py
   ```

3. **Configuración avanzada** (opcional):
   - **Python version**: 3.11
   - **App URL**: elige un nombre personalizado (ej: `analisis-td`)

4. **Haz clic en**: **"Deploy!"**

⏳ **Espera 5-10 minutos** mientras se despliega...

#### **Paso 4: Configurar Secretos (Credenciales)**

**IMPORTANTE**: No subas `credentials.json` a GitHub. Usa los secretos de Streamlit:

1. **En tu app desplegada**, ve a **Settings** (⚙️) > **Secrets**

2. **Pega el siguiente contenido** (reemplaza con tus valores reales):

```toml
# Google Drive Configuration
GOOGLE_DRIVE_FOLDER_ID = "tu-folder-id-real"

# Credentials JSON (copia todo el contenido de credentials.json)
[google_credentials]
type = "service_account"
project_id = "tu-project-id"
private_key_id = "tu-private-key-id"
private_key = "-----BEGIN PRIVATE KEY-----\nTU-PRIVATE-KEY-AQUI\n-----END PRIVATE KEY-----\n"
client_email = "tu-service-account@project.iam.gserviceaccount.com"
client_id = "123456789"
auth_uri = "https://accounts.google.com/o/oauth2/auth"
token_uri = "https://oauth2.googleapis.com/token"
auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs"
client_x509_cert_url = "https://www.googleapis.com/robot/v1/metadata/x509/..."
```

3. **Guarda** y **reinicia** la aplicación

#### **Paso 5: Actualizar `config.py` para Cloud**

Modifica `config.py` para leer credenciales desde Streamlit secrets:

```python
import os
import streamlit as st

# Detectar si está en Streamlit Cloud
IS_CLOUD = "STREAMLIT_SHARING_MODE" in os.environ or hasattr(st, "secrets")

if IS_CLOUD:
    # Leer desde st.secrets en Streamlit Cloud
    GOOGLE_DRIVE_FOLDER_ID = st.secrets.get("GOOGLE_DRIVE_FOLDER_ID", "")

    # Crear credentials.json temporal desde secrets
    if "google_credentials" in st.secrets:
        import json
        credentials_dict = dict(st.secrets["google_credentials"])

        # Guardar temporalmente
        with open("credentials.json", "w") as f:
            json.dump(credentials_dict, f)

        CREDENTIALS_PATH = "credentials.json"
else:
    # Modo local
    GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "")
    CREDENTIALS_PATH = "credentials.json"
```

#### **Paso 6: ¡Listo!**

Tu aplicación estará disponible en:
```
https://tu-nombre-app.streamlit.app
```

---

## 🎨 OPCIÓN 2: Render

### ✅ Ventajas

- **Gratis** con plan básico
- Soporta Python, Node.js, Docker
- Base de datos PostgreSQL gratis
- SSL automático
- Más RAM que Streamlit Cloud (512 MB)

### ⚠️ Limitaciones

- Se **duerme después de 15 min** de inactividad
- Tarda ~1 min en despertar
- 750 horas/mes gratis (suficiente)

---

### 📝 Pasos para Desplegar en Render

#### **Paso 1: Crear `render.yaml`**

Crea el archivo `render.yaml` en la raíz:

```yaml
services:
  - type: web
    name: analisis-transformacion-digital
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: streamlit run app.py --server.port=$PORT --server.address=0.0.0.0
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: STREAMLIT_SERVER_HEADLESS
        value: true
      - key: STREAMLIT_SERVER_ENABLE_CORS
        value: false
```

#### **Paso 2: Desplegar**

1. **Ve a**: https://render.com
2. **Sign up** con GitHub
3. **New** > **Web Service**
4. **Conecta** tu repositorio
5. **Configura**:
   - Name: `analisis-td`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `streamlit run app.py --server.port=$PORT --server.address=0.0.0.0`
6. **Deploy**

#### **Paso 3: Variables de Entorno**

En **Environment**, agrega:
```
GOOGLE_DRIVE_FOLDER_ID=tu-folder-id
```

Para `credentials.json`, copia el JSON completo como variable:
```
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"..."}
```

#### **Paso 4: Actualizar `config.py`**

```python
import os
import json

# Detectar Render
IS_RENDER = "RENDER" in os.environ

if IS_RENDER:
    # Leer credenciales desde variable de entorno
    GOOGLE_DRIVE_FOLDER_ID = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "")

    credentials_json = os.environ.get("GOOGLE_CREDENTIALS", "{}")
    credentials_dict = json.loads(credentials_json)

    with open("credentials.json", "w") as f:
        json.dump(credentials_dict, f)

    CREDENTIALS_PATH = "credentials.json"
```

---

## 🚂 OPCIÓN 3: Railway

### ✅ Ventajas

- **$5 gratis/mes** (suficiente para desarrollo)
- Muy rápido (no se duerme)
- Base de datos incluida
- Deploy con GitHub automático

### ⚠️ Limitaciones

- Límite de **$5/mes** en plan gratis
- Requiere tarjeta de crédito (no cobra, solo verifica)

---

### 📝 Pasos para Desplegar en Railway

1. **Ve a**: https://railway.app
2. **Sign up** con GitHub
3. **New Project** > **Deploy from GitHub repo**
4. **Selecciona** tu repositorio
5. **Configura variables**:
   ```
   GOOGLE_DRIVE_FOLDER_ID=...
   GOOGLE_CREDENTIALS=...
   ```
6. **Deploy**

Railway detectará automáticamente que es una app Streamlit.

---

## ⚙️ Consideraciones Importantes

### 🔐 Seguridad

**NUNCA subas a GitHub:**
- ❌ `credentials.json`
- ❌ `token.json`
- ❌ `.env`
- ❌ `service_account.json`

**Verifica que `.gitignore` incluya:**
```
credentials.json
token.json
.env
.streamlit/secrets.toml
service_account.json
client_secret*.json
```

### 📦 Dependencias

Asegúrate de que `requirements.txt` esté actualizado:

```bash
pip freeze > requirements.txt
```

**Elimina dependencias de desarrollo** (opcional):
```
pytest
pytest-cov
black
flake8
```

### 🗂️ Cache y Persistencia

**Problema**: El caché local (`cache/`) se borra en cada deploy.

**Solución**: Usa **Google Drive** para persistencia:
- ✅ Todos los resultados ya se guardan en Drive
- ✅ El sistema detecta y carga desde Drive automáticamente
- ✅ No necesitas hacer nada adicional

### 🌍 Variables de Entorno

Crea un archivo `.streamlit/config.toml` para configuración de Streamlit:

```toml
[server]
headless = true
port = 8501

[browser]
gatherUsageStats = false

[theme]
primaryColor = "#4CAF50"
backgroundColor = "#FFFFFF"
secondaryBackgroundColor = "#F0F2F6"
textColor = "#262730"
font = "sans serif"
```

---

## 🔍 Troubleshooting

### Error: "ModuleNotFoundError"

**Causa**: Falta una dependencia en `requirements.txt`

**Solución**:
```bash
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Update dependencies"
git push
```

### Error: "Port already in use"

**Causa**: Configuración incorrecta del puerto

**Solución**: En Streamlit Cloud no necesitas configurar el puerto.

En Render/Railway, usa:
```bash
streamlit run app.py --server.port=$PORT
```

### Error: "Google Drive credentials not found"

**Causa**: No configuraste los secretos correctamente

**Solución**:
1. Ve a **Settings** > **Secrets** en Streamlit Cloud
2. Verifica que copiaste TODO el contenido de `credentials.json`
3. Verifica el formato TOML (sin comillas extra)

### App muy lenta

**Causa**: Procesamiento pesado (NER, BERTopic)

**Soluciones**:
1. ✅ Usa **caché de Google Drive** (ya implementado)
2. ✅ No ejecutes análisis pesados en cada carga
3. ⚠️ Considera **reducir tamaño del corpus** para demo
4. ⚠️ Usa **modelo spaCy pequeño** (`en_core_web_sm` en lugar de `lg`)

### Error: "Out of memory"

**Causa**: Corpus muy grande o modelo muy pesado

**Soluciones**:
1. Reduce `max_features` en TF-IDF (1000 → 500)
2. Usa modelo spaCy pequeño
3. Procesa en lotes más pequeños
4. Considera **Render** (más RAM)

---

## 📊 Comparación de Plataformas

| Característica | Streamlit Cloud | Render | Railway |
|----------------|-----------------|--------|---------|
| **Precio** | 100% Gratis | Gratis ($0) | $5/mes gratis |
| **RAM** | 1 GB | 512 MB | 512 MB - 8 GB |
| **Siempre activo** | ✅ Sí | ❌ No (se duerme) | ✅ Sí |
| **SSL** | ✅ Gratis | ✅ Gratis | ✅ Gratis |
| **Custom domain** | ❌ No | ✅ Sí | ✅ Sí |
| **Base de datos** | ❌ No | ✅ PostgreSQL | ✅ PostgreSQL |
| **Facilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Mejor para** | Apps Streamlit | Apps generales | Apps complejas |

---

## 🎯 Recomendación Final

Para esta aplicación, **recomiendo Streamlit Community Cloud** porque:

✅ Es **100% gratis** para siempre
✅ Diseñado para Streamlit (deploy súper fácil)
✅ **1 GB RAM** (suficiente con caché de Drive)
✅ Siempre activo (no se duerme)
✅ Updates automáticos desde GitHub
✅ SSL gratis

**Limitación a considerar**: Si tu corpus es **MUY grande** (>1000 documentos), considera Render o Railway con más RAM.

---

## 📚 Recursos Adicionales

- [Streamlit Cloud Docs](https://docs.streamlit.io/streamlit-community-cloud)
- [Render Python Guide](https://render.com/docs/deploy-streamlit)
- [Railway Streamlit Template](https://railway.app/template/streamlit)

---

## ✅ Checklist antes de Desplegar

- [ ] `.gitignore` protege credenciales
- [ ] `requirements.txt` está actualizado
- [ ] `config.py` lee de secrets/env vars
- [ ] Todo commiteado y pusheado a GitHub
- [ ] Cuenta creada en plataforma elegida
- [ ] Secrets configurados correctamente
- [ ] Aplicación probada localmente

---

**Última actualización**: 2025-11-09
**Versión**: 1.0
**Plataforma recomendada**: Streamlit Community Cloud

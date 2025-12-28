# Despliegue en Hugging Face Spaces

Guía completa para desplegar el backend Django en Hugging Face Spaces.

## 📋 Índice

1. [Prerrequisitos](#prerrequisitos)
2. [Configuración Inicial](#configuración-inicial)
3. [Variables de Entorno](#variables-de-entorno)
4. [Deployment Automático](#deployment-automático)
5. [Deployment Manual](#deployment-manual)
6. [Verificación](#verificación)
7. [Solución de Problemas](#solución-de-problemas)

---

## Prerrequisitos

- Cuenta en [Hugging Face](https://huggingface.co)
- Token de acceso de Hugging Face con permisos de escritura
- Space creado en Hugging Face (SDK: Docker)
- Repositorio en GitHub (para deployment automático)

---

## Configuración Inicial

### 1. Crear el Space en Hugging Face

1. Ve a https://huggingface.co/new-space
2. Completa los datos:
   - **Owner**: Tu usuario (ej: `Hugo0507`)
   - **Space name**: `analisis-ies-backend`
   - **License**: `MIT`
   - **SDK**: Selecciona **Docker**
   - **Hardware**: CPU básico (gratis) o GPU si lo necesitas

3. Haz clic en **Create Space**

### 2. Configurar Secrets en GitHub

Para el deployment automático, necesitas configurar el token de HF en GitHub:

1. Ve a tu repositorio en GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Haz clic en **New repository secret**
4. Agrega:
   - **Name**: `HF_TOKEN`
   - **Value**: Tu token de Hugging Face (obtenerlo en https://huggingface.co/settings/tokens)

---

## Variables de Entorno

### Configurar en Hugging Face Space

1. Ve a tu Space: https://huggingface.co/spaces/Hugo0507/analisis-ies-backend
2. **Settings** → **Variables and secrets**
3. Agrega las siguientes variables:

#### Variables Requeridas

```bash
# Django Core
SECRET_KEY=tu-secret-key-super-segura-aqui-min-50-caracteres
DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings.production

# Allowed Hosts
DJANGO_ALLOWED_HOSTS=huggingface.co,*.huggingface.co,*.hf.space

# Database (PostgreSQL - proporcionado por HF Spaces)
# HF Spaces proporciona DATABASE_URL automáticamente si activas PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis (opcional - solo si activas Redis en HF Spaces)
REDIS_URL=redis://localhost:6379/0

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://huggingface.co,https://Hugo0507-analisis-ies.hf.space
CSRF_TRUSTED_ORIGINS=https://huggingface.co,https://Hugo0507-analisis-ies-backend.hf.space
```

#### Variables Opcionales

```bash
# Security
SECURE_SSL_REDIRECT=True

# Google Drive (si necesitas integración)
GOOGLE_DRIVE_CREDENTIALS_FILE=/app/credentials/credentials.json
GOOGLE_DRIVE_TOKEN_FILE=/app/credentials/token.json

# Sentry Error Monitoring
SENTRY_DSN=https://your-sentry-dsn-here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-password-de-app
DEFAULT_FROM_EMAIL=tu-email@gmail.com
```

### Habilitar PostgreSQL en Hugging Face

1. En tu Space, ve a **Settings**
2. Busca la sección **Persistent storage**
3. Habilita **PostgreSQL** (esto creará automáticamente la variable `DATABASE_URL`)
4. Reinicia el Space

### Habilitar Redis (Opcional)

1. En **Settings** → **Persistent storage**
2. Habilita **Redis**
3. Reinicia el Space

---

## Deployment Automático

El proyecto está configurado para deployment automático desde GitHub usando GitHub Actions.

### Cómo Funciona

1. Haces cambios en el código del backend
2. Haces commit y push a la rama `main`:
   ```bash
   git add backend/
   git commit -m "Update backend"
   git push origin main
   ```
3. GitHub Actions automáticamente:
   - Detecta cambios en `backend/`
   - Prepara los archivos para HF Spaces
   - Sincroniza con tu Space en Hugging Face
   - HF Spaces reconstruye y redespliega automáticamente

### Verificar el Workflow

Puedes ver el progreso en:
- GitHub: **Actions** tab en tu repositorio
- Hugging Face: **Settings** → **Build logs** en tu Space

---

## Deployment Manual

Si prefieres hacer el deployment manualmente:

### Opción 1: Desde el repositorio local

```bash
# 1. Clonar el repositorio del Space
git clone https://huggingface.co/spaces/Hugo0507/analisis-ies-backend
cd analisis-ies-backend

# 2. Copiar archivos del backend
cp -r ../analisis_transformacion_digital/backend/* .

# 3. Copiar archivos específicos de HF
cp ../analisis_transformacion_digital/backend/README_HF.md ./README.md
cp ../analisis_transformacion_digital/backend/Dockerfile.hf ./Dockerfile

# 4. Commit y push
git add .
git commit -m "Deploy backend to HF Spaces"
git push
```

### Opción 2: Usando la interfaz web de HF

1. Ve a tu Space en Hugging Face
2. Haz clic en **Files and versions**
3. Arrastra y suelta los archivos del backend
4. El Space se reconstruirá automáticamente

---

## Verificación

### 1. Verificar que el Space está corriendo

1. Ve a https://huggingface.co/spaces/Hugo0507/analisis-ies-backend
2. Espera a que termine el build (puede tomar 5-10 minutos la primera vez)
3. Verifica que el status sea **Running** (punto verde)

### 2. Probar la API

#### Health Check

```bash
curl https://Hugo0507-analisis-ies-backend.hf.space/api/v1/health/
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-26T...",
  "database": "connected",
  "cache": "connected"
}
```

#### Swagger Documentation

Abre en el navegador:
```
https://Hugo0507-analisis-ies-backend.hf.space/api/docs/
```

#### Probar desde Python

```python
import requests

BASE_URL = "https://Hugo0507-analisis-ies-backend.hf.space"

# Health check
response = requests.get(f"{BASE_URL}/api/v1/health/")
print(response.json())

# Listar documentos (requiere autenticación si está habilitada)
response = requests.get(f"{BASE_URL}/api/v1/documents/")
print(response.json())
```

---

## Solución de Problemas

### Error: "Application failed to start"

**Causas comunes:**
1. Variables de entorno faltantes
2. Error en el Dockerfile
3. Problema con las migraciones de base de datos

**Solución:**
1. Revisa los logs del build: Space → **Settings** → **Build logs**
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate que PostgreSQL esté habilitado

### Error: "Database connection failed"

**Solución:**
1. Verifica que PostgreSQL esté habilitado en Settings
2. Revisa que `DATABASE_URL` esté correctamente configurada
3. Espera unos minutos después de habilitar PostgreSQL

### Error: "Migrations failed"

**Solución:**
Agrega este comando al Dockerfile para migrar automáticamente:
```dockerfile
CMD python manage.py migrate --noinput && \
    gunicorn config.wsgi:application --bind 0.0.0.0:7860
```

### Error: "Port 7860 not responding"

**Solución:**
Hugging Face Spaces requiere que la aplicación escuche en el puerto **7860**. Verifica:
1. El Dockerfile expone el puerto 7860
2. Gunicorn está bindeado a `0.0.0.0:7860`
3. La variable `app_port: 7860` está en el README.md

### Error: "CORS blocked"

**Solución:**
Verifica que las variables `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS` incluyan:
- `https://huggingface.co`
- `https://Hugo0507-analisis-ies.hf.space` (URL del frontend)
- `https://Hugo0507-analisis-ies-backend.hf.space` (URL del backend)

### Build muy lento

**Solución:**
1. El primer build tarda más (5-10 min) porque instala dependencias
2. Builds subsecuentes son más rápidos gracias al caché de Docker
3. Puedes reducir dependencias eliminando paquetes no esenciales del `requirements.txt`

### Logs del Space

Para ver los logs en tiempo real:
1. Ve a tu Space en HF
2. **Settings** → **Build logs** (logs de construcción)
3. **Logs** tab (logs de ejecución en tiempo real)

---

## Recursos Adicionales

- [Hugging Face Spaces Docs](https://huggingface.co/docs/hub/spaces)
- [Docker SDK Docs](https://huggingface.co/docs/hub/spaces-sdks-docker)
- [PostgreSQL on HF Spaces](https://huggingface.co/docs/hub/spaces-storage#persistent-storage)
- [GitHub Actions para HF](https://github.com/huggingface/huggingface_hub)

---

## Checklist de Deployment

- [ ] Space creado en Hugging Face con SDK Docker
- [ ] Token de HF configurado en GitHub Secrets (`HF_TOKEN`)
- [ ] PostgreSQL habilitado en HF Space Settings
- [ ] Variables de entorno configuradas en HF Space
- [ ] Workflow de GitHub Actions configurado
- [ ] Push a `main` para trigger deployment automático
- [ ] Verificar build exitoso en HF Space
- [ ] Probar endpoint `/api/v1/health/`
- [ ] Verificar Swagger docs en `/api/docs/`

---

**Última actualización:** Diciembre 2025

Para más ayuda, consulta la [documentación oficial de Hugging Face Spaces](https://huggingface.co/docs/hub/spaces).

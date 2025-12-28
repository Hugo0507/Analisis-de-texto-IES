# Guía de Despliegue - Render + Vercel + PostgreSQL

Esta guía te llevará paso a paso para desplegar tu aplicación en **Render** (backend) y **Vercel** (frontend) con **despliegue automático desde GitHub**.

---

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Preparación del Repositorio GitHub](#preparación-del-repositorio-github)
3. [Despliegue del Backend en Render](#despliegue-del-backend-en-render)
4. [Despliegue del Frontend en Vercel](#despliegue-del-frontend-en-vercel)
5. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
6. [Verificación del Despliegue](#verificación-del-despliegue)
7. [Despliegue Automático](#despliegue-automático)
8. [Troubleshooting](#troubleshooting)

---

## Prerrequisitos

### Cuentas Necesarias

- ✅ Cuenta de GitHub (con tu repositorio ya creado)
- ✅ Cuenta de [Render](https://render.com) (gratis)
- ✅ Cuenta de [Vercel](https://vercel.com) (gratis)
- ✅ Cuenta de Google Cloud (para Google Drive API)

### Repositorio GitHub

Tu código debe estar en un repositorio de GitHub con la siguiente estructura:

```
tu-repositorio/
├── backend/
│   ├── apps/
│   ├── config/
│   ├── manage.py
│   ├── requirements.txt
│   └── gunicorn.conf.py
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.production.example
├── render.yaml
└── README.md
```

---

## Preparación del Repositorio GitHub

### Paso 1: Subir tu código a GitHub

```bash
# Si aún no has inicializado Git
git init
git add .
git commit -m "Initial commit - Ready for Render + Vercel deployment"

# Crear repositorio en GitHub y conectarlo
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

### Paso 2: Verificar archivos de configuración

Asegúrate de que estos archivos existan en tu repositorio:

- ✅ `backend/requirements.txt`
- ✅ `backend/gunicorn.conf.py`
- ✅ `backend/config/settings/production.py`
- ✅ `frontend/package.json`
- ✅ `render.yaml` (lo crearemos más adelante)

---

## Despliegue del Backend en Render

### Paso 1: Crear cuenta en Render

1. Ve a [https://render.com](https://render.com)
2. Haz clic en "Get Started for Free"
3. Conecta con tu cuenta de GitHub
4. Autoriza a Render para acceder a tus repositorios

### Paso 2: Crear Base de Datos PostgreSQL

1. En el dashboard de Render, haz clic en **"New +"** → **"PostgreSQL"**

2. Configura la base de datos:
   - **Name**: `nlp-analysis-db`
   - **Database**: `analisis_transformacion_digital`
   - **User**: (se genera automáticamente)
   - **Region**: `Oregon (US West)` (o el más cercano a ti)
   - **Plan**: **Free** (suficiente para MVP)

3. Haz clic en **"Create Database"**

4. **IMPORTANTE**: Guarda las credenciales que aparecen:
   - **Internal Database URL**: `postgresql://user:pass@dpg-xxx/dbname`
   - **External Database URL**: `postgresql://user:pass@dpg-xxx.oregon-postgres.render.com/dbname`

   **Usa la Internal Database URL** (más rápida dentro de Render)

### Paso 3: Crear Web Service para Backend

1. En el dashboard, haz clic en **"New +"** → **"Web Service"**

2. Conecta tu repositorio:
   - Selecciona tu repositorio de GitHub
   - Haz clic en **"Connect"**

3. Configura el servicio:

   | Campo | Valor |
   |-------|-------|
   | **Name** | `nlp-analysis-backend` |
   | **Region** | `Oregon (US West)` (misma que la DB) |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Python 3` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `gunicorn config.wsgi:application --config gunicorn.conf.py` |
   | **Plan** | **Free** |

4. Haz clic en **"Advanced"** para expandir opciones avanzadas

5. **Agregar variables de entorno** (ver sección completa más abajo)

6. Haz clic en **"Create Web Service"**

### Paso 4: Crear Web Service para WebSocket (Django Channels)

1. Repite el proceso: **"New +"** → **"Web Service"**

2. Configura:

   | Campo | Valor |
   |-------|-------|
   | **Name** | `nlp-analysis-websocket` |
   | **Region** | `Oregon (US West)` |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Python 3` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `daphne -b 0.0.0.0 -p 8001 config.asgi:application` |
   | **Plan** | **Free** |

3. **Agregar las mismas variables de entorno** que el backend

4. Haz clic en **"Create Web Service"**

### Paso 5: Crear Redis (Opcional - Plan Paid)

**NOTA**: Render no ofrece Redis gratuito. Opciones:

**Opción A - Usar Redis Cloud (Gratis)**:
1. Ve a [https://redis.com/try-free/](https://redis.com/try-free/)
2. Crea cuenta y crea una base de datos Redis
3. Copia la URL de conexión: `redis://default:password@redis-xxxxx.redislabs.com:12345`
4. Úsala en la variable `REDIS_URL`

**Opción B - Desactivar Redis temporalmente**:
1. En `backend/config/settings/production.py`, cambia el caché a base de datos:
```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'cache_table',
    }
}
```
2. Ejecuta `python manage.py createcachetable` en Render Shell

### Paso 6: Variables de Entorno del Backend en Render

En **"Environment"** del servicio `nlp-analysis-backend`, agrega:

```bash
# Django Core
DJANGO_SECRET_KEY=genera-uno-con-get-random-secret-key
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_ALLOWED_HOSTS=nlp-analysis-backend.onrender.com,nlp-analysis-backend.onrender.com
DEBUG=False

# Database (copiar de Render PostgreSQL)
DATABASE_URL=postgresql://user:password@dpg-xxx-a.oregon-postgres.render.com/analisis_transformacion_digital

# O manualmente:
DB_NAME=analisis_transformacion_digital
DB_USER=analisis_user_xxx
DB_PASSWORD=tu-password-generado
DB_HOST=dpg-xxx-a.oregon-postgres.render.com
DB_PORT=5432
DB_ENGINE=postgresql

# Redis (opción A: Redis Cloud)
REDIS_URL=redis://default:password@redis-xxxxx.redislabs.com:12345

# CORS (tu dominio de Vercel - lo configuraremos después)
CORS_ALLOWED_ORIGINS=https://tu-app.vercel.app
CSRF_TRUSTED_ORIGINS=https://tu-app.vercel.app

# Email (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-app-password
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=tu-email@gmail.com

# Google Drive (si usas la API)
GOOGLE_DRIVE_CREDENTIALS_FILE=/etc/secrets/credentials.json
GOOGLE_DRIVE_TOKEN_FILE=/etc/secrets/token.json

# Sentry (opcional)
SENTRY_DSN=
```

**IMPORTANTE**: Genera un `DJANGO_SECRET_KEY` seguro:

```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Paso 7: Ejecutar Migraciones

Una vez que el servicio esté desplegado:

1. Ve a tu servicio en Render → **"Shell"** (pestaña superior)
2. Ejecuta:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

**Alternativa**: Agregar un script de post-deploy en `render.yaml` (ver más abajo)

---

## Despliegue del Frontend en Vercel

### Paso 1: Crear cuenta en Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Haz clic en "Sign Up"
3. Selecciona "Continue with GitHub"
4. Autoriza a Vercel para acceder a tus repositorios

### Paso 2: Importar Proyecto

1. En el dashboard de Vercel, haz clic en **"Add New..."** → **"Project"**

2. Busca tu repositorio de GitHub y haz clic en **"Import"**

3. Configura el proyecto:

   | Campo | Valor |
   |-------|-------|
   | **Project Name** | `nlp-analysis-frontend` |
   | **Framework Preset** | `Create React App` |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `build` |
   | **Install Command** | `npm install --legacy-peer-deps` |

4. **Agregar Variables de Entorno**:

   Haz clic en **"Environment Variables"** y agrega:

   ```bash
   REACT_APP_API_BASE_URL=https://nlp-analysis-backend.onrender.com/api/v1
   REACT_APP_WS_BASE_URL=wss://nlp-analysis-websocket.onrender.com/ws
   REACT_APP_ENV=production
   REACT_APP_ENABLE_ANALYTICS=false
   ```

   **IMPORTANTE**: Reemplaza `nlp-analysis-backend` y `nlp-analysis-websocket` con los nombres exactos de tus servicios en Render.

5. Haz clic en **"Deploy"**

### Paso 3: Configurar Dominio (Opcional)

Vercel te asigna automáticamente un dominio tipo:
- `https://nlp-analysis-frontend.vercel.app`

Si quieres un dominio personalizado:
1. Ve a **"Settings"** → **"Domains"**
2. Agrega tu dominio personalizado
3. Sigue las instrucciones de configuración DNS

---

## Configuración de Variables de Entorno

### Variables del Backend (Render)

Actualiza `CORS_ALLOWED_ORIGINS` en Render con tu URL de Vercel:

1. Ve a tu servicio backend en Render
2. Haz clic en **"Environment"** (menú izquierdo)
3. Edita `CORS_ALLOWED_ORIGINS`:

```bash
CORS_ALLOWED_ORIGINS=https://nlp-analysis-frontend.vercel.app
```

4. Edita `CSRF_TRUSTED_ORIGINS`:

```bash
CSRF_TRUSTED_ORIGINS=https://nlp-analysis-frontend.vercel.app
```

5. Haz clic en **"Save Changes"**

El servicio se re-desplegará automáticamente.

---

## Verificación del Despliegue

### Backend

1. Verifica que el backend esté corriendo:
   - Abre `https://nlp-analysis-backend.onrender.com/api/v1/`
   - Deberías ver la API root de Django REST Framework

2. Verifica el admin:
   - Abre `https://nlp-analysis-backend.onrender.com/admin/`
   - Inicia sesión con el superusuario creado

3. Verifica WebSocket:
   - El servicio WebSocket debería estar en `https://nlp-analysis-websocket.onrender.com`

### Frontend

1. Abre tu aplicación en Vercel:
   - `https://nlp-analysis-frontend.vercel.app`

2. Verifica la consola del navegador (F12):
   - No deberían aparecer errores de CORS
   - Las peticiones a la API deberían ser exitosas

3. Prueba la funcionalidad:
   - Navegación entre páginas
   - Conexión con la API
   - WebSocket (si aplica)

---

## Despliegue Automático

### Cómo funciona

Tanto Render como Vercel se despliegan **automáticamente** cuando haces `git push` a la rama `main`:

```bash
# Hacer cambios en el código
git add .
git commit -m "Mejora en la interfaz de usuario"
git push origin main
```

**Resultado**:
- ✅ Vercel detecta el push → despliega el frontend automáticamente (~2 min)
- ✅ Render detecta el push → despliega el backend automáticamente (~5 min)

### Configurar ramas específicas

**En Render**:
1. Ve a tu servicio → **"Settings"** → **"Build & Deploy"**
2. En **"Branch"**, puedes cambiar de `main` a otra rama (ej: `production`)

**En Vercel**:
1. Ve a **"Settings"** → **"Git"**
2. En **"Production Branch"**, cambia a la rama deseada

### Desactivar auto-deploy

Si quieres desplegar manualmente:

**En Render**:
1. **"Settings"** → **"Build & Deploy"**
2. Desactiva **"Auto-Deploy"**
3. Para desplegar manualmente: **"Manual Deploy"** → **"Deploy latest commit"**

**En Vercel**:
1. **"Settings"** → **"Git"**
2. No hay opción para desactivar (siempre auto-despliega)
3. Alternativa: usa ramas separadas y haz merge manual

---

## Configuración Avanzada con render.yaml

Para automatizar completamente el despliegue en Render, crea este archivo:

### Archivo: `render.yaml`

```yaml
# ============================================================================
# Render Blueprint - Infrastructure as Code
# ============================================================================
# Este archivo define toda tu infraestructura en Render
# Render detecta automáticamente este archivo y crea los servicios

databases:
  - name: nlp-analysis-db
    databaseName: analisis_transformacion_digital
    user: analisis_user
    region: oregon
    plan: free
    ipAllowList: []

services:
  # Backend API (Django REST Framework)
  - type: web
    name: nlp-analysis-backend
    runtime: python
    region: oregon
    plan: free
    branch: main
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn config.wsgi:application --config gunicorn.conf.py
    healthCheckPath: /api/v1/
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: config.settings.production
      - key: DJANGO_SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: False
      - key: DATABASE_URL
        fromDatabase:
          name: nlp-analysis-db
          property: connectionString
      - key: DB_ENGINE
        value: postgresql
      - key: REDIS_URL
        sync: false  # Se configurará manualmente
      - key: CORS_ALLOWED_ORIGINS
        sync: false  # Se configurará manualmente con URL de Vercel
      - key: CSRF_TRUSTED_ORIGINS
        sync: false

  # WebSocket Service (Django Channels)
  - type: web
    name: nlp-analysis-websocket
    runtime: python
    region: oregon
    plan: free
    branch: main
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: daphne -b 0.0.0.0 -p $PORT config.asgi:application
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: config.settings.production
      - key: DJANGO_SECRET_KEY
        sync: false  # Compartir con backend
      - key: DATABASE_URL
        fromDatabase:
          name: nlp-analysis-db
          property: connectionString
      - key: REDIS_URL
        sync: false
```

**Cómo usarlo**:

1. Guarda este archivo como `render.yaml` en la raíz de tu repositorio
2. Haz commit y push:
   ```bash
   git add render.yaml
   git commit -m "Add Render infrastructure as code"
   git push origin main
   ```
3. Ve a Render → **"Blueprints"** → **"New Blueprint Instance"**
4. Conecta tu repositorio
5. Render creará automáticamente todos los servicios definidos

---

## Actualizar Configuración de PostgreSQL

### Archivo: `backend/config/settings/production.py`

Actualiza la sección de base de datos para soportar PostgreSQL:

```python
# Database Configuration - PostgreSQL
import dj_database_url

# Render proporciona DATABASE_URL automáticamente
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
        ssl_require=True
    )
}

# Alternativa manual (si no usas DATABASE_URL)
if not os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'analisis_transformacion_digital'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'CONN_MAX_AGE': 600,
            'OPTIONS': {
                'sslmode': 'require',
            }
        }
    }
```

### Archivo: `backend/requirements.txt`

Agrega el driver de PostgreSQL:

```txt
# Agregar esta línea
psycopg2-binary==2.9.9
dj-database-url==2.1.0
```

---

## Troubleshooting

### Error: "Application failed to start"

**Render Backend**:
1. Ve a **"Logs"** en el servicio
2. Busca el error específico
3. Errores comunes:
   - `ModuleNotFoundError`: Falta dependencia en `requirements.txt`
   - `ImproperlyConfigured`: Variable de entorno faltante
   - `OperationalError`: Error de conexión a base de datos

**Solución**:
- Verifica que todas las variables de entorno estén configuradas
- Verifica `requirements.txt` esté completo
- Verifica que `DJANGO_SETTINGS_MODULE=config.settings.production`

### Error: CORS Policy

**Síntoma**: En la consola del navegador:
```
Access to XMLHttpRequest at 'https://...onrender.com/api/v1/'
from origin 'https://...vercel.app' has been blocked by CORS policy
```

**Solución**:
1. Ve a Render → Backend → **"Environment"**
2. Verifica que `CORS_ALLOWED_ORIGINS` incluya tu URL de Vercel EXACTA
3. NO incluyas trailing slash: ❌ `https://app.vercel.app/` ✅ `https://app.vercel.app`
4. Guarda y espera el re-deploy (~2 min)

### Error: WebSocket Connection Failed

**Síntoma**: WebSocket no se conecta

**Solución**:
1. Verifica que el servicio `nlp-analysis-websocket` esté corriendo
2. Verifica que la URL use `wss://` (no `ws://`)
3. Verifica que Redis esté configurado correctamente
4. Verifica logs del servicio WebSocket en Render

### Error: Static Files Not Loading

**Síntoma**: CSS/JS no cargan, errores 404

**Backend Render**:
1. Ejecuta en Render Shell:
   ```bash
   python manage.py collectstatic --noinput
   ```
2. Verifica que `STATIC_ROOT` esté configurado en settings
3. Considera usar S3/CloudFront para archivos estáticos

**Frontend Vercel**:
- Vercel sirve automáticamente archivos estáticos
- Si hay error, revisa el **Build Log** en Vercel

### Error: Database Connection

**Síntoma**: `OperationalError: could not connect to server`

**Solución**:
1. Verifica que `DATABASE_URL` esté configurada
2. Usa la **Internal Database URL** (más rápida)
3. Verifica que backend y DB estén en la misma región
4. Verifica que el plan de base de datos esté activo

### Performance: Slow Response

**Plan Free de Render**:
- Se suspende después de 15 min de inactividad
- Primer request tarda ~30 segundos (cold start)
- Requests subsecuentes son normales

**Solución**:
- Actualizar a plan Starter ($7/mes) - siempre activo
- Usar un cron job para hacer ping cada 10 min
- Aceptar el cold start en plan free

---

## Comandos Útiles

### Render Shell

Accede a la terminal de tu servicio:

```bash
# Migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Ver configuración
python manage.py diffsettings

# Colectar archivos estáticos
python manage.py collectstatic --noinput

# Crear tabla de caché (si usas DB cache)
python manage.py createcachetable

# Shell interactivo
python manage.py shell
```

### Logs en Tiempo Real

**Render**:
- Ve a tu servicio → **"Logs"**
- Logs en tiempo real automáticamente

**Vercel**:
- Ve a tu proyecto → **"Deployments"** → Selecciona deployment → **"View Function Logs"**

---

## Monitoreo

### Render

- **Metrics**: CPU, memoria, ancho de banda (dashboard automático)
- **Logs**: Últimas 7 días retenidos (plan free)
- **Health Checks**: Configurados automáticamente en `/api/v1/`

### Vercel

- **Analytics**: Visitas, performance (activar en Settings)
- **Speed Insights**: Métricas de rendimiento
- **Logs**: Logs de función serverless

### Configurar Sentry (Opcional)

Para tracking de errores en producción:

1. Crea cuenta en [sentry.io](https://sentry.io)
2. Crea proyecto Django
3. Copia DSN
4. Agrega a variables de entorno en Render:
   ```
   SENTRY_DSN=https://xxx@sentry.io/xxx
   ```

---

## Checklist de Despliegue

- [ ] Repositorio en GitHub con código actualizado
- [ ] Cuenta de Render creada y conectada a GitHub
- [ ] Base de datos PostgreSQL creada en Render
- [ ] Servicio backend desplegado en Render
- [ ] Servicio WebSocket desplegado en Render (opcional)
- [ ] Redis configurado (Redis Cloud o alternativa)
- [ ] Todas las variables de entorno configuradas en Render
- [ ] Migraciones ejecutadas en Render Shell
- [ ] Cuenta de Vercel creada y conectada a GitHub
- [ ] Frontend desplegado en Vercel
- [ ] Variables de entorno configuradas en Vercel
- [ ] CORS configurado correctamente en backend
- [ ] Despliegue automático funcionando (push → deploy)
- [ ] API accesible desde frontend
- [ ] WebSocket funcionando (si aplica)
- [ ] Superusuario creado para Django admin

---

## Costos

### Plan Free (Recomendado para MVP)

**Render**:
- PostgreSQL: **Gratis** (1 GB storage, suspende después de 90 días de inactividad)
- Web Services (2): **Gratis** (750 horas/mes, suspende después de 15 min de inactividad)
- **Limitaciones**: Cold starts, sin custom domains con SSL

**Vercel**:
- Hobby Plan: **Gratis**
- 100 GB bandwidth/mes
- Dominios personalizados con SSL incluidos

**Redis Cloud**:
- Free Plan: **Gratis** (30 MB storage)

**TOTAL: $0/mes** ✅

### Plan Paid (Producción)

**Render**:
- PostgreSQL Starter: **$7/mes** (10 GB storage, siempre activo)
- Web Services (2): **$14/mes** ($7 c/u, siempre activos)

**Vercel**:
- Pro Plan: **$20/mes** (analytics, más bandwidth)

**Redis Cloud**:
- Essential Plan: **$5/mes** (250 MB)

**TOTAL: ~$46/mes**

---

## Próximos Pasos

1. **Monitoreo**: Configurar Sentry para tracking de errores
2. **CDN**: Configurar CloudFront o Vercel Edge para assets
3. **CI/CD**: GitHub Actions para tests antes de deploy
4. **Backups**: Configurar backups automáticos de PostgreSQL
5. **Custom Domain**: Configurar dominio personalizado
6. **SSL**: Render y Vercel incluyen SSL automático

---

## Soporte

**Documentación Oficial**:
- Render: https://render.com/docs
- Vercel: https://vercel.com/docs
- PostgreSQL en Render: https://render.com/docs/databases

**Comunidad**:
- Render Discord: https://render.com/discord
- Vercel Discord: https://vercel.com/discord

---

¡Felicidades! 🎉 Tu aplicación está desplegada en producción con despliegue automático desde GitHub.

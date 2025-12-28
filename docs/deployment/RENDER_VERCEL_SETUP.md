# Configuración Completa - Render + Vercel + PostgreSQL

Este documento resume todos los archivos creados y configuraciones necesarias para desplegar tu aplicación en **Render** (backend con PostgreSQL) y **Vercel** (frontend) con despliegue automático desde GitHub.

---

## 📦 Archivos Creados

### 1. `render.yaml` (Raíz del proyecto)
**Propósito**: Infraestructura como código para Render

**Qué hace**:
- Define automáticamente la base de datos PostgreSQL
- Configura el servicio backend Django
- Configura el servicio WebSocket (Django Channels)
- Establece variables de entorno predeterminadas

**Uso**: Render detecta este archivo automáticamente al conectar el repositorio.

### 2. `DEPLOY_RENDER_VERCEL.md` (Raíz del proyecto)
**Propósito**: Guía paso a paso completa para el despliegue

**Incluye**:
- Prerrequisitos y preparación del repositorio
- Configuración de PostgreSQL en Render
- Configuración del backend en Render
- Configuración del frontend en Vercel
- Todas las variables de entorno necesarias
- Verificación del despliegue
- Troubleshooting completo
- Comandos útiles

### 3. `frontend/vercel.json`
**Propósito**: Configuración optimizada para Vercel

**Qué hace**:
- Configura routing para SPA React
- Headers de seguridad (X-Frame-Options, CSP, etc.)
- Caché agresivo para assets estáticos
- Comando de instalación con `--legacy-peer-deps`

### 4. Actualización: `backend/config/settings/production.py`
**Cambios**:
- ✅ Soporte para PostgreSQL (motor principal)
- ✅ Soporte para `DATABASE_URL` (Render lo provee automáticamente)
- ✅ Fallback a configuración manual PostgreSQL
- ✅ Soporte legacy para MySQL (Docker Compose)

**Configuración flexible**:
```python
# Opción 1: DATABASE_URL (Render, Heroku)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Opción 2: Manual PostgreSQL
DB_ENGINE=postgresql
DB_NAME=analisis_transformacion_digital
DB_USER=postgres
DB_PASSWORD=...

# Opción 3: MySQL legacy
DB_ENGINE=mysql
# ...
```

### 5. Actualización: `backend/requirements.txt`
**Agregados**:
```txt
psycopg2-binary==2.9.9      # PostgreSQL adapter
dj-database-url==2.1.0      # Database URL parsing
```

**Se mantiene**:
```txt
mysqlclient==2.2.1          # MySQL (Docker Compose legacy)
```

### 6. Actualización: `backend/.env.example`
**Cambios**:
- Documentación de `DATABASE_URL` (opción recomendada)
- Configuración manual PostgreSQL
- MySQL como opción comentada (legacy)

---

## 🚀 Flujo de Despliegue Automático

### Cuando haces `git push origin main`:

1. **GitHub** recibe el push
2. **Vercel** detecta cambios → despliega frontend (~2 min)
   - Ejecuta `npm install --legacy-peer-deps`
   - Ejecuta `npm run build`
   - Despliega en CDN global
3. **Render** detecta cambios → despliega backend (~5 min)
   - Ejecuta `pip install -r requirements.txt`
   - Ejecuta migraciones automáticamente
   - Ejecuta `collectstatic`
   - Inicia Gunicorn
4. **Render** despliega WebSocket si está configurado

---

## 🔧 Variables de Entorno por Servicio

### Backend (Render)

```bash
# Django Core
DJANGO_SECRET_KEY=<genera-con-get_random_secret_key>
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_ALLOWED_HOSTS=nlp-analysis-backend.onrender.com
DEBUG=False

# Database (Render lo provee automáticamente)
DATABASE_URL=postgresql://user:pass@dpg-xxx.oregon-postgres.render.com/dbname

# Redis (Redis Cloud gratis)
REDIS_URL=redis://default:password@redis-xxxxx.redislabs.com:12345

# CORS (URL de tu Vercel)
CORS_ALLOWED_ORIGINS=https://nlp-analysis-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://nlp-analysis-frontend.vercel.app

# Email (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-app-password
DEFAULT_FROM_EMAIL=tu-email@gmail.com

# Sentry (opcional)
SENTRY_DSN=
```

### Frontend (Vercel)

```bash
REACT_APP_API_BASE_URL=https://nlp-analysis-backend.onrender.com/api/v1
REACT_APP_WS_BASE_URL=wss://nlp-analysis-websocket.onrender.com/ws
REACT_APP_ENV=production
REACT_APP_ENABLE_ANALYTICS=false
```

---

## 📋 Checklist de Despliegue

### Preparación (Local)
- [ ] Código funcional en local
- [ ] Todos los tests pasando
- [ ] Frontend compila sin errores (`npm run build`)
- [ ] Backend corre sin errores (`python manage.py check`)

### GitHub
- [ ] Repositorio creado en GitHub
- [ ] Código pusheado a rama `main`
- [ ] `.gitignore` incluye `.env`, `node_modules/`, `__pycache__/`

### Render
- [ ] Cuenta creada y conectada a GitHub
- [ ] Base de datos PostgreSQL creada
- [ ] Credenciales de DB guardadas (DATABASE_URL)
- [ ] Servicio backend creado desde repositorio
- [ ] Variables de entorno configuradas en backend
- [ ] Servicio WebSocket creado (opcional)
- [ ] Primer deploy exitoso
- [ ] Migraciones ejecutadas: `python manage.py migrate`
- [ ] Superusuario creado: `python manage.py createsuperuser`
- [ ] API accesible: `https://tu-backend.onrender.com/api/v1/`

### Redis
- [ ] Redis Cloud creado (cuenta gratis)
- [ ] URL de Redis obtenida
- [ ] `REDIS_URL` configurada en Render

### Vercel
- [ ] Cuenta creada y conectada a GitHub
- [ ] Proyecto importado desde GitHub
- [ ] Root directory configurado: `frontend`
- [ ] Variables de entorno configuradas
- [ ] Primer deploy exitoso
- [ ] Aplicación accesible: `https://tu-app.vercel.app`

### Integración
- [ ] `CORS_ALLOWED_ORIGINS` en Render incluye URL de Vercel
- [ ] `CSRF_TRUSTED_ORIGINS` en Render incluye URL de Vercel
- [ ] Frontend puede conectarse al backend (sin errores CORS)
- [ ] WebSocket funciona (si aplica)

### Post-Deploy
- [ ] Crear contenido de prueba en Django admin
- [ ] Probar flujo completo de la aplicación
- [ ] Verificar logs en Render (sin errores)
- [ ] Verificar logs en Vercel (sin errores)

---

## 🔑 Comandos Importantes

### Generar Django Secret Key

```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Render Shell (Backend)

```bash
# Conectarse al shell del servicio
# (hacer clic en "Shell" en el dashboard de Render)

# Migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Colectar archivos estáticos
python manage.py collectstatic --noinput

# Crear tabla de caché (si usas DB cache en vez de Redis)
python manage.py createcachetable

# Ver configuración
python manage.py diffsettings

# Shell interactivo
python manage.py shell
```

### Despliegue Manual (si auto-deploy está desactivado)

**Render**:
1. Ve al servicio → "Manual Deploy"
2. Selecciona "Deploy latest commit"
3. Espera ~5 minutos

**Vercel**:
- Siempre auto-despliega (no se puede desactivar)
- Para prevenir deploy: usa ramas separadas

---

## 🐛 Troubleshooting Rápido

### Error: "Application failed to start" (Render)

**Solución**:
1. Ve a "Logs" en Render
2. Busca el error específico
3. Verifica variables de entorno
4. Verifica `requirements.txt` completo
5. Verifica `DJANGO_SETTINGS_MODULE=config.settings.production`

### Error: CORS Policy (Frontend)

**Solución**:
1. Verifica `CORS_ALLOWED_ORIGINS` en Render
2. NO uses trailing slash: ✅ `https://app.vercel.app` ❌ `https://app.vercel.app/`
3. Espera 2 min después de guardar (Render re-deploya automáticamente)

### Error: Database Connection (Backend)

**Solución**:
1. Verifica que `DATABASE_URL` esté configurada
2. Usa la **Internal Database URL** de Render (más rápida)
3. Verifica que backend y DB estén en la misma región

### Error: Cold Start Lento (Render Free Plan)

**Comportamiento Normal**:
- Render free plan suspende servicios tras 15 min de inactividad
- Primer request tarda ~30 segundos
- Requests subsecuentes son normales

**Solución**:
- Actualizar a plan Starter ($7/mes) - siempre activo
- Usar cron job para ping cada 10 min
- Aceptar el cold start en plan free

### Error: WebSocket no conecta

**Solución**:
1. Verifica servicio WebSocket corriendo en Render
2. Usa `wss://` (no `ws://`)
3. Verifica `REDIS_URL` configurada
4. Revisa logs del servicio WebSocket

---

## 💰 Costos Estimados

### Plan Free (MVP)

| Servicio | Plan | Costo |
|----------|------|-------|
| Render PostgreSQL | Free | $0 |
| Render Backend | Free (750 hrs/mes) | $0 |
| Render WebSocket | Free (750 hrs/mes) | $0 |
| Redis Cloud | Free (30 MB) | $0 |
| Vercel | Hobby | $0 |
| **TOTAL** | | **$0/mes** |

**Limitaciones Free**:
- Render: suspende tras 15 min inactividad (cold starts ~30 seg)
- PostgreSQL: suspende tras 90 días de inactividad
- Redis Cloud: 30 MB storage
- Vercel: 100 GB bandwidth/mes

### Plan Paid (Producción)

| Servicio | Plan | Costo |
|----------|------|-------|
| Render PostgreSQL | Starter (10 GB) | $7/mes |
| Render Backend | Starter (siempre activo) | $7/mes |
| Render WebSocket | Starter (siempre activo) | $7/mes |
| Redis Cloud | Essential (250 MB) | $5/mes |
| Vercel | Pro (analytics, más bandwidth) | $20/mes |
| **TOTAL** | | **$46/mes** |

---

## 🔗 URLs de Servicios

### Render
- Dashboard: https://dashboard.render.com
- Docs: https://render.com/docs
- PostgreSQL Docs: https://render.com/docs/databases
- Discord: https://render.com/discord

### Vercel
- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord

### Redis Cloud
- Dashboard: https://app.redislabs.com/
- Docs: https://docs.redis.com/latest/rc/

### Sentry (opcional)
- Dashboard: https://sentry.io/
- Docs: https://docs.sentry.io/platforms/python/guides/django/

---

## 📚 Próximos Pasos

Después del despliegue inicial:

1. **Monitoreo**:
   - Configurar Sentry para tracking de errores
   - Revisar Render Metrics (CPU, memoria)
   - Configurar alertas en Render

2. **Performance**:
   - Configurar CDN (CloudFront o Vercel Edge)
   - Optimizar queries Django (select_related, prefetch_related)
   - Implementar caché más agresivo

3. **CI/CD**:
   - GitHub Actions para tests automáticos antes de deploy
   - Pre-commit hooks (black, flake8, prettier)
   - Deploy previews en Vercel (automático para PRs)

4. **Backups**:
   - Configurar backups automáticos de PostgreSQL en Render
   - Script de backup manual (`pg_dump`)
   - Restauración de emergencia documentada

5. **Dominio Personalizado**:
   - Comprar dominio (ej: namecheap.com)
   - Configurar DNS en Render
   - Configurar DNS en Vercel
   - SSL automático (Render y Vercel lo proveen gratis)

6. **Seguridad**:
   - Rotar `DJANGO_SECRET_KEY` regularmente
   - Revisar logs de acceso
   - Rate limiting en API (django-ratelimit)
   - 2FA para cuentas admin

---

## ✅ Resumen

Tu aplicación está ahora configurada para:

- ✅ **Backend Django** desplegado en Render con PostgreSQL
- ✅ **Frontend React** desplegado en Vercel con CDN global
- ✅ **Despliegue automático** en cada `git push` a main
- ✅ **HTTPS** automático en ambos servicios
- ✅ **Escalable** (fácil upgrade a planes paid)
- ✅ **Sin costo** en plan free (ideal para MVP/demos)

**URLs finales** (ejemplos):
- Frontend: `https://nlp-analysis-frontend.vercel.app`
- Backend API: `https://nlp-analysis-backend.onrender.com/api/v1/`
- Admin Django: `https://nlp-analysis-backend.onrender.com/admin/`
- WebSocket: `wss://nlp-analysis-websocket.onrender.com/ws/`

¡Felicidades! 🎉 Tu aplicación está lista para producción.

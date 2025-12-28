# Quick Deploy - Render + Vercel (Cheat Sheet)

Guía ultra-rápida para desplegar en 30 minutos.

---

## 🚀 En 5 Pasos

### 1. Push a GitHub

```bash
git add .
git commit -m "Ready for production"
git push origin main
```

### 2. Render - Base de Datos

1. https://dashboard.render.com → "New +" → "PostgreSQL"
2. Name: `nlp-analysis-db`
3. Plan: **Free**
4. **Copia el Internal Database URL** (lo necesitarás)

### 3. Render - Backend

1. "New +" → "Web Service"
2. Conecta tu repositorio de GitHub
3. Configuración:
   - Name: `nlp-analysis-backend`
   - Root Directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `gunicorn config.wsgi:application --config gunicorn.conf.py`
4. Variables de entorno (pega esto):

```bash
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=<genera-uno-nuevo>
DJANGO_ALLOWED_HOSTS=nlp-analysis-backend.onrender.com
DEBUG=False
DATABASE_URL=<pega-el-internal-url-de-paso-2>
REDIS_URL=<crea-redis-cloud-gratis>
CORS_ALLOWED_ORIGINS=https://tu-app.vercel.app
CSRF_TRUSTED_ORIGINS=https://tu-app.vercel.app
```

5. Deploy → Espera 5 min

### 4. Render - Migraciones

1. Ve al servicio → "Shell" (pestaña superior)
2. Ejecuta:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

### 5. Vercel - Frontend

1. https://vercel.com/new
2. Importa repositorio de GitHub
3. Configuración:
   - Root Directory: `frontend`
   - Framework: Create React App
   - Install: `npm install --legacy-peer-deps`
4. Variables de entorno:

```bash
REACT_APP_API_BASE_URL=https://nlp-analysis-backend.onrender.com/api/v1
REACT_APP_WS_BASE_URL=wss://nlp-analysis-websocket.onrender.com/ws
REACT_APP_ENV=production
```

5. Deploy → Espera 2 min

---

## 🔑 Comandos Esenciales

### Generar Secret Key

```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Redis Cloud Gratis

1. https://redis.com/try-free/
2. Crear cuenta → Crear database
3. Copiar URL: `redis://default:password@redis-xxxxx.redislabs.com:12345`

---

## ✅ Verificación

- [ ] Backend: `https://tu-backend.onrender.com/api/v1/` muestra API root
- [ ] Admin: `https://tu-backend.onrender.com/admin/` funciona
- [ ] Frontend: `https://tu-app.vercel.app` carga
- [ ] Sin errores CORS en consola del navegador (F12)
- [ ] Backend y frontend se comunican correctamente

---

## 🐛 Fix Rápido - Error CORS

En Render → Backend → Environment:

```bash
# Asegúrate de que coincida EXACTAMENTE con tu URL de Vercel
CORS_ALLOWED_ORIGINS=https://tu-app-exacta.vercel.app
CSRF_TRUSTED_ORIGINS=https://tu-app-exacta.vercel.app
```

NO uses trailing slash: ❌ `.vercel.app/` ✅ `.vercel.app`

---

## 🔄 Auto-Deploy Configurado

Cada vez que hagas:

```bash
git push origin main
```

Se despliega automáticamente:
- ✅ Vercel (frontend) - ~2 min
- ✅ Render (backend) - ~5 min

---

## 📚 Documentación Completa

- **Guía Detallada**: `DEPLOY_RENDER_VERCEL.md`
- **Setup Completo**: `RENDER_VERCEL_SETUP.md`
- **Troubleshooting**: Ver sección en `DEPLOY_RENDER_VERCEL.md`

---

## 💰 Costo

**Plan Free**: $0/mes
- PostgreSQL: Free (1 GB)
- Backend: Free (suspende tras 15 min inactividad)
- Vercel: Free (100 GB bandwidth)
- Redis Cloud: Free (30 MB)

**Limitación**: Cold start de ~30 seg en primer request (normal en plan free)

---

## 🎉 ¡Listo!

Tu aplicación está en producción:
- Frontend: `https://tu-app.vercel.app`
- API: `https://tu-backend.onrender.com/api/v1/`
- Admin: `https://tu-backend.onrender.com/admin/`

# Configuración de Variables de Entorno en Hugging Face Spaces

## Variables que debes configurar

Ve a tu Space en Hugging Face → Settings → Variables and secrets

### 1. Google OAuth 2.0 Credentials

**GOOGLE_OAUTH_CLIENT_ID**
```
583859169478-3olcpftfk513ulp4dqgh9ut0pnohme57.apps.googleusercontent.com
```

**GOOGLE_OAUTH_CLIENT_SECRET**
```
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
```

**GOOGLE_OAUTH_REDIRECT_URI**
```
https://analisis-de-texto-ies.vercel.app/oauth/callback/google-drive
```
✅ **IMPORTANTE:** Apunta al FRONTEND (Vercel), no al backend

**GOOGLE_OAUTH_ENCRYPTION_KEY**
```
YAbTGRMRYdIXkP8Uj-ajJKTPtRCwFo04rvO2H0qjXY8=
```

### 2. Django Settings (si no las tienes)

**SECRET_KEY**
```
django-insecure-change-this-in-production-2024
```
⚠️ Genera una clave más segura para producción

**DEBUG**
```
False
```

### 3. Base de Datos (si usas MySQL/PostgreSQL)

**DB_NAME**
```
analisis_transformacion_digital
```

**DB_USER**
```
analisis_user
```

**DB_PASSWORD**
```
tu_password_seguro
```

**DB_HOST**
```
tu_db_host.com
```

**DB_PORT**
```
3306
```

## Actualizar Google Cloud Console

**IMPORTANTE:** Debes agregar la URL de redirección en Google Cloud Console:

1. Ve a: https://console.cloud.google.com/
2. Selecciona tu proyecto
3. APIs y servicios → Credenciales
4. Click en tu "ID de cliente de OAuth 2.0"
5. En "URIs de redirección autorizadas", agrega:
   ```
   https://analisis-de-texto-ies.vercel.app/oauth/callback/google-drive
   ```
6. En "Orígenes de JavaScript autorizados", agrega AMBOS:
   ```
   https://analisis-de-texto-ies.vercel.app
   https://hugo0507-analisis-ies-backend.hf.space
   ```
7. Click en "GUARDAR"

✅ **Redirect URI:** Frontend (Vercel) - El popup redirige aquí
✅ **Orígenes permitidos:** Frontend (Vercel) + Backend (Hugging Face)

## Verificación

Después de configurar las variables:

1. **Redesplegar el Space** (puede tomar 5-10 minutos)

2. **Probar el login:**
   - Ve a: `https://hugo0507-analisis-ies-backend.hf.space/admin`
   - Usuario: `testuser`
   - Password: `Test2024!`

3. **Probar OAuth Google Drive:**
   - Ve a Datasets → Nuevo
   - Selecciona "Google Drive"
   - Click en "Conectar Google Drive"
   - Debería abrir popup de Google

## Si algo falla

### Error: "redirect_uri_mismatch"

**Causa:** La URL en Google Cloud Console no coincide exactamente

**Solución:**
1. Verifica que la URL sea EXACTA (sin espacios, sin barra final)
2. Espera 5-10 minutos después de guardar cambios en Google Cloud
3. Limpia caché del navegador

### Error: "Popup blocked"

**Causa:** Navegador bloqueó el popup

**Solución:**
- Habilita popups para tu sitio Hugging Face
- Intenta en modo incógnito

### Error: "Invalid state parameter"

**Causa:** Problema con sesiones en Hugging Face

**Solución:**
- Verifica que `SECRET_KEY` esté configurada
- Asegúrate de que las cookies estén habilitadas

## Comandos para ejecutar en Hugging Face

Si tienes acceso SSH o terminal en tu Space:

```bash
# 1. Aplicar migraciones
python manage.py migrate

# 2. Asegurar usuario de prueba
python manage.py ensure_test_user

# 3. Verificar variables
python manage.py shell
>>> from django.conf import settings
>>> print(settings.GOOGLE_OAUTH_CLIENT_ID)
>>> print(settings.GOOGLE_OAUTH_REDIRECT_URI)
```

## Resumen de URLs

**Frontend (Vercel):**
- Producción: `https://analisis-de-texto-ies.vercel.app`
- OAuth Callback: `https://analisis-de-texto-ies.vercel.app/oauth/callback/google-drive` ✅

**Backend (Hugging Face):**
- Producción: `https://hugo0507-analisis-ies-backend.hf.space`
- API: `https://hugo0507-analisis-ies-backend.hf.space/api/v1/`

**Flujo OAuth:**
1. Frontend abre popup → Google autoriza → Google redirige a Frontend
2. Frontend recibe code → Frontend envía code al Backend
3. Backend intercambia code por tokens → Guarda en base de datos

---

## Checklist Final

- [ ] Variables configuradas en Hugging Face
- [ ] URLs agregadas en Google Cloud Console
- [ ] Space redespllegado
- [ ] Login con testuser funciona
- [ ] Popup de Google Drive se abre
- [ ] Puede autorizar y conectar
- [ ] Puede importar carpetas desde Drive

---

**Tu Space configurado:**

Tu Space repository:
```
https://huggingface.co/spaces/Hugo0507/analisis-ies-backend
```

Tu dominio público:
```
https://hugo0507-analisis-ies-backend.hf.space
```

✅ Ya configurado con las URLs correctas en este documento.

---

**Última actualización:** 2026-01-01

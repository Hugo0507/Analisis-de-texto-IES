# Checklist de Deployment - OAuth2 Google Drive

Esta guía asegura que todo esté configurado correctamente al desplegar la aplicación.

## Pre-Deployment

### 1. Variables de Entorno Configuradas

Verifica que estas variables estén configuradas en tu plataforma (Render/Hugging Face):

```bash
# Google OAuth 2.0
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_OAUTH_REDIRECT_URI=https://analisis-de-texto-ies.vercel.app/oauth/callback/google-drive
GOOGLE_OAUTH_ENCRYPTION_KEY=xxx  # Generada con Fernet

# Base de datos (si aplica)
DB_NAME=xxx
DB_USER=xxx
DB_PASSWORD=xxx
DB_HOST=xxx
DB_PORT=3306

# Django
SECRET_KEY=xxx
DEBUG=False
```

### 2. Google Cloud Console Configurado

- ✅ Proyecto creado
- ✅ Google Drive API habilitada
- ✅ Pantalla de consentimiento OAuth configurada
- ✅ Credenciales OAuth 2.0 creadas
- ✅ URIs de redirección autorizadas:
  - `https://analisis-de-texto-ies.vercel.app/oauth/callback/google-drive`
- ✅ Orígenes JavaScript autorizados:
  - `https://analisis-de-texto-ies.vercel.app`

## Durante Deployment

### 1. Ejecutar Migraciones

```bash
python manage.py migrate
```

**Esta migración es SEGURA:**
- Solo AGREGA campos al modelo User
- NO elimina datos existentes
- NO elimina usuarios

### 2. Asegurar Usuario de Prueba

**IMPORTANTE:** Ejecuta este comando después de las migraciones:

```bash
python manage.py ensure_test_user
```

Este comando:
- ✅ Crea el usuario `testuser` si no existe
- ✅ Verifica que la contraseña sea `Test2024!`
- ✅ Asegura que sea admin
- ✅ Si el usuario ya existe, solo actualiza la contraseña

**Output esperado:**
```
✅ Test user already exists - password verified/updated
   Username: testuser
   Password: Test2024!
   Email: testuser@example.com
   Role: admin
```

### 3. Colectar Archivos Estáticos (si aplica)

```bash
python manage.py collectstatic --noinput
```

## Post-Deployment

### 1. Verificar Backend

```bash
curl https://tu-backend-url.com/api/v1/oauth/google-drive/status/
```

Debería retornar 401 o 403 (requiere autenticación) - esto es correcto.

### 2. Verificar Frontend

1. Ve a: https://analisis-de-texto-ies.vercel.app/admin
2. Inicia sesión:
   - **Username:** `testuser`
   - **Password:** `Test2024!`
3. Verifica que puedas acceder

### 3. Probar Flujo OAuth

1. Ve a Datasets → Nuevo
2. Selecciona "Google Drive"
3. Click en "Conectar Google Drive"
4. Verifica que:
   - ✅ Se abre popup de Google
   - ✅ Puedes autorizar
   - ✅ Popup se cierra automáticamente
   - ✅ Aparece mensaje "Conectado a Google Drive"
   - ✅ Muestra tu email de Google

### 4. Probar Importación

1. Con Google Drive conectado
2. Pega URL de una carpeta de Drive
3. Click en "Importar desde Drive"
4. Verifica que:
   - ✅ Se crea el dataset
   - ✅ Estado cambia a "processing"
   - ✅ Archivos se descargan en background
   - ✅ Estado cambia a "completed"

## Troubleshooting

### Usuario testuser no existe

**Solución:**
```bash
python manage.py ensure_test_user
```

### No puedo iniciar sesión con testuser

**Posibles causas:**
1. Contraseña incorrecta (debe ser exactamente `Test2024!`)
2. Usuario inactivo

**Solución:**
```bash
python manage.py shell
>>> from apps.users.models import User
>>> user = User.objects.get(username='testuser')
>>> user.set_password('Test2024!')
>>> user.is_active = True
>>> user.role = 'admin'
>>> user.save()
>>> exit()
```

### Error "redirect_uri_mismatch"

**Causa:** URIs no coinciden en Google Cloud Console

**Solución:**
1. Ve a Google Cloud Console
2. Verifica que la URI sea EXACTA:
   - `https://analisis-de-texto-ies.vercel.app/oauth/callback/google-drive`
3. Sin espacios, sin barra final

### Error "Popup blocked"

**Causa:** Navegador bloqueó popup

**Solución:**
- Habilita popups para tu sitio
- Chrome: Ícono en barra de direcciones

### Tokens no se guardan

**Causa:** Clave de encriptación no configurada

**Solución:**
1. Genera clave:
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```
2. Configura `GOOGLE_OAUTH_ENCRYPTION_KEY` en variables de entorno

## Verificación de Seguridad

- ✅ `DEBUG=False` en producción
- ✅ `GOOGLE_OAUTH_CLIENT_SECRET` es privada (no en frontend)
- ✅ Tokens encriptados en base de datos
- ✅ HTTPS habilitado
- ✅ CORS configurado correctamente

## Comandos Útiles

### Ver logs de Django

```bash
tail -f backend/logs/django.log
```

### Ver usuarios en base de datos

```bash
python manage.py shell
>>> from apps.users.models import User
>>> for u in User.objects.all():
...     print(f"{u.username} - {u.email} - Admin: {u.is_admin}")
```

### Crear usuario adicional

```bash
python manage.py createsuperuser
```

### Verificar migraciones pendientes

```bash
python manage.py showmigrations
```

## Rollback (si algo sale mal)

Si necesitas revertir las migraciones de OAuth:

```bash
# Ver estado actual
python manage.py showmigrations users

# Revertir migración OAuth
python manage.py migrate users 0001_initial

# Aplicar de nuevo
python manage.py migrate users
```

**IMPORTANTE:** Esto eliminará los datos de Google Drive conectados (tokens), pero NO eliminará usuarios.

---

## Resumen de Archivos Críticos

**Backend:**
- `backend/apps/users/migrations/0002_add_google_drive_oauth.py` - Migración segura
- `backend/apps/users/management/commands/ensure_test_user.py` - Comando de usuario
- `backend/apps/users/oauth_views.py` - Endpoints OAuth
- `backend/apps/infrastructure/storage/drive_gateway.py` - Drive API

**Frontend:**
- `frontend/src/services/googleDriveService.ts` - Servicio OAuth
- `frontend/src/pages/OAuthCallback.tsx` - Callback popup
- `frontend/src/components/GoogleDriveConnect.tsx` - UI de conexión

---

**Última actualización:** 2026-01-01


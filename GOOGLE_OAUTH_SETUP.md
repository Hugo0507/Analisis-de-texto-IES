# Configuración de Google OAuth 2.0 para Google Drive

Esta guía te ayuda a configurar las credenciales OAuth 2.0 necesarias para que los usuarios puedan conectar sus cuentas de Google Drive.

## Paso 1: Crear Proyecto en Google Cloud Console

1. **Accede a Google Cloud Console:**
   - Ve a https://console.cloud.google.com/
   - Inicia sesión con tu cuenta de Google

2. **Crear nuevo proyecto (o usa uno existente):**
   - Click en el selector de proyectos (parte superior)
   - Click en "NUEVO PROYECTO"
   - Nombre: `analisis-transformacion-digital` (o el que prefieras)
   - Click en "CREAR"
   - Espera a que se cree el proyecto y selecciónalo

## Paso 2: Habilitar Google Drive API

1. **En el menú lateral:**
   - Ve a "APIs y servicios" → "Biblioteca"

2. **Buscar y habilitar Google Drive API:**
   - En el buscador escribe: "Google Drive API"
   - Click en "Google Drive API"
   - Click en "HABILITAR"
   - Espera unos segundos hasta que se habilite

## Paso 3: Configurar Pantalla de Consentimiento OAuth

1. **Ir a pantalla de consentimiento:**
   - Menú lateral: "APIs y servicios" → "Pantalla de consentimiento de OAuth"

2. **Configurar tipo de usuario:**
   - Selecciona **"Externo"** (permite cualquier cuenta de Google)
   - Click en "CREAR"

3. **Información de la aplicación:**
   - **Nombre de la app:** `Análisis Transformación Digital`
   - **Correo electrónico de asistencia:** Tu email
   - **Logo de la app:** (Opcional) Puedes subir un logo si quieres
   - **Dominios de la aplicación:**
     - Dominio de la aplicación: `vercel.app`
     - Página principal de la aplicación: `https://analisis-de-texto-ies.vercel.app`
     - Política de privacidad: `https://analisis-de-texto-ies.vercel.app/privacidad` (opcional)
     - Condiciones del servicio: `https://analisis-de-texto-ies.vercel.app/terminos` (opcional)
   - **Información de contacto del desarrollador:** Tu email
   - Click en "GUARDAR Y CONTINUAR"

4. **Permisos (Scopes):**
   - Click en "AGREGAR O QUITAR PERMISOS"
   - Busca: `https://www.googleapis.com/auth/drive.readonly`
   - Marca la casilla de "Google Drive API - .../auth/drive.readonly"
   - Click en "ACTUALIZAR"
   - Click en "GUARDAR Y CONTINUAR"

5. **Usuarios de prueba (solo si app está en Testing):**
   - Agrega tu email como usuario de prueba
   - Click en "AGREGAR USUARIOS"
   - Ingresa tu email y el de otros usuarios que vayan a probar
   - Click en "GUARDAR Y CONTINUAR"

6. **Resumen:**
   - Revisa la configuración
   - Click en "VOLVER AL PANEL"

## Paso 4: Crear Credenciales OAuth 2.0

1. **Ir a credenciales:**
   - Menú lateral: "APIs y servicios" → "Credenciales"

2. **Crear credenciales:**
   - Click en "+ CREAR CREDENCIALES"
   - Selecciona "ID de cliente de OAuth"

3. **Configurar credencial:**
   - **Tipo de aplicación:** Aplicación web
   - **Nombre:** `OAuth Client - Web App`

4. **Orígenes de JavaScript autorizados:**
   - Click en "+ AGREGAR URI"
   - Desarrollo: `http://localhost:3000`
   - Click en "+ AGREGAR URI"
   - Producción: `https://analisis-de-texto-ies.vercel.app`

5. **URIs de redirección autorizadas:**
   - Click en "+ AGREGAR URI"
   - Desarrollo: `http://localhost:3000/oauth/callback/google-drive`
   - Click en "+ AGREGAR URI"
   - Producción: `https://analisis-de-texto-ies.vercel.app/oauth/callback/google-drive`

6. **Crear:**
   - Click en "CREAR"
   - Se mostrará un modal con tus credenciales

7. **Copiar credenciales:**
   - **ID de cliente:** Copia este valor (ejemplo: `123456-abc.apps.googleusercontent.com`)
   - **Secreto del cliente:** Copia este valor (ejemplo: `GOCSPX-xxxxx`)
   - Click en "ACEPTAR"

## Paso 5: Generar Clave de Encriptación

Necesitas generar una clave Fernet para encriptar los tokens en la base de datos:

**En tu terminal local (Python):**

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Copia el resultado (ejemplo: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=`)

## Paso 6: Configurar Variables de Entorno

### Backend (Django)

Agrega estas variables a tu archivo `.env` o configúralas en tu plataforma de deployment:

```bash
# Google OAuth 2.0
GOOGLE_OAUTH_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-tu-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/oauth/callback/google-drive
GOOGLE_OAUTH_ENCRYPTION_KEY=tu-fernet-key-generada
```

**Para producción (Render/Hugging Face):**
- Cambia `GOOGLE_OAUTH_REDIRECT_URI` a: `https://analisis-de-texto-ies.vercel.app/oauth/callback/google-drive`

### Frontend (React)

El frontend NO necesita CLIENT_SECRET (solo el backend lo usa).

En tu `.env.local` (opcional, ya está configurado por defecto):

```bash
REACT_APP_API_BASE_URL=http://localhost:8000/api/v1
```

## Paso 7: Desplegar y Probar

### En Desarrollo Local:

1. **Backend:**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Probar flujo OAuth:**
   - Ve a http://localhost:3000/admin/configuracion/datasets/nuevo
   - Selecciona "Google Drive"
   - Click en "Conectar Google Drive"
   - Se abrirá popup de Google
   - Autoriza el acceso
   - El popup se cerrará automáticamente
   - Ahora podrás importar desde Drive

### En Producción:

1. **Configurar variables en Render/Hugging Face:**
   - Agrega las 4 variables de entorno (ver Paso 6)
   - Usa la URL de producción en `GOOGLE_OAUTH_REDIRECT_URI`

2. **Redesplegar:**
   - Hacer push a GitHub (ya hecho)
   - Esperar a que se redespliegue automáticamente

3. **Verificar en Vercel:**
   - Ve a https://analisis-de-texto-ies.vercel.app
   - Inicia sesión como admin
   - Ve a Datasets → Nuevo
   - Prueba el flujo de conexión

## Solución de Problemas

### Error: "Popup blocked"
- Habilita popups en tu navegador para el sitio
- Chrome: Ícono en la barra de direcciones → Permitir

### Error: "redirect_uri_mismatch"
- Verifica que las URIs en Google Cloud Console coincidan EXACTAMENTE
- No debe haber espacios ni caracteres extra
- Protocolo correcto (http vs https)

### Error: "access_denied"
- El usuario canceló o rechazó el acceso
- Intentar nuevamente

### Error: "Invalid state parameter"
- Problema de CSRF - refresca la página e intenta de nuevo
- Verifica que las cookies estén habilitadas

### Tokens no se guardan o refrescan:
- Verifica que `GOOGLE_OAUTH_ENCRYPTION_KEY` esté configurada
- Verifica que las migraciones se hayan ejecutado: `python manage.py migrate`

## Verificación Final

Para verificar que todo está configurado correctamente:

1. **Backend:**
   ```bash
   python manage.py shell
   >>> from django.conf import settings
   >>> print(settings.GOOGLE_OAUTH_CLIENT_ID)  # Debe mostrar tu client ID
   >>> print(settings.GOOGLE_OAUTH_CLIENT_SECRET)  # Debe mostrar tu secret
   ```

2. **Frontend:**
   - Abre las DevTools del navegador (F12)
   - Ve a Network tab
   - Intenta conectar con Google Drive
   - Deberías ver requests a `/oauth/google-drive/authorize-url/`

## Seguridad

- ✅ CSRF Protection con state parameter
- ✅ Origin validation en postMessage
- ✅ Tokens encriptados en base de datos con Fernet
- ✅ HTTPS en producción
- ✅ Scope mínimo (drive.readonly)
- ✅ Revocación de tokens al desconectar

## Recursos Adicionales

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [Cryptography Fernet Documentation](https://cryptography.io/en/latest/fernet/)

---

Si necesitas ayuda, revisa los logs del backend:
```bash
# Ver logs en tiempo real
tail -f backend/logs/django.log
```

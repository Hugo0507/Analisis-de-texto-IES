# 🔐 Configuración de Google Drive API

Esta guía te ayudará a configurar el acceso a Google Drive para el sistema de análisis.

## 📋 Requisitos Previos

- Una cuenta de Google
- Acceso a la carpeta de Google Drive con los documentos
- Google Chrome o Firefox (recomendado para autenticación)

## 🚀 Método 1: OAuth 2.0 (Recomendado - Más Fácil)

Este método es ideal para uso personal y no requiere cuenta de servicio.

### Paso 1: Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)

2. Haz clic en el selector de proyectos (parte superior)

3. Haz clic en **"Nuevo Proyecto"**

4. Ingresa:
   - **Nombre del Proyecto**: `Analisis-Transformacion-Digital`
   - **Organización**: Dejar por defecto
   - Haz clic en **"Crear"**

5. Espera a que se cree el proyecto (tarda unos segundos)

### Paso 2: Habilitar Google Drive API

1. En el menú lateral, ve a **"APIs y Servicios"** → **"Biblioteca"**

2. Busca **"Google Drive API"**

3. Haz clic en **"Google Drive API"**

4. Haz clic en **"Habilitar"**

5. Espera a que se habilite (tarda unos segundos)

### Paso 3: Crear Credenciales OAuth 2.0

1. Ve a **"APIs y Servicios"** → **"Credenciales"**

2. Haz clic en **"Crear Credenciales"** → **"ID de cliente de OAuth"**

3. Si te pide configurar la pantalla de consentimiento:
   - Haz clic en **"Configurar pantalla de consentimiento"**
   - Selecciona **"Externo"** (a menos que tengas Google Workspace)
   - Haz clic en **"Crear"**

4. Completa la información básica:
   - **Nombre de la aplicación**: `Analisis Transformacion Digital`
   - **Correo de asistencia del usuario**: Tu correo de Google
   - **Correo del desarrollador**: Tu correo de Google
   - Haz clic en **"Guardar y Continuar"**

5. En **"Alcances"**:
   - Haz clic en **"Agregar o quitar alcances"**
   - Busca `drive.readonly`
   - Marca la casilla de `.../auth/drive.readonly`
   - Haz clic en **"Actualizar"**
   - Haz clic en **"Guardar y Continuar"**

6. En **"Usuarios de prueba"**:
   - Haz clic en **"Agregar usuarios"**
   - Agrega tu correo de Google
   - Haz clic en **"Agregar"**
   - Haz clic en **"Guardar y Continuar"**

7. Revisa el resumen y haz clic en **"Volver al panel"**

8. Ahora crea el ID de cliente:
   - Ve nuevamente a **"Credenciales"**
   - Haz clic en **"Crear Credenciales"** → **"ID de cliente de OAuth"**
   - **Tipo de aplicación**: Selecciona **"Aplicación de escritorio"**
   - **Nombre**: `Cliente Desktop`
   - Haz clic en **"Crear"**

9. Aparecerá un modal con tu ID de cliente:
   - Haz clic en **"Descargar JSON"**
   - Guarda el archivo como `credentials.json`

### Paso 4: Colocar Credenciales en el Proyecto

1. Mueve el archivo `credentials.json` descargado a la carpeta del proyecto:
   ```
   C:\Projects\Tesis\analisis_transformacion_digital\credentials.json
   ```

2. Asegúrate de que el archivo se llame exactamente `credentials.json`

### Paso 5: Primera Autenticación

1. Ejecuta la aplicación:
   ```bash
   streamlit run app.py
   ```

2. Ve a la sección **"🔗 Conexión Google Drive"**

3. Haz clic en **"Conectar a Google Drive"**

4. Se abrirá una ventana del navegador:
   - Selecciona tu cuenta de Google
   - Verás una advertencia "Google hasn't verified this app"
   - Haz clic en **"Advanced"** → **"Go to [App Name] (unsafe)"**
   - Haz clic en **"Allow"** para dar permisos
   - Cierra la ventana del navegador

5. La aplicación ahora está conectada a Google Drive

6. Se creará un archivo `token.json` automáticamente
   - Este archivo guarda tu sesión
   - No lo compartas con nadie
   - Está en el `.gitignore` por seguridad

## 🔧 Método 2: Service Account (Avanzado)

Este método es para uso en servidores o aplicaciones empresariales.

### Paso 1: Crear Service Account

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)

2. Ve a **"IAM y Administración"** → **"Cuentas de Servicio"**

3. Haz clic en **"Crear Cuenta de Servicio"**

4. Completa:
   - **Nombre**: `drive-reader`
   - **Descripción**: `Lee archivos de Google Drive`
   - Haz clic en **"Crear y Continuar"**

5. En **"Función"**:
   - Selecciona **"Visor"** o **"Editor"**
   - Haz clic en **"Continuar"**

6. Haz clic en **"Listo"**

### Paso 2: Crear Clave

1. En la lista de cuentas de servicio, haz clic en la que acabas de crear

2. Ve a la pestaña **"Claves"**

3. Haz clic en **"Agregar Clave"** → **"Crear Clave Nueva"**

4. Selecciona **"JSON"**

5. Haz clic en **"Crear"**

6. Se descargará un archivo JSON

7. Renombra el archivo a `service_account.json`

8. Muévelo a la carpeta del proyecto

### Paso 3: Compartir Carpeta con Service Account

1. Abre el archivo `service_account.json`

2. Busca el campo `"client_email"`, se verá así:
   ```
   "something@project-id.iam.gserviceaccount.com"
   ```

3. Ve a tu carpeta de Google Drive

4. Haz clic derecho → **"Compartir"**

5. Pega el correo del service account

6. Dale permisos de **"Lector"**

7. Haz clic en **"Enviar"**

## 📁 Obtener ID de Carpeta de Drive

1. Abre la carpeta en Google Drive en tu navegador

2. La URL se verá así:
   ```
   https://drive.google.com/drive/folders/1tDUZ4PnQen_lSr6z4ZALji2zdtrJf-sS
   ```

3. El ID es la parte después de `folders/`:
   ```
   1tDUZ4PnQen_lSr6z4ZALji2zdtrJf-sS
   ```

4. Copia este ID, lo necesitarás en la aplicación

## ✅ Verificar Configuración

### Archivo credentials.json debe verse así:

```json
{
  "installed": {
    "client_id": "xxxxxxxx.apps.googleusercontent.com",
    "project_id": "tu-proyecto-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "xxxxxxxxxxxxx",
    "redirect_uris": ["http://localhost"]
  }
}
```

### Estructura de Archivos:

```
analisis_transformacion_digital/
├── credentials.json          ✅ Credenciales OAuth (requerido)
├── token.json               ⚠️  Se crea automáticamente después de autenticar
├── service_account.json     ⚙️  Solo si usas Service Account (opcional)
└── ...
```

## 🔒 Seguridad

### ⚠️ IMPORTANTE - No Compartir

**Nunca compartas estos archivos**:
- `credentials.json`
- `token.json`
- `service_account.json`

Ya están incluidos en `.gitignore` para evitar subirlos a GitHub.

### 🛡️ Permisos Mínimos

La aplicación solo solicita permisos de **lectura** (`drive.readonly`):
- ✅ Puede listar archivos
- ✅ Puede descargar archivos
- ❌ NO puede modificar archivos
- ❌ NO puede eliminar archivos
- ❌ NO puede crear archivos

## 🐛 Solución de Problemas

### Error: "credentials.json not found"

**Solución**:
- Verifica que `credentials.json` esté en la carpeta raíz del proyecto
- Verifica que el nombre sea exactamente `credentials.json` (no `credentials(1).json`)

### Error: "Access denied"

**Solución**:
- Elimina `token.json`
- Vuelve a autenticar
- Asegúrate de dar permisos cuando el navegador lo solicite

### Error: "The user is not authorized"

**Solución**:
- Ve a Google Cloud Console
- En la pantalla de consentimiento, agrega tu correo como "Usuario de prueba"

### Error: "Google hasn't verified this app"

**Solución**:
- Esto es normal para aplicaciones en desarrollo
- Haz clic en "Advanced" → "Go to [App Name] (unsafe)"
- Es seguro porque es tu propia aplicación

### La autenticación no se abre en el navegador

**Solución**:
- Copia la URL que aparece en la terminal
- Pégala manualmente en tu navegador
- Completa la autenticación

## 📞 Ayuda Adicional

Si sigues teniendo problemas:

1. **Revisa los logs** en la terminal donde ejecutaste Streamlit
2. **Verifica los permisos** en Google Cloud Console
3. **Elimina y recrea** las credenciales si es necesario
4. **Consulta la documentación oficial**: [Google Drive API](https://developers.google.com/drive/api/guides/about-sdk)

## 🎉 ¡Listo!

Una vez configurado correctamente:

1. La aplicación podrá acceder a tus archivos de Drive
2. Podrás listar archivos por carpeta
3. Podrás descargar y analizar documentos
4. Todo de forma segura y controlada

---

**Nota**: La primera vez que te autentiques tomará unos segundos. Las veces siguientes será instantáneo gracias al `token.json`.

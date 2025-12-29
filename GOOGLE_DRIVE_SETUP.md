# 🔐 Configuración de Google Drive para Producción

Esta guía te ayudará a configurar Google Drive Service Account para que el backend pueda acceder a tus archivos de Drive sin autenticación interactiva (necesario para Hugging Face Spaces).

## 📋 Prerequisitos

- Cuenta de Google
- Acceso a Google Cloud Console
- Permisos de administrador en la carpeta de Drive que usarás

---

## 🚀 Paso 1: Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)

2. **Crear nuevo proyecto:**
   - Haz clic en el selector de proyectos (arriba a la izquierda)
   - Clic en "Nuevo proyecto"
   - Nombre: `Analisis-IES-Backend` (o el que prefieras)
   - Clic en "Crear"

3. **Espera** a que se cree el proyecto (puede tomar 1-2 minutos)

---

## 🔑 Paso 2: Habilitar Google Drive API

1. En el proyecto recién creado, ve a **APIs y servicios** → **Biblioteca**

2. Busca: `Google Drive API`

3. Haz clic en **Google Drive API**

4. Haz clic en **HABILITAR**

5. Espera a que se active (aprox. 30 segundos)

---

## 👤 Paso 3: Crear Service Account

1. Ve a **APIs y servicios** → **Credenciales**

2. Haz clic en **+ CREAR CREDENCIALES** → **Cuenta de servicio**

3. **Detalles de la cuenta de servicio:**
   - Nombre: `drive-backend-service`
   - ID de cuenta de servicio: (se genera automáticamente)
   - Descripción: `Service account para acceso a Google Drive desde backend`
   - Clic en **CREAR Y CONTINUAR**

4. **Otorgar acceso (opcional):**
   - Puedes saltarte este paso haciendo clic en **CONTINUAR**

5. **Otorgar acceso a usuarios (opcional):**
   - También puedes saltarlo haciendo clic en **LISTO**

---

## 📥 Paso 4: Crear y Descargar Clave JSON

1. En la página de **Credenciales**, busca la Service Account que acabas de crear

2. Haz clic en el **email de la service account** (algo como `drive-backend-service@tu-proyecto.iam.gserviceaccount.com`)

3. Ve a la pestaña **CLAVES**

4. Haz clic en **AGREGAR CLAVE** → **Crear clave nueva**

5. Selecciona formato **JSON**

6. Haz clic en **CREAR**

7. **Se descargará automáticamente un archivo JSON**
   - Guárdalo en un lugar seguro
   - **NUNCA lo subas a git o lo compartas públicamente**
   - Nombre típico: `tu-proyecto-abc123.json`

---

## 📁 Paso 5: Compartir Carpeta de Drive con Service Account

**IMPORTANTE:** La Service Account necesita permisos para acceder a tu carpeta de Drive.

1. **Abre el archivo JSON descargado** y copia el valor del campo `client_email`
   - Ejemplo: `drive-backend-service@tu-proyecto.iam.gserviceaccount.com`

2. **Ve a Google Drive** (drive.google.com)

3. **Navega a la carpeta** que contiene tus documentos PDF académicos

4. **Haz clic derecho en la carpeta** → **Compartir**

5. **Pega el email de la service account** en el campo "Agregar personas y grupos"

6. **Establece permisos:**
   - Selecciona: **Lector** (si solo necesitas leer archivos)
   - O selecciona: **Editor** (si también necesitas subir resultados)

7. **Desmarca** la opción "Notificar a las personas" (no es necesario notificar a una service account)

8. Haz clic en **Compartir**

---

## ⚙️ Paso 6: Configurar Variable de Entorno en Hugging Face Spaces

1. **Abre el archivo JSON descargado** en un editor de texto

2. **Copia TODO el contenido** del archivo (desde `{` hasta `}`)

3. **Ve a tu Space en Hugging Face:**
   - https://huggingface.co/spaces/Hugo0507/analisis-ies-backend

4. **Ve a Settings** (⚙️ arriba a la derecha)

5. **Scroll hasta "Repository secrets"**

6. **Agregar nueva variable:**
   - **Name:** `GOOGLE_SERVICE_ACCOUNT_JSON`
   - **Value:** Pega TODO el contenido del JSON (debe ser una sola línea larga)
   - Clic en **Add secret**

7. **Espera** a que el Space se redespliegue automáticamente (2-3 minutos)

---

## ✅ Paso 7: Verificar que Funciona

1. **Ve a tu frontend desplegado:**
   - https://analisis-de-texto-ies.vercel.app/pipeline

2. **Ve a la página Pipeline**

3. **Ingresa el ID de tu carpeta de Drive:**
   - Ejemplo: Si tu carpeta tiene la URL:
     ```
     https://drive.google.com/drive/folders/1abc123XYZ
     ```
   - El ID es: `1abc123XYZ`

4. **Haz clic en "Conectar con Drive"**

5. **Verifica:**
   - ✅ Debería mostrar "Conexión exitosa"
   - ✅ Mostrar el número de documentos encontrados
   - ❌ Si falla, revisa los logs en HF Spaces (pestaña "Logs")

---

## 🔍 Troubleshooting

### Error: "Failed to authenticate with Google Drive"

**Posibles causas:**

1. **JSON mal formateado:**
   - Asegúrate de copiar TODO el contenido del archivo JSON
   - Debe comenzar con `{` y terminar con `}`
   - No debe tener saltos de línea extra

2. **Service Account no tiene permisos:**
   - Verifica que compartiste la carpeta de Drive con el email de la service account
   - Verifica que el email coincida exactamente con el del JSON

3. **Google Drive API no habilitada:**
   - Ve a Google Cloud Console → APIs y servicios → Biblioteca
   - Busca "Google Drive API" y asegúrate que esté habilitada

### Error: "No files found in folder"

**Posibles causas:**

1. **ID de carpeta incorrecto:**
   - Verifica que copiaste el ID correcto de la URL

2. **Carpeta vacía:**
   - Asegúrate de que la carpeta contenga archivos PDF

3. **Service Account no tiene acceso:**
   - Revisa los permisos de compartir en Google Drive

### Error: "Invalid GOOGLE_SERVICE_ACCOUNT_JSON format"

**Posibles causas:**

1. **JSON corrupto:**
   - Re-descarga el archivo JSON desde Google Cloud Console
   - Copia el contenido completo nuevamente

2. **Caracteres especiales:**
   - Asegúrate de que no haya caracteres extra antes o después del JSON

---

## 🔒 Seguridad

**IMPORTANTE:**

- ✅ **NUNCA** subas el archivo JSON a git
- ✅ **NUNCA** compartas el archivo JSON públicamente
- ✅ Usa variables de entorno secretas en Hugging Face Spaces
- ✅ El archivo JSON está incluido en `.gitignore`
- ✅ Revoca las claves si se comprometen:
  - Google Cloud Console → IAM → Service Accounts
  - Elimina la clave comprometida
  - Genera una nueva

---

## 📚 Recursos Adicionales

- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [Service Account Authentication](https://cloud.google.com/iam/docs/service-accounts)
- [Hugging Face Spaces Secrets](https://huggingface.co/docs/hub/spaces-overview#managing-secrets)

---

## 🆘 Soporte

Si tienes problemas:

1. **Revisa los logs** en Hugging Face Spaces (pestaña "Logs")
2. **Verifica las variables de entorno** están configuradas
3. **Comprueba los permisos** de la carpeta en Drive
4. **Verifica que Google Drive API** esté habilitada

---

**¡Listo!** Una vez configurado, el backend podrá acceder automáticamente a tu carpeta de Google Drive sin necesidad de autenticación manual.

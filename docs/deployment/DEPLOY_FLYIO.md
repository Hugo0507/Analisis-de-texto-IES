# 🚀 Guía Rápida: Deploy en Fly.io

Despliega tu aplicación en Fly.io **sin** subir código a GitHub.

---

## 📋 Requisitos

- ✅ Windows 10/11, macOS, o Linux
- ✅ Tu archivo `credentials.json` de Google Drive

---

## 🛠️ Paso 1: Instalar Fly CLI

### Windows (PowerShell como Administrador):

```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

### Linux/Mac:

```bash
curl -L https://fly.io/install.sh | sh
```

**Verifica instalación:**
```bash
fly version
```

---

## 🔐 Paso 2: Crear Cuenta y Login

```bash
# Abrir navegador para crear cuenta/login
fly auth login
```

Te pedirá tarjeta de crédito (no cobra, solo verifica).

---

## 📦 Paso 3: Preparar Credenciales

### Opción A: Copiar credentials.json completo

```bash
cd C:\Projects\Tesis\analisis_transformacion_digital

# Lee tu credentials.json
cat credentials.json
```

Copia TODO el contenido (desde `{` hasta `}`).

### Opción B: Usar script de preparación

```bash
# En PowerShell o terminal:
python -c "import json; print(json.dumps(json.load(open('credentials.json'))))"
```

**Guarda el resultado** (lo necesitarás en el paso 5).

---

## 🚀 Paso 4: Crear App en Fly.io

```bash
cd C:\Projects\Tesis\analisis_transformacion_digital

# Crear app (usa el nombre que quieras)
fly launch --name analisis-td --no-deploy

# Preguntas que te hará:
# "Choose a region" → Elige la más cercana (ej: mia para Miami)
# "Would you like to set up a database?" → NO
# "Would you like to deploy now?" → NO (configuraremos secrets primero)
```

---

## 🔑 Paso 5: Configurar Secretos

### A. Configurar Google Drive Folder ID

```bash
fly secrets set GOOGLE_DRIVE_FOLDER_ID="TU-FOLDER-ID-REAL"
```

Reemplaza `TU-FOLDER-ID-REAL` con tu ID real de Google Drive.

### B. Configurar Credentials

**IMPORTANTE**: Usa comillas simples para envolver el JSON:

```bash
fly secrets set GOOGLE_CREDENTIALS='{"type":"service_account","project_id":"tu-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

**Reemplaza** todo el contenido con tu `credentials.json` completo (en una línea).

**Tip**: Para evitar errores, puedes usar un archivo:

```bash
# Crear archivo temporal con el JSON
echo '...' > temp_creds.json

# Leer y configurar
fly secrets set GOOGLE_CREDENTIALS="$(cat temp_creds.json)"

# Borrar archivo temporal
rm temp_creds.json
```

---

## 🎉 Paso 6: Deploy

```bash
# Desplegar la aplicación
fly deploy
```

**Espera 5-10 minutos** (primera vez compila todo).

Verás output como:
```
==> Building image
==> Pushing image to registry
==> Deploying
==> Monitoring deployment

Visit your app at: https://analisis-td.fly.dev
```

---

## ✅ Paso 7: Ver tu App

```bash
# Abrir en navegador
fly open

# O manualmente visita:
# https://TU-NOMBRE-APP.fly.dev
```

---

## 🔄 Actualizaciones Futuras

Cuando modifiques tu código:

```bash
cd C:\Projects\Tesis\analisis_transformacion_digital

# Hacer cambios en el código...

# Redesplegar
fly deploy

# ✅ Tarda ~2-5 minutos
```

**NO necesitas tocar GitHub** en absoluto.

---

## 📊 Comandos Útiles

```bash
# Ver logs en tiempo real
fly logs

# Ver estado de la app
fly status

# Ver información de secretos (no muestra valores)
fly secrets list

# Cambiar un secreto
fly secrets set NOMBRE="nuevo_valor"

# Abrir dashboard web
fly dashboard

# Destruir app (si quieres empezar de nuevo)
fly apps destroy analisis-td
```

---

## ⚙️ Configuración Incluida

Tu proyecto ya tiene estos archivos necesarios:

- ✅ `Dockerfile` - Configuración de Docker
- ✅ `fly.toml` - Configuración de Fly.io
- ✅ `.dockerignore` - Archivos a excluir

**No necesitas modificarlos** (ya están listos).

---

## 🐛 Problemas Comunes

### Error: "Could not find credentials.json"

**Solución**: Verifica que configuraste `GOOGLE_CREDENTIALS`:

```bash
fly secrets list
# Debe mostrar: GOOGLE_CREDENTIALS
```

### Error: "Out of memory"

**Solución**: Aumenta la RAM en `fly.toml`:

```toml
[[vm]]
  memory = '512mb'  # Cambiar de 1gb a 512mb si falla
```

Luego: `fly deploy`

### App muy lenta

**Causa**: Primera carga puede tardar ~30 seg.

**Solución**: Espera a que cargue completamente. Las siguientes cargas serán rápidas.

### Error al configurar secrets

**Problema**: Comillas mal escapadas en JSON.

**Solución**: Usa archivo temporal:
```bash
cat credentials.json | jq -c . > temp.json
fly secrets set GOOGLE_CREDENTIALS="$(cat temp.json)"
rm temp.json
```

---

## 💰 Costos

**Plan Gratis de Fly.io:**
- ✅ 3 apps gratis
- ✅ 256 MB RAM por app
- ✅ 3 GB storage
- ✅ Gratis si no excedes límites

**Estimado para esta app**: $0/mes (dentro del free tier).

---

## 🔐 Privacidad

Con Fly.io:
- ✅ Tu código **NUNCA** se sube a GitHub
- ✅ Solo se crea imagen Docker en Fly.io
- ✅ Nadie puede ver tu código fuente
- ✅ Máxima privacidad

---

## 📚 Recursos

- [Fly.io Docs](https://fly.io/docs/)
- [Fly.io CLI Reference](https://fly.io/docs/flyctl/)
- [Troubleshooting](https://fly.io/docs/getting-started/troubleshooting/)

---

## ✅ Checklist

- [ ] Fly CLI instalado (`fly version`)
- [ ] Cuenta creada y login (`fly auth login`)
- [ ] App creada (`fly launch`)
- [ ] `GOOGLE_DRIVE_FOLDER_ID` configurado
- [ ] `GOOGLE_CREDENTIALS` configurado
- [ ] Deploy exitoso (`fly deploy`)
- [ ] App funciona en `https://tu-app.fly.dev`

---

**Última actualización**: 2025-11-09
**Tiempo estimado**: 15-20 minutos
**Dificultad**: Media (requiere terminal/CLI)

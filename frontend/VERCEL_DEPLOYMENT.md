# 🚀 Deployment en Vercel

Guía paso a paso para desplegar el frontend React en Vercel.

## 📋 Pre-requisitos

- ✅ Cuenta de GitHub (ya tienes el repo)
- ✅ Backend desplegado en Hugging Face Spaces (completado)
- ⏳ Cuenta en Vercel (crearemos ahora)

## 🔧 Paso 1: Crear cuenta en Vercel

1. Ve a: https://vercel.com/signup
2. Click en **"Continue with GitHub"**
3. Autoriza a Vercel para acceder a tu cuenta de GitHub
4. Completa el perfil básico

## 🎯 Paso 2: Importar el proyecto

1. En el dashboard de Vercel, click **"Add New Project"**
2. Busca el repositorio: `Analisis-de-texto-IES`
3. Click **"Import"**

## ⚙️ Paso 3: Configurar el proyecto

### Framework Preset
- Vercel detectará automáticamente: **Create React App**

### Root Directory
- Cambiar de `.` (root) a `frontend`
- Click en **"Edit"** al lado de Root Directory
- Escribir: `frontend`
- Click **"Continue"**

### Build Settings
Vercel llenará automáticamente:
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install --legacy-peer-deps`

✅ **No cambies nada aquí**, el `vercel.json` ya lo tiene configurado.

### Environment Variables

Click en **"Environment Variables"** y agrega estas variables:

| Name | Value |
|------|-------|
| `REACT_APP_API_BASE_URL` | `https://hugo0507-analisis-ies-backend.hf.space/api/v1` |
| `REACT_APP_WS_BASE_URL` | `wss://hugo0507-analisis-ies-backend.hf.space/ws` |
| `REACT_APP_NAME` | `Análisis de Transformación Digital` |
| `REACT_APP_ENV` | `production` |
| `REACT_APP_ENABLE_DEV_TOOLS` | `false` |

**Importante**: Para cada variable, asegúrate de seleccionar los 3 ambientes:
- ✅ Production
- ✅ Preview
- ✅ Development

## 🚀 Paso 4: Deploy

1. Click en **"Deploy"**
2. Espera 2-3 minutos mientras Vercel:
   - ✅ Clona el repositorio
   - ✅ Instala dependencias con `npm install --legacy-peer-deps`
   - ✅ Ejecuta `npm run build`
   - ✅ Despliega a CDN global

## ✅ Paso 5: Verificar el deployment

Una vez completado, verás:

```
🎉 Congratulations! Your project has been deployed.
```

Vercel te dará una URL como:
```
https://analisis-de-texto-ies-tu-usuario.vercel.app
```

### Pruebas básicas:

1. **Abre la URL** en tu navegador
2. Verifica que cargue la aplicación React
3. Verifica que pueda conectar con el backend de HF Spaces
4. Revisa la consola del navegador para errores

## 🔄 Deployments automáticos

Desde ahora, **cada push a `main`** desplegará automáticamente:

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
# ⚡ Vercel detecta el push y despliega automáticamente
```

## 🌐 Dominio personalizado (opcional)

Si tienes un dominio propio:

1. Ve a: Project Settings > Domains
2. Click **"Add Domain"**
3. Sigue las instrucciones para configurar DNS

## 📊 Monitoreo

**Vercel Dashboard**: https://vercel.com/dashboard
- ✅ Ver deployments
- ✅ Ver logs en tiempo real
- ✅ Ver analytics
- ✅ Configurar variables de entorno

## 🔧 Solución de problemas

### Error: "Module not found"
- Verifica que `--legacy-peer-deps` esté en Install Command
- Revisa que Root Directory sea `frontend`

### Error: "API calls failing"
- Verifica las variables de entorno en Vercel Dashboard
- Asegúrate que el backend de HF Spaces esté activo

### Error de CORS
- Ve al backend en HF Spaces
- Agrega tu dominio de Vercel a `CORS_ALLOWED_ORIGINS`

## 📚 Recursos

- [Vercel Docs](https://vercel.com/docs)
- [Create React App Deployment](https://create-react-app.dev/docs/deployment/)
- [Backend API Docs](https://hugo0507-analisis-ies-backend.hf.space/api/docs/)

---

**¡Listo!** Tu frontend estará disponible globalmente con HTTPS automático y deploy continuo desde GitHub.

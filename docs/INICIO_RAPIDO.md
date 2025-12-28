# 🚀 Inicio Rápido - Ver el Frontend

## Comandos para ejecutar en PowerShell:

```powershell
# 1. Navegar a la carpeta del proyecto
cd C:\Projects\Tesis\analisis_transformacion_digital

# 2. Navegar a frontend
cd frontend

# 3. Instalar dependencias (solo la primera vez)
npm install --legacy-peer-deps --force

# 4. Iniciar el servidor
npm start
```

## ✅ ¿Qué esperar?

Después de ejecutar `npm start`:

1. **Verás en la terminal**:
   ```
   Compiled successfully!

   You can now view analisis-transformacion-digital-frontend in the browser.

   Local:            http://localhost:3000
   ```

2. **Se abrirá automáticamente** tu navegador en `http://localhost:3000`

3. **Verás la aplicación** con:
   - ✅ Diseño profesional estilo Power BI
   - ✅ Título: "Análisis de Transformación Digital"
   - ✅ 3 tarjetas con íconos (Documentos, Pipeline, Visualizaciones)
   - ✅ Botones azules interactivos
   - ✅ Paleta de colores Navy/Cyber/Success

## ❌ Si hay errores:

### Error: "Cannot find module 'ajv/dist/compile/codegen'"

**Solución**:
```powershell
cd frontend
rm -rf node_modules
rm package-lock.json
npm cache clean --force
npm install --legacy-peer-deps --force
npm start
```

### Puerto 3000 ocupado

**Solución**:
```powershell
# Encontrar proceso
netstat -ano | findstr :3000

# Matar proceso (reemplaza <PID> con el número que aparece)
taskkill /PID <PID> /F

# Reintentar
npm start
```

## 🛑 Para detener el servidor

Presiona `Ctrl + C` en la terminal donde está corriendo `npm start`

---

## 📊 Estado del Proyecto

### ✅ Completado
- Estructura backend/frontend
- Django configurado
- React + TypeScript + Tailwind CSS
- Docker Compose listo
- Página de inicio diseñada

### 🔄 En progreso
- Servidor compilando...

---

**Tip**: La primera compilación tarda 1-2 minutos. Las siguientes son más rápidas.

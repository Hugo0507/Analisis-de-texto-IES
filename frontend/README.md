# 🎨 Frontend - Análisis de Transformación Digital

Frontend React con TypeScript para la plataforma de análisis NLP/ML.

## 🚀 Stack Tecnológico

- **React 18.2** - Framework UI
- **TypeScript 4.9** - Type safety
- **Tailwind CSS 3.4** - Utility-first CSS
- **Nivo Charts** - Visualizaciones interactivas
- **React Router 6** - Navegación SPA
- **Axios** - HTTP client
- **WebSocket** - Monitoreo en tiempo real

## 🌐 URLs de Producción

- **App en vivo**: https://analisis-de-texto-ies.vercel.app
- **Backend API**: https://hugo0507-analisis-ies-backend.hf.space
- **API Docs**: https://hugo0507-analisis-ies-backend.hf.space/api/docs/

## 🏃 Ejecución Local

### Instalación
```bash
cd frontend
npm install --legacy-peer-deps
```

### Variables de entorno
```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores
REACT_APP_API_BASE_URL=http://localhost:8000/api/v1
REACT_APP_WS_BASE_URL=ws://localhost:8000/ws
```

### Desarrollo
```bash
npm start
# Abre http://localhost:3000
```

### Build de producción
```bash
npm run build
# Genera carpeta build/
```

### Tests
```bash
npm test
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## 📁 Estructura del Proyecto

```
frontend/
├── public/              # Archivos estáticos
├── src/
│   ├── components/     # Componentes reutilizables
│   ├── pages/          # Páginas/Vistas
│   ├── services/       # API calls
│   ├── hooks/          # Custom hooks
│   ├── types/          # TypeScript types
│   ├── utils/          # Utilidades
│   └── App.tsx         # Componente principal
├── .env.example        # Variables de entorno ejemplo
├── .env.production     # Variables para Vercel
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## 🎯 Características

### Dashboards Interactivos
- **Análisis de Documentos**: Estadísticas y métricas
- **Topic Modeling**: Visualización de tópicos (LDA, NMF, LSA)
- **Análisis de Factores**: 8 categorías de transformación digital
- **TF-IDF**: Términos más relevantes
- **Bag of Words**: Frecuencias de palabras

### Monitoreo en Tiempo Real
- WebSocket para seguimiento del pipeline
- Progreso en vivo (14 etapas)
- Notificaciones de estado

### Gestión de Documentos
- Upload desde Google Drive
- Conversión PDF a TXT
- Detección automática de idioma
- Preprocesamiento de texto

## 🔧 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm start` | Servidor de desarrollo (port 3000) |
| `npm run build` | Build optimizado para producción |
| `npm test` | Ejecutar tests con Jest |
| `npm run lint` | Verificar código con ESLint |
| `npm run lint:fix` | Auto-fix problemas de linting |
| `npm run format` | Formatear código con Prettier |

## 🚀 Deployment

### Vercel (Producción)

El proyecto se despliega automáticamente en Vercel con cada push a `main`.

**Variables de entorno necesarias:**
```env
REACT_APP_API_BASE_URL=https://hugo0507-analisis-ies-backend.hf.space/api/v1
REACT_APP_WS_BASE_URL=wss://hugo0507-analisis-ies-backend.hf.space/ws
REACT_APP_NAME=Análisis de Transformación Digital
REACT_APP_ENV=production
REACT_APP_ENABLE_DEV_TOOLS=false
```

Ver guía completa: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

### Docker (Local/Testing)

```bash
# Desde el root del proyecto
docker-compose up frontend
```

## 🐛 Troubleshooting

### Error: "Module not found"
```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Error: "Failed to compile"
- Verifica versiones de Node (usa Node 16+)
- Limpia cache: `npm cache clean --force`

### Error de CORS al llamar API
- Verifica `REACT_APP_API_BASE_URL` en `.env`
- Verifica que el backend esté corriendo
- Revisa configuración CORS en el backend

## 📚 Recursos

- [React Docs](https://react.dev/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Nivo Charts](https://nivo.rocks/)
- [Backend API Docs](https://hugo0507-analisis-ies-backend.hf.space/api/docs/)

## 📄 Licencia

Este proyecto es parte de una tesis de maestría sobre transformación digital en educación superior.

---

**Desarrollado con ❤️ usando React + TypeScript**

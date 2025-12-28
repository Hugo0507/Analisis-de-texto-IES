# 🚀 Guía de Ejecución - Análisis de Transformación Digital

## ⚡ Opción 1: Ver Solo el Frontend (RÁPIDO)

Esta es la forma más rápida de ver el diseño y la UI implementada.

### Prerequisitos
- Node.js y npm instalados ✅ (Ya los tienes)

### Pasos:

1. **Abrir terminal en la carpeta del proyecto**

2. **Navegar a frontend**:
```bash
cd frontend
```

3. **Instalar dependencias** (solo la primera vez):
```bash
npm install --legacy-peer-deps
```
⏱️ Esto tomará 2-3 minutos

4. **Iniciar el servidor de desarrollo**:
```bash
npm start
```

5. **Abrir en el navegador**:
- Se abrirá automáticamente en `http://localhost:3000`
- Si no abre, navega manualmente a esa URL

### ¿Qué verás?

✅ Página de inicio con diseño Power BI
✅ Paleta de colores profesional (Navy, Cyber Blue, Success Green)
✅ 3 tarjetas de funcionalidades
✅ Botones interactivos con Tailwind CSS
✅ Mensaje de confirmación que la Fase 1 está completada

### Para detener el servidor:
Presiona `Ctrl + C` en la terminal

---

## 🔧 Opción 2: Ejecutar Frontend + Backend (COMPLETO)

### Prerequisitos

1. **Python 3.11** instalado
2. **MySQL** instalado y corriendo
3. **Redis** instalado (opcional, se puede simular)
4. **Node.js** instalado ✅

### Pasos para el Backend:

1. **Navegar a backend**:
```bash
cd backend
```

2. **Crear entorno virtual**:
```bash
python -m venv venv
```

3. **Activar entorno virtual**:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. **Instalar dependencias**:
```bash
pip install -r requirements.txt
```
⚠️ **ADVERTENCIA**: Esto tomará 10-15 minutos debido a las librerías de Machine Learning

5. **Configurar variables de entorno**:
Crear archivo `.env` en `backend/`:
```bash
DEBUG=True
SECRET_KEY=django-insecure-dev-key-change-in-production
DB_NAME=analisis_transformacion_digital
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_HOST=localhost
DB_PORT=3306
REDIS_HOST=localhost
REDIS_PORT=6379
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

6. **Crear base de datos en MySQL**:
```sql
CREATE DATABASE analisis_transformacion_digital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

7. **Ejecutar migraciones**:
```bash
python manage.py makemigrations
python manage.py migrate
```

8. **Crear superusuario** (para acceder al admin):
```bash
python manage.py createsuperuser
```

9. **Iniciar servidor Django**:
```bash
# Para desarrollo con Django Channels (WebSocket)
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# O simple sin WebSocket
python manage.py runserver
```

10. **Abrir en el navegador**:
- API: `http://localhost:8000/api/v1/`
- Admin: `http://localhost:8000/admin/`
- Swagger Docs: `http://localhost:8000/api/docs/`

### Pasos para el Frontend (con Backend):

1. **En otra terminal**, navegar a frontend:
```bash
cd frontend
```

2. **Instalar dependencias** (si no lo hiciste antes):
```bash
npm install --legacy-peer-deps
```

3. **Iniciar servidor React**:
```bash
npm start
```

4. **Abrir**: `http://localhost:3000`

### ¿Qué verás con el stack completo?

✅ Frontend React funcionando
✅ Backend Django API funcionando
✅ Conexión entre Frontend y Backend
✅ Swagger documentation interactiva
✅ Django Admin panel

---

## 🐳 Opción 3: Con Docker (SI LO INSTALAS)

Si instalas Docker Desktop, la ejecución es mucho más simple:

1. **Instalar Docker Desktop** desde: https://www.docker.com/products/docker-desktop

2. **Ejecutar todo el stack**:
```bash
docker-compose up --build
```

3. **Acceder**:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- MySQL: `localhost:3306`
- Redis: `localhost:6379`

**Ventaja**: No necesitas instalar Python, MySQL, Redis ni Node.js. Todo corre en contenedores.

---

## 🔍 Verificar que todo funciona

### Frontend
✅ Abre `http://localhost:3000`
✅ Debes ver la página con diseño profesional
✅ Los botones deben tener efectos hover
✅ La paleta de colores debe ser Navy/Cyber/Success

### Backend
✅ Abre `http://localhost:8000/api/v1/`
✅ Debes ver un JSON con las rutas de la API
✅ Swagger: `http://localhost:8000/api/docs/`
✅ Admin: `http://localhost:8000/admin/` (login con superuser)

---

## ❌ Solución de Problemas Comunes

### Frontend

**Error**: `npm ERR! ERESOLVE unable to resolve dependency tree`
**Solución**: Usar `npm install --legacy-peer-deps`

**Error**: `Module not found: Error: Can't resolve 'X'`
**Solución**: Borrar `node_modules` y reinstalar:
```bash
rm -rf node_modules
npm install --legacy-peer-deps
```

**Puerto 3000 ocupado**:
```bash
# Windows: Encontrar y matar proceso
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Backend

**Error**: `No module named 'django'`
**Solución**: Activar el entorno virtual y reinstalar:
```bash
venv\Scripts\activate
pip install -r requirements.txt
```

**Error**: `Can't connect to MySQL server`
**Solución**: Verificar que MySQL está corriendo y las credenciales son correctas

**Error**: `django.db.utils.OperationalError`
**Solución**: Crear la base de datos manualmente en MySQL

---

## 📊 Estado Actual del Proyecto

### ✅ Completado (Fase 1)

- [x] Estructura de carpetas Backend/Frontend
- [x] Docker Compose configurado
- [x] Django configurado con Clean Architecture
- [x] React + TypeScript + Tailwind CSS
- [x] Paleta de colores profesional
- [x] Componente de inicio con diseño Power BI
- [x] Configuración de Django Channels (WebSocket)

### 🔄 En Progreso (Fase 2)

- [ ] Modelos Django ORM (10 modelos)
- [ ] Migraciones de base de datos
- [ ] Serializers DRF

### 📋 Pendiente (Fases 3-9)

- [ ] Servicios y Casos de Uso
- [ ] API REST (20+ endpoints)
- [ ] Pipeline + WebSocket
- [ ] Componentes React (Atomic Design)
- [ ] Páginas del MVP
- [ ] Testing
- [ ] Despliegue

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa esta guía
2. Verifica los logs en la terminal
3. Consulta el plan completo: `.claude/plans/cuddly-greeting-quill.md`

---

**Última actualización**: 2025-12-03
**Versión**: 4.0.0 (Nueva Arquitectura)

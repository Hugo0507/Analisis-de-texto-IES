# Guía de Ejecución - Análisis de Transformación Digital

Esta guía te muestra cómo ejecutar el proyecto completo (Backend Django + Frontend React).

## Tabla de Contenidos

1. [Opción 1: Con Docker (Recomendado)](#opción-1-con-docker-recomendado)
2. [Opción 2: Sin Docker (Desarrollo Local)](#opción-2-sin-docker-desarrollo-local)
3. [Verificación de la Instalación](#verificación-de-la-instalación)
4. [Solución de Problemas](#solución-de-problemas)

---

## Opción 1: Con Docker (Recomendado)

Esta es la forma más rápida y sencilla de ejecutar el proyecto completo.

### Prerrequisitos

- Docker Desktop instalado ([Descargar aquí](https://www.docker.com/products/docker-desktop))
- Docker Compose (incluido con Docker Desktop)

### Pasos

1. **Clonar el repositorio** (si no lo has hecho):
   ```bash
   git clone <url-del-repositorio>
   cd analisis_transformacion_digital
   ```

2. **Levantar todos los servicios**:
   ```bash
   docker-compose up --build
   ```

   Esto levantará:
   - MySQL (Base de datos) - Puerto 3306
   - Redis (Caché) - Puerto 6379
   - Backend Django - Puerto 8000
   - Frontend React - Puerto 3000

3. **Esperar a que los servicios inicien** (puede tomar 2-3 minutos la primera vez)

4. **Acceder a las aplicaciones**:
   - **Frontend React**: http://localhost:3000
   - **Backend API**: http://localhost:8000/api/v1/
   - **Swagger Docs**: http://localhost:8000/api/docs/
   - **Django Admin**: http://localhost:8000/admin/

### Comandos Útiles Docker

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (limpieza completa)
docker-compose down -v

# Reconstruir un servicio específico
docker-compose up --build backend
```

---

## Opción 2: Sin Docker (Desarrollo Local)

Si prefieres ejecutar los servicios manualmente, sigue estos pasos:

### Prerrequisitos

- **Python 3.11+**
- **Node.js 18+** y **npm**
- **MySQL 8.0** (instalado y ejecutándose)
- **Redis** (instalado y ejecutándose)

### 1. Configurar la Base de Datos MySQL

```bash
# Conectarse a MySQL
mysql -u root -p

# Crear la base de datos y usuario
CREATE DATABASE analisis_transformacion_digital;
CREATE USER 'analisis_user'@'localhost' IDENTIFIED BY 'analisis_password_2024';
GRANT ALL PRIVILEGES ON analisis_transformacion_digital.* TO 'analisis_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Ejecutar Redis

```bash
# Linux/Mac
redis-server

# Windows (con instalación WSL o Redis nativo)
redis-server.exe
```

### 3. Configurar y Ejecutar el Backend Django

```bash
# Navegar a la carpeta backend
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno (crear archivo .env)
cat > .env << EOF
DEBUG=True
SECRET_KEY=django-insecure-change-this-in-production-2024
DATABASE_URL=mysql://analisis_user:analisis_password_2024@localhost:3306/analisis_transformacion_digital
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
EOF

# Ejecutar migraciones
python manage.py migrate

# Crear superusuario (opcional, para acceder al admin)
python manage.py createsuperuser

# Recolectar archivos estáticos
python manage.py collectstatic --noinput

# Ejecutar servidor de desarrollo
# Opción 1: Con Daphne (para WebSocket)
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# Opción 2: Con runserver (más simple, sin WebSocket)
python manage.py runserver 0.0.0.0:8000
```

El backend estará disponible en:
- API: http://localhost:8000/api/v1/
- Swagger: http://localhost:8000/api/docs/
- Admin: http://localhost:8000/admin/

### 4. Configurar y Ejecutar el Frontend React

En una **nueva terminal**:

```bash
# Navegar a la carpeta frontend
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno (crear archivo .env)
cat > .env << EOF
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_WS_URL=ws://localhost:8000/ws
EOF

# Ejecutar servidor de desarrollo
npm start
```

El frontend estará disponible en: http://localhost:3000

---

## Verificación de la Instalación

### 1. Verificar Backend

```bash
# Probar endpoint de salud
curl http://localhost:8000/api/v1/health/

# O abre en el navegador:
http://localhost:8000/api/docs/
```

### 2. Verificar Frontend

Abre http://localhost:3000 en tu navegador. Deberías ver la interfaz de React.

### 3. Verificar Servicios

```bash
# Verificar MySQL
mysql -u analisis_user -p -e "USE analisis_transformacion_digital; SHOW TABLES;"

# Verificar Redis
redis-cli ping
# Debería responder: PONG
```

---

## Solución de Problemas

### Error: "Can't connect to MySQL server"

**Solución**:
```bash
# Verificar que MySQL esté ejecutándose
# Windows:
net start MySQL80

# Linux/Mac:
sudo systemctl start mysql
```

### Error: "Redis connection refused"

**Solución**:
```bash
# Verificar que Redis esté ejecutándose
# Linux/Mac:
sudo systemctl start redis

# Windows (WSL):
sudo service redis-server start
```

### Error: "Port 3000 is already in use"

**Solución**:
```bash
# Buscar el proceso usando el puerto
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

### Error: "Module not found" en Backend

**Solución**:
```bash
# Reinstalar dependencias
cd backend
pip install -r requirements.txt --force-reinstall
```

### Error: "Module not found" en Frontend

**Solución**:
```bash
# Limpiar y reinstalar
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Migraciones de Base de Datos Fallidas

**Solución**:
```bash
cd backend
python manage.py migrate --run-syncdb
```

---

## Comandos de Desarrollo Útiles

### Backend (Django)

```bash
# Crear nueva aplicación
python manage.py startapp <nombre_app>

# Ejecutar tests
pytest

# Ejecutar tests con cobertura
pytest --cov=apps --cov-report=html

# Shell interactivo de Django
python manage.py shell_plus

# Formatear código
black .
isort .
flake8
```

### Frontend (React)

```bash
# Ejecutar tests
npm test

# Ejecutar linter
npm run lint

# Formatear código
npm run format

# Build para producción
npm run build
```

---

## Estructura del Proyecto

```
analisis_transformacion_digital/
├── backend/              # Django REST Framework
│   ├── apps/            # Aplicaciones Django
│   ├── config/          # Configuración del proyecto
│   ├── manage.py        # Script de Django
│   └── requirements.txt # Dependencias Python
│
├── frontend/            # React + TypeScript
│   ├── src/            # Código fuente
│   ├── public/         # Archivos públicos
│   └── package.json    # Dependencias Node
│
├── docker-compose.yml  # Configuración Docker
├── README.md           # Documentación principal
└── GUIA_EJECUCION.md   # Este archivo
```

---

## Documentación Adicional

- **[README.md](README.md)** - Descripción general del proyecto
- **[docs/INICIO_RAPIDO.md](docs/INICIO_RAPIDO.md)** - Guía de inicio rápido
- **[docs/deployment/](docs/deployment/)** - Guías de despliegue en producción
- **[backend/ENDPOINTS.md](backend/ENDPOINTS.md)** - Documentación de API

---

## Contacto y Soporte

Para problemas o preguntas:
1. Revisa la sección [Solución de Problemas](#solución-de-problemas)
2. Consulta la documentación en `/docs`
3. Crea un issue en el repositorio

---

**Última actualización:** Diciembre 2025

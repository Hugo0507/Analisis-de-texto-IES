# Ejecutar Backend Localmente - Guía Rápida

Esta guía te ayudará a ejecutar el backend Django en tu máquina local de forma sencilla.

## 🚀 Opción 1: Setup Automático (Recomendado)

### Windows PowerShell

```powershell
# Ejecuta el script de setup automático
.\setup_dev.ps1
```

### Windows CMD

```cmd
# Ejecuta el script de setup automático
setup_dev.bat
```

El script automáticamente:
- ✅ Crea un entorno virtual limpio
- ✅ Instala todas las dependencias
- ✅ Crea el archivo `.env` con configuración por defecto
- ✅ Usa SQLite (no necesitas instalar MySQL/PostgreSQL)
- ✅ Usa caché en memoria (no necesitas Redis)

## 📝 Opción 2: Setup Manual

Si prefieres hacerlo paso a paso:

### 1. Eliminar entorno virtual anterior (si existe)

```powershell
# PowerShell
Remove-Item -Recurse -Force venv

# CMD
rmdir /s /q venv
```

### 2. Crear nuevo entorno virtual

```bash
python -m venv venv
```

### 3. Activar el entorno virtual

```powershell
# PowerShell
.\venv\Scripts\Activate.ps1

# CMD
venv\Scripts\activate
```

**IMPORTANTE**: Verifica que estés en el entorno virtual. Deberías ver `(venv)` al inicio de tu prompt.

### 4. Instalar dependencias usando la ruta explícita

```bash
# Usar la ruta completa del pip del venv
.\venv\Scripts\pip.exe install --upgrade pip
.\venv\Scripts\pip.exe install -r requirements.txt
```

### 5. Verificar que Django se instaló correctamente

```bash
.\venv\Scripts\python.exe -c "import django; print(django.get_version())"
```

Deberías ver: `4.2.8`

### 6. Crear archivo `.env`

Crea un archivo llamado `.env` en la carpeta `backend/` con este contenido:

```env
DEBUG=True
SECRET_KEY=django-insecure-local-development-key-change-in-production
DJANGO_SETTINGS_MODULE=config.settings.development
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## ▶️ Ejecutar el Servidor

### 1. Ejecutar migraciones

```bash
python manage.py migrate
```

Esto creará la base de datos SQLite (`db.sqlite3`) con todas las tablas necesarias.

### 2. Crear superusuario (opcional)

```bash
python manage.py createsuperuser
```

Sigue las instrucciones para crear un usuario administrador.

### 3. Iniciar el servidor de desarrollo

```bash
python manage.py runserver
```

O para que sea accesible desde otras máquinas en tu red:

```bash
python manage.py runserver 0.0.0.0:8000
```

## ✅ Verificar que Funciona

Abre tu navegador y visita:

### 1. API Root
```
http://localhost:8000/api/v1/
```

Deberías ver un JSON con los endpoints disponibles.

### 2. Swagger Documentation
```
http://localhost:8000/api/docs/
```

Interfaz interactiva para explorar la API.

### 3. Django Admin
```
http://localhost:8000/admin/
```

Panel de administración (requiere haber creado un superusuario).

### 4. Health Check
```
http://localhost:8000/api/v1/health/
```

Debe responder con:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "database": "connected"
}
```

## 🔍 Solución de Problemas

### Error: "ModuleNotFoundError: No module named 'django'"

**Causa**: Las dependencias se instalaron en el Python global, no en el venv.

**Solución**:
1. Desactiva el venv: `deactivate`
2. Elimina el venv: `Remove-Item -Recurse -Force venv`
3. Ejecuta el script de setup: `.\setup_dev.ps1`

### Error: "No such table"

**Causa**: No se han ejecutado las migraciones.

**Solución**:
```bash
python manage.py migrate
```

### Error: "Port 8000 is already in use"

**Causa**: Ya hay un servidor corriendo en el puerto 8000.

**Solución**:
```powershell
# Encontrar el proceso
netstat -ano | findstr :8000

# Matar el proceso (reemplaza <PID> con el número que viste)
taskkill /PID <PID> /F

# O usa otro puerto
python manage.py runserver 8001
```

### Error: "apps.core" not found

**Causa**: Las aplicaciones Django no están correctamente configuradas.

**Solución**: Este error normalmente ocurre si las carpetas de las apps no existen. Verifica que existan:
- `backend/apps/core/`
- `backend/apps/documents/`
- `backend/apps/analysis/`
- `backend/apps/pipeline/`
- `backend/apps/infrastructure/`

### El servidor inicia pero no responde

**Causa**: Firewall de Windows bloqueando el puerto.

**Solución**:
1. Ve a Windows Defender Firewall
2. Permite Python a través del firewall
3. O ejecuta: `python manage.py runserver 127.0.0.1:8000`

## 📊 Bases de Datos Alternativas

### Usar MySQL en lugar de SQLite

Si prefieres usar MySQL:

1. Instala MySQL 8.0
2. Crea la base de datos:
   ```sql
   CREATE DATABASE analisis_transformacion_digital;
   CREATE USER 'analisis_user'@'localhost' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON analisis_transformacion_digital.* TO 'analisis_user'@'localhost';
   ```
3. Actualiza `.env`:
   ```env
   DB_ENGINE=mysql
   DB_NAME=analisis_transformacion_digital
   DB_USER=analisis_user
   DB_PASSWORD=password
   DB_HOST=localhost
   DB_PORT=3306
   ```
4. Elimina la línea `DATABASE_URL=sqlite:///db.sqlite3`
5. Ejecuta: `python manage.py migrate`

### Usar PostgreSQL

1. Instala PostgreSQL
2. Crea la base de datos
3. Actualiza `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   ```

## 🧪 Ejecutar Tests

```bash
# Todos los tests
pytest

# Con cobertura
pytest --cov=apps --cov-report=html

# Tests específicos
pytest apps/documents/tests/
```

## 📚 Comandos Útiles

```bash
# Shell interactivo con modelos cargados
python manage.py shell_plus

# Ver todas las URLs disponibles
python manage.py show_urls

# Crear nueva app
python manage.py startapp nombre_app apps/nombre_app

# Recolectar archivos estáticos
python manage.py collectstatic

# Ver migraciones pendientes
python manage.py showmigrations

# Crear migración para cambios en modelos
python manage.py makemigrations
```

## 🎯 Próximos Pasos

Una vez que el backend esté funcionando:

1. **Ejecutar el Frontend**: Ve a la carpeta `frontend/` y ejecuta `npm install && npm start`
2. **Probar la API**: Usa Swagger en http://localhost:8000/api/docs/
3. **Explorar el código**: Las apps están en `backend/apps/`

## 🔗 Enlaces Útiles

- **Guía de Ejecución Completa**: `../GUIA_EJECUCION.md`
- **Documentación de Endpoints**: `ENDPOINTS.md`
- **Deployment en HF**: `../docs/deployment/HUGGINGFACE_DEPLOYMENT.md`

---

¿Necesitas ayuda? Consulta la documentación completa en `/docs` o revisa los logs del servidor para más detalles sobre errores.

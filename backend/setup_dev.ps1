# ============================================================================
# Script PowerShell para configurar el entorno de desarrollo del Backend
# ============================================================================
# Ejecutar como: .\setup_dev.ps1

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  Configuración del Entorno de Desarrollo - Backend Django" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Eliminar entorno virtual anterior si existe
if (Test-Path "venv") {
    Write-Host "[1/7] Eliminando entorno virtual anterior..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force venv
} else {
    Write-Host "[1/7] No hay entorno virtual anterior" -ForegroundColor Green
}

# 2. Crear nuevo entorno virtual
Write-Host "[2/7] Creando nuevo entorno virtual..." -ForegroundColor Yellow
python -m venv venv

if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "ERROR: No se pudo crear el entorno virtual" -ForegroundColor Red
    exit 1
}
Write-Host "       ✓ Entorno virtual creado exitosamente" -ForegroundColor Green

# 3. Activar entorno virtual
Write-Host "[3/7] Activando entorno virtual..." -ForegroundColor Yellow
& "venv\Scripts\Activate.ps1"

# 4. Actualizar pip, setuptools, wheel
Write-Host "[4/7] Actualizando pip, setuptools y wheel..." -ForegroundColor Yellow
& "venv\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel

# 5. Instalar dependencias
Write-Host "[5/7] Instalando dependencias (esto puede tardar unos minutos)..." -ForegroundColor Yellow
& "venv\Scripts\pip.exe" install -r requirements.txt

# Verificar instalación de Django
$djangoInstalled = & "venv\Scripts\pip.exe" show django
if ($djangoInstalled) {
    Write-Host "       ✓ Django instalado correctamente" -ForegroundColor Green
} else {
    Write-Host "       ERROR: Django no se instaló correctamente" -ForegroundColor Red
    exit 1
}

# 6. Crear archivo .env para desarrollo
Write-Host "[6/7] Creando archivo .env para desarrollo..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    $envContent = @"
# ============================================================================
# DESARROLLO LOCAL - Variables de Entorno
# ============================================================================

# Django Core
DEBUG=True
SECRET_KEY=django-insecure-local-development-key-change-in-production
DJANGO_SETTINGS_MODULE=config.settings.development

# Database (SQLite para desarrollo)
# Comentar esto si quieres usar MySQL/PostgreSQL
DATABASE_URL=sqlite:///db.sqlite3

# O usar MySQL (descomentar si tienes MySQL instalado)
# DB_ENGINE=mysql
# DB_NAME=analisis_transformacion_digital
# DB_USER=root
# DB_PASSWORD=
# DB_HOST=localhost
# DB_PORT=3306

# Redis (opcional para desarrollo - comentar si no tienes Redis)
# REDIS_URL=redis://localhost:6379/0

# Allowed Hosts
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
"@
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "       ✓ Archivo .env creado" -ForegroundColor Green
} else {
    Write-Host "       ✓ Archivo .env ya existe" -ForegroundColor Green
}

# 7. Verificar instalación
Write-Host "[7/7] Verificando instalación..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Python ejecutable: " -NoNewline
& "venv\Scripts\python.exe" --version

Write-Host "Django versión: " -NoNewline
& "venv\Scripts\python.exe" -c "import django; print(django.get_version())"

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  ✓ Configuración completada exitosamente!" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Activar el entorno virtual:" -ForegroundColor White
Write-Host "     .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Ejecutar migraciones:" -ForegroundColor White
Write-Host "     python manage.py migrate" -ForegroundColor Yellow
Write-Host ""
Write-Host "  3. Crear superusuario (opcional):" -ForegroundColor White
Write-Host "     python manage.py createsuperuser" -ForegroundColor Yellow
Write-Host ""
Write-Host "  4. Ejecutar servidor:" -ForegroundColor White
Write-Host "     python manage.py runserver" -ForegroundColor Yellow
Write-Host ""
Write-Host "  5. Acceder a:" -ForegroundColor White
Write-Host "     - API: http://localhost:8000/api/v1/" -ForegroundColor Yellow
Write-Host "     - Swagger: http://localhost:8000/api/docs/" -ForegroundColor Yellow
Write-Host "     - Admin: http://localhost:8000/admin/" -ForegroundColor Yellow
Write-Host ""

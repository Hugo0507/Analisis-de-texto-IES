@echo off
REM ============================================================================
REM Script Batch para configurar el entorno de desarrollo del Backend
REM ============================================================================
REM Ejecutar como: setup_dev.bat

echo ==================================================================
echo   Configuracion del Entorno de Desarrollo - Backend Django
echo ==================================================================
echo.

REM 1. Eliminar entorno virtual anterior si existe
if exist venv (
    echo [1/7] Eliminando entorno virtual anterior...
    rmdir /s /q venv
) else (
    echo [1/7] No hay entorno virtual anterior
)

REM 2. Crear nuevo entorno virtual
echo [2/7] Creando nuevo entorno virtual...
python -m venv venv
if not exist venv\Scripts\python.exe (
    echo ERROR: No se pudo crear el entorno virtual
    pause
    exit /b 1
)
echo        OK Entorno virtual creado exitosamente

REM 3. Actualizar pip
echo [3/7] Actualizando pip, setuptools y wheel...
venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel

REM 4. Instalar dependencias
echo [4/7] Instalando dependencias (esto puede tardar unos minutos)...
venv\Scripts\pip.exe install -r requirements.txt

REM 5. Verificar Django
echo [5/7] Verificando instalacion de Django...
venv\Scripts\pip.exe show django >nul 2>&1
if %errorlevel% == 0 (
    echo        OK Django instalado correctamente
) else (
    echo        ERROR: Django no se instalo correctamente
    pause
    exit /b 1
)

REM 6. Crear archivo .env
echo [6/7] Creando archivo .env para desarrollo...
if not exist .env (
    (
        echo # ============================================================================
        echo # DESARROLLO LOCAL - Variables de Entorno
        echo # ============================================================================
        echo.
        echo # Django Core
        echo DEBUG=True
        echo SECRET_KEY=django-insecure-local-development-key-change-in-production
        echo DJANGO_SETTINGS_MODULE=config.settings.development
        echo.
        echo # Database ^(SQLite para desarrollo^)
        echo DATABASE_URL=sqlite:///db.sqlite3
        echo.
        echo # Allowed Hosts
        echo ALLOWED_HOSTS=localhost,127.0.0.1
        echo.
        echo # CORS
        echo CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
        echo CSRF_TRUSTED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
    ) > .env
    echo        OK Archivo .env creado
) else (
    echo        OK Archivo .env ya existe
)

REM 7. Verificar instalación
echo [7/7] Verificando instalacion...
echo.
echo Python ejecutable:
venv\Scripts\python.exe --version
echo Django version:
venv\Scripts\python.exe -c "import django; print(django.get_version())"

echo.
echo ==================================================================
echo   OK Configuracion completada exitosamente!
echo ==================================================================
echo.
echo Proximos pasos:
echo   1. Activar el entorno virtual:
echo      venv\Scripts\activate
echo.
echo   2. Ejecutar migraciones:
echo      python manage.py migrate
echo.
echo   3. Crear superusuario ^(opcional^):
echo      python manage.py createsuperuser
echo.
echo   4. Ejecutar servidor:
echo      python manage.py runserver
echo.
echo   5. Acceder a:
echo      - API: http://localhost:8000/api/v1/
echo      - Swagger: http://localhost:8000/api/docs/
echo      - Admin: http://localhost:8000/admin/
echo.
pause

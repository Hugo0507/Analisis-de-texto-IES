@echo off
REM ====================================================================
REM PASO 4: Configuracion de variables de entorno
REM ====================================================================

echo.
echo ====================================================================
echo PASO 4: CONFIGURACION DE VARIABLES DE ENTORNO
echo ====================================================================
echo.

cd ..

echo [INFO] Verificando archivo .env.example...
if not exist ".env.example" (
    echo [ERROR] No se encontro .env.example
    pause
    exit /b 1
)
echo [OK] .env.example encontrado
echo.

echo [INFO] Creando archivo .env desde .env.example...
if exist ".env" (
    echo [WARNING] Ya existe un archivo .env
    echo [INFO] Creando backup como .env.backup...
    copy .env .env.backup >nul
    echo [OK] Backup creado
    echo.
    choice /C SN /M "Quieres sobrescribir el .env actual (S/N)"
    if errorlevel 2 (
        echo [INFO] Manteniendo .env actual
        goto :skip_copy
    )
)

copy .env.example .env >nul
echo [OK] Archivo .env creado
echo.

:skip_copy

echo [INFO] Verificando directorios necesarios...
if not exist "logs" mkdir logs
if not exist "cache" mkdir cache
if not exist "data" mkdir data
if not exist "output" mkdir output
echo [OK] Directorios creados
echo.

echo [INFO] Probando configuracion...
call venv\Scripts\activate.bat
python config.py
echo.

if %errorlevel% == 0 (
    echo [OK] Configuracion valida
) else (
    echo [ERROR] Problema con la configuracion
)
echo.

echo ====================================================================
echo CONFIGURACION COMPLETADA
echo ====================================================================
echo.
echo Tu archivo .env ha sido creado con valores por defecto.
echo.
echo IMPORTANTE: Edita .env y ajusta:
echo   - GOOGLE_DRIVE_FOLDER_ID (tu carpeta de Drive)
echo   - LOG_LEVEL (INFO para produccion, DEBUG para desarrollo)
echo.
echo Proximo paso: Ejecuta 5_probar_app.bat
echo.

pause

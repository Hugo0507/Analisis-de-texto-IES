@echo off
REM ====================================================================
REM PASO 1: Verificacion del sistema
REM ====================================================================

echo.
echo ====================================================================
echo PASO 1: VERIFICACION DEL SISTEMA
echo ====================================================================
echo.

echo [INFO] Verificando version actual de Python...
python --version
echo.

echo [INFO] Verificando pip...
python -m pip --version
echo.

echo [INFO] Verificando ubicacion de Python...
where python
echo.

echo [INFO] Verificando entorno virtual actual...
if exist "venv" (
    echo [OK] Entorno virtual encontrado en: venv\
) else (
    echo [WARNING] No se encontro entorno virtual
)
echo.

echo ====================================================================
echo PROXIMO PASO:
echo ====================================================================
echo.
echo Necesitas DESINSTALAR Python 3.13 manualmente:
echo.
echo 1. Presiona Windows + R
echo 2. Escribe: appwiz.cpl
echo 3. Presiona Enter
echo 4. Busca "Python 3.13"
echo 5. Click derecho -^> Desinstalar
echo.
echo Despues de desinstalar, descarga Python 3.11.8 desde:
echo https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe
echo.
echo IMPORTANTE: Durante la instalacion, marca "Add Python to PATH"
echo.
echo Cuando termines, ejecuta: 2_limpiar_entorno.bat
echo.
echo ====================================================================

pause

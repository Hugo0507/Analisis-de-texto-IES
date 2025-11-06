@echo off
REM ====================================================================
REM PASO 2: Limpieza del entorno viejo
REM ====================================================================

echo.
echo ====================================================================
echo PASO 2: LIMPIEZA DEL ENTORNO VIEJO
echo ====================================================================
echo.

echo [INFO] Verificando nueva version de Python...
python --version
echo.

REM Verificar que NO sea Python 3.13
python --version | findstr /C:"3.13" >nul
if %errorlevel% == 0 (
    echo [ERROR] Todavia estas usando Python 3.13!
    echo.
    echo Por favor:
    echo 1. Desinstala Python 3.13
    echo 2. Instala Python 3.11.8 desde:
    echo    https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe
    echo 3. Marca "Add Python to PATH" durante instalacion
    echo 4. Reinicia PowerShell/CMD
    echo 5. Ejecuta este script nuevamente
    echo.
    pause
    exit /b 1
)

echo [OK] Version de Python correcta detectada!
echo.

REM Verificar que sea Python 3.11 o 3.12
python --version | findstr /C:"3.11" >nul
if %errorlevel% == 0 (
    echo [OK] Python 3.11 detectado - Perfecto!
    goto :continue
)

python --version | findstr /C:"3.12" >nul
if %errorlevel% == 0 (
    echo [OK] Python 3.12 detectado - Perfecto!
    goto :continue
)

echo [WARNING] Version de Python no es 3.11 o 3.12, pero continuando...
echo.

:continue
echo [INFO] Desactivando entorno virtual si esta activo...
call deactivate 2>nul
echo.

echo [INFO] Eliminando entorno virtual viejo...
cd ..
if exist "venv" (
    echo [INFO] Eliminando carpeta venv...
    rmdir /s /q venv
    echo [OK] Entorno virtual eliminado
) else (
    echo [INFO] No hay entorno virtual para eliminar
)
echo.

echo [INFO] Eliminando cache de Python...
if exist "__pycache__" rmdir /s /q __pycache__
if exist "src\__pycache__" rmdir /s /q src\__pycache__
if exist "src\utils\__pycache__" rmdir /s /q src\utils\__pycache__
if exist "components\__pycache__" rmdir /s /q components\__pycache__
for /d /r . %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d"
echo [OK] Cache eliminado
echo.

echo ====================================================================
echo LIMPIEZA COMPLETADA
echo ====================================================================
echo.
echo Proximo paso: Ejecuta 3_instalar_todo.bat
echo.

pause

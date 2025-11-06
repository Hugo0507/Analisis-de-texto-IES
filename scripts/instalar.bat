@echo off
echo ========================================
echo  Instalacion del Sistema
echo ========================================
echo.

echo [1/4] Verificando Python...
python --version
if errorlevel 1 (
    echo [ERROR] Python no esta instalado o no esta en el PATH.
    echo Por favor, instala Python 3.8 o superior desde python.org
    pause
    exit /b 1
)

echo.
echo [2/4] Creando entorno virtual...
if exist "venv" (
    echo El entorno virtual ya existe. Saltando...
) else (
    python -m venv venv
    echo Entorno virtual creado exitosamente!
)

echo.
echo [3/4] Activando entorno virtual...
call venv\Scripts\activate

echo.
echo [4/4] Instalando dependencias...
echo Esto puede tardar varios minutos...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ========================================
echo  Instalacion completada!
echo ========================================
echo.
echo Para ejecutar la aplicacion:
echo   1. Ejecuta: ejecutar.bat
echo   O manualmente:
echo   2. Activa el entorno: venv\Scripts\activate
echo   3. Ejecuta: streamlit run app.py
echo.
pause

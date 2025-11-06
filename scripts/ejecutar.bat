@echo off
echo ========================================
echo  Sistema de Analisis Transformacion Digital
echo ========================================
echo.

REM Verificar si existe el entorno virtual
if not exist "venv" (
    echo [ERROR] No se encontro el entorno virtual.
    echo Por favor, ejecuta primero: python -m venv venv
    echo Y luego: venv\Scripts\activate
    echo Y finalmente: pip install -r requirements.txt
    pause
    exit /b 1
)

echo [1/3] Activando entorno virtual...
call venv\Scripts\activate

echo [2/3] Verificando instalacion...
python -c "import streamlit" 2>nul
if errorlevel 1 (
    echo [ERROR] Streamlit no esta instalado.
    echo Instalando dependencias...
    pip install -r requirements.txt
)

echo [3/3] Iniciando aplicacion...
echo.
echo La aplicacion se abrira en tu navegador en unos segundos...
echo Presiona Ctrl+C para detener el servidor.
echo.

streamlit run app.py

pause

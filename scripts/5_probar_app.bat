@echo off
REM ====================================================================
REM PASO 5: Probar la aplicacion
REM ====================================================================

echo.
echo ====================================================================
echo PASO 5: PROBANDO LA APLICACION
echo ====================================================================
echo.

cd ..

echo [INFO] Activando entorno virtual...
call venv\Scripts\activate.bat
echo.

echo [INFO] Verificando instalacion...
echo.

python -c "import sys; print(f'Python: {sys.version}')"
echo.

echo [VERIFICACION] Importando modulos principales...
python -c "import streamlit; print('[OK] Streamlit')" || echo [ERROR] Streamlit
python -c "import pandas; print('[OK] Pandas')" || echo [ERROR] Pandas
python -c "import numpy; print('[OK] Numpy')" || echo [ERROR] Numpy
python -c "import config; print('[OK] Config')" || echo [ERROR] Config
python -c "from src.utils.logger import get_logger; print('[OK] Logger')" || echo [ERROR] Logger
echo.

echo [INFO] Verificando configuracion...
python config.py
echo.

echo ====================================================================
echo INICIANDO STREAMLIT
echo ====================================================================
echo.
echo La aplicacion se abrira en tu navegador en unos segundos...
echo.
echo Para detener la aplicacion: Presiona Ctrl+C
echo.
echo ====================================================================
echo.

streamlit run app.py

pause

@echo off
REM ====================================================================
REM PASO 3: Instalacion completa del proyecto
REM ====================================================================

echo.
echo ====================================================================
echo PASO 3: INSTALACION COMPLETA
echo ====================================================================
echo.

cd ..

echo [1/8] Verificando Python...
python --version
echo.

echo [2/8] Creando nuevo entorno virtual...
python -m venv venv
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo crear el entorno virtual
    pause
    exit /b 1
)
echo [OK] Entorno virtual creado
echo.

echo [3/8] Activando entorno virtual...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo activar el entorno virtual
    pause
    exit /b 1
)
echo [OK] Entorno virtual activado
echo.

echo [4/8] Actualizando pip...
python -m pip install --upgrade pip
echo.

echo [5/8] Instalando wheel y setuptools...
pip install wheel setuptools
echo.

echo [6/8] Instalando dependencias base (numpy, pandas)...
pip install "numpy>=1.24.0,<2.0.0"
pip install "pandas>=2.1.0,<3.0.0"
echo.

echo [7/8] Instalando todas las dependencias desde requirements.txt...
echo [INFO] Esto puede tomar 10-15 minutos...
echo.

pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Algunas dependencias fallaron.
    echo [INFO] Intentando instalar dependencias criticas individualmente...
    echo.

    pip install "streamlit>=1.31.0,<2.0.0"
    pip install "plotly>=5.18.0,<6.0.0"
    pip install "matplotlib>=3.8.0,<4.0.0"
    pip install "seaborn>=0.13.0,<1.0.0"
    pip install "scikit-learn>=1.4.0,<2.0.0"
    pip install "nltk>=3.8.1,<4.0.0"
    pip install "google-auth>=2.26.0"
    pip install "google-api-python-client>=2.115.0"
    pip install "python-dotenv>=1.0.0"

    echo.
    echo [INFO] Intentando instalar spaCy...
    pip install "spacy>=3.7.0,<3.8.0"

    if %errorlevel% neq 0 (
        echo [WARNING] spaCy no se pudo instalar. Continuando sin el...
    )
)

echo.
echo [8/8] Descargando modelos de spaCy (si esta instalado)...
python -m spacy download en_core_web_sm 2>nul
if %errorlevel% == 0 (
    echo [OK] Modelo de spaCy descargado
) else (
    echo [INFO] spaCy no disponible o ya descargado
)
echo.

echo ====================================================================
echo INSTALACION COMPLETADA
echo ====================================================================
echo.

echo [INFO] Verificando instalacion...
python -c "import streamlit; print('[OK] Streamlit instalado')"
python -c "import pandas; print('[OK] Pandas instalado')"
python -c "import numpy; print('[OK] Numpy instalado')"
python -c "import sklearn; print('[OK] Scikit-learn instalado')"
python -c "import nltk; print('[OK] NLTK instalado')"
python -c "import dotenv; print('[OK] Python-dotenv instalado')"
echo.

python -c "import spacy; print('[OK] spaCy instalado')" 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] spaCy NO instalado - algunas funcionalidades NER limitadas
)
echo.

echo ====================================================================
echo PROXIMO PASO: Configurar variables de entorno
echo ====================================================================
echo.
echo Ejecuta: 4_configurar_env.bat
echo.

pause

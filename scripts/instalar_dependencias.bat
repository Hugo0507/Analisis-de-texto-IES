@echo off
REM ====================================================================
REM Script de Instalación de Dependencias
REM Instala las dependencias paso a paso para evitar errores
REM ====================================================================

echo.
echo ====================================================================
echo INSTALACION DE DEPENDENCIAS - Proyecto Analisis Transformacion Digital
echo ====================================================================
echo.

REM Verificar versión de Python
echo [1/10] Verificando version de Python...
python --version
echo.

REM Actualizar pip
echo [2/10] Actualizando pip...
python -m pip install --upgrade pip
echo.

REM Instalar dependencias básicas primero
echo [3/10] Instalando dependencias basicas (numpy, pandas)...
pip install numpy>=1.24.0,<2.0.0
pip install pandas>=2.1.0,<3.0.0
echo.

REM Instalar Streamlit
echo [4/10] Instalando Streamlit...
pip install streamlit>=1.31.0,<2.0.0
echo.

REM Instalar visualización
echo [5/10] Instalando librerias de visualizacion...
pip install plotly>=5.18.0,<6.0.0
pip install matplotlib>=3.8.0,<4.0.0
pip install seaborn>=0.13.0,<1.0.0
pip install wordcloud>=1.9.0,<2.0.0
echo.

REM Instalar scikit-learn
echo [6/10] Instalando scikit-learn...
pip install scikit-learn>=1.4.0,<2.0.0
echo.

REM Instalar NLTK
echo [7/10] Instalando NLTK...
pip install nltk>=3.8.1,<4.0.0
echo.

REM Instalar utilidades
echo [8/10] Instalando utilidades...
pip install openpyxl>=3.1.0,<4.0.0
pip install python-docx>=1.1.0,<2.0.0
pip install PyPDF2>=3.0.0,<4.0.0
pip install prettytable>=3.9.0,<4.0.0
pip install tqdm>=4.66.0,<5.0.0
echo.

REM Instalar Google APIs
echo [9/10] Instalando Google APIs...
pip install google-auth>=2.26.0,<3.0.0
pip install google-auth-oauthlib>=1.2.0,<2.0.0
pip install google-auth-httplib2>=0.2.0,<1.0.0
pip install google-api-python-client>=2.115.0,<3.0.0
echo.

REM Instalar detección de idiomas y documentos
echo [10/10] Instalando procesamiento de documentos...
pip install langdetect>=1.0.9,<2.0.0
pip install langid>=1.1.6,<2.0.0
pip install pdfplumber>=0.10.0,<1.0.0
pip install pdfminer.six>=20221105
pip install python-magic-bin>=0.4.14,<1.0.0
echo.

REM Instalar nuevas mejoras
echo [MEJORAS] Instalando nuevas dependencias...
pip install python-dotenv>=1.0.0,<2.0.0
echo.

REM Instalar testing (opcional)
echo [OPCIONAL] Instalando herramientas de testing...
pip install pytest>=7.4.0,<8.0.0
pip install pytest-cov>=4.1.0,<5.0.0
pip install pytest-mock>=3.12.0,<4.0.0
pip install mypy>=1.7.0,<2.0.0
pip install types-requests>=2.31.0
echo.

echo ====================================================================
echo INSTALACION BASICA COMPLETADA
echo ====================================================================
echo.
echo NOTA: spaCy, transformers y sentence-transformers NO se instalaron
echo porque requieren compilacion en Python 3.13.
echo.
echo Si necesitas estas librerias, tienes 2 opciones:
echo.
echo OPCION 1: Instalar con --no-build-isolation (puede fallar):
echo   pip install spacy --no-build-isolation
echo   pip install transformers sentence-transformers
echo.
echo OPCION 2: Usar Python 3.11 o 3.12 (RECOMENDADO):
echo   - Desinstalar Python 3.13
echo   - Instalar Python 3.11 o 3.12 desde python.org
echo   - Ejecutar nuevamente este script
echo.
echo ====================================================================
echo.

pause

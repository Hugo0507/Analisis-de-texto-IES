#!/bin/bash

echo "========================================"
echo "  Sistema de Análisis Transformación Digital"
echo "========================================"
echo ""

# Verificar si existe el entorno virtual
if [ ! -d "venv" ]; then
    echo "[ERROR] No se encontró el entorno virtual."
    echo "Por favor, ejecuta primero: python3 -m venv venv"
    echo "Y luego: source venv/bin/activate"
    echo "Y finalmente: pip install -r requirements.txt"
    exit 1
fi

echo "[1/3] Activando entorno virtual..."
source venv/bin/activate

echo "[2/3] Verificando instalación..."
python -c "import streamlit" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[ERROR] Streamlit no está instalado."
    echo "Instalando dependencias..."
    pip install -r requirements.txt
fi

echo "[3/3] Iniciando aplicación..."
echo ""
echo "La aplicación se abrirá en tu navegador en unos segundos..."
echo "Presiona Ctrl+C para detener el servidor."
echo ""

streamlit run app.py

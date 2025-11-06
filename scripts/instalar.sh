#!/bin/bash

echo "========================================"
echo "  Instalación del Sistema"
echo "========================================"
echo ""

echo "[1/4] Verificando Python..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python no está instalado."
    echo "Por favor, instala Python 3.8 o superior."
    exit 1
fi
python3 --version

echo ""
echo "[2/4] Creando entorno virtual..."
if [ -d "venv" ]; then
    echo "El entorno virtual ya existe. Saltando..."
else
    python3 -m venv venv
    echo "Entorno virtual creado exitosamente!"
fi

echo ""
echo "[3/4] Activando entorno virtual..."
source venv/bin/activate

echo ""
echo "[4/4] Instalando dependencias..."
echo "Esto puede tardar varios minutos..."
python -m pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "========================================"
echo "  Instalación completada!"
echo "========================================"
echo ""
echo "Para ejecutar la aplicación:"
echo "  1. Ejecuta: ./ejecutar.sh"
echo "  O manualmente:"
echo "  2. Activa el entorno: source venv/bin/activate"
echo "  3. Ejecuta: streamlit run app.py"
echo ""

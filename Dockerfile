# Dockerfile para despliegue de aplicación Streamlit
FROM python:3.11-slim-bookworm

# Instalar dependencias del sistema y limpiar en una sola capa
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY requirements.txt .

# Instalar dependencias Python sin cache y limpiar
RUN pip install --no-cache-dir -r requirements.txt \
    && pip cache purge

# Descargar solo modelos esenciales de spaCy y NLTK y limpiar
RUN python -m spacy download en_core_web_sm --no-cache-dir \
    && python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('stopwords', quiet=True); nltk.download('wordnet', quiet=True)" \
    && find /root/nltk_data -type f -name "*.zip" -delete \
    && find /usr/local/lib/python3.11/site-packages -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true \
    && find /usr/local/lib/python3.11/site-packages -type f -name "*.pyc" -delete \
    && find /usr/local/lib/python3.11/site-packages -type f -name "*.pyo" -delete

# Copiar código de la aplicación
COPY . .

# Exponer puerto
EXPOSE 8501

# Healthcheck
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health

# Comando de inicio
ENTRYPOINT ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]

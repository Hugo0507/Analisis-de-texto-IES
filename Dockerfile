FROM python:3.10-slim

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Crear un usuario para Hugging Face (requerido por seguridad)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Instalar pip más reciente primero
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Instalar PyTorch CPU-only EN CAPA PERMANENTE (antes de CACHEBUST)
# Esta capa NUNCA se invalidará, torch quedará cacheado para siempre
RUN pip install --no-cache-dir --default-timeout=1000 \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    torch==2.1.2+cpu torchvision==0.16.2+cpu

# Build arg to force rebuild (change this to break cache)
# TODO lo que viene después de esta línea se reconstruye en cada cambio
ARG CACHEBUST=2026-01-16-torch-before-cachebust
RUN echo "Cache bust: $CACHEBUST"

# Copiar requirements del backend (usar requirements-hf.txt para Hugging Face)
COPY --chown=user ./backend/requirements-hf.txt requirements.txt

# Instalar resto de dependencias (sin caché, usa torch ya instalado)
RUN pip install --no-cache-dir --default-timeout=1000 --upgrade -r requirements.txt

# Verificar que simplejwt está instalado
RUN pip list | grep simplejwt || echo "WARNING: simplejwt not found"

# Copiar código del backend
COPY --chown=user ./backend .

# Hacer ejecutable el script de startup
RUN chmod +x startup.sh

# IMPORTANTE: El puerto debe ser 7860 para Hugging Face
EXPOSE 7860

# Comando para ejecutar startup script (migraciones + superuser + gunicorn)
CMD ["bash", "startup.sh"]

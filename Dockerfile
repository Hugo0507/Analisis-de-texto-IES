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

# Copiar requirements del backend
COPY --chown=user ./backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copiar código del backend
COPY --chown=user ./backend .

# IMPORTANTE: El puerto debe ser 7860 para Hugging Face
EXPOSE 7860

# Comando para ejecutar Django con gunicorn en puerto 7860
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:7860", "--workers", "2"]

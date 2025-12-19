FROM python:3.10-slim

# Crear un usuario para Hugging Face (requerido por seguridad)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copiar archivos con permisos del usuario
COPY --chown=user ./requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY --chown=user . .

# IMPORTANTE: El puerto debe ser 7860
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "app:app"]

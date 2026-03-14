# ============================================================================
# Backend Dockerfile (Production-Ready)
# ============================================================================
# Multi-stage build for optimized and secure production image

# Stage 1: Base image with system dependencies
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get clean && apt-get update
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    gcc \
    g++ \
    libpq-dev \
    libmariadb-dev \
    libmariadb-dev-compat \
    pkg-config \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user (non-root for security)
RUN useradd -m -u 1000 django && \
    mkdir -p /app /var/log/django && \
    chown -R django:django /app /var/log/django

# Stage 2: Python dependencies
FROM base as dependencies

WORKDIR /app

# Copy requirements first (better layer caching)
COPY requirements.txt .

# Install Python dependencies
# 1. Herramientas básicas de compilación
RUN pip install --upgrade pip setuptools wheel cython

# 2. Pre-requisitos pesados para hdbscan y umap
RUN pip install --no-cache-dir numpy scipy

# 3. hdbscan por separado para asegurar que el compilador lo tome bien
RUN pip install --no-cache-dir hdbscan

# 4. Resto de dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy models for NER analysis (install directly via pip)
RUN pip install --no-cache-dir \
    https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl \
    https://github.com/explosion/spacy-models/releases/download/en_core_web_md-3.7.1/en_core_web_md-3.7.1-py3-none-any.whl \
    https://github.com/explosion/spacy-models/releases/download/en_core_web_lg-3.7.1/en_core_web_lg-3.7.1-py3-none-any.whl \
    https://github.com/explosion/spacy-models/releases/download/en_core_web_trf-3.7.3/en_core_web_trf-3.7.3-py3-none-any.whl

# Stage 3: Final production image
FROM base as production

WORKDIR /app

# Copy Python dependencies from previous stage
COPY --from=dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=dependencies /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=django:django . .

# Create necessary directories
RUN mkdir -p staticfiles mediafiles logs cache credentials && \
    chown -R django:django staticfiles mediafiles logs cache credentials

# Switch to non-root user
USER django

# Collect static files (ignore errors if settings not fully configured)
RUN python manage.py collectstatic --noinput --clear || true

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/ || exit 1

# Default command: Gunicorn for HTTP
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--worker-class", "gthread", \
     "--threads", "2", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]

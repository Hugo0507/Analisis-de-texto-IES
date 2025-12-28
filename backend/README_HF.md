---
title: Análisis IES Backend
emoji: 🎓
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Análisis de Transformación Digital - Backend API

Backend Django REST Framework para análisis NLP/ML de transformación digital en instituciones de educación superior.

## 🚀 Features

- **Pipeline NLP Completo**: 14 etapas de procesamiento automático
- **API RESTful**: 20+ endpoints documentados
- **WebSocket**: Monitoreo en tiempo real
- **Topic Modeling**: LDA, NMF, LSA, pLSA
- **Análisis de Factores**: 8 categorías de transformación digital
- **Triple Caché**: Redis + PostgreSQL + Google Drive

## 📊 API Endpoints

Una vez desplegado, accede a:

- **API Root**: `/api/v1/`
- **Swagger Docs**: `/api/docs/`
- **ReDoc**: `/api/redoc/`
- **Health Check**: `/api/v1/health/`

## 🛠️ Stack Tecnológico

- **Framework**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL (Hugging Face Spaces)
- **Cache**: Redis
- **NLP**: NLTK, spaCy
- **ML**: scikit-learn, gensim
- **WebSocket**: Django Channels
- **Server**: Gunicorn + Daphne

## 📖 Documentación

Para más información, visita el [repositorio principal](https://github.com/Hugo0507/Analisis-de-texto-IES).

## 🔗 Enlaces

- Frontend React: [https://huggingface.co/spaces/Hugo0507/analisis-ies](https://huggingface.co/spaces/Hugo0507/analisis-ies)
- Repositorio GitHub: [https://github.com/Hugo0507/Analisis-de-texto-IES](https://github.com/Hugo0507/Analisis-de-texto-IES)
- Documentación API: Disponible en `/api/docs/` una vez desplegado

## ⚙️ Variables de Entorno

Este space requiere las siguientes variables de entorno en Settings → Repository Secrets:

```bash
# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=huggingface.co,*.huggingface.co

# Database (PostgreSQL proporcionado por HF Spaces)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis (opcional, para caché)
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://huggingface.co
```

## 🚀 Uso

### Hacer una petición a la API

```python
import requests

# Health check
response = requests.get("https://Hugo0507-analisis-ies-backend.hf.space/api/v1/health/")
print(response.json())

# Subir documento
files = {"file": open("documento.pdf", "rb")}
response = requests.post(
    "https://Hugo0507-analisis-ies-backend.hf.space/api/v1/documents/upload/",
    files=files
)
print(response.json())
```

### Swagger UI

Visita `https://Hugo0507-analisis-ies-backend.hf.space/api/docs/` para explorar todos los endpoints de forma interactiva.

## 📝 Licencia

MIT License - Proyecto académico de investigación sobre transformación digital en educación superior.

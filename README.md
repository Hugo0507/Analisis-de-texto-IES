# Análisis de Transformación Digital en Educación Superior

Plataforma moderna de análisis NLP/ML para investigación académica sobre transformación digital en instituciones de educación superior.

## 🚀 Nueva Arquitectura (v4.0.0)

Este proyecto ha sido **completamente refactorizado** a una arquitectura moderna con **Clean Architecture**:

- ✅ **Backend**: Django REST Framework + Django Channels (WebSocket)
- ✅ **Frontend**: React + TypeScript + Tailwind CSS + Nivo
- ✅ **Base de Datos**: MySQL
- ✅ **Caché**: Redis (triple layer: Redis + MySQL + Google Drive)
- ✅ **Containerización**: Docker + Docker Compose

### 🎯 Características Principales

- **Pipeline NLP Completo**: 14 etapas de procesamiento automático
- **Análisis NLP Avanzado**: BoW, TF-IDF, Topic Modeling (LDA, NMF, LSA, pLSA)
- **Análisis de Factores**: 8 categorías de transformación digital
- **Monitoreo en Tiempo Real**: WebSocket para progreso del pipeline
- **Visualizaciones Profesionales**: Dashboards tipo Power BI con Nivo
- **API RESTful**: 20+ endpoints documentados con Swagger
- **Clean Architecture**: Separación completa Frontend/Backend

## ⚡ Inicio Rápido

### Usando Docker (Recomendado)

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd analisis_transformacion_digital

# Levantar todo el stack
docker-compose up --build
```

Accede a:
- **Frontend React**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/v1/
- **Swagger Docs**: http://localhost:8000/api/docs/
- **Django Admin**: http://localhost:8000/admin/

### Sin Docker

Ver guía completa: **[GUIA_EJECUCION.md](GUIA_EJECUCION.md)**

## 📊 Estado del Proyecto

**Versión:** 4.0.0 ([Ver Changelog](docs/CHANGELOG.md))
**Arquitectura:** Clean Architecture (Backend Django + Frontend React)
**Cobertura de Tests:** ~80%

### ✅ Completado

- [x] **Arquitectura Moderna**: Django REST + React TypeScript
- [x] **WebSocket**: Monitoreo en tiempo real del pipeline
- [x] **Pipeline NLP**: 14 etapas automatizadas
- [x] **API RESTful**: 20+ endpoints documentados
- [x] **Visualizaciones**: Dashboards profesionales con Nivo
- [x] **Testing**: Cobertura ~80%
- [x] **Docker**: Containerización completa
- [x] **Triple Caché**: Redis + MySQL + Google Drive

Ver progreso completo: [docs/progreso/](docs/progreso/)

## 📁 Estructura del Proyecto

```
analisis_transformacion_digital/
├── backend/                    # Django REST Framework
│   ├── apps/                   # Aplicaciones Django
│   │   ├── analysis/          # Análisis NLP y ML
│   │   ├── documents/         # Gestión de documentos
│   │   └── pipeline/          # Pipeline de procesamiento
│   ├── config/                # Configuración Django
│   ├── manage.py              # CLI de Django
│   └── requirements.txt       # Dependencias Python
│
├── frontend/                  # React + TypeScript
│   ├── src/                   # Código fuente React
│   │   ├── components/        # Componentes reutilizables
│   │   ├── pages/            # Páginas de la aplicación
│   │   ├── services/         # Servicios API
│   │   └── utils/            # Utilidades
│   └── package.json          # Dependencias Node
│
├── src/                      # Proyecto legacy (Streamlit)
│   ├── models/               # Modelos ML/NLP
│   └── utils/                # Utilidades compartidas
│
├── docs/                     # Documentación
│   ├── deployment/           # Guías de despliegue
│   ├── progreso/            # Fases completadas
│   └── estado/              # Estado del proyecto
│
├── docker-compose.yml        # Orquestación Docker
├── README.md                 # Este archivo
└── GUIA_EJECUCION.md        # Guía de ejecución
```

## 📚 Documentación

### 📖 Guías Principales

- **[⚡ Guía de Ejecución](GUIA_EJECUCION.md)** ⭐ **NUEVO** - Cómo ejecutar el proyecto (Docker y sin Docker)
- **[📚 Manual Técnico](docs/README_TECNICO.md)** - Arquitectura y guías técnicas detalladas
- **[📋 Changelog](docs/CHANGELOG.md)** - Historial de cambios del proyecto
- **[🚀 Inicio Rápido](docs/INICIO_RAPIDO.md)** - Guía de inicio rápido
- **[📖 Referencia Rápida](docs/REFERENCIA_RAPIDA.md)** - Comandos y referencias útiles

### Despliegue y DevOps
- **[🚀 Guías de Deployment](docs/deployment/)** - Deployment en Render, Vercel, Fly.io
- **[🐳 Docker Compose](docker-compose.yml)** - Configuración de contenedores
- **[📊 API Endpoints](backend/ENDPOINTS.md)** - Documentación de la API REST

### Desarrollo
- **[📝 Estado del Proyecto](docs/estado/)** - Estado actual y tareas pendientes
- **[📈 Progreso de Fases](docs/progreso/)** - Historial de fases completadas
- **[🧪 Testing](docs/testing/)** - Guías de testing y cobertura
- **[⚙️ Optimizaciones](docs/optimizaciones/)** - Mejoras de rendimiento y calidad

### Implementaciones Técnicas
- [Topic Modeling](docs/implementaciones/TOPIC_MODELING_COMPLETO.md)
- [Análisis N-Gram](docs/implementaciones/NGRAM_ANALYSIS_COMPLETO.md)
- [Clasificación de Textos](docs/implementaciones/CLASIFICACION_TEXTOS.md)
- [Reducción de Dimensionalidad](docs/implementaciones/REDUCCION_DIMENSIONALIDAD.md)

## 🛠️ Tecnologías

- **Python 3.11**
- **Streamlit** - Interface web
- **NLTK, spaCy** - Procesamiento de lenguaje natural
- **scikit-learn** - Machine learning
- **BERTopic** - Modelado de tópicos avanzado
- **Google Drive API** - Integración con Drive
- **pytest** - Testing
- **mypy** - Type checking

## 🧪 Testing

```bash
# Ejecutar todos los tests
pytest

# Con cobertura
pytest --cov=src --cov-report=html

# Tests específicos
pytest tests/test_text_preprocessor.py -v
```

**Estadísticas:**
- 98 tests implementados
- ~80% cobertura de código
- Tests unitarios e integración

Ver más: [docs/testing/README_TESTS.md](docs/testing/README_TESTS.md)

## 📊 Métricas de Calidad

| Aspecto | Puntuación |
|---------|-----------|
| Testing | 10/10 |
| Type Hints | 10/10 |
| Logging | 10/10 |
| Env Variables | 10/10 |
| NLTK Optimization | 10/10 |
| Cache System | 7/10 |
| Error Handling | 6/10 |
| **TOTAL** | **8.2/10** |

## 🤝 Contribuir

Ver [docs/arquitectura/ARQUITECTURA.md](docs/arquitectura/ARQUITECTURA.md) para entender la estructura del proyecto.

## 📝 Licencia

Este proyecto es parte de una investigación académica sobre transformación digital en instituciones educativas.

## 🔗 Enlaces Útiles

- **[Guía de Ejecución](GUIA_EJECUCION.md)** - Cómo ejecutar el proyecto
- **[Documentación completa](docs/)** - Toda la documentación
- **[API Endpoints](backend/ENDPOINTS.md)** - Documentación de la API
- **[Swagger Docs](http://localhost:8000/api/docs/)** - Documentación interactiva (cuando el backend esté corriendo)

---

## 🆕 Últimas Actualizaciones (v3.5.0 - 2025-11-09)

### 🎯 Sistema de Interpretaciones Guiadas para Gráficos

- ✅ **20+ gráficos** con interpretaciones detalladas en todos los módulos
- 📊 Interpretaciones contextuales para BERTopic (5 gráficos)
- 📊 Interpretaciones para Clasificación de Textos (4 gráficos + predicción)
- 📊 Interpretaciones para Reducción de Dimensionalidad (5 gráficos)
- 📊 Interpretaciones para Evaluación de Desempeño (6 gráficos)
- 🔧 Helper functions reutilizables: `show_chart_interpretation()` y `show_quick_interpretation()`
- 📈 Visualización de distribución de predicciones (gráfico de barras)

### 🐛 Correcciones y Mejoras

- ✅ Validación de DataFrames vacíos en BERTopic
- ✅ Corrección de métricas de clasificación (f1_score, average='weighted')
- ✅ Solución de errores en red de co-ocurrencia de factores
- ✅ Manejo robusto de estructuras de datos en caché
- ✅ Corrección de encoding UTF-8 en módulos UI

Ver detalles completos en [CHANGELOG.md](CHANGELOG.md)

---

**Última actualización:** 2025-11-09
**Versión:** 3.5.0

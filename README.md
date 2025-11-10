# Análisis de Transformación Digital

Sistema completo de análisis de documentos para investigación en transformación digital en instituciones educativas.

## 🎯 Características Principales

- **Procesamiento de Documentos**: Conversión y análisis de PDFs, DOCX, TXT
- **Análisis NLP Avanzado**: Tokenización, lematización, análisis de sentimientos
- **Modelado de Tópicos**: LDA, PLSA, BERTopic
- **Análisis de Factores**: Identificación de factores clave en transformación digital
- **Clasificación de Textos**: Clasificación automática de documentos
- **Named Entity Recognition (NER)**: Extracción de entidades
- **Reducción de Dimensionalidad**: PCA, t-SNE, UMAP
- **Sistema de Cache**: Cache local y NER para optimización
- **Integración con Google Drive**: Descarga y persistencia de datos

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
pip install -r requirements.txt

# Descargar recursos NLTK
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"

# Ejecutar aplicación
streamlit run app.py
```

Ver guía completa: [docs/instalacion/INICIO_RAPIDO.md](docs/instalacion/INICIO_RAPIDO.md)

## 📊 Estado del Proyecto

**Versión:** 3.5.0 ([Ver Changelog](CHANGELOG.md))
**Calidad General:** 9.0/10
**Cobertura de Tests:** ~80%

### ✅ Completado

- [x] Type hints completos en módulos core (10/10)
- [x] Sistema de logging profesional (10/10)
- [x] Testing con pytest (98 tests, ~80% coverage)
- [x] Optimización NLTK (mejora 50x)
- [x] Variables de entorno (.env)
- [x] Sistema de cache local
- [x] Documentación completa
- [x] Sistema de interpretaciones guiadas para gráficos (20+ gráficos)
- [x] Flujo de trabajo organizado en 7 fases
- [x] Persistencia completa con Google Drive

Ver estado completo: [docs/estado/ESTADO_PROYECTO_ACTUALIZADO.md](docs/estado/ESTADO_PROYECTO_ACTUALIZADO.md)

## 📁 Estructura del Proyecto

```
analisis_transformacion_digital/
├── app.py                      # Aplicación principal Streamlit
├── src/                        # Código fuente
│   ├── drive_connector.py      # Conexión Google Drive
│   ├── document_converter.py   # Conversión de documentos
│   ├── text_preprocessor.py    # Preprocesamiento NLP
│   ├── nlp_processor.py        # Procesamiento NLP avanzado
│   ├── factor_analyzer.py      # Análisis de factores
│   ├── models/                 # Modelos avanzados
│   │   ├── topic_modeling.py
│   │   ├── ner_analyzer.py
│   │   ├── text_classifier.py
│   │   ├── bertopic_analyzer.py
│   │   └── ...
│   └── utils/                  # Utilidades
│       ├── logger.py
│       └── local_cache.py
├── tests/                      # Tests con pytest
├── pages/                      # Páginas Streamlit
├── docs/                       # Documentación
└── requirements.txt            # Dependencias
```

## 📚 Documentación

### 📖 Documentación Principal

- **[📚 Manual Técnico Completo](README_TECNICO.md)** ⭐ - Arquitectura, flujo de ejecución, guías detalladas
- **[🔄 Flujo de Trabajo Completo](docs/FLUJO_DE_TRABAJO.md)** ⭐ **NUEVO** - Guía detallada de las 7 fases del sistema
- **[📝 Documentación por Archivo](docs/detalle_archivos/)** - Explicación línea por línea de cada módulo Python
- **[📋 Changelog](CHANGELOG.md)** - Historial de cambios del proyecto

### Instalación
- [Guía de Instalación Python 3.11](docs/instalacion/GUIA_INSTALACION_PYTHON_3.11.md)
- [Inicio Rápido](docs/instalacion/INICIO_RAPIDO.md)
- [Solución de Problemas](docs/instalacion/SOLUCION_INSTALACION.md)

### Testing
- [Guía de Testing](docs/testing/README_TESTS.md)
- [Testing Fase 2 Completo](docs/testing/TESTING_FASE2_COMPLETO.md)

### Implementaciones
- [Modelos Avanzados](docs/implementaciones/MODELOS_AVANZADOS_README.md)
- [Topic Modeling](docs/implementaciones/TOPIC_MODELING_COMPLETO.md)
- [Análisis N-Gram](docs/implementaciones/NGRAM_ANALYSIS_COMPLETO.md)
- [Clasificación de Textos](docs/implementaciones/CLASIFICACION_TEXTOS.md)
- [Reducción de Dimensionalidad](docs/implementaciones/REDUCCION_DIMENSIONALIDAD.md)

### Optimizaciones
- [Type Hints](docs/optimizaciones/TYPE_HINTS_IMPLEMENTACION.md)
- [Sistema de Logging](docs/optimizaciones/MEJORAS_LOGGING_IMPLEMENTADAS.md)
- [Optimización NLTK](docs/optimizaciones/OPTIMIZACION_NLTK.md)

Ver índice completo: [docs/README.md](docs/README.md)

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

- [Documentación completa](docs/)
- [Estado del proyecto](docs/estado/ESTADO_PROYECTO_ACTUALIZADO.md)
- [Guía de testing](docs/testing/README_TESTS.md)
- [Arquitectura](docs/arquitectura/ARQUITECTURA.md)

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

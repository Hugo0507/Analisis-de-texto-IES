# 🧪 Sistema de Testing - Análisis Transformación Digital

**Fecha de creación:** 2025-10-25
**Framework:** pytest
**Cobertura objetivo:** 60%+

---

## 📋 Tabla de Contenidos

1. [Instalación](#instalación)
2. [Ejecutar Tests](#ejecutar-tests)
3. [Estructura de Tests](#estructura-de-tests)
4. [Fixtures Disponibles](#fixtures-disponibles)
5. [Markers y Categorías](#markers-y-categorías)
6. [Mocks y Stubs](#mocks-y-stubs)
7. [Coverage Report](#coverage-report)
8. [Mejores Prácticas](#mejores-prácticas)
9. [Troubleshooting](#troubleshooting)

---

## 🚀 Instalación

Las dependencias de testing ya están en `requirements.txt`:

```bash
# Instalar todas las dependencias incluyendo testing
pip install -r requirements.txt

# O solo las dependencias de testing
pip install pytest pytest-cov pytest-mock
```

---

## ▶️ Ejecutar Tests

### Comandos Básicos

```bash
# Ejecutar TODOS los tests
pytest

# Ejecutar con output verbose
pytest -v

# Ejecutar con coverage
pytest --cov=src --cov-report=html

# Ejecutar un archivo específico
pytest tests/test_nlp_processor.py

# Ejecutar un test específico
pytest tests/test_nlp_processor.py::test_limpiar_texto_basico

# Detener en el primer fallo
pytest -x

# Mostrar print statements
pytest -s

# Ejecutar tests en paralelo (requiere pytest-xdist)
pytest -n auto
```

### Por Categoría (Markers)

```bash
# Solo tests unitarios
pytest -m unit

# Solo tests de integración
pytest -m integration

# Solo tests de NLP
pytest -m nlp

# Excluir tests lentos
pytest -m "not slow"

# Combinar markers
pytest -m "unit and nlp"
```

### Coverage Detallado

```bash
# Generar reporte HTML (abre en browser)
pytest --cov=src --cov-report=html
# Luego abrir: htmlcov/index.html

# Generar reporte en terminal con líneas faltantes
pytest --cov=src --cov-report=term-missing

# Coverage de un módulo específico
pytest --cov=src.nlp_processor tests/test_nlp_processor.py
```

---

## 📁 Estructura de Tests

```
tests/
├── __init__.py                      # Paquete de tests
├── conftest.py                      # Fixtures compartidos (⭐ IMPORTANTE)
├── test_nlp_processor.py            # Tests de procesamiento NLP
├── test_text_preprocessor.py        # Tests de preprocesamiento
├── test_drive_connector.py          # Tests de Google Drive (con mocks)
├── test_factor_analyzer.py          # Tests de análisis de factores
├── test_models/                     # Tests de modelos ML
│   ├── __init__.py
│   ├── test_ner_analysis.py
│   ├── test_topic_modeling.py
│   ├── test_classification.py
│   └── test_dimensionality_reduction.py
└── integration/                     # Tests de integración end-to-end
    ├── __init__.py
    └── test_full_pipeline.py
```

---

## 🎯 Fixtures Disponibles

Los fixtures están definidos en `tests/conftest.py` y disponibles automáticamente.

### Fixtures de Datos

| Fixture | Descripción | Tipo |
|---------|-------------|------|
| `sample_text` | Texto en inglés de ejemplo | str |
| `sample_text_spanish` | Texto en español de ejemplo | str |
| `sample_text_with_noise` | Texto con URLs, emails, números | str |
| `multiple_documents` | Dict de múltiples documentos | dict |
| `sample_dataframe` | DataFrame de pandas | pd.DataFrame |
| `sample_bow_matrix` | Matriz BoW de ejemplo | np.ndarray |
| `sample_vocabulary` | Vocabulario de ejemplo | list |

### Fixtures de Mocks

| Fixture | Descripción |
|---------|-------------|
| `mock_google_drive_service` | Mock completo de Google Drive API |
| `mock_drive_connector` | GoogleDriveConnector con mocks |
| `mock_nltk_resources` | Simula recursos NLTK instalados |
| `mock_spacy_model` | Mock de modelo spaCy |

### Fixtures de Archivos

| Fixture | Descripción |
|---------|-------------|
| `temp_dir` | Directorio temporal | Path |
| `sample_pdf_file` | Archivo PDF de prueba | Path |
| `sample_txt_file` | Archivo TXT de prueba | Path |
| `sample_csv_file` | Archivo CSV de prueba | Path |

### Fixtures de Helpers

| Fixture | Descripción |
|---------|-------------|
| `assert_almost_equal` | Compara arrays numpy | function |
| `assert_dataframe_equal` | Compara DataFrames | function |

### Ejemplo de Uso

```python
import pytest

def test_example(sample_text, mock_nltk_resources):
    """Usa fixtures automáticamente"""
    # sample_text y mock_nltk_resources están disponibles
    assert len(sample_text) > 0
```

---

## 🏷️ Markers y Categorías

Los markers permiten categorizar y filtrar tests.

### Markers Disponibles

```python
@pytest.mark.unit           # Test unitario (función individual)
@pytest.mark.integration    # Test de integración (múltiples componentes)
@pytest.mark.slow           # Test que toma mucho tiempo (>5s)
@pytest.mark.drive          # Requiere conexión a Google Drive
@pytest.mark.nlp            # Test de procesamiento NLP
@pytest.mark.ml             # Test de machine learning
@pytest.mark.smoke          # Test de humo (verificación básica)
@pytest.mark.regression     # Test de regresión
```

### Uso de Markers

```python
import pytest

@pytest.mark.unit
def test_simple_function():
    """Test unitario simple"""
    assert 1 + 1 == 2

@pytest.mark.integration
@pytest.mark.nlp
def test_full_pipeline():
    """Test de integración para pipeline NLP"""
    # ...

@pytest.mark.slow
@pytest.mark.ml
def test_model_training():
    """Test que toma mucho tiempo"""
    # ...
```

---

## 🎭 Mocks y Stubs

### Mockear Google Drive

```python
def test_with_drive_mock(mock_google_drive_service):
    """Test que usa mock de Google Drive"""
    # El servicio ya está mockeado
    files = mock_google_drive_service.files().list().execute()
    assert 'files' in files
```

### Mockear NLTK

```python
def test_without_downloading_nltk(mock_nltk_resources):
    """Test que no descarga recursos NLTK"""
    from src.nlp_processor import ProcessadorTexto

    # No descargará recursos porque mock_nltk_resources los simula
    procesador = ProcessadorTexto()
```

### Mockear Funciones Específicas

```python
from unittest.mock import patch, MagicMock

def test_with_custom_mock():
    """Test con mock personalizado"""
    with patch('src.nlp_processor.word_tokenize') as mock_tokenize:
        mock_tokenize.return_value = ['token1', 'token2']

        # Tu código aquí
        result = some_function()

        # Verificar que se llamó
        mock_tokenize.assert_called_once()
```

---

## 📊 Coverage Report

### Interpretar el Reporte

Después de ejecutar `pytest --cov=src --cov-report=html`, abre `htmlcov/index.html`.

```
Name                          Stmts   Miss  Cover   Missing
-----------------------------------------------------------
src/nlp_processor.py            150     15    90%    45-48, 67-70
src/text_preprocessor.py        200     30    85%    120-135, 180-190
src/drive_connector.py          100     40    60%    50-80
-----------------------------------------------------------
TOTAL                           450     85    81%
```

**Interpretación:**
- **Stmts:** Total de líneas de código
- **Miss:** Líneas no cubiertas por tests
- **Cover:** Porcentaje de cobertura
- **Missing:** Números de línea sin coverage

### Objetivo de Cobertura

| Módulo | Objetivo Mínimo | Estado Actual |
|--------|-----------------|---------------|
| nlp_processor.py | 80% | ✅ Implementado |
| text_preprocessor.py | 80% | ✅ Implementado |
| drive_connector.py | 60% | ⏳ En progreso |
| factor_analyzer.py | 70% | ⏳ En progreso |
| models/* | 60% | ⏳ Pendiente |
| **TOTAL** | **60%** | **⏳ En progreso** |

---

## 📚 Mejores Prácticas

### 1. Estructura AAA (Arrange-Act-Assert)

```python
def test_example():
    # Arrange: Preparar datos
    procesador = ProcessadorTexto()
    texto = "Sample text"

    # Act: Ejecutar acción
    resultado = procesador.limpiar_texto(texto)

    # Assert: Verificar resultado
    assert resultado == "sample text"
```

### 2. Un Test, Una Cosa

```python
# ❌ MAL: Test que verifica múltiples cosas
def test_everything():
    assert limpiar_texto("ABC") == "abc"
    assert tokenizar("ABC") == ["abc"]
    assert stemming("running") == "run"

# ✅ BIEN: Tests separados
def test_limpiar_texto_lowercase():
    assert limpiar_texto("ABC") == "abc"

def test_tokenizar_basico():
    assert tokenizar("ABC") == ["abc"]

def test_stemming_running():
    assert stemming("running") == "run"
```

### 3. Nombres Descriptivos

```python
# ❌ MAL
def test_1():
    ...

# ✅ BIEN
def test_limpiar_texto_remove_urls():
    ...

def test_procesar_texto_completo_con_stemming_activado():
    ...
```

### 4. Tests Independientes

```python
# ❌ MAL: Tests que dependen entre sí
resultado_global = None

def test_primero():
    global resultado_global
    resultado_global = procesar_texto("test")

def test_segundo():
    assert resultado_global is not None  # Depende de test_primero

# ✅ BIEN: Tests independientes
def test_primero():
    resultado = procesar_texto("test")
    assert resultado is not None

def test_segundo():
    resultado = procesar_texto("test")
    assert resultado is not None
```

### 5. Usar Fixtures para Setup Repetitivo

```python
# ❌ MAL: Setup repetido
def test_uno():
    procesador = ProcessadorTexto(idioma='english')
    # ...

def test_dos():
    procesador = ProcessadorTexto(idioma='english')
    # ...

# ✅ BIEN: Usar fixture
@pytest.fixture
def procesador():
    return ProcessadorTexto(idioma='english')

def test_uno(procesador):
    # ...

def test_dos(procesador):
    # ...
```

---

## 🐛 Troubleshooting

### Problema: Tests lentos

**Solución:**
```bash
# Identificar tests lentos
pytest --durations=10

# Marcar tests lentos
@pytest.mark.slow
def test_long_running():
    ...

# Ejecutar sin tests lentos
pytest -m "not slow"
```

### Problema: Imports no encontrados

**Solución:**
```bash
# Asegurarse de que pytest encuentra el código
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# O agregar a pytest.ini:
# [pytest]
# pythonpath = .
```

### Problema: Fixtures no disponibles

**Solución:**
- Verificar que `conftest.py` está en `tests/`
- Verificar que `tests/__init__.py` existe
- Reiniciar pytest

### Problema: Mocks no funcionan

**Solución:**
```python
# Asegurarse de mockear el path correcto
# ❌ MAL
with patch('nltk.download'):
    ...

# ✅ BIEN
with patch('src.nlp_processor.nltk.download'):
    ...
```

### Problema: Coverage no se genera

**Solución:**
```bash
# Instalar pytest-cov
pip install pytest-cov

# Verificar que pytest.ini tiene configuración correcta
# [pytest]
# addopts = --cov=src --cov-report=html
```

---

## 📈 Próximos Pasos

### Fase 1: Tests Básicos (ACTUAL)
- [x] Configuración de pytest
- [x] Fixtures compartidos
- [x] Tests para nlp_processor.py
- [x] Tests para text_preprocessor.py
- [ ] Tests para drive_connector.py
- [ ] Tests para factor_analyzer.py

### Fase 2: Tests de Modelos
- [ ] Tests para NER Analysis
- [ ] Tests para Topic Modeling
- [ ] Tests para Classification
- [ ] Tests para Dimensionality Reduction

### Fase 3: Tests de Integración
- [ ] Pipeline completo end-to-end
- [ ] Tests de performance
- [ ] Tests de regresión

### Fase 4: CI/CD
- [ ] GitHub Actions para ejecutar tests
- [ ] Coverage automático
- [ ] Pre-commit hooks

---

## 🎯 Checklist de Calidad

Antes de hacer commit:

- [ ] Todos los tests pasan (`pytest`)
- [ ] Coverage > 60% (`pytest --cov=src`)
- [ ] No hay warnings (`pytest --strict-markers`)
- [ ] Tests tienen nombres descriptivos
- [ ] Tests son independientes
- [ ] Mocks están correctamente configurados
- [ ] Documentación de tests actualizada

---

## 📞 Soporte

¿Problemas con los tests?

1. Revisar este README
2. Verificar logs en `logs/app.log`
3. Ejecutar con `-v` para más información
4. Revisar `htmlcov/index.html` para coverage detallado

---

**Última actualización:** 2025-10-25
**Próxima revisión:** Después de implementar todos los tests básicos

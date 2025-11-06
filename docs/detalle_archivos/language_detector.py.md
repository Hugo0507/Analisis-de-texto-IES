# 📄 Documentación Detallada: `language_detector.py`

## 📍 Ubicación
```
C:\Projects\Tesis\analisis_transformacion_digital\src\language_detector.py
```

## 🎯 Propósito
Este archivo es el **detector automático de idiomas** del proyecto. Identifica en qué idioma está escrito un documento (español, inglés, portugués, etc.) usando dos librerías diferentes. Esto es crucial para:
- Filtrar documentos por idioma
- Aplicar procesamiento específico según el idioma
- Generar estadísticas multilingües

Puede detectar **más de 30 idiomas diferentes** con alta precisión.

## 🔄 Flujo de Ejecución
```
INICIO
  ↓
1. INICIALIZACIÓN
   - Configurar langdetect (seed=0 para consistencia)
   - Cargar mapeo de códigos a nombres
   ↓
2. DETECTAR IDIOMA
   ├─ Método langdetect (default)
   │  - Analizar texto
   │  - Calcular probabilidades
   │  - Retornar idioma + confianza
   │
   └─ Método langid (alternativo)
      - Clasificar texto
      - Retornar idioma + confianza
   ↓
3. PROCESAMIENTO BATCH
   - Detectar idioma en múltiples documentos
   - Generar estadísticas
   ↓
4. FILTRADO Y ANÁLISIS
   - Filtrar por idioma específico
   - Separar documentos por idioma
   - Crear distribución de idiomas
   ↓
FIN
```

## 📚 Librerías Utilizadas

### Líneas 6-12: Importaciones
```python
import langdetect
from langdetect import detect, detect_langs, LangDetectException
import langid
import pandas as pd
from collections import Counter
from typing import Dict, List, Any, Optional
from src.utils.logger import get_logger
```

**¿Qué hace cada librería?**

- **`langdetect`**: Librería principal de detección de idiomas
  - **Dónde se usa**: Líneas 24, 88-95 (detección)
  - **Para qué**: Detectar idioma con alta precisión
  - **Basada en**: Perfiles de idioma de Google

- **`langid`**: Librería alternativa de detección
  - **Dónde se usa**: Línea 107 (método alternativo)
  - **Para qué**: Segunda opción si langdetect falla
  - **Ventaja**: Más rápida, menor memoria

- **`Counter`**: Conteo de frecuencias
  - **Dónde se usa**: Líneas 220-221 (estadísticas)
  - **Para qué**: Contar documentos por idioma

## 🔧 Clase Principal: `LanguageDetector`

### Clase: `LanguageDetector`
**Líneas 18-373**

Clase que detecta idiomas en textos y documentos.

**Atributos principales:**
- `language_names`: Diccionario con 35 idiomas (líneas 27-64)
  - Mapea códigos ISO a nombres completos
  - Ejemplos: 'es' → 'Español', 'en' → 'Inglés'

**Métodos principales (11 métodos):**

#### 1. **Detección Individual**
- `detect_language()`: Detecta idioma de un texto (líneas 66-131)
  - Soporta dos métodos: langdetect y langid
  - Retorna código, nombre y confianza

- `detect_language_from_file()`: Detecta idioma de archivo (líneas 133-161)

#### 2. **Detección Batch**
- `detect_languages_batch()`: Múltiples textos (líneas 163-187)
- `detect_languages_from_files()`: Múltiples archivos (líneas 189-207)

#### 3. **Estadísticas**
- `create_language_statistics()`: Estadísticas completas (líneas 209-253)
- `create_detection_dataframe()`: DataFrame con resultados (líneas 255-275)
- `get_language_distribution()`: Distribución de idiomas (líneas 320-344)

#### 4. **Filtrado**
- `filter_by_language()`: Filtra por idioma(s) (líneas 277-296)
- `separate_by_language()`: Separa por idioma (líneas 298-318)

#### 5. **Validación**
- `validate_detection()`: Valida idioma esperado (líneas 346-372)

**Cómo funciona `detect_language()`:**

```python
def detect_language(self, text, method='langdetect'):
    # 1. Validar texto mínimo
    if len(text.strip()) < 10:
        return {'language_code': 'unknown', ...}

    # 2. Detectar con método elegido
    if method == 'langdetect':
        lang_code = detect(text)              # 'es'
        langs_prob = detect_langs(text)       # [es:0.99, en:0.01]

        # Encontrar confianza
        for lang_prob in langs_prob:
            if lang_prob.lang == lang_code:
                confidence = lang_prob.prob   # 0.99
                break

    # 3. Convertir código a nombre
    language_name = self.language_names.get(lang_code)  # 'Español'

    return {
        'language_code': lang_code,      # 'es'
        'language_name': language_name,  # 'Español'
        'confidence': confidence,        # 0.99
        'method': method                 # 'langdetect'
    }
```

## 💡 Conceptos Clave para Principiantes

### 1. **¿Cómo detecta el idioma?**
Las librerías usan **modelos estadísticos** entrenados con millones de textos:
- Analizan frecuencia de letras, bigramas, trigramas
- Comparan con perfiles de idiomas conocidos
- Asignan probabilidades a cada idioma

### 2. **¿Qué es "confianza" (confidence)?**
Es la certeza del modelo sobre su predicción:
```
0.99 = 99% seguro de que es ese idioma (alta confianza)
0.60 = 60% seguro (confianza media, podría ser otro)
0.30 = 30% seguro (baja confianza, texto muy corto)
```

### 3. **¿Por qué dos métodos (langdetect vs langid)?**
Cada uno tiene ventajas:
```
langdetect:
  ✓ Más preciso
  ✓ Más idiomas soportados
  ✗ Más lento

langid:
  ✓ Más rápido
  ✓ Menor uso de memoria
  ✗ Menos idiomas
```

### 4. **¿Por qué `seed = 0`?**
```python
langdetect.DetectorFactory.seed = 0
```
langdetect usa aleatoriedad interna. El seed garantiza **resultados consistentes**:
```
Sin seed: Mismo texto puede dar diferentes resultados
Con seed=0: Mismo texto siempre da el mismo resultado
```

### 5. **Códigos de idioma ISO 639-1**
```
'es' = Español
'en' = Inglés
'pt' = Portugués
'fr' = Francés
'de' = Alemán
```
Son códigos internacionales estándar de 2 letras.

### 6. **¿Qué pasa con textos muy cortos?**
```python
if len(text.strip()) < 10:
    return {'language_code': 'unknown', ...}
```
Textos muy cortos no tienen suficiente información para detectar el idioma.

### 7. **Estadísticas de idiomas**
```python
stats = detector.create_language_statistics(results)

# Retorna:
{
    'total_documents': 100,
    'languages_detected': 3,
    'by_language': {
        'Español': {
            'count': 70,
            'percentage': 70.0,
            'avg_confidence': 0.98
        },
        'Inglés': {
            'count': 25,
            'percentage': 25.0,
            'avg_confidence': 0.95
        },
        'Portugués': {
            'count': 5,
            'percentage': 5.0,
            'avg_confidence': 0.92
        }
    },
    'most_common': ('Español', 70)
}
```

### 8. **Uso típico**
```python
# 1. Crear detector
detector = LanguageDetector()

# 2. Detectar idioma de un texto
resultado = detector.detect_language(
    text="Este es un texto en español",
    method='langdetect'
)
# → {'language_code': 'es', 'language_name': 'Español',
#    'confidence': 0.99, 'method': 'langdetect'}

# 3. Procesar múltiples documentos
textos = {
    'doc1': 'This is English',
    'doc2': 'Esto es español',
    'doc3': 'Ceci est français'
}
resultados = detector.detect_languages_batch(textos)

# 4. Filtrar solo documentos en español
solo_espanol = detector.filter_by_language(resultados, 'es')

# 5. Obtener estadísticas
stats = detector.create_language_statistics(resultados)
```

## 🔗 Dependencias de Otros Archivos

### Archivos que ESTE archivo IMPORTA:
```
→ src/utils/logger.py (línea 12) - Para logging
```

### Archivos que USAN este archivo:
```
→ components/pages/deteccion_idiomas.py (página de detección de idiomas)
→ Cualquier análisis que necesite filtrar por idioma
```

## 🔍 Resumen

**`language_detector.py`** es responsable de:
✅ Detectar automáticamente el idioma de textos
✅ Soportar 2 métodos de detección (langdetect, langid)
✅ Identificar más de 30 idiomas diferentes
✅ Calcular confianza de la detección
✅ Procesar múltiples documentos en batch
✅ Generar estadísticas de distribución de idiomas
✅ Filtrar documentos por idioma específico
✅ Separar documentos por idioma
✅ Validar idioma esperado vs detectado

**Flujo simplificado:**
```
1. Recibir texto → 2. Detectar idioma con método elegido →
3. Calcular confianza → 4. Mapear código a nombre →
5. Retornar resultado
```

**Para modificar:**
- **Agregar idioma**: Añadir a `language_names` (líneas 27-64)
- **Cambiar método default**: Modificar parámetro `method` en línea 66
- **Ajustar texto mínimo**: Cambiar condición en línea 77

**Archivo**: `language_detector.py`
**Líneas de código**: 373
**Complejidad**: Baja-Media (⭐⭐⭐)
**Importancia**: ⭐⭐⭐⭐ (Importante - filtrado por idioma)

---

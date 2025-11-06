# 📄 Documentación Detallada: `document_converter.py`

## 📍 Ubicación
```
C:\Projects\Tesis\analisis_transformacion_digital\src\document_converter.py
```

## 🎯 Propósito
Este archivo es el **convertidor universal de documentos** del proyecto. Su misión es transformar documentos en diferentes formatos (PDF, DOCX, TXT) a texto plano que pueda ser procesado por los módulos de NLP.

Implementa **tres métodos diferentes para extraer texto de PDFs**, garantizando la máxima tasa de éxito incluso con PDFs difíciles.

## 🔄 Flujo de Ejecución
```
INICIO
  ↓
1. IDENTIFICAR FORMATO
   - Detectar extensión del archivo
   - Verificar si es soportado
   ↓
2. SELECCIONAR MÉTODO DE CONVERSIÓN
   ├─ PDF → Intentar pdfminer.six
   │        ↓ (si falla)
   │        Intentar PyPDF2
   │        ↓ (si falla)
   │        Intentar pdfplumber
   │
   ├─ DOCX → python-docx (párrafos + tablas)
   │
   └─ TXT → Lectura directa
   ↓
3. EXTRAER TEXTO
   - Aplicar método correspondiente
   - Validar que hay contenido
   ↓
4. GUARDAR O RETORNAR
   - Si se especifica output_path → Guardar en disco
   - Si no → Retornar texto en resultado
   ↓
5. ACTUALIZAR ESTADÍSTICAS
   - Contar exitosos/fallidos
   - Registrar errores
   ↓
FIN
```

## 📚 Librerías Utilizadas

### Líneas 6-13: Importaciones
```python
import os
import pandas as pd
from docx import Document
import PyPDF2
import pdfplumber
from pdfminer.high_level import extract_text
from collections import defaultdict
from src.utils.logger import get_logger
```

**¿Qué hace cada librería?**

- **`python-docx` (import docx)**: Lee archivos DOCX
  - **Dónde se usa**: Líneas 180, 249 (extraer texto de Word)
  - **Para qué**: Leer documentos de Microsoft Word

- **`PyPDF2`**: Librería PDF (método 2)
  - **Dónde se usa**: Líneas 80, 137 (extracción PDF)
  - **Para qué**: Alternativa para PDFs estándar

- **`pdfplumber`**: Librería PDF avanzada (método 3)
  - **Dónde se usa**: Líneas 97, 155 (extracción PDF)
  - **Para qué**: Último recurso para PDFs difíciles

- **`pdfminer.high_level.extract_text`**: Extractor PDF robusto (método 1)
  - **Dónde se usa**: Líneas 70, 127 (extracción PDF)
  - **Para qué**: Método principal, más preciso

## 🔧 Clase Principal: `DocumentConverter`

### Clase: `DocumentConverter`
**Líneas 19-541**

Clase que maneja conversión de documentos a texto plano.

**Atributos principales:**
- `supported_formats`: Diccionario de formatos soportados (líneas 24-29)
- `conversion_stats`: Estadísticas de conversiones (líneas 31-37)

**Métodos principales (15 métodos):**

#### 1. **Conversión por Formato**
- `convert_txt()`: Lee archivos de texto (líneas 39-54)
- `convert_pdf()`: Convierte PDF con 3 métodos (líneas 56-109)
- `convert_pdf_from_bytes()`: Convierte PDF desde memoria (líneas 111-167)
- `convert_docx()`: Convierte DOCX (líneas 169-200)
- `convert_doc()`: Rechaza DOC (no soportado) (líneas 202-213)

#### 2. **Conversión Unificada**
- `convert_file()`: Convierte cualquier archivo (líneas 284-350)
- `convert_from_bytes()`: Convierte desde BytesIO (líneas 215-282)

#### 3. **Procesamiento Batch**
- `convert_batch()`: Convierte múltiples archivos (líneas 352-385)

#### 4. **Estadísticas y Reportes**
- `get_conversion_statistics()`: Obtiene estadísticas (líneas 387-404)
- `create_conversion_report()`: Reporte detallado (líneas 406-428)
- `create_format_summary()`: Resumen por formato (líneas 430-464)
- `get_failed_conversions()`: Lista de fallos (líneas 466-487)

#### 5. **Validación**
- `validate_text_extraction()`: Valida extracción (líneas 499-540)
- `reset_statistics()`: Reinicia estadísticas (líneas 489-497)

**Estrategia de 3 niveles para PDFs:**

```python
def convert_pdf(self, file_path):
    # 1. Intentar pdfminer.six (más robusto)
    try:
        text = extract_text(file_path)
        if text and text.strip():
            return text
    except:
        # 2. Intentar PyPDF2
        try:
            # Código PyPDF2...
            return text
        except:
            # 3. Intentar pdfplumber (último recurso)
            # Código pdfplumber...
            return text
```

**¿Por qué 3 métodos?**
Cada librería PDF tiene fortalezas diferentes:
- **pdfminer.six**: Mejor para PDFs con texto complejo
- **PyPDF2**: Rápido para PDFs simples
- **pdfplumber**: Bueno para PDFs con tablas

## 💡 Conceptos Clave para Principiantes

### 1. **¿Qué es conversión a texto plano?**
Tomar un documento formateado y extraer solo el texto:

```
PDF/DOCX:           Texto plano:
┌─────────────┐     "Este es el contenido
│ Este es el  │     del documento sin
│ contenido   │  →  formato ni imágenes"
│ [imagen]    │
└─────────────┘
```

### 2. **¿Por qué necesitamos convertir?**
Los algoritmos de NLP solo entienden texto plano, no PDFs formateados.

### 3. **Diferencia entre `convert_file()` y `convert_from_bytes()`**
```
convert_file():
  - Archivo está en disco
  - Lee desde ruta (ej: "C:/docs/file.pdf")

convert_from_bytes():
  - Archivo está en memoria
  - Lee desde BytesIO (descargado de Drive)
  - ¡Más rápido! No usa disco
```

### 4. **¿Qué son las estadísticas de conversión?**
El conversor lleva la cuenta de éxitos y fallos:

```python
conversion_stats = {
    'total': 100,
    'successful': 95,
    'failed': 5,
    'by_format': {
        '.pdf': {'success': 45, 'failed': 2},
        '.docx': {'success': 50, 'failed': 3}
    }
}
```

### 5. **¿Cómo extraer texto de tablas en DOCX?**
```python
# Párrafos
for paragraph in doc.paragraphs:
    text += paragraph.text + "\n"

# Tablas (¡importante!)
for table in doc.tables:
    for row in table.rows:
        for cell in row.cells:
            text += cell.text + " "
```

### 6. **Validación de texto extraído**
```python
# Verificar que:
# 1. La conversión fue exitosa
if not result['success']:
    return False

# 2. Hay suficiente texto
if text_length < min_length:
    return False
```

### 7. **Uso típico**
```python
# 1. Crear conversor
converter = DocumentConverter()

# 2. Convertir un archivo
result = converter.convert_file(
    file_path="documento.pdf",
    output_path="documento.txt"
)

# 3. Verificar resultado
if result['success']:
    print(f"✓ Convertido: {result['text_length']} caracteres")
else:
    print(f"✗ Error: {result['error']}")

# 4. Ver estadísticas
stats = converter.get_conversion_statistics()
print(f"Tasa de éxito: {stats['success_rate']}%")
```

## 🔗 Dependencias de Otros Archivos

### Archivos que ESTE archivo IMPORTA:
```
→ src/utils/logger.py (línea 13) - Para logging
```

### Archivos que USAN este archivo:
```
→ components/pages/conversion_txt.py (convierte PDFs a TXT)
→ Cualquier módulo que necesite extraer texto de documentos
```

## 🔍 Resumen

**`document_converter.py`** es responsable de:
✅ Convertir PDF, DOCX, TXT a texto plano
✅ Implementar 3 métodos de extracción de PDF (fallback automático)
✅ Extraer texto de párrafos y tablas en DOCX
✅ Convertir desde archivo en disco o BytesIO (memoria)
✅ Llevar estadísticas de conversiones
✅ Generar reportes detallados de conversiones
✅ Validar que el texto extraído sea válido
✅ Manejar errores gracefully

**Flujo simplificado:**
```
1. Recibir documento → 2. Detectar formato →
3. Aplicar método apropiado → 4. Validar texto →
5. Guardar o retornar → 6. Actualizar estadísticas
```

**Para modificar:**
- **Agregar formato**: Añadir método `convert_xxx()` y registrar en `supported_formats`
- **Cambiar prioridad de PDFs**: Reordenar try-except en `convert_pdf()` (líneas 68-108)
- **Ajustar validación**: Modificar `validate_text_extraction()` (líneas 499-540)

**Archivo**: `document_converter.py`
**Líneas de código**: 541
**Complejidad**: Media-Alta (⭐⭐⭐⭐)
**Importancia**: ⭐⭐⭐⭐⭐ (Crítico - única forma de leer documentos)

---

# 📖 Guía de Uso del Sistema

Esta guía te ayudará a aprovechar al máximo todas las funcionalidades del sistema.

## 🎯 Objetivo del Sistema

El sistema analiza documentos relacionados con transformación digital en instituciones de educación superior e identifica automáticamente **8 factores clave**:

1. **Tecnológico** - Infraestructura y herramientas digitales
2. **Organizacional** - Cultura y estructura institucional
3. **Humano** - Capacitación y desarrollo del personal
4. **Estratégico** - Planeación y visión institucional
5. **Financiero** - Presupuesto e inversión
6. **Pedagógico** - Metodologías de enseñanza
7. **Infraestructura** - Conectividad y acceso
8. **Seguridad** - Ciberseguridad y protección de datos

## 🚀 Inicio Rápido

### 1. Ejecutar la Aplicación

```bash
# Activar entorno virtual
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Ejecutar
streamlit run app.py
```

### 2. Navegar por la Interfaz

La aplicación tiene 6 secciones principales en el menú lateral:

- 🏠 **Inicio**: Información del sistema
- 📝 **Cargar Documentos**: Agrega tus textos
- 🔍 **Análisis de Factores**: Analiza los factores detectados
- 📈 **Visualizaciones**: Gráficos interactivos
- ☁️ **Nube de Palabras**: Palabras más frecuentes
- 📊 **Estadísticas Avanzadas**: Análisis profundo

## 📝 Sección 1: Cargar Documentos

### Opción A: Texto Directo

Ideal para textos cortos o pruebas rápidas.

1. Haz clic en la pestaña **"📄 Texto Directo"**
2. Ingresa un nombre descriptivo (ej: "Plan_Digital_2024")
3. Pega o escribe tu texto en el área de texto
4. Haz clic en **"➕ Agregar Documento"**

**Ejemplo de texto**:
```
La universidad implementó una nueva plataforma digital
de aprendizaje para mejorar la experiencia educativa.
La capacitación docente fue fundamental para el éxito
de esta transformación tecnológica.
```

### Opción B: Cargar Archivo

Ideal para documentos completos.

1. Haz clic en la pestaña **"📁 Archivo"**
2. Haz clic en **"Browse files"**
3. Selecciona tu archivo .txt
4. Opcionalmente modifica el nombre
5. Haz clic en **"📥 Cargar Archivo"**

**Nota**: Solo archivos .txt son soportados actualmente.

### Opción C: Ver Documentos Cargados

1. Haz clic en la pestaña **"📋 Documentos Cargados"**
2. Expande cualquier documento para ver su contenido
3. Usa el botón **"🗑️ Eliminar"** para quitar documentos individuales
4. Usa **"🗑️ Eliminar Todos"** para limpiar todo

## 🔍 Sección 2: Análisis de Factores

Esta es la sección principal del sistema.

### Realizar Análisis

1. Asegúrate de tener al menos un documento cargado
2. Haz clic en **"🚀 Realizar Análisis"**
3. Espera unos segundos mientras el sistema procesa

### Interpretar Resultados

#### Resumen General

Muestra tres métricas clave:
- **Total Documentos**: Cantidad de documentos analizados
- **Factor Más Mencionado**: Factor con más menciones
- **Factor Menos Mencionado**: Factor con menos menciones

#### Tabla de Factores

| Factor | Total Menciones | Promedio por Documento | Descripción |
|--------|----------------|------------------------|-------------|
| Tecnológico | 45 | 15.0 | Aspectos relacionados con... |

**Interpretación**:
- **Total Menciones**: Suma de todas las menciones en todos los documentos
- **Promedio por Documento**: Menciones / número de documentos
- Un promedio alto indica que ese factor es recurrente

#### Análisis por Documento

Cada documento tiene su propio gráfico de barras mostrando:
- Qué factores están presentes
- Cuántas veces se menciona cada factor
- Comparación visual entre factores

**Ejemplo de interpretación**:
- Si "Tecnológico" tiene 20 menciones y "Financiero" tiene 2, indica que el documento se enfoca más en aspectos técnicos que económicos.

## 📈 Sección 3: Visualizaciones

Presenta los datos en múltiples formatos visuales.

### Gráfico de Barras Horizontal

Muestra todos los factores ordenados por número de menciones.

**Cómo leerlo**:
- Factores en el eje Y
- Número de menciones en el eje X
- Colores más oscuros = más menciones

**Interactividad**:
- Pasa el mouse sobre las barras para ver valores exactos
- Haz zoom con la rueda del mouse
- Descarga el gráfico con el botón de la cámara

### Gráfico de Pastel

Muestra la proporción de cada factor respecto al total.

**Cuándo usarlo**:
- Para ver la distribución porcentual
- Para identificar qué factores dominan el corpus

**Ejemplo**: Si "Pedagógico" ocupa 40% del pastel, significa que 4 de cada 10 menciones son sobre ese factor.

### Mapa de Calor de Co-ocurrencia

**¿Qué es?**: Muestra qué factores aparecen juntos en los mismos documentos.

**Cómo leerlo**:
- Colores más cálidos (rojos/naranjas) = alta co-ocurrencia
- Colores más fríos (amarillos/blancos) = baja co-ocurrencia
- La diagonal siempre es más oscura (cada factor co-ocurre consigo mismo)

**Ejemplo de uso**:
Si "Tecnológico" y "Pedagógico" tienen alta co-ocurrencia, indica que los documentos que mencionan tecnología también mencionan aspectos pedagógicos.

## ☁️ Sección 4: Nube de Palabras

Visualización artística de las palabras más frecuentes.

### Seleccionar Documento

- **"Todos los documentos"**: Analiza el corpus completo
- **Documento específico**: Analiza solo ese documento

### Interpretar la Nube

- **Tamaño de la palabra**: Proporcional a su frecuencia
- **Palabras más grandes**: Más importantes/frecuentes
- **Colores**: Decorativos (no tienen significado específico)

### Tabla de Frecuencias

Debajo de la nube encontrarás:
- Top 20 palabras más frecuentes
- Número exacto de ocurrencias
- Gráfico de barras complementario

**Uso práctico**:
Si ves "estudiante", "plataforma", "digital" como palabras grandes, sabes que el documento se centra en herramientas digitales para estudiantes.

## 📊 Sección 5: Estadísticas Avanzadas

Análisis técnico más profundo.

### Estadísticas de Procesamiento

**Métricas incluidas**:
- **Total Palabras**: Cantidad de palabras después de limpiar el texto
- **Palabras Únicas**: Cantidad de palabras diferentes
- **Riqueza Léxica**: (Únicas/Total) × 100

**Interpretación**:
- Riqueza léxica alta (>50%): Vocabulario diverso, textos académicos
- Riqueza léxica baja (<30%): Vocabulario repetitivo

### Topic Modeling (LDA)

**¿Qué hace?**: Identifica temas ocultos en los documentos usando algoritmos de machine learning.

**Configuración**:
- Usa el slider para seleccionar número de temas (2-5)
- Más temas = división más específica
- Menos temas = agrupación más general

**Interpretar Temas**:
- Cada tema tiene 10 palabras principales
- Palabras relacionadas indican la temática del tema
- Ejemplo:
  - **Tema 1**: "digital", "plataforma", "sistema", "tecnología" → Tema sobre infraestructura digital
  - **Tema 2**: "estudiante", "aprendizaje", "docente", "evaluación" → Tema sobre pedagogía

**Limitaciones**:
- Se necesitan al menos 2 documentos
- Funciona mejor con 5+ documentos
- Los temas son generados automáticamente y pueden requerir interpretación

### Comparación entre Documentos

Gráfico de barras agrupadas que compara métricas entre diferentes documentos.

**Uso**:
- Identifica qué documento es más extenso
- Compara diversidad de vocabulario
- Detecta documentos con características similares

## 💡 Consejos y Mejores Prácticas

### Preparación de Documentos

✅ **Hacer**:
- Usa texto en español
- Asegura que el texto esté bien formateado
- Usa documentos de al menos 200 palabras
- Nombra tus documentos descriptivamente

❌ **Evitar**:
- Textos con muchos símbolos especiales
- Documentos muy cortos (<50 palabras)
- Mezclar idiomas
- Nombres de archivo genéricos como "doc1", "doc2"

### Cantidad de Documentos

- **1-2 documentos**: Análisis básico, estadísticas individuales
- **3-5 documentos**: Análisis comparativo funciona bien
- **6-10 documentos**: Topic modeling más preciso
- **10+ documentos**: Clustering y análisis avanzado más significativo

### Interpretación de Resultados

1. **Empieza con el Análisis de Factores**: Te da una visión general
2. **Usa Visualizaciones**: Para entender proporciones y relaciones
3. **Consulta la Nube de Palabras**: Para confirmar intuiciones
4. **Profundiza con Estadísticas Avanzadas**: Para insights técnicos

### Casos de Uso Comunes

#### Caso 1: Analizar un Plan Institucional

1. Carga el documento del plan
2. Realiza análisis de factores
3. Identifica qué áreas (factores) están más presentes
4. Genera nube de palabras para presentación
5. Exporta gráficos (clic derecho → guardar imagen)

#### Caso 2: Comparar Múltiples Planes

1. Carga varios planes de diferentes universidades
2. Realiza análisis comparativo
3. Observa el mapa de calor de co-ocurrencia
4. Usa estadísticas avanzadas para métricas cuantitativas
5. Identifica patrones comunes con topic modeling

#### Caso 3: Revisión de Literatura

1. Carga extractos de artículos académicos
2. Identifica qué factores son más investigados
3. Usa topic modeling para encontrar líneas de investigación
4. Exporta tablas y gráficos para tu tesis

## 🎨 Personalización

### Modificar Factores Analizados

Edita el archivo `src/factor_analyzer.py`, línea ~20:

```python
self.categorias_factores = {
    'MiNuevoFactor': {
        'keywords': ['palabra1', 'palabra2', 'palabra3'],
        'descripcion': 'Descripción de mi factor'
    },
    # ... otros factores
}
```

### Cambiar Idioma

Edita `config.py`:

```python
IDIOMA = 'english'  # Cambia de 'spanish' a 'english'
```

**Nota**: Deberás ajustar las stopwords y keywords también.

## 📤 Exportar Resultados

### Exportar Gráficos

1. Pasa el mouse sobre cualquier gráfico de Plotly
2. Haz clic en el ícono de cámara (esquina superior derecha)
3. El gráfico se descarga como PNG

### Copiar Datos

1. Haz clic en cualquier tabla
2. Selecciona las filas
3. Copia y pega en Excel/Google Sheets

### Guardar Análisis

Actualmente no hay función de guardar sesiones. Recomendaciones:
- Toma capturas de pantalla de resultados importantes
- Exporta gráficos individuales
- Copia tablas a hojas de cálculo

## ❓ Preguntas Frecuentes

**P: ¿Cuántos documentos puedo cargar?**
R: No hay límite estricto, pero el rendimiento puede disminuir con 50+ documentos.

**P: ¿Puedo usar archivos Word o PDF?**
R: Actualmente solo .txt. Deberás convertir tus documentos primero.

**P: ¿Los datos se guardan en algún lado?**
R: No, todo se procesa en tu máquina localmente. Al cerrar la aplicación, los datos se pierden.

**P: ¿Puedo analizar textos en inglés?**
R: Sí, pero deberás modificar la configuración de idioma y las keywords de los factores.

**P: ¿Cómo puedo mejorar la precisión del análisis?**
R: Usa documentos más largos y específicos. Personaliza las keywords en `factor_analyzer.py`.

## 🆘 Obtener Ayuda

Si tienes problemas:

1. Revisa la sección de Solución de Problemas en `INSTALACION.md`
2. Verifica que tus documentos estén en formato correcto
3. Consulta los logs en la terminal
4. Revisa el README principal

---

¡Disfruta analizando tus documentos de transformación digital! 🎓

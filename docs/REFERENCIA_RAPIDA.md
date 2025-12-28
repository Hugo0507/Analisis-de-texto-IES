# 🚀 Referencia Rápida

## ⚡ Inicio Rápido (Windows)

```bash
# Instalación (solo una vez)
instalar.bat

# Ejecutar la aplicación
ejecutar.bat
```

## ⚡ Inicio Rápido (Linux/Mac)

```bash
# Dar permisos de ejecución (solo una vez)
chmod +x instalar.sh ejecutar.sh

# Instalación (solo una vez)
./instalar.sh

# Ejecutar la aplicación
./ejecutar.sh
```

## 📦 Instalación Manual

```bash
# 1. Crear entorno virtual
python -m venv venv

# 2. Activar entorno virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Ejecutar aplicación
streamlit run app.py
```

## 📂 Estructura del Proyecto

```
analisis_transformacion_digital/
├── app.py                    # Aplicación principal ⭐
├── config.py                 # Configuración
├── requirements.txt          # Dependencias
├── README.md                 # Documentación principal
├── INSTALACION.md           # Guía de instalación detallada
├── GUIA_USO.md              # Guía de uso completa
├── REFERENCIA_RAPIDA.md     # Este archivo
├── ejecutar.bat/.sh         # Scripts de ejecución
├── instalar.bat/.sh         # Scripts de instalación
├── src/
│   ├── nlp_processor.py     # Procesamiento NLP
│   └── factor_analyzer.py   # Análisis de factores
└── data/
    ├── ejemplo_1.txt        # Documento de ejemplo 1
    ├── ejemplo_2.txt        # Documento de ejemplo 2
    └── ejemplo_3.txt        # Documento de ejemplo 3
```

## 🎯 Factores Analizados

| # | Factor | Incluye |
|---|--------|---------|
| 1 | Tecnológico | Infraestructura, plataformas, herramientas |
| 2 | Organizacional | Cultura, estructura, liderazgo |
| 3 | Humano | Capacitación, competencias |
| 4 | Estratégico | Planeación, visión, objetivos |
| 5 | Financiero | Presupuesto, inversión |
| 6 | Pedagógico | Metodologías de enseñanza |
| 7 | Infraestructura | Conectividad, acceso |
| 8 | Seguridad | Ciberseguridad, protección |

## 🔧 Comandos Útiles

### Gestión de Entorno Virtual

```bash
# Activar
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/Mac

# Desactivar
deactivate

# Eliminar y recrear
rmdir /s venv                  # Windows
rm -rf venv                    # Linux/Mac
python -m venv venv
```

### Gestión de Paquetes

```bash
# Actualizar pip
python -m pip install --upgrade pip

# Instalar todos los paquetes
pip install -r requirements.txt

# Ver paquetes instalados
pip list

# Actualizar un paquete específico
pip install --upgrade streamlit
```

### Streamlit

```bash
# Ejecutar en puerto específico
streamlit run app.py --server.port 8502

# Ejecutar sin abrir navegador
streamlit run app.py --server.headless true

# Ver configuración
streamlit config show

# Limpiar caché
streamlit cache clear
```

## 📊 Workflow Típico

```
1. Cargar Documentos
   ├─ Texto directo
   ├─ Archivo .txt
   └─ Verificar en "Documentos Cargados"

2. Análisis de Factores
   ├─ Clic en "Realizar Análisis"
   ├─ Ver resumen general
   └─ Revisar análisis por documento

3. Visualizaciones
   ├─ Gráfico de barras (menciones totales)
   ├─ Gráfico de pastel (distribución)
   └─ Mapa de calor (co-ocurrencias)

4. Nube de Palabras
   ├─ Seleccionar documento o "Todos"
   └─ Ver palabras más frecuentes

5. Estadísticas Avanzadas
   ├─ Métricas de procesamiento
   ├─ Topic modeling (LDA)
   └─ Comparación entre documentos
```

## 🎨 Personalización Rápida

### Cambiar Factores Analizados

Edita `src/factor_analyzer.py` línea 20:

```python
'NuevoFactor': {
    'keywords': ['palabra1', 'palabra2'],
    'descripcion': 'Descripción del factor'
}
```

### Cambiar Idioma

Edita `config.py`:

```python
IDIOMA = 'english'  # o 'spanish'
```

### Cambiar Colores

Edita `config.py`:

```python
COLOR_SCHEME = 'Reds'  # o 'Blues', 'Greens', etc.
COLORMAP_WORDCLOUD = 'plasma'  # o 'viridis', 'magma'
```

## 🐛 Solución de Problemas

| Problema | Solución |
|----------|----------|
| `python` no funciona | Usa `python3` (Linux/Mac) o agrega Python al PATH |
| Error al instalar paquetes | `pip install --upgrade pip` luego reintenta |
| Puerto 8501 ocupado | `streamlit run app.py --server.port 8502` |
| Error de NLTK | `python -c "import nltk; nltk.download('all')"` |
| Archivo no se carga | Verifica que sea .txt con encoding UTF-8 |
| Aplicación lenta | Reduce número de documentos o longitud |

## 📝 Formatos Soportados

| Formato | Soportado | Cómo Usar |
|---------|-----------|-----------|
| .txt | ✅ Sí | Carga directamente |
| .docx | ❌ No | Copia el texto y pégalo |
| .pdf | ❌ No | Copia el texto y pégalo |
| .csv | ❌ No | Extrae columna de texto |

## 🔑 Atajos de Teclado

### En Streamlit

- `R` - Recargar la aplicación
- `Ctrl+C` - Detener el servidor (en terminal)
- `Ctrl+Shift+R` - Limpiar caché y recargar (navegador)

### En Gráficos Plotly

- Arrastrar - Pan (mover)
- Scroll - Zoom
- Doble clic - Reset zoom
- Clic en leyenda - Mostrar/ocultar serie

## 💾 Exportar Resultados

### Gráficos
1. Pasa mouse sobre gráfico
2. Clic en ícono de cámara
3. Se descarga como PNG

### Tablas
1. Selecciona filas
2. Ctrl+C (copiar)
3. Pega en Excel/Sheets

### Nube de Palabras
1. Clic derecho en la imagen
2. "Guardar imagen como..."

## 📱 URLs Útiles

- **Aplicación Local**: http://localhost:8501
- **Puerto Alternativo**: http://localhost:8502
- **Documentación Streamlit**: https://docs.streamlit.io/
- **Documentación NLTK**: https://www.nltk.org/

## 🆘 Recursos de Ayuda

1. **README.md** - Documentación completa
2. **INSTALACION.md** - Guía de instalación detallada
3. **GUIA_USO.md** - Manual de usuario completo
4. **data/** - Documentos de ejemplo para probar

## ⚙️ Configuración Avanzada

### Variables en config.py

```python
MAX_PALABRAS_NUBE = 100       # Palabras en nube
TOP_N_PALABRAS = 20           # Top palabras frecuentes
N_CLUSTERS_DEFAULT = 3        # Clusters en K-Means
N_TOPICS_DEFAULT = 5          # Temas en LDA
MIN_PALABRA_LENGTH = 3        # Longitud mínima palabra
```

## 📊 Interpretación de Métricas

### Riqueza Léxica
- **> 60%**: Vocabulario muy diverso
- **40-60%**: Vocabulario moderadamente diverso
- **< 40%**: Vocabulario repetitivo

### Co-ocurrencia
- **> 10**: Factores muy relacionados
- **5-10**: Factores moderadamente relacionados
- **< 5**: Factores poco relacionados

### Relevancia de Factor
- **> 5.0**: Factor muy relevante en documento
- **2.0-5.0**: Factor moderadamente relevante
- **< 2.0**: Factor poco relevante

## 🎓 Casos de Uso

### Análisis Individual
```
1 documento → Análisis exploratorio
- Identificar factores presentes
- Ver palabras clave
- Generar visualizaciones básicas
```

### Análisis Comparativo
```
2-5 documentos → Comparación
- Comparar énfasis en diferentes factores
- Ver patrones comunes
- Identificar diferencias
```

### Análisis de Corpus
```
6+ documentos → Análisis avanzado
- Topic modeling confiable
- Clustering de documentos
- Análisis de tendencias
```

## ✅ Checklist Pre-Presentación

- [ ] Aplicación ejecutándose sin errores
- [ ] Documentos de ejemplo cargados
- [ ] Análisis realizado exitosamente
- [ ] Todas las visualizaciones funcionando
- [ ] Gráficos exportados si es necesario
- [ ] Entiendes cómo interpretar cada sección
- [ ] Navegador en modo presentación (F11)

## 🎯 Tips para Demos

1. Usa los documentos de ejemplo primero
2. Navega de izquierda a derecha en el menú
3. Explica cada visualización antes de mostrarla
4. Ten gráficos pre-exportados como respaldo
5. Prepara respuestas para "¿qué factor es X?"

---

**¿Necesitas más ayuda?**
- Consulta README.md para documentación completa
- Revisa GUIA_USO.md para instrucciones detalladas
- Mira INSTALACION.md si hay problemas técnicos

# 📝 Historial de Cambios (Changelog)

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

---

## [3.1.0] - 2025-11-06

### 🐛 Corregido

#### Error de carga del modelo spaCy (OSError [E050])

**Problema**: El modelo `en_core_web_sm` de spaCy se descargaba correctamente pero no se podía cargar inmediatamente, causando el error:
```
OSError: [E050] Can't find model 'en_core_web_sm'
```

**Solución**:
- Modificado `src/models/ner_analyzer.py` en el método `load_model()`
- Ahora usa `sys.executable` en lugar de `'python'` para ejecutar el comando de descarga con el intérprete correcto del entorno virtual
- Agregado `importlib.reload(spacy)` después de la descarga para recargar el módulo
- Mejorado el manejo de errores con mensajes más descriptivos
- Si la descarga es exitosa pero la carga falla, se pide al usuario reiniciar la aplicación

**Impacto**: Los usuarios pueden usar la página "🤖 Análisis NER" sin errores. Si aparece el error, basta con reiniciar la aplicación.

**Commit**: Mejora en descarga e instalación de modelos spaCy

---

#### Warnings de Plotly sobre parámetros deprecados

**Problema**: Al mostrar gráficos de Plotly aparecían warnings constantemente:
```
WARNING: The keyword arguments have been deprecated and will be removed in a future release. Use `config` instead.
```

**Solución**:
- Reemplazado `width='stretch'` por `use_container_width=True` en todas las llamadas a `st.plotly_chart()`
- Total de **150 reemplazos** en **11 archivos**

**Archivos modificados**:
- `components/pages/preprocesamiento.py` (7 reemplazos)
- `components/pages/estadisticas_archivos.py` (6 reemplazos)
- `components/pages/deteccion_idiomas.py` (9 reemplazos)
- `components/pages/bolsa_palabras.py` (5 reemplazos)
- `components/pages/analisis_tfidf.py` (8 reemplazos)
- `components/pages/models/ner_analysis.py` (28 reemplazos)
- `components/pages/models/topic_modeling_page.py` (19 reemplazos)
- `components/pages/models/ngram_analysis_page.py` (16 reemplazos)
- `components/pages/models/bertopic_page.py` (11 reemplazos)
- `components/pages/models/classification_page.py` (12 reemplazos)
- `components/pages/models/dimensionality_reduction_page.py` (29 reemplazos)

**Impacto**: Los gráficos se muestran sin warnings, mejorando la experiencia del usuario.

**Commit**: Actualización de parámetros de Plotly en todas las páginas

---

#### Warning de página desconocida

**Problema**: Al hacer clic en "🤖 Modelos Avanzados" en el menú, aparecía el warning:
```
WARNING - Página desconocida: 🤖 Modelos Avanzados
```

**Solución**:
- Modificado `app.py` para manejar separadores del menú
- Agregado caso en el routing (líneas 202-215) para `"🤖 Modelos Avanzados"`, `"---"`, y `None`
- Ahora muestra una página de bienvenida con información del proyecto cuando se seleccionan estos elementos

**Impacto**: El menú funciona correctamente sin warnings. Los separadores muestran contenido útil en lugar de generar errores.

**Commit**: Corregido routing para manejar separadores del menú

---

### 📚 Documentación

- Actualizado `README_TECNICO.md` con sección de "Solución de Problemas" ampliada
- Agregadas soluciones para los 3 errores corregidos en esta versión
- Actualizado historial de cambios en `README_TECNICO.md`
- Creado `CHANGELOG.md` para seguimiento detallado de cambios

---

## [3.0.0] - 2025-11-05

### ✨ Nuevas Funcionalidades

#### Documentación Técnica Completa

- **📚 README_TECNICO.md**: Manual técnico completo de 1200+ líneas
  - Arquitectura del proyecto explicada con diagramas
  - Estructura de carpetas detallada
  - Flujo de ejecución en 10 etapas
  - Documentación de 65+ dependencias
  - Guías de instalación y uso
  - Sistema de logging y caché explicado
  - Solución de problemas comunes

- **📝 Documentación detallada por archivo**: 36 archivos Python documentados
  - `docs/detalle_archivos/` con documentación línea por línea
  - Explicaciones para principiantes en Python
  - Diagramas de flujo de ejecución
  - Conceptos clave explicados
  - Ejemplos de entrada/salida

**Archivos documentados**:
- `app.py.md` - Punto de entrada principal (221 líneas)
- `config.py.md` - Sistema de configuración (123 líneas)
- `preprocesamiento.py.md` - Preprocesamiento de textos (596 líneas)
- 33 archivos adicionales con documentación consolidada

#### Índices de Navegación

- `docs/detalle_archivos/README.md` - Guía de la documentación
- `docs/INDICE_DOCUMENTACION.md` - Índice de todos los documentos
- `docs/RESUMEN_DOCUMENTACION.md` - Resumen ejecutivo

---

### 🏗️ Arquitectura

- Consolidada arquitectura modular en 6 capas
- Separación clara de responsabilidades
- Sistema de componentes UI mejorado
- Patrón de diseño consistente en todas las páginas

---

### 🎯 Cobertura

- **100% de archivos Python documentados** (36/36)
- Documentación en español
- Formato Markdown para GitHub
- Diseñado para principiantes y desarrolladores avanzados

---

## Tipos de Cambios

Este proyecto usa los siguientes tipos de cambios:

- ✨ **Nuevas Funcionalidades** (`Added`): Nuevas características o funcionalidades
- 🔧 **Cambios** (`Changed`): Cambios en funcionalidades existentes
- 🗑️ **Eliminado** (`Deprecated`): Funcionalidades que serán eliminadas próximamente
- ❌ **Removido** (`Removed`): Funcionalidades eliminadas
- 🐛 **Corregido** (`Fixed`): Corrección de bugs
- 🔒 **Seguridad** (`Security`): Corrección de vulnerabilidades de seguridad
- 📚 **Documentación** (`Documentation`): Cambios en documentación

---

## Enlaces

- [Repositorio GitHub](https://github.com/Hugo0507/Analisis-de-texto-IES)
- [README Principal](README.md)
- [Manual Técnico](README_TECNICO.md)
- [Documentación Detallada](docs/detalle_archivos/)

---

**Mantenido por**: Equipo de Análisis de Transformación Digital
**Última actualización**: 2025-11-06

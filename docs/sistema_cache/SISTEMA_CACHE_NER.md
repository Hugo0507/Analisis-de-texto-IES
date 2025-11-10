# Sistema de Caché Automático para Análisis NER

## Descripción General

El análisis NER ahora incluye un **sistema de caché automático** que guarda los resultados del procesamiento para evitar tener que re-ejecutar el análisis completo en cada sesión.

## ¿Cómo Funciona?

### Primera Ejecución
1. Ejecutas el análisis NER por primera vez
2. El sistema procesa todos los documentos (puede tomar varios minutos)
3. **Automáticamente guarda** los resultados en caché local
4. Muestra el mensaje: "💾 GUARDANDO ANÁLISIS EN CACHÉ"

### Ejecuciones Posteriores
1. Ejecutas el análisis NER nuevamente
2. El sistema **detecta automáticamente** el caché existente
3. **Carga instantáneamente** todos los resultados sin procesar
4. Muestra el mensaje: "✓ ANÁLISIS CARGADO DESDE CACHÉ"

## Ubicación del Caché

Los archivos de caché se guardan en:
```
C:\Projects\Tesis\analisis_transformacion_digital\cache\ner_analysis_cache\
├── ner_metadata.json     # Información del análisis
└── ner_results.pkl       # Resultados completos
```

## Información del Caché

El caché incluye:
- **Fecha y hora** del análisis
- **Número de documentos** procesados
- **Total de caracteres** analizados
- **Todos los resultados** del análisis NER:
  - Entidades identificadas
  - Análisis geográfico
  - Análisis temporal
  - Co-ocurrencias
  - Métricas de diversidad
  - Estadísticas de entidades

## Interfaz en la Aplicación

### Indicador de Caché
En la pestaña "⚙️ Configuración" verás:

**Si existe caché:**
```
✓ Caché encontrado
- Fecha: 2025-10-18 14:30:45
- Documentos: 150
- Caracteres procesados: 2,456,789

El análisis se cargará automáticamente desde el caché sin necesidad de re-procesar.
```

**Si no existe caché:**
No se muestra ningún mensaje especial.

### Opciones Disponibles

1. **▶️ Ejecutar Análisis NER**
   - Si hay caché: carga instantáneamente
   - Si no hay caché: procesa todo desde cero

2. **🔄 Forzar re-procesamiento (ignorar caché)**
   - Checkbox para volver a procesar todo
   - Útil cuando:
     - Agregaste nuevos documentos
     - Cambiaste de modelo de SpaCy
     - Quieres actualizar el análisis

3. **🗑️ Limpiar Caché**
   - Elimina el caché existente
   - Solo aparece si hay caché guardado

## Casos de Uso

### Caso 1: Análisis Diario Normal
```
Usuario ejecuta análisis → Carga desde caché → Resultados instantáneos
```

### Caso 2: Agregar Nuevos Documentos
```
1. Marca "Forzar re-procesamiento"
2. Ejecuta análisis
3. Procesa todo (incluye nuevos docs)
4. Guarda nuevo caché
```

### Caso 3: Cambiar Modelo de SpaCy
```
1. Selecciona nuevo modelo (ej: lg en vez de sm)
2. Marca "Forzar re-procesamiento"
3. Ejecuta análisis
4. Guarda nuevo caché con resultados del nuevo modelo
```

### Caso 4: Problemas con el Caché
```
1. Usa botón "Limpiar Caché"
2. Ejecuta análisis nuevamente
3. Se genera caché nuevo
```

## Ventajas del Sistema

✅ **Velocidad**: Carga instantánea en ejecuciones posteriores
✅ **Automático**: No requiere configuración manual
✅ **Transparente**: Mensajes claros de qué está haciendo
✅ **Flexible**: Opción para forzar re-procesamiento cuando sea necesario
✅ **Persistente**: Los resultados se mantienen entre sesiones

## Código Relevante

### Archivos Principales
- `src/models/ner_cache.py` - Gestor de caché
- `src/models/ner_analyzer.py` - Analizador con soporte de caché
- `components/pages/models/ner_analysis.py` - Interfaz de usuario

### Uso Programático

```python
from src.models.ner_analyzer import NERAnalyzer

# Inicializar con caché habilitado (por defecto)
analyzer = NERAnalyzer(use_cache=True)

# Primera ejecución: procesa y guarda
results = analyzer.analyze_corpus(texts_dict)

# Segunda ejecución: carga desde caché
results = analyzer.analyze_corpus(texts_dict)

# Forzar re-procesamiento
results = analyzer.analyze_corpus(texts_dict, force_recompute=True)
```

### Gestión Manual del Caché

```python
from src.models.ner_cache import NERCache

cache = NERCache()

# Verificar si existe caché
if cache.cache_exists():
    print("Caché disponible")

# Obtener información
info = cache.get_cache_info()
print(f"Documentos: {info['document_count']}")

# Cargar resultados
results = cache.load_analysis()

# Limpiar caché
cache.clear_cache()
```

## Notas Técnicas

- El caché usa `pickle` para serialización eficiente
- Los metadatos se guardan en JSON para fácil lectura
- El sistema es compatible con documentos de cualquier tamaño
- No hay límite en el número de documentos que puede cachear
- El caché es local y no se sincroniza automáticamente con Drive

## Próximas Mejoras

Posibles mejoras futuras:
- [ ] Sincronización automática con Google Drive
- [ ] Detección automática de cambios en documentos
- [ ] Múltiples cachés por configuración de modelo
- [ ] Compresión de archivos de caché
- [ ] TTL (Time To Live) configurable para expiración automática

## Soporte

Si encuentras problemas con el caché:
1. Usa el botón "Limpiar Caché"
2. Reinicia la aplicación
3. Verifica que la carpeta `cache/` tenga permisos de escritura
4. Si persiste, elimina manualmente la carpeta `cache/ner_analysis_cache/`

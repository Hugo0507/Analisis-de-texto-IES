# 🚀 Sistema de Caché Automático para NER - Guía Rápida

## ¿Qué cambió?

El análisis NER ahora **guarda automáticamente** los resultados y los **carga instantáneamente** en las siguientes ejecuciones.

## ¿Cómo funciona?

### 🆕 Primera Ejecución
1. Ejecutas el análisis NER
2. Procesa todos los documentos (toma varios minutos) ⏳
3. **Automáticamente guarda** todo en caché local 💾
4. Muestra los resultados

### ⚡ Siguientes Ejecuciones
1. Ejecutas el análisis NER
2. **Carga instantáneamente** desde caché ⚡
3. Muestra los resultados (¡sin esperar!)

## 📋 Qué verás en la interfaz

### En la pestaña "Configuración"

**Si existe caché guardado:**
```
✓ Caché encontrado
- Fecha: 2025-10-18 14:30:45
- Documentos: 150
- Caracteres procesados: 2,456,789

El análisis se cargará automáticamente desde el caché.
```

**Opciones disponibles:**
- ✅ **Ejecutar Análisis NER** - Carga desde caché o procesa si es primera vez
- 🔄 **Forzar re-procesamiento** - Checkbox para ignorar caché y procesar todo de nuevo
- 🗑️ **Limpiar Caché** - Botón para eliminar el caché (solo aparece si existe)

## 🎯 Casos de uso comunes

### Uso Normal (diario)
```
Solo haz clic en "Ejecutar Análisis NER"
→ Se carga automáticamente desde caché
→ Resultados instantáneos ✅
```

### Agregaste nuevos documentos
```
1. Marca "🔄 Forzar re-procesamiento"
2. Haz clic en "Ejecutar Análisis NER"
→ Procesa todo de nuevo (incluye nuevos docs)
→ Guarda nuevo caché ✅
```

### Cambiaste el modelo de SpaCy
```
1. Selecciona nuevo modelo (ej: "lg" en vez de "sm")
2. Marca "🔄 Forzar re-procesamiento"
3. Haz clic en "Ejecutar Análisis NER"
→ Procesa con el nuevo modelo
→ Guarda nuevo caché ✅
```

### Problemas con el caché
```
1. Haz clic en "🗑️ Limpiar Caché"
2. Ejecuta análisis nuevamente
→ Se genera caché nuevo ✅
```

## 💡 Ventajas

✅ **Súper rápido** - Carga en segundos en vez de minutos
✅ **Automático** - No tienes que hacer nada especial
✅ **Transparente** - Mensajes claros de qué está pasando
✅ **Flexible** - Puedes forzar re-procesamiento cuando quieras

## 📁 Ubicación del caché

Los archivos se guardan en:
```
cache/ner_analysis_cache/
├── ner_metadata.json     # Información del análisis
└── ner_results.pkl       # Resultados completos
```

## 🔧 Si algo sale mal

1. Usa el botón "🗑️ Limpiar Caché" en la interfaz
2. Si no funciona, elimina manualmente la carpeta `cache/ner_analysis_cache/`
3. Vuelve a ejecutar el análisis

## 📚 Documentación completa

Para más detalles técnicos, consulta: `docs/SISTEMA_CACHE_NER.md`

---

**¡Disfruta del análisis NER más rápido! ⚡**

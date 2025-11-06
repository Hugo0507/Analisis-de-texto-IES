# 🔧 Solución de Problemas de Instalación

## ⚠️ Problema Identificado

Estás usando **Python 3.13** (muy reciente) y algunos paquetes como `spacy`, `numpy`, y `transformers` **NO tienen wheels precompilados** para esta versión todavía, por lo que intentan compilarse desde el código fuente.

**Error clave:** `Unknown compiler(s): [['icl'], ['cl'], ['cc'], ['gcc'], ['clang']]`

Esto significa que no tienes un compilador de C instalado en Windows.

---

## ✅ Soluciones (3 Opciones)

### **OPCIÓN 1: Instalación Mínima (RÁPIDA) ⚡**

Instala solo las dependencias esenciales sin spaCy:

```bash
pip install -r requirements-minimal.txt
```

**Ventajas:**
- ✅ Instalación rápida (2-3 minutos)
- ✅ Sin problemas de compilación
- ✅ 90% de funcionalidades disponibles

**Desventajas:**
- ❌ Sin spaCy (análisis NER limitado)
- ❌ Sin transformers (modelos avanzados limitados)

**¿Puedo usar el proyecto?** Sí, casi todas las funcionalidades principales funcionarán.

---

### **OPCIÓN 2: Instalación Paso a Paso con Script (RECOMENDADA) 🎯**

Usa el script de instalación que instala paquete por paquete:

```bash
cd scripts
instalar_dependencias.bat
```

El script:
1. Actualiza pip
2. Instala numpy y pandas primero
3. Instala Streamlit y visualización
4. Instala ML y utilidades
5. Instala Google APIs
6. Salta spaCy/transformers si fallan

**Ventajas:**
- ✅ Instalación guiada
- ✅ Continúa aunque fallen algunos paquetes
- ✅ Muestra progreso claro

**¿Cuánto demora?** 5-10 minutos

---

### **OPCIÓN 3: Usar Python 3.11 o 3.12 (MEJOR PARA LARGO PLAZO) 🏆**

**Recomendación:** Si vas a trabajar en este proyecto por varios meses, usa Python 3.11 o 3.12.

#### **Pasos:**

**1. Verificar versión actual:**
```bash
python --version
```

Si dice `Python 3.13.x`, necesitas cambiar.

**2. Desinstalar Python 3.13:**
- Panel de Control → Programas → Desinstalar
- Buscar "Python 3.13" y desinstalar

**3. Descargar Python 3.11 o 3.12:**
- Ir a https://www.python.org/downloads/
- Descargar **Python 3.11.8** o **Python 3.12.2**
- **IMPORTANTE:** Marcar "Add Python to PATH" durante instalación

**4. Verificar instalación:**
```bash
python --version
```

Debería mostrar `Python 3.11.x` o `Python 3.12.x`

**5. Crear nuevo entorno virtual:**
```bash
# Eliminar entorno viejo
rmdir /s venv

# Crear nuevo entorno
python -m venv venv

# Activar
venv\Scripts\activate

# Actualizar pip
python -m pip install --upgrade pip

# Instalar todo
pip install -r requirements.txt
```

**Ventajas:**
- ✅ 100% de compatibilidad
- ✅ Todas las funcionalidades disponibles
- ✅ Sin problemas de compilación
- ✅ Mejor soporte de la comunidad

**Desventajas:**
- ⏱️ Requiere 30-45 minutos (descarga + instalación)

---

## 🚀 Pasos Recomendados AHORA

### **Si tienes prisa (presentación pronto):**

```bash
# Opción 1: Instalación mínima
pip install -r requirements-minimal.txt

# Luego crear .env
copy .env.example .env

# Y ejecutar
streamlit run app.py
```

### **Si tienes tiempo (mejor a largo plazo):**

1. **Descargar Python 3.11:** https://www.python.org/downloads/release/python-3118/
2. **Desinstalar Python 3.13**
3. **Instalar Python 3.11** (marcar "Add to PATH")
4. **Ejecutar:**
```bash
cd C:\Projects\Tesis\analisis_transformacion_digital
rmdir /s venv
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 🔍 Verificar Instalación

Después de instalar, verifica que funcione:

```bash
# Verificar Python
python --version

# Verificar paquetes clave
python -c "import streamlit; print('Streamlit OK')"
python -c "import pandas; print('Pandas OK')"
python -c "import numpy; print('Numpy OK')"
python -c "import sklearn; print('Scikit-learn OK')"
python -c "import nltk; print('NLTK OK')"

# Intentar spaCy (puede fallar si no se instaló)
python -c "import spacy; print('spaCy OK')" 2>nul

# Verificar configuración
python config.py
```

---

## 📋 Comparación de Opciones

| Feature | Opción 1<br>(Mínima) | Opción 2<br>(Script) | Opción 3<br>(Python 3.11) |
|---------|---------------------|---------------------|---------------------------|
| **Tiempo** | 2-3 min | 5-10 min | 30-45 min |
| **Dificultad** | Fácil | Fácil | Media |
| **Streamlit** | ✅ | ✅ | ✅ |
| **NLTK** | ✅ | ✅ | ✅ |
| **spaCy** | ❌ | ⚠️ | ✅ |
| **Transformers** | ❌ | ❌ | ✅ |
| **Análisis NER** | Limitado | Limitado | Completo |
| **Todo funciona** | 90% | 90% | 100% |

---

## ⚙️ Alternativa: Instalar Compilador (NO RECOMENDADO)

Si insistes en usar Python 3.13 Y necesitas spaCy:

1. **Instalar Microsoft Visual Studio Build Tools:**
   - Descargar: https://visualstudio.microsoft.com/es/downloads/
   - Buscar "Build Tools para Visual Studio 2022"
   - Instalar con "Desarrollo para escritorio con C++"
   - **Tamaño:** ~7 GB
   - **Tiempo:** ~1 hora

2. **Reiniciar computadora**

3. **Intentar instalar:**
```bash
pip install spacy
```

**⚠️ ADVERTENCIA:** Este método es complicado y puede no funcionar. Mejor usar Python 3.11/3.12.

---

## 🆘 Si Sigues Teniendo Problemas

### Error: "No module named 'xxx'"
**Solución:**
```bash
pip install xxx
```

### Error: "DLL load failed"
**Solución:**
```bash
# Reinstalar paquete problemático
pip uninstall xxx
pip install xxx --no-cache-dir
```

### Error: "Access denied"
**Solución:**
```bash
# Ejecutar PowerShell como Administrador
pip install xxx --user
```

### Error al importar en el código
**Solución:**
```bash
# Verificar entorno virtual está activado
venv\Scripts\activate

# Verificar paquete instalado
pip list | findstr xxx
```

---

## 📊 Estado de Compatibilidad (Enero 2025)

| Paquete | Python 3.11 | Python 3.12 | Python 3.13 |
|---------|------------|-------------|-------------|
| streamlit | ✅ | ✅ | ✅ |
| numpy | ✅ | ✅ | ⚠️ |
| pandas | ✅ | ✅ | ⚠️ |
| spacy | ✅ | ✅ | ❌ |
| transformers | ✅ | ✅ | ⚠️ |
| scikit-learn | ✅ | ✅ | ⚠️ |

**Leyenda:**
- ✅ = Wheels precompilados disponibles
- ⚠️ = Puede requerir compilación
- ❌ = No funciona o muy difícil

---

## 🎯 Recomendación Final

**Para tu tesis:**
- **Si presentas en < 1 semana:** Usa Opción 1 (mínima)
- **Si tienes 1-2 semanas:** Usa Opción 3 (Python 3.11)
- **Si solo necesitas probar:** Usa Opción 2 (script)

**Mi recomendación personal:** **Python 3.11.8** es la versión más estable y compatible con todo.

---

## ✅ Checklist Post-Instalación

Después de instalar, verifica:

- [ ] Python 3.11 o 3.12 instalado (o 3.13 con paquetes mínimos)
- [ ] Entorno virtual creado y activado
- [ ] `pip install` completado sin errores mayores
- [ ] `python config.py` funciona y muestra configuración
- [ ] Archivo `.env` creado desde `.env.example`
- [ ] `streamlit run app.py` inicia la aplicación
- [ ] Logs se crean en `logs/app.log`

---

## 📞 Contacto de Soporte

Si ninguna opción funciona:

1. **Revisa logs:** `logs/app.log`
2. **Verifica versión Python:** `python --version`
3. **Lista paquetes instalados:** `pip list`
4. **Copia el error completo** para mejor diagnóstico

---

**Última actualización:** 2025-01-25
**Compatibilidad probada:** Python 3.11, 3.12, 3.13 (parcial)

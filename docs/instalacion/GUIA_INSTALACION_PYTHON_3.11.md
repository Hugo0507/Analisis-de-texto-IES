# 🚀 Guía Completa: Migración a Python 3.11

## 📋 Resumen

Esta guía te llevará paso a paso para migrar de Python 3.13 a Python 3.11, instalando todas las dependencias correctamente.

**Tiempo estimado:** 30-45 minutos
**Dificultad:** Media
**Requisitos:** Conexión a internet, permisos de administrador

---

## 🎯 Proceso Automatizado

Hemos creado 5 scripts que automatizan casi todo el proceso:

1. `EJECUTAR_AQUI.bat` - **Empieza aquí**
2. `2_limpiar_entorno.bat` - Limpia el entorno viejo
3. `3_instalar_todo.bat` - Instala todas las dependencias
4. `4_configurar_env.bat` - Configura variables de entorno
5. `5_probar_app.bat` - Prueba la aplicación

---

## 📝 PASO A PASO DETALLADO

### **FASE 1: Preparación (5 minutos)**

#### 1.1 Ejecutar Script de Verificación

Abre PowerShell o CMD en:
```
C:\Projects\Tesis\analisis_transformacion_digital\scripts
```

Ejecuta:
```bash
EJECUTAR_AQUI.bat
```

Esto verificará tu sistema actual y te mostrará las instrucciones.

---

### **FASE 2: Desinstalación de Python 3.13 (5 minutos)**

#### 2.1 Abrir Panel de Control

**Opción A - Con teclado:**
1. Presiona `Windows + R`
2. Escribe: `appwiz.cpl`
3. Presiona `Enter`

**Opción B - Con menú:**
1. Click en el botón Inicio
2. Busca "Agregar o quitar programas"
3. Click en el resultado

#### 2.2 Desinstalar Python 3.13

1. En la lista de programas, busca: `Python 3.13.x`
2. Click derecho sobre él
3. Selecciona "Desinstalar"
4. Sigue las instrucciones del desinstalador
5. Reinicia tu computadora si te lo pide

**⚠️ IMPORTANTE:** Asegúrate de desinstalar **todos** los componentes de Python 3.13 (launcher, pip, etc.)

---

### **FASE 3: Instalación de Python 3.11 (10 minutos)**

#### 3.1 Descargar Python 3.11.8

**Enlace directo:**
```
https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe
```

**O manualmente:**
1. Ve a https://www.python.org/downloads/
2. Busca "Python 3.11.8"
3. Descarga "Windows installer (64-bit)"

El archivo se descargará (tamaño: ~27 MB)

#### 3.2 Instalar Python 3.11.8

1. **Ejecuta** el archivo descargado `python-3.11.8-amd64.exe`

2. **MUY IMPORTANTE:** En la primera pantalla:
   - ✅ **Marca la casilla:** "Add Python 3.11 to PATH"
   - ✅ **Marca la casilla:** "Install launcher for all users"

3. Click en **"Install Now"** (instalación recomendada)

4. Espera a que termine (2-3 minutos)

5. Cuando veas "Setup was successful", click en "Close"

#### 3.3 Verificar Instalación

1. **Cierra** cualquier ventana de PowerShell/CMD que tengas abierta

2. **Abre una NUEVA ventana** de PowerShell o CMD

3. Ejecuta:
```bash
python --version
```

**Deberías ver:**
```
Python 3.11.8
```

Si ves `Python 3.13.x` o un error:
- Cierra completamente PowerShell/CMD (todas las ventanas)
- Reinicia tu computadora
- Intenta de nuevo

---

### **FASE 4: Reinstalación Automática (15-20 minutos)**

#### 4.1 Navegar al Directorio

Abre una **NUEVA** ventana de PowerShell o CMD:

```bash
cd C:\Projects\Tesis\analisis_transformacion_digital\scripts
```

#### 4.2 Ejecutar Instalación Completa

```bash
CONTINUAR_INSTALACION.bat
```

Este script hará AUTOMÁTICAMENTE:

**✅ Paso 2: Limpieza del entorno** (1 minuto)
- Elimina el entorno virtual viejo
- Limpia cache de Python
- Verifica que tienes Python 3.11

**✅ Paso 3: Instalación de dependencias** (10-15 minutos)
- Crea nuevo entorno virtual
- Actualiza pip
- Instala numpy y pandas
- Instala todas las 30+ dependencias
- Descarga modelos de spaCy

**✅ Paso 4: Configuración** (1 minuto)
- Crea archivo .env desde .env.example
- Crea directorios necesarios (logs, cache, data, output)
- Verifica que todo funciona

**Durante este proceso:**
- ⏳ Ten paciencia, puede tomar 15 minutos
- 📊 Verás muchas líneas de instalación
- ✅ Al final verás "[OK]" en cada paquete instalado

---

### **FASE 5: Configuración Final (5 minutos)**

#### 5.1 Editar Archivo .env

1. Abre el archivo `.env` con un editor de texto:
   ```
   C:\Projects\Tesis\analisis_transformacion_digital\.env
   ```

2. Busca y modifica estas líneas:

```env
# Cambia esto con tu ID de carpeta de Google Drive
GOOGLE_DRIVE_FOLDER_ID=TU_ID_AQUI

# Ajusta el nivel de log (INFO para normal, DEBUG para desarrollo)
LOG_LEVEL=INFO

# Otros ajustes opcionales
DEFAULT_LANGUAGE=english
CACHE_ENABLED=True
```

3. Guarda el archivo

#### 5.2 Probar la Aplicación

Ejecuta:
```bash
5_probar_app.bat
```

O manualmente:
```bash
cd C:\Projects\Tesis\analisis_transformacion_digital
venv\Scripts\activate
streamlit run app.py
```

**La aplicación debería:**
1. Abrir automáticamente en tu navegador
2. Mostrar la interfaz de Streamlit
3. Crear logs en `logs/app.log`

---

## ✅ Verificación Post-Instalación

Ejecuta estos comandos para verificar que todo funciona:

```bash
# Activar entorno
cd C:\Projects\Tesis\analisis_transformacion_digital
venv\Scripts\activate

# Verificar Python
python --version
# Debe mostrar: Python 3.11.8

# Verificar paquetes críticos
python -c "import streamlit; print('Streamlit OK')"
python -c "import pandas; print('Pandas OK')"
python -c "import numpy; print('Numpy OK')"
python -c "import sklearn; print('Scikit-learn OK')"
python -c "import nltk; print('NLTK OK')"
python -c "import spacy; print('spaCy OK')"
python -c "import dotenv; print('Dotenv OK')"

# Verificar configuración
python config.py
```

**Todos deberían imprimir "OK"**

---

## 🎉 ¡Instalación Completada!

Tu proyecto ahora tiene:

✅ Python 3.11.8 instalado
✅ Entorno virtual nuevo y limpio
✅ Todas las 30+ dependencias instaladas
✅ spaCy funcionando con modelo en_core_web_sm
✅ Variables de entorno configuradas
✅ Sistema de logging profesional activo
✅ Type hints implementados

---

## 🔍 Solución de Problemas

### Problema: "python no se reconoce como comando"

**Solución:**
1. Cierra y reabre PowerShell/CMD
2. Si persiste, reinicia tu PC
3. Verifica que marcaste "Add to PATH" durante instalación

---

### Problema: Script se detiene con error

**Solución:**
1. Lee el mensaje de error
2. Si es un paquete específico, instálalo manualmente:
   ```bash
   venv\Scripts\activate
   pip install nombre-del-paquete
   ```
3. Continúa con el siguiente script

---

### Problema: spaCy no se instala

**Solución:**
```bash
venv\Scripts\activate
pip install spacy --no-build-isolation
python -m spacy download en_core_web_sm
```

---

### Problema: La app no inicia

**Solución:**
1. Verifica logs en `logs/app.log`
2. Asegúrate que el entorno virtual está activado
3. Reinstala streamlit:
   ```bash
   pip install --force-reinstall streamlit
   ```

---

## 📞 Checklist Final

Marca cada ítem cuando lo completes:

- [ ] Python 3.13 desinstalado
- [ ] Python 3.11.8 instalado (con "Add to PATH" marcado)
- [ ] `python --version` muestra Python 3.11.8
- [ ] Script `CONTINUAR_INSTALACION.bat` ejecutado sin errores
- [ ] Archivo `.env` creado y editado
- [ ] Comando `python config.py` funciona
- [ ] La aplicación inicia con `streamlit run app.py`
- [ ] Se crean logs en `logs/app.log`
- [ ] La interfaz web se abre en el navegador

---

## 🎓 Próximos Pasos

Ahora que todo funciona, puedes:

1. **Explorar la aplicación** - Navega por todas las secciones
2. **Conectar Google Drive** - Sigue la guía en la sección "Conexión Google Drive"
3. **Procesar tus documentos** - Sigue el workflow secuencial
4. **Revisar los logs** - Observa cómo el sistema registra todo
5. **Experimentar con configuración** - Modifica valores en `.env`

---

## 📚 Documentación Adicional

- `MEJORAS_INSTALACION.md` - Guía de uso de las mejoras implementadas
- `RESUMEN_MEJORAS.md` - Resumen ejecutivo de todas las mejoras
- `SOLUCION_INSTALACION.md` - Solución detallada de problemas
- `requirements.txt` - Lista completa de dependencias
- `requirements-minimal.txt` - Versión mínima sin spaCy

---

**¡Felicidades por completar la instalación!** 🎉

Tu proyecto ahora está en un estado profesional con todas las mejores prácticas implementadas.

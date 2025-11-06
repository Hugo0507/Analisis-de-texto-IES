# 📦 Guía de Instalación Detallada

Esta guía te ayudará a instalar y configurar el sistema paso a paso.

## ⚙️ Requisitos del Sistema

### Hardware Mínimo
- **Procesador**: Intel Core i3 o equivalente
- **RAM**: 4 GB (recomendado 8 GB)
- **Espacio en Disco**: 2 GB libres
- **Conexión a Internet**: Para la instalación inicial

### Software Requerido
- **Sistema Operativo**: Windows 10/11, macOS 10.14+, o Linux (Ubuntu 18.04+)
- **Python**: Versión 3.8, 3.9, 3.10 o 3.11

## 📥 Paso 1: Instalar Python

### Windows

1. Descarga Python desde [python.org](https://www.python.org/downloads/)
2. Ejecuta el instalador
3. **IMPORTANTE**: Marca la casilla "Add Python to PATH"
4. Haz clic en "Install Now"
5. Verifica la instalación abriendo CMD y ejecutando:
   ```bash
   python --version
   ```

### macOS

```bash
# Usando Homebrew (recomendado)
brew install python@3.10

# Verificar instalación
python3 --version
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv

# Verificar instalación
python3 --version
```

## 📂 Paso 2: Preparar el Proyecto

1. **Navega al directorio del proyecto**

```bash
# Windows
cd C:\Projects\Tesis\analisis_transformacion_digital

# Linux/Mac
cd ~/Projects/Tesis/analisis_transformacion_digital
```

## 🌐 Paso 3: Crear Entorno Virtual

Un entorno virtual mantiene las dependencias del proyecto aisladas.

### Windows

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
venv\Scripts\activate

# Deberías ver (venv) en tu terminal
```

### Linux/Mac

```bash
# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate

# Deberías ver (venv) en tu terminal
```

## 📦 Paso 4: Instalar Dependencias

Con el entorno virtual activado:

```bash
# Actualizar pip
python -m pip install --upgrade pip

# Instalar dependencias
pip install -r requirements.txt
```

Este proceso puede tardar 5-10 minutos dependiendo de tu conexión a internet.

### Verificar Instalación

```bash
pip list
```

Deberías ver una lista de paquetes instalados incluyendo:
- streamlit
- nltk
- pandas
- plotly
- scikit-learn
- etc.

## 🧪 Paso 5: Verificar la Instalación

Ejecuta este comando para verificar que todo funciona:

```bash
python -c "import streamlit; import nltk; import pandas; print('✅ Todo instalado correctamente!')"
```

## 🚀 Paso 6: Ejecutar la Aplicación

```bash
streamlit run app.py
```

La aplicación debería:
1. Descargar recursos de NLTK automáticamente (primera vez)
2. Abrir tu navegador en `http://localhost:8501`
3. Mostrar la interfaz de la aplicación

## 🔧 Solución de Problemas Comunes

### Problema: "python no se reconoce como comando"

**Solución**: Python no está en el PATH del sistema.

**Windows**:
1. Busca "Variables de entorno" en el menú inicio
2. Edita "Path" en Variables del sistema
3. Agrega la ruta de instalación de Python (ej: `C:\Python310`)

**Linux/Mac**: Usa `python3` en lugar de `python`

### Problema: Error al instalar paquetes con pip

**Solución**:
```bash
# Actualizar pip
python -m pip install --upgrade pip

# Limpiar caché
pip cache purge

# Reinstalar
pip install -r requirements.txt
```

### Problema: "ModuleNotFoundError: No module named 'streamlit'"

**Solución**: El entorno virtual no está activado o las dependencias no se instalaron.

```bash
# Activar entorno virtual primero
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# Luego instalar
pip install -r requirements.txt
```

### Problema: Error con NLTK al ejecutar

**Solución**: Descargar recursos manualmente:

```bash
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('punkt_tab')"
```

### Problema: Puerto 8501 ocupado

**Solución**: Usa un puerto diferente:

```bash
streamlit run app.py --server.port 8502
```

### Problema: Errores de encoding con archivos

**Solución**: Asegúrate de que tus archivos .txt estén en UTF-8:

**Windows (Notepad++)**: Encoding → Convert to UTF-8
**Linux/Mac**:
```bash
iconv -f ISO-8859-1 -t UTF-8 archivo.txt > archivo_utf8.txt
```

## 🔄 Desactivar el Entorno Virtual

Cuando termines de trabajar:

```bash
# En cualquier sistema
deactivate
```

## 🗑️ Desinstalación

Si deseas eliminar completamente el proyecto:

```bash
# Desactivar entorno virtual
deactivate

# Eliminar carpeta del entorno virtual
# Windows
rmdir /s venv

# Linux/Mac
rm -rf venv

# Eliminar el proyecto completo (opcional)
cd ..
rm -rf analisis_transformacion_digital
```

## 📞 Obtener Ayuda

Si sigues teniendo problemas:

1. Verifica que tu versión de Python sea compatible (3.8-3.11)
2. Asegúrate de tener conexión a internet estable
3. Revisa los logs de error en la terminal
4. Consulta la documentación de [Streamlit](https://docs.streamlit.io/)
5. Revisa issues en el repositorio del proyecto

## ✅ Checklist de Instalación

- [ ] Python 3.8+ instalado
- [ ] pip funcionando correctamente
- [ ] Entorno virtual creado
- [ ] Entorno virtual activado
- [ ] Dependencias instaladas sin errores
- [ ] Comando de verificación exitoso
- [ ] Streamlit se ejecuta sin errores
- [ ] La aplicación se abre en el navegador

¡Si completaste todos los pasos, estás listo para usar el sistema! 🎉

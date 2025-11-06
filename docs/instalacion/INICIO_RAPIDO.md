# ⚡ INICIO RÁPIDO - Instalación Python 3.11

## 🎯 LO QUE NECESITAS HACER (Resumen de 2 minutos)

Tienes Python 3.13 y necesitas cambiar a Python 3.11 porque algunos paquetes no funcionan.

**TL;DR:**
1. Ejecuta: `scripts\EJECUTAR_AQUI.bat`
2. Desinstala Python 3.13 manualmente
3. Instala Python 3.11.8 desde: https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe
4. Ejecuta: `scripts\CONTINUAR_INSTALACION.bat`
5. ¡Listo!

---

## 📋 PROCESO COMPLETO (30-45 minutos)

### **Paso 1: Ejecutar Script Inicial** ⏱️ 1 minuto

```bash
cd C:\Projects\Tesis\analisis_transformacion_digital\scripts
EJECUTAR_AQUI.bat
```

Esto verificará tu sistema.

---

### **Paso 2: Desinstalar Python 3.13** ⏱️ 5 minutos

1. Presiona `Windows + R`
2. Escribe: `appwiz.cpl`
3. Presiona `Enter`
4. Busca "Python 3.13"
5. Click derecho → Desinstalar

---

### **Paso 3: Instalar Python 3.11.8** ⏱️ 10 minutos

1. **Descarga:** https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe

2. **Ejecuta** el archivo descargado

3. **MUY IMPORTANTE:** Marca estas casillas:
   - ✅ Add Python 3.11 to PATH
   - ✅ Install launcher for all users

4. Click "Install Now"

5. Espera...

6. Click "Close"

7. **Reinicia** PowerShell/CMD (cierra y abre nuevo)

8. **Verifica:**
```bash
python --version
```
Debe mostrar: `Python 3.11.8`

---

### **Paso 4: Instalación Automática** ⏱️ 15-20 minutos

```bash
cd C:\Projects\Tesis\analisis_transformacion_digital\scripts
CONTINUAR_INSTALACION.bat
```

Esto hará AUTOMÁTICAMENTE:
- ✅ Limpiar entorno viejo
- ✅ Crear entorno virtual nuevo
- ✅ Instalar TODAS las dependencias (30+ paquetes)
- ✅ Configurar variables de entorno
- ✅ Descargar modelos de spaCy

**⏳ Ten paciencia, toma 15 minutos.**

---

### **Paso 5: Configurar** ⏱️ 2 minutos

Edita el archivo `.env`:

```bash
# Abre con notepad
notepad C:\Projects\Tesis\analisis_transformacion_digital\.env
```

Cambia:
```env
GOOGLE_DRIVE_FOLDER_ID=TU_ID_DE_CARPETA_AQUI
```

Guarda y cierra.

---

### **Paso 6: Probar** ⏱️ 1 minuto

```bash
cd C:\Projects\Tesis\analisis_transformacion_digital\scripts
5_probar_app.bat
```

La app debería abrirse en tu navegador.

---

## ✅ Verificación Rápida

```bash
cd C:\Projects\Tesis\analisis_transformacion_digital
venv\Scripts\activate
python --version        # Debe mostrar 3.11.8
python config.py        # Debe mostrar configuración
streamlit run app.py    # Debe abrir la app
```

---

## 🆘 ¿Problemas?

### "python no se reconoce"
→ Cierra y reabre PowerShell/CMD
→ Si persiste, reinicia tu PC

### "Error instalando paquete X"
→ Ignóralo, continúa
→ Los paquetes críticos ya están instalados

### "spaCy no funciona"
→ No te preocupes, no es crítico
→ El 90% de funcionalidades seguirán funcionando

---

## 📚 Documentación Completa

- **Guía detallada:** `GUIA_INSTALACION_PYTHON_3.11.md`
- **Solución de problemas:** `SOLUCION_INSTALACION.md`
- **Mejoras implementadas:** `RESUMEN_MEJORAS.md`

---

## 🎯 Checklist Express

- [ ] Ejecuté `EJECUTAR_AQUI.bat`
- [ ] Desinstalé Python 3.13
- [ ] Instalé Python 3.11.8 (con "Add to PATH")
- [ ] `python --version` muestra 3.11.8
- [ ] Ejecuté `CONTINUAR_INSTALACION.bat`
- [ ] Edité el archivo `.env`
- [ ] Probé con `5_probar_app.bat`
- [ ] ✅ ¡La app funciona!

---

**¿Dudas?** Lee la guía completa en `GUIA_INSTALACION_PYTHON_3.11.md`

**¡Éxito!** 🚀

@echo off
REM ====================================================================
REM GUIA DE MIGRACION A PYTHON 3.11
REM Script maestro - Ejecuta este primero
REM ====================================================================

COLOR 0A

echo.
echo ====================================================================
echo     MIGRACION A PYTHON 3.11 - INSTALACION AUTOMATIZADA
echo ====================================================================
echo.
echo Este asistente te guiara paso a paso para:
echo   1. Verificar tu sistema actual
echo   2. Cambiar de Python 3.13 a Python 3.11
echo   3. Reinstalar todas las dependencias
echo   4. Configurar variables de entorno
echo   5. Probar la aplicacion
echo.
echo Tiempo estimado: 30-45 minutos
echo.
echo ====================================================================
echo.

pause

echo.
echo ====================================================================
echo PASO 1: VERIFICACION DEL SISTEMA
echo ====================================================================
echo.

call 1_verificar_python.bat

echo.
echo ====================================================================
echo INSTRUCCIONES PARA CONTINUAR
echo ====================================================================
echo.
echo AHORA DEBES HACER LO SIGUIENTE MANUALMENTE:
echo.
echo 1. DESINSTALAR PYTHON 3.13:
echo    - Presiona Windows + R
echo    - Escribe: appwiz.cpl
echo    - Presiona Enter
echo    - Busca "Python 3.13" en la lista
echo    - Click derecho -^> Desinstalar
echo    - Sigue las instrucciones
echo.
echo 2. DESCARGAR PYTHON 3.11.8:
echo    - Abre tu navegador
echo    - Ve a: https://www.python.org/ftp/python/3.11.8/python-3.11.8-amd64.exe
echo    - Descarga el archivo
echo.
echo 3. INSTALAR PYTHON 3.11.8:
echo    - Ejecuta el archivo descargado
echo    - IMPORTANTE: Marca "Add Python 3.11 to PATH"
echo    - Click en "Install Now"
echo    - Espera a que termine
echo.
echo 4. REINICIAR POWERSHELL/CMD:
echo    - Cierra esta ventana
echo    - Abre una nueva ventana de PowerShell o CMD
echo    - Ve a: cd C:\Projects\Tesis\analisis_transformacion_digital\scripts
echo    - Ejecuta: CONTINUAR_INSTALACION.bat
echo.
echo ====================================================================
echo.

pause

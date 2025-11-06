@echo off
REM ====================================================================
REM CONTINUACION DE LA INSTALACION
REM Ejecuta este script DESPUES de instalar Python 3.11
REM ====================================================================

COLOR 0A

echo.
echo ====================================================================
echo     CONTINUACION DE INSTALACION
echo ====================================================================
echo.
echo Este script continuara con:
echo   - Limpieza del entorno viejo
echo   - Creacion de nuevo entorno virtual
echo   - Instalacion de todas las dependencias
echo   - Configuracion de variables de entorno
echo.
echo ====================================================================
echo.

pause

REM ==========================
REM PASO 2: LIMPIAR ENTORNO
REM ==========================

echo.
echo ====================================================================
echo EJECUTANDO PASO 2: LIMPIEZA DEL ENTORNO
echo ====================================================================
echo.

call 2_limpiar_entorno.bat

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Problemas en la limpieza del entorno
    echo Por favor verifica que Python 3.11 este instalado correctamente
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Limpieza completada exitosamente
echo.

REM ===========================
REM PASO 3: INSTALAR TODO
REM ===========================

echo.
echo ====================================================================
echo EJECUTANDO PASO 3: INSTALACION DE DEPENDENCIAS
echo ====================================================================
echo.
echo [ADVERTENCIA] Este paso puede tomar 10-15 minutos
echo Por favor, ten paciencia y no cierres esta ventana
echo.

pause

call 3_instalar_todo.bat

if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Algunas dependencias pueden haber fallado
    echo Pero el sistema deberia funcionar con las dependencias basicas
    echo.
)

echo.
echo [OK] Instalacion de dependencias completada
echo.

REM =============================
REM PASO 4: CONFIGURAR ENV
REM =============================

echo.
echo ====================================================================
echo EJECUTANDO PASO 4: CONFIGURACION DE VARIABLES DE ENTORNO
echo ====================================================================
echo.

call 4_configurar_env.bat

echo.
echo [OK] Configuracion completada
echo.

REM =============================
REM RESUMEN FINAL
REM =============================

echo.
echo ====================================================================
echo     INSTALACION COMPLETADA EXITOSAMENTE!
echo ====================================================================
echo.
echo Tu proyecto ahora esta configurado con:
echo   - Python 3.11
echo   - Todas las dependencias instaladas
echo   - Variables de entorno configuradas
echo   - Sistema de logging profesional
echo   - Type hints implementados
echo.
echo ====================================================================
echo PROXIMOS PASOS:
echo ====================================================================
echo.
echo 1. EDITAR ARCHIVO .ENV:
echo    - Abre el archivo .env con un editor de texto
echo    - Ajusta GOOGLE_DRIVE_FOLDER_ID con tu carpeta
echo    - Ajusta otras configuraciones si es necesario
echo.
echo 2. PROBAR LA APLICACION:
echo    - Ejecuta: 5_probar_app.bat
echo    - O manualmente: streamlit run app.py
echo.
echo 3. REVISAR LOGS:
echo    - Los logs se guardaran en: logs\app.log
echo    - Errores en: logs\errors.log
echo.
echo ====================================================================
echo.
echo Quieres probar la aplicacion ahora? (S/N)
choice /C SN /N /M "Respuesta"

if errorlevel 2 goto :end
if errorlevel 1 goto :run_app

:run_app
echo.
echo [INFO] Iniciando aplicacion...
call 5_probar_app.bat
goto :end

:end
echo.
echo Gracias por usar el instalador automatizado!
echo Si tienes problemas, revisa: SOLUCION_INSTALACION.md
echo.
pause

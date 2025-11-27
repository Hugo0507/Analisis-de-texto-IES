"""
Script para ver logs en tiempo real
Ejecuta esto en una terminal separada mientras corres la app
"""

import time
import os
from pathlib import Path

log_file = Path("logs/app.log")

print("=" * 80)
print("MONITOREANDO LOGS EN TIEMPO REAL")
print("=" * 80)
print(f"Archivo: {log_file}")
print("Presiona Ctrl+C para salir\n")

# Leer las últimas 50 líneas primero
if log_file.exists():
    with open(log_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for line in lines[-50:]:
            print(line.rstrip())

# Seguir el archivo
try:
    with open(log_file, 'r', encoding='utf-8') as f:
        # Ir al final del archivo
        f.seek(0, os.SEEK_END)

        while True:
            line = f.readline()
            if line:
                print(line.rstrip())
            else:
                time.sleep(0.1)
except KeyboardInterrupt:
    print("\n\nMonitoreo detenido.")
except FileNotFoundError:
    print(f"Archivo de log no encontrado: {log_file}")
    print("Asegúrate de que la aplicación esté corriendo.")

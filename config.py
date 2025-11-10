"""
Archivo de configuración del sistema
Carga variables desde .env o usa valores por defecto
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()


def get_env(key: str, default: Optional[str] = None, required: bool = False) -> Optional[str]:
    """
    Obtiene variable de entorno con validación

    Args:
        key: Nombre de la variable
        default: Valor por defecto si no existe
        required: Si es requerida, lanza error si no existe

    Returns:
        Valor de la variable o default
    """
    value = os.getenv(key, default)

    if required and value is None:
        raise ValueError(f"Variable de entorno requerida no encontrada: {key}")

    return value


def get_env_bool(key: str, default: bool = False) -> bool:
    """Obtiene variable de entorno como booleano"""
    value = os.getenv(key, str(default))
    return value.lower() in ('true', '1', 'yes', 'on')


def get_env_int(key: str, default: int = 0) -> int:
    """Obtiene variable de entorno como entero"""
    value = os.getenv(key, str(default))
    try:
        return int(value)
    except ValueError:
        return default


# ==================== GOOGLE DRIVE ====================

# Detectar entorno de ejecución
import sys
IS_STREAMLIT_CLOUD = False
IS_FLY_IO = os.getenv('FLY_APP_NAME') is not None

# Intentar importar streamlit para detectar Streamlit Cloud
try:
    import streamlit as st
    IS_STREAMLIT_CLOUD = hasattr(st, 'secrets') and len(st.secrets) > 0
except (ImportError, Exception):
    pass

# Google Drive Folder ID
GOOGLE_DRIVE_FOLDER_ID = get_env('GOOGLE_DRIVE_FOLDER_ID', '1tDUZ4PnQen_lSr6z4ZALji2zdtrJf-sS')

# Paths de credenciales
CREDENTIALS_PATH = 'credentials.json'
TOKEN_PATH = 'token.json'

# Configurar credenciales según el entorno
if IS_STREAMLIT_CLOUD:
    # En Streamlit Cloud, crear credentials.json desde secrets
    try:
        import streamlit as st
        import json

        if "google_credentials" in st.secrets:
            credentials_dict = dict(st.secrets["google_credentials"])

            # Guardar temporalmente
            with open(CREDENTIALS_PATH, "w") as f:
                json.dump(credentials_dict, f)

            # Actualizar folder ID si existe en secrets
            if "GOOGLE_DRIVE_FOLDER_ID" in st.secrets:
                GOOGLE_DRIVE_FOLDER_ID = st.secrets["GOOGLE_DRIVE_FOLDER_ID"]
    except Exception as e:
        print(f"⚠️ Error configurando credenciales desde Streamlit secrets: {e}")

elif IS_FLY_IO:
    # En Fly.io, crear credentials.json desde variable de entorno
    import json

    credentials_json = os.getenv('GOOGLE_CREDENTIALS')
    if credentials_json:
        try:
            credentials_dict = json.loads(credentials_json)

            # Guardar temporalmente
            with open(CREDENTIALS_PATH, "w") as f:
                json.dump(credentials_dict, f)
        except Exception as e:
            print(f"⚠️ Error configurando credenciales desde Fly.io env: {e}")

    # Actualizar folder ID
    folder_id_env = os.getenv('GOOGLE_DRIVE_FOLDER_ID')
    if folder_id_env:
        GOOGLE_DRIVE_FOLDER_ID = folder_id_env
else:
    # Modo local: usar archivos directamente
    CREDENTIALS_PATH = get_env('CREDENTIALS_PATH', 'credentials.json')
    TOKEN_PATH = get_env('TOKEN_PATH', 'token.json')

# ==================== LOGGING ====================
LOG_LEVEL = get_env('LOG_LEVEL', 'INFO').upper()
LOG_DIR = get_env('LOG_DIR', 'logs')

# ==================== CACHÉ ====================
CACHE_ENABLED = get_env_bool('CACHE_ENABLED', True)
CACHE_DIR = get_env('CACHE_DIR', 'cache')

# ==================== PROCESAMIENTO NLP ====================
IDIOMA = get_env('DEFAULT_LANGUAGE', 'english')  # Mantener nombre antiguo por compatibilidad
DEFAULT_LANGUAGE = IDIOMA
USE_STEMMING = get_env_bool('USE_STEMMING', True)
MIN_PALABRA_LENGTH = get_env_int('MIN_WORD_LENGTH', 3)
MIN_WORD_LENGTH = MIN_PALABRA_LENGTH  # Alias

# ==================== MACHINE LEARNING ====================
N_CLUSTERS_DEFAULT = get_env_int('N_CLUSTERS_DEFAULT', 3)
N_TOPICS_DEFAULT = get_env_int('N_TOPICS_DEFAULT', 5)
N_WORDS_PER_TOPIC = get_env_int('N_WORDS_PER_TOPIC', 10)

# ==================== ANÁLISIS ====================
MAX_PALABRAS_NUBE = get_env_int('MAX_PALABRAS_NUBE', 100)
TOP_N_PALABRAS = get_env_int('TOP_N_PALABRAS', 20)
TOP_N_FACTORES = get_env_int('TOP_N_FACTORES', 5)

# ==================== VISUALIZACIÓN ====================
ANCHO_NUBE_PALABRAS = get_env_int('ANCHO_NUBE_PALABRAS', 1200)
ALTO_NUBE_PALABRAS = get_env_int('ALTO_NUBE_PALABRAS', 600)
COLOR_SCHEME = get_env('COLOR_SCHEME', 'Blues')
COLORMAP_WORDCLOUD = get_env('COLORMAP_WORDCLOUD', 'viridis')

# ==================== RUTAS ====================
DATA_DIR = get_env('DATA_DIR', 'data')
OUTPUT_DIR = get_env('OUTPUT_DIR', 'output')

# Crear directorios si no existen
Path(LOG_DIR).mkdir(exist_ok=True)
Path(CACHE_DIR).mkdir(exist_ok=True)
Path(DATA_DIR).mkdir(exist_ok=True)
Path(OUTPUT_DIR).mkdir(exist_ok=True)

# ==================== STREAMLIT ====================
STREAMLIT_PORT = get_env_int('STREAMLIT_PORT', 8501)
STREAMLIT_SERVER_ADDRESS = get_env('STREAMLIT_SERVER_ADDRESS', '0.0.0.0')

# ==================== DESARROLLO ====================
DEBUG = get_env_bool('DEBUG', False)
ENVIRONMENT = get_env('ENVIRONMENT', 'development')

# ==================== INFORMACIÓN DE CONFIGURACIÓN ====================
def print_config():
    """Imprime la configuración actual (para debug)"""
    print("=" * 60)
    print("CONFIGURACIÓN DE LA APLICACIÓN")
    print("=" * 60)
    print(f"Entorno: {ENVIRONMENT}")
    print(f"Debug: {DEBUG}")
    print(f"Nivel de Log: {LOG_LEVEL}")
    print(f"Idioma: {IDIOMA}")
    print(f"Caché habilitado: {CACHE_ENABLED}")
    print(f"Directorio de logs: {LOG_DIR}")
    print(f"Directorio de caché: {CACHE_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    # Mostrar configuración cuando se ejecuta directamente
    print_config()

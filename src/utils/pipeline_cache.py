"""
Sistema de Caché y Persistencia para el Pipeline
Guarda y recupera resultados de cada etapa en Google Drive
"""

import json
import pickle
from typing import Dict, Any, Optional, List
from datetime import datetime
from src.utils.logger import get_logger

logger = get_logger(__name__)


class PipelineCache:
    """Gestiona el cache y persistencia de resultados del pipeline en Google Drive"""

    def __init__(self, drive_connector, parent_folder_id: str):
        """
        Inicializa el sistema de cache

        Args:
            drive_connector: Conector de Google Drive
            parent_folder_id: ID de la carpeta padre donde guardar resultados
        """
        self.drive_connector = drive_connector
        self.parent_folder_id = parent_folder_id
        self.stage_folders = {}

        logger.info(f"PipelineCache inicializado con parent_folder: {parent_folder_id}")

    def get_or_create_stage_folder(self, stage_name: str) -> str:
        """
        Obtiene o crea la carpeta para una etapa específica

        Args:
            stage_name: Nombre de la carpeta (ej: "02_Language_Detection")

        Returns:
            ID de la carpeta
        """
        if stage_name in self.stage_folders:
            return self.stage_folders[stage_name]

        folder_id = self.drive_connector.get_or_create_folder(
            self.parent_folder_id,
            stage_name
        )

        self.stage_folders[stage_name] = folder_id
        logger.debug(f"Carpeta de etapa creada/obtenida: {stage_name} -> {folder_id}")

        return folder_id

    def check_stage_cache(self, stage_name: str, cache_file: str = "results.json") -> Optional[Dict[str, Any]]:
        """
        Verifica si existe cache válido para una etapa

        Args:
            stage_name: Nombre de la carpeta (ej: "02_Language_Detection")
            cache_file: Nombre del archivo de cache

        Returns:
            Resultados cacheados o None si no existen
        """
        try:
            logger.info(f"Verificando cache para {stage_name}/{cache_file}...")
            folder_id = self.get_or_create_stage_folder(stage_name)
            logger.info(f"  Folder ID: {folder_id}")

            # Listar archivos en la carpeta
            logger.info(f"  Listando archivos en carpeta {stage_name}...")
            files = self.drive_connector.list_files_in_folder(folder_id, recursive=False)
            logger.info(f"  Archivos encontrados: {len(files)}")

            # Buscar el archivo de cache
            cache_files = [f for f in files if f['name'] == cache_file]

            if not cache_files:
                logger.info(f"  ❌ No se encontró cache para {stage_name}/{cache_file}")
                return None

            # Leer el archivo de cache
            cache_file_id = cache_files[0]['id']
            logger.info(f"  Leyendo archivo de cache {cache_file_id}...")
            file_content = self.drive_connector.read_file_content(cache_file_id)

            if not file_content:
                logger.warning(f"  ⚠️ Cache vacío para {stage_name}/{cache_file}")
                return None

            # Decodificar JSON
            logger.info(f"  Decodificando contenido JSON...")
            if hasattr(file_content, 'read'):
                content_bytes = file_content.read()
            else:
                content_bytes = file_content

            cache_data = json.loads(content_bytes.decode('utf-8'))

            logger.info(f"  ✓ Cache encontrado para {stage_name}/{cache_file}")
            logger.info(f"  Cache timestamp: {cache_data.get('timestamp', 'unknown')}")

            return cache_data

        except Exception as e:
            logger.error(f"❌ Error verificando cache para {stage_name}: {e}", exc_info=True)
            return None

    def save_stage_results(
        self,
        stage_name: str,
        results: Dict[str, Any],
        cache_file: str = "results.json",
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Guarda resultados de una etapa en Drive

        Args:
            stage_name: Nombre de la carpeta
            results: Resultados a guardar
            cache_file: Nombre del archivo
            metadata: Metadata adicional

        Returns:
            True si se guardó exitosamente
        """
        try:
            logger.info(f"Guardando resultados para {stage_name}/{cache_file}...")
            folder_id = self.get_or_create_stage_folder(stage_name)
            logger.info(f"  Folder ID: {folder_id}")

            # Preparar datos a guardar
            cache_data = {
                'timestamp': datetime.now().isoformat(),
                'stage_name': stage_name,
                'results': results
            }

            if metadata:
                cache_data['metadata'] = metadata

            # Convertir a JSON
            logger.info(f"  Convirtiendo a JSON...")
            json_content = json.dumps(cache_data, indent=2, default=str)
            json_bytes = json_content.encode('utf-8')
            logger.info(f"  Tamaño del archivo: {len(json_bytes)} bytes")

            # Subir a Drive
            logger.info(f"  Subiendo a Google Drive...")
            file_id = self.drive_connector.upload_file(
                folder_id,
                cache_file,
                json_bytes,
                'application/json'
            )

            if file_id:
                logger.info(f"  ✓ Resultados guardados en Drive: {stage_name}/{cache_file} (ID: {file_id})")
                return True
            else:
                logger.error(f"  ❌ Error guardando resultados: {stage_name}/{cache_file}")
                return False

        except Exception as e:
            logger.error(f"❌ Error guardando resultados para {stage_name}: {e}", exc_info=True)
            return False

    def list_stage_files(self, stage_name: str) -> List[Dict[str, Any]]:
        """
        Lista archivos en la carpeta de una etapa

        Args:
            stage_name: Nombre de la carpeta

        Returns:
            Lista de archivos
        """
        try:
            folder_id = self.get_or_create_stage_folder(stage_name)
            files = self.drive_connector.list_files_in_folder(folder_id, recursive=False)
            return files
        except Exception as e:
            logger.error(f"Error listando archivos de {stage_name}: {e}")
            return []

    def clear_stage_cache(self, stage_name: str) -> bool:
        """
        Limpia el cache de una etapa específica

        Args:
            stage_name: Nombre de la carpeta

        Returns:
            True si se limpió exitosamente
        """
        try:
            folder_id = self.get_or_create_stage_folder(stage_name)

            # Listar archivos
            files = self.drive_connector.list_files_in_folder(folder_id, recursive=False)

            # Eliminar cada archivo
            for file in files:
                self.drive_connector.delete_file(file['id'])

            logger.info(f"✓ Cache limpiado para {stage_name} ({len(files)} archivos eliminados)")
            return True

        except Exception as e:
            logger.error(f"Error limpiando cache de {stage_name}: {e}")
            return False

    def save_pickle_data(self, stage_name: str, data: Any, pickle_file: str) -> bool:
        """
        Guarda datos en formato pickle (para matrices, DataFrames, etc.)

        Args:
            stage_name: Nombre de la carpeta
            data: Datos a guardar (DataFrame, matriz, etc.)
            pickle_file: Nombre del archivo pickle

        Returns:
            True si se guardó exitosamente
        """
        try:
            logger.info(f"Guardando datos pickle para {stage_name}/{pickle_file}...")
            folder_id = self.get_or_create_stage_folder(stage_name)

            # Serializar a pickle
            pickle_bytes = pickle.dumps(data)
            logger.info(f"  Tamaño del pickle: {len(pickle_bytes)} bytes")

            # Subir a Drive
            file_id = self.drive_connector.upload_file(
                folder_id,
                pickle_file,
                pickle_bytes,
                'application/octet-stream'
            )

            if file_id:
                logger.info(f"  ✓ Pickle guardado en Drive: {stage_name}/{pickle_file}")
                return True
            else:
                logger.error(f"  ❌ Error guardando pickle: {stage_name}/{pickle_file}")
                return False

        except Exception as e:
            logger.error(f"❌ Error guardando pickle para {stage_name}: {e}", exc_info=True)
            return False

    def load_pickle_data(self, stage_name: str, pickle_file: str) -> Optional[Any]:
        """
        Carga datos desde formato pickle

        Args:
            stage_name: Nombre de la carpeta
            pickle_file: Nombre del archivo pickle

        Returns:
            Datos deserializados o None si hay error
        """
        try:
            logger.info(f"Cargando pickle {stage_name}/{pickle_file}...")
            folder_id = self.get_or_create_stage_folder(stage_name)

            # Listar archivos en la carpeta
            files = self.drive_connector.list_files_in_folder(folder_id, recursive=False)
            pickle_files = [f for f in files if f['name'] == pickle_file]

            if not pickle_files:
                logger.info(f"  ❌ No se encontró pickle {stage_name}/{pickle_file}")
                return None

            # Leer el archivo
            file_id = pickle_files[0]['id']
            logger.info(f"  Leyendo archivo pickle {file_id}...")
            file_content = self.drive_connector.read_file_content(file_id)

            if not file_content:
                logger.warning(f"  ⚠️ Pickle vacío: {stage_name}/{pickle_file}")
                return None

            # Deserializar
            if hasattr(file_content, 'read'):
                pickle_bytes = file_content.read()
            else:
                pickle_bytes = file_content

            data = pickle.loads(pickle_bytes)
            logger.info(f"  ✓ Pickle cargado exitosamente: {stage_name}/{pickle_file}")
            return data

        except Exception as e:
            logger.error(f"❌ Error cargando pickle {stage_name}/{pickle_file}: {e}", exc_info=True)
            return None

    def get_stage_folder_map(self) -> Dict[str, str]:
        """
        Retorna el mapeo de nombres de etapas a IDs de carpetas

        Returns:
            Diccionario {stage_name: folder_id}
        """
        return self.stage_folders.copy()

    def validate_cache_freshness(
        self,
        stage_name: str,
        source_files: List[Dict[str, Any]],
        cache_file: str = "results.json"
    ) -> bool:
        """
        Valida si el cache es "fresco" comparando con archivos fuente

        Args:
            stage_name: Nombre de la etapa
            source_files: Archivos fuente que deberían estar procesados
            cache_file: Archivo de cache a validar

        Returns:
            True si el cache es válido para todos los archivos fuente
        """
        try:
            cache_data = self.check_stage_cache(stage_name, cache_file)

            if not cache_data:
                return False

            # Obtener lista de archivos procesados en el cache
            results = cache_data.get('results', {})

            # Diferentes etapas tienen diferentes estructuras
            # Intentar extraer lista de archivos procesados
            cached_files = set()

            if 'files' in results:
                # Formato: {'files': [...]}
                cached_files = {f.get('file_name', f.get('name', '')) for f in results['files']}
            elif 'documents' in results:
                # Formato: {'documents': {...}}
                cached_files = set(results['documents'].keys())
            elif isinstance(results, list):
                # Formato: [...]
                cached_files = {f.get('file_name', f.get('name', '')) for f in results}

            # Comparar con archivos fuente
            source_file_names = {f.get('name', f.get('file_name', '')) for f in source_files}

            # Cache es válido si contiene TODOS los archivos fuente
            is_valid = source_file_names.issubset(cached_files)

            if is_valid:
                logger.info(f"✓ Cache válido para {stage_name}: {len(cached_files)} archivos")
            else:
                missing = source_file_names - cached_files
                logger.info(f"Cache incompleto para {stage_name}: faltan {len(missing)} archivos")
                logger.debug(f"Archivos faltantes: {missing}")

            return is_valid

        except Exception as e:
            logger.error(f"Error validando freshness de cache para {stage_name}: {e}")
            return False

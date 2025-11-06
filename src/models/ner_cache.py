"""
Módulo de caché para análisis NER
Guarda y carga resultados de análisis NER desde Google Drive
"""

import os
import pickle
import json
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path
from src.utils.logger import get_logger

# Inicializar logger
logger = get_logger(__name__)


class NERCache:
    """Gestor de caché para análisis NER en Google Drive"""

    def __init__(self, drive_folder_id: str = None):
        """
        Inicializa el gestor de caché

        Args:
            drive_folder_id: ID de la carpeta en Google Drive (opcional)
        """
        self.drive_folder_id = drive_folder_id
        self.cache_folder = "ner_analysis_cache"
        self.metadata_file = "ner_metadata.json"
        self.results_file = "ner_results.pkl"

    def _get_cache_path(self, filename: str) -> str:
        """Obtiene la ruta local del archivo de caché"""
        cache_dir = Path("cache") / self.cache_folder
        cache_dir.mkdir(parents=True, exist_ok=True)
        return str(cache_dir / filename)

    def save_analysis(self,
                     corpus_analysis: Dict[str, Any],
                     document_count: int,
                     total_chars: int,
                     metadata: Dict[str, Any] = None) -> bool:
        """
        Guarda el análisis NER en caché local

        Args:
            corpus_analysis: Resultado del análisis de corpus
            document_count: Número de documentos analizados
            total_chars: Total de caracteres procesados
            metadata: Metadatos adicionales

        Returns:
            True si se guardó correctamente
        """
        try:
            # Preparar metadatos
            meta = {
                'timestamp': datetime.now().isoformat(),
                'document_count': document_count,
                'total_chars': total_chars,
                'corpus_stats': corpus_analysis.get('corpus_stats', {}),
                'version': '1.0'
            }

            if metadata:
                meta.update(metadata)

            # Guardar metadatos
            metadata_path = self._get_cache_path(self.metadata_file)
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(meta, f, indent=2, ensure_ascii=False)

            # Guardar resultados completos
            results_path = self._get_cache_path(self.results_file)
            with open(results_path, 'wb') as f:
                pickle.dump(corpus_analysis, f)

            logger.info("Análisis guardado en caché local exitosamente")
            logger.info(f"Documentos: {document_count}")
            logger.info(f"Caracteres procesados: {total_chars:,}")
            logger.info(f"Ubicación: {Path(metadata_path).parent}")

            return True

        except Exception as e:
            logger.error(f"Error al guardar caché: {str(e)}", exc_info=True)
            return False

    def load_analysis(self) -> Optional[Dict[str, Any]]:
        """
        Carga el análisis NER desde caché local

        Returns:
            Diccionario con el análisis o None si no existe
        """
        try:
            metadata_path = self._get_cache_path(self.metadata_file)
            results_path = self._get_cache_path(self.results_file)

            # Verificar que existan los archivos
            if not os.path.exists(metadata_path) or not os.path.exists(results_path):
                return None

            # Cargar metadatos
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)

            # Cargar resultados
            with open(results_path, 'rb') as f:
                corpus_analysis = pickle.load(f)

            # Agregar metadatos al resultado
            corpus_analysis['cache_metadata'] = metadata

            logger.info("Análisis cargado desde caché exitosamente")
            logger.info(f"Fecha: {metadata.get('timestamp', 'Desconocida')}")
            logger.info(f"Documentos: {metadata.get('document_count', 0)}")
            logger.info(f"Caracteres: {metadata.get('total_chars', 0):,}")

            return corpus_analysis

        except Exception as e:
            logger.error(f"Error al cargar caché: {str(e)}", exc_info=True)
            return None

    def cache_exists(self) -> bool:
        """
        Verifica si existe un caché válido

        Returns:
            True si existe caché válido
        """
        metadata_path = self._get_cache_path(self.metadata_file)
        results_path = self._get_cache_path(self.results_file)

        exists = os.path.exists(metadata_path) and os.path.exists(results_path)

        if exists:
            try:
                # Verificar que los archivos sean válidos
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    json.load(f)
                with open(results_path, 'rb') as f:
                    pickle.load(f)
                return True
            except:
                return False

        return False

    def get_cache_info(self) -> Optional[Dict[str, Any]]:
        """
        Obtiene información del caché sin cargar los resultados completos

        Returns:
            Diccionario con metadatos o None si no existe
        """
        try:
            metadata_path = self._get_cache_path(self.metadata_file)

            if not os.path.exists(metadata_path):
                return None

            with open(metadata_path, 'r', encoding='utf-8') as f:
                return json.load(f)

        except Exception as e:
            logger.error(f"Error al obtener info de caché: {str(e)}", exc_info=True)
            return None

    def clear_cache(self) -> bool:
        """
        Elimina el caché existente

        Returns:
            True si se eliminó correctamente
        """
        try:
            metadata_path = self._get_cache_path(self.metadata_file)
            results_path = self._get_cache_path(self.results_file)

            if os.path.exists(metadata_path):
                os.remove(metadata_path)
            if os.path.exists(results_path):
                os.remove(results_path)

            logger.info("Caché eliminado correctamente")
            return True

        except Exception as e:
            logger.error(f"Error al eliminar caché: {str(e)}", exc_info=True)
            return False

    def save_to_drive(self, drive_service) -> bool:
        """
        Sube el caché local a Google Drive

        Args:
            drive_service: Servicio de Google Drive autenticado

        Returns:
            True si se subió correctamente
        """
        try:
            from googleapiclient.http import MediaFileUpload

            metadata_path = self._get_cache_path(self.metadata_file)
            results_path = self._get_cache_path(self.results_file)

            if not os.path.exists(metadata_path) or not os.path.exists(results_path):
                logger.warning("No hay caché local para subir")
                return False

            # Crear carpeta en Drive si no existe
            if not self.drive_folder_id:
                folder_metadata = {
                    'name': self.cache_folder,
                    'mimeType': 'application/vnd.google-apps.folder'
                }
                folder = drive_service.files().create(
                    body=folder_metadata,
                    fields='id'
                ).execute()
                self.drive_folder_id = folder.get('id')

            # Subir archivos
            for local_file, drive_name in [
                (metadata_path, self.metadata_file),
                (results_path, self.results_file)
            ]:
                file_metadata = {
                    'name': drive_name,
                    'parents': [self.drive_folder_id]
                }
                media = MediaFileUpload(local_file, resumable=True)

                # Buscar si ya existe el archivo
                query = f"name='{drive_name}' and '{self.drive_folder_id}' in parents and trashed=false"
                results = drive_service.files().list(q=query, fields='files(id)').execute()
                files = results.get('files', [])

                if files:
                    # Actualizar archivo existente
                    file_id = files[0]['id']
                    drive_service.files().update(
                        fileId=file_id,
                        media_body=media
                    ).execute()
                else:
                    # Crear nuevo archivo
                    drive_service.files().create(
                        body=file_metadata,
                        media_body=media,
                        fields='id'
                    ).execute()

            logger.info("Caché subido a Google Drive exitosamente")
            return True

        except Exception as e:
            logger.error(f"Error al subir a Drive: {str(e)}", exc_info=True)
            return False

    def load_from_drive(self, drive_service) -> bool:
        """
        Descarga el caché desde Google Drive

        Args:
            drive_service: Servicio de Google Drive autenticado

        Returns:
            True si se descargó correctamente
        """
        try:
            from googleapiclient.http import MediaIoBaseDownload
            import io

            if not self.drive_folder_id:
                logger.warning("No se ha configurado el ID de carpeta en Drive")
                return False

            # Buscar archivos en Drive
            for drive_name in [self.metadata_file, self.results_file]:
                query = f"name='{drive_name}' and '{self.drive_folder_id}' in parents and trashed=false"
                results = drive_service.files().list(q=query, fields='files(id)').execute()
                files = results.get('files', [])

                if not files:
                    logger.warning(f"No se encontró {drive_name} en Drive")
                    return False

                # Descargar archivo
                file_id = files[0]['id']
                request = drive_service.files().get_media(fileId=file_id)

                local_path = self._get_cache_path(drive_name)
                with open(local_path, 'wb') as f:
                    downloader = MediaIoBaseDownload(f, request)
                    done = False
                    while not done:
                        status, done = downloader.next_chunk()

            logger.info("Caché descargado desde Google Drive exitosamente")
            return True

        except Exception as e:
            logger.error(f"Error al descargar desde Drive: {str(e)}", exc_info=True)
            return False

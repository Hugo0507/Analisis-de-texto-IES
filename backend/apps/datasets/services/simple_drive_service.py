"""
Simple Drive Service - Enfoque similar a Google Colab.

Usa la API de Drive pero de forma más directa y simple.
"""

import logging
import os
from pathlib import Path
from typing import List, Dict
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.infrastructure.storage.drive_gateway import DriveGateway
from ..models import Dataset

logger = logging.getLogger(__name__)


class SimpleDriveService:
    """
    Servicio simplificado para Drive - Similar al enfoque de Colab.

    En lugar de procesar archivo por archivo, lista TODO primero
    y luego descarga en lote.
    """

    def __init__(self, user):
        """
        Initialize SimpleDriveService with user OAuth tokens.

        Args:
            user: Django User instance with Google Drive connection
        """
        self.user = user
        self.drive_gateway = DriveGateway(user=user)
        self.temp_dir = Path(settings.MEDIA_ROOT) / 'temp_drive' if hasattr(settings, 'MEDIA_ROOT') else Path('media/temp_drive')
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def quick_process_drive_folder(
        self,
        dataset: Dataset,
        folder_id: str
    ) -> Dict[str, any]:
        """
        Procesar carpeta de Drive de forma rápida y simple.

        Similar al enfoque de Colab:
        1. Listar TODOS los archivos recursivamente
        2. Descargar todos en paralelo
        3. Procesar como archivos locales

        Args:
            dataset: Dataset instance
            folder_id: Google Drive folder ID

        Returns:
            Resultado del procesamiento
        """
        results = {
            'success': False,
            'files_found': 0,
            'downloaded': 0,
            'processed': 0,
            'errors': []
        }

        try:
            # 1. Autenticar
            if not self.drive_gateway.authenticate():
                results['errors'].append('No se pudo autenticar con Google Drive')
                return results

            # 2. Listar TODOS los archivos recursivamente
            logger.info(f"Listando archivos desde Drive folder {folder_id}...")
            all_files = self._list_all_files_recursive(folder_id)
            results['files_found'] = len(all_files)

            if not all_files:
                results['errors'].append('No se encontraron archivos en la carpeta')
                return results

            logger.info(f"Encontrados {len(all_files)} archivos en Drive")

            # 3. Crear estructura local temporal (como en Colab)
            dataset_temp_root = self.temp_dir / f"dataset_{dataset.id}"
            dataset_temp_root.mkdir(parents=True, exist_ok=True)

            # 4. Descargar todos los archivos manteniendo estructura
            downloaded_files = []
            for file_info in all_files:
                # Saltar formatos de Google Docs
                if file_info['mimeType'].startswith('application/vnd.google-apps'):
                    continue

                # Descargar preservando ruta
                local_path = self._download_to_local_structure(
                    file_info,
                    dataset_temp_root
                )

                if local_path:
                    downloaded_files.append(local_path)
                    results['downloaded'] += 1

            # 5. Ahora tenemos los archivos localmente, como en Colab!
            # Usar os.walk() exactamente como en tu código
            logger.info(f"Archivos descargados en: {dataset_temp_root}")
            logger.info(f"Total descargados: {len(downloaded_files)}")

            # 6. Procesarlos con el mismo flujo que uploads locales
            from .dataset_processor import DatasetProcessorService
            processor = DatasetProcessorService()

            # Convertir archivos locales a UploadedFile
            uploaded_files = []
            for local_file_path in downloaded_files:
                uploaded_file = self._create_uploaded_file_from_local(local_file_path, dataset_temp_root)
                if uploaded_file:
                    uploaded_files.append(uploaded_file)

            # Procesar
            if uploaded_files:
                proc_results = processor.process_uploaded_files(dataset, uploaded_files)
                results['processed'] = proc_results['processed']
                results['success'] = proc_results['success']
                if proc_results['errors']:
                    results['errors'].extend(proc_results['errors'])

            # 7. Limpiar
            import shutil
            if dataset_temp_root.exists():
                shutil.rmtree(dataset_temp_root)

            return results

        except Exception as e:
            logger.exception(f"Error en procesamiento rápido de Drive: {e}")
            results['errors'].append(str(e))
            return results

    def _list_all_files_recursive(self, folder_id: str) -> List[Dict]:
        """
        Listar TODOS los archivos recursivamente, similar a os.walk().

        Returns:
            Lista de diccionarios con info de archivos y su ruta relativa
        """
        all_files = []

        # Construir mapa de estructura de carpetas
        folder_structure = self._build_folder_map(folder_id)

        # Listar archivos en cada carpeta
        for fid, fpath in folder_structure.items():
            try:
                query = f"'{fid}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'"
                results = self.drive_gateway.service.files().list(
                    q=query,
                    pageSize=1000,
                    fields="files(id, name, mimeType, size)"
                ).execute()

                files = results.get('files', [])
                for file in files:
                    file['relative_path'] = fpath  # Guardar ruta relativa
                    all_files.append(file)

            except Exception as e:
                logger.warning(f"Error listando archivos en carpeta {fid}: {e}")
                continue

        return all_files

    def _build_folder_map(self, root_folder_id: str) -> Dict[str, str]:
        """
        Construir mapa de carpetas y sus rutas relativas.
        Similar a os.walk() que da la ruta de cada directorio.
        """
        folder_map = {root_folder_id: ""}  # Root = ruta vacía
        to_process = [(root_folder_id, "")]

        while to_process:
            current_id, current_path = to_process.pop(0)

            try:
                query = f"'{current_id}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'"
                results = self.drive_gateway.service.files().list(
                    q=query,
                    pageSize=1000,
                    fields="files(id, name)"
                ).execute()

                folders = results.get('files', [])
                for folder in folders:
                    folder_path = f"{current_path}/{folder['name']}" if current_path else folder['name']
                    folder_map[folder['id']] = folder_path
                    to_process.append((folder['id'], folder_path))

            except Exception as e:
                logger.warning(f"Error construyendo mapa de carpetas: {e}")
                continue

        return folder_map

    def _download_to_local_structure(
        self,
        file_info: Dict,
        root_dir: Path
    ) -> Path:
        """
        Descargar archivo preservando estructura de directorios.
        Como cuando haces os.walk() en Colab.
        """
        try:
            relative_path = file_info.get('relative_path', '')
            file_name = file_info['name']

            # Crear subdirectorios si existen
            if relative_path:
                target_dir = root_dir / relative_path
                target_dir.mkdir(parents=True, exist_ok=True)
            else:
                target_dir = root_dir

            # Ruta completa del archivo
            local_file_path = target_dir / file_name

            # Descargar
            success = self.drive_gateway.download_file(
                file_id=file_info['id'],
                destination_path=str(local_file_path)
            )

            if success:
                return local_file_path
            else:
                return None

        except Exception as e:
            logger.error(f"Error descargando {file_info.get('name')}: {e}")
            return None

    def _create_uploaded_file_from_local(
        self,
        local_file_path: Path,
        root_dir: Path
    ) -> SimpleUploadedFile:
        """
        Convertir archivo local a UploadedFile.
        Preserva la ruta relativa para mantener estructura de directorios.
        """
        try:
            # Calcular ruta relativa desde root
            relative_path = local_file_path.relative_to(root_dir)

            # Leer contenido
            with open(local_file_path, 'rb') as f:
                content = f.read()

            # Crear UploadedFile con ruta completa (para preservar directorios)
            uploaded_file = SimpleUploadedFile(
                name=str(relative_path),  # Mantiene estructura: "folder1/folder2/file.pdf"
                content=content,
                content_type=self._guess_content_type(local_file_path.suffix)
            )

            uploaded_file.size = len(content)
            return uploaded_file

        except Exception as e:
            logger.error(f"Error creando UploadedFile: {e}")
            return None

    def _guess_content_type(self, extension: str) -> str:
        """Adivinar content type desde extensión."""
        types = {
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
        return types.get(extension.lower(), 'application/octet-stream')

"""
Google Drive file download for data preparation.

Downloads files from Google Drive to temporary local paths
for processing by the PDF extractor.
"""

import logging
import os
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)


class DriveFileDownloader:
    """Descarga archivos temporales desde Google Drive."""

    @staticmethod
    def download_from_drive(file_id: str, user) -> Optional[str]:
        """
        Descarga un archivo de Drive a un archivo temporal.

        Args:
            file_id: ID del archivo en Google Drive (sin el prefijo drive://)
            user: Usuario propietario del archivo

        Returns:
            str: Ruta al archivo temporal descargado, o None si falla
        """
        try:
            from apps.infrastructure.storage.drive_gateway import DriveGateway

            gateway = DriveGateway(user=user)
            gateway.authenticate()

            temp_fd, temp_path = tempfile.mkstemp(suffix='.pdf')
            os.close(temp_fd)

            request = gateway.service.files().get_media(fileId=file_id)
            with open(temp_path, 'wb') as f:
                import io
                from googleapiclient.http import MediaIoBaseDownload
                downloader = MediaIoBaseDownload(f, request)
                done = False
                while not done:
                    status, done = downloader.next_chunk()

            logger.debug(f"File downloaded from Drive: {file_id} -> {temp_path}")
            return temp_path

        except Exception as e:
            logger.error(f"Error downloading file from Drive {file_id}: {e}")
            return None

    @staticmethod
    def cleanup_temp_file(temp_path: str):
        """Elimina un archivo temporal."""
        try:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
                logger.debug(f"Temp file deleted: {temp_path}")
        except Exception as e:
            logger.warning(f"Error deleting temp file {temp_path}: {e}")

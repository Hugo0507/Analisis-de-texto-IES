"""
Módulo de Conexión a Google Drive
Conecta y descarga archivos de Google Drive
"""

import os
import io
import time
from typing import List, Dict, Optional, Union, Any
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from googleapiclient.errors import HttpError
from collections import defaultdict
import pandas as pd
import ssl
import socket
from src.utils.logger import get_logger

# Inicializar logger
logger = get_logger(__name__)

# Alcances necesarios para Google Drive (lectura y escritura)
# Necesario para crear carpetas, copiar archivos y crear archivos de texto
SCOPES = ['https://www.googleapis.com/auth/drive']


class GoogleDriveConnector:
    """Clase para conectar y descargar archivos de Google Drive"""

    def __init__(self, credentials_path: str = 'credentials.json', token_path: str = 'token.json') -> None:
        """
        Inicializa el conector de Google Drive

        Args:
            credentials_path: Ruta al archivo credentials.json
            token_path: Ruta donde se guardará el token de autenticación
        """
        self.credentials_path: str = credentials_path
        self.token_path: str = token_path
        self.service: Optional[Any] = None
        self.creds: Optional[Credentials] = None
        logger.info(f"Inicializando GoogleDriveConnector con credentials_path={credentials_path}")

    def authenticate(self) -> bool:
        """
        Autentica con Google Drive usando OAuth2

        Returns:
            True si la autenticación fue exitosa, False en caso contrario
        """
        logger.info("Iniciando autenticación con Google Drive")
        creds: Optional[Credentials] = None

        # Verificar si existe un token guardado
        if os.path.exists(self.token_path):
            try:
                creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
                logger.info("Token existente cargado exitosamente")
            except Exception as e:
                logger.error(f"Error al cargar token: {e}")

        # Si no hay credenciales válidas, solicitar login
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    logger.info("Refrescando token expirado")
                    creds.refresh(Request())
                    logger.info("Token refrescado exitosamente")
                except Exception as e:
                    logger.error(f"Error al refrescar token: {e}")
                    creds = None

            if not creds:
                if not os.path.exists(self.credentials_path):
                    logger.error(f"No se encontró el archivo {self.credentials_path}")
                    return False

                try:
                    logger.info("Iniciando flujo de autenticación OAuth2")
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_path, SCOPES)
                    creds = flow.run_local_server(port=0)
                    logger.info("Autenticación OAuth2 completada exitosamente")
                except Exception as e:
                    logger.error(f"Error en autenticación OAuth2: {e}", exc_info=True)
                    return False

            # Guardar las credenciales para la próxima vez
            try:
                with open(self.token_path, 'w') as token:
                    token.write(creds.to_json())
                logger.info(f"Token guardado en {self.token_path}")
            except Exception as e:
                logger.warning(f"No se pudo guardar token: {e}")

        self.creds = creds

        # Crear servicio de Drive API
        try:
            self.service = build('drive', 'v3', credentials=creds)
            logger.info("Servicio de Google Drive API creado exitosamente")
            return True
        except Exception as e:
            logger.error(f"Error al crear servicio de Drive API: {e}", exc_info=True)
            return False

    def validate_connection(self) -> bool:
        """
        Valida que la conexión con Google Drive esté activa

        Returns:
            True si la conexión es válida, False en caso contrario
        """
        if not self.service:
            logger.warning("No hay servicio de Google Drive disponible para validar")
            return False

        try:
            # Intentar una operación simple para validar la conexión
            self.service.about().get(fields="user").execute()
            logger.debug("Conexión con Google Drive validada exitosamente")
            return True
        except Exception as e:
            logger.error(f"Error validando conexión con Google Drive: {e}", exc_info=True)
            return False

    def ensure_connection(self) -> bool:
        """
        Asegura que la conexión esté activa, re-autenticando si es necesario

        Returns:
            True si la conexión está activa, False en caso contrario
        """
        if self.validate_connection():
            return True

        logger.info("Intentando re-establecer conexión con Google Drive...")

        # Intentar refrescar credenciales
        if self.creds and self.creds.expired and self.creds.refresh_token:
            try:
                self.creds.refresh(Request())
                self.service = build('drive', 'v3', credentials=self.creds)
                if self.validate_connection():
                    logger.info("Conexión re-establecida exitosamente")
                    return True
            except Exception as e:
                logger.error(f"Error al refrescar credenciales: {e}", exc_info=True)

        logger.error("No se pudo re-establecer la conexión con Google Drive")
        return False

    def get_folder_id_from_url(self, url):
        """
        Extrae el ID de carpeta de una URL de Google Drive

        Args:
            url: URL de Google Drive

        Returns:
            ID de la carpeta
        """
        if 'folders/' in url:
            return url.split('folders/')[1].split('?')[0]
        return url

    def list_files_in_folder(self, folder_id: str, recursive: bool = True) -> List[Dict[str, Any]]:
        """
        Lista todos los archivos en una carpeta de Google Drive

        Args:
            folder_id: ID de la carpeta
            recursive: Si True, busca en subcarpetas también

        Returns:
            Lista de diccionarios con información de archivos
        """
        if not self.service:
            logger.error("Debe autenticarse primero antes de listar archivos")
            return []

        all_files: List[Dict[str, Any]] = []

        def list_folder_contents(fid: str, parent_path: str = "") -> None:
            try:
                query = f"'{fid}' in parents and trashed=false"
                results = self.service.files().list(
                    q=query,
                    fields="files(id, name, mimeType, size, createdTime, modifiedTime)",
                    pageSize=1000
                ).execute()

                items = results.get('files', [])
                logger.debug(f"Encontrados {len(items)} items en carpeta {fid}")

                for item in items:
                    file_path = os.path.join(parent_path, item['name'])

                    if item['mimeType'] == 'application/vnd.google-apps.folder':
                        # Es una carpeta
                        if recursive:
                            list_folder_contents(item['id'], file_path)
                    else:
                        # Es un archivo
                        item['path'] = file_path
                        item['directory'] = parent_path if parent_path else '/'
                        all_files.append(item)

            except Exception as e:
                logger.error(f"Error listando carpeta {fid}: {e}", exc_info=True)

        list_folder_contents(folder_id)
        logger.info(f"Listado completo: {len(all_files)} archivos encontrados")
        return all_files

    def read_file_content(self, file_id: str, max_retries: int = 3) -> Optional[io.BytesIO]:
        """
        Lee el contenido de un archivo de Google Drive en memoria (sin descargar)
        Con sistema de reintentos y manejo robusto de errores SSL

        Args:
            file_id: ID del archivo en Drive
            max_retries: Número máximo de reintentos (default: 3)

        Returns:
            BytesIO con el contenido del archivo, o None si hay error
        """
        if not self.service:
            logger.error("Debe autenticarse primero antes de leer archivos")
            return None

        logger.debug(f"Leyendo archivo {file_id} (max_retries={max_retries})")

        for attempt in range(max_retries):
            try:
                # Validar que el servicio esté activo
                if not self.service:
                    logger.error("Servicio de Drive no disponible")
                    return None

                request = self.service.files().get_media(fileId=file_id)

                # Descargar a memoria (BytesIO)
                file_content = io.BytesIO()
                downloader = MediaIoBaseDownload(file_content, request)

                done = False
                while not done:
                    status, done = downloader.next_chunk()

                # Rebobinar al inicio
                file_content.seek(0)

                logger.info(f"Archivo {file_id} leído exitosamente")
                return file_content

            except ssl.SSLError as e:
                # Errores SSL específicos
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt)  # Backoff exponencial: 1s, 2s, 4s
                    logger.warning(f"Error SSL leyendo archivo {file_id} (intento {attempt + 1}/{max_retries}). Reintentando en {wait_time}s...")
                    time.sleep(wait_time)

                    # Intentar re-autenticar si el error persiste
                    if attempt == 1:
                        logger.info("Intentando re-autenticar...")
                        try:
                            if self.creds and self.creds.expired and self.creds.refresh_token:
                                self.creds.refresh(Request())
                                self.service = build('drive', 'v3', credentials=self.creds)
                                logger.info("Re-autenticación exitosa")
                        except Exception as refresh_error:
                            logger.error(f"Error al refrescar credenciales: {refresh_error}")
                    continue
                else:
                    logger.error(f"Error SSL leyendo archivo {file_id} después de {max_retries} intentos: {e}")
                    return None

            except (socket.timeout, socket.error, ConnectionError) as e:
                # Errores de conexión de red
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt)
                    logger.warning(f"Error de conexión leyendo archivo {file_id} (intento {attempt + 1}/{max_retries}). Reintentando en {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"Error de conexión leyendo archivo {file_id} después de {max_retries} intentos: {e}")
                    return None

            except HttpError as e:
                # Errores HTTP de la API de Google
                if e.resp.status in [403, 404]:
                    logger.error(f"Error de acceso al archivo {file_id}: {e.resp.status} - {e}")
                    return None
                elif e.resp.status in [500, 502, 503, 504] and attempt < max_retries - 1:
                    # Errores de servidor - reintentar
                    wait_time = (2 ** attempt)
                    logger.warning(f"Error de servidor {e.resp.status} (intento {attempt + 1}/{max_retries}). Reintentando en {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"Error HTTP leyendo archivo {file_id}: {e}")
                    return None

            except AttributeError as e:
                # Error cuando file_content es None
                if "'NoneType' object has no attribute 'close'" in str(e):
                    logger.error(f"No se pudo crear el objeto BytesIO para {file_id}")
                    return None
                else:
                    logger.error(f"Error de atributo leyendo archivo {file_id}: {e}")
                    return None

            except Exception as e:
                # Otros errores
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt)
                    logger.warning(f"Error inesperado leyendo archivo {file_id} (intento {attempt + 1}/{max_retries}). Reintentando en {wait_time}s...")
                    logger.debug(f"Detalle: {type(e).__name__}: {e}")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"Error leyendo archivo {file_id} después de {max_retries} intentos: {e}", exc_info=True)
                    return None

        return None

    def download_file(self, file_id: str, destination_path: str) -> bool:
        """
        Descarga un archivo de Google Drive

        Args:
            file_id: ID del archivo en Drive
            destination_path: Ruta donde guardar el archivo

        Returns:
            True si la descarga fue exitosa, False en caso contrario
        """
        if not self.service:
            logger.error("Debe autenticarse primero antes de descargar archivos")
            return False

        try:
            logger.info(f"Descargando archivo {file_id} a {destination_path}")
            request = self.service.files().get_media(fileId=file_id)

            # Crear directorio si no existe
            os.makedirs(os.path.dirname(destination_path), exist_ok=True)

            # Descargar archivo
            with io.FileIO(destination_path, 'wb') as fh:
                downloader = MediaIoBaseDownload(fh, request)
                done = False
                while not done:
                    status, done = downloader.next_chunk()
                    if status:
                        logger.debug(f"Progreso de descarga: {int(status.progress() * 100)}%")

            logger.info(f"Archivo {file_id} descargado exitosamente")
            return True

        except Exception as e:
            logger.error(f"Error descargando archivo {file_id}: {e}", exc_info=True)
            return False

    def download_folder(self, folder_id, destination_folder, file_types=None):
        """
        Descarga todos los archivos de una carpeta

        Args:
            folder_id: ID de la carpeta
            destination_folder: Carpeta de destino local
            file_types: Lista de extensiones a descargar (ej: ['.pdf', '.docx'])
                       Si es None, descarga todos

        Returns:
            Lista de archivos descargados exitosamente
        """
        files = self.list_files_in_folder(folder_id)
        downloaded = []

        for file in files:
            # Filtrar por tipo si se especificó
            if file_types:
                file_ext = os.path.splitext(file['name'])[1].lower()
                if file_ext not in file_types:
                    continue

            # Crear ruta de destino
            dest_path = os.path.join(destination_folder, file['path'])

            # Descargar
            if self.download_file(file['id'], dest_path):
                downloaded.append({
                    'name': file['name'],
                    'path': dest_path,
                    'directory': file['directory'],
                    'size': file.get('size', 0)
                })

        return downloaded

    def get_file_statistics(self, files):
        """
        Obtiene estadísticas de archivos

        Args:
            files: Lista de archivos obtenida de list_files_in_folder

        Returns:
            Diccionario con estadísticas
        """
        stats = {
            'total_files': len(files),
            'by_directory': defaultdict(int),
            'by_extension': defaultdict(int),
            'total_size': 0,
            'by_mimetype': defaultdict(int)
        }

        for file in files:
            # Contar por directorio
            directory = file.get('directory', '/')
            stats['by_directory'][directory] += 1

            # Contar por extensión
            ext = os.path.splitext(file['name'])[1].lower()
            if ext:
                stats['by_extension'][ext] += 1
            else:
                stats['by_extension']['sin_extension'] += 1

            # Sumar tamaño
            size = int(file.get('size', 0))
            stats['total_size'] += size

            # Contar por tipo MIME
            mime = file.get('mimeType', 'unknown')
            stats['by_mimetype'][mime] += 1

        return stats

    def create_file_dataframe(self, files):
        """
        Crea un DataFrame de pandas con la información de archivos

        Args:
            files: Lista de archivos

        Returns:
            DataFrame de pandas
        """
        data = []
        for file in files:
            data.append({
                'Nombre': file['name'],
                'Directorio': file.get('directory', '/'),
                'Ruta': file.get('path', file['name']),
                'Tamaño (bytes)': int(file.get('size', 0)),
                'Tipo MIME': file.get('mimeType', 'unknown'),
                'Extensión': os.path.splitext(file['name'])[1].lower(),
                'ID': file['id']
            })

        return pd.DataFrame(data)

    def create_directory_summary_table(self, files):
        """
        Crea una tabla resumida de archivos por directorio

        Args:
            files: Lista de archivos

        Returns:
            DataFrame con resumen por directorio
        """
        stats = self.get_file_statistics(files)

        data = []
        for directory, count in sorted(stats['by_directory'].items()):
            data.append({
                'Directorio': directory if directory else '/',
                'Cantidad de Archivos': count
            })

        df = pd.DataFrame(data)

        # Agregar fila de total
        total_row = pd.DataFrame([{
            'Directorio': 'TOTAL',
            'Cantidad de Archivos': stats['total_files']
        }])

        df = pd.concat([df, total_row], ignore_index=True)

        return df

    def create_folder(self, folder_name: str, parent_folder_id: Optional[str] = None) -> Optional[str]:
        """
        Crea una nueva carpeta en Google Drive

        Args:
            folder_name: Nombre de la carpeta a crear
            parent_folder_id: ID de la carpeta padre (None = raíz)

        Returns:
            ID de la carpeta creada, o None si hay error
        """
        if not self.service:
            logger.error("Debe autenticarse primero antes de crear carpetas")
            return None

        try:
            logger.info(f"Creando carpeta '{folder_name}' en Google Drive")
            file_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }

            if parent_folder_id:
                file_metadata['parents'] = [parent_folder_id]

            folder = self.service.files().create(
                body=file_metadata,
                fields='id, name'
            ).execute()

            folder_id = folder.get('id')
            logger.info(f"Carpeta '{folder_name}' creada exitosamente con ID: {folder_id}")
            return folder_id

        except Exception as e:
            logger.error(f"Error creando carpeta '{folder_name}': {e}", exc_info=True)
            return None

    def copy_file(self, file_id: str, destination_folder_id: str, new_name: Optional[str] = None) -> Optional[str]:
        """
        Copia un archivo a otra carpeta en Drive

        Args:
            file_id: ID del archivo a copiar
            destination_folder_id: ID de la carpeta destino
            new_name: Nuevo nombre (opcional, usa el original si es None)

        Returns:
            ID del archivo copiado, o None si hay error
        """
        if not self.service:
            logger.error("Debe autenticarse primero antes de copiar archivos")
            return None

        try:
            logger.info(f"Copiando archivo {file_id} a carpeta {destination_folder_id}")

            # Obtener información del archivo original
            original_file = self.service.files().get(
                fileId=file_id,
                fields='name'
            ).execute()

            file_metadata = {
                'parents': [destination_folder_id]
            }

            if new_name:
                file_metadata['name'] = new_name
            else:
                file_metadata['name'] = original_file['name']

            copied_file = self.service.files().copy(
                fileId=file_id,
                body=file_metadata,
                fields='id, name'
            ).execute()

            copied_id = copied_file.get('id')
            logger.info(f"Archivo {file_id} copiado exitosamente con ID: {copied_id}")
            return copied_id

        except Exception as e:
            logger.error(f"Error copiando archivo {file_id} a carpeta {destination_folder_id}: {e}", exc_info=True)
            return None

    def copy_files_to_folder(self, file_ids, destination_folder_id):
        """
        Copia múltiples archivos a una carpeta

        Args:
            file_ids: Lista de IDs de archivos a copiar
            destination_folder_id: ID de la carpeta destino

        Returns:
            Lista de diccionarios con resultados (success, file_id, new_id)
        """
        results = []

        for file_id in file_ids:
            new_id = self.copy_file(file_id, destination_folder_id)

            results.append({
                'original_id': file_id,
                'new_id': new_id,
                'success': new_id is not None
            })

        return results

    def filter_files_by_extension(self, files, extensions):
        """
        Filtra archivos por extensión

        Args:
            files: Lista de archivos de list_files_in_folder
            extensions: Lista de extensiones (ej: ['.pdf', '.docx'])
                       o string única (ej: '.pdf')

        Returns:
            Lista de archivos filtrados
        """
        if isinstance(extensions, str):
            extensions = [extensions]

        # Normalizar extensiones (añadir punto si falta)
        extensions = [ext if ext.startswith('.') else f'.{ext}' for ext in extensions]
        extensions = [ext.lower() for ext in extensions]

        filtered = []
        for file in files:
            file_ext = os.path.splitext(file['name'])[1].lower()
            if file_ext in extensions:
                filtered.append(file)

        return filtered

    def get_parent_folder_id(self, folder_id: str) -> Optional[str]:
        """
        Obtiene el ID de la carpeta padre de una carpeta dada

        Args:
            folder_id: ID de la carpeta

        Returns:
            ID de la carpeta padre, o None si hay error
        """
        if not self.service:
            logger.error("Debe autenticarse primero antes de obtener carpeta padre")
            return None

        try:
            logger.debug(f"Obteniendo carpeta padre de {folder_id}")

            file_metadata = self.service.files().get(
                fileId=folder_id,
                fields='parents'
            ).execute()

            parents = file_metadata.get('parents', [])
            if parents:
                logger.debug(f"Carpeta padre encontrada: {parents[0]}")
                return parents[0]

            logger.debug(f"Carpeta {folder_id} no tiene padre (probablemente raíz)")
            return None

        except Exception as e:
            logger.error(f"Error obteniendo carpeta padre de {folder_id}: {e}", exc_info=True)
            return None

    def get_or_create_folder(self, parent_folder_id: str, folder_name: str) -> Optional[str]:
        """
        Obtiene o crea una carpeta (verifica si existe primero)

        Args:
            parent_folder_id: ID de la carpeta padre
            folder_name: Nombre de la carpeta

        Returns:
            ID de la carpeta
        """
        if not self.service:
            logger.error("Debe autenticarse primero antes de obtener/crear carpetas")
            return None

        try:
            logger.debug(f"Buscando carpeta '{folder_name}' en {parent_folder_id}")

            # Buscar si ya existe la carpeta
            query = (f"name='{folder_name}' and '{parent_folder_id}' in parents "
                     f"and mimeType='application/vnd.google-apps.folder' "
                     f"and trashed=false")

            results = self.service.files().list(
                q=query,
                fields='files(id, name)'
            ).execute()

            folders = results.get('files', [])

            if folders:
                # Ya existe, retornar el ID
                folder_id = folders[0]['id']
                logger.info(f"Carpeta '{folder_name}' encontrada con ID: {folder_id}")
                return folder_id
            else:
                # No existe, crear
                logger.info(f"Carpeta '{folder_name}' no existe, creando...")
                return self.create_folder(folder_name, parent_folder_id)

        except Exception as e:
            logger.error(f"Error obteniendo/creando carpeta '{folder_name}': {e}", exc_info=True)
            return None

    def get_or_create_project_folder(self, parent_folder_id, project_name="Analisis_TD"):
        """
        Obtiene o crea una carpeta de proyecto para la persistencia
        (Alias de get_or_create_folder para compatibilidad)

        Args:
            parent_folder_id: ID de la carpeta padre
            project_name: Nombre de la carpeta de proyecto

        Returns:
            ID de la carpeta de proyecto
        """
        return self.get_or_create_folder(parent_folder_id, project_name)

    def create_persistence_folder(self, parent_folder_id, folder_name):
        """
        Crea una carpeta de persistencia secuencial

        Args:
            parent_folder_id: ID de la carpeta padre
            folder_name: Nombre de la carpeta (ej: '01_PDF_Files')

        Returns:
            ID de la carpeta creada
        """
        return self.create_folder(folder_name, parent_folder_id)

    def create_text_file(self, folder_id: str, file_name: str, content: str) -> Optional[str]:
        """
        Crea un archivo de texto en Google Drive

        Args:
            folder_id: ID de la carpeta donde crear el archivo
            file_name: Nombre del archivo (incluir extensión .txt)
            content: Contenido del archivo (string)

        Returns:
            ID del archivo creado, o None si hay error
        """
        if not self.service:
            logger.error("Debe autenticarse primero antes de crear archivos de texto")
            return None

        try:
            logger.info(f"Creando archivo de texto '{file_name}' en carpeta {folder_id}")

            file_metadata = {
                'name': file_name,
                'parents': [folder_id],
                'mimeType': 'text/plain'
            }

            # Crear el archivo con el contenido
            from googleapiclient.http import MediaIoBaseUpload

            media = MediaIoBaseUpload(
                io.BytesIO(content.encode('utf-8')),
                mimetype='text/plain',
                resumable=True
            )

            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, name'
            ).execute()

            file_id = file.get('id')
            logger.info(f"Archivo de texto '{file_name}' creado exitosamente con ID: {file_id}")
            return file_id

        except Exception as e:
            logger.error(f"Error creando archivo de texto '{file_name}': {e}", exc_info=True)
            return None

    def find_file_in_folder(self, folder_id: str, file_name: str) -> Optional[Dict[str, Any]]:
        """
        Busca un archivo por nombre en una carpeta específica

        Args:
            folder_id: ID de la carpeta donde buscar
            file_name: Nombre del archivo a buscar

        Returns:
            Diccionario con información del archivo (id, name), o None si no existe
        """
        if not self.service:
            logger.error("Debe autenticarse primero antes de buscar archivos")
            return None

        try:
            logger.debug(f"Buscando archivo '{file_name}' en carpeta {folder_id}")

            query = f"name='{file_name}' and '{folder_id}' in parents and trashed=false"

            results = self.service.files().list(
                q=query,
                fields='files(id, name, mimeType, size)'
            ).execute()

            files = results.get('files', [])

            if files:
                logger.info(f"Archivo '{file_name}' encontrado con ID: {files[0]['id']}")
                return files[0]

            logger.debug(f"Archivo '{file_name}' no encontrado en carpeta {folder_id}")
            return None

        except Exception as e:
            logger.error(f"Error buscando archivo '{file_name}' en carpeta {folder_id}: {e}", exc_info=True)
            return None

    def create_json_file(self, folder_id: str, file_name: str, json_data: Union[Dict, List]) -> Optional[str]:
        """
        Crea un archivo JSON en Google Drive

        Args:
            folder_id: ID de la carpeta donde crear el archivo
            file_name: Nombre del archivo (incluir extensión .json)
            json_data: Datos a guardar (dict o list)

        Returns:
            ID del archivo creado, o None si hay error
        """
        if not self.service:
            logger.error("Debe autenticarse primero antes de crear archivos JSON")
            return None

        try:
            import json

            logger.info(f"Creando archivo JSON '{file_name}' en carpeta {folder_id}")

            file_metadata = {
                'name': file_name,
                'parents': [folder_id],
                'mimeType': 'application/json'
            }

            # Convertir a JSON string
            json_content = json.dumps(json_data, indent=2, ensure_ascii=False)

            from googleapiclient.http import MediaIoBaseUpload

            media = MediaIoBaseUpload(
                io.BytesIO(json_content.encode('utf-8')),
                mimetype='application/json',
                resumable=True
            )

            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, name'
            ).execute()

            file_id = file.get('id')
            logger.info(f"Archivo JSON '{file_name}' creado exitosamente con ID: {file_id}")
            return file_id

        except Exception as e:
            logger.error(f"Error creando archivo JSON '{file_name}': {e}", exc_info=True)
            return None

    def read_json_file(self, file_id: str) -> Optional[Union[Dict, List]]:
        """
        Lee un archivo JSON desde Google Drive

        Args:
            file_id: ID del archivo JSON

        Returns:
            Datos del JSON (dict o list), o None si hay error
        """
        if not self.service:
            logger.error("Debe autenticarse primero antes de leer archivos JSON")
            return None

        try:
            import json

            logger.debug(f"Leyendo archivo JSON {file_id}")

            # Leer contenido
            file_content = self.read_file_content(file_id)

            if file_content:
                json_string = file_content.read().decode('utf-8')
                data = json.loads(json_string)
                logger.info(f"Archivo JSON {file_id} leído exitosamente")
                return data

            logger.warning(f"No se pudo leer contenido del archivo JSON {file_id}")
            return None

        except Exception as e:
            logger.error(f"Error leyendo archivo JSON {file_id}: {e}", exc_info=True)
            return None


def format_size(size_bytes):
    """
    Formatea tamaño en bytes a formato legible

    Args:
        size_bytes: Tamaño en bytes

    Returns:
        String formateado (ej: "1.5 MB")
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} PB"

"""
Google Drive Gateway.

Handles OAuth2 authentication for Google Drive operations using user tokens.
Each user connects their own Google Drive account via OAuth2 flow.
"""

import logging
import json
from pathlib import Path
from typing import Dict, List, Optional, TYPE_CHECKING
from django.conf import settings

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from googleapiclient.errors import HttpError
import io

if TYPE_CHECKING:
    from apps.users.models import User

logger = logging.getLogger(__name__)


class DriveGateway:
    """
    Gateway for Google Drive API operations.

    Handles:
    - OAuth2 authentication
    - File listing
    - File download
    - File upload
    - Folder management
    """

    # OAuth2 scopes
    SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

    def __init__(self, user: 'User' = None):
        """
        Initialize Drive Gateway with user OAuth tokens.

        Args:
            user: Django User instance with Google Drive connection.
                  Must have google_drive_connected=True and valid tokens.
        """
        self.user = user
        self.service = None
        self.credentials = None

    def authenticate(self) -> bool:
        """
        Authenticate with Google Drive using user's OAuth tokens.

        Uses encrypted tokens stored in the user's database record.
        Automatically refreshes expired tokens and saves new tokens back to database.

        Returns:
            True if authentication successful, False otherwise

        Raises:
            ValueError: If user is not provided or has not connected Google Drive

        Example:
            >>> from apps.users.models import User
            >>> user = User.objects.get(email='user@example.com')
            >>> gateway = DriveGateway(user=user)
            >>> if gateway.authenticate():
            >>>     print("Authenticated successfully")
        """
        if not self.user:
            logger.error("No user provided for authentication")
            return False

        if not self.user.google_drive_connected:
            logger.error(f"User {self.user.email} has not connected Google Drive")
            return False

        try:
            # Import here to avoid circular imports
            from apps.users.encryption import TokenEncryption

            # Decrypt tokens
            encryption = TokenEncryption()
            access_token = encryption.decrypt(self.user.google_drive_access_token)
            refresh_token = encryption.decrypt(self.user.google_drive_refresh_token) if self.user.google_drive_refresh_token else None

            # Parse scopes
            scopes = []
            if self.user.google_drive_scopes:
                try:
                    scopes = json.loads(self.user.google_drive_scopes)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse scopes for user {self.user.email}, using default")
                    scopes = self.SCOPES

            # Create credentials object
            self.credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri='https://oauth2.googleapis.com/token',
                client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
                client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
                scopes=scopes
            )

            # Check if token is expired and refresh if needed
            if self.credentials.expired and self.credentials.refresh_token:
                logger.info(f"Refreshing expired token for user {self.user.email}")
                self.credentials.refresh(Request())

                # Save new access token to database
                self.user.google_drive_access_token = encryption.encrypt(self.credentials.token)
                self.user.google_drive_token_expires_at = self.credentials.expiry
                self.user.save(update_fields=[
                    'google_drive_access_token',
                    'google_drive_token_expires_at'
                ])

                logger.info(f"Token refreshed and saved for user {self.user.email}")

            # Build Drive service
            self.service = build('drive', 'v3', credentials=self.credentials)

            logger.info(f"Authenticated successfully for user {self.user.email}")
            return True

        except Exception as e:
            logger.exception(f"Drive authentication failed for user {self.user.email}: {e}")
            return False

    def list_files(
        self,
        folder_id: Optional[str] = None,
        mime_type: Optional[str] = None,
        max_results: int = 100,
        recursive: bool = True
    ) -> List[Dict[str, any]]:
        """
        List files from Google Drive.

        Args:
            folder_id: Filter by parent folder ID
            mime_type: Filter by MIME type (e.g., 'application/pdf')
            max_results: Maximum number of results
            recursive: If True, search in subfolders recursively

        Returns:
            List of file metadata dictionaries

        Example:
            >>> gateway = DriveGateway()
            >>> gateway.authenticate()
            >>> files = gateway.list_files(folder_id='abc123', mime_type='application/pdf')
            >>> print(f"Found {len(files)} PDF files")
        """
        if not self.service:
            raise ValueError("Not authenticated. Call authenticate() first.")

        try:
            if recursive and folder_id:
                # Use recursive search
                return self._list_files_recursive(folder_id, mime_type, max_results)

            # Non-recursive search (original behavior)
            # Build query
            query_parts = []

            if folder_id:
                query_parts.append(f"'{folder_id}' in parents")

            if mime_type:
                query_parts.append(f"mimeType='{mime_type}'")

            # Add "not trashed" to query
            query_parts.append("trashed=false")

            query = ' and '.join(query_parts)

            # List files
            results = self.service.files().list(
                q=query,
                pageSize=max_results,
                fields="files(id, name, mimeType, size, createdTime, modifiedTime)"
            ).execute()

            files = results.get('files', [])

            logger.info(f"Listed {len(files)} files from Drive")

            return files

        except HttpError as e:
            logger.exception(f"Error listing files: {e}")
            return []

    def _list_files_recursive(
        self,
        folder_id: str,
        mime_type: Optional[str] = None,
        max_results: int = 100
    ) -> List[Dict[str, any]]:
        """
        Recursively list files from a folder and all its subfolders.

        Args:
            folder_id: Root folder ID to start search
            mime_type: Filter by MIME type (e.g., 'application/pdf')
            max_results: Maximum total number of files to return

        Returns:
            List of file metadata dictionaries from folder and subfolders
        """
        all_files = []
        folders_to_process = [folder_id]
        folders_processed = set()

        logger.info(f"Starting recursive search in folder {folder_id}")

        while folders_to_process and len(all_files) < max_results:
            current_folder = folders_to_process.pop(0)

            # Avoid processing same folder twice
            if current_folder in folders_processed:
                continue

            folders_processed.add(current_folder)

            try:
                # Get all items in current folder
                query = f"'{current_folder}' in parents and trashed=false"

                results = self.service.files().list(
                    q=query,
                    pageSize=1000,  # Get many items per request
                    fields="files(id, name, mimeType, size, createdTime, modifiedTime)"
                ).execute()

                items = results.get('files', [])

                for item in items:
                    # If it's a folder, add to processing queue
                    if item['mimeType'] == 'application/vnd.google-apps.folder':
                        folders_to_process.append(item['id'])
                        logger.debug(f"Found subfolder: {item['name']}")

                    # If it's a file and matches mime_type filter, add to results
                    elif mime_type is None or item['mimeType'] == mime_type:
                        all_files.append(item)
                        logger.debug(f"Found file: {item['name']} ({item['mimeType']})")

                        # Stop if we've reached max_results
                        if len(all_files) >= max_results:
                            break

            except HttpError as e:
                logger.warning(f"Error accessing folder {current_folder}: {e}")
                continue

        logger.info(
            f"Recursive search complete: Found {len(all_files)} files "
            f"across {len(folders_processed)} folders"
        )

        return all_files[:max_results]

    def download_file(
        self,
        file_id: str,
        destination_path: str
    ) -> bool:
        """
        Download file from Google Drive.

        Args:
            file_id: Google Drive file ID
            destination_path: Local path to save file

        Returns:
            True if download successful

        Example:
            >>> gateway = DriveGateway()
            >>> gateway.authenticate()
            >>> success = gateway.download_file('file_id_123', '/path/to/save.pdf')
        """
        if not self.service:
            raise ValueError("Not authenticated. Call authenticate() first.")

        try:
            request = self.service.files().get_media(fileId=file_id)

            # Create destination directory if needed
            dest_path = Path(destination_path)
            dest_path.parent.mkdir(parents=True, exist_ok=True)

            # Download file
            with io.FileIO(destination_path, 'wb') as fh:
                downloader = MediaIoBaseDownload(fh, request)

                done = False
                while not done:
                    status, done = downloader.next_chunk()
                    if status:
                        logger.debug(f"Download progress: {int(status.progress() * 100)}%")

            logger.info(f"Downloaded file {file_id} to {destination_path}")
            return True

        except HttpError as e:
            logger.exception(f"Error downloading file: {e}")
            return False

    def upload_file(
        self,
        file_path: str,
        parent_folder_id: Optional[str] = None,
        mime_type: Optional[str] = None
    ) -> Optional[str]:
        """
        Upload file to Google Drive.

        Args:
            file_path: Local file path to upload
            parent_folder_id: Parent folder ID (None for root)
            mime_type: MIME type (auto-detected if None)

        Returns:
            Uploaded file ID or None if failed

        Example:
            >>> gateway = DriveGateway()
            >>> gateway.authenticate()
            >>> file_id = gateway.upload_file('/path/to/matrix.pkl', folder_id='abc123')
            >>> print(f"Uploaded with ID: {file_id}")
        """
        if not self.service:
            raise ValueError("Not authenticated. Call authenticate() first.")

        try:
            file_path = Path(file_path)

            if not file_path.exists():
                logger.error(f"File not found: {file_path}")
                return None

            # Auto-detect MIME type if not provided
            if mime_type is None:
                mime_type = self._get_mime_type(file_path)

            # File metadata
            file_metadata = {
                'name': file_path.name
            }

            if parent_folder_id:
                file_metadata['parents'] = [parent_folder_id]

            # Upload file
            media = MediaFileUpload(
                str(file_path),
                mimetype=mime_type,
                resumable=True
            )

            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()

            file_id = file.get('id')

            logger.info(f"Uploaded {file_path.name} with ID: {file_id}")

            return file_id

        except HttpError as e:
            logger.exception(f"Error uploading file: {e}")
            return None

    def create_folder(
        self,
        folder_name: str,
        parent_folder_id: Optional[str] = None
    ) -> Optional[str]:
        """
        Create folder in Google Drive.

        Args:
            folder_name: Name of folder to create
            parent_folder_id: Parent folder ID (None for root)

        Returns:
            Created folder ID or None if failed

        Example:
            >>> gateway = DriveGateway()
            >>> gateway.authenticate()
            >>> folder_id = gateway.create_folder('Results', parent_id='abc123')
        """
        if not self.service:
            raise ValueError("Not authenticated. Call authenticate() first.")

        try:
            file_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }

            if parent_folder_id:
                file_metadata['parents'] = [parent_folder_id]

            folder = self.service.files().create(
                body=file_metadata,
                fields='id'
            ).execute()

            folder_id = folder.get('id')

            logger.info(f"Created folder '{folder_name}' with ID: {folder_id}")

            return folder_id

        except HttpError as e:
            logger.exception(f"Error creating folder: {e}")
            return None

    def get_file_metadata(self, file_id: str) -> Optional[Dict[str, any]]:
        """
        Get file metadata from Google Drive.

        Args:
            file_id: Google Drive file ID

        Returns:
            File metadata dictionary or None if failed

        Example:
            >>> gateway = DriveGateway()
            >>> gateway.authenticate()
            >>> metadata = gateway.get_file_metadata('file_id_123')
            >>> print(metadata['name'])
        """
        if not self.service:
            raise ValueError("Not authenticated. Call authenticate() first.")

        try:
            file = self.service.files().get(
                fileId=file_id,
                fields='id, name, mimeType, size, createdTime, modifiedTime, parents'
            ).execute()

            return file

        except HttpError as e:
            logger.exception(f"Error getting file metadata: {e}")
            return None

    def delete_file(self, file_id: str) -> bool:
        """
        Delete file from Google Drive.

        Args:
            file_id: Google Drive file ID

        Returns:
            True if deletion successful

        Example:
            >>> gateway = DriveGateway()
            >>> gateway.authenticate()
            >>> success = gateway.delete_file('file_id_123')
        """
        if not self.service:
            raise ValueError("Not authenticated. Call authenticate() first.")

        try:
            self.service.files().delete(fileId=file_id).execute()

            logger.info(f"Deleted file {file_id}")
            return True

        except HttpError as e:
            logger.exception(f"Error deleting file: {e}")
            return False

    def search_files(
        self,
        query: str,
        max_results: int = 100
    ) -> List[Dict[str, any]]:
        """
        Search files in Google Drive.

        Args:
            query: Search query (e.g., "name contains 'report'")
            max_results: Maximum number of results

        Returns:
            List of matching files

        Example:
            >>> gateway = DriveGateway()
            >>> gateway.authenticate()
            >>> files = gateway.search_files("name contains 'matriz' and mimeType='application/json'")
        """
        if not self.service:
            raise ValueError("Not authenticated. Call authenticate() first.")

        try:
            results = self.service.files().list(
                q=query,
                pageSize=max_results,
                fields="files(id, name, mimeType, size, createdTime)"
            ).execute()

            files = results.get('files', [])

            logger.info(f"Search found {len(files)} files")

            return files

        except HttpError as e:
            logger.exception(f"Error searching files: {e}")
            return []

    def _get_mime_type(self, file_path: Path) -> str:
        """Auto-detect MIME type from file extension."""
        mime_types = {
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.json': 'application/json',
            '.pkl': 'application/octet-stream',
            '.pickle': 'application/octet-stream',
            '.csv': 'text/csv',
            '.zip': 'application/zip'
        }

        extension = file_path.suffix.lower()
        return mime_types.get(extension, 'application/octet-stream')

    def setup_project_structure(
        self,
        project_name: str,
        parent_folder_id: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Create complete project folder structure.

        Creates 14 folders for pipeline stages:
        01_Original_Files, 02_Language_Detection, etc.

        Args:
            project_name: Name of project root folder
            parent_folder_id: Parent folder ID (None for root)

        Returns:
            Dictionary mapping folder names to IDs

        Example:
            >>> gateway = DriveGateway()
            >>> gateway.authenticate()
            >>> folders = gateway.setup_project_structure('My Analysis Project')
            >>> print(folders['05_BagOfWords_Results'])
        """
        if not self.service:
            raise ValueError("Not authenticated. Call authenticate() first.")

        logger.info(f"Creating project structure for: {project_name}")

        # Create root project folder
        root_folder_id = self.create_folder(project_name, parent_folder_id)

        if not root_folder_id:
            return {}

        # Create 14 stage folders
        stage_folders = [
            '01_Original_Files',
            '02_Language_Detection',
            '03_TXT_Converted',
            '04_TXT_Preprocessed',
            '05_BagOfWords_Results',
            '06_TFIDF_Results',
            '07_Ngrams_Analysis',
            '08_NER_Results',
            '09_Topic_Modeling',
            '10_BERTopic',
            '11_Dimensionality_Reduction',
            '12_Classification',
            '13_Factor_Analysis',
            '14_Consolidation'
        ]

        folder_ids = {'root': root_folder_id}

        for folder_name in stage_folders:
            folder_id = self.create_folder(folder_name, root_folder_id)
            if folder_id:
                folder_ids[folder_name] = folder_id

        logger.info(f"Created {len(folder_ids)} folders")

        return folder_ids

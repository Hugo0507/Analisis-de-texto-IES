"""
ViewSet for Google Drive OAuth 2.0 authentication.

Handles the complete OAuth flow:
1. Generate authorization URL
2. Exchange authorization code for tokens
3. Check connection status
4. Disconnect account
"""

import logging
import secrets
import json
from datetime import timezone as dt_timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.utils import timezone

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import requests

from .encryption import TokenEncryption
from .serializers import GoogleDriveConnectionSerializer, OAuthCodeExchangeSerializer

logger = logging.getLogger(__name__)


class GoogleDriveOAuthViewSet(viewsets.ViewSet):
    """
    ViewSet for managing Google Drive OAuth 2.0 authentication.

    All endpoints require authentication (IsAuthenticated permission).
    """

    permission_classes = [IsAuthenticated]

    def _get_oauth_flow(self) -> Flow:
        """
        Create and configure the Google OAuth 2.0 flow.

        Returns:
            Configured Flow instance
        """
        client_config = {
            "web": {
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_OAUTH_REDIRECT_URI]
            }
        }

        scopes = ['https://www.googleapis.com/auth/drive.readonly']

        flow = Flow.from_client_config(
            client_config=client_config,
            scopes=scopes,
            redirect_uri=settings.GOOGLE_OAUTH_REDIRECT_URI
        )

        return flow

    @action(detail=False, methods=['get'], url_path='authorize-url')
    def authorize_url(self, request):
        """
        Generate Google OAuth 2.0 authorization URL.

        This URL should be opened in a popup window where the user can
        authorize access to their Google Drive.

        GET /api/v1/oauth/google-drive/authorize-url/

        Returns:
            {
                "authorization_url": "https://accounts.google.com/o/oauth2/auth?...",
                "state": "random_state_token"
            }
        """
        try:
            # Generate random state parameter for CSRF protection
            state = secrets.token_urlsafe(32)

            # Store state in user model (not session, to support cross-domain OAuth)
            request.user.google_drive_oauth_state = state
            request.user.save(update_fields=['google_drive_oauth_state'])

            # Create OAuth flow
            flow = self._get_oauth_flow()

            # Generate authorization URL
            authorization_url, _ = flow.authorization_url(
                access_type='offline',  # Get refresh token
                include_granted_scopes='true',
                state=state,
                prompt='consent'  # Force consent screen to ensure refresh token
            )

            logger.info(f"Generated OAuth authorization URL for user {request.user.email}")

            return Response({
                'authorization_url': authorization_url,
                'state': state
            })

        except Exception as e:
            logger.exception(f"Failed to generate authorization URL: {e}")
            return Response(
                {'error': 'Failed to generate authorization URL', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='exchange-code')
    def exchange_code(self, request):
        """
        Exchange authorization code for access and refresh tokens.

        This endpoint is called after the user authorizes access in the
        OAuth popup. The popup sends the authorization code back to the
        frontend, which then sends it here.

        POST /api/v1/oauth/google-drive/exchange-code/
        Body: {
            "code": "authorization_code_from_google",
            "state": "state_token_from_authorize_url"
        }

        Returns:
            {
                "success": true,
                "email": "user@gmail.com",
                "connected_at": "2024-01-15T10:30:00Z"
            }
        """
        serializer = OAuthCodeExchangeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        code = serializer.validated_data['code']
        state = serializer.validated_data['state']

        try:
            # Validate state parameter (CSRF protection)
            stored_state = request.user.google_drive_oauth_state
            if not stored_state or state != stored_state:
                logger.warning(f"Invalid state parameter for user {request.user.email}")
                return Response(
                    {'error': 'Invalid state parameter. Please try connecting again.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Clear the state after validation (one-time use)
            request.user.google_drive_oauth_state = None
            request.user.save(update_fields=['google_drive_oauth_state'])

            # Create OAuth flow
            flow = self._get_oauth_flow()

            # Exchange code for tokens
            logger.info(f"Exchanging authorization code for user {request.user.email}")
            flow.fetch_token(code=code)
            credentials = flow.credentials

            # Get user's Google email from Drive API
            try:
                drive_service = build('drive', 'v3', credentials=credentials)
                about = drive_service.about().get(fields='user').execute()
                google_email = about['user']['emailAddress']
                logger.info(f"Retrieved Google email: {google_email}")
            except Exception as e:
                logger.error(f"Failed to get Google email: {e}")
                google_email = request.user.email  # Fallback to user's app email

            # Encrypt tokens
            encryption = TokenEncryption()
            encrypted_access_token = encryption.encrypt(credentials.token)
            encrypted_refresh_token = encryption.encrypt(credentials.refresh_token) if credentials.refresh_token else ""

            # Save to user model
            user = request.user
            user.google_drive_connected = True
            user.google_drive_email = google_email
            user.google_drive_access_token = encrypted_access_token
            user.google_drive_refresh_token = encrypted_refresh_token
            user.google_drive_token_expires_at = credentials.expiry
            user.google_drive_scopes = json.dumps(credentials.scopes)
            user.google_drive_connected_at = timezone.now()
            user.save()

            # Clear session state
            request.session.pop('oauth_state', None)

            logger.info(f"Successfully connected Google Drive for user {request.user.email}")

            return Response({
                'success': True,
                'email': google_email,
                'connected_at': user.google_drive_connected_at
            })

        except Exception as e:
            logger.exception(f"Failed to exchange code for tokens: {e}")
            return Response(
                {'error': 'Failed to connect Google Drive', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def status(self, request):
        """
        Check Google Drive connection status for current user.

        GET /api/v1/oauth/google-drive/status/

        Returns:
            {
                "is_connected": true,
                "email": "user@gmail.com",
                "connected_at": "2024-01-15T10:30:00Z",
                "scopes": ["https://www.googleapis.com/auth/drive.readonly"]
            }

            or

            {
                "is_connected": false
            }
        """
        user = request.user

        if not user.google_drive_connected:
            return Response({
                'is_connected': False
            })

        # Parse scopes
        scopes = []
        if user.google_drive_scopes:
            try:
                scopes = json.loads(user.google_drive_scopes)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse scopes for user {user.email}")

        serializer = GoogleDriveConnectionSerializer({
            'is_connected': True,
            'email': user.google_drive_email,
            'connected_at': user.google_drive_connected_at,
            'scopes': scopes
        })

        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def disconnect(self, request):
        """
        Disconnect Google Drive account.

        Revokes the OAuth token at Google and clears all OAuth data
        from the user's account.

        POST /api/v1/oauth/google-drive/disconnect/

        Returns:
            {
                "success": true,
                "message": "Google Drive disconnected successfully"
            }
        """
        user = request.user

        # Revoke token at Google
        if user.google_drive_access_token:
            try:
                encryption = TokenEncryption()
                access_token = encryption.decrypt(user.google_drive_access_token)

                # Revoke token
                revoke_url = 'https://oauth2.googleapis.com/revoke'
                response = requests.post(
                    revoke_url,
                    params={'token': access_token},
                    headers={'content-type': 'application/x-www-form-urlencoded'}
                )

                if response.status_code == 200:
                    logger.info(f"Successfully revoked token at Google for user {user.email}")
                else:
                    logger.warning(f"Token revocation returned status {response.status_code}: {response.text}")

            except Exception as e:
                # Log but don't fail - we still want to clear the local data
                logger.warning(f"Failed to revoke token at Google: {e}")

        # Clear all OAuth fields
        user.google_drive_connected = False
        user.google_drive_email = None
        user.google_drive_access_token = None
        user.google_drive_refresh_token = None
        user.google_drive_token_expires_at = None
        user.google_drive_scopes = None
        user.google_drive_connected_at = None
        user.save()

        logger.info(f"Disconnected Google Drive for user {user.email}")

        return Response({
            'success': True,
            'message': 'Google Drive disconnected successfully'
        })

    @action(detail=False, methods=['post'])
    def refresh(self, request):
        """
        Manually refresh the access token.

        This is usually done automatically by DriveGateway, but this
        endpoint allows manual refresh if needed.

        POST /api/v1/oauth/google-drive/refresh/

        Returns:
            {
                "success": true,
                "expires_at": "2024-01-15T11:30:00Z"
            }
        """
        user = request.user

        if not user.google_drive_connected:
            return Response(
                {'error': 'Google Drive not connected'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.google_drive_refresh_token:
            return Response(
                {'error': 'No refresh token available. Please reconnect your account.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Decrypt tokens
            encryption = TokenEncryption()
            access_token = encryption.decrypt(user.google_drive_access_token)
            refresh_token = encryption.decrypt(user.google_drive_refresh_token)
            scopes = json.loads(user.google_drive_scopes) if user.google_drive_scopes else []

            # Create credentials
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri='https://oauth2.googleapis.com/token',
                client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
                client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
                scopes=scopes
            )

            # Refresh
            credentials.refresh(Request())

            # Save new access token
            user.google_drive_access_token = encryption.encrypt(credentials.token)
            user.google_drive_token_expires_at = credentials.expiry
            user.save(update_fields=['google_drive_access_token', 'google_drive_token_expires_at'])

            logger.info(f"Manually refreshed token for user {user.email}")

            return Response({
                'success': True,
                'expires_at': user.google_drive_token_expires_at
            })

        except Exception as e:
            logger.exception(f"Failed to refresh token: {e}")
            return Response(
                {'error': 'Failed to refresh token', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

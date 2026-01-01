"""
Token encryption utilities for secure storage of OAuth tokens.

Uses Fernet symmetric encryption to encrypt/decrypt tokens before
storing them in the database.
"""

import logging
from typing import Optional
from cryptography.fernet import Fernet
from django.conf import settings

logger = logging.getLogger(__name__)


class TokenEncryption:
    """
    Utility class for encrypting and decrypting OAuth tokens.

    Uses Fernet (symmetric encryption) with a key from Django settings.
    """

    def __init__(self):
        """Initialize the encryption cipher with the key from settings."""
        try:
            key = settings.GOOGLE_OAUTH_ENCRYPTION_KEY

            # Ensure key is bytes
            if isinstance(key, str):
                key = key.encode('utf-8')

            self.cipher = Fernet(key)
        except Exception as e:
            logger.error(f"Failed to initialize TokenEncryption: {e}")
            raise

    def encrypt(self, token: Optional[str]) -> str:
        """
        Encrypt a token string.

        Args:
            token: The plain text token to encrypt

        Returns:
            The encrypted token as a base64-encoded string

        Raises:
            Exception if encryption fails
        """
        if not token:
            return ""

        try:
            encrypted_bytes = self.cipher.encrypt(token.encode('utf-8'))
            return encrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Token encryption failed: {e}")
            raise

    def decrypt(self, encrypted_token: Optional[str]) -> str:
        """
        Decrypt an encrypted token string.

        Args:
            encrypted_token: The encrypted token (base64-encoded)

        Returns:
            The decrypted plain text token

        Raises:
            Exception if decryption fails
        """
        if not encrypted_token:
            return ""

        try:
            decrypted_bytes = self.cipher.decrypt(encrypted_token.encode('utf-8'))
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Token decryption failed: {e}")
            raise


def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key.

    Returns:
        A new Fernet key as a base64-encoded string

    Note:
        This should be called once and the key stored securely in
        environment variables. Do not regenerate keys or you will
        lose access to previously encrypted data.
    """
    key = Fernet.generate_key()
    return key.decode('utf-8')

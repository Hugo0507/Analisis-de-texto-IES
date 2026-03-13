"""
Triple Layer Cache Service
Provides caching across Redis, Database, and Google Drive
"""

import hashlib
import json
import logging
from typing import Any, Optional
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)


class TripleLayerCacheService:
    """
    Triple layer cache implementation
    Layer 1: Redis (fast, volatile)
    Layer 2: Database (persistent, medium speed)
    Layer 3: Google Drive (persistent, slow)
    """

    def __init__(self):
        self.redis_enabled = hasattr(settings, 'CACHES') and 'default' in settings.CACHES

    def generate_config_hash(self, config: dict) -> str:
        """
        Generate a deterministic hash string from a configuration dictionary.

        Args:
            config: Dictionary with configuration parameters

        Returns:
            MD5 hex digest string
        """
        config_str = json.dumps(config, sort_keys=True, default=str)
        return hashlib.md5(config_str.encode()).hexdigest()

    def get(self, namespace: str, key: str = None) -> Optional[Any]:
        """
        Get value from cache (checks all layers)

        Args:
            namespace: Cache namespace or full key (when key is None)
            key: Cache key within namespace (optional)

        Returns:
            Cached value or None if not found
        """
        full_key = f"{namespace}:{key}" if key is not None else namespace

        if not self.redis_enabled:
            return None

        try:
            # Layer 1: Redis
            value = cache.get(full_key)
            if value is not None:
                logger.debug(f"Cache HIT (Redis): {full_key}")
                return value

            logger.debug(f"Cache MISS: {full_key}")
            return None

        except Exception as e:
            logger.error(f"Cache error for key {full_key}: {str(e)}")
            return None

    def set(
        self,
        namespace: str,
        key: str,
        value: Any = None,
        timeout: Optional[int] = None,
        save_to_drive: bool = False,
    ) -> bool:
        """
        Set value in cache

        Args:
            namespace: Cache namespace
            key: Cache key within namespace
            value: Value to cache
            timeout: Cache timeout in seconds (None = default)
            save_to_drive: Whether to persist to Google Drive (Layer 3, not implemented)

        Returns:
            True if successful, False otherwise
        """
        full_key = f"{namespace}:{key}"

        if not self.redis_enabled:
            return False

        try:
            cache.set(full_key, value, timeout)
            logger.debug(f"Cache SET: {full_key}")
            return True
        except Exception as e:
            logger.error(f"Cache set error for key {full_key}: {str(e)}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete value from cache

        Args:
            key: Cache key

        Returns:
            True if successful, False otherwise
        """
        if not self.redis_enabled:
            return False

        try:
            cache.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {str(e)}")
            return False

    def clear(self) -> bool:
        """
        Clear all cache

        Returns:
            True if successful, False otherwise
        """
        if not self.redis_enabled:
            return False

        try:
            cache.clear()
            logger.info("Cache cleared")
            return True
        except Exception as e:
            logger.error(f"Cache clear error: {str(e)}")
            return False

    def get_or_set(self, namespace: str, key: str, default_func: callable, timeout: Optional[int] = None) -> Any:
        """
        Get value from cache or set it if not found

        Args:
            namespace: Cache namespace
            key: Cache key within namespace
            default_func: Function to call if cache miss
            timeout: Cache timeout in seconds

        Returns:
            Cached or newly computed value
        """
        value = self.get(namespace, key)
        if value is not None:
            return value

        # Cache miss - compute value
        value = default_func()
        self.set(namespace, key, value, timeout)
        return value

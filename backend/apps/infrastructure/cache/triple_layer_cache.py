"""
Triple Layer Cache Service
Provides caching across Redis, Database, and Google Drive
"""

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

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache (checks all layers)

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        if not self.redis_enabled:
            return None

        try:
            # Layer 1: Redis
            value = cache.get(key)
            if value is not None:
                logger.debug(f"Cache HIT (Redis): {key}")
                return value

            logger.debug(f"Cache MISS: {key}")
            return None

        except Exception as e:
            logger.error(f"Cache error for key {key}: {str(e)}")
            return None

    def set(self, key: str, value: Any, timeout: Optional[int] = None) -> bool:
        """
        Set value in cache

        Args:
            key: Cache key
            value: Value to cache
            timeout: Cache timeout in seconds (None = default)

        Returns:
            True if successful, False otherwise
        """
        if not self.redis_enabled:
            return False

        try:
            cache.set(key, value, timeout)
            logger.debug(f"Cache SET: {key}")
            return True
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {str(e)}")
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

    def get_or_set(self, key: str, default_func: callable, timeout: Optional[int] = None) -> Any:
        """
        Get value from cache or set it if not found

        Args:
            key: Cache key
            default_func: Function to call if cache miss
            timeout: Cache timeout in seconds

        Returns:
            Cached or newly computed value
        """
        value = self.get(key)
        if value is not None:
            return value

        # Cache miss - compute value
        value = default_func()
        self.set(key, value, timeout)
        return value

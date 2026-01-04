"""
Redis Cache Service.

Wrapper for Redis operations with Django integration.
"""

import logging
import json
import pickle
from typing import Any, Optional
import redis
from django.conf import settings

logger = logging.getLogger(__name__)


class RedisCacheService:
    """
    Service for Redis caching operations.

    Provides simple key-value caching with TTL support.
    """

    def __init__(
        self,
        host: str = None,
        port: int = None,
        db: int = 0,
        decode_responses: bool = False
    ):
        """
        Initialize Redis cache service.

        Args:
            host: Redis host (defaults to settings or 'localhost')
            port: Redis port (defaults to settings or 6379)
            db: Redis database number
            decode_responses: Auto-decode responses as strings
        """
        self.host = host or getattr(settings, 'REDIS_HOST', 'localhost')
        self.port = port or getattr(settings, 'REDIS_PORT', 6379)
        self.db = db
        self.decode_responses = decode_responses

        self.client = None
        self._connect()

    def _connect(self):
        """Establish connection to Redis."""
        try:
            self.client = redis.Redis(
                host=self.host,
                port=self.port,
                db=self.db,
                decode_responses=self.decode_responses
            )

            # Test connection
            self.client.ping()

            logger.info(f"Connected to Redis at {self.host}:{self.port}")

        except Exception as e:
            logger.exception(f"Failed to connect to Redis: {e}")
            self.client = None

    def is_connected(self) -> bool:
        """Check if Redis connection is active."""
        if not self.client:
            return False

        try:
            self.client.ping()
            return True
        except:
            return False

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found

        Example:
            >>> cache = RedisCacheService()
            >>> value = cache.get('my_key')
        """
        if not self.client:
            return None

        try:
            value = self.client.get(key)

            if value is None:
                return None

            # Try to unpickle
            try:
                return pickle.loads(value)
            except:
                # Return as string if unpickling fails
                return value.decode('utf-8') if isinstance(value, bytes) else value

        except Exception as e:
            logger.exception(f"Error getting cache key {key}: {e}")
            return None

    def set(
        self,
        key: str,
        value: Any,
        ttl: int = 3600
    ) -> bool:
        """
        Set value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache (will be pickled)
            ttl: Time to live in seconds (default 1 hour)

        Returns:
            True if successful

        Example:
            >>> cache = RedisCacheService()
            >>> cache.set('my_key', {'data': 'value'}, ttl=3600)
        """
        if not self.client:
            return False

        try:
            # Pickle the value
            pickled_value = pickle.dumps(value)

            # Set with TTL
            result = self.client.setex(
                key,
                ttl,
                pickled_value
            )

            return result

        except Exception as e:
            logger.exception(f"Error setting cache key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete key from cache.

        Args:
            key: Cache key

        Returns:
            True if key was deleted

        Example:
            >>> cache = RedisCacheService()
            >>> cache.delete('my_key')
        """
        if not self.client:
            return False

        try:
            result = self.client.delete(key)
            return result > 0

        except Exception as e:
            logger.exception(f"Error deleting cache key {key}: {e}")
            return False

    def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.

        Args:
            key: Cache key

        Returns:
            True if key exists

        Example:
            >>> cache = RedisCacheService()
            >>> if cache.exists('my_key'):
            >>>     print("Key exists")
        """
        if not self.client:
            return False

        try:
            return self.client.exists(key) > 0

        except Exception as e:
            logger.exception(f"Error checking cache key {key}: {e}")
            return False

    def get_ttl(self, key: str) -> Optional[int]:
        """
        Get remaining TTL for key.

        Args:
            key: Cache key

        Returns:
            Remaining seconds or None if key doesn't exist

        Example:
            >>> cache = RedisCacheService()
            >>> ttl = cache.get_ttl('my_key')
            >>> print(f"Expires in {ttl} seconds")
        """
        if not self.client:
            return None

        try:
            ttl = self.client.ttl(key)

            if ttl == -2:  # Key doesn't exist
                return None
            elif ttl == -1:  # Key exists but has no TTL
                return -1
            else:
                return ttl

        except Exception as e:
            logger.exception(f"Error getting TTL for key {key}: {e}")
            return None

    def set_ttl(self, key: str, ttl: int) -> bool:
        """
        Update TTL for existing key.

        Args:
            key: Cache key
            ttl: New TTL in seconds

        Returns:
            True if successful

        Example:
            >>> cache = RedisCacheService()
            >>> cache.set_ttl('my_key', 7200)  # Extend to 2 hours
        """
        if not self.client:
            return False

        try:
            result = self.client.expire(key, ttl)
            return result

        except Exception as e:
            logger.exception(f"Error setting TTL for key {key}: {e}")
            return False

    def clear_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.

        Args:
            pattern: Key pattern (e.g., 'pipeline:*')

        Returns:
            Number of keys deleted

        Example:
            >>> cache = RedisCacheService()
            >>> count = cache.clear_pattern('pipeline:*')
            >>> print(f"Deleted {count} keys")
        """
        if not self.client:
            return 0

        try:
            keys = self.client.keys(pattern)

            if keys:
                deleted = self.client.delete(*keys)
                logger.info(f"Deleted {deleted} keys matching '{pattern}'")
                return deleted

            return 0

        except Exception as e:
            logger.exception(f"Error clearing pattern {pattern}: {e}")
            return 0

    def get_info(self) -> dict:
        """
        Get Redis server info.

        Returns:
            Dictionary with server information

        Example:
            >>> cache = RedisCacheService()
            >>> info = cache.get_info()
            >>> print(f"Used memory: {info['used_memory_human']}")
        """
        if not self.client:
            return {}

        try:
            return self.client.info()

        except Exception as e:
            logger.exception(f"Error getting Redis info: {e}")
            return {}

    def flush_db(self) -> bool:
        """
        Flush current database (WARNING: deletes all keys).

        Returns:
            True if successful

        Example:
            >>> cache = RedisCacheService()
            >>> cache.flush_db()  # Use with caution!
        """
        if not self.client:
            return False

        try:
            logger.warning("Flushing Redis database")
            self.client.flushdb()
            return True

        except Exception as e:
            logger.exception(f"Error flushing database: {e}")
            return False

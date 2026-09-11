"""
Paginacion compartida por los ViewSets publicos.
"""

import logging

from rest_framework.pagination import PageNumberPagination

logger = logging.getLogger(__name__)


class PublicAPIPagination(PageNumberPagination):
    """Pagination for public API endpoints."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

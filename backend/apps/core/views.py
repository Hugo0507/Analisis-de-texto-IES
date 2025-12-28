"""
Core views for health checks and status endpoints.
"""

from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from django.core.cache import cache
import sys


@csrf_exempt
@require_GET
def health_check(request):
    """
    Simple health check endpoint.
    Returns 200 OK if the application is running.
    """
    health_status = {
        "status": "healthy",
        "service": "NLP Analysis Backend",
        "version": "1.0.0",
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
    }

    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status["database"] = "connected"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Check cache
    try:
        cache.set('health_check', 'ok', 1)
        if cache.get('health_check') == 'ok':
            health_status["cache"] = "working"
        else:
            health_status["cache"] = "not working"
    except Exception as e:
        health_status["cache"] = f"error: {str(e)}"

    return JsonResponse(health_status)


@csrf_exempt
@require_GET
def api_root(request):
    """
    API root endpoint with available endpoints.
    """
    return JsonResponse({
        "message": "NLP Analysis API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health/",
            "api_v1": "/api/v1/",
            "documents": "/api/v1/documents/",
            "analysis": "/api/v1/analysis/",
            "pipeline": "/api/v1/pipeline/",
            "docs": "/api/docs/",
            "schema": "/api/schema/",
        }
    })

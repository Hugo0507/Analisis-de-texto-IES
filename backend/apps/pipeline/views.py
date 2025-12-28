"""
Views for Pipeline app.

Exposes Pipeline Use Cases as REST API endpoints.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .use_cases.execute_pipeline import ExecutePipelineUseCase


class PipelineViewSet(viewsets.ViewSet):
    """
    ViewSet for Pipeline execution.

    Endpoints:
    - POST /api/pipeline/execute/ - Execute complete pipeline
    - GET /api/pipeline/status/{execution_id}/ - Get execution status
    - GET /api/pipeline/history/ - Get execution history
    """

    @action(detail=False, methods=['post'], url_path='execute')
    def execute(self, request):
        """
        Execute complete pipeline (14 stages).

        POST /api/pipeline/execute/
        Body: {
            "document_ids": [1, 2, 3],  # Optional
            "use_cache": true,
            "skip_stages": ["consolidation", "cache_validation"]  # Optional
        }

        Returns:
            {
                "success": true,
                "execution_id": "uuid-string",
                "started_at": "2024-01-15T10:30:00",
                "completed_at": "2024-01-15T10:45:00",
                "total_stages": 14,
                "completed_stages": 12,
                "failed_stages": 0,
                "skipped_stages": 2,
                "stages": {
                    "language_detection": {
                        "success": true,
                        "cached": false,
                        "duration_seconds": 5.2
                    },
                    ...
                },
                "results": {
                    "language_detection": {...},
                    ...
                }
            }
        """
        use_case = ExecutePipelineUseCase()

        document_ids = request.data.get('document_ids', None)
        use_cache = request.data.get('use_cache', True)
        skip_stages = request.data.get('skip_stages', None)

        result = use_case.execute(
            document_ids=document_ids,
            use_cache=use_cache,
            skip_stages=skip_stages
        )

        if result.get('success'):
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='status/(?P<execution_id>[^/.]+)')
    def get_status(self, request, execution_id=None):
        """
        Get status of a pipeline execution.

        GET /api/pipeline/status/{execution_id}/

        Returns:
            {
                "success": true,
                "execution_id": "uuid-string",
                "total_stages": 14,
                "completed": 10,
                "failed": 1,
                "running": 2,
                "skipped": 1,
                "progress_percentage": 71,
                "is_completed": false,
                "is_running": true,
                "has_errors": true,
                "stages": [
                    {
                        "stage_name": "language_detection",
                        "status": "completed",
                        "started_at": "2024-01-15T10:30:00",
                        "completed_at": "2024-01-15T10:30:05",
                        "duration_seconds": 5,
                        "cache_hit": false,
                        "error_message": null
                    },
                    ...
                ]
            }
        """
        if not execution_id:
            return Response(
                {'error': 'execution_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        use_case = ExecutePipelineUseCase()
        result = use_case.get_status(execution_id)

        if result.get('success'):
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        """
        Get pipeline execution history.

        GET /api/pipeline/history/?limit=10

        Query params:
        - limit: Number of executions to return (default: 10)

        Returns:
            {
                "success": true,
                "count": 5,
                "executions": [
                    {
                        "execution_id": "uuid-1",
                        "total_stages": 14,
                        "completed": 14,
                        "failed": 0,
                        "progress_percentage": 100,
                        "is_completed": true,
                        "has_errors": false,
                        "stages": [...]
                    },
                    ...
                ]
            }
        """
        limit = int(request.query_params.get('limit', 10))

        use_case = ExecutePipelineUseCase()
        result = use_case.get_history(limit=limit)

        if result.get('success'):
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

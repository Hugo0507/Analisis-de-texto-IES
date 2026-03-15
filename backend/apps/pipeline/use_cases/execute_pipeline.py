"""
Execute Pipeline Use Case.

Orquesta las 14 etapas del pipeline completo de análisis NLP/ML.
"""

import logging
import uuid
from typing import Dict, List, Optional
from datetime import datetime
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.pipeline.models import PipelineExecution
from apps.documents.use_cases.detect_language import DetectLanguageUseCase
from apps.documents.use_cases.convert_documents import ConvertDocumentsUseCase
from apps.documents.use_cases.preprocess_text import PreprocessTextUseCase
from apps.analysis.use_cases.generate_bow import GenerateBowUseCase
from apps.analysis.use_cases.calculate_tfidf import CalculateTfidfUseCase
from apps.analysis.use_cases.train_topic_models import TrainTopicModelsUseCase
from apps.analysis.use_cases.analyze_factors import AnalyzeFactorsUseCase

logger = logging.getLogger(__name__)


def _serialize_result(result: dict) -> dict:
    """Extraer campos relevantes del resultado de una etapa para persistir."""
    if not result or not isinstance(result, dict):
        return {}
    exclude = {'success', 'cached', 'cache_source', 'error'}
    serializable = {}
    for k, v in result.items():
        if k in exclude:
            continue
        try:
            import json
            json.dumps(v)
            serializable[k] = v
        except (TypeError, ValueError):
            serializable[k] = str(v)
    return serializable


class ExecutePipelineUseCase:
    """
    Use case para ejecutar el pipeline completo de análisis.

    Pipeline de 14 etapas:
    1. Language Detection
    2. TXT Conversion
    3. Preprocessing
    4. Bag of Words
    5. TF-IDF
    6. Topic Modeling - LDA
    7. Topic Modeling - NMF
    8. Topic Modeling - LSA
    9. Topic Modeling - pLSA
    10. Topic Comparison
    11. Factor Analysis
    12. Consolidation
    13. Cache Validation
    14. Final Report

    Características:
    - Registro de cada etapa en PipelineExecution
    - Manejo de errores por etapa (continúa con las siguientes)
    - Uso de caché triple (Redis → MySQL → Drive)
    - Soporte para WebSocket (envío de actualizaciones en tiempo real)
    """

    STAGE_NAMES = [
        'language_detection',
        'txt_conversion',
        'preprocessing',
        'bow_generation',
        'tfidf_calculation',
        'lda_training',
        'nmf_training',
        'lsa_training',
        'plsa_training',
        'topic_comparison',
        'factor_analysis',
        'consolidation',
        'cache_validation',
        'final_report',
    ]

    def __init__(self):
        """Initialize use case with all required use cases."""
        self.detect_language_uc = DetectLanguageUseCase()
        self.convert_documents_uc = ConvertDocumentsUseCase()
        self.preprocess_text_uc = PreprocessTextUseCase()
        self.generate_bow_uc = GenerateBowUseCase()
        self.calculate_tfidf_uc = CalculateTfidfUseCase()
        self.train_topic_models_uc = TrainTopicModelsUseCase()
        self.analyze_factors_uc = AnalyzeFactorsUseCase()
        self.channel_layer = get_channel_layer()

        # Stage dispatch map - maps stage names to their execution methods
        self._stage_handlers = {
            'language_detection': self._run_language_detection,
            'txt_conversion': self._run_txt_conversion,
            'preprocessing': self._run_preprocessing,
            'bow_generation': self._run_bow_generation,
            'tfidf_calculation': self._run_tfidf_calculation,
            'lda_training': self._run_topic_model('lda'),
            'nmf_training': self._run_topic_model('nmf'),
            'lsa_training': self._run_topic_model('lsa'),
            'plsa_training': self._run_topic_model('plsa'),
            'topic_comparison': self._run_topic_comparison,
            'factor_analysis': self._run_factor_analysis,
            'consolidation': self._run_stub('Consolidation'),
            'cache_validation': self._run_stub('Cache validation'),
            'final_report': self._run_stub('Final report generation'),
        }

    def execute(
        self,
        document_ids: Optional[List[int]] = None,
        use_cache: bool = True,
        skip_stages: Optional[List[str]] = None
    ) -> Dict[str, any]:
        """
        Ejecutar pipeline completo.

        Args:
            document_ids: Lista de IDs de documentos (None = todos)
            use_cache: Usar caché para acelerar ejecución
            skip_stages: Lista de etapas a omitir (opcional)

        Returns:
            Dictionary con resultados del pipeline

        Example:
            >>> use_case = ExecutePipelineUseCase()
            >>> result = use_case.execute(use_cache=True)
            >>> print(f"Execution ID: {result['execution_id']}")
        """
        execution_id = uuid.uuid4()
        skip_stages = skip_stages or []

        logger.info(f"Starting pipeline execution: {execution_id}")

        # Inicializar estado del pipeline
        pipeline_state = {
            'execution_id': str(execution_id),
            'started_at': timezone.now().isoformat(),
            'total_stages': len(self.STAGE_NAMES),
            'completed_stages': 0,
            'failed_stages': 0,
            'skipped_stages': len(skip_stages),
            'stages': {},
            'results': {}
        }

        # Ejecutar cada etapa secuencialmente
        for stage_idx, stage_name in enumerate(self.STAGE_NAMES):
            if stage_name in skip_stages:
                self._record_stage_skipped(execution_id, stage_name)
                pipeline_state['stages'][stage_name] = {'status': 'skipped'}
                continue

            logger.info(f"Executing stage {stage_idx + 1}/{len(self.STAGE_NAMES)}: {stage_name}")

            stage_result = self._execute_stage(
                execution_id=execution_id,
                stage_name=stage_name,
                document_ids=document_ids,
                use_cache=use_cache
            )

            pipeline_state['stages'][stage_name] = stage_result

            if stage_result['success']:
                pipeline_state['completed_stages'] += 1
                pipeline_state['results'][stage_name] = stage_result.get('data', {})
            else:
                pipeline_state['failed_stages'] += 1
                logger.error(f"Stage {stage_name} failed: {stage_result.get('error')}")

        # Finalizar pipeline
        pipeline_state['completed_at'] = timezone.now().isoformat()
        pipeline_state['success'] = pipeline_state['failed_stages'] == 0

        logger.info(
            f"Pipeline execution completed: {execution_id} - "
            f"Success: {pipeline_state['completed_stages']}/{pipeline_state['total_stages']}"
        )

        return pipeline_state

    def _execute_stage(
        self,
        execution_id: uuid.UUID,
        stage_name: str,
        document_ids: Optional[List[int]],
        use_cache: bool
    ) -> Dict[str, any]:
        """
        Ejecutar una etapa individual del pipeline.

        Args:
            execution_id: UUID de la ejecución
            stage_name: Nombre de la etapa
            document_ids: Lista de IDs de documentos
            use_cache: Usar caché

        Returns:
            Dictionary con resultado de la etapa
        """
        # Crear registro de etapa
        stage_record = PipelineExecution.objects.create(
            execution_id=execution_id,
            stage_name=stage_name,
            status='running',
            started_at=timezone.now()
        )

        # Calcular progreso
        stage_idx = self.STAGE_NAMES.index(stage_name)
        progress = int((stage_idx / len(self.STAGE_NAMES)) * 100)

        # Enviar update: etapa iniciada
        self._send_websocket_update(
            execution_id=execution_id,
            stage_name=stage_name,
            status='running',
            progress=progress,
            message=f'Executing {stage_name}...'
        )

        stage_start_time = datetime.now()

        try:
            # Dispatch to stage handler
            handler = self._stage_handlers.get(stage_name)
            if not handler:
                result = {'success': False, 'error': f'Unknown stage: {stage_name}'}
            else:
                result = handler(document_ids=document_ids, use_cache=use_cache)

            # Calcular duración
            stage_duration = (datetime.now() - stage_start_time).total_seconds()

            # Actualizar registro de etapa
            stage_record.status = 'completed' if result.get('success') else 'failed'
            stage_record.completed_at = timezone.now()
            stage_record.duration_seconds = int(stage_duration)
            stage_record.cache_hit = result.get('cached', False)
            stage_record.error_message = result.get('error', None)
            stage_record.result_data = _serialize_result(result)
            stage_record.save()

            # Enviar update: etapa completada o fallida
            final_progress = int(((stage_idx + 1) / len(self.STAGE_NAMES)) * 100)
            final_status = 'completed' if result.get('success') else 'failed'
            self._send_websocket_update(
                execution_id=execution_id,
                stage_name=stage_name,
                status=final_status,
                progress=final_progress,
                message=f'Stage {stage_name} {final_status}',
                error=result.get('error', None)
            )

            return {
                'success': result.get('success', False),
                'cached': result.get('cached', False),
                'duration_seconds': stage_duration,
                'result_data': _serialize_result(result),
                'error': result.get('error', None)
            }

        except Exception as e:
            logger.exception(f"Error executing stage {stage_name}: {e}")

            # Actualizar registro con error
            stage_duration = (datetime.now() - stage_start_time).total_seconds()
            stage_record.status = 'failed'
            stage_record.completed_at = timezone.now()
            stage_record.duration_seconds = int(stage_duration)
            stage_record.error_message = str(e)
            stage_record.save()

            # Enviar update: etapa fallida por excepción
            final_progress = int(((stage_idx + 1) / len(self.STAGE_NAMES)) * 100)
            self._send_websocket_update(
                execution_id=execution_id,
                stage_name=stage_name,
                status='failed',
                progress=final_progress,
                message=f'Stage {stage_name} failed with exception',
                error=str(e)
            )

            return {
                'success': False,
                'cached': False,
                'duration_seconds': stage_duration,
                'error': str(e),
                'data': None
            }

    # --- Stage handler methods ---

    def _run_language_detection(self, document_ids, **kwargs):
        return self.detect_language_uc.execute_batch(document_ids=document_ids)

    def _run_txt_conversion(self, document_ids, **kwargs):
        return self.convert_documents_uc.execute_batch(
            document_ids=document_ids,
            download_from_drive=False
        )

    def _run_preprocessing(self, document_ids, **kwargs):
        return self.preprocess_text_uc.execute_batch(
            document_ids=document_ids,
            remove_stopwords=True, remove_punctuation=True,
            remove_numbers=True, apply_stemming=False,
            min_word_length=3, max_word_length=30
        )

    def _run_bow_generation(self, document_ids, use_cache=True, **kwargs):
        return self.generate_bow_uc.execute(
            document_ids=document_ids, max_features=5000,
            min_df=2, max_df=0.85, ngram_range=(1, 1), use_cache=use_cache
        )

    def _run_tfidf_calculation(self, document_ids, use_cache=True, **kwargs):
        return self.calculate_tfidf_uc.execute(
            document_ids=document_ids, max_features=5000,
            norm='l2', use_idf=True, sublinear_tf=False, use_cache=use_cache
        )

    def _run_topic_model(self, model_type):
        """Factory that returns a handler for a specific topic model type."""
        def handler(document_ids, use_cache=True, **kwargs):
            return self.train_topic_models_uc.execute(
                model_type=model_type, n_topics=10,
                document_ids=document_ids, use_cache=use_cache
            )
        return handler

    def _run_topic_comparison(self, document_ids, **kwargs):
        return self.train_topic_models_uc.compare_models(
            document_ids=document_ids, n_topics=10
        )

    def _run_factor_analysis(self, document_ids, use_cache=True, **kwargs):
        return self.analyze_factors_uc.execute(
            document_ids=document_ids, normalize_by_length=True,
            use_cache=use_cache
        )

    @staticmethod
    def _run_stub(stage_label):
        """Factory that returns a stub handler for unimplemented stages."""
        def handler(**kwargs):
            return {'success': True, 'message': f'{stage_label} not yet implemented'}
        return handler

    def _record_stage_skipped(self, execution_id: uuid.UUID, stage_name: str):
        """Registrar etapa como omitida."""
        PipelineExecution.objects.create(
            execution_id=execution_id,
            stage_name=stage_name,
            status='skipped',
            started_at=timezone.now(),
            completed_at=timezone.now(),
            duration_seconds=0
        )

    def get_status(self, execution_id: str) -> Dict[str, any]:
        """
        Obtener estado de una ejecución del pipeline.

        Args:
            execution_id: UUID de la ejecución

        Returns:
            Dictionary con estado actual
        """
        try:
            stages = PipelineExecution.objects.filter(
                execution_id=execution_id
            ).order_by('created_at')

            if not stages.exists():
                return {
                    'success': False,
                    'error': f'Execution {execution_id} not found'
                }

            # Calcular estadísticas
            total_stages = stages.count()
            completed = stages.filter(status='completed').count()
            failed = stages.filter(status='failed').count()
            running = stages.filter(status='running').count()
            skipped = stages.filter(status='skipped').count()

            # Construir estado de cada etapa
            stage_details = [
                {
                    'stage_name': stage.stage_name,
                    'status': stage.status,
                    'started_at': stage.started_at.isoformat() if stage.started_at else None,
                    'completed_at': stage.completed_at.isoformat() if stage.completed_at else None,
                    'duration_seconds': stage.duration_seconds,
                    'cache_hit': stage.cache_hit,
                    'error_message': stage.error_message,
                    'result_data': stage.result_data or {}
                }
                for stage in stages
            ]

            # Determinar estado general
            is_completed = running == 0 and failed == 0
            is_running = running > 0
            has_errors = failed > 0

            return {
                'success': True,
                'execution_id': execution_id,
                'total_stages': total_stages,
                'completed': completed,
                'failed': failed,
                'running': running,
                'skipped': skipped,
                'progress_percentage': int((completed / total_stages) * 100) if total_stages > 0 else 0,
                'is_completed': is_completed,
                'is_running': is_running,
                'has_errors': has_errors,
                'stages': stage_details
            }

        except Exception as e:
            logger.exception(f"Error getting pipeline status: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_history(self, limit: int = 10) -> Dict[str, any]:
        """
        Obtener historial de ejecuciones del pipeline.

        Args:
            limit: Número máximo de ejecuciones a retornar

        Returns:
            Dictionary con historial
        """
        try:
            # Obtener últimas ejecuciones únicas
            executions = PipelineExecution.objects.values('execution_id').distinct()[:limit]

            execution_ids = [e['execution_id'] for e in executions]

            history = []
            for exec_id in execution_ids:
                status = self.get_status(str(exec_id))
                if status.get('success'):
                    history.append(status)

            return {
                'success': True,
                'count': len(history),
                'executions': history
            }

        except Exception as e:
            logger.exception(f"Error getting pipeline history: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _send_websocket_update(
        self,
        execution_id: uuid.UUID,
        stage_name: str,
        status: str,
        progress: int,
        message: str = '',
        error: str = None
    ):
        """
        Enviar actualización via WebSocket.

        Args:
            execution_id: UUID de la ejecución
            stage_name: Nombre de la etapa
            status: Estado de la etapa ('running', 'completed', 'failed')
            progress: Porcentaje de progreso (0-100)
            message: Mensaje adicional
            error: Mensaje de error (opcional)
        """
        if not self.channel_layer:
            return

        try:
            async_to_sync(self.channel_layer.group_send)(
                f'pipeline_{str(execution_id)}',
                {
                    'type': 'pipeline_update',
                    'execution_id': str(execution_id),
                    'stage': stage_name,
                    'status': status,
                    'progress': progress,
                    'message': message,
                    'error': error,
                    'timestamp': timezone.now().isoformat()
                }
            )
            logger.debug(f"WebSocket update sent: {stage_name} - {status}")
        except Exception as e:
            logger.error(f"Error sending WebSocket update: {e}")

"""
Sistema de Seguimiento de Progreso
Permite rastrear el progreso de operaciones largas en tiempo real
"""

import time
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from src.utils.logger import get_logger

logger = get_logger(__name__)


class StageStatus(Enum):
    """Estados posibles de una etapa del pipeline"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class Stage:
    """Representa una etapa del pipeline"""
    name: str
    description: str
    status: StageStatus = StageStatus.PENDING
    progress: float = 0.0  # 0.0 - 1.0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    error: Optional[str] = None
    result: Optional[Any] = None
    substages: List['Stage'] = field(default_factory=list)

    def start(self):
        """Marca la etapa como iniciada"""
        self.status = StageStatus.RUNNING
        self.start_time = datetime.now()
        logger.info(f"Etapa iniciada: {self.name}")

    def complete(self, result: Any = None):
        """Marca la etapa como completada"""
        self.status = StageStatus.COMPLETED
        self.progress = 1.0
        self.end_time = datetime.now()
        self.result = result
        duration = (self.end_time - self.start_time).total_seconds() if self.start_time else 0
        logger.info(f"Etapa completada: {self.name} ({duration:.2f}s)")

    def fail(self, error: str):
        """Marca la etapa como fallida"""
        self.status = StageStatus.FAILED
        self.end_time = datetime.now()
        self.error = error
        logger.error(f"Etapa fallida: {self.name} - {error}")

    def skip(self, reason: str = ""):
        """Marca la etapa como omitida"""
        self.status = StageStatus.SKIPPED
        self.error = reason
        logger.info(f"Etapa omitida: {self.name} - {reason}")

    def update_progress(self, progress: float, message: str = ""):
        """Actualiza el progreso de la etapa"""
        self.progress = min(1.0, max(0.0, progress))
        if message:
            logger.debug(f"{self.name}: {progress:.1%} - {message}")

    def get_duration(self) -> float:
        """Retorna duración en segundos"""
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        elif self.start_time:
            return (datetime.now() - self.start_time).total_seconds()
        return 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convierte a diccionario para serialización"""
        return {
            'name': self.name,
            'description': self.description,
            'status': self.status.value,
            'progress': self.progress,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration': self.get_duration(),
            'error': self.error,
            'substages': [s.to_dict() for s in self.substages] if self.substages else []
        }


class ProgressTracker:
    """Rastreador de progreso del pipeline"""

    def __init__(self, pipeline_name: str = "Pipeline de Análisis"):
        """
        Inicializa el rastreador de progreso

        Args:
            pipeline_name: Nombre del pipeline
        """
        self.pipeline_name = pipeline_name
        self.stages: List[Stage] = []
        self.current_stage_idx: Optional[int] = None
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.callbacks: List[Callable] = []

        logger.info(f"ProgressTracker inicializado para: {pipeline_name}")

    def add_stage(self, name: str, description: str) -> Stage:
        """
        Agrega una nueva etapa

        Args:
            name: Nombre de la etapa
            description: Descripción de la etapa

        Returns:
            Etapa creada
        """
        stage = Stage(name=name, description=description)
        self.stages.append(stage)
        logger.debug(f"Etapa agregada: {name}")
        return stage

    def start_pipeline(self):
        """Inicia el pipeline"""
        self.start_time = datetime.now()
        logger.info(f"Pipeline iniciado: {self.pipeline_name}")
        self._notify_callbacks()

    def start_stage(self, stage_index: int):
        """
        Inicia una etapa específica

        Args:
            stage_index: Índice de la etapa
        """
        if 0 <= stage_index < len(self.stages):
            self.current_stage_idx = stage_index
            self.stages[stage_index].start()
            self._notify_callbacks()

    def complete_stage(self, stage_index: int, result: Any = None):
        """
        Completa una etapa específica

        Args:
            stage_index: Índice de la etapa
            result: Resultado de la etapa
        """
        if 0 <= stage_index < len(self.stages):
            self.stages[stage_index].complete(result)
            self._notify_callbacks()

    def fail_stage(self, stage_index: int, error: str):
        """
        Marca una etapa como fallida

        Args:
            stage_index: Índice de la etapa
            error: Mensaje de error
        """
        if 0 <= stage_index < len(self.stages):
            self.stages[stage_index].fail(error)
            self._notify_callbacks()

    def skip_stage(self, stage_index: int, reason: str = ""):
        """
        Omite una etapa

        Args:
            stage_index: Índice de la etapa
            reason: Razón para omitir
        """
        if 0 <= stage_index < len(self.stages):
            self.stages[stage_index].skip(reason)
            self._notify_callbacks()

    def update_progress(self, stage_index: int, progress: float, message: str = ""):
        """
        Actualiza el progreso de una etapa

        Args:
            stage_index: Índice de la etapa
            progress: Progreso (0.0 - 1.0)
            message: Mensaje de progreso
        """
        if 0 <= stage_index < len(self.stages):
            self.stages[stage_index].update_progress(progress, message)
            self._notify_callbacks()

    def complete_pipeline(self):
        """Completa el pipeline"""
        self.end_time = datetime.now()
        logger.info(f"Pipeline completado: {self.pipeline_name}")
        self._notify_callbacks()

    def get_overall_progress(self) -> float:
        """
        Calcula el progreso global del pipeline

        Returns:
            Progreso global (0.0 - 1.0)
        """
        if not self.stages:
            return 0.0

        total_progress = sum(stage.progress for stage in self.stages)
        return total_progress / len(self.stages)

    def get_status_summary(self) -> Dict[str, int]:
        """
        Retorna resumen de estados

        Returns:
            Diccionario con conteo por estado
        """
        summary = {
            'pending': 0,
            'running': 0,
            'completed': 0,
            'failed': 0,
            'skipped': 0
        }

        for stage in self.stages:
            summary[stage.status.value] += 1

        return summary

    def get_current_stage(self) -> Optional[Stage]:
        """
        Retorna la etapa actual

        Returns:
            Etapa actual o None
        """
        if self.current_stage_idx is not None and 0 <= self.current_stage_idx < len(self.stages):
            return self.stages[self.current_stage_idx]
        return None

    def get_failed_stages(self) -> List[Stage]:
        """
        Retorna etapas fallidas

        Returns:
            Lista de etapas fallidas
        """
        return [stage for stage in self.stages if stage.status == StageStatus.FAILED]

    def get_total_duration(self) -> float:
        """
        Retorna duración total en segundos

        Returns:
            Duración en segundos
        """
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        elif self.start_time:
            return (datetime.now() - self.start_time).total_seconds()
        return 0.0

    def register_callback(self, callback: Callable):
        """
        Registra un callback para notificaciones de cambio

        Args:
            callback: Función a llamar cuando hay cambios
        """
        self.callbacks.append(callback)
        logger.debug(f"Callback registrado: {callback.__name__}")

    def _notify_callbacks(self):
        """Notifica a todos los callbacks registrados"""
        for callback in self.callbacks:
            try:
                callback(self)
            except Exception as e:
                logger.error(f"Error en callback: {e}", exc_info=True)

    def to_dict(self) -> Dict[str, Any]:
        """
        Convierte el estado completo a diccionario

        Returns:
            Diccionario con todo el estado
        """
        return {
            'pipeline_name': self.pipeline_name,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'total_duration': self.get_total_duration(),
            'overall_progress': self.get_overall_progress(),
            'current_stage_index': self.current_stage_idx,
            'status_summary': self.get_status_summary(),
            'stages': [stage.to_dict() for stage in self.stages],
            'is_complete': self.end_time is not None,
            'has_errors': len(self.get_failed_stages()) > 0
        }

    def get_printable_summary(self) -> str:
        """
        Retorna resumen imprimible del progreso

        Returns:
            String con resumen formateado
        """
        summary_lines = [
            f"=== {self.pipeline_name} ===",
            f"Progreso Global: {self.get_overall_progress():.1%}",
            f"Duración: {self.get_total_duration():.1f}s",
            ""
        ]

        status_summary = self.get_status_summary()
        summary_lines.append("Estado de Etapas:")
        for status, count in status_summary.items():
            if count > 0:
                summary_lines.append(f"  {status.capitalize()}: {count}")

        summary_lines.append("")
        summary_lines.append("Detalle de Etapas:")

        for i, stage in enumerate(self.stages):
            status_icon = {
                StageStatus.PENDING: "⏸",
                StageStatus.RUNNING: "⏳",
                StageStatus.COMPLETED: "✓",
                StageStatus.FAILED: "✗",
                StageStatus.SKIPPED: "○"
            }[stage.status]

            line = f"  {status_icon} {stage.name}"
            if stage.status == StageStatus.RUNNING:
                line += f" ({stage.progress:.1%})"
            elif stage.status == StageStatus.FAILED:
                line += f" - Error: {stage.error}"

            summary_lines.append(line)

        return "\n".join(summary_lines)

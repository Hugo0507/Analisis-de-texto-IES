"""
Módulo de Logging Profesional
Sistema centralizado de logging para toda la aplicación
"""

import logging
import os
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from datetime import datetime
from pathlib import Path
from typing import Optional


class CustomFormatter(logging.Formatter):
    """Formatter personalizado con colores para la consola"""

    # Colores ANSI
    grey = "\x1b[38;21m"
    blue = "\x1b[38;5;39m"
    yellow = "\x1b[38;5;226m"
    red = "\x1b[38;5;196m"
    bold_red = "\x1b[31;1m"
    reset = "\x1b[0m"

    format_str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s (%(filename)s:%(lineno)d)"

    FORMATS = {
        logging.DEBUG: grey + format_str + reset,
        logging.INFO: blue + format_str + reset,
        logging.WARNING: yellow + format_str + reset,
        logging.ERROR: red + format_str + reset,
        logging.CRITICAL: bold_red + format_str + reset
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(log_fmt, datefmt='%Y-%m-%d %H:%M:%S')
        return formatter.format(record)


class LoggerManager:
    """Gestor centralizado de loggers para la aplicación"""

    _loggers = {}
    _initialized = False

    @classmethod
    def initialize(cls, log_dir: str = 'logs', log_level: str = 'INFO'):
        """
        Inicializa el sistema de logging

        Args:
            log_dir: Directorio donde se guardarán los logs
            log_level: Nivel de logging (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        if cls._initialized:
            return

        # Crear directorio de logs si no existe
        log_path = Path(log_dir)
        log_path.mkdir(exist_ok=True)

        cls._initialized = True
        cls._log_dir = log_dir
        cls._log_level = getattr(logging, log_level.upper(), logging.INFO)

    @classmethod
    def get_logger(cls, name: str, include_console: bool = True) -> logging.Logger:
        """
        Obtiene un logger configurado

        Args:
            name: Nombre del logger (usualmente __name__)
            include_console: Si debe incluir salida a consola

        Returns:
            Logger configurado
        """
        # Inicializar si no se ha hecho
        if not cls._initialized:
            cls.initialize()

        # Retornar logger existente si ya fue creado
        if name in cls._loggers:
            return cls._loggers[name]

        # Crear nuevo logger
        logger = logging.getLogger(name)
        logger.setLevel(cls._log_level)
        logger.propagate = False

        # Evitar duplicación de handlers
        if logger.handlers:
            return logger

        # Handler para archivo general (rotativo por tamaño)
        log_file = os.path.join(cls._log_dir, 'app.log')
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10485760,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        file_handler.setLevel(cls._log_level)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s (%(filename)s:%(lineno)d)',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)

        # Handler para errores (rotativo por día)
        error_log_file = os.path.join(cls._log_dir, 'errors.log')
        error_handler = TimedRotatingFileHandler(
            error_log_file,
            when='midnight',
            interval=1,
            backupCount=30,  # Mantener 30 días
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(file_formatter)
        logger.addHandler(error_handler)

        # Handler para consola (con colores)
        if include_console:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(cls._log_level)
            console_handler.setFormatter(CustomFormatter())
            logger.addHandler(console_handler)

        # Guardar logger
        cls._loggers[name] = logger

        return logger

    @classmethod
    def shutdown(cls):
        """Cierra todos los handlers de logging"""
        for logger in cls._loggers.values():
            for handler in logger.handlers:
                handler.close()

        cls._loggers.clear()
        cls._initialized = False


# Función de conveniencia para obtener logger
def get_logger(name: str, include_console: bool = True) -> logging.Logger:
    """
    Función de conveniencia para obtener un logger

    Args:
        name: Nombre del logger (usualmente __name__)
        include_console: Si debe incluir salida a consola

    Returns:
        Logger configurado

    Ejemplo:
        >>> from src.utils.logger import get_logger
        >>> logger = get_logger(__name__)
        >>> logger.info("Mensaje informativo")
        >>> logger.error("Error ocurrido", exc_info=True)
    """
    return LoggerManager.get_logger(name, include_console)


# Contexto para logging temporal
class LogContext:
    """Context manager para logging con contexto adicional"""

    def __init__(self, logger: logging.Logger, context: str):
        self.logger = logger
        self.context = context
        self.start_time = None

    def __enter__(self):
        self.start_time = datetime.now()
        self.logger.info(f"[{self.context}] Iniciando...")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds()

        if exc_type is not None:
            self.logger.error(
                f"[{self.context}] Error después de {duration:.2f}s: {exc_val}",
                exc_info=True
            )
            return False

        self.logger.info(f"[{self.context}] Completado en {duration:.2f}s")
        return True


# Decorador para logging automático de funciones
def log_execution(logger: Optional[logging.Logger] = None):
    """
    Decorador para loggear automáticamente la ejecución de funciones

    Args:
        logger: Logger a usar (si es None, crea uno nuevo)

    Ejemplo:
        >>> @log_execution()
        >>> def mi_funcion(x, y):
        >>>     return x + y
    """
    def decorator(func):
        nonlocal logger
        if logger is None:
            logger = get_logger(func.__module__)

        def wrapper(*args, **kwargs):
            func_name = func.__name__
            logger.debug(f"Ejecutando {func_name} con args={args}, kwargs={kwargs}")

            try:
                result = func(*args, **kwargs)
                logger.debug(f"{func_name} completado exitosamente")
                return result

            except Exception as e:
                logger.error(f"Error en {func_name}: {e}", exc_info=True)
                raise

        return wrapper
    return decorator


# Función para registrar excepciones no capturadas
def log_uncaught_exceptions(exc_type, exc_value, exc_traceback):
    """
    Handler para excepciones no capturadas
    Usar con: sys.excepthook = log_uncaught_exceptions
    """
    if issubclass(exc_type, KeyboardInterrupt):
        # Permitir Ctrl+C sin logging
        return

    logger = get_logger('uncaught')
    logger.critical(
        "Excepción no capturada",
        exc_info=(exc_type, exc_value, exc_traceback)
    )


if __name__ == "__main__":
    # Ejemplo de uso
    LoggerManager.initialize(log_level='DEBUG')

    logger = get_logger(__name__)

    logger.debug("Mensaje de debug")
    logger.info("Mensaje informativo")
    logger.warning("Mensaje de advertencia")
    logger.error("Mensaje de error")

    # Con contexto
    with LogContext(logger, "Operación de prueba"):
        logger.info("Ejecutando operación...")

    # Con decorador
    @log_execution(logger)
    def ejemplo_funcion(x, y):
        return x + y

    resultado = ejemplo_funcion(5, 3)
    print(f"Resultado: {resultado}")

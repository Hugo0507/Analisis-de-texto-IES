"""
Lanzamiento de trabajos largos en segundo plano.

Los ocho procesadores de analisis (BoW, TF-IDF, n-gramas, modelado de temas,
BERTopic, LSTM, NER y preparacion de datos) repetian la misma funcion
`start_processing_thread`: crear un `threading.Thread` daemon, arrancarlo y
registrar una linea de log. Ocho copias del mismo bloque, cada una con su
propio texto de log y su propia forma de escribirlo.

ADVERTENCIA IMPORTANTE (venia documentada solo en ner_analysis y aplica a los
ocho): estos hilos NO sobreviven a un reinicio de Gunicorn ni al reciclado del
contenedor. Si el proceso web se reinicia a mitad de un analisis, el trabajo se
pierde y el registro se queda colgado en estado "processing". Para persistencia
real hace falta una cola de tareas externa (Celery + Redis o equivalente).
"""

import logging
import threading
from typing import Any, Callable

logger = logging.getLogger(__name__)


def run_in_background(target: Callable[..., Any], *args: Any, label: str = '') -> threading.Thread:
    """
    Ejecuta `target(*args)` en un hilo daemon y devuelve el hilo ya arrancado.

    Args:
        target: funcion a ejecutar.
        *args: argumentos posicionales para `target`.
        label: descripcion corta para el log, por ejemplo "BoW #12". Si se
            omite se usa el nombre de la funcion.

    Returns:
        El `threading.Thread` ya arrancado, por si quien llama quiere
        inspeccionarlo o esperarlo en un test.
    """
    thread = threading.Thread(target=target, args=args, daemon=True)
    thread.start()
    logger.info('Hilo de procesamiento iniciado: %s', label or target.__name__)
    return thread

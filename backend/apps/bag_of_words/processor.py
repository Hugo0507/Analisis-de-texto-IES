"""
Bag of Words Processor

Procesamiento en background de análisis BoW usando threading.
"""

import logging
from typing import List
import joblib
from sklearn.feature_extraction.text import CountVectorizer
from django.core.files.base import ContentFile
from django.utils import timezone
from apps.core.nlp.matrix_stats import calculate_sparsity, calculate_statistics
from apps.core.background import run_in_background

logger = logging.getLogger(__name__)


def process_bag_of_words(bow_id: int):
    """
    Procesar análisis de Bolsa de Palabras en background.

    Args:
        bow_id: ID del análisis BagOfWords a procesar
    """
    from .models import BagOfWords
    from apps.data_preparation.models import DataPreparation

    try:
        bow = BagOfWords.objects.get(id=bow_id)

        logger.info(f"[BoW {bow_id}] Iniciando procesamiento: {bow.name}")

        # Actualizar estado
        bow.status = BagOfWords.STATUS_PROCESSING
        bow.current_stage = BagOfWords.STAGE_LOADING_DATA
        bow.progress_percentage = 10
        bow.processing_started_at = timezone.now()
        bow.save()

        # ETAPA 1: Cargar datos preprocesados
        logger.info(f"[BoW {bow_id}] Cargando datos preprocesados...")
        data_prep = bow.data_preparation

        if data_prep.status != DataPreparation.STATUS_COMPLETED:
            raise ValueError("La preparación de datos no está completada")

        # Obtener textos preprocesados del cache
        texts = load_preprocessed_texts(data_prep)

        if not texts:
            raise ValueError("No se encontraron textos preprocesados")

        logger.info(f"[BoW {bow_id}] ✅ Cargados {len(texts)} documentos")

        bow.document_count = len(texts)
        bow.current_stage = BagOfWords.STAGE_VECTORIZING
        bow.progress_percentage = 30
        bow.save()

        # ETAPA 2: Vectorizar
        logger.info(f"[BoW {bow_id}] Vectorizando con Count Vectorizer...")

        vectorizer, matrix = vectorize_texts(bow, texts)

        logger.info(
            f"[BoW {bow_id}] ✅ Matriz creada: {matrix.shape[0]}x{matrix.shape[1]} "
            f"(sparsity: {calculate_sparsity(matrix):.2%})"
        )

        bow.current_stage = BagOfWords.STAGE_CALCULATING_STATS
        bow.progress_percentage = 60
        bow.save()

        # ETAPA 3: Calcular estadísticas
        logger.info(f"[BoW {bow_id}] Calculando estadísticas...")

        stats = calculate_statistics(vectorizer, matrix)

        bow.current_stage = BagOfWords.STAGE_SAVING_RESULTS
        bow.progress_percentage = 80
        bow.save()

        # ETAPA 4: Guardar resultados
        logger.info(f"[BoW {bow_id}] Guardando resultados...")

        bow.vocabulary_size = len(vectorizer.vocabulary_)
        bow.matrix_shape = {
            'rows': int(matrix.shape[0]),  # Convertir numpy.int64 a int
            'cols': int(matrix.shape[1])   # Convertir numpy.int64 a int
        }
        bow.matrix_sparsity = float(calculate_sparsity(matrix))  # Convertir a float

        # Guardar top términos
        bow.top_terms = stats['top_terms']

        # Guardar vocabulario (solo primeros 5000 para no saturar BD)
        vocab = vectorizer.vocabulary_
        if len(vocab) > 5000:
            # Tomar solo los top términos por importancia
            sorted_vocab = sorted(
                vocab.items(),
                key=lambda x: stats['term_scores'].get(x[0], 0),
                reverse=True
            )[:5000]
            # Convertir valores numpy.int64 a int
            bow.vocabulary = {k: int(v) for k, v in sorted_vocab}
        else:
            # Convertir valores numpy.int64 a int
            bow.vocabulary = {k: int(v) for k, v in vocab.items()}

        # Guardar feature names
        bow.feature_names = vectorizer.get_feature_names_out().tolist()

        # Estadísticas adicionales
        bow.avg_terms_per_document = float(stats['avg_terms_per_doc'])
        bow.total_term_occurrences = int(stats['total_occurrences'])

        # ETAPA 4b: Serializar vectorizador para inferencia futura
        logger.info(f"[BoW {bow_id}] Serializando vectorizador...")
        try:
            import io
            buffer = io.BytesIO()
            joblib.dump(vectorizer, buffer)
            buffer.seek(0)
            artifact_filename = f"bow_{bow_id}_vectorizer.pkl"
            bow.model_artifact.save(artifact_filename, ContentFile(buffer.read()), save=False)
            # Guardar también en BinaryField para persistencia en hosting efímero
            buffer.seek(0)
            bow.model_artifact_bin = buffer.read()
            logger.info(f"[BoW {bow_id}] ✅ Vectorizador serializado: {artifact_filename}")
        except Exception as artifact_error:
            logger.warning(f"[BoW {bow_id}] ⚠️ No se pudo serializar el vectorizador: {artifact_error}")

        # COMPLETADO
        bow.status = BagOfWords.STATUS_COMPLETED
        bow.current_stage = BagOfWords.STAGE_COMPLETED
        bow.progress_percentage = 100
        bow.processing_completed_at = timezone.now()
        bow.save()

        logger.info(f"[BoW {bow_id}] ✅ Procesamiento completado exitosamente")

    except Exception as e:
        logger.exception(f"[BoW {bow_id}] ❌ Error en procesamiento: {str(e)}")

        try:
            bow = BagOfWords.objects.get(id=bow_id)
            bow.status = BagOfWords.STATUS_ERROR
            bow.error_message = str(e)
            bow.progress_percentage = 0
            bow.save()
        except Exception as save_error:
            logger.error(f"[BoW {bow_id}] Error guardando estado de error: {save_error}")


def load_preprocessed_texts(data_prep) -> List[str]:
    """
    Cargar textos preprocesados desde la base de datos.

    Args:
        data_prep: Instancia de DataPreparation

    Returns:
        Lista de textos preprocesados
    """
    from apps.datasets.models import DatasetFile

    try:
        # Obtener IDs de archivos procesados
        file_ids = data_prep.processed_file_ids

        if not file_ids:
            logger.warning(
                f"No hay archivos procesados en preparación {data_prep.id}. "
                f"Asegúrate de que la preparación se completó correctamente."
            )
            return []

        # Cargar archivos desde la base de datos
        files = DatasetFile.objects.filter(id__in=file_ids).only('preprocessed_text')

        # Extraer textos preprocesados
        texts = []
        for file in files:
            if file.preprocessed_text:
                texts.append(file.preprocessed_text)
            else:
                logger.warning(f"Archivo {file.id} no tiene texto preprocesado")

        logger.info(
            f"Cargados {len(texts)} textos preprocesados desde la base de datos "
            f"para preparación {data_prep.id}"
        )

        return texts

    except Exception as e:
        logger.error(f"Error cargando textos preprocesados: {str(e)}")
        return []


def vectorize_texts(bow, texts: List[str]):
    """
    Vectorizar textos usando Count Vectorizer (Bolsa de Palabras).

    Args:
        bow: Instancia de BagOfWords con configuración
        texts: Lista de textos a vectorizar

    Returns:
        Tuple (vectorizer, matrix)
    """
    ngram_range = (bow.ngram_min, bow.ngram_max)

    from apps.data_preparation.stopwords import EXTRA_STOPWORDS

    vectorizer = CountVectorizer(
        max_features=bow.max_features,
        min_df=bow.min_df,
        max_df=bow.max_df,
        ngram_range=ngram_range,
        # Solo tokens alfabéticos de mínimo 3 caracteres.
        # El patrón por defecto (\w\w+) incluye dígitos, lo que permite
        # que años (2018, 2021) y números sueltos (40) entren al vocabulario
        # incluso si el preprocesamiento los eliminó del texto.
        token_pattern=r"(?u)\b[a-zA-Z]{2,}\b",
        # Segunda línea de defensa: stopwords aplicadas en vectorización
        stop_words=list(EXTRA_STOPWORDS),
    )

    matrix = vectorizer.fit_transform(texts)

    return vectorizer, matrix


def start_processing_thread(bow_id: int):
    """Lanza el procesamiento de BoW en segundo plano."""
    return run_in_background(process_bag_of_words, bow_id, label=f'BoW #{bow_id}')

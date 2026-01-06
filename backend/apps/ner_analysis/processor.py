"""
NER Analysis Processor

Procesamiento en background de análisis NER usando threading y spaCy.
"""

import logging
import threading
from datetime import datetime
from typing import List, Dict, Any, Tuple
from collections import defaultdict, Counter
import spacy
from django.utils import timezone

logger = logging.getLogger(__name__)


def process_ner_analysis(ner_id: int):
    """
    Procesar análisis NER en background.

    Args:
        ner_id: ID del análisis NerAnalysis a procesar
    """
    from .models import NerAnalysis
    from apps.data_preparation.models import DataPreparation
    from apps.datasets.models import DatasetFile

    try:
        ner = NerAnalysis.objects.get(id=ner_id)

        logger.info(f"[NER {ner_id}] Iniciando procesamiento: {ner.name}")

        # Actualizar estado
        ner.status = NerAnalysis.STATUS_PROCESSING
        ner.current_stage = NerAnalysis.STAGE_LOADING_MODEL
        ner.progress_percentage = 10
        ner.processing_started_at = timezone.now()
        ner.save()

        # ETAPA 1: Cargar modelo spaCy (10%)
        logger.info(f"[NER {ner_id}] Cargando modelo spaCy: {ner.spacy_model}")
        nlp = load_spacy_model(ner.spacy_model)

        ner.current_stage = NerAnalysis.STAGE_LOADING_DATA
        ner.progress_percentage = 20
        ner.save()

        # ETAPA 2: Cargar datos (20%)
        logger.info(f"[NER {ner_id}] Cargando datos desde {ner.source_type}...")
        texts, document_ids = load_texts(ner)

        if not texts:
            raise ValueError("No se encontraron textos para procesar")

        logger.info(f"[NER {ner_id}] ✅ Cargados {len(texts)} documentos")

        ner.documents_processed = len(texts)
        ner.current_stage = NerAnalysis.STAGE_EXTRACTING_ENTITIES
        ner.progress_percentage = 30
        ner.save()

        # ETAPA 3: Extraer entidades (30% -> 60%)
        logger.info(f"[NER {ner_id}] Extrayendo entidades...")
        entities_data = extract_entities(
            ner, nlp, texts, document_ids,
            progress_callback=lambda p: update_progress(ner_id, 30 + int(p * 0.3))
        )

        logger.info(
            f"[NER {ner_id}] ✅ Extraídas {entities_data['total_entities']} entidades "
            f"({entities_data['unique_entities']} únicas)"
        )

        ner.current_stage = NerAnalysis.STAGE_CALCULATING_STATS
        ner.progress_percentage = 70
        ner.save()

        # ETAPA 4: Calcular estadísticas (70%)
        logger.info(f"[NER {ner_id}] Calculando estadísticas...")
        stats = calculate_statistics(entities_data)

        ner.current_stage = NerAnalysis.STAGE_ANALYZING_COOCCURRENCES
        ner.progress_percentage = 85
        ner.save()

        # ETAPA 5: Analizar co-ocurrencias (85%)
        logger.info(f"[NER {ner_id}] Analizando co-ocurrencias...")
        cooccurrences = analyze_cooccurrences(entities_data)

        ner.current_stage = NerAnalysis.STAGE_SAVING_RESULTS
        ner.progress_percentage = 95
        ner.save()

        # ETAPA 6: Guardar resultados (95%)
        logger.info(f"[NER {ner_id}] Guardando resultados...")
        save_results(ner, entities_data, stats, cooccurrences)

        # COMPLETADO
        ner.status = NerAnalysis.STATUS_COMPLETED
        ner.current_stage = NerAnalysis.STAGE_COMPLETED
        ner.progress_percentage = 100
        ner.processing_completed_at = timezone.now()
        ner.save()

        logger.info(f"[NER {ner_id}] ✅ Procesamiento completado exitosamente")

    except Exception as e:
        logger.exception(f"[NER {ner_id}] ❌ Error en procesamiento: {str(e)}")

        try:
            ner = NerAnalysis.objects.get(id=ner_id)
            ner.status = NerAnalysis.STATUS_ERROR
            ner.error_message = str(e)
            ner.progress_percentage = 0
            ner.save()
        except Exception as save_error:
            logger.error(f"[NER {ner_id}] Error guardando estado de error: {save_error}")


def load_spacy_model(model_name: str):
    """
    Cargar modelo spaCy en memoria.

    Args:
        model_name: Nombre del modelo (ej: 'en_core_web_sm')

    Returns:
        Modelo spaCy cargado

    Raises:
        ValueError: Si el modelo no está instalado
    """
    try:
        nlp = spacy.load(model_name)
        logger.info(f"Modelo spaCy '{model_name}' cargado exitosamente")
        return nlp
    except OSError:
        raise ValueError(
            f"Modelo spaCy '{model_name}' no está instalado. "
            f"Ejecuta: python -m spacy download {model_name}"
        )


def load_texts(ner) -> Tuple[List[str], List[int]]:
    """
    Cargar textos desde la fuente configurada.

    Args:
        ner: Instancia de NerAnalysis

    Returns:
        Tupla de (textos, document_ids)
    """
    from apps.datasets.models import DatasetFile

    texts = []
    document_ids = []

    if ner.source_type == ner.SOURCE_DATA_PREPARATION:
        # Opción A: Desde DataPreparation (textos preprocesados)
        data_prep = ner.data_preparation
        file_ids = data_prep.processed_file_ids

        if not file_ids:
            logger.warning(f"No hay archivos procesados en preparación {data_prep.id}")
            return [], []

        files = DatasetFile.objects.filter(id__in=file_ids).only('id', 'preprocessed_text')

        for file in files:
            if file.preprocessed_text:
                texts.append(file.preprocessed_text)
                document_ids.append(file.id)
            else:
                logger.warning(f"Archivo {file.id} no tiene texto preprocesado")

    elif ner.source_type == ner.SOURCE_DATASET:
        # Opción B: Desde Dataset (textos raw)
        dataset = ner.dataset
        files = DatasetFile.objects.filter(
            dataset=dataset,
            status='completed'
        ).only('id', 'txt_content')

        for file in files:
            if file.txt_content:
                texts.append(file.txt_content)
                document_ids.append(file.id)
            else:
                logger.warning(f"Archivo {file.id} no tiene contenido de texto")

    logger.info(
        f"Cargados {len(texts)} textos desde {ner.source_type} "
        f"({ner.source_name})"
    )

    return texts, document_ids


def extract_entities(
    ner,
    nlp,
    texts: List[str],
    document_ids: List[int],
    progress_callback=None
) -> Dict[str, Any]:
    """
    Extraer entidades nombradas de los textos usando spaCy.

    Args:
        ner: Instancia de NerAnalysis
        nlp: Modelo spaCy cargado
        texts: Lista de textos a procesar
        document_ids: IDs de los documentos
        progress_callback: Función para actualizar progreso

    Returns:
        Diccionario con datos de entidades extraídas
    """
    selected_entities = set(ner.selected_entities)

    # Estructura para almacenar entidades
    # {(texto, label): {"text": str, "label": str, "documents": set, "frequency": int}}
    entities_map = defaultdict(lambda: {
        "text": "",
        "label": "",
        "documents": set(),
        "frequency": 0
    })

    # Para tracking de entidades por documento (para co-ocurrencias)
    entities_by_doc = defaultdict(list)  # {doc_id: [(text, label), ...]}

    # Contadores
    total_entities = 0
    entity_types_counter = Counter()

    total_docs = len(texts)

    for idx, (text, doc_id) in enumerate(zip(texts, document_ids)):
        # Procesar documento con spaCy
        doc = nlp(text)

        # Extraer entidades del documento
        for ent in doc.ents:
            if ent.label_ in selected_entities:
                # Normalizar texto de entidad (lowercase, strip)
                ent_text = ent.text.strip()
                if not ent_text:
                    continue

                key = (ent_text, ent.label_)

                # Actualizar mapa de entidades
                entities_map[key]["text"] = ent_text
                entities_map[key]["label"] = ent.label_
                entities_map[key]["documents"].add(doc_id)
                entities_map[key]["frequency"] += 1

                # Para co-ocurrencias
                entities_by_doc[doc_id].append(key)

                # Contadores
                total_entities += 1
                entity_types_counter[ent.label_] += 1

        # Actualizar progreso cada 10 documentos
        if progress_callback and (idx + 1) % 10 == 0:
            progress = (idx + 1) / total_docs * 100
            progress_callback(progress)

    # Convertir entities_map a lista
    entities_list = []
    for (text, label), data in entities_map.items():
        entities_list.append({
            "text": text,
            "label": label,
            "frequency": data["frequency"],
            "documents": list(data["documents"]),
            "document_count": len(data["documents"])
        })

    # Ordenar por frecuencia descendente
    entities_list.sort(key=lambda x: x["frequency"], reverse=True)

    return {
        "entities": entities_list,
        "entities_by_doc": entities_by_doc,
        "total_entities": total_entities,
        "unique_entities": len(entities_list),
        "entity_types_count": dict(entity_types_counter)
    }


def calculate_statistics(entities_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calcular estadísticas de entidades.

    Args:
        entities_data: Datos de entidades extraídas

    Returns:
        Diccionario con estadísticas calculadas
    """
    entities = entities_data["entities"]
    entity_types_count = entities_data["entity_types_count"]
    total_entities = entities_data["total_entities"]

    # Top entidades por tipo (top 10 de cada tipo)
    top_entities_by_type = defaultdict(list)
    for ent in entities:
        label = ent["label"]
        if len(top_entities_by_type[label]) < 10:
            top_entities_by_type[label].append({
                "text": ent["text"],
                "frequency": ent["frequency"],
                "document_count": ent["document_count"]
            })

    # Distribución porcentual por tipo
    entity_distribution = []
    for label, count in sorted(
        entity_types_count.items(),
        key=lambda x: x[1],
        reverse=True
    ):
        percentage = (count / total_entities * 100) if total_entities > 0 else 0
        entity_distribution.append({
            "label": label,
            "value": count,
            "percentage": round(percentage, 2)
        })

    return {
        "top_entities_by_type": dict(top_entities_by_type),
        "entity_distribution": entity_distribution
    }


def analyze_cooccurrences(entities_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Analizar co-ocurrencias de entidades.

    Args:
        entities_data: Datos de entidades extraídas

    Returns:
        Lista de co-ocurrencias encontradas
    """
    entities_by_doc = entities_data["entities_by_doc"]

    # Mapear (ent1, ent2) -> {count, documents}
    cooccurrence_map = defaultdict(lambda: {"count": 0, "documents": set()})

    # Por cada documento, calcular pares de entidades
    for doc_id, entities in entities_by_doc.items():
        # Obtener pares únicos de entidades en el documento
        unique_entities = list(set(entities))

        for i in range(len(unique_entities)):
            for j in range(i + 1, len(unique_entities)):
                ent1 = unique_entities[i]
                ent2 = unique_entities[j]

                # Ordenar para evitar duplicados (A,B) y (B,A)
                pair = tuple(sorted([ent1, ent2]))

                cooccurrence_map[pair]["count"] += 1
                cooccurrence_map[pair]["documents"].add(doc_id)

    # Convertir a lista y ordenar por frecuencia
    cooccurrences = []
    for (ent1, ent2), data in cooccurrence_map.items():
        cooccurrences.append({
            "entity1": {"text": ent1[0], "label": ent1[1]},
            "entity2": {"text": ent2[0], "label": ent2[1]},
            "cooccurrence_count": data["count"],
            "documents": list(data["documents"]),
            "document_count": len(data["documents"])
        })

    # Ordenar por frecuencia y limitar a top 100
    cooccurrences.sort(key=lambda x: x["cooccurrence_count"], reverse=True)
    return cooccurrences[:100]


def save_results(
    ner,
    entities_data: Dict[str, Any],
    stats: Dict[str, Any],
    cooccurrences: List[Dict[str, Any]]
):
    """
    Guardar resultados en la base de datos.

    Args:
        ner: Instancia de NerAnalysis
        entities_data: Datos de entidades
        stats: Estadísticas calculadas
        cooccurrences: Co-ocurrencias
    """
    # Estadísticas generales
    ner.total_entities_found = entities_data["total_entities"]
    ner.unique_entities_count = entities_data["unique_entities"]
    ner.entity_types_found = entities_data["entity_types_count"]

    # Entidades (limitar a 1000 para no saturar BD)
    ner.entities = entities_data["entities"][:1000]

    # Top entidades por tipo
    ner.top_entities_by_type = stats["top_entities_by_type"]

    # Distribución
    ner.entity_distribution = stats["entity_distribution"]

    # Co-ocurrencias
    ner.cooccurrences = cooccurrences

    ner.save()
    logger.info(f"[NER {ner.id}] Resultados guardados exitosamente")


def update_progress(ner_id: int, percentage: int):
    """
    Actualizar progreso del análisis.

    Args:
        ner_id: ID del análisis
        percentage: Porcentaje de progreso
    """
    try:
        from .models import NerAnalysis
        ner = NerAnalysis.objects.get(id=ner_id)
        ner.progress_percentage = min(percentage, 100)
        ner.save(update_fields=['progress_percentage'])
    except Exception as e:
        logger.warning(f"Error actualizando progreso: {e}")


def start_processing_thread(ner_id: int):
    """
    Iniciar procesamiento en thread de background.

    Args:
        ner_id: ID del análisis NerAnalysis a procesar
    """
    thread = threading.Thread(
        target=process_ner_analysis,
        args=(ner_id,),
        daemon=True
    )
    thread.start()
    logger.info(f"Thread de procesamiento NER iniciado para ID {ner_id}")

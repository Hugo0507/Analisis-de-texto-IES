"""
Ejemplos, partición y métricas del clasificador LSTM.

Separado del entrenamiento para poder probarlo sin PyTorch. Las decisiones que
hacen que el resultado sea defendible viven aquí:

- La partición es por documento: los fragmentos de un artículo van todos a
  entrenamiento o todos a prueba. Si se mezclaran, el modelo reconocería el
  artículo y la exactitud se inflaría.
- Las métricas principales son por documento y se comparan con la línea base
  de responder siempre la clase mayoritaria.
"""

from collections import Counter, defaultdict
from typing import Dict, List, Sequence, Tuple

import numpy as np


def etiquetas_oe3(topics: list) -> Dict[int, Tuple[str, str]]:
    """
    Factor OE3 de cada tema, con el mismo clasificador que usa el resto del
    sistema (apps/topic_modeling/factors.py).

    Returns:
        {topic_id: (id_categoria, nombre_categoria)}
    """
    from apps.topic_modeling.factors import classify_topics

    return {
        c['topic_id']: (c['primary_category'], c['primary_category_label'])
        for c in classify_topics(topics or [])
    }


def fragmentar(texto: str, palabras: int) -> List[str]:
    """
    Partir un texto en fragmentos de `palabras` palabras.

    Con palabras <= 0 el texto entero es un solo ejemplo. El último fragmento,
    si queda con menos de la mitad del tamaño, se une al anterior para no crear
    ejemplos casi vacíos.
    """
    tokens = (texto or '').split()
    if not tokens:
        return []
    if palabras <= 0 or len(tokens) <= palabras:
        return [' '.join(tokens)]
    trozos = [tokens[i:i + palabras] for i in range(0, len(tokens), palabras)]
    if len(trozos) > 1 and len(trozos[-1]) < palabras // 2:
        trozos[-2].extend(trozos.pop())
    return [' '.join(t) for t in trozos]


def dividir_por_documento(
    etiquetas_doc: Sequence[int], proporcion_train: float, semilla: int = 42,
) -> Tuple[List[int], List[int]]:
    """
    Índices de documentos para entrenamiento y prueba, estratificado por clase.

    Cada clase con al menos dos documentos aporta al menos uno a cada conjunto;
    una clase con un solo documento se queda en entrenamiento.
    """
    rng = np.random.default_rng(semilla)
    por_clase: Dict[int, List[int]] = defaultdict(list)
    for i, etiqueta in enumerate(etiquetas_doc):
        por_clase[etiqueta].append(i)

    train: List[int] = []
    test: List[int] = []
    for etiqueta in sorted(por_clase):
        indices = list(por_clase[etiqueta])
        rng.shuffle(indices)
        n = len(indices)
        n_test = int(round(n * (1 - proporcion_train)))
        n_test = min(max(n_test, 1), n - 1) if n >= 2 else 0
        test.extend(indices[:n_test])
        train.extend(indices[n_test:])
    return sorted(train), sorted(test)


def pesos_por_clase(y_train: Sequence[int], n_clases: int) -> List[float]:
    """
    Peso inverso a la frecuencia de cada clase para la función de pérdida.

    Sin esto, con clases desbalanceadas el modelo aprende a responder la
    mayoritaria. Una clase ausente del entrenamiento recibe peso 0.
    """
    conteo = Counter(y_train)
    total = len(y_train)
    presentes = sum(1 for c in range(n_clases) if conteo.get(c))
    return [
        (total / (presentes * conteo[c])) if conteo.get(c) else 0.0
        for c in range(n_clases)
    ]


def metricas(y_true: Sequence[int], y_pred: Sequence[int], nombres: Sequence[str]) -> dict:
    """
    Exactitud, F1 macro, matriz de confusión y reporte por clase.

    El F1 macro promedia solo las clases presentes en y_true: una clase sin
    ejemplos de prueba no se puede evaluar y no debe contar como 0.
    """
    n = len(nombres)
    matriz = [[0] * n for _ in range(n)]
    for real, predicho in zip(y_true, y_pred):
        if 0 <= real < n and 0 <= predicho < n:
            matriz[real][predicho] += 1

    reporte: Dict[str, dict] = {}
    f1s: List[float] = []
    for c in range(n):
        tp = matriz[c][c]
        fp = sum(matriz[r][c] for r in range(n) if r != c)
        fn = sum(matriz[c][k] for k in range(n) if k != c)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        soporte = sum(matriz[c])
        reporte[nombres[c]] = {
            'precision': round(precision, 4),
            'recall': round(recall, 4),
            'f1_score': round(f1, 4),
            'support': soporte,
        }
        if soporte:
            f1s.append(f1)

    aciertos = sum(1 for r, p in zip(y_true, y_pred) if r == p)
    return {
        'accuracy': aciertos / len(y_true) if len(y_true) else 0.0,
        'macro_f1': float(np.mean(f1s)) if f1s else 0.0,
        'matriz': matriz,
        'reporte': reporte,
    }


def linea_base(y_train: Sequence[int], y_test: Sequence[int], nombres: Sequence[str]) -> dict:
    """Métricas de responder siempre la clase más frecuente del entrenamiento."""
    mayoritaria = Counter(y_train).most_common(1)[0][0]
    return metricas(y_test, [mayoritaria] * len(y_test), nombres)


def prediccion_por_documento(
    probabilidades: np.ndarray, documento_de_cada_ejemplo: Sequence[int],
) -> Dict[int, int]:
    """
    Clase de cada documento promediando las probabilidades de sus fragmentos.

    Returns:
        {índice de documento: clase predicha}
    """
    suma: Dict[int, np.ndarray] = {}
    for fila, doc in zip(probabilidades, documento_de_cada_ejemplo):
        suma[doc] = suma.get(doc, 0) + np.asarray(fila, dtype=float)
    return {doc: int(np.argmax(total)) for doc, total in suma.items()}

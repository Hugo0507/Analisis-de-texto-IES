"""
Estadísticas de matrices documento-término.

Funciones compartidas por los procesadores que producen una matriz de
recuentos con un CountVectorizer de scikit-learn: `bag_of_words` y
`ngram_analysis`. Antes estaban duplicadas en el `processor.py` de cada app.
"""

from typing import Any, Dict

import numpy as np


def calculate_sparsity(matrix) -> float:
    """
    Calcular esparsidad de la matriz (porcentaje de ceros).

    Args:
        matrix: Matriz sparse o densa

    Returns:
        Porcentaje de ceros (0.0 a 1.0)
    """
    total_elements = int(matrix.shape[0]) * int(matrix.shape[1])
    if total_elements == 0:
        return 0.0

    non_zero = matrix.nnz if hasattr(matrix, 'nnz') else int(np.count_nonzero(matrix))
    zero_elements = total_elements - non_zero

    # Convertir a float nativo de Python
    return float(zero_elements / total_elements)


def calculate_statistics(vectorizer, matrix) -> Dict[str, Any]:
    """
    Calcular estadísticas de la matriz documento-término (Count Vectorizer).

    Args:
        vectorizer: Vectorizador CountVectorizer usado
        matrix: Matriz documento-término

    Returns:
        Diccionario con top_terms, term_scores, avg_terms_per_doc y
        total_occurrences
    """
    feature_names = vectorizer.get_feature_names_out()

    # Sumar frecuencias por columna (término)
    term_scores = np.asarray(matrix.sum(axis=0)).flatten()

    # Top términos (los 50 más frecuentes)
    top_indices = term_scores.argsort()[-50:][::-1]
    top_terms = [
        {
            'term': feature_names[i],
            'score': float(term_scores[i]),
            'rank': idx + 1
        }
        for idx, i in enumerate(top_indices)
    ]

    # Crear diccionario término -> score (frecuencia) para uso posterior
    term_score_dict = {
        feature_names[i]: float(term_scores[i])
        for i in range(len(feature_names))
    }

    # Promedio de términos únicos por documento
    terms_per_doc = np.asarray((matrix > 0).sum(axis=1)).flatten()
    avg_terms = float(np.mean(terms_per_doc))

    # Total de ocurrencias (suma de todas las frecuencias)
    # Convertir numpy.int64 a int nativo de Python
    total_occurrences = int(np.sum(matrix))

    return {
        'top_terms': top_terms,
        'term_scores': term_score_dict,
        'avg_terms_per_doc': avg_terms,
        'total_occurrences': total_occurrences,
    }

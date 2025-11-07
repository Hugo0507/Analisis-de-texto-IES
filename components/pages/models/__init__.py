"""
Módulo de páginas de modelos avanzados de PLN - Estructura modularizada
Cada modelo ahora está en su propia carpeta
"""

# Importar módulos de modelos
from . import ner_analysis
from . import topic_modeling
from . import ngram_analysis
from . import bertopic
from . import classification
from . import dimensionality_reduction

__all__ = [
    'ner_analysis',
    'topic_modeling',
    'ngram_analysis',
    'bertopic',
    'classification',
    'dimensionality_reduction'
]

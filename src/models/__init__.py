"""
Módulo de modelos avanzados de PLN
"""

# Lazy imports - solo importar cuando se necesiten
# Esto evita cargar dependencias pesadas como spaCy al inicio

__all__ = [
    'NERAnalyzer',
    'FactorIdentifier',
    'ScienceMapper'
]

def __getattr__(name):
    """Lazy loading de módulos"""
    if name == 'NERAnalyzer':
        from .ner_analyzer import NERAnalyzer
        return NERAnalyzer
    elif name == 'FactorIdentifier':
        from .factor_identification import FactorIdentifier
        return FactorIdentifier
    elif name == 'ScienceMapper':
        from .science_mapping import ScienceMapper
        return ScienceMapper
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")

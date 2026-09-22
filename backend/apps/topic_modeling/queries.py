"""
Consultas auxiliares del modelado de temas.
"""

from django.db.models import F, Func, IntegerField, QuerySet, Value
from django.db.models.functions import Coalesce


def con_tamano_de_artefactos(qs: QuerySet) -> QuerySet:
    """
    Anotar el tamaño de los artefactos sin traer su contenido.

    El listado solo necesita saber si el análisis tiene artefactos para poder
    inferir. Leer los campos binarios cargaba el modelo y el vectorizador
    completos (varios MB por análisis), así que la lista tardaba segundos.
    `length()` sobre bytea/BLOB existe tanto en PostgreSQL como en SQLite.
    """
    return qs.defer('model_artifact_bin', 'vectorizer_artifact_bin').annotate(
        tam_modelo_bin=Coalesce(
            Func(F('model_artifact_bin'), function='length', output_field=IntegerField()),
            Value(0),
        ),
        tam_vectorizador_bin=Coalesce(
            Func(F('vectorizer_artifact_bin'), function='length', output_field=IntegerField()),
            Value(0),
        ),
    )

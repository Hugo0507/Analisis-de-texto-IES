"""
Tests del serializador de modelos de temas.

`has_artifact` le dice al frontend si un modelo sirve para inferir sobre
documentos nuevos en el Laboratorio. Miraba solo los ficheros en disco, que en
Hugging Face Spaces desaparecen en cada reinicio, asi que informaba que habia
artefacto cuando la inferencia ya no era posible. Lo que de verdad usa la
inferencia es el respaldo en la base de datos.
"""

import pytest

from apps.topic_modeling.models import TopicModeling
from apps.topic_modeling.serializers import TopicModelingListSerializer


def has_artifact(**campos):
    """Evalua el campo calculado sobre una instancia sin guardar."""
    return TopicModelingListSerializer().get_has_artifact(TopicModeling(**campos))


@pytest.mark.unit
class TestHasArtifact:

    def test_con_respaldo_en_base_de_datos(self):
        """El caso que fallaba: sin fichero, pero con el binario que si se usa."""
        assert has_artifact(
            model_artifact_bin=b'modelo', vectorizer_artifact_bin=b'vectorizador') is True

    def test_sin_artefactos(self):
        assert has_artifact() is False

    def test_con_el_modelo_pero_sin_vectorizador(self):
        """Hacen falta los dos: la inferencia vectoriza antes de proyectar."""
        assert has_artifact(model_artifact_bin=b'modelo') is False

    def test_con_el_vectorizador_pero_sin_modelo(self):
        assert has_artifact(vectorizer_artifact_bin=b'vectorizador') is False

    def test_con_ficheros_en_disco(self):
        """En local, sin respaldo en base de datos, los ficheros siguen valiendo."""
        assert has_artifact(
            model_artifact='artifacts/topic/tm_1_model.pkl',
            vectorizer_artifact='artifacts/topic/tm_1_vectorizer.pkl') is True

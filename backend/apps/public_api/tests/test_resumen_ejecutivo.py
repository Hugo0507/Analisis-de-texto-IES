"""
Tests del resumen ejecutivo del dashboard (endpoint público).

El resumen es el texto que lee el jurado, así que tiene que decir exactamente
lo que muestran los datos: los empates entre categorías, qué factores del marco
OE3 se quedaron sin temas y por qué se ordenan así los términos.

Estos tests también cubren que el endpoint responda: una versión anterior
recorría las claves del diccionario de categorías como si fueran objetos y
devolvía 500 en producción sin que ninguna prueba lo detectara.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.topic_modeling.models import TopicModeling

RUTA = '/api/v1/public/topic-modeling/{}/executive-summary/'


def tema(topic_id, palabras):
    """Tema con la forma que guarda el procesador: palabras con peso decreciente."""
    return {
        'topic_id': topic_id,
        'topic_label': f'Tema {topic_id}',
        'words': [{'word': p, 'weight': 10 - i} for i, p in enumerate(palabras)],
    }


def crear_modelo(**extra):
    usuario = get_user_model().objects.first() or get_user_model().objects.create_user(
        username='prueba', email='prueba@ies.test', password='x')
    campos = {
        'created_by': usuario,
        'name': 'modelo de prueba',
        'source_type': TopicModeling.SOURCE_DATASET,
        'algorithm': 'lda',
        'num_topics': 2,
        'num_words': 5,
        'status': 'completed',
        'documents_processed': 255,
        'coherence_score': 0.55,
        'topics': [
            # Infraestructura tecnológica
            tema(0, ['platform', 'cloud', 'network', 'software', 'digital']),
            # Docencia y formación
            tema(1, ['teaching', 'learning', 'curriculum', 'student', 'digital']),
        ],
    }
    campos.update(extra)
    return TopicModeling.objects.create(**campos)


@pytest.mark.django_db
class TestResumenEjecutivo:

    def setup_method(self):
        self.client = APIClient()

    def test_responde_para_un_modelo_completado(self):
        modelo = crear_modelo()
        r = self.client.get(RUTA.format(modelo.id))
        assert r.status_code == 200
        assert r.data['n_topics'] == 2
        assert r.data['n_docs'] == 255

    def test_nombra_los_factores_sin_temas(self):
        """Lo interesante del OE3 es qué factor no quedó cubierto."""
        modelo = crear_modelo()
        r = self.client.get(RUTA.format(modelo.id))
        sin_cubrir = r.data['uncovered_categories']
        assert len(sin_cubrir) == 6 - r.data['oe3_coverage']
        texto = ' '.join(r.data['summary_paragraphs'])
        assert sin_cubrir[0] in texto

    def test_declara_el_empate_entre_categorias(self):
        """Con un tema por categoría no hay una 'más representada'."""
        modelo = crear_modelo()
        texto = ' '.join(self.client.get(RUTA.format(modelo.id)).data['summary_paragraphs'])
        assert 'Empatan' in texto

    def test_ordena_los_terminos_por_presencia_en_los_temas(self):
        """
        "digital" está en los dos temas, aunque con peso bajo. Antes se sumaban
        los pesos crudos y ganaban los términos del tema más grande.
        """
        modelo = crear_modelo()
        texto = ' '.join(self.client.get(RUTA.format(modelo.id)).data['summary_paragraphs'])
        assert '"digital"' in texto
        assert '(2 temas)' in texto

    def test_incluye_el_corpus_y_la_configuracion(self):
        modelo = crear_modelo(max_features=2000, min_df=2, max_df=0.8)
        texto = ' '.join(self.client.get(RUTA.format(modelo.id)).data['summary_paragraphs'])
        assert '2.000 términos' in texto
        assert 'min_df 2' in texto

    def test_un_modelo_sin_terminar_no_genera_resumen(self):
        modelo = crear_modelo(status='processing')
        assert self.client.get(RUTA.format(modelo.id)).status_code == 404

    def test_compara_la_coherencia_con_los_demas_modelos_del_corpus(self):
        from apps.datasets.models import Dataset

        dataset = Dataset.objects.create(name='corpus', status='completed')
        mejor = crear_modelo(dataset=dataset, coherence_score=0.70, name='mejor')
        peor = crear_modelo(dataset=dataset, coherence_score=0.40, name='peor')
        datos = self.client.get(RUTA.format(peor.id)).data
        assert datos['models_compared'] == 2
        assert datos['coherence_rank'] == 2
        assert self.client.get(RUTA.format(mejor.id)).data['coherence_rank'] == 1

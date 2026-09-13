"""
Tests de los parametros de vectorizacion del modelado de temas.

El tamano del vocabulario, min_df, max_df y los n-gramas estaban fijos en el
codigo (2000, 2, 0.8, 1-2). Ahora son parametros del analisis. Estos tests fijan
que los valores por defecto reproduzcan la configuracion historica -con la que
se entrenaron los modelos publicados- y que los nuevos se respeten.
"""

import pytest
from rest_framework import serializers
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

from apps.topic_modeling.models import TopicModeling
from apps.topic_modeling.processor import vectorize_texts
from apps.topic_modeling.serializers import TopicModelingCreateSerializer

CORPUS = [
    'digital transformation university teaching',
    'digital transformation online learning students',
    'university teaching faculty training digital',
    'online learning platform students engagement',
    'rare singleton term',
]


@pytest.mark.unit
class TestVectorizeTexts:

    def test_los_valores_por_defecto_son_los_historicos(self):
        _, _, vectorizador = vectorize_texts(CORPUS, 'lda')
        assert vectorizador.max_features == 2000
        assert vectorizador.min_df == 2
        assert vectorizador.max_df == 0.8
        assert vectorizador.ngram_range == (1, 2)

    def test_tfidf_para_lsa_y_nmf_conteos_para_lda_y_plsa(self):
        for alg in ('lsa', 'nmf'):
            assert isinstance(vectorize_texts(CORPUS, alg)[2], TfidfVectorizer)
        for alg in ('lda', 'plsa'):
            assert isinstance(vectorize_texts(CORPUS, alg)[2], CountVectorizer)

    def test_respeta_el_tamano_maximo_del_vocabulario(self):
        _, terminos, _ = vectorize_texts(CORPUS, 'lda', max_features=5, min_df=1, max_df=1.0)
        assert len(terminos) == 5

    def test_min_df_descarta_terminos_de_un_solo_documento(self):
        _, terminos, _ = vectorize_texts(CORPUS, 'lda', min_df=2, max_df=1.0, ngram_range=(1, 1))
        assert 'singleton' not in terminos
        assert 'digital' in terminos

    def test_max_df_descarta_terminos_demasiado_comunes(self):
        # "digital" aparece en 3 de 5 documentos (60 %)
        _, terminos, _ = vectorize_texts(CORPUS, 'lda', min_df=1, max_df=0.5, ngram_range=(1, 1))
        assert 'digital' not in terminos

    def test_rango_de_ngramas(self):
        _, solo_palabras, _ = vectorize_texts(CORPUS, 'lda', min_df=1, max_df=1.0, ngram_range=(1, 1))
        _, con_bigramas, _ = vectorize_texts(CORPUS, 'lda', min_df=1, max_df=1.0, ngram_range=(1, 2))
        assert not any(' ' in t for t in solo_palabras)
        assert 'digital transformation' in con_bigramas


@pytest.mark.unit
class TestModeloYValidacion:

    def test_el_modelo_guarda_por_defecto_la_configuracion_historica(self):
        tm = TopicModeling()
        assert (tm.max_features, tm.min_df, tm.max_df, tm.ngram_min, tm.ngram_max) == (2000, 2, 0.8, 1, 2)

    @pytest.mark.parametrize('campo, valor', [
        ('max_features', 50),
        ('max_features', 200000),
        ('min_df', 0),
        ('max_df', 0),
        ('max_df', 1.5),
        ('ngram_max', 4),
    ])
    def test_rechaza_parametros_fuera_de_rango(self, campo, valor):
        datos = {'source_type': 'otro', 'num_topics': 10, 'num_words': 10, campo: valor}
        with pytest.raises(serializers.ValidationError):
            TopicModelingCreateSerializer().validate(datos)

    def test_rechaza_ngram_minimo_mayor_que_maximo(self):
        datos = {'source_type': 'otro', 'num_topics': 10, 'num_words': 10, 'ngram_min': 3, 'ngram_max': 2}
        with pytest.raises(serializers.ValidationError):
            TopicModelingCreateSerializer().validate(datos)

    def test_acepta_la_configuracion_de_la_vectorizacion(self):
        datos = {'source_type': 'otro', 'num_topics': 10, 'num_words': 22,
                 'max_features': 20000, 'min_df': 5, 'max_df': 0.85, 'ngram_min': 1, 'ngram_max': 2}
        assert TopicModelingCreateSerializer().validate(datos) == datos

"""
Tests de las funciones de inferencia del Laboratorio.

Cubren infer_bow, infer_tfidf y get_inference_stopwords, que son las que
ejecutan los workspaces publicos sobre modelos ya entrenados. Son calculo
numpy puro sobre datos leidos de la base, de modo que un error aqui no
levanta ninguna excepcion: devuelve numeros equivocados.
"""

import pytest

from apps.workspace.inference import (
    infer_bow,
    infer_tfidf,
    get_inference_stopwords,
)


@pytest.fixture
def data_prep(db, django_user_model):
    from apps.datasets.models import Dataset
    from apps.data_preparation.models import DataPreparation

    user = django_user_model.objects.create_user(
        username='lab_tester', email='lab@example.com', password='x'
    )
    dataset = Dataset.objects.create(name='Corpus de prueba', created_by=user)
    return DataPreparation.objects.create(
        dataset=dataset,
        created_by=user,
        name='Preparacion de prueba',
        status=DataPreparation.STATUS_COMPLETED,
        # Ambos elegidos por NO pertenecer al conjunto base de stopwords,
        # de modo que su presencia solo puede venir de custom_stopwords.
        custom_stopwords=['estudio', 'zzxxqqterm'],
        predominant_language='es',
    )


@pytest.fixture
def bow(data_prep):
    """BoW cuyo vocabulario mapea tres terminos a los indices 0, 1 y 2."""
    from apps.bag_of_words.models import BagOfWords

    return BagOfWords.objects.create(
        name='BoW de referencia',
        data_preparation=data_prep,
        created_by=data_prep.created_by,
        vocabulary={'digital': 0, 'transformation': 1, 'education': 2},
    )


@pytest.fixture
def tfidf(data_prep):
    from apps.tfidf_analysis.models import TfIdfAnalysis

    return TfIdfAnalysis.objects.create(
        name='TF-IDF de referencia',
        data_preparation=data_prep,
        created_by=data_prep.created_by,
        idf_vector={'idf_values': {'digital': 1.0, 'transformation': 2.0, 'education': 4.0}},
    )


class TestInferBow:
    def test_cuenta_ocurrencias_del_vocabulario(self, bow):
        result = infer_bow(['digital digital transformation'], bow.id)

        assert result['total_term_occurrences'] == 3
        assert result['matrix_shape'] == {'rows': 1, 'cols': 3}
        assert result['vocabulary_size'] == 3

    def test_ignora_tokens_fuera_del_vocabulario(self, bow):
        """Un token desconocido no debe contarse ni alterar la forma de la matriz."""
        result = infer_bow(['digital palabradesconocida otracosa'], bow.id)

        assert result['total_term_occurrences'] == 1
        assert result['matrix_shape']['cols'] == 3

    def test_top_terms_ordenado_por_frecuencia(self, bow):
        result = infer_bow(['education education education digital'], bow.id)
        terms = [t['term'] for t in result['top_terms']]

        assert terms[0] == 'education'
        assert result['top_terms'][0]['score'] == 3.0
        assert result['top_terms'][0]['rank'] == 1

    def test_top_terms_excluye_terminos_ausentes(self, bow):
        """Solo deben aparecer los terminos con score > 0."""
        result = infer_bow(['digital'], bow.id)

        assert [t['term'] for t in result['top_terms']] == ['digital']

    def test_esparsidad_con_un_solo_termino_de_tres(self, bow):
        result = infer_bow(['digital'], bow.id)

        # 1 celda ocupada de 3 => 2/3 de ceros
        assert result['matrix_sparsity'] == pytest.approx(0.6667, abs=1e-4)

    def test_promedio_de_terminos_por_documento(self, bow):
        """Cuenta terminos distintos, no ocurrencias."""
        result = infer_bow(['digital digital', 'digital transformation education'], bow.id)

        assert result['avg_terms_per_document'] == pytest.approx(2.0)

    def test_varios_documentos_producen_una_fila_cada_uno(self, bow):
        result = infer_bow(['digital', 'transformation', 'education'], bow.id)

        assert result['matrix_shape']['rows'] == 3
        assert result['total_term_occurrences'] == 3

    def test_texto_vacio_no_rompe(self, bow):
        result = infer_bow([''], bow.id)

        assert result['total_term_occurrences'] == 0
        assert result['top_terms'] == []

    def test_arrastra_la_referencia_al_modelo(self, bow):
        result = infer_bow(['digital'], bow.id)

        assert result['reference_bow_id'] == bow.id
        assert result['reference_bow_name'] == 'BoW de referencia'

    def test_sin_vocabulario_lanza_valueerror(self, data_prep):
        from apps.bag_of_words.models import BagOfWords

        vacio = BagOfWords.objects.create(
            name='Sin vocabulario',
            data_preparation=data_prep,
            created_by=data_prep.created_by,
            vocabulary={},
        )
        with pytest.raises(ValueError, match='no tiene vocabulario'):
            infer_bow(['digital'], vacio.id)


class TestInferTfidf:
    def test_normalizacion_l2_por_documento(self, tfidf):
        """Cada fila se normaliza a norma 1, como TfidfVectorizer con norm l2."""
        result = infer_tfidf(['digital transformation'], tfidf.id)

        # tf=[1,1,0] * idf=[1,2,4] -> [1,2,0]; norma = sqrt(5)
        # suma normalizada = (1+2)/sqrt(5)
        assert result['avg_tfidf_per_document'] == pytest.approx(3 / (5 ** 0.5), abs=1e-4)

    def test_el_idf_pondera_los_terminos(self, tfidf):
        """Con una ocurrencia de cada termino, gana el de mayor IDF."""
        result = infer_tfidf(['digital transformation education'], tfidf.id)

        assert result['top_terms'][0]['term'] == 'education'

    def test_la_forma_de_la_matriz_no_depende_del_texto(self, tfidf):
        """El vocabulario viene del IDF almacenado, no del documento."""
        result = infer_tfidf(['digital'], tfidf.id)

        assert result['matrix_shape'] == {'rows': 1, 'cols': 3}

    def test_documento_sin_terminos_conocidos_no_divide_por_cero(self, tfidf):
        result = infer_tfidf(['palabradesconocida'], tfidf.id)

        assert result['avg_tfidf_per_document'] == 0.0
        assert result['top_terms'] == []

    def test_arrastra_la_referencia_al_modelo(self, tfidf):
        result = infer_tfidf(['digital'], tfidf.id)

        assert result['reference_tfidf_id'] == tfidf.id
        assert result['reference_tfidf_name'] == 'TF-IDF de referencia'

    def test_sin_idf_values_lanza_valueerror(self, data_prep):
        from apps.tfidf_analysis.models import TfIdfAnalysis

        vacio = TfIdfAnalysis.objects.create(
            name='Sin IDF',
            data_preparation=data_prep,
            created_by=data_prep.created_by,
            idf_vector={},
        )
        with pytest.raises(ValueError, match='no tiene idf_values'):
            infer_tfidf(['digital'], vacio.id)


class TestGetInferenceStopwords:
    def test_incluye_las_stopwords_personalizadas_del_dataset(self, data_prep):
        result = get_inference_stopwords(dataset_id=data_prep.dataset_id)

        assert 'estudio' in result
        assert 'zzxxqqterm' in result

    def test_sin_dataset_no_incluye_las_personalizadas(self, data_prep):
        result = get_inference_stopwords(dataset_id=None, language='es')

        assert 'zzxxqqterm' not in result

    def test_ignora_preparaciones_no_completadas(self, data_prep):
        """Solo debe leer la preparacion en estado completed."""
        from apps.data_preparation.models import DataPreparation

        data_prep.status = DataPreparation.STATUS_PENDING
        data_prep.save(update_fields=['status'])

        result = get_inference_stopwords(dataset_id=data_prep.dataset_id)

        assert 'zzxxqqterm' not in result

    def test_devuelve_un_conjunto_no_vacio(self, data_prep):
        result = get_inference_stopwords(dataset_id=data_prep.dataset_id)

        assert isinstance(result, set)
        assert len(result) > 10

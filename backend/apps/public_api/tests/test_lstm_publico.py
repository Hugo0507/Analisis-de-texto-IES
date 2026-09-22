"""API pública de la clasificación LSTM: solo completados y sin el binario del modelo."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.data_preparation.models import DataPreparation
from apps.datasets.models import Dataset
from apps.lstm_analysis.models import LstmAnalysis
from apps.topic_modeling.models import TopicModeling


@pytest.fixture
def escenario(db):
    usuario = get_user_model().objects.create_user(
        username='pub', email='pub@ies.test', password='x')
    dataset = Dataset.objects.create(
        name='Corpus', source='upload', created_by=usuario, status='completed')
    prep = DataPreparation.objects.create(
        name='Prep limpia', dataset=dataset, created_by=usuario,
        status=DataPreparation.STATUS_COMPLETED, progress_percentage=100)
    tm = TopicModeling.objects.create(
        created_by=usuario, name='LDA limpio',
        source_type=TopicModeling.SOURCE_DATA_PREPARATION, data_preparation=prep,
        algorithm='lda', num_topics=2, num_words=4, status='completed')
    comunes = dict(created_by=usuario, data_preparation=prep, topic_modeling=tm)
    completado = LstmAnalysis.objects.create(
        name='OE3', status='completed', label_mode='oe3', fragment_words=300,
        accuracy=0.6, macro_f1=0.45, baseline_accuracy=0.55, baseline_macro_f1=0.12,
        confusion_matrix=[[3, 1], [1, 2]], class_labels=['A', 'B'],
        loss_history=[1.2, 0.8], model_artifact_bin=b'pesos', **comunes)
    LstmAnalysis.objects.create(name='En curso', status='processing', **comunes)
    return dataset, completado


@pytest.mark.django_db
def test_lista_solo_completados(escenario):
    dataset, completado = escenario
    r = APIClient().get('/api/v1/public/lstm-analysis/')
    assert r.status_code == 200
    ids = [x['id'] for x in r.json()['results']]
    assert ids == [completado.id]
    fila = r.json()['results'][0]
    assert fila['dataset_id'] == dataset.id
    assert fila['topic_modeling_algorithm'] == 'lda'
    assert fila['baseline_macro_f1'] == 0.12


@pytest.mark.django_db
def test_detalle_trae_resultados_sin_el_binario(escenario):
    _, completado = escenario
    r = APIClient().get(f'/api/v1/public/lstm-analysis/{completado.id}/')
    assert r.status_code == 200
    d = r.json()
    assert d['confusion_matrix'] == [[3, 1], [1, 2]]
    assert d['label_mode_display'] == 'Factor OE3 del tema dominante'
    assert d['loss_history'] == [1.2, 0.8]
    assert 'model_artifact_bin' not in d


@pytest.mark.django_db
def test_filtra_por_dataset(escenario):
    r = APIClient().get('/api/v1/public/lstm-analysis/?dataset_id=999999')
    assert r.json()['results'] == []

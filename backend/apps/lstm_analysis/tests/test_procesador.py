"""
Pruebas de extremo a extremo de process_lstm_analysis con base de datos.

No hay PyTorch en local: se parchean train_lstm, predict_proba y
serialize_model. predict_proba devuelve probabilidades controladas para
poder comprobar las métricas exactas que se guardan.

Cada documento usa palabras únicas ("d03t7" = documento 3, palabra 7), así
que el primer token de cualquier ejemplo dice de qué documento viene.
"""

from unittest.mock import patch

import numpy as np
import pytest
from django.contrib.auth import get_user_model

from apps.data_preparation.models import DataPreparation
from apps.datasets.models import Dataset, DatasetFile
from apps.lstm_analysis import processor
from apps.lstm_analysis.models import LstmAnalysis
from apps.topic_modeling.models import TopicModeling

PROC = 'apps.lstm_analysis.processor'

# 8 documentos del tema 0 y 4 del tema 1. Con train_split=0.75 la partición
# estratificada deja 2 + 1 documentos de prueba y 6 + 3 de entrenamiento.
ETIQUETAS = [0] * 8 + [1] * 4
PALABRAS_POR_DOC = 40


def texto_doc(i, n=PALABRAS_POR_DOC):
    return ' '.join(f'd{i:02d}t{j}' for j in range(n))


def doc_de(texto):
    """Índice del documento de origen de un ejemplo (por su primer token)."""
    return int(texto.split()[0][1:3])


def tema(topic_id, etiqueta, palabras):
    return {
        'topic_id': topic_id,
        'topic_label': etiqueta,
        'words': [{'word': p, 'weight': 10 - k} for k, p in enumerate(palabras)],
    }


TEMAS = [
    tema(0, 'Plataformas y nube', ['platform', 'cloud', 'network', 'server']),
    tema(1, 'Enseñanza', ['teaching', 'faculty', 'pedagogy', 'instructor']),
]


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def usuario(db):
    return get_user_model().objects.create_user(
        username='lstm', email='lstm@ies.test', password='x')


@pytest.fixture
def crear_lstm(usuario):
    """Fábrica del escenario completo: archivos, preparación, temas y LSTM."""

    def _crear(etiquetas=ETIQUETAS, temas=TEMAS, palabras=PALABRAS_POR_DOC,
               duplicar_ids=False, **campos_lstm):
        dataset = Dataset.objects.create(
            name='Corpus', source='upload', created_by=usuario, status='completed')
        archivos = [
            DatasetFile.objects.create(
                dataset=dataset,
                filename=f'doc{i}.pdf', original_filename=f'doc{i}.pdf',
                file_path=f'/tmp/doc{i}.pdf', file_size_bytes=1024,
                preprocessed_text=texto_doc(i, palabras),
            )
            for i in range(len(etiquetas))
        ]
        ids = [a.id for a in archivos]
        prep = DataPreparation.objects.create(
            name='Preparación', dataset=dataset, created_by=usuario,
            status=DataPreparation.STATUS_COMPLETED, progress_percentage=100,
            processed_file_ids=ids + ids if duplicar_ids else ids,
        )
        tm = TopicModeling.objects.create(
            created_by=usuario, name='Temas',
            source_type=TopicModeling.SOURCE_DATA_PREPARATION, data_preparation=prep,
            algorithm='lda', num_topics=len(temas), num_words=4, status='completed',
            topics=temas,
            document_topics=[
                {'document_id': a.id, 'dominant_topic': t, 'dominant_topic_weight': 0.9}
                for a, t in zip(archivos, etiquetas)
            ],
        )
        valores = {'train_split': 0.75, 'fragment_words': 0}
        valores.update(campos_lstm)
        return LstmAnalysis.objects.create(
            name='LSTM', created_by=usuario, data_preparation=prep,
            topic_modeling=tm, **valores)

    return _crear


class Ejecucion:
    """
    Ejecuta el pipeline con torch parcheado y guarda lo que vio cada etapa.

    `regla(doc, k)` da las probabilidades del fragmento k del documento doc.
    Por defecto, acierta siempre con seguridad total.
    """

    def __init__(self, regla=None):
        self.regla = regla or (lambda doc, k: np.eye(2)[ETIQUETAS[doc]])
        self.textos_vocab = None
        self.codificados = []
        self.train_args = None

    def _vocab(self, textos, maximo):
        self.textos_vocab = list(textos)
        return self._vocab_real(textos, maximo)

    def _encode(self, textos, word2idx, largo):
        self.codificados.append(list(textos))
        return self._encode_real(textos, word2idx, largo)

    def _train(self, lstm, X, y, vocab_size, n_classes, pesos):
        self.train_args = {'X': X, 'y': list(y), 'n_classes': n_classes, 'pesos': pesos}
        return object(), [1.0, 0.5]

    def _predict(self, model, X, batch_size):
        textos_test = self.codificados[1]
        assert len(textos_test) == len(X)
        vistos = {}
        filas = []
        for texto in textos_test:
            d = doc_de(texto)
            k = vistos.get(d, 0)
            vistos[d] = k + 1
            filas.append(self.regla(d, k))
        return np.array(filas, dtype=float)

    @property
    def textos_train(self):
        return self.codificados[0]

    @property
    def textos_test(self):
        return self.codificados[1]

    def correr(self, lstm):
        self._vocab_real = processor.build_vocabulary
        self._encode_real = processor.encode_texts
        with patch(f'{PROC}.build_vocabulary', side_effect=self._vocab), \
                patch(f'{PROC}.encode_texts', side_effect=self._encode), \
                patch(f'{PROC}.train_lstm', side_effect=self._train), \
                patch(f'{PROC}.predict_proba', side_effect=self._predict), \
                patch(f'{PROC}.serialize_model', return_value=b'pesos'):
            processor.process_lstm_analysis(lstm.id)
        lstm.refresh_from_db()
        return lstm


def docs_test(ejecucion):
    return sorted({doc_de(t) for t in ejecucion.textos_test})


# ── Pruebas ─────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestParticionSinFuga:

    @pytest.mark.parametrize('fragment_words', [0, 10])
    def test_ningun_documento_aporta_a_entrenamiento_y_prueba(self, crear_lstm, fragment_words):
        lstm = crear_lstm(fragment_words=fragment_words)
        ej = Ejecucion()
        lstm = ej.correr(lstm)

        assert lstm.status == LstmAnalysis.STATUS_COMPLETED, lstm.error_message
        origen_train = {doc_de(t) for t in ej.textos_train}
        origen_test = {doc_de(t) for t in ej.textos_test}
        assert origen_train and origen_test
        assert origen_train.isdisjoint(origen_test)
        assert origen_train | origen_test == set(range(len(ETIQUETAS)))

    def test_el_vocabulario_solo_ve_entrenamiento(self, crear_lstm):
        lstm = crear_lstm(fragment_words=10)
        ej = Ejecucion()
        ej.correr(lstm)

        assert ej.textos_vocab == ej.textos_train
        origen_vocab = {doc_de(t) for t in ej.textos_vocab}
        assert origen_vocab.isdisjoint(docs_test(ej))

    def test_ids_repetidos_en_la_preparacion_no_duplican_documentos(self, crear_lstm):
        """Un id repetido podía acabar una vez en entrenamiento y otra en prueba."""
        lstm = crear_lstm(duplicar_ids=True)
        ej = Ejecucion()
        lstm = ej.correr(lstm)

        assert lstm.status == LstmAnalysis.STATUS_COMPLETED, lstm.error_message
        assert lstm.documents_used == len(ETIQUETAS)
        assert {doc_de(t) for t in ej.textos_train}.isdisjoint(docs_test(ej))

    def test_las_etiquetas_de_entrenamiento_son_las_del_documento(self, crear_lstm):
        lstm = crear_lstm(fragment_words=10)
        ej = Ejecucion()
        ej.correr(lstm)

        esperadas = [ETIQUETAS[doc_de(t)] for t in ej.textos_train]
        assert ej.train_args['y'] == esperadas
        assert ej.train_args['n_classes'] == 2
        # Pesos inversos a la frecuencia: 6 docs de clase 0 y 3 de clase 1
        # (cuatro fragmentos cada uno), la minoritaria pesa el doble.
        assert ej.train_args['pesos'][1] == pytest.approx(2 * ej.train_args['pesos'][0])


@pytest.mark.django_db
class TestFragmentos:

    def test_con_fragmentos_hay_mas_ejemplos_que_documentos(self, crear_lstm):
        lstm = Ejecucion().correr(crear_lstm(fragment_words=10))

        assert lstm.documents_used == 12
        assert lstm.samples_used == 12 * 4  # 40 palabras / 10
        assert lstm.samples_used > lstm.documents_used
        assert lstm.fragment_accuracy is not None
        assert lstm.fragment_macro_f1 is not None

    def test_sin_fragmentos_un_ejemplo_por_documento_y_metricas_de_fragmento_nulas(
            self, crear_lstm):
        lstm = Ejecucion().correr(crear_lstm(fragment_words=0))

        assert lstm.samples_used == lstm.documents_used == 12
        assert lstm.fragment_accuracy is None
        assert lstm.fragment_macro_f1 is None

    def test_documentos_mas_cortos_que_el_fragmento_son_un_solo_ejemplo(self, crear_lstm):
        lstm = Ejecucion().correr(crear_lstm(fragment_words=100, palabras=40))

        assert lstm.status == LstmAnalysis.STATUS_COMPLETED, lstm.error_message
        assert lstm.samples_used == 12

    def test_la_secuencia_se_acorta_al_tamano_del_fragmento(self, crear_lstm):
        ej = Ejecucion()
        ej.correr(crear_lstm(fragment_words=10, max_seq_length=500))
        assert ej.train_args['X'].shape == (9 * 4, 15)


@pytest.mark.django_db
class TestMetricas:

    def test_metricas_por_documento_y_linea_base_exactas(self, crear_lstm):
        """
        Prueba: 2 docs de clase 0 y 1 de clase 1. El primer doc de clase 0 se
        predice como clase 1; el resto se acierta.
          y_true = [0, 0, 1], y_pred = [1, 0, 1]
          exactitud 2/3; F1 clase 0 = 2/3, clase 1 = 2/3 -> macro 0.6667
        Línea base (mayoritaria de entrenamiento = clase 0): y_pred = [0, 0, 0]
          exactitud 2/3; F1 clase 0 = 0.8, clase 1 = 0 -> macro 0.4
        """
        lstm = crear_lstm(fragment_words=0)
        estado = {}

        def regla(doc, k):
            if ETIQUETAS[doc] == 0 and 'fallado' not in estado:
                estado['fallado'] = doc
                return np.array([0.2, 0.8])
            return np.eye(2)[ETIQUETAS[doc]]

        ej = Ejecucion(regla)
        lstm = ej.correr(lstm)

        assert [ETIQUETAS[d] for d in docs_test(ej)] == [0, 0, 1]
        assert lstm.accuracy == pytest.approx(0.6667)
        assert lstm.macro_f1 == pytest.approx(0.6667)
        assert lstm.baseline_accuracy == pytest.approx(0.6667)
        assert lstm.baseline_macro_f1 == pytest.approx(0.4)
        assert lstm.confusion_matrix == [[1, 1], [0, 1]]
        assert lstm.classification_report['Enseñanza']['support'] == 1

    def test_la_prediccion_por_documento_promedia_sus_fragmentos(self, crear_lstm):
        """
        Cada documento de prueba tiene 4 fragmentos: el primero se equivoca con
        0.9 y los otros tres aciertan con 0.8. Promedio de la clase correcta
        (0.1 + 3*0.8)/4 = 0.625 > 0.375: todos los documentos se aciertan.
        Por fragmento: 9 de 12 aciertos. Clase 0: tp 6, fp 1, fn 2 -> F1 0.8;
        clase 1: tp 3, fp 2, fn 1 -> F1 0.6667; macro 0.7333.
        """
        lstm = crear_lstm(fragment_words=10)

        def regla(doc, k):
            real = ETIQUETAS[doc]
            p_real = 0.1 if k == 0 else 0.8
            fila = np.zeros(2)
            fila[real] = p_real
            fila[1 - real] = 1 - p_real
            return fila

        lstm = Ejecucion(regla).correr(lstm)

        assert lstm.accuracy == 1.0
        assert lstm.macro_f1 == 1.0
        assert lstm.fragment_accuracy == pytest.approx(0.75)
        assert lstm.fragment_macro_f1 == pytest.approx(0.7333)
        # La matriz guardada es la de documentos, no la de fragmentos
        assert lstm.confusion_matrix == [[2, 0], [0, 1]]

    def test_linea_base_usa_la_mayoritaria_de_entrenamiento(self, crear_lstm):
        """
        Con 4 docs de clase 0 y 8 de clase 1 la mayoritaria es la 1; la línea
        base acierta los 2 docs de prueba de clase 1 y falla el de clase 0.
        """
        etiquetas = [0] * 4 + [1] * 8
        lstm = crear_lstm(etiquetas=etiquetas)

        def regla(doc, k):
            return np.eye(2)[etiquetas[doc]]

        lstm = Ejecucion(regla).correr(lstm)

        assert lstm.accuracy == 1.0
        assert lstm.baseline_accuracy == pytest.approx(0.6667)
        assert lstm.baseline_macro_f1 == pytest.approx(0.4)


@pytest.mark.django_db
class TestEtiquetas:

    def test_modo_tema_usa_los_nombres_de_los_temas(self, crear_lstm):
        lstm = Ejecucion().correr(crear_lstm(label_mode=LstmAnalysis.LABELS_TOPIC))
        assert lstm.class_labels == ['Plataformas y nube', 'Enseñanza']

    def test_modo_oe3_usa_nombres_de_factores(self, crear_lstm):
        lstm = Ejecucion().correr(crear_lstm(label_mode=LstmAnalysis.LABELS_OE3))

        assert lstm.status == LstmAnalysis.STATUS_COMPLETED, lstm.error_message
        assert lstm.class_labels == ['Infraestructura Tecnológica', 'Docencia y Formación']
        assert not set(lstm.class_labels) & {t['topic_label'] for t in TEMAS}
        assert set(lstm.classification_report) == set(lstm.class_labels)

    def test_modo_oe3_agrupa_temas_del_mismo_factor(self, crear_lstm):
        """Dos temas de infraestructura son una sola clase."""
        temas = TEMAS + [tema(2, 'Datos', ['cloud', 'database', 'server'])]
        etiquetas = [0] * 4 + [2] * 4 + [1] * 4

        def regla(doc, k):
            return np.eye(2)[0 if etiquetas[doc] in (0, 2) else 1]

        lstm = Ejecucion(regla).correr(crear_lstm(
            etiquetas=etiquetas, temas=temas, label_mode=LstmAnalysis.LABELS_OE3))

        assert lstm.status == LstmAnalysis.STATUS_COMPLETED, lstm.error_message
        assert lstm.num_classes == 2
        assert lstm.class_labels == ['Infraestructura Tecnológica', 'Docencia y Formación']

    def test_una_sola_clase_termina_en_error(self, crear_lstm):
        """En 'oe3', si todos los temas caen en el mismo factor no hay qué clasificar."""
        temas = [tema(0, 'A', ['cloud', 'server']), tema(1, 'B', ['network', 'platform'])]
        lstm = Ejecucion().correr(crear_lstm(temas=temas, label_mode=LstmAnalysis.LABELS_OE3))

        assert lstm.status == LstmAnalysis.STATUS_ERROR
        assert '2 clases' in lstm.error_message


@pytest.mark.django_db
class TestEstados:

    def test_termina_completado_con_progreso_100(self, crear_lstm):
        lstm = Ejecucion().correr(crear_lstm())

        assert lstm.status == LstmAnalysis.STATUS_COMPLETED
        assert lstm.current_stage == LstmAnalysis.STAGE_COMPLETED
        assert lstm.progress_percentage == 100
        assert lstm.error_message is None
        assert lstm.processing_started_at is not None
        assert lstm.processing_completed_at is not None
        assert lstm.num_classes == 2
        assert lstm.loss_history == [1.0, 0.5]
        assert bytes(lstm.model_artifact_bin) == b'pesos'
        assert lstm.vocab_size_actual > 2

    def test_menos_de_10_documentos_termina_en_error(self, crear_lstm):
        lstm = Ejecucion().correr(crear_lstm(etiquetas=[0] * 5 + [1] * 4))

        assert lstm.status == LstmAnalysis.STATUS_ERROR
        assert '10 documentos' in lstm.error_message
        assert '9' in lstm.error_message
        assert lstm.accuracy is None

    def test_sin_documentos_etiquetados_termina_en_error(self, crear_lstm):
        lstm = crear_lstm()
        lstm.topic_modeling.document_topics = []
        lstm.topic_modeling.save()

        lstm = Ejecucion().correr(lstm)

        assert lstm.status == LstmAnalysis.STATUS_ERROR
        assert 'etiqueta' in lstm.error_message

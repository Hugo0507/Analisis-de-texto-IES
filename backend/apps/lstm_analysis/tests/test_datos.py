"""
Tests de la preparación de ejemplos y las métricas de la LSTM.

La primera versión reportó 80 % de exactitud cuando 212 de 254 documentos
estaban en una sola clase: un modelo que siempre respondiera esa clase habría
acertado el 83 %. Estos tests fijan lo que hace que el número sea honesto.
"""

import numpy as np
import pytest

from apps.lstm_analysis.datos import (
    dividir_por_documento,
    etiquetas_oe3,
    fragmentar,
    linea_base,
    metricas,
    pesos_por_clase,
    prediccion_por_documento,
)


@pytest.mark.unit
class TestFragmentar:

    def test_parte_en_bloques_del_tamano_pedido(self):
        texto = ' '.join(f'p{i}' for i in range(900))
        fragmentos = fragmentar(texto, 300)
        assert len(fragmentos) == 3
        assert all(len(f.split()) == 300 for f in fragmentos)

    def test_el_resto_corto_se_une_al_anterior(self):
        texto = ' '.join(f'p{i}' for i in range(650))
        fragmentos = fragmentar(texto, 300)
        assert [len(f.split()) for f in fragmentos] == [300, 350]

    def test_un_resto_de_al_menos_la_mitad_es_su_propio_fragmento(self):
        texto = ' '.join(f'p{i}' for i in range(750))
        assert [len(f.split()) for f in fragmentar(texto, 300)] == [300, 300, 150]

    def test_sin_fragmentar_el_documento_es_un_ejemplo(self):
        assert fragmentar('uno dos tres', 0) == ['uno dos tres']

    def test_texto_vacio(self):
        assert fragmentar('', 300) == []


@pytest.mark.unit
class TestDividirPorDocumento:

    def test_ningun_documento_queda_en_ambos_conjuntos(self):
        etiquetas = [0] * 30 + [1] * 20 + [2] * 10
        train, test = dividir_por_documento(etiquetas, 0.8)
        assert not set(train) & set(test)
        assert sorted(train + test) == list(range(60))

    def test_cada_clase_con_dos_documentos_tiene_uno_de_prueba(self):
        etiquetas = [0] * 40 + [1] * 2 + [2] * 3
        _, test = dividir_por_documento(etiquetas, 0.8)
        clases_en_prueba = {etiquetas[i] for i in test}
        assert clases_en_prueba == {0, 1, 2}

    def test_una_clase_con_un_documento_se_queda_en_entrenamiento(self):
        etiquetas = [0] * 10 + [1]
        train, test = dividir_por_documento(etiquetas, 0.8)
        assert 10 in train and 10 not in test

    def test_es_reproducible(self):
        etiquetas = [0, 1] * 25
        assert dividir_por_documento(etiquetas, 0.8) == dividir_por_documento(etiquetas, 0.8)


@pytest.mark.unit
class TestMetricas:

    def test_linea_base_de_la_clase_mayoritaria(self):
        """El caso real: casi todo en una clase da exactitud alta sin aprender nada."""
        nombres = ['a', 'b']
        base = linea_base([0] * 90 + [1] * 10, [0] * 9 + [1], nombres)
        assert base['accuracy'] == pytest.approx(0.9)
        # F1 macro: la clase 'a' tiene F1 ~0,95 y la 'b' 0 → ~0,47
        assert base['macro_f1'] < 0.5

    def test_prediccion_perfecta(self):
        m = metricas([0, 1, 2], [0, 1, 2], ['a', 'b', 'c'])
        assert m['accuracy'] == 1.0
        assert m['macro_f1'] == 1.0
        assert m['matriz'] == [[1, 0, 0], [0, 1, 0], [0, 0, 1]]

    def test_el_macro_f1_ignora_clases_sin_ejemplos_de_prueba(self):
        m = metricas([0, 0, 1], [0, 0, 1], ['a', 'b', 'c'])
        assert m['macro_f1'] == 1.0

    def test_pesos_inversos_a_la_frecuencia(self):
        pesos = pesos_por_clase([0, 0, 0, 1], 3)
        assert pesos[1] == pytest.approx(3 * pesos[0])
        assert pesos[2] == 0.0


@pytest.mark.unit
class TestPrediccionPorDocumento:

    def test_promedia_los_fragmentos_de_cada_documento(self):
        probabilidades = np.array([
            [0.9, 0.1],  # documento 0
            [0.2, 0.8],  # documento 0
            [0.3, 0.7],  # documento 0 → promedio favorece la clase 1
            [0.6, 0.4],  # documento 5
        ])
        assert prediccion_por_documento(probabilidades, [0, 0, 0, 5]) == {0: 1, 5: 0}


@pytest.mark.unit
class TestEtiquetasOe3:

    def test_usa_el_clasificador_del_sistema(self):
        temas = [
            {'topic_id': 0, 'words': [{'word': w, 'weight': 1} for w in
                                      ['platform', 'cloud', 'network', 'software']]},
            {'topic_id': 1, 'words': [{'word': w, 'weight': 1} for w in
                                      ['teaching', 'curriculum', 'pedagogy', 'teachers']]},
        ]
        etiquetas = etiquetas_oe3(temas)
        assert etiquetas[0][0] == 'infraestructura'
        assert etiquetas[1][0] == 'docencia'

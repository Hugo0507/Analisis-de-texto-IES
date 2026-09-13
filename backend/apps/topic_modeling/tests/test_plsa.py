"""
Tests del modelo PLSA.

El motivo de estos tests es concreto: durante meses el sistema ofrecio PLSA
como modelo propio, pero entrenaba un LDA identico -mismos temas palabra por
palabra, misma coherencia- porque pasaba los priors a None creyendo que eso
los desactivaba. Aqui se fija que PLSA sea PLSA, que sirva para inferir sobre
documentos nuevos y que sobreviva a joblib, que es de lo que depende el
Laboratorio.
"""

import io

import joblib
import numpy as np
import pytest
from scipy import sparse
from sklearn.decomposition import LatentDirichletAllocation
from sklearn.feature_extraction.text import CountVectorizer

from apps.topic_modeling.plsa import PLSA


# Dos grupos de documentos con vocabularios que no se solapan: cualquier
# modelo de temas razonable debe separarlos.
CORPUS = [
    'universidad docencia profesor aula clase docencia profesor',
    'docencia profesor aula universidad clase profesor aula',
    'profesor aula docencia clase universidad docencia',
    'servidor red nube datos servidor infraestructura red',
    'nube datos servidor red infraestructura datos servidor',
    'infraestructura red nube servidor datos nube',
]


@pytest.fixture
def matriz():
    vectorizador = CountVectorizer()
    X = vectorizador.fit_transform(CORPUS)
    return X, vectorizador.get_feature_names_out()


@pytest.mark.unit
class TestPLSA:

    def test_dimensiones_y_distribuciones(self, matriz):
        """components_ es (k x V) y tanto los temas como P(z|d) son distribuciones."""
        X, vocabulario = matriz
        modelo = PLSA(n_components=2, max_iter=60, random_state=0)
        p_z_d = modelo.fit_transform(X)

        assert modelo.components_.shape == (2, len(vocabulario))
        assert p_z_d.shape == (len(CORPUS), 2)
        assert np.allclose(modelo.components_.sum(axis=1), 1.0)
        assert np.allclose(p_z_d.sum(axis=1), 1.0)
        assert (modelo.components_ >= 0).all() and (p_z_d >= 0).all()

    def test_separa_los_dos_grupos(self, matriz):
        """Los tres primeros documentos y los tres ultimos caen en temas distintos."""
        X, _ = matriz
        modelo = PLSA(n_components=2, max_iter=120, random_state=0)
        p_z_d = modelo.fit_transform(X)
        dominante = p_z_d.argmax(axis=1)

        assert len(set(dominante[:3])) == 1
        assert len(set(dominante[3:])) == 1
        assert dominante[0] != dominante[3]

    def test_no_es_lda(self, matriz):
        """
        La regresion que motiva este modulo.

        Con los mismos datos y la misma semilla, PLSA y LDA no pueden producir
        la misma matriz tema-termino: son modelos distintos.
        """
        X, _ = matriz
        plsa = PLSA(n_components=2, max_iter=60, random_state=42).fit(X)
        lda = LatentDirichletAllocation(
            n_components=2, max_iter=60, random_state=42, learning_method='batch',
        ).fit(X)

        normalizar = lambda M: M / M.sum(axis=1, keepdims=True)  # noqa: E731
        assert not np.allclose(plsa.components_, normalizar(lda.components_), atol=1e-6)

    def test_transform_proyecta_documento_nuevo(self, matriz):
        """Un documento nuevo se asigna al tema de su vocabulario."""
        X, _ = matriz
        vectorizador = CountVectorizer(vocabulary=None)
        vectorizador.fit(CORPUS)
        modelo = PLSA(n_components=2, max_iter=120, random_state=0)
        p_z_d = modelo.fit_transform(vectorizador.transform(CORPUS))

        tema_docencia = int(p_z_d[0].argmax())
        nuevo = vectorizador.transform(['profesor aula docencia universidad'])
        proyeccion = modelo.transform(nuevo)

        assert proyeccion.shape == (1, 2)
        assert np.allclose(proyeccion.sum(axis=1), 1.0)
        assert int(proyeccion[0].argmax()) == tema_docencia

    def test_transform_no_altera_los_temas(self, matriz):
        """El folding-in no reestima P(w|z): el modelo entrenado no cambia."""
        X, _ = matriz
        modelo = PLSA(n_components=2, max_iter=60, random_state=0).fit(X)
        antes = modelo.components_.copy()

        modelo.transform(X[:2])

        assert np.allclose(modelo.components_, antes)

    def test_sobrevive_a_joblib(self, matriz):
        """
        El Laboratorio carga el modelo desde un BinaryField con joblib: si no
        se puede serializar y recuperar, la inferencia de temas no funciona.
        """
        X, _ = matriz
        modelo = PLSA(n_components=2, max_iter=60, random_state=0).fit(X)
        esperado = modelo.transform(X)

        buffer = io.BytesIO()
        joblib.dump(modelo, buffer)
        buffer.seek(0)
        recuperado = joblib.load(buffer)

        assert np.allclose(recuperado.components_, modelo.components_)
        assert np.allclose(recuperado.transform(X), esperado)

    def test_es_reproducible(self, matriz):
        """La misma semilla da el mismo modelo."""
        X, _ = matriz
        a = PLSA(n_components=2, max_iter=60, random_state=7).fit_transform(X)
        b = PLSA(n_components=2, max_iter=60, random_state=7).fit_transform(X)
        assert np.allclose(a, b)

    def test_acepta_matriz_densa(self, matriz):
        """Tambien funciona si le entregan un array de numpy en vez de una dispersa."""
        X, _ = matriz
        densa = np.asarray(X.todense())
        modelo = PLSA(n_components=2, max_iter=40, random_state=0)
        assert modelo.fit_transform(densa).shape == (len(CORPUS), 2)

    def test_la_verosimilitud_no_empeora(self, matriz):
        """EM es monotono: mas iteraciones no reducen la log-verosimilitud."""
        X, _ = matriz
        corta = PLSA(n_components=2, max_iter=3, random_state=1, tol=0).fit(X)
        larga = PLSA(n_components=2, max_iter=40, random_state=1, tol=0).fit(X)
        assert larga.loglikelihood_ >= corta.loglikelihood_ - 1e-9

    def test_error_si_no_esta_entrenado(self, matriz):
        X, _ = matriz
        with pytest.raises(ValueError, match='no esta entrenado'):
            PLSA(n_components=2).transform(X)

    def test_error_si_el_vocabulario_no_coincide(self, matriz):
        X, _ = matriz
        modelo = PLSA(n_components=2, max_iter=20, random_state=0).fit(X)
        with pytest.raises(ValueError, match='terminos'):
            modelo.transform(sparse.csr_matrix(np.ones((1, X.shape[1] + 3))))

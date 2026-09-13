"""
PLSA (Probabilistic Latent Semantic Analysis) de Hofmann, con algoritmo EM.

Por que existe este modulo
--------------------------
El proyecto ofrecia PLSA como uno de sus modelos de temas, pero lo entrenaba
con `LatentDirichletAllocation(doc_topic_prior=None, topic_word_prior=None)`.
En scikit-learn `None` no significa "sin prior": significa "usa el valor por
defecto" (1/n_components). El resultado era que PLSA y LDA entrenaban
exactamente el mismo modelo, y de ahi que ambos devolvieran los mismos temas,
palabra por palabra, y la misma coherencia (0,5627).

La diferencia real entre ambos es justamente esa: LDA es el modelo bayesiano
que pone priores de Dirichlet sobre P(z|d) y P(w|z); PLSA, anterior, estima
esas distribuciones por maxima verosimilitud, sin priores. Este modulo
implementa PLSA de verdad, por maxima verosimilitud con EM.

El modelo
---------
Cada documento d es una mezcla de temas y cada tema una distribucion sobre
terminos. La probabilidad de observar el termino w en el documento d es:

    P(w|d) = sum_z P(w|z) P(z|d)

EM alterna dos pasos hasta converger:

  Paso E: responsabilidad de cada tema en cada par (d, w) observado
      P(z|d,w) = P(w|z) P(z|d) / sum_z' P(w|z') P(z'|d)

  Paso M: reestimar las distribuciones ponderando por la frecuencia n(d,w)
      P(w|z) ∝ sum_d n(d,w) P(z|d,w)
      P(z|d) ∝ sum_w n(d,w) P(z|d,w)

La interfaz imita la de scikit-learn (`fit`, `fit_transform`, `transform` y
`components_`) porque el resto del sistema -la extraccion de temas y la
inferencia del Laboratorio- consume los modelos a traves de ella, y porque el
objeto se serializa con joblib igual que los demas.
"""

import numpy as np
from scipy import sparse

EPS = 1e-12

# Nonzeros procesados por bloque en el paso E. Acota la memoria: el bloque
# intermedio es (tamano_bloque x n_components) numeros en coma flotante.
TAMANO_BLOQUE = 500_000


class PLSA:
    """
    PLSA entrenado por maxima verosimilitud con EM.

    Args:
        n_components: numero de temas (k).
        max_iter: maximo de iteraciones de EM.
        random_state: semilla para la inicializacion aleatoria.
        tol: corte por convergencia sobre la mejora relativa de la
            log-verosimilitud entre iteraciones.

    Atributos tras el entrenamiento:
        components_: matriz (k x V) con P(w|z). Cada fila suma 1.
        n_iter_: iteraciones realmente ejecutadas.
        loglikelihood_: log-verosimilitud final.
    """

    def __init__(self, n_components=10, max_iter=100, random_state=42, tol=1e-4):
        self.n_components = int(n_components)
        self.max_iter = int(max_iter)
        self.random_state = random_state
        self.tol = float(tol)

    # ── utilidades internas ──────────────────────────────────────────────

    @staticmethod
    def _a_coo(X):
        """Matriz documento-termino como COO de tipo flotante."""
        if not sparse.issparse(X):
            X = sparse.csr_matrix(X)
        return X.tocoo().astype(np.float64)

    @staticmethod
    def _normalizar_filas(M):
        """Normaliza cada fila para que sume 1, sin dividir por cero."""
        sumas = M.sum(axis=1, keepdims=True)
        sumas[sumas < EPS] = 1.0
        return M / sumas

    def _esperanza_maximizacion(self, filas, columnas, valores, n_docs, n_terminos,
                                p_z_d, actualizar_componentes):
        """
        Una iteracion de EM.

        Recorre los no-ceros por bloques acumulando los conteos esperados. Si
        `actualizar_componentes` es False solo se reestima P(z|d), que es lo que
        hace `transform` con documentos nuevos: los temas se mantienen fijos.

        Returns:
            (p_z_d nuevo, componentes nuevas o None, log-verosimilitud)
        """
        k = self.n_components
        acum_z_d = np.zeros((n_docs, k))
        acum_w_z = np.zeros((k, n_terminos)) if actualizar_componentes else None
        loglik = 0.0
        componentes_t = self.components_.T  # (V x k), para indexar por termino

        for inicio in range(0, len(valores), TAMANO_BLOQUE):
            fin = inicio + TAMANO_BLOQUE
            f = filas[inicio:fin]
            c = columnas[inicio:fin]
            v = valores[inicio:fin]

            # Paso E
            conjunta = p_z_d[f] * componentes_t[c]          # (bloque x k)
            marginal = conjunta.sum(axis=1) + EPS           # P(w|d)
            posterior = conjunta / marginal[:, None]        # P(z|d,w)

            loglik += float(np.dot(v, np.log(marginal)))

            # Paso M: conteos esperados n(d,w) * P(z|d,w)
            ponderado = posterior * v[:, None]
            for z in range(k):
                acum_z_d[:, z] += np.bincount(f, weights=ponderado[:, z], minlength=n_docs)
                if actualizar_componentes:
                    acum_w_z[z] += np.bincount(c, weights=ponderado[:, z], minlength=n_terminos)

        nuevo_p_z_d = self._normalizar_filas(acum_z_d)
        nuevas_componentes = self._normalizar_filas(acum_w_z) if actualizar_componentes else None
        return nuevo_p_z_d, nuevas_componentes, loglik

    def _ejecutar_em(self, X, actualizar_componentes):
        """Bucle de EM con corte por convergencia."""
        coo = self._a_coo(X)
        filas = coo.row.astype(np.intp)
        columnas = coo.col.astype(np.intp)
        valores = coo.data
        n_docs, n_terminos = coo.shape

        rng = np.random.default_rng(self.random_state)
        p_z_d = self._normalizar_filas(rng.random((n_docs, self.n_components)) + EPS)

        loglik_previa = -np.inf
        iteraciones = 0
        for iteraciones in range(1, self.max_iter + 1):
            p_z_d, componentes, loglik = self._esperanza_maximizacion(
                filas, columnas, valores, n_docs, n_terminos, p_z_d, actualizar_componentes,
            )
            if componentes is not None:
                self.components_ = componentes

            mejora = abs(loglik - loglik_previa) / (abs(loglik_previa) + EPS)
            loglik_previa = loglik
            if mejora < self.tol:
                break

        self.n_iter_ = iteraciones
        self.loglikelihood_ = loglik_previa
        return p_z_d

    # ── interfaz publica ─────────────────────────────────────────────────

    def fit_transform(self, X, y=None):
        """
        Entrena el modelo y devuelve P(z|d) del corpus: matriz (n_docs x k).
        """
        coo = self._a_coo(X)
        rng = np.random.default_rng(self.random_state)
        self.components_ = self._normalizar_filas(
            rng.random((self.n_components, coo.shape[1])) + EPS
        )
        return self._ejecutar_em(coo, actualizar_componentes=True)

    def fit(self, X, y=None):
        self.fit_transform(X)
        return self

    def transform(self, X):
        """
        Proyecta documentos nuevos sobre los temas ya aprendidos (folding-in).

        Mantiene P(w|z) fijo y estima solo P(z|d) para los documentos que
        llegan, que es lo que necesita la inferencia del Laboratorio.
        """
        if not hasattr(self, 'components_'):
            raise ValueError('El modelo PLSA no esta entrenado: llama antes a fit().')
        X = self._a_coo(X)
        if X.shape[1] != self.components_.shape[1]:
            raise ValueError(
                'La matriz tiene %d terminos y el modelo fue entrenado con %d.'
                % (X.shape[1], self.components_.shape[1])
            )
        # Se conservan las componentes: el folding-in no reestima los temas.
        componentes = self.components_.copy()
        p_z_d = self._ejecutar_em(X, actualizar_componentes=False)
        self.components_ = componentes
        return p_z_d

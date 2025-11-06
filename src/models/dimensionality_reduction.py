"""
Módulo de Reducción de Dimensionalidad
Implementa múltiples técnicas con análisis detallado y comparaciones visuales
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from sklearn.decomposition import PCA, FactorAnalysis
from sklearn.manifold import TSNE
from sklearn.feature_selection import VarianceThreshold
from sklearn.preprocessing import StandardScaler
from scipy.stats import pearsonr
from src.utils.logger import get_logger
import warnings
warnings.filterwarnings('ignore')

# Inicializar logger
logger = get_logger(__name__)

# UMAP (opcional)
try:
    from umap import UMAP
    UMAP_AVAILABLE = True
except ImportError:
    UMAP_AVAILABLE = False
    # Silenciar advertencia - el paquete está instalado correctamente
    # Si hay error, se manejará en los métodos que usen UMAP


class DimensionalityReducer:
    """Clase para reducción de dimensionalidad con análisis detallado"""

    def __init__(self):
        """Inicializa el reductor"""
        self.scaler = StandardScaler()
        self.original_data = None
        self.scaled_data = None
        self.feature_names = None
        self.results = {}

    def prepare_data(self, data_matrix: np.ndarray, feature_names: List[str]) -> Dict[str, Any]:
        """
        Prepara datos para reducción

        Args:
            data_matrix: Matriz de datos (n_samples, n_features)
            feature_names: Nombres de features

        Returns:
            Diccionario con información de preparación
        """
        logger.info("Preparando datos...")

        self.original_data = data_matrix
        self.feature_names = feature_names

        # Escalar datos
        self.scaled_data = self.scaler.fit_transform(data_matrix)

        # Estadísticas
        stats = {
            'n_samples': data_matrix.shape[0],
            'n_features': data_matrix.shape[1],
            'feature_names': feature_names,
            'mean': np.mean(data_matrix, axis=0),
            'std': np.std(data_matrix, axis=0),
            'min': np.min(data_matrix, axis=0),
            'max': np.max(data_matrix, axis=0),
            'sparsity': np.sum(data_matrix == 0) / data_matrix.size
        }

        logger.info(f"Samples: {stats['n_samples']}")
        logger.info(f"Features: {stats['n_features']}")
        logger.info(f"Sparsity: {stats['sparsity']:.2%}")

        return stats

    # ==================== FILTROS ====================

    def filter_low_variance(self, threshold: float = 0.01) -> Dict[str, Any]:
        """
        Filtra features con baja varianza

        Args:
            threshold: Umbral de varianza mínima

        Returns:
            Diccionario con resultados del filtro
        """
        logger.info(f"Aplicando filtro de baja varianza (threshold={threshold})...")

        if self.scaled_data is None:
            raise ValueError("Primero ejecuta prepare_data()")

        # Aplicar filtro
        selector = VarianceThreshold(threshold=threshold)
        filtered_data = selector.fit_transform(self.scaled_data)

        # Features eliminadas y conservadas
        mask = selector.get_support()
        removed_features = [self.feature_names[i] for i, keep in enumerate(mask) if not keep]
        kept_features = [self.feature_names[i] for i, keep in enumerate(mask) if keep]

        # Varianzas
        variances = np.var(self.scaled_data, axis=0)

        results = {
            'method': 'low_variance_filter',
            'threshold': threshold,
            'original_features': len(self.feature_names),
            'kept_features': len(kept_features),
            'removed_features': len(removed_features),
            'kept_feature_names': kept_features,
            'removed_feature_names': removed_features,
            'variances': variances.tolist(),
            'filtered_data': filtered_data,
            'reduction_ratio': len(removed_features) / len(self.feature_names)
        }

        logger.info(f"Features originales: {results['original_features']}")
        logger.info(f"Features conservadas: {results['kept_features']}")
        logger.info(f"Features removidas: {results['removed_features']}")
        logger.info(f"Reducción: {results['reduction_ratio']:.1%}")

        self.results['low_variance_filter'] = results
        return results

    def filter_high_correlation(self, threshold: float = 0.9) -> Dict[str, Any]:
        """
        Filtra features altamente correlacionadas

        Args:
            threshold: Umbral de correlación (|r| > threshold)

        Returns:
            Diccionario con resultados del filtro
        """
        logger.info(f"Aplicando filtro de alta correlación (threshold={threshold})...")

        if self.scaled_data is None:
            raise ValueError("Primero ejecuta prepare_data()")

        # Calcular matriz de correlación
        corr_matrix = np.corrcoef(self.scaled_data.T)

        # Encontrar pares altamente correlacionados
        high_corr_pairs = []
        features_to_remove = set()

        for i in range(len(corr_matrix)):
            for j in range(i + 1, len(corr_matrix)):
                if abs(corr_matrix[i, j]) > threshold:
                    high_corr_pairs.append({
                        'feature1': self.feature_names[i],
                        'feature2': self.feature_names[j],
                        'correlation': float(corr_matrix[i, j])
                    })
                    # Remover feature con menor varianza
                    var_i = np.var(self.scaled_data[:, i])
                    var_j = np.var(self.scaled_data[:, j])
                    features_to_remove.add(j if var_j < var_i else i)

        # Crear máscara de features a conservar
        mask = np.ones(len(self.feature_names), dtype=bool)
        mask[list(features_to_remove)] = False

        filtered_data = self.scaled_data[:, mask]
        kept_features = [self.feature_names[i] for i in range(len(mask)) if mask[i]]
        removed_features = [self.feature_names[i] for i in features_to_remove]

        results = {
            'method': 'high_correlation_filter',
            'threshold': threshold,
            'original_features': len(self.feature_names),
            'kept_features': len(kept_features),
            'removed_features': len(removed_features),
            'kept_feature_names': kept_features,
            'removed_feature_names': removed_features,
            'high_corr_pairs': high_corr_pairs,
            'correlation_matrix': corr_matrix.tolist(),
            'filtered_data': filtered_data,
            'reduction_ratio': len(removed_features) / len(self.feature_names)
        }

        logger.info(f"Features originales: {results['original_features']}")
        logger.info(f"Pares altamente correlacionados: {len(high_corr_pairs)}")
        logger.info(f"Features removidas: {results['removed_features']}")
        logger.info(f"Reducción: {results['reduction_ratio']:.1%}")

        self.results['high_correlation_filter'] = results
        return results

    # ==================== PCA ====================

    def apply_pca(self, n_components: int = 2, analyze: bool = True) -> Dict[str, Any]:
        """
        Aplica PCA con análisis detallado

        Args:
            n_components: Número de componentes
            analyze: Si incluir análisis detallado

        Returns:
            Diccionario con resultados de PCA
        """
        logger.info(f"Aplicando PCA (n_components={n_components})...")

        if self.scaled_data is None:
            raise ValueError("Primero ejecuta prepare_data()")

        # Aplicar PCA
        pca = PCA(n_components=n_components)
        transformed_data = pca.fit_transform(self.scaled_data)

        results = {
            'method': 'PCA',
            'n_components': n_components,
            'transformed_data': transformed_data,
            'explained_variance': pca.explained_variance_.tolist(),
            'explained_variance_ratio': pca.explained_variance_ratio_.tolist(),
            'cumulative_variance': np.cumsum(pca.explained_variance_ratio_).tolist(),
            'components': pca.components_.tolist(),
            'singular_values': pca.singular_values_.tolist(),
        }

        # Análisis detallado
        if analyze:
            # Contribución de cada feature a cada componente
            loadings = pca.components_.T * np.sqrt(pca.explained_variance_)

            component_contributions = []
            for i in range(n_components):
                # Top features para este componente
                component_loadings = np.abs(loadings[:, i])
                top_indices = np.argsort(component_loadings)[::-1][:10]

                top_features = [
                    {
                        'feature': self.feature_names[idx],
                        'loading': float(loadings[idx, i]),
                        'abs_loading': float(component_loadings[idx])
                    }
                    for idx in top_indices
                ]

                component_contributions.append({
                    'component': i + 1,
                    'variance_explained': float(pca.explained_variance_ratio_[i]),
                    'top_features': top_features
                })

            results['component_contributions'] = component_contributions
            results['loadings_matrix'] = loadings.tolist()

            # PCA para determinar dimensionalidad óptima
            if n_components < min(self.scaled_data.shape):
                pca_full = PCA()
                pca_full.fit(self.scaled_data)

                # Número de componentes para 90%, 95%, 99% varianza
                cumsum = np.cumsum(pca_full.explained_variance_ratio_)
                n_90 = np.argmax(cumsum >= 0.90) + 1
                n_95 = np.argmax(cumsum >= 0.95) + 1
                n_99 = np.argmax(cumsum >= 0.99) + 1

                results['optimal_dimensions'] = {
                    '90_percent': int(n_90),
                    '95_percent': int(n_95),
                    '99_percent': int(n_99),
                    'total_components': len(pca_full.explained_variance_ratio_)
                }

        logger.info(f"Varianza explicada (PC1): {results['explained_variance_ratio'][0]:.2%}")
        if n_components > 1:
            logger.info(f"Varianza explicada (PC2): {results['explained_variance_ratio'][1]:.2%}")
        logger.info(f"Varianza acumulada: {results['cumulative_variance'][-1]:.2%}")

        self.results['pca'] = results
        return results

    # ==================== t-SNE ====================

    def apply_tsne(self, n_components: int = 2, perplexity: int = 30,
                   learning_rate: float = 200.0, n_iter: int = 1000,
                   random_state: int = 42) -> Dict[str, Any]:
        """
        Aplica t-SNE con análisis

        Args:
            n_components: Número de componentes (usualmente 2 o 3)
            perplexity: Perplejidad (5-50, depende del dataset)
            learning_rate: Tasa de aprendizaje
            n_iter: Número de iteraciones
            random_state: Semilla aleatoria

        Returns:
            Diccionario con resultados de t-SNE
        """
        logger.info(f"Aplicando t-SNE (perplexity={perplexity})...")

        if self.scaled_data is None:
            raise ValueError("Primero ejecuta prepare_data()")

        # Aplicar t-SNE
        tsne = TSNE(
            n_components=n_components,
            perplexity=perplexity,
            learning_rate=learning_rate,
            max_iter=n_iter,  # Cambiado de n_iter a max_iter para compatibilidad con sklearn >= 1.2
            random_state=random_state,
            verbose=0
        )

        transformed_data = tsne.fit_transform(self.scaled_data)

        # Calcular métricas de calidad
        kl_divergence = float(tsne.kl_divergence_)

        results = {
            'method': 't-SNE',
            'n_components': n_components,
            'perplexity': perplexity,
            'learning_rate': learning_rate,
            'n_iter': n_iter,
            'transformed_data': transformed_data,
            'kl_divergence': kl_divergence,
            'n_iter_final': int(tsne.n_iter_)
        }

        # Análisis de separación (distancias entre puntos)
        from scipy.spatial.distance import pdist

        original_distances = pdist(self.scaled_data[:100])  # Muestra para eficiencia
        transformed_distances = pdist(transformed_data[:100])

        results['distance_preservation'] = {
            'original_mean': float(np.mean(original_distances)),
            'original_std': float(np.std(original_distances)),
            'transformed_mean': float(np.mean(transformed_distances)),
            'transformed_std': float(np.std(transformed_distances)),
            'correlation': float(np.corrcoef(original_distances, transformed_distances)[0, 1])
        }

        logger.info(f"KL Divergence: {kl_divergence:.4f}")
        logger.info(f"Iteraciones: {tsne.n_iter_}")
        logger.info(f"Correlación de distancias: {results['distance_preservation']['correlation']:.4f}")

        self.results['tsne'] = results
        return results

    # ==================== UMAP ====================

    def apply_umap(self, n_components: int = 2, n_neighbors: int = 15,
                   min_dist: float = 0.1, metric: str = 'euclidean',
                   random_state: int = 42) -> Dict[str, Any]:
        """
        Aplica UMAP con análisis

        Args:
            n_components: Número de componentes
            n_neighbors: Número de vecinos (balance local/global)
            min_dist: Distancia mínima entre puntos
            metric: Métrica de distancia
            random_state: Semilla aleatoria

        Returns:
            Diccionario con resultados de UMAP
        """
        logger.info(f"Aplicando UMAP (n_neighbors={n_neighbors})...")

        if not UMAP_AVAILABLE:
            return {
                'method': 'UMAP',
                'error': 'UMAP no está instalado',
                'message': 'Instala con: pip install umap-learn'
            }

        if self.scaled_data is None:
            raise ValueError("Primero ejecuta prepare_data()")

        # Aplicar UMAP
        umap_model = UMAP(
            n_components=n_components,
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            metric=metric,
            random_state=random_state,
            verbose=False
        )

        transformed_data = umap_model.fit_transform(self.scaled_data)

        results = {
            'method': 'UMAP',
            'n_components': n_components,
            'n_neighbors': n_neighbors,
            'min_dist': min_dist,
            'metric': metric,
            'transformed_data': transformed_data
        }

        # Análisis de preservación de estructura
        from scipy.spatial.distance import pdist

        original_distances = pdist(self.scaled_data[:100])
        transformed_distances = pdist(transformed_data[:100])

        results['distance_preservation'] = {
            'original_mean': float(np.mean(original_distances)),
            'original_std': float(np.std(original_distances)),
            'transformed_mean': float(np.mean(transformed_distances)),
            'transformed_std': float(np.std(transformed_distances)),
            'correlation': float(np.corrcoef(original_distances, transformed_distances)[0, 1])
        }

        # Métricas de calidad de embedding
        results['embedding_quality'] = {
            'spread': float(np.std(transformed_data)),
            'range': [float(np.min(transformed_data)), float(np.max(transformed_data))]
        }

        logger.info("Transformación UMAP completada exitosamente")
        logger.info(f"Correlación de distancias: {results['distance_preservation']['correlation']:.4f}")
        logger.info(f"Spread: {results['embedding_quality']['spread']:.4f}")

        self.results['umap'] = results
        return results

    # ==================== FACTOR ANALYSIS ====================

    def apply_factor_analysis(self, n_factors: int = 2, max_iter: int = 1000,
                              rotation: Optional[str] = 'varimax') -> Dict[str, Any]:
        """
        Aplica Análisis de Factores

        Args:
            n_factors: Número de factores latentes
            max_iter: Máximo de iteraciones
            rotation: Tipo de rotación ('varimax', None)

        Returns:
            Diccionario con resultados de Factor Analysis
        """
        logger.info(f"Aplicando Factor Analysis (n_factors={n_factors})...")

        if self.scaled_data is None:
            raise ValueError("Primero ejecuta prepare_data()")

        # Aplicar Factor Analysis
        fa = FactorAnalysis(n_components=n_factors, max_iter=max_iter, random_state=42)
        transformed_data = fa.fit_transform(self.scaled_data)

        # Loadings (cargas factoriales)
        loadings = fa.components_.T

        # Aplicar rotación si se especifica
        if rotation == 'varimax':
            loadings_rotated = self._varimax_rotation(loadings)
            loadings = loadings_rotated

        results = {
            'method': 'Factor Analysis',
            'n_factors': n_factors,
            'transformed_data': transformed_data,
            'loadings': loadings.tolist(),
            'noise_variance': fa.noise_variance_.tolist(),
            'log_likelihood': float(fa.score(self.scaled_data) * self.scaled_data.shape[0]),
            'rotation': rotation
        }

        # Análisis de cargas factoriales
        factor_contributions = []
        for i in range(n_factors):
            # Top features para este factor
            factor_loadings = np.abs(loadings[:, i])
            top_indices = np.argsort(factor_loadings)[::-1][:10]

            top_features = [
                {
                    'feature': self.feature_names[idx],
                    'loading': float(loadings[idx, i]),
                    'abs_loading': float(factor_loadings[idx])
                }
                for idx in top_indices
            ]

            # Varianza explicada por factor (aproximada)
            variance_explained = np.sum(loadings[:, i] ** 2) / len(self.feature_names)

            factor_contributions.append({
                'factor': i + 1,
                'variance_explained': float(variance_explained),
                'top_features': top_features
            })

        results['factor_contributions'] = factor_contributions

        # Comunalidades (proporción de varianza explicada por los factores)
        communalities = np.sum(loadings ** 2, axis=1)
        results['communalities'] = communalities.tolist()
        results['mean_communality'] = float(np.mean(communalities))

        logger.info(f"Log-likelihood: {results['log_likelihood']:.2f}")
        logger.info(f"Comunalidad media: {results['mean_communality']:.4f}")

        self.results['factor_analysis'] = results
        return results

    def _varimax_rotation(self, loadings: np.ndarray, gamma: float = 1.0,
                         max_iter: int = 100, tol: float = 1e-5) -> np.ndarray:
        """
        Rotación Varimax de cargas factoriales

        Args:
            loadings: Matriz de cargas
            gamma: Parámetro de rotación
            max_iter: Iteraciones máximas
            tol: Tolerancia de convergencia

        Returns:
            Cargas rotadas
        """
        n_rows, n_cols = loadings.shape
        rotation_matrix = np.eye(n_cols)

        for _ in range(max_iter):
            old_rotation = rotation_matrix.copy()

            # Algoritmo varimax
            lambda_rotated = loadings @ rotation_matrix
            u, s, vt = np.linalg.svd(
                loadings.T @ (lambda_rotated ** 3 -
                             gamma * lambda_rotated @ np.diag(np.sum(lambda_rotated ** 2, axis=0)) / n_rows)
            )
            rotation_matrix = u @ vt

            # Verificar convergencia
            if np.allclose(rotation_matrix, old_rotation, atol=tol):
                break

        return loadings @ rotation_matrix

    # ==================== COMPARACIÓN ====================

    def compare_methods(self, methods: List[str] = ['pca', 'tsne', 'umap']) -> Dict[str, Any]:
        """
        Compara diferentes métodos de reducción

        Args:
            methods: Lista de métodos a comparar

        Returns:
            Diccionario con comparación
        """
        logger.info("Comparando métodos de reducción...")

        comparison = {
            'methods': methods,
            'summary': []
        }

        for method in methods:
            if method not in self.results:
                logger.warning(f"{method} no ha sido ejecutado")
                continue

            result = self.results[method]

            summary = {
                'method': method.upper(),
                'n_components': result.get('n_components', result.get('n_factors', 'N/A')),
            }

            # Métricas específicas por método
            if method == 'pca':
                summary['variance_explained'] = result['cumulative_variance'][-1]
                summary['interpretability'] = 'Alta'
                summary['computational_cost'] = 'Bajo'

            elif method == 'tsne':
                summary['kl_divergence'] = result['kl_divergence']
                summary['distance_correlation'] = result['distance_preservation']['correlation']
                summary['interpretability'] = 'Baja'
                summary['computational_cost'] = 'Alto'

            elif method == 'umap':
                if 'error' not in result:
                    summary['distance_correlation'] = result['distance_preservation']['correlation']
                    summary['interpretability'] = 'Media'
                    summary['computational_cost'] = 'Medio'
                else:
                    summary['error'] = result['error']

            elif method == 'factor_analysis':
                summary['mean_communality'] = result['mean_communality']
                summary['interpretability'] = 'Alta'
                summary['computational_cost'] = 'Medio'

            comparison['summary'].append(summary)

        return comparison

    def get_reconstruction_error(self, method: str = 'pca') -> float:
        """
        Calcula error de reconstrucción

        Args:
            method: Método a evaluar

        Returns:
            Error de reconstrucción (MSE)
        """
        if method not in self.results:
            raise ValueError(f"Método {method} no ejecutado")

        if method == 'pca':
            pca = PCA(n_components=self.results['pca']['n_components'])
            pca.fit(self.scaled_data)

            # Transformar y reconstruir
            transformed = pca.transform(self.scaled_data)
            reconstructed = pca.inverse_transform(transformed)

            # MSE
            mse = np.mean((self.scaled_data - reconstructed) ** 2)
            return float(mse)

        else:
            # t-SNE y UMAP no permiten reconstrucción exacta
            return None

    def export_results(self) -> Dict[str, Any]:
        """
        Exporta todos los resultados

        Returns:
            Diccionario con todos los resultados
        """
        return {
            'methods_applied': list(self.results.keys()),
            'results': self.results,
            'data_info': {
                'n_samples': self.scaled_data.shape[0] if self.scaled_data is not None else 0,
                'n_features': self.scaled_data.shape[1] if self.scaled_data is not None else 0
            }
        }

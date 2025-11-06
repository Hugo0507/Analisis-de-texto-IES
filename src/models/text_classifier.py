"""
Módulo de Clasificación de Textos
Implementa Naive Bayes, SVM y KNN para clasificación supervisada
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.naive_bayes import MultinomialNB, ComplementNB, BernoulliNB
from sklearn.svm import SVC, LinearSVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split, cross_val_score, cross_validate
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix, roc_auc_score,
    precision_recall_curve, roc_curve
)
from sklearn.preprocessing import label_binarize
from src.utils.logger import get_logger
import warnings
warnings.filterwarnings('ignore')

# Inicializar logger
logger = get_logger(__name__)


class TextClassifier:
    """Clase para clasificación de textos usando Naive Bayes, SVM y KNN"""

    def __init__(self):
        """Inicializa el clasificador"""
        self.models = {
            'naive_bayes': None,
            'svm': None,
            'knn': None
        }
        self.vectorizer = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.feature_names = None
        self.label_names = None

    def prepare_data(self,
                    texts_dict: Dict[str, str],
                    labels_dict: Dict[str, str],
                    test_size: float = 0.2,
                    random_state: int = 42,
                    vectorizer_type: str = 'tfidf',
                    max_features: int = 1000,
                    ngram_range: Tuple[int, int] = (1, 2)) -> Dict[str, Any]:
        """
        Prepara datos para clasificación

        Args:
            texts_dict: Diccionario {nombre_doc: texto}
            labels_dict: Diccionario {nombre_doc: etiqueta}
            test_size: Proporción de test (0.0-0.5)
            random_state: Semilla aleatoria
            vectorizer_type: 'tfidf' o 'count'
            max_features: Máximo número de features
            ngram_range: Rango de n-gramas

        Returns:
            Diccionario con información de preparación
        """
        logger.info("Preparando datos para clasificación...")

        # Verificar que todos los documentos tengan etiqueta
        doc_names = list(texts_dict.keys())
        texts = []
        labels = []

        for doc_name in doc_names:
            if doc_name in labels_dict:
                texts.append(texts_dict[doc_name])
                labels.append(labels_dict[doc_name])

        if len(texts) == 0:
            raise ValueError("No hay documentos con etiquetas")

        # Obtener nombres únicos de etiquetas
        self.label_names = sorted(set(labels))

        logger.info(f"Documentos totales: {len(texts)}")
        logger.info(f"Clases: {len(self.label_names)}")
        logger.info(f"Distribución: {dict(Counter(labels))}")

        # Crear vectorizador
        if vectorizer_type == 'tfidf':
            self.vectorizer = TfidfVectorizer(
                max_features=max_features,
                ngram_range=ngram_range,
                min_df=2
            )
        else:
            self.vectorizer = CountVectorizer(
                max_features=max_features,
                ngram_range=ngram_range,
                min_df=2
            )

        # Vectorizar textos
        logger.info(f"Vectorizando textos con {vectorizer_type}...")
        X = self.vectorizer.fit_transform(texts)
        self.feature_names = self.vectorizer.get_feature_names_out()

        # Split train/test
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, labels, test_size=test_size, random_state=random_state, stratify=labels
        )

        logger.info(f"Train set: {self.X_train.shape[0]} documentos")
        logger.info(f"Test set: {self.X_test.shape[0]} documentos")
        logger.info(f"Features: {self.X_train.shape[1]}")

        return {
            'n_samples': len(texts),
            'n_features': self.X_train.shape[1],
            'n_classes': len(self.label_names),
            'train_size': self.X_train.shape[0],
            'test_size': self.X_test.shape[0],
            'class_distribution': dict(Counter(labels)),
            'class_names': self.label_names
        }

    def train_naive_bayes(self,
                         variant: str = 'multinomial',
                         alpha: float = 1.0) -> Dict[str, Any]:
        """
        Entrena modelo Naive Bayes

        Args:
            variant: 'multinomial', 'complement', o 'bernoulli'
            alpha: Parámetro de suavizado (Laplace smoothing)

        Returns:
            Resultados del modelo
        """
        logger.info(f"Entrenando Naive Bayes ({variant})...")

        # Seleccionar variante
        if variant == 'multinomial':
            model = MultinomialNB(alpha=alpha)
        elif variant == 'complement':
            model = ComplementNB(alpha=alpha)
        elif variant == 'bernoulli':
            model = BernoulliNB(alpha=alpha)
        else:
            raise ValueError(f"Variante desconocida: {variant}")

        # Entrenar
        model.fit(self.X_train, self.y_train)
        self.models['naive_bayes'] = model

        # Evaluar
        evaluation = self._evaluate_model(model, 'Naive Bayes')

        # Estructurar resultados con métricas separadas
        results = {
            'metrics': evaluation,
            'variant': variant,
            'alpha': alpha
        }

        # Features importantes
        if variant in ['multinomial', 'complement']:
            top_features = self._get_top_features_nb(model, n=20)
            results['top_features'] = top_features

        logger.info(f"Naive Bayes entrenado exitosamente - Accuracy: {evaluation['accuracy']:.3f}")
        return results

    def train_svm(self,
                  kernel: str = 'linear',
                  C: float = 1.0,
                  gamma: str = 'scale') -> Dict[str, Any]:
        """
        Entrena modelo SVM

        Args:
            kernel: 'linear', 'rbf', 'poly', 'sigmoid'
            C: Parámetro de regularización
            gamma: Coeficiente del kernel ('scale', 'auto', o valor)

        Returns:
            Resultados del modelo
        """
        logger.info(f"Entrenando SVM (kernel={kernel})...")

        # Para kernel lineal, usar LinearSVC (más rápido)
        if kernel == 'linear':
            model = LinearSVC(C=C, random_state=42, max_iter=1000)
        else:
            model = SVC(kernel=kernel, C=C, gamma=gamma, random_state=42, probability=True)

        # Entrenar
        model.fit(self.X_train, self.y_train)
        self.models['svm'] = model

        # Evaluar
        evaluation = self._evaluate_model(model, 'SVM')

        # Estructurar resultados con métricas separadas
        results = {
            'metrics': evaluation,
            'kernel': kernel,
            'C': C,
            'gamma': gamma
        }

        # Features importantes (solo para kernel lineal)
        if kernel == 'linear':
            top_features = self._get_top_features_svm(model, n=20)
            results['top_features'] = top_features

        logger.info(f"SVM entrenado exitosamente - Accuracy: {evaluation['accuracy']:.3f}")
        return results

    def train_knn(self,
                  n_neighbors: int = 5,
                  weights: str = 'uniform',
                  metric: str = 'cosine') -> Dict[str, Any]:
        """
        Entrena modelo KNN

        Args:
            n_neighbors: Número de vecinos
            weights: 'uniform' o 'distance'
            metric: Métrica de distancia ('cosine', 'euclidean', 'manhattan')

        Returns:
            Resultados del modelo
        """
        logger.info(f"Entrenando KNN (k={n_neighbors})...")

        model = KNeighborsClassifier(
            n_neighbors=n_neighbors,
            weights=weights,
            metric=metric,
            n_jobs=-1
        )

        # Entrenar
        model.fit(self.X_train, self.y_train)
        self.models['knn'] = model

        # Evaluar
        evaluation = self._evaluate_model(model, 'KNN')

        # Estructurar resultados con métricas separadas
        results = {
            'metrics': evaluation,
            'n_neighbors': n_neighbors,
            'weights': weights,
            'metric': metric
        }

        logger.info(f"KNN entrenado exitosamente - Accuracy: {evaluation['accuracy']:.3f}")
        return results

    def _evaluate_model(self, model, model_name: str) -> Dict[str, Any]:
        """
        Evalúa un modelo entrenado

        Args:
            model: Modelo entrenado
            model_name: Nombre del modelo

        Returns:
            Diccionario con métricas
        """
        # Predicciones
        y_pred = model.predict(self.X_test)

        # Probabilidades (si disponible)
        try:
            y_proba = model.predict_proba(self.X_test)
        except:
            y_proba = None

        # Métricas básicas
        accuracy = accuracy_score(self.y_test, y_pred)

        # Para clasificación multiclase
        avg_method = 'weighted' if len(self.label_names) > 2 else 'binary'

        precision = precision_score(self.y_test, y_pred, average=avg_method, zero_division=0)
        recall = recall_score(self.y_test, y_pred, average=avg_method, zero_division=0)
        f1 = f1_score(self.y_test, y_pred, average=avg_method, zero_division=0)

        # Matriz de confusión
        conf_matrix = confusion_matrix(self.y_test, y_pred, labels=self.label_names)

        # Classification report
        class_report = classification_report(
            self.y_test, y_pred,
            target_names=self.label_names,
            output_dict=True,
            zero_division=0
        )

        # Validación cruzada
        cv_scores = cross_val_score(model, self.X_train, self.y_train, cv=5, scoring='accuracy')

        results = {
            'model_name': model_name,
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'confusion_matrix': conf_matrix.tolist(),
            'classification_report': class_report,
            'cv_scores': cv_scores.tolist(),
            'cv_mean': float(cv_scores.mean()),
            'cv_std': float(cv_scores.std()),
            'predictions': y_pred.tolist(),
            'true_labels': self.y_test
        }

        # AUC-ROC para clasificación binaria o multiclase
        if y_proba is not None and len(self.label_names) == 2:
            # Binaria
            auc_score = roc_auc_score(self.y_test, y_proba[:, 1])
            results['auc_roc'] = float(auc_score)
        elif y_proba is not None and len(self.label_names) > 2:
            # Multiclase (one-vs-rest)
            y_test_bin = label_binarize(self.y_test, classes=self.label_names)
            try:
                auc_score = roc_auc_score(y_test_bin, y_proba, average='weighted', multi_class='ovr')
                results['auc_roc'] = float(auc_score)
            except:
                results['auc_roc'] = None

        return results

    def _get_top_features_nb(self, model, n: int = 20) -> Dict[str, List[Dict[str, Any]]]:
        """
        Obtiene features más importantes para Naive Bayes

        Args:
            model: Modelo NB entrenado
            n: Número de features por clase

        Returns:
            Diccionario con top features por clase
        """
        top_features = {}

        for idx, class_name in enumerate(self.label_names):
            # Log probabilities de features
            log_probs = model.feature_log_prob_[idx]

            # Top features
            top_indices = log_probs.argsort()[-n:][::-1]

            features = [
                {
                    'feature': self.feature_names[i],
                    'log_prob': float(log_probs[i])
                }
                for i in top_indices
            ]

            top_features[class_name] = features

        return top_features

    def _get_top_features_svm(self, model, n: int = 20) -> Dict[str, List[Dict[str, Any]]]:
        """
        Obtiene features más importantes para SVM lineal

        Args:
            model: Modelo SVM lineal entrenado
            n: Número de features por clase

        Returns:
            Diccionario con top features por clase
        """
        top_features = {}

        # Para SVM multiclase
        if len(self.label_names) == 2:
            # Binario
            coefs = model.coef_[0]
            top_positive = coefs.argsort()[-n:][::-1]
            top_negative = coefs.argsort()[:n]

            top_features[self.label_names[1]] = [
                {
                    'feature': self.feature_names[i],
                    'coefficient': float(coefs[i])
                }
                for i in top_positive
            ]

            top_features[self.label_names[0]] = [
                {
                    'feature': self.feature_names[i],
                    'coefficient': float(coefs[i])
                }
                for i in top_negative
            ]
        else:
            # Multiclase (one-vs-rest)
            for idx, class_name in enumerate(self.label_names):
                coefs = model.coef_[idx]
                top_indices = coefs.argsort()[-n:][::-1]

                top_features[class_name] = [
                    {
                        'feature': self.feature_names[i],
                        'coefficient': float(coefs[i])
                    }
                    for i in top_indices
                ]

        return top_features

    def compare_models(self,
                      nb_results: Dict[str, Any],
                      svm_results: Dict[str, Any],
                      knn_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compara resultados de los tres modelos

        Args:
            nb_results: Resultados de Naive Bayes
            svm_results: Resultados de SVM
            knn_results: Resultados de KNN

        Returns:
            Comparación de modelos
        """
        comparison = {
            'metrics_comparison': {
                'Naive Bayes': {
                    'accuracy': nb_results['accuracy'],
                    'precision': nb_results['precision'],
                    'recall': nb_results['recall'],
                    'f1_score': nb_results['f1_score'],
                    'cv_mean': nb_results['cv_mean'],
                    'cv_std': nb_results['cv_std']
                },
                'SVM': {
                    'accuracy': svm_results['accuracy'],
                    'precision': svm_results['precision'],
                    'recall': svm_results['recall'],
                    'f1_score': svm_results['f1_score'],
                    'cv_mean': svm_results['cv_mean'],
                    'cv_std': svm_results['cv_std']
                },
                'KNN': {
                    'accuracy': knn_results['accuracy'],
                    'precision': knn_results['precision'],
                    'recall': knn_results['recall'],
                    'f1_score': knn_results['f1_score'],
                    'cv_mean': knn_results['cv_mean'],
                    'cv_std': knn_results['cv_std']
                }
            },
            'best_model': self._find_best_model(nb_results, svm_results, knn_results)
        }

        return comparison

    def _find_best_model(self, *results) -> Dict[str, str]:
        """Encuentra el mejor modelo según diferentes métricas"""
        models = ['Naive Bayes', 'SVM', 'KNN']

        best = {
            'accuracy': max(results, key=lambda x: x['accuracy'])['model_name'],
            'precision': max(results, key=lambda x: x['precision'])['model_name'],
            'recall': max(results, key=lambda x: x['recall'])['model_name'],
            'f1_score': max(results, key=lambda x: x['f1_score'])['model_name'],
            'cv_mean': max(results, key=lambda x: x['cv_mean'])['model_name']
        }

        return best

    def predict(self, texts: List[str], model_name: str = 'naive_bayes') -> List[str]:
        """
        Predice etiquetas para nuevos textos

        Args:
            texts: Lista de textos
            model_name: Nombre del modelo a usar

        Returns:
            Lista de etiquetas predichas
        """
        if self.models[model_name] is None:
            raise ValueError(f"Modelo {model_name} no ha sido entrenado")

        # Vectorizar
        X = self.vectorizer.transform(texts)

        # Predecir
        predictions = self.models[model_name].predict(X)

        return predictions.tolist()

    def predict_proba(self, texts: List[str], model_name: str = 'naive_bayes') -> np.ndarray:
        """
        Predice probabilidades para nuevos textos

        Args:
            texts: Lista de textos
            model_name: Nombre del modelo a usar

        Returns:
            Array de probabilidades
        """
        if self.models[model_name] is None:
            raise ValueError(f"Modelo {model_name} no ha sido entrenado")

        # Vectorizar
        X = self.vectorizer.transform(texts)

        # Predecir probabilidades
        try:
            probas = self.models[model_name].predict_proba(X)
            return probas
        except:
            raise ValueError(f"Modelo {model_name} no soporta probabilidades")

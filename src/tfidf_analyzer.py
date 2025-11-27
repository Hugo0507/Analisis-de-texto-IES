"""
Analizador TF-IDF (Term Frequency - Inverse Document Frequency)
Crea matriz TF-IDF para ponderar la importancia de términos
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize
from src.utils.logger import get_logger

logger = get_logger(__name__)


class TFIDFAnalyzer:
    """Clase para crear y analizar matrices TF-IDF"""

    def __init__(self, config: Dict[str, Any] = None):
        """
        Inicializa el analizador TF-IDF

        Args:
            config: Configuración para TfidfVectorizer
        """
        self.config = config or {
            'ngram_range': (1, 2),
            'min_df': 2,
            'max_df': 0.85,
            'max_features': 5000,
            'use_idf': True,
            'smooth_idf': True,
            'sublinear_tf': False,
            'norm': 'l2'
        }

        self.vectorizer = TfidfVectorizer(
            ngram_range=self.config.get('ngram_range', (1, 2)),
            min_df=self.config.get('min_df', 2),
            max_df=self.config.get('max_df', 0.85),
            max_features=self.config.get('max_features', 5000),
            use_idf=self.config.get('use_idf', True),
            smooth_idf=self.config.get('smooth_idf', True),
            sublinear_tf=self.config.get('sublinear_tf', False),
            norm=self.config.get('norm', 'l2'),
            lowercase=False,  # Ya viene preprocesado en minúsculas
            stop_words=None,  # NO aplicar stopwords aquí (ya se aplicaron en preprocesamiento)
            token_pattern=r'\b[a-zA-Z]{2,}\b'
        )

        self.tfidf_matrix = None
        self.feature_names = None
        self.document_names = None

    def fit_transform(self, documents: Dict[str, str]) -> pd.DataFrame:
        """
        Crea la matriz TF-IDF

        Args:
            documents: Diccionario {nombre_archivo: texto_preprocesado}

        Returns:
            DataFrame con matriz TF-IDF (filas=documentos, columnas=términos)
        """
        logger.info(f"Creando matriz TF-IDF para {len(documents)} documentos...")

        # Preparar datos
        self.document_names = list(documents.keys())
        texts = list(documents.values())

        # Crear matriz TF-IDF
        logger.info("Aplicando TfidfVectorizer...")
        self.tfidf_matrix = self.vectorizer.fit_transform(texts)

        # Obtener nombres de características
        self.feature_names = self.vectorizer.get_feature_names_out()

        logger.info(f"Vocabulario TF-IDF creado: {len(self.feature_names)} términos únicos")

        # Convertir a DataFrame
        tfidf_df = pd.DataFrame(
            self.tfidf_matrix.toarray(),
            index=self.document_names,
            columns=self.feature_names
        )

        logger.info(f"Matriz TF-IDF creada: {tfidf_df.shape[0]} documentos x {tfidf_df.shape[1]} términos")

        return tfidf_df

    def calculate_from_bow(self, bow_df: pd.DataFrame) -> pd.DataFrame:
        """
        Calcula TF-IDF manualmente desde una matriz BoW existente
        (Alternativa a fit_transform usando el método manual del código de referencia)

        Args:
            bow_df: DataFrame de Bolsa de Palabras

        Returns:
            DataFrame con matriz TF-IDF
        """
        logger.info("Calculando TF-IDF manualmente desde BoW...")

        # Calcular TF (Term Frequency)
        logger.info("Calculando TF...")
        tf = bow_df.div(bow_df.sum(axis=1), axis=0)

        # Calcular IDF (Inverse Document Frequency)
        logger.info("Calculando IDF...")
        num_documents = bow_df.shape[0]
        df = (bow_df > 0).sum()  # Document frequency: cuántos documentos contienen cada término
        idf = np.log(num_documents / df.replace(0, 1))  # Evitar división por cero

        # Calcular TF-IDF
        logger.info("Calculando TF-IDF = TF * IDF...")
        tfidf_df = tf * idf

        logger.info(f"Matriz TF-IDF manual creada: {tfidf_df.shape[0]} documentos x {tfidf_df.shape[1]} términos")

        return tfidf_df

    def normalize(self, tfidf_df: pd.DataFrame, norm: str = 'l2') -> pd.DataFrame:
        """
        Normaliza la matriz TF-IDF

        Args:
            tfidf_df: DataFrame TF-IDF
            norm: Tipo de normalización ('l1', 'l2', 'max')

        Returns:
            DataFrame TF-IDF normalizado
        """
        logger.info(f"Normalizando matriz TF-IDF con norma {norm}...")

        # Normalizar usando sklearn
        normalized_matrix = normalize(tfidf_df.values, norm=norm)

        # Convertir de vuelta a DataFrame
        normalized_df = pd.DataFrame(
            normalized_matrix,
            index=tfidf_df.index,
            columns=tfidf_df.columns
        )

        logger.info("Matriz TF-IDF normalizada")

        return normalized_df

    def get_statistics(self, tfidf_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Calcula estadísticas de la matriz TF-IDF

        Args:
            tfidf_df: DataFrame TF-IDF

        Returns:
            Diccionario con estadísticas
        """
        stats = {
            'n_documents': tfidf_df.shape[0],
            'vocabulary_size': tfidf_df.shape[1],
            'sparsity': float(1.0 - (np.count_nonzero(tfidf_df.values) / (tfidf_df.shape[0] * tfidf_df.shape[1]))),
            'avg_tfidf_score': float(tfidf_df.values[tfidf_df.values > 0].mean()),
            'max_tfidf_score': float(tfidf_df.max().max()),
            'min_tfidf_score_nonzero': float(tfidf_df.values[tfidf_df.values > 0].min())
        }

        logger.info(f"Estadísticas TF-IDF: {stats['n_documents']} docs, {stats['vocabulary_size']} términos, esparsidad {stats['sparsity']:.2%}")

        return stats

    def get_top_terms(self, tfidf_df: pd.DataFrame, top_n: int = 20) -> List[tuple]:
        """
        Obtiene los términos con mayor score TF-IDF promedio

        Args:
            tfidf_df: DataFrame TF-IDF
            top_n: Número de términos a retornar

        Returns:
            Lista de tuplas (término, score_promedio)
        """
        # Sumar scores TF-IDF de cada término en todos los documentos
        term_scores = tfidf_df.sum(axis=0).sort_values(ascending=False)

        top_terms = [(term, float(score)) for term, score in term_scores.head(top_n).items()]

        logger.info(f"Top {top_n} términos TF-IDF calculados")

        return top_terms

    def get_document_top_terms(self, tfidf_df: pd.DataFrame, doc_name: str, top_n: int = 10) -> List[tuple]:
        """
        Obtiene los términos más relevantes de un documento específico

        Args:
            tfidf_df: DataFrame TF-IDF
            doc_name: Nombre del documento
            top_n: Número de términos a retornar

        Returns:
            Lista de tuplas (término, score_tfidf)
        """
        if doc_name not in tfidf_df.index:
            logger.warning(f"Documento {doc_name} no encontrado en la matriz TF-IDF")
            return []

        doc_scores = tfidf_df.loc[doc_name].sort_values(ascending=False)
        top_terms = [(term, float(score)) for term, score in doc_scores.head(top_n).items() if score > 0]

        return top_terms

    def get_vocabulary(self) -> List[str]:
        """
        Retorna el vocabulario (lista de términos)

        Returns:
            Lista de términos
        """
        return list(self.feature_names) if self.feature_names is not None else []

    def save_to_csv(self, tfidf_df: pd.DataFrame, filepath: str):
        """
        Guarda la matriz TF-IDF en un archivo CSV

        Args:
            tfidf_df: DataFrame TF-IDF
            filepath: Ruta donde guardar el archivo
        """
        tfidf_df.to_csv(filepath, index=True)
        logger.info(f"Matriz TF-IDF guardada en {filepath}")

    def get_term_importance_distribution(self, tfidf_df: pd.DataFrame) -> pd.Series:
        """
        Calcula la distribución de importancia de términos

        Args:
            tfidf_df: DataFrame TF-IDF

        Returns:
            Series con suma de scores TF-IDF por término
        """
        importance = tfidf_df.sum(axis=0).sort_values(ascending=False)
        return importance

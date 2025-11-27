"""
Analizador de Bolsa de Palabras (Bag of Words)
Crea matriz de frecuencias de términos por documento
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any
from collections import Counter
from sklearn.feature_extraction.text import CountVectorizer
from src.utils.logger import get_logger

logger = get_logger(__name__)


class BagOfWordsAnalyzer:
    """Clase para crear y analizar Bolsa de Palabras"""

    def __init__(self, config: Dict[str, Any] = None):
        """
        Inicializa el analizador BoW

        Args:
            config: Configuración para CountVectorizer (ngram_range, min_df, max_df, max_features)
        """
        self.config = config or {
            'ngram_range': (1, 2),  # unigramas y bigramas
            'min_df': 2,             # mínima frecuencia de documento
            'max_df': 0.85,          # máxima frecuencia de documento (85%)
            'max_features': 5000     # máximo número de características
        }

        self.vectorizer = CountVectorizer(
            ngram_range=self.config.get('ngram_range', (1, 2)),
            min_df=self.config.get('min_df', 2),
            max_df=self.config.get('max_df', 0.85),
            max_features=self.config.get('max_features', 5000),
            lowercase=False,  # Ya viene preprocesado en minúsculas
            stop_words=None,  # NO aplicar stopwords aquí (ya se aplicaron en preprocesamiento)
            token_pattern=r'\b[a-zA-Z]{2,}\b'  # solo palabras de 2+ letras
        )

        self.bow_matrix = None
        self.feature_names = None
        self.document_names = None

    def fit_transform(self, documents: Dict[str, str]) -> pd.DataFrame:
        """
        Crea la matriz de Bolsa de Palabras

        Args:
            documents: Diccionario {nombre_archivo: texto_preprocesado}

        Returns:
            DataFrame con matriz de frecuencias (filas=documentos, columnas=términos)
        """
        logger.info(f"Creando Bolsa de Palabras para {len(documents)} documentos...")

        # Preparar datos
        self.document_names = list(documents.keys())
        texts = list(documents.values())

        # Crear matriz BoW usando CountVectorizer
        logger.info("Aplicando CountVectorizer...")
        self.bow_matrix = self.vectorizer.fit_transform(texts)

        # Obtener nombres de características (términos)
        self.feature_names = self.vectorizer.get_feature_names_out()

        logger.info(f"Vocabulario creado: {len(self.feature_names)} términos únicos")

        # Convertir a DataFrame para mejor manejo
        bow_df = pd.DataFrame(
            self.bow_matrix.toarray(),
            index=self.document_names,
            columns=self.feature_names
        )

        logger.info(f"Matriz BoW creada: {bow_df.shape[0]} documentos x {bow_df.shape[1]} términos")

        return bow_df

    def get_statistics(self, bow_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Calcula estadísticas de la matriz BoW

        Args:
            bow_df: DataFrame de Bolsa de Palabras

        Returns:
            Diccionario con estadísticas
        """
        stats = {
            'n_documents': bow_df.shape[0],
            'vocabulary_size': bow_df.shape[1],
            'total_terms': int(bow_df.sum().sum()),
            'avg_terms_per_doc': float(bow_df.sum(axis=1).mean()),
            'sparsity': float(1.0 - (np.count_nonzero(bow_df.values) / (bow_df.shape[0] * bow_df.shape[1]))),
            'min_terms_doc': int(bow_df.sum(axis=1).min()),
            'max_terms_doc': int(bow_df.sum(axis=1).max())
        }

        logger.info(f"Estadísticas BoW: {stats['n_documents']} docs, {stats['vocabulary_size']} términos, esparsidad {stats['sparsity']:.2%}")

        return stats

    def get_top_terms(self, bow_df: pd.DataFrame, top_n: int = 20) -> List[tuple]:
        """
        Obtiene los términos más frecuentes

        Args:
            bow_df: DataFrame de Bolsa de Palabras
            top_n: Número de términos a retornar

        Returns:
            Lista de tuplas (término, frecuencia)
        """
        # Sumar frecuencias de cada término en todos los documentos
        term_frequencies = bow_df.sum(axis=0).sort_values(ascending=False)

        top_terms = [(term, int(freq)) for term, freq in term_frequencies.head(top_n).items()]

        logger.info(f"Top {top_n} términos más frecuentes calculados")

        return top_terms

    def get_term_document_frequency(self, bow_df: pd.DataFrame) -> pd.Series:
        """
        Calcula la frecuencia de documentos por término (cuántos documentos contienen cada término)

        Args:
            bow_df: DataFrame de Bolsa de Palabras

        Returns:
            Series con frecuencia de documentos por término
        """
        # Contar en cuántos documentos aparece cada término
        doc_freq = (bow_df > 0).sum(axis=0)

        return doc_freq

    def get_vocabulary(self) -> List[str]:
        """
        Retorna el vocabulario (lista de términos)

        Returns:
            Lista de términos
        """
        return list(self.feature_names) if self.feature_names is not None else []

    def save_to_csv(self, bow_df: pd.DataFrame, filepath: str):
        """
        Guarda la matriz BoW en un archivo CSV

        Args:
            bow_df: DataFrame de Bolsa de Palabras
            filepath: Ruta donde guardar el archivo
        """
        bow_df.to_csv(filepath, index=True)
        logger.info(f"Matriz BoW guardada en {filepath}")

    def get_document_summary(self, bow_df: pd.DataFrame, doc_name: str, top_n: int = 10) -> List[tuple]:
        """
        Obtiene los términos más frecuentes de un documento específico

        Args:
            bow_df: DataFrame de Bolsa de Palabras
            doc_name: Nombre del documento
            top_n: Número de términos a retornar

        Returns:
            Lista de tuplas (término, frecuencia)
        """
        if doc_name not in bow_df.index:
            logger.warning(f"Documento {doc_name} no encontrado en la matriz BoW")
            return []

        doc_terms = bow_df.loc[doc_name].sort_values(ascending=False)
        top_terms = [(term, int(freq)) for term, freq in doc_terms.head(top_n).items() if freq > 0]

        return top_terms

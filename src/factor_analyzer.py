"""
Módulo de Análisis de Factores Clave
Analiza y visualiza factores clave en transformación digital
"""

import pandas as pd
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.decomposition import LatentDirichletAllocation
from typing import Dict, List, Tuple, Optional, Union, Any
import re
import numpy as np
from src.utils.logger import get_logger

# Inicializar logger
logger = get_logger(__name__)


class AnalizadorFactores:
    """Clase para analizar factores clave en transformación digital"""

    def __init__(self) -> None:
        """Inicializa el analizador de factores"""
        logger.info("Inicializando AnalizadorFactores")

        # Definición de factores clave y sus categorías
        self.categorias_factores = {
            'Tecnológico': {
                'keywords': ['tecnología', 'digital', 'software', 'hardware', 'plataforma',
                             'sistema', 'aplicación', 'herramienta', 'infraestructura',
                             'nube', 'cloud', 'ia', 'inteligencia artificial',
                             'automatización'],
                'descripcion': 'Aspectos relacionados con tecnología e infraestructura digital'
            },
            'Organizacional': {
                'keywords': ['cultura', 'organización', 'estructura', 'liderazgo',
                             'gestión', 'cambio organizacional', 'procesos', 'gobernanza'],
                'descripcion': 'Factores relacionados con la organización y cultura institucional'
            },
            'Humano': {
                'keywords': ['capacitación', 'formación', 'competencias', 'habilidades',
                             'docente', 'profesor', 'estudiante', 'personal', 'talento',
                             'aprendizaje', 'conocimiento', 'entrenamiento'],
                'descripcion': 'Aspectos relacionados con desarrollo y capacitación del personal'
            },
            'Estratégico': {
                'keywords': ['estrategia', 'planificación', 'visión', 'misión', 'objetivo',
                             'meta', 'plan', 'política', 'directriz', 'innovación'],
                'descripcion': 'Elementos de planeación estratégica y dirección'
            },
            'Financiero': {
                'keywords': ['presupuesto', 'inversión', 'financiamiento', 'costo',
                             'recurso económico', 'funding', 'gasto', 'financiero'],
                'descripcion': 'Aspectos económicos y de inversión'
            },
            'Pedagógico': {
                'keywords': ['educación', 'enseñanza', 'aprendizaje', 'pedagógico',
                             'didáctico', 'metodología', 'curricular', 'académico',
                             'estudiante', 'alumno', 'evaluación'],
                'descripcion': 'Factores relacionados con procesos de enseñanza-aprendizaje'
            },
            'Infraestructura': {
                'keywords': ['conectividad', 'internet', 'red', 'banda ancha', 'acceso',
                             'equipamiento', 'dispositivo', 'laboratorio', 'campus'],
                'descripcion': 'Infraestructura física y de conectividad'
            },
            'Seguridad': {
                'keywords': ['seguridad', 'ciberseguridad', 'protección', 'privacidad',
                             'datos personales', 'backup', 'respaldo', 'cumplimiento'],
                'descripcion': 'Aspectos de seguridad y protección de datos'
            }
        }

        # Vectorizador TF-IDF para análisis avanzado
        self.vectorizer: TfidfVectorizer = TfidfVectorizer(max_features=100, ngram_range=(1, 2))

    def analizar_texto(self, texto: str) -> Dict[str, Any]:
        """
        Analiza un texto y extrae factores clave

        Args:
            texto: Texto a analizar

        Returns:
            Diccionario con análisis de factores
        """
        logger.debug(f"Analizando texto de {len(texto)} caracteres")
        texto_lower = texto.lower()
        factores_detectados: Dict[str, Any] = {}

        for categoria, info in self.categorias_factores.items():
            count = 0
            keywords_encontradas: List[Tuple[str, int]] = []

            for keyword in info['keywords']:
                if keyword in texto_lower:
                    ocurrencias = len(re.findall(r'\b' + re.escape(keyword) + r'\b', texto_lower))
                    count += ocurrencias
                    if ocurrencias > 0:
                        keywords_encontradas.append((keyword, ocurrencias))

            if count > 0:
                factores_detectados[categoria] = {
                    'total_menciones': count,
                    'keywords_encontradas': keywords_encontradas,
                    'relevancia': count / len(texto.split()) * 1000  # Normalizado
                }

        logger.info(f"Factores detectados: {len(factores_detectados)}")
        return factores_detectados

    def analizar_documentos(self, documentos_dict: Dict[str, str]) -> pd.DataFrame:
        """
        Analiza múltiples documentos

        Args:
            documentos_dict: Diccionario con nombre:texto

        Returns:
            DataFrame con análisis completo
        """
        logger.info(f"Analizando {len(documentos_dict)} documentos")
        resultados: List[Dict[str, Any]] = []

        for nombre, texto in documentos_dict.items():
            factores = self.analizar_texto(texto)

            # Crear registro para cada documento
            registro: Dict[str, Any] = {'documento': nombre}

            # Agregar conteo por categoría
            for categoria in self.categorias_factores.keys():
                if categoria in factores:
                    registro[f'{categoria}_menciones'] = factores[categoria]['total_menciones']
                    registro[f'{categoria}_relevancia'] = factores[categoria]['relevancia']
                else:
                    registro[f'{categoria}_menciones'] = 0
                    registro[f'{categoria}_relevancia'] = 0.0

            resultados.append(registro)

        logger.info(f"Análisis de documentos completado")
        return pd.DataFrame(resultados)

    def obtener_factores_principales(self, documentos_dict: Dict[str, str], top_n: int = 5) -> List[Tuple[str, int]]:
        """
        Obtiene los factores principales más mencionados

        Args:
            documentos_dict: Diccionario con documentos
            top_n: Número de factores principales a retornar

        Returns:
            Lista de factores ordenados por relevancia
        """
        logger.debug(f"Obteniendo top {top_n} factores principales")
        factores_totales: Counter[str] = Counter()

        for texto in documentos_dict.values():
            factores = self.analizar_texto(texto)
            for categoria, info in factores.items():
                factores_totales[categoria] += int(info['total_menciones'])

        return factores_totales.most_common(top_n)

    def analisis_tfidf(self, textos: List[str]) -> Tuple[Optional[Any], Optional[np.ndarray]]:
        """
        Realiza análisis TF-IDF de los textos

        Args:
            textos: Lista de textos

        Returns:
            Matriz TF-IDF y nombres de características
        """
        try:
            logger.debug(f"Realizando análisis TF-IDF de {len(textos)} textos")
            tfidf_matrix = self.vectorizer.fit_transform(textos)
            feature_names = self.vectorizer.get_feature_names_out()
            logger.info(f"Análisis TF-IDF completado: {tfidf_matrix.shape[0]} documentos, {tfidf_matrix.shape[1]} características")
            return tfidf_matrix, feature_names
        except Exception as e:
            logger.error(f"Error en análisis TF-IDF: {e}", exc_info=True)
            return None, None

    def clustering_documentos(self, textos: List[str], n_clusters: int = 3) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """
        Agrupa documentos en clusters

        Args:
            textos: Lista de textos
            n_clusters: Número de clusters

        Returns:
            Etiquetas de cluster y centroides
        """
        try:
            logger.debug(f"Iniciando clustering de {len(textos)} documentos en {n_clusters} clusters")
            tfidf_matrix, _ = self.analisis_tfidf(textos)
            if tfidf_matrix is not None:
                kmeans = KMeans(n_clusters=n_clusters, random_state=42)
                clusters = kmeans.fit_predict(tfidf_matrix)
                logger.info(f"Clustering completado: {n_clusters} clusters generados")
                return clusters, kmeans.cluster_centers_
            logger.warning("No se pudo generar matriz TF-IDF para clustering")
            return None, None
        except Exception as e:
            logger.error(f"Error en clustering de documentos: {e}", exc_info=True)
            return None, None

    def extraer_temas_lda(self, textos: List[str], n_topics: int = 5, n_words: int = 10) -> List[Dict[str, Union[str, List[str], List[float]]]]:
        """
        Extrae temas usando LDA (Latent Dirichlet Allocation)

        Args:
            textos: Lista de textos
            n_topics: Número de temas a extraer
            n_words: Número de palabras por tema

        Returns:
            Lista de temas con sus palabras principales
        """
        try:
            logger.debug(f"Extrayendo {n_topics} temas LDA de {len(textos)} textos ({n_words} palabras por tema)")
            tfidf_matrix, feature_names = self.analisis_tfidf(textos)
            if tfidf_matrix is not None and feature_names is not None:
                lda = LatentDirichletAllocation(n_components=n_topics, random_state=42)
                lda.fit(tfidf_matrix)

                temas = []
                for topic_idx, topic in enumerate(lda.components_):
                    top_indices = topic.argsort()[-n_words:][::-1]
                    top_words = [str(feature_names[i]) for i in top_indices]
                    temas.append({
                        'tema': f'Tema {topic_idx + 1}',
                        'palabras': top_words,
                        'peso': topic[top_indices].tolist()
                    })

                logger.info(f"Extracción LDA completada: {n_topics} temas extraídos")
                return temas

            logger.warning("No se pudo generar matriz TF-IDF para extracción de temas LDA")
            return []
        except Exception as e:
            logger.error(f"Error en extracción de temas LDA: {e}", exc_info=True)
            return []

    def obtener_resumen_factores(self, documentos_dict: Dict[str, str]) -> Dict[str, Any]:
        """
        Obtiene un resumen completo de factores

        Args:
            documentos_dict: Diccionario con documentos

        Returns:
            Diccionario con resumen estadístico
        """
        df_analisis = self.analizar_documentos(documentos_dict)

        resumen = {
            'total_documentos': len(documentos_dict),
            'factores_por_categoria': {},
            'factor_mas_mencionado': None,
            'factor_menos_mencionado': None
        }

        # Calcular totales por categoría
        for categoria in self.categorias_factores.keys():
            col_menciones = f'{categoria}_menciones'
            if col_menciones in df_analisis.columns:
                total = df_analisis[col_menciones].sum()
                promedio = df_analisis[col_menciones].mean()
                resumen['factores_por_categoria'][categoria] = {
                    'total_menciones': int(total),
                    'promedio_por_documento': float(promedio),
                    'descripcion': self.categorias_factores[categoria]['descripcion']
                }

        # Identificar factor más y menos mencionado
        totales = {cat: info['total_menciones']
                   for cat, info in resumen['factores_por_categoria'].items()}

        if totales:
            resumen['factor_mas_mencionado'] = max(totales, key=totales.get)
            resumen['factor_menos_mencionado'] = min(totales, key=totales.get)

        return resumen

    def obtener_keywords_por_factor(self, texto: str, factor: str) -> List[Tuple[str, int]]:
        """
        Obtiene las keywords encontradas para un factor específico

        Args:
            texto: Texto a analizar
            factor: Nombre del factor

        Returns:
            Lista de keywords encontradas con sus frecuencias
        """
        if factor not in self.categorias_factores:
            return []

        texto_lower = texto.lower()
        keywords_encontradas = []

        for keyword in self.categorias_factores[factor]['keywords']:
            count = len(re.findall(r'\b' + re.escape(keyword) + r'\b', texto_lower))
            if count > 0:
                keywords_encontradas.append((keyword, count))

        return sorted(keywords_encontradas, key=lambda x: x[1], reverse=True)

    def matriz_co_ocurrencia(self, documentos_dict: Dict[str, str]) -> pd.DataFrame:
        """
        Crea una matriz de co-ocurrencia de factores

        Args:
            documentos_dict: Diccionario con documentos

        Returns:
            DataFrame con matriz de co-ocurrencia
        """
        categorias = list(self.categorias_factores.keys())
        matriz = pd.DataFrame(0, index=categorias, columns=categorias)

        for texto in documentos_dict.values():
            factores = self.analizar_texto(texto)
            factores_presentes = list(factores.keys())

            # Incrementar co-ocurrencias
            for i, factor1 in enumerate(factores_presentes):
                for factor2 in factores_presentes[i:]:
                    matriz.loc[factor1, factor2] += 1
                    if factor1 != factor2:
                        matriz.loc[factor2, factor1] += 1

        return matriz

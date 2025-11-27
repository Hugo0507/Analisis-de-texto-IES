"""
Módulo de Preprocesamiento de Texto Avanzado
Limpieza, normalización y creación de bolsa de palabras
"""

import re
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.preprocessing import normalize
import nltk
from nltk.corpus import stopwords
from nltk.stem import SnowballStemmer
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from collections import defaultdict, Counter
from typing import Dict, List, Tuple, Set, Optional, Union, Any
from scipy.sparse import csr_matrix
from numpy.typing import NDArray
from src.utils.logger import get_logger

logger = get_logger(__name__)


class TextPreprocessor:
    """Clase para preprocesamiento avanzado de texto"""

    def __init__(self, language: str = 'english', use_global_stopwords: bool = True) -> None:
        """
        Inicializa el preprocesador

        Args:
            language: Idioma para procesamiento
            use_global_stopwords: Si True, usa stopwords globales del PipelineConfig
        """
        self.language: str = language
        self.use_global_stopwords: bool = use_global_stopwords
        self.stop_words: Set[str] = set()
        self.stemmer: Optional[SnowballStemmer] = None
        self.lemmatizer: Optional[WordNetLemmatizer] = None
        self.document_word_bags: defaultdict[str, Counter[str]] = defaultdict(Counter)
        self.cleaning_stats: Dict[str, Union[int, float]] = {}

        # Descargar recursos NLTK SOLO si no están instalados (optimización de performance)
        self._ensure_nltk_resources()

    def _ensure_nltk_resources(self) -> None:
        """
        Verifica y descarga recursos NLTK SOLO si no están instalados
        Optimización: evita descargas innecesarias en cada instanciación
        """
        recursos_necesarios = {
            'tokenizers/punkt': 'punkt',
            'corpora/stopwords': 'stopwords',
            'tokenizers/punkt_tab': 'punkt_tab',
            'corpora/wordnet': 'wordnet',
            'corpora/omw-1.4': 'omw-1.4'
        }

        for ruta, nombre in recursos_necesarios.items():
            try:
                nltk.data.find(ruta)
                # Recurso ya existe, no hacer nada
            except LookupError:
                # Recurso no existe, descargarlo
                try:
                    nltk.download(nombre, quiet=True)
                except Exception:
                    # Si falla la descarga, continuar (no es crítico)
                    pass

        # Stopwords - Usar stopwords globales del PipelineConfig si está activado
        if self.use_global_stopwords:
            try:
                from src.pipeline_config import PipelineConfig
                self.stop_words = PipelineConfig.GLOBAL_STOPWORDS.copy()
                logger.info(f"Cargadas {len(self.stop_words)} stopwords globales desde PipelineConfig")
            except ImportError:
                logger.warning("No se pudo importar PipelineConfig, cargando stopwords locales")
                self._load_local_stopwords()
        else:
            self._load_local_stopwords()

    def _load_local_stopwords(self) -> None:
        """Carga stopwords locales (fallback si no se puede usar GLOBAL_STOPWORDS)"""
        self.stop_words = set()
        try:
            # Cargar stopwords en inglés
            stop_words_english = set(stopwords.words('english'))
            self.stop_words = self.stop_words.union(stop_words_english)
        except Exception:
            pass

        try:
            # Cargar stopwords en español
            stop_words_spanish = set(stopwords.words('spanish'))
            self.stop_words = self.stop_words.union(stop_words_spanish)
        except Exception:
            pass

        # Palabras adicionales a eliminar (versión reducida para evitar eliminar TODO)
        extra_stopwords = {
            "de", "al", "en", "la", "et", "a", "b", "c", "d", "e", "f",
            "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s",
            "t", "u", "v", "w", "x", "y", "z",
            "con", "del", "para", "el", "los", "una", "un", "sobre", "y",
            "doi", "pp", "http", "https", "www", "url"
        }

        # Unir las stopwords estándar con las adicionales
        self.stop_words.update(extra_stopwords)

        # Stemmer
        try:
            self.stemmer = SnowballStemmer(self.language)
        except Exception:
            self.stemmer = None

        # Lemmatizer
        try:
            self.lemmatizer = WordNetLemmatizer()
        except Exception:
            self.lemmatizer = None

        # Bolsas de palabras por documento
        self.document_word_bags = defaultdict(Counter)

        # Estadísticas de limpieza
        self.cleaning_stats = {
            'total_documents': 0,
            'total_chars_before': 0,
            'total_chars_after': 0,
            'total_words_before': 0,
            'total_words_after': 0,
            'reduction_percentage': 0
        }

    def clean_text_basic(self, text: str) -> str:
        """
        Limpieza básica de texto

        Args:
            text: Texto a limpiar

        Returns:
            Texto limpio
        """
        if not text or not isinstance(text, str):
            return ""

        # Convertir a minúsculas
        text = text.lower()

        # Remover URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)

        # Remover emails
        text = re.sub(r'\S+@\S+', '', text)

        # Remover menciones y hashtags
        text = re.sub(r'@\w+', '', text)
        text = re.sub(r'#\w+', '', text)

        # Remover números (opcional)
        # text = re.sub(r'\d+', '', text)

        # Remover caracteres especiales pero mantener espacios y puntos
        text = re.sub(r'[^\w\s\.]', ' ', text)

        # Remover espacios múltiples
        text = re.sub(r'\s+', ' ', text)

        # Remover espacios al inicio y final
        text = text.strip()

        return text

    def clean_text_advanced(self, text: str) -> str:
        """
        Limpieza avanzada de texto

        Args:
            text: Texto a limpiar

        Returns:
            Texto limpio
        """
        # Limpieza básica primero
        text = self.clean_text_basic(text)

        # Remover líneas muy cortas (menos de 3 palabras)
        lines = text.split('\n')
        lines = [line for line in lines if len(line.split()) >= 3]
        text = ' '.join(lines)

        # Remover palabras muy cortas (menos de 2 caracteres)
        words = text.split()
        words = [w for w in words if len(w) >= 2]
        text = ' '.join(words)

        # Remover palabras muy largas (más de 20 caracteres - probablemente errores)
        words = text.split()
        words = [w for w in words if len(w) <= 20]
        text = ' '.join(words)

        return text

    def remove_stopwords(self, text: str) -> str:
        """
        Remueve stopwords del texto

        Args:
            text: Texto a procesar

        Returns:
            Texto sin stopwords
        """
        if not self.stop_words:
            return text

        words = text.split()
        words_filtered = [w for w in words if w not in self.stop_words]

        return ' '.join(words_filtered)

    def apply_stemming(self, text: str) -> str:
        """
        Aplica stemming al texto

        Args:
            text: Texto a procesar

        Returns:
            Texto con stemming aplicado
        """
        if not self.stemmer:
            return text

        words = text.split()
        words_stemmed = [self.stemmer.stem(w) for w in words]

        return ' '.join(words_stemmed)

    # ==================== NUEVOS MÉTODOS ESPECIALIZADOS ====================

    def tokenizar_texto(self, text: str) -> List[str]:
        """
        Tokeniza el texto en palabras individuales

        Args:
            text: Texto a tokenizar

        Returns:
            Lista de tokens
        """
        if not text or not isinstance(text, str):
            return []

        try:
            # Usar NLTK word_tokenize
            tokens = word_tokenize(text.lower())
            # Filtrar tokens que solo contienen letras y tienen al menos 2 caracteres
            tokens = [token for token in tokens if token.isalpha() and len(token) >= 2]
            return tokens
        except Exception:
            # Fallback: tokenización simple
            tokens = text.lower().split()
            tokens = [token for token in tokens if token.isalpha() and len(token) >= 2]
            return tokens

    def eliminar_stopwords_tokens(self, tokens: List[str]) -> List[str]:
        """
        Elimina stopwords de una lista de tokens

        Args:
            tokens: Lista de tokens

        Returns:
            Lista de tokens sin stopwords
        """
        if not tokens:
            return []

        if not self.stop_words:
            return tokens

        return [token for token in tokens if token not in self.stop_words]

    def aplicar_stemming_tokens(self, tokens: List[str]) -> List[str]:
        """
        Aplica stemming a una lista de tokens

        Args:
            tokens: Lista de tokens

        Returns:
            Lista de tokens con stemming aplicado
        """
        if not tokens:
            return []

        if not self.stemmer:
            return tokens

        return [self.stemmer.stem(token) for token in tokens]

    def lematizar_tokens(self, tokens: List[str]) -> List[str]:
        """
        Aplica lematización a una lista de tokens

        Args:
            tokens: Lista de tokens

        Returns:
            Lista de tokens lematizados
        """
        if not tokens:
            return []

        if not self.lemmatizer:
            return tokens

        return [self.lemmatizer.lemmatize(token) for token in tokens]

    def crear_bolsa_palabras_documento(self, tokens: List[str], document_id: str) -> Counter[str]:
        """
        Crea una bolsa de palabras para un documento específico

        Args:
            tokens: Lista de tokens del documento
            document_id: ID o nombre del documento

        Returns:
            Counter con frecuencias de palabras
        """
        # Actualizar la bolsa de palabras para el documento actual
        self.document_word_bags[document_id].update(tokens)
        return self.document_word_bags[document_id]

    def obtener_bolsa_palabras_global(self) -> Counter[str]:
        """
        Obtiene la bolsa de palabras global combinando todos los documentos

        Returns:
            Counter con frecuencias totales de todas las palabras
        """
        global_bag: Counter[str] = Counter()
        for doc_bag in self.document_word_bags.values():
            global_bag.update(doc_bag)
        return global_bag

    def obtener_estadisticas_bolsas(self) -> Dict[str, Union[int, float]]:
        """
        Obtiene estadísticas de las bolsas de palabras

        Returns:
            Diccionario con estadísticas
        """
        if not self.document_word_bags:
            return {
                'total_documents': 0,
                'total_unique_words': 0,
                'total_words': 0,
                'avg_words_per_doc': 0
            }

        global_bag = self.obtener_bolsa_palabras_global()

        total_words = sum(global_bag.values())
        unique_words = len(global_bag)
        total_docs = len(self.document_word_bags)
        avg_words = total_words / total_docs if total_docs > 0 else 0

        return {
            'total_documents': total_docs,
            'total_unique_words': unique_words,
            'total_words': total_words,
            'avg_words_per_doc': round(avg_words, 2)
        }

    def obtener_top_palabras_documento(self, document_id: str, top_n: int = 20) -> List[Tuple[str, int]]:
        """
        Obtiene las palabras más frecuentes de un documento

        Args:
            document_id: ID del documento
            top_n: Número de palabras a retornar

        Returns:
            Lista de tuplas (palabra, frecuencia)
        """
        if document_id not in self.document_word_bags:
            return []

        return self.document_word_bags[document_id].most_common(top_n)

    def obtener_top_palabras_global(self, top_n: int = 20) -> List[Tuple[str, int]]:
        """
        Obtiene las palabras más frecuentes globalmente

        Args:
            top_n: Número de palabras a retornar

        Returns:
            Lista de tuplas (palabra, frecuencia)
        """
        global_bag = self.obtener_bolsa_palabras_global()
        return global_bag.most_common(top_n)

    def procesar_texto_completo(self, text: str, document_id: str,
                                 remove_stopwords: bool = True,
                                 apply_stemming: bool = False,
                                 apply_lemmatization: bool = False) -> Dict[str, Union[str, List[str], int, Counter[str], List[Tuple[str, int]]]]:
        """
        Procesa un texto completo siguiendo la secuencia:
        1. Limpieza básica
        2. Tokenización
        3. Eliminación de stopwords (opcional)
        4. Stemming o Lematización (opcional)
        5. Creación de bolsa de palabras

        Args:
            text: Texto a procesar
            document_id: ID del documento
            remove_stopwords: Si True, elimina stopwords
            apply_stemming: Si True, aplica stemming
            apply_lemmatization: Si True, aplica lematización

        Returns:
            Diccionario con resultados del procesamiento
        """
        # 1. Limpieza básica
        texto_limpio = self.clean_text_basic(text)

        # 2. Tokenización
        tokens = self.tokenizar_texto(texto_limpio)
        tokens_originales = len(tokens)

        # 3. Eliminación de stopwords
        if remove_stopwords:
            tokens = self.eliminar_stopwords_tokens(tokens)

        # 4. Stemming o Lematización (solo uno)
        if apply_lemmatization:
            tokens = self.lematizar_tokens(tokens)
        elif apply_stemming:
            tokens = self.aplicar_stemming_tokens(tokens)

        # 5. Crear bolsa de palabras
        bolsa = self.crear_bolsa_palabras_documento(tokens, document_id)

        return {
            'document_id': document_id,
            'tokens': tokens,
            'token_count': len(tokens),
            'original_token_count': tokens_originales,
            'unique_words': len(bolsa),
            'word_bag': bolsa,
            'top_words': bolsa.most_common(10)
        }

    def procesar_batch_completo(self, texts_dict: Dict[str, str],
                                 remove_stopwords: bool = True,
                                 apply_stemming: bool = False,
                                 apply_lemmatization: bool = False) -> Dict[str, Any]:
        """
        Procesa múltiples textos siguiendo el flujo completo

        Args:
            texts_dict: Diccionario {nombre: texto}
            remove_stopwords: Si True, elimina stopwords
            apply_stemming: Si True, aplica stemming
            apply_lemmatization: Si True, aplica lematización

        Returns:
            Diccionario con resultados de todos los documentos
        """
        # Limpiar bolsas anteriores
        self.document_word_bags = defaultdict(Counter)

        results = {}

        for doc_name, text in texts_dict.items():
            result = self.procesar_texto_completo(
                text, doc_name,
                remove_stopwords=remove_stopwords,
                apply_stemming=apply_stemming,
                apply_lemmatization=apply_lemmatization
            )
            results[doc_name] = result

        # Agregar estadísticas globales
        global_stats = self.obtener_estadisticas_bolsas()

        return {
            'documents': results,
            'global_stats': global_stats,
            'global_bag': self.obtener_bolsa_palabras_global(),
            'top_global_words': self.obtener_top_palabras_global(20)
        }

    # ==================== FIN NUEVOS MÉTODOS ====================

    def preprocess_text(self, text: str, remove_stopwords: bool = True, apply_stemming: bool = False) -> Dict[str, Union[str, int, float, bool]]:
        """
        Preprocesa un texto completo

        Args:
            text: Texto a procesar
            remove_stopwords: Si True, remueve stopwords
            apply_stemming: Si True, aplica stemming

        Returns:
            Diccionario con resultados del preprocesamiento
        """
        original_text = text
        original_length = len(text)
        original_word_count = len(text.split())

        # Limpieza avanzada
        cleaned_text = self.clean_text_advanced(text)

        # Remover stopwords si se solicita
        if remove_stopwords:
            cleaned_text = self.remove_stopwords(cleaned_text)

        # Aplicar stemming si se solicita
        if apply_stemming:
            cleaned_text = self.apply_stemming(cleaned_text)

        final_length = len(cleaned_text)
        final_word_count = len(cleaned_text.split())

        if original_length > 0:
            reduction = ((original_length - final_length) /
                         original_length * 100)
        else:
            reduction = 0

        return {
            'original_text': original_text,
            'cleaned_text': cleaned_text,
            'original_length': original_length,
            'cleaned_length': final_length,
            'original_words': original_word_count,
            'cleaned_words': final_word_count,
            'reduction_percentage': round(reduction, 2),
            'stopwords_removed': remove_stopwords,
            'stemming_applied': apply_stemming
        }

    def preprocess_batch(self, texts_dict: Dict[str, str], remove_stopwords: bool = True, apply_stemming: bool = False) -> Dict[str, Dict[str, Union[str, int, float, bool]]]:
        """
        Preprocesa múltiples textos

        Args:
            texts_dict: Diccionario {nombre: texto}
            remove_stopwords: Si True, remueve stopwords
            apply_stemming: Si True, aplica stemming

        Returns:
            Diccionario con textos procesados y estadísticas
        """
        results = {}
        all_stats = []

        for name, text in texts_dict.items():
            result = self.preprocess_text(text, remove_stopwords, apply_stemming)
            results[name] = result
            all_stats.append(result)

        # Calcular estadísticas globales
        self.cleaning_stats = {
            'total_documents': len(texts_dict),
            'total_chars_before': sum(int(r['original_length']) for r in all_stats),
            'total_chars_after': sum(int(r['cleaned_length']) for r in all_stats),
            'total_words_before': sum(int(r['original_words']) for r in all_stats),
            'total_words_after': sum(int(r['cleaned_words']) for r in all_stats),
            'avg_reduction_percentage': round(
                sum(float(r['reduction_percentage']) for r in all_stats) / len(all_stats), 2
            ) if all_stats else 0
        }

        return results

    def create_bag_of_words(self, texts: Union[List[str], Dict[str, str]], max_features: int = 1000, min_df: int = 1,
                            max_df: float = 1.0, ngram_range: Tuple[int, int] = (1, 1)) -> Optional[Dict[str, Any]]:
        """
        Crea bolsa de palabras (Bag of Words)

        Args:
            texts: Lista de textos o diccionario {nombre: texto}
            max_features: Número máximo de features
            min_df: Frecuencia mínima de documento
            max_df: Frecuencia máxima de documento
            ngram_range: Rango de n-gramas (ej: (1,2) para uni y bigramas)

        Returns:
            Diccionario con matriz BoW, vectorizador y vocabulario
        """
        # Preparar textos
        if isinstance(texts, dict):
            doc_names = list(texts.keys())
            text_list = list(texts.values())
        else:
            doc_names = [f'doc_{i}' for i in range(len(texts))]
            text_list = texts

        # Crear vectorizador
        vectorizer = CountVectorizer(
            max_features=max_features,
            min_df=min_df,
            max_df=max_df,
            ngram_range=ngram_range
        )

        try:
            # Crear matriz
            bow_matrix = vectorizer.fit_transform(text_list)

            # Obtener vocabulario
            vocabulary = vectorizer.get_feature_names_out()

            # Crear DataFrame
            bow_df = pd.DataFrame(
                bow_matrix.toarray(),
                columns=vocabulary,
                index=doc_names
            )

            return {
                'matrix': bow_matrix,
                'dataframe': bow_df,
                'vectorizer': vectorizer,
                'vocabulary': vocabulary,
                'vocabulary_size': len(vocabulary),
                'document_count': len(text_list),
                'total_terms': bow_matrix.sum(),
                'sparse_matrix': bow_matrix
            }

        except Exception as e:
            logger.error(f"Error creando Bag of Words: {e}", exc_info=True)
            return None

    def create_tfidf_from_bow(self, bow_result: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Crea matriz TF-IDF a partir de Bolsa de Palabras (estilo Colab)

        Este método replica exactamente el cálculo de Colab:
        - TF = frecuencia del término / total de términos en el documento
        - IDF = log(número de documentos / número de documentos con el término)
        - TF-IDF = TF × IDF

        Args:
            bow_result: Resultado de create_bag_of_words con la matriz BoW

        Returns:
            Diccionario con matriz TF-IDF y estadísticas
        """
        if not bow_result or 'dataframe' not in bow_result:
            logger.error("Se requiere un resultado válido de create_bag_of_words para crear TF-IDF")
            return None

        # Obtener la matriz BoW como DataFrame
        BoW = bow_result['dataframe']

        # 1. Calcular TF (Term Frequency)
        # TF = frecuencia del término / total de términos en el documento
        tf = BoW.div(BoW.sum(axis=1), axis=0)

        # 2. Calcular IDF (Inverse Document Frequency)
        num_documentos = BoW.shape[0]
        # Contar en cuántos documentos aparece cada término
        df = (BoW > 0).sum(axis=0)
        # IDF = log(número de documentos / documentos con el término)
        idf = np.log(num_documentos / df.replace(0, 1))

        # 3. Calcular TF-IDF = TF × IDF
        tfidf_matrix = tf * idf

        # Reemplazar NaN con 0
        tfidf_matrix = tfidf_matrix.fillna(0)

        # Obtener términos más importantes por documento
        top_terms_per_doc = {}
        for doc_name in tfidf_matrix.index:
            doc_scores = tfidf_matrix.loc[doc_name]
            top_terms = doc_scores.nlargest(10)
            top_terms_per_doc[doc_name] = top_terms.to_dict()

        # Convertir a matriz sparse para compatibilidad
        from scipy.sparse import csr_matrix
        sparse_matrix = csr_matrix(tfidf_matrix.values)

        return {
            'matrix': sparse_matrix,
            'dataframe': tfidf_matrix,
            'vocabulary': tfidf_matrix.columns.tolist(),
            'vocabulary_size': len(tfidf_matrix.columns),
            'document_count': len(tfidf_matrix),
            'top_terms_per_doc': top_terms_per_doc,
            'sparse_matrix': sparse_matrix,
            'tf_matrix': tf,
            'idf_values': idf,
            'method': 'colab_style'  # Indicador del método usado
        }

    def create_tfidf_matrix(self, texts: Union[List[str], Dict[str, str]], max_features: int = 1000, min_df: int = 1,
                            max_df: float = 1.0, ngram_range: Tuple[int, int] = (1, 1)) -> Optional[Dict[str, Any]]:
        """
        Crea matriz TF-IDF usando sklearn (método original)

        Args:
            texts: Lista de textos o diccionario {nombre: texto}
            max_features: Número máximo de features
            min_df: Frecuencia mínima de documento
            max_df: Frecuencia máxima de documento
            ngram_range: Rango de n-gramas

        Returns:
            Diccionario con matriz TF-IDF, vectorizador y vocabulario
        """
        # Preparar textos
        if isinstance(texts, dict):
            doc_names = list(texts.keys())
            text_list = list(texts.values())
        else:
            doc_names = [f'doc_{i}' for i in range(len(texts))]
            text_list = texts

        # Validar textos antes de crear vectorizador
        non_empty_texts = [t for t in text_list if t and t.strip()]
        if len(non_empty_texts) == 0:
            logger.error("Todos los textos proporcionados están vacíos, no se puede crear TF-IDF")
            return None

        # Calcular vocabulario único total
        all_words = set()
        for text in non_empty_texts:
            all_words.update(text.split())

        total_unique_words = len(all_words)
        logger.info(f"Vocabulario único total: {total_unique_words} palabras")

        # Ajustar max_features si es necesario
        effective_max_features = min(max_features, total_unique_words) if max_features else total_unique_words

        # Crear vectorizador
        vectorizer = TfidfVectorizer(
            max_features=effective_max_features if effective_max_features > 0 else None,
            min_df=min_df,
            max_df=max_df,
            ngram_range=ngram_range
        )

        try:
            # Crear matriz
            tfidf_matrix = vectorizer.fit_transform(text_list)

            # Obtener vocabulario
            vocabulary = vectorizer.get_feature_names_out()

            # Validar que hay suficiente vocabulario
            if len(vocabulary) == 0:
                logger.error(f"No se generó ningún término en el vocabulario. Parámetros: min_df={min_df}, max_df={max_df}, max_features={max_features}")
                return None

            if len(vocabulary) < 10:
                logger.warning(f"Solo se generaron {len(vocabulary)} términos. Considera reducir min_df o aumentar max_df")

            # Crear DataFrame
            tfidf_df = pd.DataFrame(
                tfidf_matrix.toarray(),
                columns=vocabulary,
                index=doc_names
            )

            # Aplicar normalización L2 (como en Colab)
            tfidf_normalized = normalize(tfidf_matrix, norm='l2')

            # Crear DataFrame normalizado
            tfidf_normalized_df = pd.DataFrame(
                tfidf_normalized,
                columns=vocabulary,
                index=doc_names
            )

            # Obtener términos más importantes por documento
            top_terms_per_doc = {}
            for idx, doc_name in enumerate(doc_names):
                doc_scores = tfidf_normalized_df.iloc[idx]
                top_terms = doc_scores.nlargest(10)
                top_terms_per_doc[doc_name] = top_terms.to_dict()

            return {
                'matrix': tfidf_matrix,
                'dataframe': tfidf_df,
                'normalized_matrix': tfidf_normalized,
                'normalized_dataframe': tfidf_normalized_df,
                'vectorizer': vectorizer,
                'vocabulary': vocabulary,
                'vocabulary_size': len(vocabulary),
                'document_count': len(text_list),
                'top_terms_per_doc': top_terms_per_doc,
                'sparse_matrix': tfidf_matrix
            }

        except Exception as e:
            logger.error(f"Error creando TF-IDF: {e}", exc_info=True)
            return None

    def get_top_terms_global(self, bow_result: Optional[Dict[str, Any]], top_n: int = 20) -> Optional[pd.DataFrame]:
        """
        Obtiene los términos más frecuentes globalmente

        Args:
            bow_result: Resultado de create_bag_of_words
            top_n: Número de términos a retornar

        Returns:
            DataFrame con términos más frecuentes
        """
        if not bow_result:
            return None

        # Sumar frecuencias por término
        term_frequencies = bow_result['dataframe'].sum(axis=0)
        top_terms = term_frequencies.nlargest(top_n)

        df = pd.DataFrame({
            'Término': top_terms.index,
            'Frecuencia': top_terms.values
        })

        return df

    def get_top_tfidf_terms(self, tfidf_result: Optional[Dict[str, Any]], top_n: int = 20, use_normalized: bool = True) -> Optional[pd.DataFrame]:
        """
        Obtiene los términos con mayor TF-IDF (suma total como en Colab)

        Args:
            tfidf_result: Resultado de create_tfidf_matrix o create_tfidf_from_bow
            top_n: Número de términos a retornar
            use_normalized: Si True, usa la matriz normalizada L2 (solo para método sklearn)

        Returns:
            DataFrame con términos más importantes
        """
        if not tfidf_result:
            return None

        # Detectar método usado
        method = tfidf_result.get('method', 'sklearn')

        if method == 'colab_style':
            # Para método Colab, usar directamente la matriz TF-IDF sin normalización
            df_to_use = tfidf_result['dataframe']
            label = 'TF-IDF Score (Total)'
        else:
            # Para método sklearn, usar normalización si está disponible
            if use_normalized and 'normalized_dataframe' in tfidf_result:
                df_to_use = tfidf_result['normalized_dataframe']
                label = 'TF-IDF Score (Normalizado)'
            else:
                df_to_use = tfidf_result['dataframe']
                label = 'TF-IDF Score'

        # Sumar los valores TF-IDF a través de TODOS los documentos (como en Colab)
        # Esto considera tanto frecuencia como magnitud
        term_importance = df_to_use.sum(axis=0).sort_values(ascending=False)
        top_terms = term_importance.head(top_n)

        df = pd.DataFrame({
            'Término': top_terms.index,
            label: top_terms.values
        })

        return df

    def get_tfidf_heatmap_data(self, tfidf_result: Optional[Dict[str, Any]], top_n: int = 20, use_normalized: bool = True) -> Optional[pd.DataFrame]:
        """
        Prepara datos para mapa de calor de términos más relevantes (como en Colab)

        Args:
            tfidf_result: Resultado de create_tfidf_matrix o create_tfidf_from_bow
            top_n: Número de términos más relevantes a incluir
            use_normalized: Si True, usa la matriz normalizada L2 (solo para método sklearn)

        Returns:
            DataFrame filtrado con top N términos para heatmap
        """
        if not tfidf_result:
            return None

        # Detectar método usado
        method = tfidf_result.get('method', 'sklearn')

        if method == 'colab_style':
            # Para método Colab, usar directamente la matriz TF-IDF
            df_to_use = tfidf_result['dataframe']
        else:
            # Para método sklearn, usar normalización si está disponible
            if use_normalized and 'normalized_dataframe' in tfidf_result:
                df_to_use = tfidf_result['normalized_dataframe']
            else:
                df_to_use = tfidf_result['dataframe']

        # Sumar los valores TF-IDF para cada término
        importancia_terminos = df_to_use.sum().sort_values(ascending=False)

        # Seleccionar los top N términos más relevantes
        top_n_terminos = importancia_terminos.head(top_n).index

        # Filtrar la matriz TF-IDF para incluir solo estos términos
        heatmap_df = df_to_use[top_n_terminos]

        return heatmap_df

    def create_preprocessing_report(self, preprocessing_results: Dict[str, Dict[str, Union[str, int, float, bool]]]) -> pd.DataFrame:
        """
        Crea reporte de preprocesamiento

        Args:
            preprocessing_results: Resultados de preprocess_batch

        Returns:
            DataFrame con reporte
        """
        data = []

        for doc_name, result in preprocessing_results.items():
            data.append({
                'Documento': doc_name,
                'Palabras Originales': result['original_words'],
                'Palabras Limpias': result['cleaned_words'],
                'Caracteres Originales': result['original_length'],
                'Caracteres Limpios': result['cleaned_length'],
                'Reducción (%)': result['reduction_percentage'],
                'Stopwords Removidas': 'Sí' if result['stopwords_removed'] else 'No',
                'Stemming Aplicado': 'Sí' if result['stemming_applied'] else 'No'
            })

        return pd.DataFrame(data)

    def get_cleaning_statistics(self) -> Dict[str, Union[int, float]]:
        """
        Obtiene estadísticas de limpieza

        Returns:
            Diccionario con estadísticas
        """
        return self.cleaning_stats.copy()

    def analyze_vocabulary_overlap(self, bow_result: Optional[Dict[str, Any]]) -> Optional[Dict[str, Union[int, float, List[str], Dict[str, int]]]]:
        """
        Analiza solapamiento de vocabulario entre documentos

        Args:
            bow_result: Resultado de create_bag_of_words

        Returns:
            Diccionario con análisis
        """
        if not bow_result:
            return None

        df = bow_result['dataframe']
        doc_names = df.index.tolist()

        # Términos únicos por documento
        unique_terms = {}
        for doc in doc_names:
            terms_in_doc = df.loc[doc][df.loc[doc] > 0].index.tolist()
            unique_terms[doc] = set(terms_in_doc)

        # Términos comunes a todos los documentos
        common_terms = set.intersection(*unique_terms.values()) if unique_terms else set()

        # Términos totales únicos
        all_terms = set.union(*unique_terms.values()) if unique_terms else set()

        overlap_pct = (round((len(common_terms) / len(all_terms) * 100), 2)
                       if all_terms else 0)

        return {
            'total_unique_terms': len(all_terms),
            'common_terms': len(common_terms),
            'common_terms_list': list(common_terms),
            'terms_per_document': {doc: len(terms)
                                   for doc, terms in unique_terms.items()},
            'overlap_percentage': overlap_pct
        }

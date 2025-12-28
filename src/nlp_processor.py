import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.stem import SnowballStemmer
from collections import Counter
from typing import Dict, List, Tuple, Set, Union, Optional, Counter as CounterType
import pandas as pd
from src.utils.logger import get_logger

# Inicializar logger
logger = get_logger(__name__)


def descargar_recursos_nltk() -> None:
   
    recursos_necesarios = {
        'tokenizers/punkt': 'punkt',
        'corpora/stopwords': 'stopwords',
        'tokenizers/punkt_tab': 'punkt_tab'
    }

    for ruta, nombre in recursos_necesarios.items():
        try:
            nltk.data.find(ruta)
            logger.debug(f"Recurso NLTK '{nombre}' ya está instalado")
        except LookupError:
            logger.info(f"Descargando recurso NLTK: {nombre}")
            try:
                nltk.download(nombre, quiet=True)
                logger.info(f"Recurso '{nombre}' descargado exitosamente")
            except Exception as e:
                logger.error(f"Error descargando recurso NLTK '{nombre}': {e}")


class ProcessadorTexto:
    

    def __init__(self, idioma: str = 'spanish') -> None:
       
        self.idioma: str = idioma
        logger.info(f"Inicializando ProcessadorTexto con idioma: {idioma}")
        descargar_recursos_nltk()

        # Stopwords personalizadas para el dominio
        self.stop_words: Set[str] = set(stopwords.words(idioma))
        self.stop_words.update(['además', 'así', 'puede', 'debe', 'hacer', 'ser', 'estar'])

        # Stemmer para reducir palabras a su raíz
        self.stemmer: SnowballStemmer = SnowballStemmer(idioma)

        # Palabras clave relacionadas con transformación digital
        self.palabras_clave_transformacion = {
            'tecnología': ['tecnología', 'tecnológica', 'tecnológico', 'digital', 'digitalización'],
            'innovación': ['innovación', 'innovar', 'innovador', 'innovadora'],
            'datos': ['datos', 'data', 'información', 'analítica'],
            'infraestructura': ['infraestructura', 'plataforma', 'sistema', 'red'],
            'capacitación': ['capacitación', 'formación', 'entrenamiento', 'aprendizaje'],
            'estrategia': ['estrategia', 'estratégico', 'planeación', 'planificación'],
            'cultura': ['cultura', 'cultural', 'organizacional', 'cambio'],
            'inteligencia_artificial': ['inteligencia artificial', 'ia',
                                        'machine learning',
                                        'aprendizaje automático'],
            'nube': ['nube', 'cloud', 'saas', 'paas'],
            'ciberseguridad': ['seguridad', 'ciberseguridad', 'protección', 'privacidad'],
            'conectividad': ['conectividad', 'internet', 'banda ancha', 'acceso'],
            'colaboración': ['colaboración', 'colaborativo', 'trabajo en equipo'],
        }

    def limpiar_texto(self, texto: str) -> str:
        
        if not texto or not isinstance(texto, str):
            logger.warning("Texto vacío o tipo inválido recibido en limpiar_texto")
            return ""

        # Convertir a minúsculas
        texto = texto.lower()

        # Remover URLs
        texto = re.sub(r'http\S+|www\S+', '', texto)

        # Remover emails
        texto = re.sub(r'\S+@\S+', '', texto)

        # Remover números (opcional, comentar si se necesitan)
        # texto = re.sub(r'\d+', '', texto)

        # Remover caracteres especiales pero mantener espacios
        texto = re.sub(r'[^\w\s]', ' ', texto)

        # Remover espacios múltiples
        texto = re.sub(r'\s+', ' ', texto)

        return texto.strip()

    def tokenizar(self, texto: str) -> List[str]:
        
        try:
            return word_tokenize(texto, language=self.idioma)
        except Exception as e:
            logger.error(f"Error tokenizando texto: {e}")
            return []

    def remover_stopwords(self, tokens: List[str]) -> List[str]:
        
        return [token for token in tokens if token not in self.stop_words and len(token) > 2]

    def aplicar_stemming(self, tokens: List[str]) -> List[str]:
        
        return [self.stemmer.stem(token) for token in tokens]

    def procesar_texto_completo(self, texto: str) -> Dict[str, Union[str, List[str], Counter[str], int]]:
        
        logger.debug(f"Procesando texto de {len(texto)} caracteres")

        # Limpiar
        texto_limpio = self.limpiar_texto(texto)

        # Tokenizar
        tokens = self.tokenizar(texto_limpio)

        # Remover stopwords
        tokens_filtrados = self.remover_stopwords(tokens)

        # Aplicar stemming
        tokens_stem = self.aplicar_stemming(tokens_filtrados)

        # Calcular frecuencias
        frecuencias = Counter(tokens_filtrados)

        logger.info(f"Procesamiento completado: {len(tokens_filtrados)} palabras, {len(set(tokens_filtrados))} únicas")

        return {
            'texto_original': texto,
            'texto_limpio': texto_limpio,
            'tokens': tokens_filtrados,
            'tokens_stem': tokens_stem,
            'frecuencias': frecuencias,
            'num_palabras': len(tokens_filtrados),
            'num_palabras_unicas': len(set(tokens_filtrados))
        }

    def extraer_oraciones(self, texto: str) -> List[str]:
        
        try:
            return sent_tokenize(texto, language=self.idioma)
        except Exception as e:
            logger.error(f"Error extrayendo oraciones: {e}")
            return []

    def identificar_factores_mencionados(self, texto: str) -> Dict[str, int]:
        
        texto_limpio = self.limpiar_texto(texto)
        factores_encontrados: Dict[str, int] = {}

        for factor, palabras in self.palabras_clave_transformacion.items():
            count = 0
            for palabra in palabras:
                count += texto_limpio.count(palabra.lower())

            if count > 0:
                factores_encontrados[factor] = count

        logger.debug(f"Factores identificados: {len(factores_encontrados)}")
        return factores_encontrados

    def procesar_documentos(self, documentos: Union[List[str], Dict[str, str]]) -> pd.DataFrame:
        
        logger.info(f"Procesando {len(documentos)} documentos")
        resultados: List[Dict] = []

        if isinstance(documentos, dict):
            for nombre, texto in documentos.items():
                resultado = self.procesar_texto_completo(texto)
                resultado['documento'] = nombre
                resultado['factores'] = self.identificar_factores_mencionados(texto)
                resultados.append(resultado)
        else:
            for i, texto in enumerate(documentos):
                resultado = self.procesar_texto_completo(texto)
                resultado['documento'] = f'documento_{i+1}'
                resultado['factores'] = self.identificar_factores_mencionados(texto)
                resultados.append(resultado)

        logger.info(f"Procesamiento de documentos completado")
        return pd.DataFrame(resultados)

    def obtener_palabras_mas_frecuentes(self, texto: str, n: int = 20) -> List[Tuple[str, int]]:
        
        resultado = self.procesar_texto_completo(texto)
        return resultado['frecuencias'].most_common(n)

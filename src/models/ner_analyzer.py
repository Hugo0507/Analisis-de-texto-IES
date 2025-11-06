"""
Módulo de Análisis NER (Named Entity Recognition)
Identifica entidades nombradas: países, años, organizaciones, personas, etc.
Incluye análisis de co-ocurrencias, contexto y visualizaciones avanzadas.
Con sistema de caché automático para evitar re-procesar documentos.
"""

import re
from collections import Counter, defaultdict
import spacy
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
from itertools import combinations
from .ner_cache import NERCache
from src.utils.logger import get_logger

# Inicializar logger
logger = get_logger(__name__)


class NERAnalyzer:
    """Clase para análisis de entidades nombradas usando SpaCy"""

    def __init__(self, model_name='en_core_web_sm', use_cache=True, drive_folder_id=None):
        """
        Inicializa el analizador NER

        Args:
            model_name: Nombre del modelo de SpaCy a usar
            use_cache: Si debe usar el sistema de caché
            drive_folder_id: ID de carpeta en Google Drive para caché
        """
        self.model_name = model_name
        self.nlp = None
        self.max_length = 1000000  # Límite de caracteres por fragmento
        self.use_cache = use_cache
        self.cache = NERCache(drive_folder_id) if use_cache else None
        self.load_model()

        # Mapeo de países comunes en diferentes formatos
        self.country_variations = {
            'united states': 'United States',
            'usa': 'United States',
            'u.s.': 'United States',
            'u.s.a': 'United States',
            'united kingdom': 'United Kingdom',
            'uk': 'United Kingdom',
            'u.k.': 'United Kingdom',
            'england': 'United Kingdom',
            'china': 'China',
            'people\'s republic of china': 'China',
            'india': 'India',
            'germany': 'Germany',
            'france': 'France',
            'spain': 'Spain',
            'italy': 'Italy',
            'canada': 'Canada',
            'australia': 'Australia',
            'brazil': 'Brazil',
            'japan': 'Japan',
            'south korea': 'South Korea',
            'korea': 'South Korea',
            'mexico': 'Mexico',
            'netherlands': 'Netherlands',
            'sweden': 'Sweden',
            'switzerland': 'Switzerland',
            'austria': 'Austria',
            'belgium': 'Belgium',
            'norway': 'Norway',
            'denmark': 'Denmark',
            'finland': 'Finland',
            'portugal': 'Portugal',
            'poland': 'Poland',
            'turkey': 'Turkey',
            'argentina': 'Argentina',
            'chile': 'Chile',
            'colombia': 'Colombia',
            'peru': 'Peru',
            'russia': 'Russia',
            'south africa': 'South Africa',
            'new zealand': 'New Zealand',
            'ireland': 'Ireland',
            'singapore': 'Singapore',
            'malaysia': 'Malaysia',
            'thailand': 'Thailand',
            'indonesia': 'Indonesia',
            'philippines': 'Philippines',
            'vietnam': 'Vietnam',
            'pakistan': 'Pakistan',
            'bangladesh': 'Bangladesh',
            'egypt': 'Egypt',
            'nigeria': 'Nigeria',
            'kenya': 'Kenya',
            'saudi arabia': 'Saudi Arabia',
            'united arab emirates': 'United Arab Emirates',
            'uae': 'United Arab Emirates',
            'israel': 'Israel',
            'greece': 'Greece',
            'czech republic': 'Czech Republic',
            'romania': 'Romania',
            'hungary': 'Hungary',
            'ukraine': 'Ukraine'
        }

    def load_model(self):
        """Carga el modelo de SpaCy"""
        try:
            self.nlp = spacy.load(self.model_name)
            # Aumentar el límite de longitud
            self.nlp.max_length = self.max_length
            logger.info(f"Modelo SpaCy '{self.model_name}' cargado exitosamente")
        except OSError:
            logger.warning(f"Modelo {self.model_name} no encontrado. Descargando...")
            import subprocess
            import sys

            # Descargar el modelo usando el Python del entorno actual
            result = subprocess.run([sys.executable, '-m', 'spacy', 'download', self.model_name],
                                    capture_output=True, text=True)

            if result.returncode != 0:
                logger.error(f"Error descargando modelo: {result.stderr}")
                raise RuntimeError(f"No se pudo descargar el modelo {self.model_name}")

            # Después de descargar, intentar cargar nuevamente
            try:
                # Recargar spacy para actualizar los modelos disponibles
                import importlib
                importlib.reload(spacy)
                self.nlp = spacy.load(self.model_name)
                self.nlp.max_length = self.max_length
                logger.info(f"Modelo '{self.model_name}' descargado y cargado exitosamente")
            except OSError as e:
                logger.error(f"Error cargando modelo después de descarga: {e}")
                logger.info("Por favor, reinicia la aplicación para usar el modelo descargado")
                raise RuntimeError(
                    f"El modelo {self.model_name} se descargó pero no se pudo cargar. "
                    f"Por favor, reinicia la aplicación Streamlit."
                )

    def _split_text(self, text: str, max_length: int = 900000) -> List[str]:
        """
        Divide un texto largo en fragmentos más pequeños

        Args:
            text: Texto a dividir
            max_length: Longitud máxima de cada fragmento

        Returns:
            Lista de fragmentos de texto
        """
        if len(text) <= max_length:
            return [text]

        fragments = []
        start = 0
        while start < len(text):
            end = start + max_length
            # Intentar cortar en un espacio o salto de línea para no cortar palabras
            if end < len(text):
                # Buscar el último espacio o salto de línea en los últimos 1000 caracteres
                last_space = text.rfind(' ', end - 1000, end)
                last_newline = text.rfind('\n', end - 1000, end)
                cut_point = max(last_space, last_newline)
                if cut_point > start:
                    end = cut_point
            fragments.append(text[start:end])
            start = end

        return fragments

    def extract_entities(self, text: str) -> Dict[str, List[Tuple[str, int, int]]]:
        """
        Extrae entidades nombradas de un texto

        Args:
            text: Texto a analizar

        Returns:
            Diccionario con entidades por categoría
        """
        if not text or not isinstance(text, str):
            return {}

        entities = defaultdict(list)

        # Si el texto es muy largo, procesarlo en fragmentos
        if len(text) > self.max_length:
            fragments = self._split_text(text, max_length=900000)
            offset = 0

            for fragment in fragments:
                doc = self.nlp(fragment)
                for ent in doc.ents:
                    entities[ent.label_].append((ent.text, ent.start_char + offset, ent.end_char + offset))
                offset += len(fragment)
        else:
            doc = self.nlp(text)
            for ent in doc.ents:
                entities[ent.label_].append((ent.text, ent.start_char, ent.end_char))

        return dict(entities)

    def extract_years(self, text: str) -> List[int]:
        """
        Extrae años mencionados en el texto (rango 1900-2099)

        Args:
            text: Texto a analizar

        Returns:
            Lista de años encontrados
        """
        if not text or not isinstance(text, str):
            return []

        # Patrón para años de 4 dígitos entre 1900 y 2099
        year_pattern = r'\b(19\d{2}|20\d{2})\b'
        years = re.findall(year_pattern, text)

        return [int(year) for year in years]

    def extract_countries(self, text: str) -> List[str]:
        """
        Extrae países mencionados en el texto

        Args:
            text: Texto a analizar

        Returns:
            Lista de países normalizados
        """
        if not text or not isinstance(text, str):
            return []

        countries = []

        # Si el texto es muy largo, procesarlo en fragmentos
        if len(text) > self.max_length:
            fragments = self._split_text(text, max_length=900000)

            for fragment in fragments:
                doc = self.nlp(fragment)
                for ent in doc.ents:
                    if ent.label_ in ['GPE', 'LOC']:
                        country_text = ent.text.lower().strip()
                        normalized = self.country_variations.get(country_text, ent.text)
                        countries.append(normalized)
        else:
            doc = self.nlp(text)
            for ent in doc.ents:
                if ent.label_ in ['GPE', 'LOC']:
                    country_text = ent.text.lower().strip()
                    normalized = self.country_variations.get(country_text, ent.text)
                    countries.append(normalized)

        return countries

    def extract_entity_contexts(self, text: str, context_window: int = 100) -> Dict[str, List[str]]:
        """
        Extrae el contexto alrededor de cada entidad

        Args:
            text: Texto a analizar
            context_window: Número de caracteres antes y después de la entidad

        Returns:
            Diccionario con contextos por entidad
        """
        if not text or not isinstance(text, str):
            return {}

        contexts = defaultdict(list)

        # Si el texto es muy largo, procesarlo en fragmentos
        if len(text) > self.max_length:
            fragments = self._split_text(text, max_length=900000)
            offset = 0

            for fragment in fragments:
                doc = self.nlp(fragment)
                for ent in doc.ents:
                    # Calcular posiciones en el texto completo
                    global_start = ent.start_char + offset
                    global_end = ent.end_char + offset
                    start = max(0, global_start - context_window)
                    end = min(len(text), global_end + context_window)
                    context = text[start:end].strip()
                    contexts[ent.text].append(context)
                offset += len(fragment)
        else:
            doc = self.nlp(text)
            for ent in doc.ents:
                start = max(0, ent.start_char - context_window)
                end = min(len(text), ent.end_char + context_window)
                context = text[start:end].strip()
                contexts[ent.text].append(context)

        return dict(contexts)

    def analyze_entity_cooccurrence(self, text: str, window_size: int = 100) -> Dict[Tuple[str, str], int]:
        """
        Analiza co-ocurrencias entre entidades

        Args:
            text: Texto a analizar
            window_size: Tamaño de ventana en caracteres para considerar co-ocurrencia

        Returns:
            Diccionario con pares de entidades y sus frecuencias de co-ocurrencia
        """
        if not text or not isinstance(text, str):
            return {}

        cooccurrences = Counter()

        # Si el texto es muy largo, procesarlo en fragmentos
        if len(text) > self.max_length:
            fragments = self._split_text(text, max_length=900000)
            offset = 0

            for fragment in fragments:
                doc = self.nlp(fragment)
                # Agrupar entidades por posición (con offset global)
                entities_by_pos = [(ent.text, ent.label_, ent.start_char + offset, ent.end_char + offset) for ent in doc.ents]

                # Encontrar entidades que co-ocurren dentro de la ventana
                for i, ent1 in enumerate(entities_by_pos):
                    for ent2 in entities_by_pos[i+1:]:
                        if abs(ent1[2] - ent2[2]) <= window_size:
                            pair = tuple(sorted([f"{ent1[0]} ({ent1[1]})", f"{ent2[0]} ({ent2[1]})"]))
                            cooccurrences[pair] += 1
                offset += len(fragment)
        else:
            doc = self.nlp(text)
            entities_by_pos = [(ent.text, ent.label_, ent.start_char, ent.end_char) for ent in doc.ents]

            for i, ent1 in enumerate(entities_by_pos):
                for ent2 in entities_by_pos[i+1:]:
                    if abs(ent1[2] - ent2[2]) <= window_size:
                        pair = tuple(sorted([f"{ent1[0]} ({ent1[1]})", f"{ent2[0]} ({ent2[1]})"]))
                        cooccurrences[pair] += 1

        return dict(cooccurrences)

    def analyze_document(self, text: str, doc_name: str = '') -> Dict[str, Any]:
        """
        Análisis completo NER de un documento

        Args:
            text: Texto del documento
            doc_name: Nombre del documento

        Returns:
            Diccionario con análisis completo
        """
        # Extraer todas las entidades
        entities = self.extract_entities(text)

        # Extraer años
        years = self.extract_years(text)

        # Extraer países
        countries = self.extract_countries(text)

        # Extraer contextos
        contexts = self.extract_entity_contexts(text)

        # Analizar co-ocurrencias
        cooccurrences = self.analyze_entity_cooccurrence(text)

        # Calcular densidad de entidades
        total_chars = len(text)
        total_entities = sum(len(ents) for ents in entities.values())
        entity_density = (total_entities / total_chars * 1000) if total_chars > 0 else 0  # Entidades por 1000 caracteres

        return {
            'document_name': doc_name,
            'entities': entities,
            'years': years,
            'countries': countries,
            'entity_counts': {label: len(ents) for label, ents in entities.items()},
            'unique_countries': list(set(countries)),
            'year_range': (min(years), max(years)) if years else None,
            'total_entities': total_entities,
            'entity_density': round(entity_density, 2),
            'contexts': contexts,
            'cooccurrences': cooccurrences,
            'total_chars': total_chars
        }

    def analyze_corpus(self, texts_dict: Dict[str, str], force_recompute: bool = False) -> Dict[str, Any]:
        """
        Análisis NER de un corpus completo con caché automático

        Args:
            texts_dict: Diccionario {nombre_doc: texto}
            force_recompute: Si True, ignora el caché y re-procesa todo

        Returns:
            Análisis agregado del corpus
        """
        # Intentar cargar desde caché si está habilitado
        if self.use_cache and not force_recompute:
            cached_analysis = self.cache.load_analysis()
            if cached_analysis is not None:
                logger.info("="*60)
                logger.info("ANÁLISIS CARGADO DESDE CACHÉ")
                logger.info("="*60)
                cache_meta = cached_analysis.get('cache_metadata', {})
                if cache_meta:
                    logger.info(f"Fecha de análisis: {cache_meta.get('timestamp', 'Desconocida')}")
                    logger.info(f"Documentos analizados: {cache_meta.get('document_count', 0)}")
                    logger.info(f"Caracteres procesados: {cache_meta.get('total_chars', 0):,}")
                logger.info("="*60)
                return cached_analysis

        # Si no hay caché o se fuerza re-procesamiento
        logger.info("="*60)
        logger.info("PROCESANDO NUEVO ANÁLISIS NER")
        logger.info("="*60)
        logger.info("Esto puede tomar varios minutos...")
        logger.info("="*60)

        document_analyses = {}

        all_countries = []
        all_years = []
        all_entities = defaultdict(list)
        all_cooccurrences = Counter()
        all_contexts = defaultdict(list)

        # Métricas por documento
        doc_metrics = []

        for doc_name, text in texts_dict.items():
            analysis = self.analyze_document(text, doc_name)
            document_analyses[doc_name] = analysis

            # Agregar a totales
            all_countries.extend(analysis['countries'])
            all_years.extend(analysis['years'])

            for label, entities in analysis['entities'].items():
                all_entities[label].extend([ent[0] for ent in entities])

            # Agregar co-ocurrencias
            for pair, count in analysis['cooccurrences'].items():
                all_cooccurrences[pair] += count

            # Agregar contextos
            for entity, contexts in analysis['contexts'].items():
                all_contexts[entity].extend(contexts)

            # Métricas del documento
            doc_metrics.append({
                'document': doc_name,
                'total_entities': analysis['total_entities'],
                'entity_density': analysis['entity_density'],
                'unique_countries': len(analysis['unique_countries']),
                'years_mentioned': len(analysis['years'])
            })

        # Contar frecuencias
        country_counts = Counter(all_countries)
        year_counts = Counter(all_years)

        # Top entidades por categoría
        top_entities_by_category = {}
        for label, entities in all_entities.items():
            entity_counts = Counter(entities)
            top_entities_by_category[label] = entity_counts.most_common(20)

        # Calcular estadísticas agregadas
        total_entities = sum(doc['total_entities'] for doc in doc_metrics)
        avg_entity_density = np.mean([doc['entity_density'] for doc in doc_metrics]) if doc_metrics else 0
        total_chars = sum(doc['total_chars'] for doc in document_analyses.values())

        result = {
            'documents': document_analyses,
            'corpus_stats': {
                'total_documents': len(texts_dict),
                'total_countries': len(all_countries),
                'unique_countries': len(set(all_countries)),
                'total_years_mentioned': len(all_years),
                'unique_years': len(set(all_years)),
                'year_range': (min(all_years), max(all_years)) if all_years else None,
                'total_entities': total_entities,
                'avg_entity_density': round(avg_entity_density, 2),
                'total_entity_types': len(all_entities)
            },
            'country_distribution': dict(country_counts.most_common(30)),
            'year_distribution': dict(year_counts.most_common()),
            'top_entities_by_category': top_entities_by_category,
            'cooccurrences': dict(all_cooccurrences.most_common(50)),
            'contexts': dict(all_contexts),
            'document_metrics': doc_metrics
        }

        # Guardar en caché si está habilitado
        if self.use_cache:
            logger.info("="*60)
            logger.info("GUARDANDO ANÁLISIS EN CACHÉ")
            logger.info("="*60)
            success = self.cache.save_analysis(
                corpus_analysis=result,
                document_count=len(texts_dict),
                total_chars=total_chars
            )
            if success:
                logger.info("Análisis guardado correctamente en caché")
                logger.info("En la próxima ejecución se cargará automáticamente")
            else:
                logger.warning("No se pudo guardar el análisis en caché")
            logger.info("="*60)

        return result

    def get_geographical_insights(self, corpus_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Obtiene insights geográficos del análisis

        Args:
            corpus_analysis: Resultado de analyze_corpus

        Returns:
            Insights geográficos
        """
        country_dist = corpus_analysis['country_distribution']

        # Países más mencionados
        top_countries = list(country_dist.items())[:10]

        # Continentes (simplificado)
        continent_map = {
            'United States': 'North America',
            'Canada': 'North America',
            'Mexico': 'North America',
            'United Kingdom': 'Europe',
            'Germany': 'Europe',
            'France': 'Europe',
            'Spain': 'Europe',
            'Italy': 'Europe',
            'Netherlands': 'Europe',
            'Sweden': 'Europe',
            'Switzerland': 'Europe',
            'Austria': 'Europe',
            'Belgium': 'Europe',
            'Norway': 'Europe',
            'Denmark': 'Europe',
            'Finland': 'Europe',
            'Portugal': 'Europe',
            'Poland': 'Europe',
            'Greece': 'Europe',
            'Czech Republic': 'Europe',
            'Romania': 'Europe',
            'Hungary': 'Europe',
            'Ireland': 'Europe',
            'China': 'Asia',
            'India': 'Asia',
            'Japan': 'Asia',
            'South Korea': 'Asia',
            'Singapore': 'Asia',
            'Malaysia': 'Asia',
            'Thailand': 'Asia',
            'Indonesia': 'Asia',
            'Philippines': 'Asia',
            'Vietnam': 'Asia',
            'Pakistan': 'Asia',
            'Bangladesh': 'Asia',
            'Israel': 'Asia',
            'Saudi Arabia': 'Asia',
            'United Arab Emirates': 'Asia',
            'Turkey': 'Asia',
            'Australia': 'Oceania',
            'New Zealand': 'Oceania',
            'Brazil': 'South America',
            'Argentina': 'South America',
            'Chile': 'South America',
            'Colombia': 'South America',
            'Peru': 'South America',
            'South Africa': 'Africa',
            'Egypt': 'Africa',
            'Nigeria': 'Africa',
            'Kenya': 'Africa'
        }

        continent_counts = defaultdict(int)
        for country, count in country_dist.items():
            continent = continent_map.get(country, 'Other')
            continent_counts[continent] += count

        return {
            'top_countries': top_countries,
            'continent_distribution': dict(continent_counts),
            'total_countries_analyzed': len(country_dist),
            'most_active_region': max(continent_counts.items(), key=lambda x: x[1])[0] if continent_counts else None
        }

    def get_temporal_insights(self, corpus_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Obtiene insights temporales del análisis

        Args:
            corpus_analysis: Resultado de analyze_corpus

        Returns:
            Insights temporales
        """
        year_dist = corpus_analysis['year_distribution']

        if not year_dist:
            return {
                'message': 'No se encontraron años en el corpus',
                'trends': {}
            }

        # Agrupar por décadas
        decade_counts = defaultdict(int)
        for year, count in year_dist.items():
            decade = (year // 10) * 10
            decade_counts[decade] += count

        # Años más mencionados
        top_years = sorted(year_dist.items(), key=lambda x: x[1], reverse=True)[:10]

        return {
            'year_range': corpus_analysis['corpus_stats']['year_range'],
            'total_year_mentions': corpus_analysis['corpus_stats']['total_years_mentioned'],
            'unique_years': corpus_analysis['corpus_stats']['unique_years'],
            'top_years': top_years,
            'decade_distribution': dict(sorted(decade_counts.items())),
            'most_mentioned_year': max(year_dist.items(), key=lambda x: x[1])[0] if year_dist else None
        }

    def get_cooccurrence_insights(self, corpus_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Obtiene insights de co-ocurrencias entre entidades

        Args:
            corpus_analysis: Resultado de analyze_corpus

        Returns:
            Insights de co-ocurrencias
        """
        cooccurrences = corpus_analysis.get('cooccurrences', {})

        if not cooccurrences:
            return {
                'message': 'No se encontraron co-ocurrencias significativas',
                'top_pairs': []
            }

        # Top pares de entidades que co-ocurren
        top_pairs = sorted(cooccurrences.items(), key=lambda x: x[1], reverse=True)[:20]

        # Crear red de relaciones
        network_data = []
        for pair, count in top_pairs:
            entities = [p.rsplit(' (', 1)[0] for p in pair]
            network_data.append({
                'source': entities[0],
                'target': entities[1],
                'weight': count
            })

        return {
            'top_pairs': top_pairs,
            'total_cooccurrences': len(cooccurrences),
            'network_data': network_data
        }

    def get_diversity_insights(self, corpus_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcula métricas de diversidad en el corpus

        Args:
            corpus_analysis: Resultado de analyze_corpus

        Returns:
            Métricas de diversidad
        """
        doc_metrics = corpus_analysis.get('document_metrics', [])

        if not doc_metrics:
            return {'message': 'No hay datos suficientes para calcular diversidad'}

        # Diversidad de entidades por documento
        entity_counts = [doc['total_entities'] for doc in doc_metrics]
        country_counts = [doc['unique_countries'] for doc in doc_metrics]
        density_values = [doc['entity_density'] for doc in doc_metrics]

        # Encontrar documentos más ricos en información
        sorted_by_entities = sorted(doc_metrics, key=lambda x: x['total_entities'], reverse=True)[:5]
        sorted_by_density = sorted(doc_metrics, key=lambda x: x['entity_density'], reverse=True)[:5]

        return {
            'avg_entities_per_doc': round(np.mean(entity_counts), 2) if entity_counts else 0,
            'std_entities_per_doc': round(np.std(entity_counts), 2) if entity_counts else 0,
            'avg_countries_per_doc': round(np.mean(country_counts), 2) if country_counts else 0,
            'avg_entity_density': round(np.mean(density_values), 2) if density_values else 0,
            'top_docs_by_entities': sorted_by_entities,
            'top_docs_by_density': sorted_by_density,
            'entity_distribution': {
                'min': min(entity_counts) if entity_counts else 0,
                'max': max(entity_counts) if entity_counts else 0,
                'median': round(np.median(entity_counts), 2) if entity_counts else 0
            }
        }

    def get_entity_statistics(self, corpus_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Obtiene estadísticas detalladas de entidades

        Args:
            corpus_analysis: Resultado de analyze_corpus

        Returns:
            Estadísticas de entidades
        """
        top_entities = corpus_analysis.get('top_entities_by_category', {})

        category_stats = {}
        for label, entities in top_entities.items():
            if entities:
                counts = [count for _, count in entities]
                category_stats[label] = {
                    'total_mentions': sum(counts),
                    'unique_entities': len(entities),
                    'avg_mentions': round(np.mean(counts), 2),
                    'top_entity': entities[0] if entities else None
                }

        return {
            'category_stats': category_stats,
            'total_categories': len(top_entities),
            'most_diverse_category': max(category_stats.items(), key=lambda x: x[1]['unique_entities'])[0] if category_stats else None,
            'most_mentioned_category': max(category_stats.items(), key=lambda x: x[1]['total_mentions'])[0] if category_stats else None
        }

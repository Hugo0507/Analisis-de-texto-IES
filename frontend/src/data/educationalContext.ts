/**
 * Educational context definitions for NLP metrics shown in the dashboard.
 * Used by ContextTooltip to explain each metric in terms of higher education (IES) research.
 */

export interface EducationalContextEntry {
  /** Short title of the concept */
  title: string;
  /** Plain explanation for a non-expert researcher */
  explanation: string;
  /** Why this metric matters for TD (Digital Transformation) research in IES */
  relevance: string;
  /** Interpretation guide: what high vs low values mean */
  interpretation?: string;
}

export const EDUCATIONAL_CONTEXT: Record<string, EducationalContextEntry> = {
  // ── Preprocessing ──────────────────────────────────────────
  predominant_language: {
    title: 'Idioma Predominante',
    explanation: 'El idioma detectado en la mayoría de los documentos del corpus usando detección automática.',
    relevance: 'En investigación sobre TD en IES, muchos corpus son multilingüe (inglés + español). Identificar el idioma predominante ayuda a elegir stopwords y modelos NLP adecuados.',
    interpretation: 'Un corpus mayoritariamente en inglés puede favorecer modelos pre-entrenados en ese idioma (BERT, SpaCy en-core). Alta mezcla de idiomas puede reducir la coherencia temática.',
  },
  duplicates_removed: {
    title: 'Duplicados Eliminados',
    explanation: 'Número de documentos eliminados por ser copias exactas o casi exactas de otros en el corpus.',
    relevance: 'En corpora de literatura académica sobre TD, es común encontrar preprints y versiones revisadas del mismo artículo. Eliminar duplicados mejora la representatividad.',
    interpretation: 'Alta cantidad de duplicados puede indicar problemas en la recolección de datos o que la misma fuente fue indexada múltiples veces.',
  },
  files_omitted: {
    title: 'Archivos Omitidos',
    explanation: 'Archivos excluidos del procesamiento por formato no soportado, estar vacíos o presentar errores de extracción.',
    relevance: 'En corpus de IES, los archivos con protección DRM, imágenes escaneadas sin OCR, o PDFs corruptos no pueden procesarse. Es importante monitorear su proporción.',
    interpretation: 'Si más del 15% de archivos son omitidos, revisar la calidad del corpus. Porcentajes menores son normales en colecciones heterogéneas.',
  },
  total_tokens: {
    title: 'Total de Tokens',
    explanation: 'Número total de palabras (tokens) en el corpus preprocesado, contando todas las ocurrencias.',
    relevance: 'En análisis de TD en IES, un corpus con ≥100,000 tokens generalmente es suficiente para producir temas estadísticamente significativos con LDA o BERTopic.',
    interpretation: 'Corpus pequeños (<10,000 tokens) pueden generar temas poco estables. Corpus muy grandes (>1M tokens) pueden requerir ajustes de min_df para filtrar ruido.',
  },

  // ── Vectorization ───────────────────────────────────────────
  vocabulary_size: {
    title: 'Tamaño del Vocabulario',
    explanation: 'Número de términos únicos (types) en la representación vectorial del corpus.',
    relevance: 'En investigación sobre TD, un vocabulario entre 1,000 y 10,000 tipos es típico para artículos científicos. Vocabularios muy grandes aumentan la dispersión matricial.',
    interpretation: 'min_df alto reduce el vocabulario eliminando términos raros; max_features lo limita directamente. Ajusta según el balance precisión/cobertura que necesitas.',
  },
  ttr: {
    title: 'Riqueza Léxica (TTR)',
    explanation: 'Type-Token Ratio: proporción de palabras únicas sobre el total de ocurrencias. Mide la diversidad del vocabulario usado.',
    relevance: 'En corpus de TD en IES, un TTR alto indica textos variados (distintos autores, subtemas). Un TTR bajo puede reflejar jerga especializada repetitiva o dominio muy acotado.',
    interpretation: 'TTR > 5% sugiere vocabulario diverso. TTR < 1% en corpus grandes es normal (la ley de Zipf lo explica: pocas palabras concentran la mayoría de ocurrencias).',
  },
  coherence_score: {
    title: 'Coherencia del Modelo (C_V)',
    explanation: 'Métrica que evalúa qué tan semánticamente relacionadas están las palabras top de cada tema extraído. Varía entre 0 y 1.',
    relevance: 'En investigación sobre TD en IES, una coherencia alta (>0.5) indica que los temas identificados corresponden a conceptos reales y útiles para el análisis temático.',
    interpretation: 'C_V > 0.6: temas excelentes. 0.4–0.6: aceptables. < 0.4: puede indicar demasiados o muy pocos temas, o corpus insuficiente.',
  },
  perplexity_score: {
    title: 'Perplejidad (LDA)',
    explanation: 'Métrica de calidad del modelo LDA que mide qué tan bien predice nuevos documentos. Valores más bajos son mejores.',
    relevance: 'Útil para comparar distintas configuraciones de LDA en el mismo corpus de TD. No es comparable entre algoritmos diferentes (NMF, LSA).',
    interpretation: 'La perplejidad sola no garantiza calidad interpretable: optimizar solo perplejidad puede producir temas con palabras semánticamente dispersas.',
  },
  idf_value: {
    title: 'Valor IDF (Inverse Document Frequency)',
    explanation: 'Mide qué tan raro es un término en el corpus. IDF alto = término específico; IDF bajo = término común.',
    relevance: 'En análisis de TD en IES, términos con IDF alto (ej. "blockchain", "MOOC") son discriminadores entre temas, mientras que términos con IDF bajo (ej. "educación", "digital") aparecen en casi todos los documentos.',
    interpretation: 'Para identificar términos clave de un subtema, filtra por IDF alto. Para encontrar el vocabulario compartido del dominio, busca IDF bajo.',
  },

  // ── Modeling ────────────────────────────────────────────────
  zipf_law: {
    title: 'Ley de Zipf',
    explanation: 'Ley empírica que establece que en cualquier corpus lingüístico, la frecuencia de una palabra es inversamente proporcional a su rango.',
    relevance: 'Si el corpus de TD sigue la Ley de Zipf, sus patrones léxicos son típicos del lenguaje académico natural, lo que valida la calidad de la recolección.',
    interpretation: 'Desviaciones marcadas de la curva ideal pueden indicar: corpus demasiado homogéneo, muchas stopwords residuales, o corpus artificialmente generado.',
  },
  ner_cooccurrence: {
    title: 'Co-ocurrencia de Entidades',
    explanation: 'Dos entidades co-ocurren cuando aparecen juntas en los mismos documentos. La red muestra las relaciones más frecuentes.',
    relevance: 'En investigación sobre TD en IES, permite descubrir qué organizaciones, tecnologías o conceptos están estrechamente asociados en la literatura.',
    interpretation: 'Clústeres densos en la red indican grupos de entidades que forman un "ecosistema" temático dentro del corpus.',
  },
  pca_projection: {
    title: 'Proyección PCA de Temas',
    explanation: 'Reducción a 2 dimensiones del espacio de palabras de cada tema usando Análisis de Componentes Principales.',
    relevance: 'Permite visualizar qué temas del modelo comparten vocabulario similar, revelando redundancia o solapamiento temático en el análisis de TD.',
    interpretation: 'Temas cercanos entre sí pueden ser candidatos para fusionarse (reducir k). Temas muy dispersos indican buena separación semántica.',
  },
};

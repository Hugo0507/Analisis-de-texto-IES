from typing import Dict, Any, List, Tuple
import nltk
from nltk.corpus import stopwords

# Descargar stopwords si es necesario
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)


class PipelineConfig:
    
    # 0. STOPWORDS GLOBALES (INGLÉS + ESPAÑOL + EXTRAS)
    

    # Cargar stopwords en inglés y español
    _stop_words_english = set(stopwords.words('english'))
    _stop_words_spanish = set(stopwords.words('spanish'))

    # Stopwords adicionales (académicas, nombres de autores, términos técnicos)
    _extra_stopwords = {
        # Español básico
        "de", "al", "en", "la", "et", "a", "b", "c", "d", "e", "f",
        "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s",
        "t", "u", "v", "w", "x", "y", "z",
        "con", "del", "para", "el", "los", "una", "un", "sobre", "y",

        # Letras con punto
        "L.", "Y.", "S.", "T.", "A.", "B.", "C.", "D.", "E.", "F.",
        "G.", "H.", "I.", "J.", "K.", "L.", "M.", "N.", "O.", "P.", "Q.", "R.", "S.", "T.", "U.", "V.", "W.", "X.", "Y.", "Z.",

        # Términos académicos genéricos
        "CrossReff", "doi", "pp", "group", "author", "crossref",
        "article", "well", "zane", "hive", "morl", "neame", "eep",
        "also", "may", "many", "however", "provides", "providing", "results", "paper", "time", "new", "one", "used",
        "important", "system", "example", "approach", "framework", "level", "among", "various", "type", "number", "etc",
        "table", "section", "introduction", "conclusion", "reference", "references", "abstract", "keywords", "email",
        "http", "https", "www", "url", "id", "data", "study", "fig",

        # Términos técnicos/institucionales
        "gelderen", "httpswwwdundeeacukentrepreneurshipourmission",
        "schtt", "ionescusomers", "deviating", "excelling", "marketreadiness",
        "kicked", "beautyman", "robbie", "runnerup", "levelall", "hefe",
        "culminates", "feeder", "closelyknit", "scottishwide", "masterclass",
        "jewellery", "selfreliance", "interweaving", "chaff", "wheat", "innovatorentrepreneur",
        "doubtful", "bmcnicolldundeeacuk", "fsbrucedundeeacuk", "slatterdundeeacuk",
        "ieeetsinghua", "telecomequipment", "deisign", "httpsdoiorgjeuroecorev",
        "observertoparticipant", "focusgroups", "musgrave", "commonalty", "escalating",
        "mediatory", "crediting", "musgraves", "aideneomahonymycitie", "httpcieasuedu",
        "nctla", "goodsell", "dolan", "discoverybased", "httpsdoiorgjjvb", "schmittrodermund",
        "silbereisen", "httpsdoiorgjausmj", "parrish", "okely", "httpdoich", "ndererol", "cansever",
        "arslan", "capio", "stretching", "teacherstudents", "collectiveefficacy", "empathically", "unfit",
        "disequilibria", "adoptable", "paulflynnnuigalwayie", "veronicamccauleynuigalwayie", "rmcartstangelasnuigalwayie",
        "ramsgaard", "strom", "sheshinskie", "storeyd", "systemsresearchicarepacepaceworkbookinenglish",
        "httpsmgmtaudkresearchinnovationentrepreneurshipandinformation", "rodriguezfalcon",
        "httpseceuropaeusocialmainjspcatidlangiden", "httpswwwloopmeio", "debbi", "ephemera",
        "entreprenrskab", "fonden", "incl", "skillscompetences", "capacious", "sheshinski", "challengesbarriers",
        "meltviadk", "cafrviadk", "zari", "brakovska", "lukaa", "grinevia", "avotins", "alonsogonzalez", "broadfoot", "lapparent",

        # Nombres de autores
        "nguyen", "phan", "tran", "khong", "celik", "mulafalcn", "agasisti", "soncin", "mai", "chau", "nguyenanh", "pham",
        "odea", "zhou", "andy", "bichhang", "duong", "mlf", "camilo", "jose", "cela", "luckasson", "tasse", "farran",
        "joanne", "alonso", "criado", "gmez", "martn", "verdugo", "sanchez", "carrera", "angel", "vicariomerino", "martorell",
        "montero", "daz", "garcaprieto", "bonilla", "calero", "luzn", "trujillo", "sevilla", "moreno", "cobos", "lopezbastias",
        "montoya", "echeverra", "saenz", "esteve", "mon", "gisbert", "cervera", "caberoalmenara", "duran", "lobo",
        "watkins", "vquezalfaro", "armasalba", "alonsorodrguez", "kumin", "schoenbrodt", "furniss", "lancioni",
        "gedrimiene", "silvola", "le", "ttt", "cruzgonzalez", "domingo", "segovia", "hn", "gardner", "sheridan",
        "nn", "nham", "tp", "takahashi", "tranphuong", "qa", "tl", "dtb", "blackmore", "ainara", "palazn",
        "gmezgallego", "arrieta", "casasola", "margarita", "marina", "quero", "crdoba", "guha", "th", "dsm",
        "aaidd", "navas", "echavarriaramirez", "tirapuustarroz", "gutierrez", "martorell", "incheon", "unesco",
        "luque", "yeung", "universitarios", "autopercepcin", "cid"
    }

    # Unir todas las stopwords
    GLOBAL_STOPWORDS = _stop_words_english.union(_stop_words_spanish).union(_extra_stopwords)

    
    # 1. SELECCIÓN AUTOMÁTICA DE IDIOMA
    # El sistema detecta automáticamente el idioma mayoritario
    # y descarta documentos en otros idiomas
    AUTO_SELECT_MAJORITY_LANGUAGE = True
    MIN_LANGUAGE_THRESHOLD = 0.7  # 70% de documentos deben estar en el idioma principal

  
    # 2. PREPROCESAMIENTO DE TEXTO
  

    PREPROCESSING = {
        # Aplicar lematización (reducir palabras a su forma base/lemma)
        # True: "running" -> "run", "better" -> "good" | False: mantener palabras completas
        'apply_lemmatization': True,

        # Aplicar stemming (MÁS AGRESIVO que lematización, NO recomendado si se usa lematización)
        # True: "running" -> "run" | False: mantener palabras completas
        'apply_stemming': False,  # Desactivado porque usamos lematización

        # Longitud mínima de tokens a conservar
        'min_token_length': 3,  # Descartar palabras de 1-2 caracteres

        # Remover números del texto
        'remove_numbers': False,  # True = remover | False = conservar

        # Stopwords personalizadas adicionales (además de las globales)
        'custom_stopwords': [],  # Ya tenemos GLOBAL_STOPWORDS, no necesitamos más

        # Convertir todo a minúsculas
        'lowercase': True
    }

   
    # 3. BOLSA DE PALABRAS (BOW - Bag of Words)
    
 

    BOW = {
        # Rango de n-gramas a incluir
        # (1,1) = solo unigramas | (1,2) = uni+bigramas | (1,3) = uni+bi+trigramas | (2,2) = solo bigramas
        'ngram_range': (1, 2),  # MODIFICAR AQUÍ para cambiar n-gramas

        # Máximo número de términos en el vocabulario
        'max_features': 5000,  # Reducir para análisis más rápido, aumentar para más detalle

        # Frecuencia mínima: términos deben aparecer en al menos N documentos
        'min_df': 2,  # Descartar términos muy raros

        # Frecuencia máxima: términos no deben aparecer en más del X% de docs
        'max_df': 0.85,  # 0.85 = 85% | Descartar términos muy comunes
    }


    # 4. TF-IDF (Term Frequency - Inverse Document Frequency)
    # Se calcula DESDE la matriz BoW, aplicando ponderación TF-IDF
    # Los parámetros son similares a BoW pero se pueden ajustar independientemente

    TFIDF = {
        # Rango de n-gramas (igual que BoW por defecto)
        'ngram_range': (1, 2),  # MODIFICAR AQUÍ

        # Máximo número de términos
        'max_features': 5000,

        # Frecuencia mínima de documento
        'min_df': 2,

        # Frecuencia máxima de documento
        'max_df': 0.85,

        # Normalización de vectores
        # 'l1' = suma de componentes = 1 | 'l2' = norma euclidiana = 1 | None = sin normalizar
        'norm': 'l2',

        # Usar IDF (casi siempre True)
        'use_idf': True,

        # Suavizado de IDF para evitar división por cero
        'smooth_idf': True,

        # Sub-linear TF scaling (log)
        'sublinear_tf': False  # True = usar log(TF) en vez de TF
    }

    
    # 5. ANÁLISIS DE N-GRAMAS


    NGRAMS = {
        # Máximo n para análisis (1=unigrams, 2=bigrams, 3=trigrams)
        'max_n': 3,  # MODIFICAR AQUÍ: 2 para uni+bi, 3 para uni+bi+tri

        # Frecuencia mínima
        'min_df': 2,

        # Frecuencia máxima
        'max_df': 0.95,

        # Top K n-gramas a reportar por cada tipo
        'top_k': 50,  # Mostrar los 50 más frecuentes
    }

 
    # 6. TOPIC MODELING (LDA, NMF, LSA, pLSA)
   

    TOPIC_MODELING = {
        # LDA 
        'lda': {
            'n_topics': 10,  # MODIFICAR AQUÍ: número de temas a descubrir (5-20 típico)
            'max_iter': 20,  # Iteraciones máximas (10=rápido, 50=preciso)
            'random_state': 42,  # Semilla para reproducibilidad
            'learning_method': 'batch',  # 'batch' o 'online'
            'n_jobs': -1,  # -1 = usar todos los cores
            'max_features': 1000,  # Vocabulario para LDA
            'min_df': 2,
            'max_df': 0.95
        },

        # NMF 
        'nmf': {
            'n_topics': 10,  # MODIFICAR AQUÍ
            'max_iter': 200,
            'random_state': 42,
            'init': 'nndsvda',  # Método de inicialización
            'solver': 'cd',  # 'cd' = Coordinate Descent | 'mu' = Multiplicative Update
            'max_features': 1000,
            'min_df': 2,
            'max_df': 0.95
        },

        # LSA 
        'lsa': {
            'n_components': 10,  # MODIFICAR AQUÍ: dimensiones latentes
            'random_state': 42,
            'max_features': 1000,
            'min_df': 2,
            'max_df': 0.95
        },

        #  pLSA 
        'plsa': {
            'n_topics': 10,  # MODIFICAR AQUÍ
            'max_iter': 100,
            'random_state': 42
        }
    }

   
    # 7. BERTOPIC (Topic Modeling con Transformers)
    

    BERTOPIC = {
        # Modelo de embeddings (sentence-transformers)
        # Opciones: 'all-MiniLM-L6-v2' (rápido), 'all-mpnet-base-v2' (preciso)
        'embedding_model': 'all-MiniLM-L6-v2',  # MODIFICAR AQUÍ

        # Tamaño mínimo de cluster/tema
        # Corpus pequeño: 5-10 | Corpus grande: 15-30
        'min_topic_size': 10,  # MODIFICAR AQUÍ

        # Número de temas (None = automático con HDBSCAN)
        'n_topics': None,  # MODIFICAR AQUÍ: int para forzar N temas, None para auto

        # Idioma para stopwords
        'language': 'english',

        # Calcular probabilidades de pertenencia
        'calculate_probabilities': True,

        # Mostrar progreso
        'verbose': True,

        # Parámetros del vectorizador interno
        'vectorizer_min_df': 2,
        'vectorizer_ngram_range': (1, 2)
    }

    # 8. NER (Named Entity Recognition)


    NER = {
        # Modelo de spaCy
        # 'en_core_web_sm' = pequeño, rápido
        # 'en_core_web_md' = mediano, balanceado
        # 'en_core_web_lg' = grande, preciso pero lento
        'model_name': 'en_core_web_sm',  # MODIFICAR AQUÍ

        # Tipos de entidades a reconocer
        # Opciones: PERSON, ORG, GPE, DATE, MONEY, CARDINAL, ORDINAL, etc.
        # None = todas | lista = solo las especificadas
        'entity_types': None,  # MODIFICAR AQUÍ: ['PERSON', 'ORG', 'GPE'] para específicas

        # Umbral mínimo de confianza (0.0 - 1.0)
        'confidence_threshold': 0.0,  # 0.0 = aceptar todas

        # Usar caché local para acelerar procesamiento
        'use_cache': True
    }

 
    # 9. REDUCCIÓN DE DIMENSIONALIDAD
 

    DIMENSIONALITY_REDUCTION = {
        # PCA 
        'pca': {
            'n_components': 50,  # MODIFICAR AQUÍ: dimensiones finales (2-100)
            'random_state': 42,
            'svd_solver': 'auto'  # 'auto', 'full', 'arpack', 'randomized'
        },

        # t-SNE 
        'tsne': {
            'n_components': 2,  # Típicamente 2 o 3 para visualización
            'perplexity': 30,  # MODIFICAR AQUÍ: 5-50 (corpus pequeño: 5-15, grande: 30-50)
            'learning_rate': 200,  # MODIFICAR AQUÍ: 10-1000
            'n_iter': 1000,  # Iteraciones (más = mejor pero más lento)
            'random_state': 42,
            'init': 'pca'  # 'pca' o 'random'
        },

        # UMAP
        'umap': {
            'n_components': 2,  # Dimensiones finales
            'n_neighbors': 15,  # MODIFICAR AQUÍ: 2-100 (local vs global structure)
            'min_dist': 0.1,  # MODIFICAR AQUÍ: 0.0-0.99 (qué tan juntos pueden estar los puntos)
            'metric': 'cosine',  # 'euclidean', 'cosine', 'manhattan', etc.
            'random_state': 42
        },

        # Filtros de Features 
        'filters': {
            # Filtro de baja varianza
            'low_variance_threshold': 0.01,  # Remover features con varianza < 0.01

            # Filtro de alta correlación
            'high_correlation_threshold': 0.9  # Remover features con |r| > 0.9
        }
    }

   
    # 10. CLASIFICACIÓN DE TEXTOS


    CLASSIFICATION = {
        #  Naive Bayes 
        'naive_bayes': {
            'alpha': 1.0,  # MODIFICAR AQUÍ: parámetro de suavizado (0.1-10.0)
            'fit_prior': True  # Aprender probabilidades a priori
        },

        #  SVM 
        'svm': {
            'kernel': 'linear',  # MODIFICAR AQUÍ: 'linear', 'rbf', 'poly', 'sigmoid'
            'C': 1.0,  # MODIFICAR AQUÍ: regularización (0.1-100)
            'gamma': 'scale',  # 'scale', 'auto' o float
            'max_iter': 1000,
            'random_state': 42
        },

        # KNN 
        'knn': {
            'n_neighbors': 5,  # MODIFICAR AQUÍ: número de vecinos (1-20)
            'weights': 'uniform',  # MODIFICAR AQUÍ: 'uniform' o 'distance'
            'metric': 'cosine',  # 'euclidean', 'cosine', 'manhattan'
            'algorithm': 'auto'  # 'auto', 'ball_tree', 'kd_tree', 'brute'
        },

        #  Validación Cruzada 
        'cross_validation': {
            'n_splits': 5,  # Número de folds
            'shuffle': True,
            'random_state': 42
        },

        #  Train/Test Split 
        'train_test_split': {
            'test_size': 0.2,  # 20% para test, 80% para train
            'random_state': 42,
            'stratify': True  # Mantener proporción de clases
        }
    }

    
    # 11. ANÁLISIS DE FACTORES
  

    FACTOR_ANALYSIS = {
        # TF-IDF interno para análisis de factores
        'tfidf_max_features': 100,
        'tfidf_ngram_range': (1, 2),

        # Clustering K-Means
        'kmeans_n_clusters': 5,  # MODIFICAR AQUÍ: número de clusters
        'kmeans_random_state': 42,

        # LDA interno
        'lda_n_topics': 5,  # MODIFICAR AQUÍ
        'lda_max_iter': 20,

        # Top N elementos a reportar por factor
        'top_n_per_factor': 10
    }

    
    # 12. CONSOLIDACIÓN DE FACTORES

    CONSOLIDATION = {
        # Pesos para cada fuente de análisis (deben sumar 1.0)
        'weights': {
            'factor_analysis': 0.3,  #  peso del análisis de factores
            'topic_modeling': 0.3,   #  peso del topic modeling
            'ner': 0.2,              #  peso de NER
            'tfidf': 0.2             #  peso de TF-IDF
        },

        # Número de factores consolidados finales
        'n_final_factors': 8,  # MODIFICAR AQUÍ: factores finales a reportar

        # Método de agregación
        'aggregation_method': 'weighted_average'  # 'weighted_average', 'max', 'vote'
    }

 
    # 13. VISUALIZACIONES


    VISUALIZATION = {
        # Nubes de palabras
        'wordcloud': {
            'max_words': 100,  # MODIFICAR AQUÍ: palabras máximas en la nube
            'width': 800,
            'height': 400,
            'background_color': 'white',
            'colormap': 'viridis',  # 'viridis', 'plasma', 'inferno', 'Blues', etc.
            'relative_scaling': 0.5,
            'min_font_size': 10
        },

        # Gráficos Plotly
        'plotly': {
            'template': 'plotly_white',  # 'plotly', 'plotly_white', 'plotly_dark'
            'color_scheme': 'Viridis'  # Esquema de colores
        }
    }

    # 14. EVALUACIÓN DE DESEMPEÑO
  

    PERFORMANCE = {
        # Métricas a calcular
        'metrics': [
            'processing_time',
            'memory_usage',
            'vocabulary_size',
            'document_coverage',
            'topic_coherence',
            'silhouette_score'
        ],

        # Benchmarks
        'log_performance': True,  # Guardar logs de rendimiento
        'profile_memory': False,  # Perfilar uso de memoria (overhead)
        'save_intermediate_results': True  # Guardar resultados intermedios
    }

 
    # 15. SISTEMA DE CACHÉ Y PERSISTENCIA


    CACHE = {
        # Usar caché local
        'use_local_cache': True,

        # Usar caché en Google Drive
        'use_drive_cache': True,

        # Invalidar caché si cambia configuración
        'invalidate_on_config_change': True,

        # TTL del caché (segundos) - None = sin expiración
        'cache_ttl': None
    }


    # 16. CONFIGURACIÓN DEL PIPELINE AUTOMÁTICO


    PIPELINE = {
        # Auto-ejecutar al conectar Drive
        'auto_execute_on_connect': True,

        # Continuar en caso de error en una etapa
        'continue_on_error': True,

        # Etapas a ejecutar (True = ejecutar, False = saltar)
        'stages': {
            'language_detection': True,
            'txt_conversion': True,
            'preprocessing': True,
            'bow': True,
            'tfidf': True,
            'ngrams': True,
            'ner': True,
            'topic_modeling': True,
            'bertopic': True,
            'dimensionality_reduction': True,
            'classification': False,  # False porque requiere etiquetado manual
            'factor_analysis': True,
            'consolidation': True,
            'visualizations': True
        },

        # Tiempo máximo por etapa (segundos) - None = sin límite
        'stage_timeout': {
            'language_detection': 300,    # 5 minutos
            'txt_conversion': 600,        # 10 minutos
            'preprocessing': 600,         # 10 minutos
            'bow': 300,
            'tfidf': 300,
            'ngrams': 300,
            'ner': 1800,                  # 30 minutos (puede ser lento)
            'topic_modeling': 900,        # 15 minutos
            'bertopic': 1800,             # 30 minutos (embeddings lentos)
            'dimensionality_reduction': 600,
            'classification': None,
            'factor_analysis': 600,
            'consolidation': 300,
            'visualizations': 300
        }
    }

    @classmethod
    def get_config_dict(cls) -> Dict[str, Any]:
       
        return {
            'auto_select_majority_language': cls.AUTO_SELECT_MAJORITY_LANGUAGE,
            'min_language_threshold': cls.MIN_LANGUAGE_THRESHOLD,
            'preprocessing': cls.PREPROCESSING,
            'bow': cls.BOW,
            'tfidf': cls.TFIDF,
            'ngrams': cls.NGRAMS,
            'topic_modeling': cls.TOPIC_MODELING,
            'bertopic': cls.BERTOPIC,
            'ner': cls.NER,
            'dimensionality_reduction': cls.DIMENSIONALITY_REDUCTION,
            'classification': cls.CLASSIFICATION,
            'factor_analysis': cls.FACTOR_ANALYSIS,
            'consolidation': cls.CONSOLIDATION,
            'visualization': cls.VISUALIZATION,
            'performance': cls.PERFORMANCE,
            'cache': cls.CACHE,
            'pipeline': cls.PIPELINE
        }

    @classmethod
    def validate_config(cls) -> List[str]:
       
        warnings = []

        # Validar pesos de consolidación
        weights_sum = sum(cls.CONSOLIDATION['weights'].values())
        if abs(weights_sum - 1.0) > 0.01:
            warnings.append(f"⚠️ Pesos de consolidación no suman 1.0 (suma actual: {weights_sum:.2f})")

        # Validar rangos
        if cls.TOPIC_MODELING['lda']['n_topics'] < 2:
            warnings.append("⚠️ LDA n_topics debe ser >= 2")

        if cls.DIMENSIONALITY_REDUCTION['tsne']['perplexity'] < 5:
            warnings.append("⚠️ t-SNE perplexity muy bajo (< 5)")

        # Validar compatibilidad
        if cls.BOW['max_features'] < cls.TFIDF['max_features']:
            warnings.append("ℹ️ TF-IDF max_features es mayor que BoW (puede causar inconsistencias)")

        return warnings



# EXPORTAR CONFIGURACIÓN POR DEFECTO

# Instancia global de configuración
config = PipelineConfig()

# Validar configuración al importar
_validation_warnings = PipelineConfig.validate_config()
if _validation_warnings:
    import warnings as warn_module
    for warning in _validation_warnings:
        warn_module.warn(warning)

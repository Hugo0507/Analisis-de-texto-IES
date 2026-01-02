"""
Extra Stopwords for Data Preparation

Lista de stopwords adicionales específicas para el contexto académico
y de investigación sobre transformación digital.
"""

# Stopwords extras comunes a todos los idiomas
EXTRA_STOPWORDS = {
    # Artículos y preposiciones cortas
    "de", "al", "en", "la", "et", "a", "b", "c", "d", "e", "f",
    "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s",
    "t", "u", "v", "w", "x", "y", "z",

    # Números y símbolos
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "00", "01", "02", "03", "04", "05", "06", "07", "08", "09",
    "10", "11", "12", "13", "14", "15", "16", "17", "18", "19",
    "20", "30", "40", "50", "60", "70", "80", "90", "100",
    "2020", "2021", "2022", "2023", "2024",

    # Términos académicos genéricos
    "abstract", "paper", "study", "research", "article", "journal",
    "vol", "volume", "issue", "pp", "page", "pages", "et", "al",
    "fig", "figure", "table", "doi", "isbn", "issn",
    "universidad", "university", "universidade",
    "revista", "journal", "conference", "conferencia",
    "proceedings", "actas", "simposio", "symposium",

    # Palabras de relleno académicas
    "thus", "therefore", "however", "moreover", "furthermore",
    "indeed", "hence", "whereas", "whereby", "herein",
    "thereof", "therein", "thereby", "accordingly",
    "por", "tanto", "embargo", "además", "asimismo",
    "mediante", "través", "respecto", "relación",

    # Términos de referencias y citas
    "ref", "refs", "reference", "references", "cit", "cited",
    "bibliography", "bibliografía", "bibliografia",
    "see", "ver", "cf", "cfr", "comp", "compare",
    "ibid", "ibidem", "op", "cit", "loc",

    # Abreviaciones comunes
    "etc", "ie", "eg", "vs", "via", "dr", "prof", "mr", "mrs", "ms",
    "sr", "sra", "srta", "dra", "ing", "lic", "phd", "msc", "bsc",

    # Palabras muy cortas sin significado
    "aa", "ab", "ac", "ad", "ae", "af", "ag", "ah", "ai", "aj",
    "ak", "am", "an", "ao", "ap", "aq", "ar", "as", "at", "au",
    "av", "aw", "ax", "ay", "az",
    "ba", "bb", "bc", "bd", "be", "bf", "bg", "bh", "bi", "bj",
    "bk", "bl", "bm", "bn", "bo", "bp", "bq", "br", "bs", "bt",
    "bu", "bv", "bw", "bx", "by", "bz",

    # Términos de formateo y estructura
    "section", "chapter", "part", "appendix", "annex",
    "sección", "capítulo", "parte", "apéndice", "anexo",
    "introduction", "conclusion", "discussion", "results",
    "introducción", "conclusión", "discusión", "resultados",

    # Nombres de países y regiones comunes en papers
    "usa", "uk", "eu", "asia", "africa", "américa", "america",
    "europa", "áfrica", "asia", "oceanía", "oceania",

    # Términos técnicos muy genéricos
    "data", "datos", "information", "información", "informação",
    "system", "sistema", "modelo", "model", "method", "método",
    "approach", "enfoque", "framework", "tool", "herramienta",

    # Conectores y transiciones
    "first", "second", "third", "finally", "lastly",
    "primero", "segundo", "tercero", "finalmente",
    "next", "then", "after", "before", "during",
    "siguiente", "luego", "después", "antes", "durante",

    # Verbos auxiliares y modales muy comunes
    "can", "could", "may", "might", "must", "shall", "should",
    "will", "would", "ought", "need", "dare",
    "poder", "deber", "haber", "tener", "ser", "estar",

    # Pronombres y determinantes
    "this", "that", "these", "those", "such", "same",
    "este", "ese", "aquel", "estos", "esos", "aquellos",
    "esta", "esa", "aquella", "estas", "esas", "aquellas",

    # Nombres de autores comunes en papers asiáticos
    "wang", "li", "zhang", "liu", "chen", "yang", "huang",
    "zhao", "wu", "zhou", "xu", "sun", "ma", "zhu", "hu",
    "kim", "park", "lee", "choi", "jung", "kang", "cho",
    "nguyen", "phan", "tran", "khong",
    "celik", "yilmaz", "demir", "kaya", "arslan",

    # Términos de estadística básica
    "mean", "media", "average", "promedio", "median", "mediana",
    "std", "sd", "deviation", "desviación", "variance", "varianza",
    "min", "max", "sum", "total", "count", "número",

    # Términos de tiempo
    "year", "month", "day", "week", "hour", "minute",
    "año", "mes", "día", "semana", "hora", "minuto",
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",

    # Palabras de enlace web/digital
    "http", "https", "www", "com", "org", "edu", "net",
    "html", "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx",
    "url", "link", "href", "src", "img", "png", "jpg", "jpeg",

    # Términos de software y código
    "version", "versión", "release", "update", "download",
    "install", "software", "program", "application", "app",
    "file", "archivo", "folder", "carpeta", "directory",
}


def get_combined_stopwords(custom_stopwords=None, language='en'):
    """
    Combinar stopwords por defecto con stopwords personalizadas.

    Args:
        custom_stopwords (list): Lista de stopwords personalizadas
        language (str): Código de idioma (ej: 'en', 'es')

    Returns:
        set: Conjunto combinado de stopwords
    """
    # Comenzar con las extra stopwords
    combined = EXTRA_STOPWORDS.copy()

    # Agregar stopwords de NLTK para el idioma específico
    try:
        from nltk.corpus import stopwords as nltk_stopwords
        if language in ['en', 'english']:
            combined.update(nltk_stopwords.words('english'))
        elif language in ['es', 'spanish', 'español']:
            combined.update(nltk_stopwords.words('spanish'))
        elif language in ['pt', 'portuguese', 'português']:
            combined.update(nltk_stopwords.words('portuguese'))
        elif language in ['fr', 'french', 'français']:
            combined.update(nltk_stopwords.words('french'))
        elif language in ['de', 'german', 'deutsch']:
            combined.update(nltk_stopwords.words('german'))
        elif language in ['it', 'italian', 'italiano']:
            combined.update(nltk_stopwords.words('italian'))
    except (ImportError, LookupError):
        # NLTK no disponible o datos no descargados
        pass

    # Agregar stopwords personalizadas del usuario
    if custom_stopwords:
        combined.update([sw.lower() for sw in custom_stopwords])

    return combined

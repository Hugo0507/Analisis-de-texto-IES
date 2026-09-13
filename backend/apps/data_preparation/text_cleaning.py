"""
Limpieza del texto extraido de PDFs academicos.

Una sola implementacion para el corpus (Preparacion de datos) y para el
Laboratorio (inferencia sobre PDFs nuevos). Si cada lado limpia distinto, los
modelos entrenados con el corpus reciben otras palabras al inferir.

El orden importa:
  1. Quitar el ruido de la extraccion mientras el texto conserva su forma
     original: glifos "(cid:129)", avisos de las editoriales, URLs, DOIs, citas.
  2. Pasar a minusculas y convertir numeros y simbolos en espacios.
  3. Solo entonces comparar cada palabra con las stopwords.

Antes la preparacion aplicaba las stopwords sobre el texto crudo y despues
borraba los simbolos sin dejar espacio. "(cid:129)" no coincidia con la
stopword "cid", pero al quitarle los simbolos quedaba "cid"; y
"https://doi.org/10..." terminaba como "httpsdoiorg".
"""

import re
import unicodedata
from typing import Iterable, Optional

# Glifos que pdfminer no sabe decodificar.
_RE_CID = re.compile(r'\(cid:\d+\)')

# Avisos que las editoriales estampan en la portada o en cada pagina. No son
# contenido del articulo y, como se repiten, forman temas propios.
_RE_AVISOS_EDITORIALES = [
    # IEEE Xplore, al pie de cada pagina:
    # "Authorized licensed use limited to: X. Downloaded on May 10,2023 at
    #  14:22:11 UTC from IEEE Xplore.  Restrictions apply."
    re.compile(r'authorized\s+licensed\s+use\s+limited\s+to\b.{0,300}?restrictions\s+apply\.?', re.I | re.S),
    # Wiley, al margen de cada pagina:
    # "14682273, 2023, 3, Downloaded from https://... by Cochrane Colombia,
    #  Wiley Online Library on [09/11/2023]. See the Terms and Conditions (...)
    #  on Wiley Online Library for rules of use; OA articles are governed by the
    #  applicable Creative Commons License"
    re.compile(r'downloaded\s+from\s+\S+\s+by\s+.{0,150}?wiley\s+online\s+library\s+on\s*\[[^\]\n]{0,20}\]?', re.I | re.S),
    re.compile(r'see\s+the\s+terms\s+and\s+conditions.{0,200}?creative\s+commons\s+license', re.I | re.S),
    # Taylor & Francis, en la portada.
    re.compile(r'view\s+crossmark\s+data', re.I),
    re.compile(r'full\s+terms\s*&\s*conditions\s+of\s+access\s+and\s+use\s+can\s+be\s+found\s+at', re.I),
]

RE_URL = re.compile(r'https?://\S+|www\.\S+|\b(?:dx\.)?doi\.org/\S+', re.IGNORECASE)
RE_EMAIL = re.compile(r'\S+@\S+\.\S+')
RE_DOI = re.compile(r'\bdoi\s*:?\s*10\.\S+', re.IGNORECASE)
RE_ISBN = re.compile(r'\b(?:ISBN|ISSN)[:\s\-]*[\d\-Xx]+', re.IGNORECASE)
RE_PAGE_NUMBERS = re.compile(r'\b(?:pp?\.|pages?)\s*\d+[\s\-–]+\d+', re.IGNORECASE)
RE_CITATION_BRACKETS = re.compile(r'\[[\d,;\s\-–]+\]')
# Distingue mayusculas ("(Smith, 2020)"): debe aplicarse antes de pasar a minusculas.
RE_CITATION_PARENS = re.compile(r'\(\s*(?:[A-Z][a-z]+(?:\s+(?:et\s+al\.?|&|and)\s*)?(?:,?\s*\d{4})\s*(?:;\s*)?)+\)')
RE_NUMBERS_STANDALONE = re.compile(r'\b\d+(?:\.\d+)?\b')
RE_NON_ALPHA = re.compile(r'[^a-zA-Z\s]')


def normalizar_unicode(texto: str) -> str:
    """
    Deshacer ligaduras y quitar tildes.

    Los PDFs escriben "fi", "fl", "ff" y "ffi" como un solo caracter (ﬁ ﬂ ﬀ ﬃ).
    Al borrar lo que no es a-z, "artiﬁcial" quedaba como "articial". Las letras
    con tilde se perdian igual: "educação" quedaba como "educao". NFKC separa
    las ligaduras y NFKD + quitar marcas deja "educacao".
    """
    texto = unicodedata.normalize('NFKC', texto)
    descompuesto = unicodedata.normalize('NFKD', texto)
    return ''.join(c for c in descompuesto if not unicodedata.combining(c))


def quitar_ruido_pdf(texto: str) -> str:
    """
    Borrar lo que agrega la extraccion del PDF y no es contenido.

    Conserva mayusculas y puntuacion: solo reemplaza por espacios los glifos,
    avisos editoriales, URLs, correos, DOIs, ISBN/ISSN, rangos de paginas y
    citas.
    """
    texto = normalizar_unicode(texto)
    texto = _RE_CID.sub(' ', texto)
    for patron in _RE_AVISOS_EDITORIALES:
        texto = patron.sub(' ', texto)
    for patron in (RE_URL, RE_EMAIL, RE_DOI, RE_ISBN, RE_PAGE_NUMBERS,
                   RE_CITATION_BRACKETS, RE_CITATION_PARENS):
        texto = patron.sub(' ', texto)
    return texto


def normalizar(texto: str, quitar_simbolos: bool = True) -> str:
    """Minusculas y, si se pide, numeros y simbolos convertidos en espacios."""
    texto = texto.lower()
    if quitar_simbolos:
        texto = RE_NUMBERS_STANDALONE.sub(' ', texto)
        texto = RE_NON_ALPHA.sub(' ', texto)
    return texto


def filtrar_palabras(
    texto: str,
    stopwords: Optional[Iterable[str]] = None,
    min_longitud: int = 2,
) -> str:
    """Quitar stopwords y palabras mas cortas que min_longitud; normaliza espacios."""
    vacias = stopwords if isinstance(stopwords, (set, frozenset)) else set(stopwords or ())
    palabras = [
        p for p in texto.split()
        if p not in vacias and (min_longitud <= 1 or len(p) >= min_longitud)
    ]
    return ' '.join(palabras)


def limpiar_texto(
    texto: Optional[str],
    stopwords: Optional[Iterable[str]] = None,
    min_longitud: int = 2,
    quitar_simbolos: bool = True,
) -> str:
    """
    Limpieza completa de un texto extraido de PDF, en el orden correcto.

    Args:
        texto: texto crudo del PDF.
        stopwords: palabras a eliminar (ya en minusculas).
        min_longitud: longitud minima de las palabras que se conservan.
        quitar_simbolos: convertir numeros y simbolos en espacios. Refleja la
            opcion "Eliminacion de caracteres especiales" de la preparacion.
    """
    if not texto or not texto.strip():
        return ''
    texto = quitar_ruido_pdf(texto)
    texto = normalizar(texto, quitar_simbolos=quitar_simbolos)
    return filtrar_palabras(texto, stopwords, min_longitud)

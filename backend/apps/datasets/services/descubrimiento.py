"""
Descubrimiento automático de artículos para el corpus.

Busca literatura sobre transformación digital en educación superior en
OpenAlex y descarga solo los PDF publicados en acceso abierto.

Por qué OpenAlex y Unpaywall, y no Scopus o ScienceDirect: los términos de uso
de esas plataformas prohíben la descarga automatizada y tienen protección
anti-bot. OpenAlex es un índice abierto (CC0) con API pública, y tanto su
`best_oa_location` como Unpaywall apuntan únicamente a copias de acceso
abierto legales (repositorios institucionales, revistas OA, versiones
aceptadas autorizadas por el editor).

Variables de entorno opcionales:
  DESCUBRIMIENTO_EMAIL  correo de contacto. Activa el "polite pool" de OpenAlex
                        (parámetro mailto) y es obligatorio para Unpaywall; sin
                        él, el respaldo por Unpaywall no se usa.
  OPENALEX_API_KEY      clave de OpenAlex, si la cuenta tiene una.
"""

import ipaddress
import logging
import os
import re
import socket
import time
import unicodedata
from typing import Dict, Iterable, List, Optional, Sequence
from urllib.parse import urlparse

import requests
from django.conf import settings

from ..models import Dataset, DatasetFile
from .bib_extractor import _normalizar_titulo

logger = logging.getLogger(__name__)

OPENALEX_WORKS = 'https://api.openalex.org/works'
UNPAYWALL_BASE = 'https://api.unpaywall.org/v2/'
USER_AGENT = 'AnalisisTransformacionDigital/1.0 (tesis; descubrimiento de literatura en acceso abierto)'

ORIGEN = 'OpenAlex (búsqueda automática)'
SOURCE_DB = 'other'

MAX_RESULTADOS = 200
MAX_BYTES_PDF = 40 * 1024 * 1024
PAUSA_ENTRE_DESCARGAS = 1.0          # segundos
TIMEOUT_API = 20                      # segundos
TIMEOUT_PDF = (10, 60)                # conexión, lectura
POR_PAGINA = 100
LOTE_IDS = 50

# Consulta por defecto: el tema de la tesis. Va en un filtro de OpenAlex, así
# que no puede llevar comas (separan filtros); los operadores booleanos sí.
CONSULTA_POR_DEFECTO = (
    '("digital transformation" OR digitalization OR digitalisation OR "digital technologies" '
    'OR "e-learning" OR "online learning" OR "artificial intelligence" OR "generative AI" '
    'OR ChatGPT OR "transformación digital") '
    'AND ("higher education" OR university OR universities OR "educación superior" OR universidad)'
)

# Términos del filtro de relevancia propio. Se comparan sobre texto en
# minúsculas y sin tildes, con límites de palabra.
TERMINOS_TD = {
    'digital transformation': r'digital(?:ly)? transform\w*',
    'digitalization': r'digitali[sz]ation',
    'digital technologies': r'digital technolog(?:y|ies)',
    'digital pedagogy': r'digital (?:pedagog(?:y|ies)|learning|education|competenc(?:e|es|y|ies)|literacy)',
    'blended learning': r'(?:blended|hybrid|remote) (?:learning|teaching|education)',
    'e-learning': r'e-?\s?learning',
    'online learning': r'online (?:learning|education|teaching)',
    'edtech': r'edtech|educational technolog(?:y|ies)',
    'artificial intelligence': r'artificial intelligence',
    'generative ai': r'generative (?:ai|artificial intelligence)',
    'chatgpt': r'chatgpt|large language models?',
    'transformación digital': r'transformacion digital',
    'digitalización': r'digitalizacion',
    'tecnologías digitales': r'tecnologias digitales',
    'competencias digitales': r'(?:competencias|pedagogia|educacion) digital(?:es)?',
    'aprendizaje en línea': r'(?:aprendizaje|educacion|ensenanza) (?:en linea|virtual)',
    'inteligencia artificial': r'inteligencia artificial',
    'ia generativa': r'ia generativa',
}
TERMINOS_ES = {
    'higher education': r'higher education',
    'university': r'universit(?:y|ies)',
    'hei': r'heis?',
    'college': r'colleges?',
    'tertiary': r'tertiary',
    'educación superior': r'educacion superior',
    'universidad': r'universidad(?:es)?|universitari[oa]s?',
}
_PATRONES_TD = {k: re.compile(rf'\b(?:{v})\b') for k, v in TERMINOS_TD.items()}
_PATRONES_ES = {k: re.compile(rf'\b(?:{v})\b') for k, v in TERMINOS_ES.items()}

_ID_OPENALEX = re.compile(r'^(?:https?://openalex\.org/)?(W\d{1,15})$', re.IGNORECASE)


class ErrorDescubrimiento(Exception):
    """OpenAlex no respondió o respondió algo inutilizable."""


# ─── Utilidades puras ────────────────────────────────────────────────────────

def _email_contacto() -> str:
    return (getattr(settings, 'DESCUBRIMIENTO_EMAIL', '') or os.environ.get('DESCUBRIMIENTO_EMAIL', '')).strip()


def _sin_tildes(texto: str) -> str:
    descompuesto = unicodedata.normalize('NFKD', (texto or '').lower())
    return ''.join(c for c in descompuesto if not unicodedata.combining(c))


def normalizar_doi(doi: Optional[str]) -> str:
    """'https://doi.org/10.1/ABC.' -> '10.1/abc'. Cadena vacía si no hay DOI."""
    if not doi:
        return ''
    valor = doi.strip().lower()
    valor = re.sub(r'^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)', '', valor)
    return valor.rstrip('.,;)\'"').strip()


def normalizar_id_openalex(valor: str) -> Optional[str]:
    """'https://openalex.org/W123' o 'w123' -> 'W123'. None si no es un id de obra."""
    coincidencia = _ID_OPENALEX.match((valor or '').strip())
    return coincidencia.group(1).upper() if coincidencia else None


def reconstruir_resumen(indice: Optional[Dict[str, List[int]]]) -> str:
    """OpenAlex entrega el resumen como índice invertido {palabra: [posiciones]}."""
    if not indice:
        return ''
    posiciones = {}
    for palabra, lugares in indice.items():
        for lugar in lugares or []:
            posiciones[lugar] = palabra
    return ' '.join(posiciones[i] for i in sorted(posiciones))


def evaluar_relevancia(titulo: str, resumen: str) -> Dict:
    """
    Filtro propio, además del de OpenAlex: exige un término de transformación
    digital y otro de educación superior en el título o el resumen.
    """
    texto = _sin_tildes(f'{titulo or ""} {resumen or ""}')
    td = [k for k, patron in _PATRONES_TD.items() if patron.search(texto)]
    es = [k for k, patron in _PATRONES_ES.items() if patron.search(texto)]

    if td and es:
        motivo = f"Incluido: transformación digital ({', '.join(td)}) y educación superior ({', '.join(es)})"
    elif td:
        motivo = f"Excluido: sin término de educación superior (TD: {', '.join(td)})"
    elif es:
        motivo = f"Excluido: sin término de transformación digital (ES: {', '.join(es)})"
    else:
        motivo = 'Excluido: sin términos de transformación digital ni de educación superior'
    return {'relevante': bool(td and es), 'motivo': motivo, 'terminos_td': td, 'terminos_es': es}


def _es_url_publica(url: str) -> bool:
    """
    Solo http(s) hacia direcciones públicas. Las URL vienen de OpenAlex o de
    Unpaywall, no del cliente, pero una entrada manipulada no debe poder hacer
    que el servidor consulte su red interna.
    """
    try:
        partes = urlparse(url)
        if partes.scheme not in ('http', 'https') or not partes.hostname:
            return False
        direcciones = socket.getaddrinfo(partes.hostname, partes.port or None)
    except (ValueError, socket.gaierror, UnicodeError):
        return False
    for *_, sockaddr in direcciones:
        ip = ipaddress.ip_address(sockaddr[0].split('%')[0])
        if not ip.is_global:
            return False
    return True


def _nombre_archivo(titulo: str, openalex_id: str) -> str:
    base = re.sub(r'[^a-z0-9]+', '_', _sin_tildes(titulo or '')).strip('_')[:80]
    return f"{base or 'articulo'}_{openalex_id}.pdf"


# ─── OpenAlex ────────────────────────────────────────────────────────────────

CAMPOS_OPENALEX = ','.join([
    'id', 'doi', 'display_name', 'publication_year', 'language', 'type',
    'authorships', 'primary_location', 'best_oa_location', 'open_access',
    'abstract_inverted_index', 'locations',
])


def _parametros_base() -> Dict[str, str]:
    parametros = {'select': CAMPOS_OPENALEX}
    email = _email_contacto()
    if email:
        parametros['mailto'] = email
    clave = os.environ.get('OPENALEX_API_KEY', '').strip()
    if clave:
        parametros['api_key'] = clave
    return parametros


def _motivo_openalex(respuesta) -> str:
    """Código y mensaje de error de OpenAlex, sin la URL (puede llevar api_key)."""
    try:
        cuerpo = respuesta.json()
        detalle = cuerpo.get('message') or cuerpo.get('error') or ''
    except ValueError:
        detalle = getattr(respuesta, 'text', '') or ''
    detalle = ' '.join(str(detalle).split())[:200]
    return f'OpenAlex respondió {respuesta.status_code}' + (f': {detalle}' if detalle else '')


def _get_openalex(parametros: Dict[str, str]) -> Dict:
    # 429 y 5xx suelen ser pasajeros (límite por IP compartida en el Space).
    esperas = (2, 5, 0)
    for espera in esperas:
        try:
            respuesta = requests.get(
                OPENALEX_WORKS, params=parametros, timeout=TIMEOUT_API,
                headers={'User-Agent': USER_AGENT},
            )
        except requests.RequestException as exc:
            # Solo el tipo: el texto de la excepción incluye la URL con api_key.
            raise ErrorDescubrimiento(
                f'No se pudo contactar OpenAlex ({type(exc).__name__})') from exc
        if respuesta.status_code == 200:
            break
        if respuesta.status_code == 429 or respuesta.status_code >= 500:
            if espera:
                time.sleep(espera)
                continue
        raise ErrorDescubrimiento(_motivo_openalex(respuesta))
    try:
        return respuesta.json()
    except ValueError as exc:
        raise ErrorDescubrimiento('OpenAlex devolvió una respuesta que no es JSON') from exc


def _obra_a_candidato(obra: Dict) -> Dict:
    """Aplanar una obra de OpenAlex al formato de candidato."""
    titulo = (obra.get('display_name') or '').strip()
    resumen = reconstruir_resumen(obra.get('abstract_inverted_index'))
    fuente = ((obra.get('primary_location') or {}).get('source') or {})
    oa = obra.get('best_oa_location') or {}
    acceso = obra.get('open_access') or {}
    pdf_url = oa.get('pdf_url') or ''
    # Otras copias abiertas (repositorios, PMC...) por si el editor bloquea la
    # descarga automática de la principal.
    alternativas = []
    for ubicacion in obra.get('locations') or []:
        ubicacion = ubicacion or {}
        url = ubicacion.get('pdf_url')
        if ubicacion.get('is_oa') and url and url != pdf_url and url not in alternativas:
            alternativas.append(url)
    if not pdf_url and alternativas:
        pdf_url = alternativas.pop(0)
    autores = [
        ((a.get('author') or {}).get('display_name') or '').strip()
        for a in obra.get('authorships') or []
    ]
    relevancia = evaluar_relevancia(titulo, resumen)
    return {
        'openalex_id': normalizar_id_openalex(obra.get('id') or '') or '',
        'titulo': titulo,
        'anio': obra.get('publication_year'),
        'autores': '; '.join(a for a in autores if a),
        'revista': fuente.get('display_name') or '',
        'doi': normalizar_doi(obra.get('doi')),
        'idioma': obra.get('language') or '',
        'tipo': obra.get('type') or '',
        'resumen': resumen,
        'acceso_abierto': bool(acceso.get('is_oa')),
        'estado_oa': acceso.get('oa_status') or '',
        'pdf_abierto': bool(pdf_url),
        'pdf_url': pdf_url,
        'pdf_urls_alternativas': alternativas,
        'licencia': oa.get('license') or '',
        'duplicado': False,
        'motivo_duplicado': '',
        'relevante': relevancia['relevante'],
        'motivo_relevancia': relevancia['motivo'],
    }


def _huellas_existentes(dataset: Dataset):
    """DOI y títulos normalizados que ya están en el dataset."""
    filas = list(DatasetFile.objects.filter(dataset=dataset).values_list('bib_doi', 'bib_title'))
    dois = {normalizar_doi(doi) for doi, _ in filas if doi}
    titulos = {_normalizar_titulo(t) for _, t in filas if t}
    dois.discard('')
    titulos.discard('')
    return dois, titulos


def _marcar_duplicado(candidato: Dict, dois: set, titulos: set) -> None:
    if candidato['doi'] and candidato['doi'] in dois:
        candidato['duplicado'] = True
        candidato['motivo_duplicado'] = f"DOI {candidato['doi']} ya está en el dataset"
    elif candidato['titulo'] and _normalizar_titulo(candidato['titulo']) in titulos:
        candidato['duplicado'] = True
        candidato['motivo_duplicado'] = 'Un archivo del dataset tiene el mismo título'


def buscar_candidatos(
    consulta: Optional[str] = None,
    desde_anio: Optional[int] = None,
    hasta_anio: Optional[int] = None,
    max_resultados: int = 50,
    idiomas: Sequence[str] = ('en', 'es'),
    dataset: Optional[Dataset] = None,
) -> List[Dict]:
    """
    Consultar OpenAlex y devolver candidatos con su evaluación de relevancia.

    No descarga nada. Si se pasa `dataset`, marca los que ya están en él.
    Devuelve los relevantes y los excluidos (con su motivo), en el orden de
    relevancia de OpenAlex.
    """
    max_resultados = max(1, min(int(max_resultados), MAX_RESULTADOS))
    termino = (consulta or '').strip().replace(',', ' ') or CONSULTA_POR_DEFECTO

    filtros = [f'title_and_abstract.search:{termino}', 'type:article|review']
    if desde_anio and hasta_anio:
        filtros.append(f'publication_year:{int(desde_anio)}-{int(hasta_anio)}')
    elif desde_anio:
        filtros.append(f'publication_year:>{int(desde_anio) - 1}')
    elif hasta_anio:
        filtros.append(f'publication_year:<{int(hasta_anio) + 1}')
    idiomas = [i for i in (idiomas or []) if re.fullmatch(r'[a-z]{2}', i or '')]
    if idiomas:
        filtros.append('language:' + '|'.join(idiomas))

    parametros = _parametros_base()
    parametros.update({
        'filter': ','.join(filtros),
        'per-page': str(min(POR_PAGINA, max_resultados)),
        'cursor': '*',
    })

    candidatos: List[Dict] = []
    vistos = set()
    while len(candidatos) < max_resultados:
        datos = _get_openalex(dict(parametros))
        obras = datos.get('results') or []
        for obra in obras:
            candidato = _obra_a_candidato(obra)
            if not candidato['openalex_id'] or candidato['openalex_id'] in vistos:
                continue
            vistos.add(candidato['openalex_id'])
            candidatos.append(candidato)
            if len(candidatos) >= max_resultados:
                break
        siguiente = (datos.get('meta') or {}).get('next_cursor')
        if not obras or not siguiente:
            break
        parametros['cursor'] = siguiente

    if dataset is not None:
        dois, titulos = _huellas_existentes(dataset)
        for candidato in candidatos:
            _marcar_duplicado(candidato, dois, titulos)

    logger.info(
        'Descubrimiento OpenAlex: %d candidatos, %d relevantes',
        len(candidatos), sum(c['relevante'] for c in candidatos),
    )
    return candidatos


def obtener_candidatos_por_id(ids: Iterable[str]) -> List[Dict]:
    """
    Volver a pedir a OpenAlex las obras elegidas.

    La descarga no se fía de URL enviadas por el cliente: los datos y el enlace
    al PDF salen siempre de OpenAlex.
    """
    normalizados = []
    for valor in ids:
        oid = normalizar_id_openalex(valor)
        if oid and oid not in normalizados:
            normalizados.append(oid)

    por_id = {}
    for inicio in range(0, len(normalizados), LOTE_IDS):
        lote = normalizados[inicio:inicio + LOTE_IDS]
        parametros = _parametros_base()
        parametros.update({'filter': 'ids.openalex:' + '|'.join(lote), 'per-page': str(LOTE_IDS)})
        for obra in _get_openalex(parametros).get('results') or []:
            candidato = _obra_a_candidato(obra)
            por_id[candidato['openalex_id']] = candidato
    return [por_id[oid] for oid in normalizados if oid in por_id]


# ─── Unpaywall y descarga ────────────────────────────────────────────────────

def pdf_desde_unpaywall(doi: str) -> str:
    """URL de un PDF en acceso abierto según Unpaywall, o '' si no hay."""
    email = _email_contacto()
    if not doi or not email:
        return ''
    try:
        respuesta = requests.get(
            f'{UNPAYWALL_BASE}{doi}', params={'email': email},
            timeout=TIMEOUT_API, headers={'User-Agent': USER_AGENT},
        )
        if respuesta.status_code != 200:
            return ''
        datos = respuesta.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning('Unpaywall falló para %s: %s', doi, exc)
        return ''
    ubicaciones = [datos.get('best_oa_location') or {}] + list(datos.get('oa_locations') or [])
    for ubicacion in ubicaciones:
        if ubicacion and ubicacion.get('url_for_pdf'):
            return ubicacion['url_for_pdf']
    return ''


def descargar_pdf(url: str) -> bytes:
    """
    Descargar un PDF con tiempo de espera y límite de tamaño.

    Lanza ValueError con el motivo si no se obtiene un PDF válido.
    """
    if not _es_url_publica(url):
        raise ValueError('URL no permitida (esquema o dirección no pública)')
    try:
        with requests.get(
            url, stream=True, timeout=TIMEOUT_PDF, allow_redirects=True,
            headers={'User-Agent': USER_AGENT, 'Accept': 'application/pdf'},
        ) as respuesta:
            if respuesta.status_code != 200:
                raise ValueError(f'El servidor respondió {respuesta.status_code}')
            final = getattr(respuesta, 'url', url) or url
            if final != url and not _es_url_publica(final):
                raise ValueError('La redirección apunta a una dirección no permitida')
            declarado = respuesta.headers.get('Content-Length')
            if declarado and declarado.isdigit() and int(declarado) > MAX_BYTES_PDF:
                raise ValueError(f'El PDF supera {MAX_BYTES_PDF // (1024 * 1024)} MB')
            partes, total = [], 0
            for trozo in respuesta.iter_content(chunk_size=64 * 1024):
                if not trozo:
                    continue
                total += len(trozo)
                if total > MAX_BYTES_PDF:
                    raise ValueError(f'El PDF supera {MAX_BYTES_PDF // (1024 * 1024)} MB')
                partes.append(trozo)
    except requests.RequestException as exc:
        raise ValueError(f'Error de red: {exc.__class__.__name__}') from exc

    contenido = b''.join(partes)
    if not contenido[:1024].lstrip().startswith(b'%PDF'):
        raise ValueError('El contenido descargado no es un PDF (probablemente una página web)')
    return contenido


def _actualizar_contadores(dataset: Dataset) -> None:
    # Consulta directa: el dataset de la vista viene con `files` precargado y
    # dataset.files.count() devolvería el recuento viejo.
    archivos = DatasetFile.objects.filter(dataset=dataset)
    dataset.total_files = archivos.count()
    dataset.total_size_bytes = sum(archivos.values_list('file_size_bytes', flat=True))
    dataset.save(update_fields=['total_files', 'total_size_bytes', 'updated_at'])


def descargar_candidatos(dataset: Dataset, candidatos: List[Dict], usuario=None,
                         pausa: float = PAUSA_ENTRE_DESCARGAS) -> Dict:
    """
    Descargar el PDF abierto de cada candidato y crear su DatasetFile.

    No se crea ningún archivo si no hay PDF legal o la descarga falla; el
    motivo queda en el resultado y en el log. Vuelve a comprobar duplicados
    justo antes de guardar, así que relanzarla con los mismos candidatos no
    duplica archivos.
    """
    resultado = {'descargados': [], 'omitidos': []}
    quien = getattr(usuario, 'username', None) or 'desconocido'

    for indice, candidato in enumerate(candidatos):
        oid = candidato.get('openalex_id', '')
        dois, titulos = _huellas_existentes(dataset)
        _marcar_duplicado(candidato, dois, titulos)
        if candidato['duplicado']:
            resultado['omitidos'].append({'openalex_id': oid, 'motivo': candidato['motivo_duplicado']})
            continue

        urls = [candidato['pdf_url']] if candidato.get('pdf_url') else []
        urls += [u for u in candidato.get('pdf_urls_alternativas') or [] if u not in urls]
        if indice > 0 and pausa:
            time.sleep(pausa)

        contenido, motivo, url_usada = None, '', ''
        for url in urls:
            try:
                contenido, url_usada = descargar_pdf(url), url
                break
            except ValueError as exc:
                motivo = str(exc)
        if contenido is None and candidato.get('doi'):
            respaldo = pdf_desde_unpaywall(candidato['doi'])
            if respaldo and respaldo not in urls:
                try:
                    contenido, url_usada = descargar_pdf(respaldo), respaldo
                except ValueError as exc:
                    motivo = f'Unpaywall: {exc}'
        if contenido is None:
            motivo = motivo or 'Sin PDF en acceso abierto (OpenAlex ni Unpaywall)'
            resultado['omitidos'].append({'openalex_id': oid, 'motivo': motivo})
            logger.info('Descubrimiento: %s omitido: %s', oid, motivo)
            continue

        nombre = _nombre_archivo(candidato.get('titulo', ''), oid)
        archivo = DatasetFile.objects.create(
            dataset=dataset,
            filename=nombre,
            original_filename=nombre,
            file_path=f'openalex://{oid}',
            file_size_bytes=len(contenido),
            mime_type='application/pdf',
            directory_path=ORIGEN,
            directory_name=ORIGEN,
            file_content=contenido,
            status='completed',
            bib_title=(candidato.get('titulo') or '')[:1000] or None,
            bib_year=candidato.get('anio'),
            bib_authors=candidato.get('autores') or None,
            bib_journal=(candidato.get('revista') or '')[:500] or None,
            bib_doi=(candidato.get('doi') or '')[:300] or None,
            bib_abstract=candidato.get('resumen') or None,
            bib_source_db=SOURCE_DB,
        )
        _actualizar_contadores(dataset)
        resultado['descargados'].append({'openalex_id': oid, 'archivo_id': archivo.id, 'url': url_usada})
        logger.info('Descubrimiento: %s descargado por %s desde %s', oid, quien, url_usada)

    logger.info(
        'Descubrimiento en dataset %s: %d descargados, %d omitidos',
        dataset.id, len(resultado['descargados']), len(resultado['omitidos']),
    )
    return resultado

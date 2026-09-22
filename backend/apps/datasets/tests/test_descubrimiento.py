"""
Tests del descubrimiento automático de artículos (OpenAlex + Unpaywall).

Todo el HTTP está simulado: ningún test sale a la red.
"""

from unittest.mock import MagicMock, patch

import pytest
import requests
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.datasets.models import Dataset, DatasetFile
from apps.datasets.services import descubrimiento as desc

User = get_user_model()
PDF = b'%PDF-1.7\n' + b'0' * 2048
MOD = 'apps.datasets.services.descubrimiento'
URL_PUBLICA_REAL = desc._es_url_publica


# ─── Dobles de HTTP ──────────────────────────────────────────────────────────

class RespuestaFalsa:
    """Imita lo que usa el servicio de requests.Response."""

    def __init__(self, status_code=200, json_data=None, contenido=b'', headers=None, url=''):
        self.status_code = status_code
        self._json = json_data
        self._contenido = contenido
        self.headers = headers or {}
        self.url = url

    def json(self):
        if self._json is None:
            raise ValueError('no es JSON')
        return self._json

    def iter_content(self, chunk_size=1024):
        for i in range(0, len(self._contenido), chunk_size):
            yield self._contenido[i:i + chunk_size]

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def indice_invertido(texto):
    indice = {}
    for posicion, palabra in enumerate(texto.split()):
        indice.setdefault(palabra, []).append(posicion)
    return indice


def obra(wid='W1', titulo='Digital transformation in universities', resumen='',
         doi='https://doi.org/10.1234/ABC', pdf_url='https://repo.example.org/a.pdf', anio=2022):
    return {
        'id': f'https://openalex.org/{wid}',
        'doi': doi,
        'display_name': titulo,
        'publication_year': anio,
        'language': 'en',
        'type': 'article',
        'authorships': [
            {'author': {'display_name': 'Ana Pérez'}},
            {'author': {'display_name': 'Luis Gómez'}},
        ],
        'primary_location': {'source': {'display_name': 'Education and Information Technologies'}},
        'best_oa_location': {'pdf_url': pdf_url, 'license': 'cc-by'} if pdf_url else None,
        'open_access': {'is_oa': bool(pdf_url), 'oa_status': 'gold' if pdf_url else 'closed'},
        'abstract_inverted_index': indice_invertido(resumen) if resumen else None,
    }


def pagina(obras, next_cursor=None):
    return RespuestaFalsa(json_data={'meta': {'next_cursor': next_cursor}, 'results': obras})


@pytest.fixture(autouse=True)
def sin_dns():
    """Las URL de prueba no existen: se da por buena la comprobación de red pública."""
    with patch(f'{MOD}._es_url_publica', return_value=True):
        yield


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        username='admin_desc', email='admin_desc@example.com',
        password='ClaveSegura123!', role='admin',
    )


@pytest.fixture
def dataset(admin):
    return Dataset.objects.create(name='Corpus TD', source='upload', created_by=admin, status='completed')


@pytest.fixture
def cliente(admin):
    c = APIClient()
    c.force_authenticate(user=admin)
    return c


# ─── Funciones puras ─────────────────────────────────────────────────────────

@pytest.mark.unit
class TestRelevancia:

    def test_incluye_td_en_universidades(self):
        r = desc.evaluar_relevancia(
            'Digital transformation in universities: a systematic review',
            'We analyse how higher education institutions adopt digital technologies.',
        )
        assert r['relevante'] is True
        assert 'digital transformation' in r['terminos_td']
        assert 'university' in r['terminos_es']
        assert r['motivo'].startswith('Incluido')

    def test_excluye_td_en_manufactura(self):
        r = desc.evaluar_relevancia(
            'Digital transformation of manufacturing SMEs',
            'Industry 4.0 and digitalization of production lines in automotive plants.',
        )
        assert r['relevante'] is False
        assert 'educación superior' in r['motivo']

    def test_reconoce_terminos_en_espanol_con_y_sin_tildes(self):
        r = desc.evaluar_relevancia('Transformacion digital en la educación superior', '')
        assert r['relevante'] is True

    def test_excluye_educacion_sin_td(self):
        r = desc.evaluar_relevancia('Student retention at the university', 'Survey of first-year students.')
        assert r['relevante'] is False
        assert 'transformación digital' in r['motivo']

    def test_sin_ningun_termino(self):
        assert desc.evaluar_relevancia('Soil chemistry', '')['motivo'].startswith('Excluido: sin términos')


@pytest.mark.unit
class TestUtilidades:

    def test_reconstruye_el_resumen_en_orden(self):
        indice = {'transformation': [1], 'Digital': [0], 'matters': [2], 'a': [4], 'lot': [5], 'quite': [3]}
        assert desc.reconstruir_resumen(indice) == 'Digital transformation matters quite a lot'

    def test_resumen_vacio(self):
        assert desc.reconstruir_resumen(None) == ''

    @pytest.mark.parametrize('entrada,esperado', [
        ('https://doi.org/10.1234/ABC.', '10.1234/abc'),
        ('doi:10.1234/abc', '10.1234/abc'),
        ('http://dx.doi.org/10.1234/Abc', '10.1234/abc'),
        (None, ''),
    ])
    def test_normaliza_doi(self, entrada, esperado):
        assert desc.normalizar_doi(entrada) == esperado

    @pytest.mark.parametrize('entrada,esperado', [
        ('https://openalex.org/W123', 'W123'),
        ('w45', 'W45'),
        ('A123', None),
        ('W1; DROP', None),
    ])
    def test_normaliza_id_openalex(self, entrada, esperado):
        assert desc.normalizar_id_openalex(entrada) == esperado


@pytest.mark.unit
class TestUrlPublica:
    """Se prueba la función real, sin el parche autouse."""

    @pytest.mark.parametrize('url,esperado', [
        ('http://127.0.0.1/a.pdf', False),
        ('http://10.0.0.5/a.pdf', False),
        ('http://169.254.169.254/latest/meta-data', False),
        ('ftp://8.8.8.8/a.pdf', False),
        ('https://8.8.8.8/a.pdf', True),
    ])
    def test_solo_direcciones_publicas(self, url, esperado):
        assert URL_PUBLICA_REAL(url) is esperado


# ─── Búsqueda ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBuscarCandidatos:

    def test_pagina_con_cursor_y_marca_relevancia(self, dataset):
        manufactura = obra('W2', 'Digital transformation of manufacturing SMEs',
                           resumen='Industry 4.0 in automotive plants', pdf_url=None, doi=None)
        respuestas = [pagina([obra('W1', resumen='Higher education institutions adopt tools')], 'c2'),
                      pagina([manufactura], None)]
        with patch(f'{MOD}.requests.get', side_effect=respuestas) as get:
            candidatos = desc.buscar_candidatos(max_resultados=10, desde_anio=2018, hasta_anio=2024,
                                                dataset=dataset)

        assert [c['openalex_id'] for c in candidatos] == ['W1', 'W2']
        assert candidatos[0]['relevante'] and not candidatos[1]['relevante']
        assert candidatos[0]['pdf_abierto'] and not candidatos[1]['pdf_abierto']
        assert candidatos[0]['doi'] == '10.1234/abc'
        assert candidatos[0]['resumen'] == 'Higher education institutions adopt tools'
        assert candidatos[0]['autores'] == 'Ana Pérez; Luis Gómez'

        primera = get.call_args_list[0].kwargs['params']
        assert 'publication_year:2018-2024' in primera['filter']
        assert 'type:article|review' in primera['filter']
        assert 'language:en|es' in primera['filter']
        assert primera['cursor'] == '*'
        assert get.call_args_list[1].kwargs['params']['cursor'] == 'c2'

    def test_respeta_el_maximo(self):
        with patch(f'{MOD}.requests.get', return_value=pagina([obra('W1'), obra('W2'), obra('W3')], 'c')):
            assert len(desc.buscar_candidatos(max_resultados=2)) == 2

    def test_detecta_duplicado_por_doi(self, dataset):
        DatasetFile.objects.create(
            dataset=dataset, filename='x.pdf', original_filename='x.pdf', file_path='/x',
            file_size_bytes=1, bib_doi='https://doi.org/10.1234/abc', bib_title='Otro título',
        )
        with patch(f'{MOD}.requests.get', return_value=pagina([obra('W1'), obra('W9', doi='10.9/zzz', titulo='Nuevo')])):
            candidatos = desc.buscar_candidatos(max_resultados=5, dataset=dataset)
        assert candidatos[0]['duplicado'] is True
        assert 'DOI' in candidatos[0]['motivo_duplicado']
        assert candidatos[1]['duplicado'] is False

    def test_detecta_duplicado_por_titulo(self, dataset):
        DatasetFile.objects.create(
            dataset=dataset, filename='x.pdf', original_filename='x.pdf', file_path='/x',
            file_size_bytes=1, bib_title='DIGITAL TRANSFORMATION in universities.',
        )
        with patch(f'{MOD}.requests.get', return_value=pagina([obra('W1', doi=None)])):
            candidatos = desc.buscar_candidatos(max_resultados=5, dataset=dataset)
        assert candidatos[0]['duplicado'] is True

    def test_error_de_openalex(self):
        with patch(f'{MOD}.requests.get', return_value=RespuestaFalsa(status_code=503)):
            with pytest.raises(desc.ErrorDescubrimiento):
                desc.buscar_candidatos()

    def test_error_de_red(self):
        with patch(f'{MOD}.requests.get', side_effect=requests.ConnectionError('caída')):
            with pytest.raises(desc.ErrorDescubrimiento):
                desc.buscar_candidatos()

    def test_obtener_por_id_consulta_openalex(self):
        with patch(f'{MOD}.requests.get', return_value=pagina([obra('W1')])) as get:
            candidatos = desc.obtener_candidatos_por_id(['https://openalex.org/W1', 'w1', 'basura'])
        assert [c['openalex_id'] for c in candidatos] == ['W1']
        assert get.call_args.kwargs['params']['filter'] == 'ids.openalex:W1'


# ─── Descarga ────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestDescargarPdf:

    def test_rechaza_html(self):
        html = RespuestaFalsa(contenido=b'<!DOCTYPE html><html>login</html>')
        with patch(f'{MOD}.requests.get', return_value=html):
            with pytest.raises(ValueError, match='no es un PDF'):
                desc.descargar_pdf('https://repo.example.org/a.pdf')

    def test_rechaza_por_tamano_declarado(self):
        grande = RespuestaFalsa(contenido=PDF, headers={'Content-Length': str(desc.MAX_BYTES_PDF + 1)})
        with patch(f'{MOD}.requests.get', return_value=grande):
            with pytest.raises(ValueError, match='supera'):
                desc.descargar_pdf('https://repo.example.org/a.pdf')

    def test_rechaza_por_tamano_real(self):
        with patch(f'{MOD}.MAX_BYTES_PDF', 100), \
                patch(f'{MOD}.requests.get', return_value=RespuestaFalsa(contenido=PDF)):
            with pytest.raises(ValueError, match='supera'):
                desc.descargar_pdf('https://repo.example.org/a.pdf')

    def test_rechaza_codigo_http(self):
        with patch(f'{MOD}.requests.get', return_value=RespuestaFalsa(status_code=403)):
            with pytest.raises(ValueError, match='403'):
                desc.descargar_pdf('https://repo.example.org/a.pdf')

    def test_acepta_pdf(self):
        with patch(f'{MOD}.requests.get', return_value=RespuestaFalsa(contenido=PDF)):
            assert desc.descargar_pdf('https://repo.example.org/a.pdf') == PDF

    def test_url_no_publica(self):
        with patch(f'{MOD}._es_url_publica', return_value=False):
            with pytest.raises(ValueError, match='no permitida'):
                desc.descargar_pdf('http://127.0.0.1/a.pdf')


@pytest.mark.django_db
class TestDescargarCandidatos:

    def candidato(self, **kw):
        c = desc._obra_a_candidato(obra(resumen='Higher education institutions adopt tools', **kw))
        return c

    def test_crea_el_archivo_con_contenido_y_metadatos(self, dataset, admin):
        with patch(f'{MOD}.requests.get', return_value=RespuestaFalsa(contenido=PDF)):
            resultado = desc.descargar_candidatos(dataset, [self.candidato()], admin, pausa=0)

        assert len(resultado['descargados']) == 1
        archivo = DatasetFile.objects.get(dataset=dataset)
        assert bytes(archivo.file_content) == PDF
        assert archivo.file_size_bytes == len(PDF)
        assert archivo.mime_type == 'application/pdf'
        assert archivo.original_filename.endswith('_W1.pdf')
        assert archivo.bib_title == 'Digital transformation in universities'
        assert archivo.bib_year == 2022
        assert archivo.bib_authors == 'Ana Pérez; Luis Gómez'
        assert archivo.bib_journal == 'Education and Information Technologies'
        assert archivo.bib_doi == '10.1234/abc'
        assert archivo.bib_abstract == 'Higher education institutions adopt tools'
        assert archivo.bib_source_db == 'other'
        assert archivo.directory_name == desc.ORIGEN
        dataset.refresh_from_db()
        assert dataset.total_files == 1
        assert dataset.total_size_bytes == len(PDF)

    def test_no_crea_nada_si_no_es_pdf(self, dataset, admin):
        with patch(f'{MOD}.requests.get', return_value=RespuestaFalsa(contenido=b'<html></html>')):
            resultado = desc.descargar_candidatos(dataset, [self.candidato(doi=None)], admin, pausa=0)
        assert DatasetFile.objects.count() == 0
        assert 'no es un PDF' in resultado['omitidos'][0]['motivo']

    def test_sin_pdf_ni_correo_registra_motivo(self, dataset, admin, monkeypatch):
        monkeypatch.delenv('DESCUBRIMIENTO_EMAIL', raising=False)
        with patch(f'{MOD}.requests.get') as get:
            resultado = desc.descargar_candidatos(dataset, [self.candidato(pdf_url=None)], admin, pausa=0)
        get.assert_not_called()
        assert DatasetFile.objects.count() == 0
        assert 'Sin PDF' in resultado['omitidos'][0]['motivo']

    def test_respaldo_con_unpaywall(self, dataset, admin, monkeypatch):
        monkeypatch.setenv('DESCUBRIMIENTO_EMAIL', 'tesis@example.org')
        unpaywall = RespuestaFalsa(json_data={'best_oa_location': {'url_for_pdf': 'https://oa.example.org/b.pdf'}})
        with patch(f'{MOD}.requests.get', side_effect=[unpaywall, RespuestaFalsa(contenido=PDF)]) as get:
            resultado = desc.descargar_candidatos(dataset, [self.candidato(pdf_url=None)], admin, pausa=0)
        assert resultado['descargados'][0]['url'] == 'https://oa.example.org/b.pdf'
        assert get.call_args_list[0].kwargs['params'] == {'email': 'tesis@example.org'}
        assert DatasetFile.objects.count() == 1

    def test_prueba_otra_copia_abierta_si_la_principal_falla(self, dataset, admin):
        datos = obra(resumen='Higher education', doi=None)
        datos['locations'] = [
            None,
            {'is_oa': False, 'pdf_url': 'https://cerrado.example.org/x.pdf'},
            {'is_oa': True, 'pdf_url': 'https://repositorio.example.org/c.pdf'},
        ]
        candidato = desc._obra_a_candidato(datos)
        assert candidato['pdf_urls_alternativas'] == ['https://repositorio.example.org/c.pdf']
        respuestas = [RespuestaFalsa(status_code=403), RespuestaFalsa(contenido=PDF)]
        with patch(f'{MOD}.requests.get', side_effect=respuestas):
            resultado = desc.descargar_candidatos(dataset, [candidato], admin, pausa=0)
        assert resultado['descargados'][0]['url'] == 'https://repositorio.example.org/c.pdf'

    def test_omite_duplicados(self, dataset, admin):
        DatasetFile.objects.create(
            dataset=dataset, filename='x.pdf', original_filename='x.pdf', file_path='/x',
            file_size_bytes=1, bib_doi='10.1234/ABC',
        )
        with patch(f'{MOD}.requests.get') as get:
            resultado = desc.descargar_candidatos(dataset, [self.candidato()], admin, pausa=0)
        get.assert_not_called()
        assert 'DOI' in resultado['omitidos'][0]['motivo']
        assert DatasetFile.objects.count() == 1

    def test_pausa_entre_descargas(self, dataset, admin):
        candidatos = [self.candidato(), self.candidato(wid='W2', doi='10.1/b', titulo='Otro sobre universities')]
        with patch(f'{MOD}.requests.get', return_value=RespuestaFalsa(contenido=PDF)), \
                patch(f'{MOD}.time.sleep') as dormir:
            desc.descargar_candidatos(dataset, candidatos, admin, pausa=1.5)
        dormir.assert_called_once_with(1.5)
        assert DatasetFile.objects.count() == 2


# ─── Endpoints ───────────────────────────────────────────────────────────────

@pytest.mark.integration
@pytest.mark.django_db
class TestEndpoints:

    def url(self, dataset, accion):
        return f'/api/v1/datasets/{dataset.id}/{accion}/'

    def test_vista_previa(self, cliente, dataset):
        manufactura = obra('W2', 'Digital transformation of manufacturing SMEs', doi=None, pdf_url=None)
        with patch(f'{MOD}.requests.get', return_value=pagina([obra('W1'), manufactura])):
            r = cliente.post(self.url(dataset, 'descubrir'),
                             {'desde_anio': 2019, 'hasta_anio': 2024, 'max_resultados': 20}, format='json')
        assert r.status_code == 200
        assert r.data['total'] == 2
        assert r.data['relevantes'] == 1
        assert r.data['con_pdf_abierto'] == 1
        primero = r.data['candidatos'][0]
        for campo in ('titulo', 'anio', 'revista', 'doi', 'idioma', 'pdf_abierto', 'duplicado', 'motivo_relevancia'):
            assert campo in primero
        assert DatasetFile.objects.count() == 0

    def test_vista_previa_rechaza_max_excesivo(self, cliente, dataset):
        r = cliente.post(self.url(dataset, 'descubrir'), {'max_resultados': 5000}, format='json')
        assert r.status_code == 400

    def test_vista_previa_rechaza_anios_invertidos(self, cliente, dataset):
        r = cliente.post(self.url(dataset, 'descubrir'), {'desde_anio': 2024, 'hasta_anio': 2018}, format='json')
        assert r.status_code == 400

    def test_vista_previa_openalex_caido(self, cliente, dataset):
        with patch(f'{MOD}.requests.get', return_value=RespuestaFalsa(status_code=500)):
            r = cliente.post(self.url(dataset, 'descubrir'), {}, format='json')
        assert r.status_code == 502

    def test_lanza_la_descarga_en_segundo_plano(self, cliente, dataset):
        with patch('apps.datasets.views.run_in_background') as fondo:
            r = cliente.post(self.url(dataset, 'descargar_candidatos'),
                             {'ids': ['https://openalex.org/W1', 'W1', 'w2']}, format='json')
        assert r.status_code == 202
        assert r.data['ids'] == ['W1', 'W2']
        assert r.data['solicitados'] == 2
        fondo.assert_called_once()
        dataset.refresh_from_db()
        assert dataset.status == 'processing'

    def test_la_tarea_de_fondo_descarga_y_cierra_el_estado(self, cliente, dataset):
        def ejecutar_ya(objetivo, *args, **kwargs):
            objetivo(*args)
            return MagicMock()

        respuestas = [pagina([obra('W1', resumen='Higher education')]), RespuestaFalsa(contenido=PDF)]
        with patch('apps.datasets.views.run_in_background', side_effect=ejecutar_ya), \
                patch(f'{MOD}.requests.get', side_effect=respuestas), \
                patch(f'{MOD}.time.sleep'):
            r = cliente.post(self.url(dataset, 'descargar_candidatos'), {'ids': ['W1']}, format='json')
        assert r.status_code == 202
        dataset.refresh_from_db()
        assert dataset.status == 'completed'
        assert dataset.total_files == 1

    def test_la_tarea_de_fondo_marca_error(self, cliente, dataset):
        def ejecutar_ya(objetivo, *args, **kwargs):
            objetivo(*args)

        with patch('apps.datasets.views.run_in_background', side_effect=ejecutar_ya), \
                patch(f'{MOD}.requests.get', return_value=RespuestaFalsa(status_code=500)):
            cliente.post(self.url(dataset, 'descargar_candidatos'), {'ids': ['W1']}, format='json')
        dataset.refresh_from_db()
        assert dataset.status == 'error'

    def test_rechaza_ids_invalidos(self, cliente, dataset):
        r = cliente.post(self.url(dataset, 'descargar_candidatos'),
                         {'ids': ['https://evil.example/x.pdf']}, format='json')
        assert r.status_code == 400

    def test_usuario_normal_no_puede(self, dataset):
        normal = User.objects.create_user(username='n', email='n@example.com', password='x', role='user')
        c = APIClient()
        c.force_authenticate(user=normal)
        assert c.post(self.url(dataset, 'descubrir'), {}, format='json').status_code == 403
        assert c.post(self.url(dataset, 'descargar_candidatos'), {'ids': ['W1']}, format='json').status_code == 403

    def test_anonimo_no_puede(self, dataset):
        assert APIClient().post(self.url(dataset, 'descubrir'), {}, format='json').status_code == 401

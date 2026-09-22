"""
Tests de la extracción de metadatos bibliográficos.

Dos riesgos concretos del corpus de la tesis:
- Los archivos de Drive tienen file_path "drive://…" y el PDF real está en la
  copia de la base de datos: sin ella no se leía ni un DOI.
- CrossRef devuelve resultados parecidos; aceptar el primero sin comprobarlo
  asignaba el año, los autores y el DOI de otro artículo.
"""

import os
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from apps.datasets.archivos import pdf_local
from apps.datasets.services.bib_extractor import BibExtractorService, mismo_titulo

TITULO = 'Digital transformation of higher education institutions: a systematic literature review'


def respuesta(items):
    r = MagicMock()
    r.status_code = 200
    r.json.return_value = {'message': {'items': items}}
    return r


def item(titulo, anio=2022, doi='10.1000/xyz'):
    return {
        'title': [titulo],
        'issued': {'date-parts': [[anio]]},
        'author': [{'family': 'Pérez', 'given': 'Ana'}],
        'container-title': ['Education and Information Technologies'],
        'DOI': doi,
    }


@pytest.mark.unit
class TestMismoTitulo:

    def test_ignora_puntuacion_y_mayusculas(self):
        assert mismo_titulo(TITULO, 'DIGITAL TRANSFORMATION of Higher Education Institutions - A Systematic Literature Review')

    def test_acepta_el_subtitulo_omitido(self):
        assert mismo_titulo('Digital transformation of higher education institutions', TITULO)

    def test_rechaza_otro_articulo_del_mismo_tema(self):
        assert not mismo_titulo(TITULO, 'Digital transformation in universities during the COVID-19 pandemic')

    def test_rechaza_titulos_vacios(self):
        assert not mismo_titulo('', TITULO)


@pytest.mark.unit
class TestCrossrefPorTitulo:

    def test_elige_el_resultado_que_coincide_aunque_no_sea_el_primero(self):
        extractor = BibExtractorService()
        items = [item('A different paper about digital learning platforms', 2019, '10.1/otro'),
                 item(TITULO, 2023, '10.1/correcto')]
        with patch('apps.datasets.services.bib_extractor.requests.get', return_value=respuesta(items)):
            resultado = extractor._search_crossref_by_title(TITULO)
        assert resultado['bib_doi'] == '10.1/correcto'
        assert resultado['bib_year'] == 2023

    def test_sin_coincidencia_no_asigna_metadatos_de_otro_articulo(self):
        extractor = BibExtractorService()
        items = [item('A different paper about digital learning platforms', 2019, '10.1/otro')]
        with patch('apps.datasets.services.bib_extractor.requests.get', return_value=respuesta(items)):
            assert extractor._search_crossref_by_title(TITULO) == {}


@pytest.mark.unit
class TestExtraccionDePdf:

    def test_sin_pdf_en_disco_usa_el_nombre_y_crossref(self):
        extractor = BibExtractorService()
        with patch('apps.datasets.services.bib_extractor.requests.get', return_value=respuesta([item(TITULO)])):
            meta = extractor.extract_from_pdf(None, original_filename=TITULO + '.pdf')
        assert meta['bib_year'] == 2022
        assert meta['bib_doi'] == '10.1000/xyz'

    def test_descarta_el_doi_del_texto_si_es_de_una_referencia(self):
        """El primer DOI del texto era de un artículo citado, no del propio."""
        extractor = BibExtractorService()
        otro = {'bib_title': 'Teachers acceptance of learning management systems', 'bib_year': 2015}
        with patch.object(extractor, '_extract_pdf_info', return_value={}), \
                patch.object(extractor, '_extract_doi_from_text', return_value='10.1/referencia'), \
                patch.object(extractor, '_fetch_crossref', return_value=dict(otro)), \
                patch.object(extractor, '_search_crossref_by_title', return_value={'bib_year': 2023}) as por_titulo:
            meta = extractor.extract_from_pdf('/tmp/x.pdf', original_filename=TITULO + '.pdf')
        assert meta.get('bib_doi') != '10.1/referencia'
        assert meta['bib_year'] == 2023
        por_titulo.assert_called_once()

    def test_acepta_el_doi_del_texto_cuando_el_titulo_coincide(self):
        extractor = BibExtractorService()
        propio = {'bib_title': TITULO, 'bib_year': 2021}
        with patch.object(extractor, '_extract_pdf_info', return_value={}), \
                patch.object(extractor, '_extract_doi_from_text', return_value='10.1/propio'), \
                patch.object(extractor, '_fetch_crossref', return_value=dict(propio)):
            meta = extractor.extract_from_pdf('/tmp/x.pdf', original_filename=TITULO + '.pdf')
        assert meta['bib_doi'] == '10.1/propio'
        assert meta['bib_year'] == 2021


@pytest.mark.unit
class TestTituloDesdeElNombre:
    """Nombres reales del corpus que impedían encontrar el artículo en CrossRef."""

    def test_quita_el_prefijo_de_copia_de_drive(self):
        titulo = BibExtractorService()._title_from_filename(
            'Copia de ICT competence of a teacher in the context of digital transformation of education.pdf')
        assert titulo.startswith('ICT competence of a teacher')

    def test_quita_autor_y_anio_del_nombre_de_sage(self):
        titulo = BibExtractorService()._title_from_filename(
            'rashid-et-al-2022-digital-social-support-for-undergraduate-students-during-covid-19.pdf')
        assert titulo.startswith('digital social support for undergraduate students')

    def test_no_toca_un_titulo_normal(self):
        titulo = BibExtractorService()._title_from_filename(
            'Evaluate the drivers for digital transformation in higher education.pdf')
        assert titulo == 'Evaluate the drivers for digital transformation in higher education'


@pytest.mark.unit
class TestPdfLocal:

    def test_escribe_la_copia_de_la_base_de_datos_y_la_borra_al_salir(self):
        archivo = SimpleNamespace(file_content=b'%PDF-1.4 prueba', file_path='drive://abc')
        with pdf_local(archivo) as ruta:
            with open(ruta, 'rb') as f:
                assert f.read() == b'%PDF-1.4 prueba'
        assert not os.path.exists(ruta)

    def test_drive_sin_copia_devuelve_none(self):
        archivo = SimpleNamespace(file_content=None, file_path='drive://abc')
        with pdf_local(archivo) as ruta:
            assert ruta is None

    def test_usa_el_fichero_local_si_existe(self, tmp_path):
        local = tmp_path / 'articulo.pdf'
        local.write_bytes(b'%PDF')
        archivo = SimpleNamespace(file_content=None, file_path=str(local))
        with pdf_local(archivo) as ruta:
            assert ruta == str(local)

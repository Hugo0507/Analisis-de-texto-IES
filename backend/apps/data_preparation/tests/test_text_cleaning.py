"""
Tests de la limpieza del texto extraido de PDFs.

Los casos salen de los PDFs reales del corpus: el modelado de temas mostraba
temas con "cid cid", "crossref", "doi org" y el aviso de licencia de IEEE.
"""

import os
from unittest.mock import Mock, patch

import pytest

from apps.data_preparation.processor import DataPreparationProcessor, _ruta_pdf_para_extraer
from apps.data_preparation.stopwords import get_combined_stopwords
from apps.data_preparation.text_cleaning import (
    limpiar_texto,
    normalizar_unicode,
    quitar_ruido_pdf,
)


@pytest.mark.unit
class TestRuidoDeExtraccion:

    def test_glifos_cid_no_dejan_la_palabra_cid(self):
        texto = 'digital learning environment (cid:3) (cid:129) digital competence (cid:1) survey'
        resultado = limpiar_texto(texto)
        assert 'cid' not in resultado.split()
        assert resultado == 'digital learning environment digital competence survey'

    def test_la_stopword_cid_ya_no_depende_del_orden(self):
        # Antes "(cid:3)" no coincidia con la stopword "cid" y, al quitar
        # simbolos, quedaba "cid". La preparacion "lpm" la tenia como
        # stopword personalizada y aun asi aparecia en los temas.
        assert 'cid' not in limpiar_texto('word (cid:3) other', stopwords={'cid'}).split()

    def test_ligaduras(self):
        assert normalizar_unicode('artiﬁcial inﬂuence eﬀect eﬃcient') == 'artificial influence effect efficient'
        assert limpiar_texto('Artiﬁcial intelligence') == 'artificial intelligence'

    def test_tildes_no_parten_palabras(self):
        assert limpiar_texto('educação implementación Gregório') == 'educacao implementacion gregorio'

    def test_urls_y_dois_no_dejan_fragmentos(self):
        texto = (
            'Link to this article: https://doi.org/10.1080/10291954.2023.2172833 '
            'Front. Educ. 7:1047035. doi: 10.3389/feduc.2022.1047035 '
            'DOI: http://dx.doi.org/10.21511/ppm.21(2-si).2023.06 '
            'see dx.doi.org/10.1000/abc and www.tandfonline.com/loi/rsar20 today'
        )
        palabras = limpiar_texto(texto).split()
        for fragmento in ('https', 'http', 'org', 'dx', 'www', 'httpsdoiorg', 'tandfonline', 'feduc', 'ppm'):
            assert fragmento not in palabras
        assert 'today' in palabras
        # La etiqueta suelta "DOI:" queda como palabra; la quita la stopword "doi".
        con_stopwords = limpiar_texto(texto, get_combined_stopwords(language='en')).split()
        assert 'doi' not in con_stopwords

    def test_crossref_es_stopword(self):
        stopwords = get_combined_stopwords(language='en')
        assert {'crossref', 'crossmark', 'orcid'} <= stopwords
        assert 'crossref' not in limpiar_texto('Google Scholar Crossref higher education', stopwords).split()


@pytest.mark.unit
class TestAvisosEditoriales:

    def test_aviso_de_licencia_de_ieee(self):
        texto = (
            'digital transformation of universities\n'
            'Authorized licensed use limited to: Universidad Nacional de Colombia. Downloaded on '
            'March 20,2024 at 01:22:33 UTC from IEEE Xplore.  Restrictions apply.\n'
            'teaching strategies'
        )
        palabras = limpiar_texto(texto).split()
        for ruido in ('authorized', 'licensed', 'limited', 'downloaded', 'utc', 'ieee', 'xplore', 'restrictions', 'apply'):
            assert ruido not in palabras
        assert palabras[:4] == ['digital', 'transformation', 'of', 'universities']
        assert palabras[-2:] == ['teaching', 'strategies']

    def test_aviso_de_ieee_partido_en_lineas(self):
        texto = 'before Authorized licensed use limited to: X.\nDownloaded on May 1,2023 at 10:00:00 UTC\nfrom IEEE Xplore. Restrictions apply. after'
        assert limpiar_texto(texto) == 'before after'

    def test_margen_de_wiley(self):
        texto = (
            'systematic review 14682273, 2023, 3, Downloaded from '
            'https://onlinelibrary.wiley.com/doi/10.1111/hequ.12411 by Cochrane Colombia, '
            'Wiley Online Library on [09/11/2023]. See the Terms and Conditions '
            '(https://onlinelibrary.wiley.com/terms-and-conditions) on Wiley Online Library for rules '
            'of use; OA articles are governed by the applicable Creative Commons License higher education'
        )
        palabras = limpiar_texto(texto).split()
        for ruido in ('downloaded', 'cochrane', 'colombia', 'wiley', 'library', 'terms', 'conditions', 'creative', 'commons'):
            assert ruido not in palabras
        assert palabras[:2] == ['systematic', 'review']
        assert palabras[-2:] == ['higher', 'education']

    def test_portada_de_taylor_and_francis(self):
        texto = 'View Crossmark data\nFull Terms & Conditions of access and use can be found at\nhttps://www.tandfonline.com/action/journalInformation?journalCode=rsar20\naccountancy curricula'
        assert limpiar_texto(texto) == 'accountancy curricula'

    def test_portada_de_researchgate(self):
        texto = (
            'See discussions, stats, and author profiles for this publication at: '
            'https://www.researchgate.net/publication/357306954\n\n'
            'Conceptual Framework for High Performance Digital Entrepreneurial University\n\n'
            'CITATIONS\n3\n\n3 authors:\n\nREADS\n31\n\nTippawan Meepung\n\n'
            '10 PUBLICATIONS 26 CITATIONS\n\nSEE PROFILE\n\n'
            'All content following this page was uploaded by Tippawan Meepung on 26 November 2023.\n\n'
            'The user has requested enhancement of the downloaded file.\n\n'
            'Digital transformation with university context'
        )
        palabras = limpiar_texto(texto).split()
        for ruido in ('discussions', 'stats', 'profiles', 'citations', 'reads', 'uploaded',
                      'enhancement', 'downloaded', 'meepung', 'researchgate'):
            assert ruido not in palabras
        assert palabras == ['digital', 'transformation', 'with', 'university', 'context']

    def test_aviso_de_acm(self):
        texto = (
            'open-ended process. Permission to make digital or hard copies of all or part of this work for '
            'personal or classroom use is granted without fee provided that copies are not made or distributed '
            'for profit or commercial advantage and that copies bear this notice and the full citation on the '
            'first page. Copyrights for components of this work owned by others than ACM must be honored. '
            'To copy otherwise, or republish, requires prior specific permission and/or a fee. Request permissions '
            'from Permissions@acm.org. ICEEL 2019, November 5-7, 2019, Barcelona, Spain. '
            'Copyright is held by the owner/author(s). Publication rights licensed to ACM. '
            'Digitalization in mid-rank higher education institutions'
        )
        palabras = limpiar_texto(texto).split()
        for ruido in ('permission', 'permissions', 'copies', 'republish', 'acm', 'licensed', 'copyrights'):
            assert ruido not in palabras
        assert palabras[:2] == ['open', 'ended']
        assert palabras[-3:] == ['higher', 'education', 'institutions']

    def test_licencia_creative_commons(self):
        textos = [
            'Copyright 2023 Li and Wu. This is an open access article distributed under the Creative Commons '
            'Attribution License, which permits unrestricted use, distribution, and reproduction in any medium, '
            'provided the original work is properly cited. digital maturity model',
            'This work is licensed under a Creative Commons Attribution 4.0 International License. digital maturity model',
        ]
        for texto in textos:
            palabras = limpiar_texto(texto).split()
            for ruido in ('creative', 'commons', 'licensed', 'reproduction', 'attribution'):
                assert ruido not in palabras, (texto[:40], ruido)
            assert palabras[-3:] == ['digital', 'maturity', 'model']

    def test_quitar_ruido_conserva_mayusculas_para_las_citas(self):
        assert 'Smith' not in quitar_ruido_pdf('as noted (Smith, 2020) before')


@pytest.mark.unit
class TestOpcionesDeLimpieza:

    def test_texto_vacio(self):
        assert limpiar_texto(None) == ''
        assert limpiar_texto('   ') == ''

    def test_sin_quitar_simbolos_igual_borra_el_ruido(self):
        resultado = limpiar_texto('Data-driven (cid:3) https://doi.org/10.1/x decisions', quitar_simbolos=False)
        assert resultado == 'data-driven decisions'

    def test_longitud_minima(self):
        assert limpiar_texto('a bb ccc', min_longitud=3) == 'ccc'
        assert limpiar_texto('a bb ccc', min_longitud=1) == 'a bb ccc'


@pytest.mark.unit
class TestPreparacionUsaLaLimpieza:

    def _procesador(self, **opciones):
        procesador = DataPreparationProcessor(preparation_id=1)
        procesador.preparation = Mock(
            custom_stopwords=['cid'],
            enable_special_chars_removal=True,
            enable_tokenization=False,
            enable_lemmatization=False,
            **opciones,
        )
        procesador.update_progress = Mock()
        return procesador

    def test_stopwords_despues_de_quitar_ruido(self):
        procesador = self._procesador()
        archivos = [{'text': 'Digital (cid:3) Transformation. Crossref https://doi.org/10.1/x'}]
        with patch('apps.data_preparation.processor.get_combined_stopwords',
                   return_value=get_combined_stopwords(custom_stopwords=['cid'], language='en')):
            procesador._apply_stopwords(archivos, 'en')
        assert archivos[0]['cleaned_text'] == 'digital transformation'

    def test_transformaciones_no_vuelven_a_pegar_palabras(self):
        procesador = self._procesador()
        archivos = [{'text': 'x', 'cleaned_text': 'digital transformation'}]
        procesador._apply_transformations(archivos, 'en')
        assert archivos[0]['cleaned_text'] == 'digital transformation'


@pytest.mark.unit
class TestOrigenDelPdf:

    def test_usa_la_copia_guardada_en_la_base_de_datos(self):
        archivo = Mock(id=7, file_path='drive://abc')
        with patch('apps.data_preparation.processor._contenido_pdf_en_bd', return_value=b'%PDF-1.4 prueba'), \
                patch('apps.data_preparation.processor.DriveFileDownloader.download_from_drive') as drive:
            ruta, es_temporal = _ruta_pdf_para_extraer(archivo, usuario=None)
        try:
            assert es_temporal
            with open(ruta, 'rb') as f:
                assert f.read() == b'%PDF-1.4 prueba'
            drive.assert_not_called()
        finally:
            os.remove(ruta)

    def test_sin_copia_descarga_de_drive(self):
        archivo = Mock(id=7, file_path='drive://abc')
        with patch('apps.data_preparation.processor._contenido_pdf_en_bd', return_value=None), \
                patch('apps.data_preparation.processor.DriveFileDownloader.download_from_drive',
                      return_value='/tmp/x.pdf') as drive:
            assert _ruta_pdf_para_extraer(archivo, usuario='u') == ('/tmp/x.pdf', True)
        drive.assert_called_once_with('abc', 'u')

    def test_ruta_local_no_es_temporal(self):
        archivo = Mock(id=7, file_path='/data/x.pdf')
        with patch('apps.data_preparation.processor._contenido_pdf_en_bd', return_value=None):
            assert _ruta_pdf_para_extraer(archivo, usuario=None) == ('/data/x.pdf', False)

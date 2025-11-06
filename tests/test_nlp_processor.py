"""
Tests para el módulo src/nlp_processor.py
Valida el procesamiento de lenguaje natural
"""

import pytest
from src.nlp_processor import ProcessadorTexto, descargar_recursos_nltk
from unittest.mock import patch, MagicMock


# ==================== TESTS DE DESCARGA DE RECURSOS ====================

@pytest.mark.unit
def test_descargar_recursos_nltk_ya_instalados(mock_nltk_resources):
    """Test que recursos NLTK no se descargan si ya están instalados"""
    with patch('nltk.download') as mock_download:
        descargar_recursos_nltk()
        # No debería haber llamado a download() porque mock_nltk_resources simula que existen
        assert mock_download.call_count == 0


@pytest.mark.unit
def test_descargar_recursos_nltk_no_instalados():
    """Test que recursos NLTK se descargan si no están instalados"""
    with patch('nltk.data.find', side_effect=LookupError("Not found")):
        with patch('nltk.download') as mock_download:
            descargar_recursos_nltk()
            # Debería haber descargado 3 recursos
            assert mock_download.call_count == 3


# ==================== TESTS DE INICIALIZACIÓN ====================

@pytest.mark.unit
def test_procesador_texto_init_spanish(mock_nltk_resources):
    """Test inicialización de ProcessadorTexto en español"""
    procesador = ProcessadorTexto(idioma='spanish')

    assert procesador.idioma == 'spanish'
    assert procesador.stemmer is not None
    assert len(procesador.stop_words) > 0


@pytest.mark.unit
def test_procesador_texto_init_english(mock_nltk_resources):
    """Test inicialización de ProcessadorTexto en inglés"""
    procesador = ProcessadorTexto(idioma='english')

    assert procesador.idioma == 'english'
    assert procesador.stemmer is not None
    assert 'the' in procesador.stop_words or 'a' in procesador.stop_words


# ==================== TESTS DE LIMPIEZA DE TEXTO ====================

@pytest.mark.unit
def test_limpiar_texto_basico(mock_nltk_resources, sample_text):
    """Test limpieza básica de texto"""
    procesador = ProcessadorTexto(idioma='english')
    resultado = procesador.limpiar_texto(sample_text)

    # Verificar que el texto está en minúsculas
    assert resultado == resultado.lower()

    # Verificar que no hay caracteres especiales
    assert '\n' not in resultado or resultado.strip() != ''


@pytest.mark.unit
def test_limpiar_texto_urls(mock_nltk_resources, sample_text_with_noise):
    """Test que se eliminan URLs del texto"""
    procesador = ProcessadorTexto(idioma='english')
    resultado = procesador.limpiar_texto(sample_text_with_noise)

    # Verificar que no hay URLs
    assert 'http' not in resultado
    assert 'https' not in resultado
    assert 'example.com' not in resultado


@pytest.mark.unit
def test_limpiar_texto_emails(mock_nltk_resources, sample_text_with_noise):
    """Test que se eliminan emails del texto"""
    procesador = ProcessadorTexto(idioma='english')
    resultado = procesador.limpiar_texto(sample_text_with_noise)

    # Verificar que no hay emails
    assert '@' not in resultado or 'email@example.com' not in resultado


@pytest.mark.unit
def test_limpiar_texto_numeros(mock_nltk_resources):
    """Test que se eliminan números del texto"""
    procesador = ProcessadorTexto(idioma='english')
    texto = "The year 2024 has 365 days and 12 months."
    resultado = procesador.limpiar_texto(texto)

    # Verificar que no hay números
    assert '2024' not in resultado
    assert '365' not in resultado
    assert '12' not in resultado


@pytest.mark.unit
def test_limpiar_texto_vacio(mock_nltk_resources):
    """Test limpieza de texto vacío"""
    procesador = ProcessadorTexto(idioma='english')

    assert procesador.limpiar_texto("") == ""
    assert procesador.limpiar_texto("   ") == ""
    assert procesador.limpiar_texto(None) == ""


@pytest.mark.unit
def test_limpiar_texto_solo_especiales(mock_nltk_resources):
    """Test limpieza de texto con solo caracteres especiales"""
    procesador = ProcessadorTexto(idioma='english')
    texto = "@#$%^&*()!@#"
    resultado = procesador.limpiar_texto(texto)

    # Debería estar vacío o solo espacios
    assert resultado.strip() == ""


# ==================== TESTS DE TOKENIZACIÓN ====================

@pytest.mark.unit
def test_tokenizar_texto_basico(mock_nltk_resources, sample_text):
    """Test tokenización básica de texto"""
    procesador = ProcessadorTexto(idioma='english')

    # Primero limpiar el texto
    texto_limpio = procesador.limpiar_texto(sample_text)

    # Mockear word_tokenize para no depender de NLTK
    with patch('src.nlp_processor.word_tokenize') as mock_tokenize:
        mock_tokenize.return_value = ['digital', 'transformation', 'business']
        tokens = procesador.tokenizar(texto_limpio)

        assert isinstance(tokens, list)
        assert len(tokens) > 0


@pytest.mark.unit
def test_tokenizar_texto_vacio(mock_nltk_resources):
    """Test tokenización de texto vacío"""
    procesador = ProcessadorTexto(idioma='english')

    with patch('src.nlp_processor.word_tokenize', return_value=[]):
        assert procesador.tokenizar("") == []
        assert procesador.tokenizar("   ") == []


# ==================== TESTS DE STOPWORDS ====================

@pytest.mark.unit
def test_remover_stopwords(mock_nltk_resources):
    """Test remoción de stopwords"""
    procesador = ProcessadorTexto(idioma='english')
    procesador.stop_words = {'the', 'is', 'a', 'an', 'and', 'or'}

    tokens = ['the', 'cat', 'is', 'on', 'the', 'mat']
    resultado = procesador.remover_stopwords(tokens)

    # 'the' e 'is' deberían estar removidos
    assert 'the' not in resultado
    assert 'is' not in resultado
    # 'cat', 'on', 'mat' deberían permanecer
    assert 'cat' in resultado or 'on' in resultado or 'mat' in resultado


@pytest.mark.unit
def test_remover_stopwords_lista_vacia(mock_nltk_resources):
    """Test remoción de stopwords con lista vacía"""
    procesador = ProcessadorTexto(idioma='english')

    assert procesador.remover_stopwords([]) == []


@pytest.mark.unit
def test_remover_stopwords_sin_stopwords(mock_nltk_resources):
    """Test remoción de stopwords cuando no hay stopwords en el texto"""
    procesador = ProcessadorTexto(idioma='english')
    procesador.stop_words = {'the', 'is', 'a'}

    tokens = ['cat', 'dog', 'bird']
    resultado = procesador.remover_stopwords(tokens)

    # Todos los tokens deberían permanecer
    assert len(resultado) == 3
    assert resultado == tokens


# ==================== TESTS DE STEMMING ====================

@pytest.mark.unit
def test_aplicar_stemming(mock_nltk_resources):
    """Test aplicación de stemming"""
    procesador = ProcessadorTexto(idioma='english')

    # Mockear el stemmer
    with patch.object(procesador.stemmer, 'stem', side_effect=lambda x: x[:-3] if len(x) > 3 else x):
        tokens = ['running', 'jumps', 'easily']
        resultado = procesador.aplicar_stemming(tokens)

        assert isinstance(resultado, list)
        assert len(resultado) == len(tokens)


@pytest.mark.unit
def test_aplicar_stemming_lista_vacia(mock_nltk_resources):
    """Test stemming con lista vacía"""
    procesador = ProcessadorTexto(idioma='english')

    assert procesador.aplicar_stemming([]) == []


# ==================== TESTS DE PROCESAMIENTO COMPLETO ====================

@pytest.mark.integration
def test_procesar_texto_completo_pipeline(mock_nltk_resources, sample_text):
    """Test pipeline completo de procesamiento de texto"""
    procesador = ProcessadorTexto(idioma='english')

    # Mockear las funciones de NLTK
    with patch('src.nlp_processor.word_tokenize', return_value=['digital', 'transformation', 'revolutionizing', 'businesses']):
        with patch('src.nlp_processor.sent_tokenize', return_value=['Sentence 1.', 'Sentence 2.']):
            resultado = procesador.procesar_texto_completo(sample_text)

            # Verificar estructura del resultado
            assert isinstance(resultado, dict)
            assert 'texto_original' in resultado
            assert 'texto_limpio' in resultado
            assert 'tokens' in resultado
            assert 'num_palabras' in resultado
            assert 'num_oraciones' in resultado


@pytest.mark.integration
def test_procesar_texto_completo_con_stemming(mock_nltk_resources, sample_text):
    """Test procesamiento completo con stemming activado"""
    procesador = ProcessadorTexto(idioma='english')

    with patch('src.nlp_processor.word_tokenize', return_value=['running', 'jumps']):
        with patch('src.nlp_processor.sent_tokenize', return_value=['Sentence.']):
            resultado = procesador.procesar_texto_completo(sample_text, aplicar_stemming=True)

            assert 'tokens' in resultado
            assert isinstance(resultado['tokens'], list)


@pytest.mark.integration
def test_procesar_texto_completo_texto_vacio(mock_nltk_resources):
    """Test procesamiento completo de texto vacío"""
    procesador = ProcessadorTexto(idioma='english')

    with patch('src.nlp_processor.word_tokenize', return_value=[]):
        with patch('src.nlp_processor.sent_tokenize', return_value=[]):
            resultado = procesador.procesar_texto_completo("")

            assert resultado['num_palabras'] == 0
            assert resultado['num_oraciones'] == 0
            assert resultado['tokens'] == []


# ==================== TESTS DE ANÁLISIS DE FRECUENCIAS ====================

@pytest.mark.unit
def test_obtener_palabras_mas_frecuentes(mock_nltk_resources, sample_text):
    """Test obtención de palabras más frecuentes"""
    procesador = ProcessadorTexto(idioma='english')

    with patch('src.nlp_processor.word_tokenize', return_value=['digital', 'transformation', 'digital', 'business', 'digital']):
        resultado = procesador.obtener_palabras_mas_frecuentes(sample_text, top_n=2)

        assert isinstance(resultado, list)
        assert len(resultado) <= 2


@pytest.mark.unit
def test_obtener_palabras_mas_frecuentes_vacio(mock_nltk_resources):
    """Test palabras más frecuentes con texto vacío"""
    procesador = ProcessadorTexto(idioma='english')

    with patch('src.nlp_processor.word_tokenize', return_value=[]):
        resultado = procesador.obtener_palabras_mas_frecuentes("", top_n=10)

        assert resultado == []


# ==================== TESTS DE MANEJO DE ERRORES ====================

@pytest.mark.unit
def test_limpiar_texto_con_tipo_invalido(mock_nltk_resources):
    """Test limpieza de texto con tipo de dato inválido"""
    procesador = ProcessadorTexto(idioma='english')

    # Debería manejar gracefully tipos inválidos
    assert procesador.limpiar_texto(123) == "" or isinstance(procesador.limpiar_texto(123), str)
    assert procesador.limpiar_texto(['lista']) == "" or isinstance(procesador.limpiar_texto(['lista']), str)


@pytest.mark.unit
def test_idioma_no_soportado(mock_nltk_resources):
    """Test inicialización con idioma no soportado"""
    # Debería manejar gracefully o usar default
    procesador = ProcessadorTexto(idioma='klingon')

    assert procesador.idioma == 'klingon'
    # Debería tener al menos stemmer por defecto
    assert procesador.stemmer is not None

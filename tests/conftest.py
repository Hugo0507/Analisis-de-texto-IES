"""
Fixtures compartidos para todos los tests
Configuración de pytest y helpers reutilizables
"""

import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch
import pandas as pd
import numpy as np


# ==================== FIXTURES DE CONFIGURACIÓN ====================

@pytest.fixture
def temp_dir():
    """Crea un directorio temporal para tests"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def sample_text():
    """Texto de ejemplo para tests de NLP"""
    return """
    Digital transformation is revolutionizing businesses worldwide.
    Cloud computing, artificial intelligence, and big data analytics
    are key technologies driving this change. Organizations must
    adapt their strategies to remain competitive in the digital age.
    """


@pytest.fixture
def sample_text_spanish():
    """Texto de ejemplo en español"""
    return """
    La transformación digital está revolucionando las empresas.
    La inteligencia artificial y el análisis de datos son tecnologías
    clave que impulsan este cambio. Las organizaciones deben adaptar
    sus estrategias para seguir siendo competitivas.
    """


@pytest.fixture
def sample_text_with_noise():
    """Texto con ruido (URLs, números, caracteres especiales)"""
    return """
    Check out https://example.com for more info!!!
    Contact us at email@example.com or call 123-456-7890.
    Special chars: @#$%^&*()
    Multiple    spaces    and

    empty lines.
    """


@pytest.fixture
def multiple_documents():
    """Múltiples documentos de ejemplo"""
    return {
        'doc1.txt': 'Digital transformation requires strategic planning and innovation.',
        'doc2.txt': 'Cloud computing enables scalability and flexibility.',
        'doc3.txt': 'Artificial intelligence automates business processes.',
        'doc4.txt': 'Big data analytics provides valuable insights.',
        'doc5.txt': 'Cybersecurity is essential for digital transformation.'
    }


# ==================== FIXTURES DE DATOS ====================

@pytest.fixture
def sample_dataframe():
    """DataFrame de ejemplo para tests"""
    return pd.DataFrame({
        'document': ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'],
        'text': [
            'digital transformation technology',
            'cloud computing services',
            'artificial intelligence machine learning',
            'big data analytics insights',
            'cybersecurity protection measures'
        ],
        'category': ['Tech', 'Cloud', 'AI', 'Data', 'Security']
    })


@pytest.fixture
def sample_bow_matrix():
    """Matriz Bag of Words de ejemplo"""
    return np.array([
        [1, 2, 0, 1, 0],
        [0, 1, 3, 0, 1],
        [2, 0, 1, 2, 0],
        [1, 1, 1, 1, 1],
        [0, 2, 0, 3, 1]
    ])


@pytest.fixture
def sample_vocabulary():
    """Vocabulario de ejemplo"""
    return ['digital', 'transformation', 'cloud', 'artificial', 'intelligence']


# ==================== FIXTURES DE MOCKS ====================

@pytest.fixture
def mock_google_drive_service():
    """Mock del servicio de Google Drive API"""
    service = MagicMock()

    # Mock de files().list()
    files_list = MagicMock()
    files_list.execute.return_value = {
        'files': [
            {'id': 'file1', 'name': 'doc1.pdf', 'mimeType': 'application/pdf'},
            {'id': 'file2', 'name': 'doc2.pdf', 'mimeType': 'application/pdf'},
            {'id': 'file3', 'name': 'doc3.txt', 'mimeType': 'text/plain'}
        ],
        'nextPageToken': None
    }
    service.files().list.return_value = files_list

    # Mock de files().get_media()
    get_media = MagicMock()
    get_media.execute.return_value = b'Sample PDF content'
    service.files().get_media.return_value = get_media

    return service


@pytest.fixture
def mock_drive_connector(mock_google_drive_service):
    """Mock del GoogleDriveConnector"""
    from src.drive_connector import GoogleDriveConnector

    with patch.object(GoogleDriveConnector, 'authenticate') as mock_auth:
        mock_auth.return_value = True
        connector = GoogleDriveConnector(
            credentials_path='fake_credentials.json',
            token_path='fake_token.json'
        )
        connector.service = mock_google_drive_service
        connector.authenticated = True
        yield connector


@pytest.fixture
def mock_nltk_resources():
    """Mock de recursos NLTK para evitar descargas en tests"""
    with patch('nltk.data.find') as mock_find:
        # Simular que todos los recursos están instalados
        mock_find.return_value = True
        yield mock_find


@pytest.fixture
def mock_spacy_model():
    """Mock de modelo spaCy"""
    mock_doc = MagicMock()
    mock_doc.ents = []

    mock_nlp = MagicMock()
    mock_nlp.return_value = mock_doc

    with patch('spacy.load', return_value=mock_nlp):
        yield mock_nlp


# ==================== FIXTURES DE ARCHIVOS ====================

@pytest.fixture
def sample_pdf_file(temp_dir):
    """Crea un archivo PDF de ejemplo"""
    pdf_path = temp_dir / 'sample.pdf'
    # Crear un PDF simple (en producción usarías una librería)
    pdf_path.write_bytes(b'%PDF-1.4 fake pdf content')
    return pdf_path


@pytest.fixture
def sample_txt_file(temp_dir, sample_text):
    """Crea un archivo TXT de ejemplo"""
    txt_path = temp_dir / 'sample.txt'
    txt_path.write_text(sample_text, encoding='utf-8')
    return txt_path


@pytest.fixture
def sample_csv_file(temp_dir, sample_dataframe):
    """Crea un archivo CSV de ejemplo"""
    csv_path = temp_dir / 'sample.csv'
    sample_dataframe.to_csv(csv_path, index=False)
    return csv_path


# ==================== FIXTURES DE CONFIGURACIÓN ====================

@pytest.fixture
def mock_config():
    """Mock de configuración de la aplicación"""
    return {
        'GOOGLE_DRIVE_FOLDER_ID': 'fake_folder_id',
        'CREDENTIALS_PATH': 'fake_credentials.json',
        'TOKEN_PATH': 'fake_token.json',
        'LOG_LEVEL': 'DEBUG',
        'LOG_DIR': 'logs',
        'CACHE_ENABLED': True,
        'CACHE_DIR': 'cache',
        'DEFAULT_LANGUAGE': 'english',
        'USE_STEMMING': True,
        'MIN_WORD_LENGTH': 3
    }


@pytest.fixture(autouse=True)
def setup_test_environment(tmp_path, monkeypatch):
    """
    Configuración automática del entorno de testing
    Se ejecuta antes de cada test
    """
    # Crear directorios temporales para logs y caché
    log_dir = tmp_path / 'logs'
    cache_dir = tmp_path / 'cache'
    log_dir.mkdir()
    cache_dir.mkdir()

    # Configurar variables de entorno para tests
    monkeypatch.setenv('LOG_DIR', str(log_dir))
    monkeypatch.setenv('CACHE_DIR', str(cache_dir))
    monkeypatch.setenv('CACHE_ENABLED', 'False')  # Deshabilitar caché en tests
    monkeypatch.setenv('LOG_LEVEL', 'DEBUG')

    yield

    # Cleanup se hace automáticamente con tmp_path


# ==================== HELPERS DE TESTING ====================

@pytest.fixture
def assert_almost_equal():
    """Helper para comparar arrays numpy con tolerancia"""
    def _assert(actual, expected, decimal=7):
        np.testing.assert_almost_equal(actual, expected, decimal=decimal)
    return _assert


@pytest.fixture
def assert_dataframe_equal():
    """Helper para comparar DataFrames pandas"""
    def _assert(actual, expected):
        pd.testing.assert_frame_equal(actual, expected)
    return _assert


# ==================== MARKERS PERSONALIZADOS ====================

def pytest_configure(config):
    """Configuración de pytest - se ejecuta una vez al inicio"""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )


# ==================== HOOKS DE PYTEST ====================

def pytest_collection_modifyitems(config, items):
    """Modificar items de test según configuración"""
    # Agregar marker 'unit' a todos los tests que no tengan otro marker
    for item in items:
        if not any(item.iter_markers()):
            item.add_marker(pytest.mark.unit)


# ==================== FIXTURES DE LIMPIEZA ====================

@pytest.fixture(scope='session', autouse=True)
def cleanup_session():
    """Limpieza al finalizar toda la sesión de tests"""
    yield
    # Aquí puedes agregar limpieza global si es necesario
    pass

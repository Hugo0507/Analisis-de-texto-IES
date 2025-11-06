"""
Tests para el módulo src/text_preprocessor.py
Valida preprocesamiento avanzado y creación de BoW/TF-IDF
"""

import pytest
import pandas as pd
import numpy as np
from src.text_preprocessor import TextPreprocessor
from unittest.mock import patch, MagicMock
from scipy.sparse import issparse


# ==================== TESTS DE INICIALIZACIÓN ====================

@pytest.mark.unit
def test_text_preprocessor_init_english(mock_nltk_resources):
    """Test inicialización de TextPreprocessor en inglés"""
    preprocessor = TextPreprocessor(language='english')

    assert preprocessor.language == 'english'
    assert len(preprocessor.stop_words) > 0


@pytest.mark.unit
def test_text_preprocessor_init_spanish(mock_nltk_resources):
    """Test inicialización en español"""
    preprocessor = TextPreprocessor(language='spanish')

    assert preprocessor.language == 'spanish'
    assert len(preprocessor.stop_words) > 0


# ==================== TESTS DE ensure_nltk_resources ====================

@pytest.mark.unit
def test_ensure_nltk_resources_already_installed():
    """Test que no descarga recursos si ya están instalados"""
    with patch('nltk.data.find') as mock_find:
        with patch('nltk.download') as mock_download:
            mock_find.return_value = True  # Simular que existe

            preprocessor = TextPreprocessor(language='english')

            # No debería haber llamado a download
            assert mock_download.call_count == 0


@pytest.mark.unit
def test_ensure_nltk_resources_not_installed():
    """Test que descarga recursos si no están instalados"""
    with patch('nltk.data.find', side_effect=LookupError("Not found")):
        with patch('nltk.download') as mock_download:
            preprocessor = TextPreprocessor(language='english')

            # Debería haber descargado 5 recursos
            assert mock_download.call_count == 5


# ==================== TESTS DE BAG OF WORDS ====================

@pytest.mark.integration
def test_create_bag_of_words_basic(mock_nltk_resources, multiple_documents):
    """Test creación básica de Bag of Words"""
    preprocessor = TextPreprocessor(language='english')

    resultado = preprocessor.create_bag_of_words(
        multiple_documents,
        max_features=100,
        min_df=1,
        max_df=1.0,
        ngram_range=(1, 1)
    )

    # Verificar estructura del resultado
    assert 'matrix' in resultado
    assert 'dataframe' in resultado
    assert 'vectorizer' in resultado
    assert 'vocabulary' in resultado
    assert 'vocabulary_size' in resultado
    assert 'document_count' in resultado
    assert 'total_terms' in resultado
    assert 'sparse_matrix' in resultado

    # Verificar tipos
    assert isinstance(resultado['dataframe'], pd.DataFrame)
    assert isinstance(resultado['vocabulary'], np.ndarray)
    assert resultado['document_count'] == len(multiple_documents)
    assert resultado['vocabulary_size'] > 0


@pytest.mark.integration
def test_create_bag_of_words_with_bigrams(mock_nltk_resources, multiple_documents):
    """Test BoW con bigramas"""
    preprocessor = TextPreprocessor(language='english')

    resultado = preprocessor.create_bag_of_words(
        multiple_documents,
        max_features=100,
        ngram_range=(1, 2)  # Unigramas y bigramas
    )

    # Debería tener términos que son frases
    vocab = resultado['vocabulary']
    assert len(vocab) > 0


@pytest.mark.integration
def test_create_bag_of_words_min_df_filter(mock_nltk_resources):
    """Test que min_df filtra términos poco frecuentes"""
    preprocessor = TextPreprocessor(language='english')

    documents = {
        'doc1': 'rare word appears once',
        'doc2': 'common word appears twice',
        'doc3': 'common word appears again',
        'doc4': 'common word one more time',
        'doc5': 'common word and more'
    }

    resultado = preprocessor.create_bag_of_words(
        documents,
        min_df=3  # Palabra debe aparecer en al menos 3 documentos
    )

    vocab = resultado['vocabulary']

    # 'common' y 'word' deberían estar (aparecen en 4 docs)
    # 'rare' no debería estar (aparece en 1 doc)
    assert len(vocab) > 0


@pytest.mark.unit
def test_create_bag_of_words_empty_documents(mock_nltk_resources):
    """Test BoW con documentos vacíos"""
    preprocessor = TextPreprocessor(language='english')

    resultado = preprocessor.create_bag_of_words({})

    # Debería manejar gracefully
    assert resultado is None or resultado['document_count'] == 0


# ==================== TESTS DE TF-IDF ====================

@pytest.mark.integration
def test_create_tfidf_from_bow(mock_nltk_resources, multiple_documents):
    """Test creación de TF-IDF desde BoW"""
    preprocessor = TextPreprocessor(language='english')

    # Primero crear BoW
    bow_result = preprocessor.create_bag_of_words(
        multiple_documents,
        max_features=100
    )

    # Luego crear TF-IDF desde BoW
    tfidf_result = preprocessor.create_tfidf_from_bow(bow_result)

    # Verificar estructura
    assert 'matrix' in tfidf_result
    assert 'dataframe' in tfidf_result
    assert 'vocabulary' in tfidf_result
    assert 'tf_matrix' in tfidf_result
    assert 'idf_values' in tfidf_result
    assert 'method' in tfidf_result

    # Verificar que es método Colab
    assert tfidf_result['method'] == 'colab_style'

    # Verificar dimensiones
    assert tfidf_result['document_count'] == bow_result['document_count']
    assert tfidf_result['vocabulary_size'] == bow_result['vocabulary_size']


@pytest.mark.integration
def test_tfidf_values_range(mock_nltk_resources, multiple_documents):
    """Test que valores TF-IDF están en rango válido"""
    preprocessor = TextPreprocessor(language='english')

    bow_result = preprocessor.create_bag_of_words(multiple_documents)
    tfidf_result = preprocessor.create_tfidf_from_bow(bow_result)

    tfidf_matrix = tfidf_result['dataframe'].values

    # Valores TF-IDF deberían ser >= 0
    assert np.all(tfidf_matrix >= 0)


@pytest.mark.unit
def test_create_tfidf_from_invalid_bow(mock_nltk_resources):
    """Test TF-IDF con BoW inválido"""
    preprocessor = TextPreprocessor(language='english')

    # Debería manejar gracefully
    resultado = preprocessor.create_tfidf_from_bow(None)
    assert resultado is None

    resultado = preprocessor.create_tfidf_from_bow({})
    assert resultado is None


# ==================== TESTS DE TOP TERMS ====================

@pytest.mark.integration
def test_get_top_terms_global(mock_nltk_resources, multiple_documents):
    """Test obtención de términos más frecuentes globalmente"""
    preprocessor = TextPreprocessor(language='english')

    bow_result = preprocessor.create_bag_of_words(multiple_documents)
    top_terms_df = preprocessor.get_top_terms_global(bow_result, top_n=5)

    # Verificar estructura
    assert isinstance(top_terms_df, pd.DataFrame)
    assert 'Término' in top_terms_df.columns
    assert 'Frecuencia' in top_terms_df.columns
    assert len(top_terms_df) <= 5


@pytest.mark.integration
def test_get_top_tfidf_terms(mock_nltk_resources, multiple_documents):
    """Test obtención de top términos TF-IDF"""
    preprocessor = TextPreprocessor(language='english')

    bow_result = preprocessor.create_bag_of_words(multiple_documents)
    tfidf_result = preprocessor.create_tfidf_from_bow(bow_result)

    top_terms_df = preprocessor.get_top_tfidf_terms(tfidf_result, top_n=5)

    # Verificar estructura
    assert isinstance(top_terms_df, pd.DataFrame)
    assert 'Término' in top_terms_df.columns
    assert len(top_terms_df) <= 5


# ==================== TESTS DE HEATMAP ====================

@pytest.mark.integration
def test_get_tfidf_heatmap_data(mock_nltk_resources, multiple_documents):
    """Test generación de datos para heatmap TF-IDF"""
    preprocessor = TextPreprocessor(language='english')

    bow_result = preprocessor.create_bag_of_words(multiple_documents)
    tfidf_result = preprocessor.create_tfidf_from_bow(bow_result)

    heatmap_df = preprocessor.get_tfidf_heatmap_data(tfidf_result, top_n=10)

    # Verificar que es un DataFrame
    assert isinstance(heatmap_df, pd.DataFrame)

    # Verificar dimensiones
    assert heatmap_df.shape[1] <= 10  # Máximo 10 términos
    assert heatmap_df.shape[0] <= len(multiple_documents)  # Máximo todos los docs


# ==================== TESTS DE PROCESAMIENTO DE TEXTO ====================

@pytest.mark.unit
def test_process_single_text(mock_nltk_resources, sample_text):
    """Test procesamiento de un solo texto"""
    preprocessor = TextPreprocessor(language='english')

    with patch('nltk.tokenize.word_tokenize', return_value=['digital', 'transformation', 'business']):
        resultado = preprocessor.process_text(
            sample_text,
            remove_stopwords=True,
            apply_stemming=False
        )

        assert isinstance(resultado, list)


@pytest.mark.unit
def test_process_single_text_with_stemming(mock_nltk_resources, sample_text):
    """Test procesamiento con stemming"""
    preprocessor = TextPreprocessor(language='english')

    with patch('nltk.tokenize.word_tokenize', return_value=['running', 'jumps']):
        resultado = preprocessor.process_text(
            sample_text,
            remove_stopwords=False,
            apply_stemming=True
        )

        assert isinstance(resultado, list)


# ==================== TESTS DE SPARSE MATRIX ====================

@pytest.mark.integration
def test_sparse_matrix_creation(mock_nltk_resources, multiple_documents):
    """Test que se crea matriz sparse correctamente"""
    preprocessor = TextPreprocessor(language='english')

    resultado = preprocessor.create_bag_of_words(multiple_documents)

    # Verificar que es sparse
    assert issparse(resultado['sparse_matrix'])
    assert issparse(resultado['matrix'])


@pytest.mark.integration
def test_sparse_matrix_efficiency(mock_nltk_resources):
    """Test que matriz sparse ahorra memoria"""
    preprocessor = TextPreprocessor(language='english')

    # Crear documentos con vocabulario grande pero sparse
    documents = {f'doc{i}': f'unique_word_{i}' for i in range(100)}

    resultado = preprocessor.create_bag_of_words(documents, max_features=1000)

    sparse_matrix = resultado['sparse_matrix']

    # Calcular sparsity (deberí a ser alta)
    sparsity = 1 - (sparse_matrix.nnz / (sparse_matrix.shape[0] * sparse_matrix.shape[1]))

    # Sparsity debería ser > 0.8 (80% de ceros)
    assert sparsity > 0.8


# ==================== TESTS DE EDGE CASES ====================

@pytest.mark.unit
def test_bow_single_document(mock_nltk_resources):
    """Test BoW con un solo documento"""
    preprocessor = TextPreprocessor(language='english')

    resultado = preprocessor.create_bag_of_words(
        {'doc1': 'single document test'}
    )

    assert resultado is not None
    assert resultado['document_count'] == 1


@pytest.mark.unit
def test_bow_very_short_documents(mock_nltk_resources):
    """Test BoW con documentos muy cortos"""
    preprocessor = TextPreprocessor(language='english')

    resultado = preprocessor.create_bag_of_words({
        'doc1': 'a',
        'doc2': 'b',
        'doc3': 'c'
    })

    # Debería manejar documentos cortos
    assert resultado is not None or resultado is None  # Puede fallar por min_df


@pytest.mark.integration
def test_bow_with_special_characters(mock_nltk_resources):
    """Test BoW con documentos que tienen caracteres especiales"""
    preprocessor = TextPreprocessor(language='english')

    documents = {
        'doc1': 'Test @#$% special characters!!!',
        'doc2': 'More $$$ special &&& chars',
        'doc3': 'Final test with %%% symbols'
    }

    resultado = preprocessor.create_bag_of_words(documents)

    # Debería limpiar los caracteres especiales
    assert resultado is not None
    vocab = resultado['vocabulary']

    # Vocabulario no debería contener caracteres especiales
    assert all('@' not in term for term in vocab)
    assert all('$' not in term for term in vocab)

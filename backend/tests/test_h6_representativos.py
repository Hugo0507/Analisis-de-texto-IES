"""
H6 — Tests Mínimos Representativos

4 tests que demuestran buenas prácticas de ingeniería en cada capa del sistema:
  1. Modelo      — BagOfWords crea instancia con defaults correctos
  2. Procesador  — CountVectorizer produce vocabulario y matriz esperados
  3. API         — POST /api/v1/datasets/ con archivo retorna 201
  4. Preprocesamiento — preprocess_for_inference limpia URLs, números y stopwords
"""

import io
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from sklearn.feature_extraction.text import CountVectorizer

from apps.bag_of_words.models import BagOfWords
from apps.data_preparation.models import DataPreparation
from apps.datasets.views import DatasetViewSet
from apps.workspace.inference import preprocess_for_inference
from tests.factories import UserFactory, DatasetFactory


# ── 1. Test de modelo ─────────────────────────────────────────────────────────

class TestBagOfWordsDefaults(TestCase):
    """Verifica que BagOfWords se crea con los valores por defecto correctos."""

    def setUp(self):
        self.user = UserFactory()
        self.dataset = DatasetFactory(created_by=self.user)
        self.data_prep = DataPreparation.objects.create(
            name='Preparación de prueba H6',
            dataset=self.dataset,
            created_by=self.user,
        )

    def test_bag_of_words_defaults(self):
        bow = BagOfWords.objects.create(
            name='Test BoW H6',
            created_by=self.user,
            data_preparation=self.data_prep,
        )

        self.assertEqual(bow.status, BagOfWords.STATUS_PENDING)
        self.assertEqual(bow.progress_percentage, 0)
        self.assertEqual(bow.vocabulary, {})
        self.assertEqual(bow.top_terms, [])
        self.assertIsNone(bow.model_artifact_bin)


# ── 2. Test de procesador ─────────────────────────────────────────────────────

class TestCountVectorizerProcessor(TestCase):
    """Verifica que CountVectorizer produce vocabulario y dimensiones correctos."""

    CORPUS = [
        "digital transformation university education",
        "learning management system students teachers",
        "technology adoption higher education institutions",
    ]

    def test_countvectorizer_vocabulary_and_shape(self):
        vectorizer = CountVectorizer(min_df=1)
        matrix = vectorizer.fit_transform(self.CORPUS)
        vocab = vectorizer.vocabulary_

        # La matriz debe tener exactamente 3 filas (una por documento)
        self.assertEqual(matrix.shape[0], 3)

        # Debe haber al menos 10 términos únicos en el vocabulario
        self.assertGreaterEqual(len(vocab), 10)

        # Términos clave deben estar en el vocabulario
        self.assertIn('digital', vocab)
        self.assertIn('education', vocab)
        self.assertIn('technology', vocab)

        # Cada fila debe tener al menos 1 término con frecuencia > 0
        row_sums = matrix.sum(axis=1).A1
        for row_sum in row_sums:
            self.assertGreater(row_sum, 0)


# ── 3. Test de API ────────────────────────────────────────────────────────────

class TestDatasetAPICreate(TestCase):
    """Verifica que POST a DatasetViewSet con archivo retorna 201.

    Usa APIRequestFactory para llamar la view directamente, evitando
    la resolución de URLs (que requiere deps de Google OAuth no instaladas localmente).
    """

    def setUp(self):
        self.user = UserFactory(admin=True)  # DatasetViewSet requiere is_admin
        self.factory = APIRequestFactory()

    def test_create_dataset_returns_201(self):
        fake_pdf = io.BytesIO(b'%PDF-1.4 fake pdf content for testing purposes only')
        fake_pdf.name = 'test_corpus.pdf'

        request = self.factory.post(
            '/api/v1/datasets/',
            data={
                'name': 'Test Dataset H6',
                'description': 'Dataset creado por test automatizado',
                'source': 'upload',
                'files': fake_pdf,
            },
            format='multipart',
        )
        force_authenticate(request, user=self.user)

        view = DatasetViewSet.as_view({'post': 'create'})
        response = view(request)

        self.assertEqual(response.status_code, 201)
        self.assertIn('id', response.data)


# ── 4. Test de preprocesamiento ───────────────────────────────────────────────

class TestPreprocessForInference(TestCase):
    """Verifica que preprocess_for_inference elimina URLs, números y stopwords."""

    def test_removes_urls(self):
        text = "Visit https://www.example.com for more information about education"
        result = preprocess_for_inference(text, lemmatize=False, strip_references=False)
        self.assertNotIn('https', result)
        self.assertNotIn('www', result)

    def test_removes_standalone_numbers(self):
        text = "In 2024 there were 150 universities with 3000 students each"
        result = preprocess_for_inference(text, lemmatize=False, strip_references=False)
        self.assertNotIn('2024', result)
        self.assertNotIn('150', result)
        self.assertNotIn('3000', result)

    def test_removes_custom_stopwords(self):
        text = "the university and the students are learning with the teachers"
        result = preprocess_for_inference(
            text,
            stopwords={'the', 'are', 'with', 'and'},
            lemmatize=False,
            strip_references=False,
        )
        self.assertNotIn(' the ', f' {result} ')
        # Términos con contenido deben mantenerse
        self.assertIn('university', result)
        self.assertIn('students', result)

    def test_empty_input_returns_empty(self):
        self.assertEqual(preprocess_for_inference(''), '')
        self.assertEqual(preprocess_for_inference('   '), '')

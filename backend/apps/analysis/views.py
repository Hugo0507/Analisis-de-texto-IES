"""
Views for Analysis app.

Exposes Use Cases as REST API endpoints for NLP/ML analysis.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .use_cases.generate_bow import GenerateBowUseCase
from .use_cases.calculate_tfidf import CalculateTfidfUseCase
from .use_cases.train_topic_models import TrainTopicModelsUseCase
from .use_cases.analyze_factors import AnalyzeFactorsUseCase


class BowViewSet(viewsets.ViewSet):
    """
    ViewSet for Bag of Words analysis.

    Endpoints:
    - POST /api/analysis/bow/generate/
    - GET /api/analysis/bow/{document_id}/
    - GET /api/analysis/bow/vocabulary/
    """

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        """
        Generate Bag of Words matrix.

        POST /api/analysis/bow/generate/
        Body: {
            "document_ids": [1, 2, 3],  # Optional
            "max_features": 5000,
            "min_df": 2,
            "max_df": 0.85,
            "ngram_range": [1, 1],
            "use_cache": true
        }
        """
        use_case = GenerateBowUseCase()

        # Convert ngram_range list to tuple
        ngram_range = request.data.get('ngram_range', [1, 1])
        if isinstance(ngram_range, list):
            ngram_range = tuple(ngram_range)

        result = use_case.execute(
            document_ids=request.data.get('document_ids', None),
            max_features=request.data.get('max_features', 5000),
            min_df=request.data.get('min_df', 2),
            max_df=request.data.get('max_df', 0.85),
            ngram_range=ngram_range,
            use_cache=request.data.get('use_cache', True)
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        """
        Get BoW for a specific document.

        GET /api/analysis/bow/{document_id}/
        Query params: top_n (default: 50)
        """
        use_case = GenerateBowUseCase()

        top_n = int(request.query_params.get('top_n', 50))
        result = use_case.get_document_bow(
            document_id=int(pk),
            top_n=top_n
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='vocabulary')
    def vocabulary(self, request):
        """
        Get vocabulary statistics.

        GET /api/analysis/bow/vocabulary/
        """
        use_case = GenerateBowUseCase()
        result = use_case.get_vocabulary_stats()

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_404_NOT_FOUND)


class TfidfViewSet(viewsets.ViewSet):
    """
    ViewSet for TF-IDF analysis.

    Endpoints:
    - POST /api/analysis/tfidf/calculate/
    - GET /api/analysis/tfidf/{document_id}/
    - GET /api/analysis/tfidf/similarity/
    """

    @action(detail=False, methods=['post'], url_path='calculate')
    def calculate(self, request):
        """
        Calculate TF-IDF matrix.

        POST /api/analysis/tfidf/calculate/
        Body: {
            "document_ids": [1, 2, 3],  # Optional
            "max_features": 5000,
            "norm": "l2",
            "use_idf": true,
            "sublinear_tf": false,
            "use_cache": true
        }
        """
        use_case = CalculateTfidfUseCase()

        result = use_case.execute(
            document_ids=request.data.get('document_ids', None),
            max_features=request.data.get('max_features', 5000),
            norm=request.data.get('norm', 'l2'),
            use_idf=request.data.get('use_idf', True),
            sublinear_tf=request.data.get('sublinear_tf', False),
            use_cache=request.data.get('use_cache', True)
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        """
        Get TF-IDF for a specific document.

        GET /api/analysis/tfidf/{document_id}/
        Query params: top_n (default: 50)
        """
        use_case = CalculateTfidfUseCase()

        top_n = int(request.query_params.get('top_n', 50))
        result = use_case.get_document_tfidf(
            document_id=int(pk),
            top_n=top_n
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='similarity')
    def similarity(self, request):
        """
        Calculate cosine similarity between two documents.

        GET /api/analysis/tfidf/similarity/?doc_id1=1&doc_id2=2
        """
        doc_id1 = request.query_params.get('doc_id1')
        doc_id2 = request.query_params.get('doc_id2')

        if not doc_id1 or not doc_id2:
            return Response(
                {'error': 'doc_id1 and doc_id2 are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        use_case = CalculateTfidfUseCase()
        result = use_case.calculate_similarity(
            doc_id1=int(doc_id1),
            doc_id2=int(doc_id2)
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class TopicModelingViewSet(viewsets.ViewSet):
    """
    ViewSet for Topic Modeling.

    Endpoints:
    - POST /api/analysis/topics/train/
    - GET /api/analysis/topics/lda/
    - GET /api/analysis/topics/nmf/
    - GET /api/analysis/topics/lsa/
    - GET /api/analysis/topics/plsa/
    - GET /api/analysis/topics/compare/
    """

    @action(detail=False, methods=['post'], url_path='train')
    def train(self, request):
        """
        Train a topic model.

        POST /api/analysis/topics/train/
        Body: {
            "model_type": "lda",  # lda, nmf, lsa, plsa
            "n_topics": 10,
            "document_ids": [1, 2, 3],  # Optional
            "use_cache": true
        }
        """
        use_case = TrainTopicModelsUseCase()

        model_type = request.data.get('model_type', 'lda')
        if model_type not in ['lda', 'nmf', 'lsa', 'plsa']:
            return Response(
                {'error': f'Invalid model_type: {model_type}. Must be one of: lda, nmf, lsa, plsa'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = use_case.execute(
            model_type=model_type,
            n_topics=request.data.get('n_topics', 10),
            document_ids=request.data.get('document_ids', None),
            use_cache=request.data.get('use_cache', True)
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='lda')
    def lda(self, request):
        """
        Get LDA topic modeling results.

        GET /api/analysis/topics/lda/?n_topics=10&use_cache=true
        """
        use_case = TrainTopicModelsUseCase()

        result = use_case.execute(
            model_type='lda',
            n_topics=int(request.query_params.get('n_topics', 10)),
            document_ids=None,
            use_cache=request.query_params.get('use_cache', 'true').lower() == 'true'
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='nmf')
    def nmf(self, request):
        """
        Get NMF topic modeling results.

        GET /api/analysis/topics/nmf/?n_topics=10&use_cache=true
        """
        use_case = TrainTopicModelsUseCase()

        result = use_case.execute(
            model_type='nmf',
            n_topics=int(request.query_params.get('n_topics', 10)),
            document_ids=None,
            use_cache=request.query_params.get('use_cache', 'true').lower() == 'true'
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='lsa')
    def lsa(self, request):
        """
        Get LSA topic modeling results.

        GET /api/analysis/topics/lsa/?n_topics=10&use_cache=true
        """
        use_case = TrainTopicModelsUseCase()

        result = use_case.execute(
            model_type='lsa',
            n_topics=int(request.query_params.get('n_topics', 10)),
            document_ids=None,
            use_cache=request.query_params.get('use_cache', 'true').lower() == 'true'
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='plsa')
    def plsa(self, request):
        """
        Get pLSA topic modeling results.

        GET /api/analysis/topics/plsa/?n_topics=10&use_cache=true
        """
        use_case = TrainTopicModelsUseCase()

        result = use_case.execute(
            model_type='plsa',
            n_topics=int(request.query_params.get('n_topics', 10)),
            document_ids=None,
            use_cache=request.query_params.get('use_cache', 'true').lower() == 'true'
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='compare')
    def compare(self, request):
        """
        Compare all topic models.

        GET /api/analysis/topics/compare/?n_topics=10
        """
        use_case = TrainTopicModelsUseCase()

        result = use_case.compare_models(
            document_ids=None,
            n_topics=int(request.query_params.get('n_topics', 10))
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class FactorAnalysisViewSet(viewsets.ViewSet):
    """
    ViewSet for Factor Analysis.

    Endpoints:
    - POST /api/analysis/factors/analyze/
    - GET /api/analysis/factors/{document_id}/
    - GET /api/analysis/factors/statistics/
    """

    @action(detail=False, methods=['post'], url_path='analyze')
    def analyze(self, request):
        """
        Analyze digital transformation factors.

        POST /api/analysis/factors/analyze/
        Body: {
            "document_ids": [1, 2, 3],  # Optional
            "normalize_by_length": true,
            "use_cache": true
        }
        """
        use_case = AnalyzeFactorsUseCase()

        result = use_case.execute(
            document_ids=request.data.get('document_ids', None),
            normalize_by_length=request.data.get('normalize_by_length', True),
            use_cache=request.data.get('use_cache', True)
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        """
        Get factors for a specific document.

        GET /api/analysis/factors/{document_id}/
        Query params: top_n (default: 16)
        """
        use_case = AnalyzeFactorsUseCase()

        top_n = int(request.query_params.get('top_n', 16))
        result = use_case.get_document_factors(
            document_id=int(pk),
            top_n=top_n
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """
        Get global factor statistics.

        GET /api/analysis/factors/statistics/
        """
        use_case = AnalyzeFactorsUseCase()
        result = use_case.get_factor_statistics()

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_404_NOT_FOUND)

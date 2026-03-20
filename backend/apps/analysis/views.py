"""
Views for Analysis app.

Exposes Use Cases as REST API endpoints for NLP/ML analysis.
"""

import csv
import logging

from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Count

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .use_cases.generate_bow import GenerateBowUseCase
from .use_cases.calculate_tfidf import CalculateTfidfUseCase
from .use_cases.train_topic_models import TrainTopicModelsUseCase
from .use_cases.analyze_factors import AnalyzeFactorsUseCase
from .models import Factor, FactorAnalysisRun

logger = logging.getLogger(__name__)


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

    @action(detail=False, methods=['get'], url_path='export')
    def export_csv(self, request):
        """
        Export factor analysis results as CSV.

        GET /api/analysis/factors/export/
        """
        factors = Factor.objects.all().order_by('category', 'name')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="factor_analysis.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'factor_name', 'category', 'global_frequency',
            'relevance_score', 'keyword_count',
        ])

        for f in factors:
            writer.writerow([
                f.name,
                f.category,
                f.global_frequency,
                f.relevance_score or 0,
                len(f.keywords) if f.keywords else 0,
            ])

        return response

    @action(detail=False, methods=['get'], url_path='temporal')
    def temporal_analysis(self, request):
        """
        Temporal analysis: documents and top factors grouped by year.

        GET /api/analysis/factors/temporal/
        """
        from apps.datasets.models import DatasetFile
        from apps.analysis.models import DocumentFactor

        # Group documents by year
        yearly_data = (
            DatasetFile.objects
            .filter(bib_year__isnull=False)
            .values('bib_year')
            .annotate(doc_count=Count('id'))
            .order_by('bib_year')
        )

        results = []
        for entry in yearly_data:
            year = entry['bib_year']

            # Get top factors for this year's documents
            doc_ids = DatasetFile.objects.filter(
                bib_year=year
            ).values_list('id', flat=True)

            top_factors = (
                DocumentFactor.objects
                .filter(document_id__in=doc_ids)
                .values('factor__name', 'factor__category')
                .annotate(total_mentions=Count('id'))
                .order_by('-total_mentions')[:5]
            )

            results.append({
                'year': year,
                'doc_count': entry['doc_count'],
                'top_factors': [
                    {
                        'factor_name': tf['factor__name'],
                        'category': tf['factor__category'],
                        'mention_count': tf['total_mentions'],
                    }
                    for tf in top_factors
                ],
            })

        return Response({
            'success': True,
            'temporal_data': results,
            'total_years': len(results),
        })

    @action(detail=False, methods=['post'], url_path='seed')
    def seed(self, request):
        """
        Create the 16 initial digital transformation factors in the database.

        POST /api/analysis/factors/seed/
        Idempotent: returns existing count if factors already exist.
        """
        INITIAL_FACTORS = [
            {
                'name': 'Tecnologias Emergentes', 'category': 'tecnologico',
                'keywords': [
                    'inteligencia artificial', 'machine learning', 'deep learning',
                    'blockchain', 'internet de las cosas', 'IoT', 'cloud computing',
                    'big data', 'analytics', 'realidad virtual', 'realidad aumentada',
                    '5G', 'automatizacion', 'robotica', 'computacion cuantica',
                    'artificial intelligence', 'neural network', 'deep neural',
                    'distributed ledger', 'internet of things', 'edge computing',
                    'cloud services', 'data analytics', 'virtual reality',
                    'augmented reality', 'automation', 'robotics', 'quantum computing',
                    'emerging technology', 'disruptive technology',
                ],
            },
            {
                'name': 'Infraestructura Digital', 'category': 'tecnologico',
                'keywords': [
                    'servidores', 'data center', 'redes', 'conectividad', 'banda ancha',
                    'wifi', 'fibra optica', 'hardware', 'software', 'sistemas',
                    'plataformas', 'aplicaciones', 'dispositivos', 'equipos', 'tecnologia',
                    'servers', 'network', 'connectivity', 'broadband', 'fiber optic',
                    'systems', 'platforms', 'applications', 'devices', 'infrastructure',
                    'digital infrastructure', 'information technology', 'IT infrastructure',
                ],
            },
            {
                'name': 'Cultura Organizacional', 'category': 'organizacional',
                'keywords': [
                    'cambio organizacional', 'transformacion cultural', 'innovacion',
                    'mentalidad digital', 'agilidad', 'colaboracion', 'trabajo en equipo',
                    'liderazgo', 'vision compartida', 'valores', 'compromiso',
                    'resistencia al cambio', 'adaptacion', 'flexibilidad',
                    'organizational change', 'cultural transformation', 'innovation',
                    'digital mindset', 'agility', 'collaboration', 'teamwork',
                    'leadership', 'shared vision', 'values', 'commitment',
                    'resistance to change', 'adaptation', 'flexibility',
                    'organizational culture', 'change management',
                ],
            },
            {
                'name': 'Procesos y Gestion', 'category': 'organizacional',
                'keywords': [
                    'procesos', 'gestion', 'administracion', 'planificacion',
                    'organizacion', 'coordinacion', 'control', 'evaluacion',
                    'mejora continua', 'optimizacion', 'eficiencia', 'productividad',
                    'calidad', 'estandarizacion', 'automatizacion de procesos',
                    'process management', 'business process', 'administration',
                    'planning', 'coordination', 'evaluation', 'continuous improvement',
                    'optimization', 'efficiency', 'productivity', 'quality',
                    'standardization', 'process automation', 'governance', 'workflow',
                ],
            },
            {
                'name': 'Competencias Digitales', 'category': 'humano',
                'keywords': [
                    'habilidades digitales', 'competencias tecnologicas',
                    'alfabetizacion digital', 'capacitacion', 'formacion',
                    'entrenamiento', 'desarrollo profesional', 'aprendizaje continuo',
                    'talento digital', 'conocimiento tecnico', 'destrezas',
                    'certificaciones', 'cursos online', 'e-learning',
                    'digital skills', 'digital competencies', 'digital literacy',
                    'training', 'professional development', 'continuous learning',
                    'digital talent', 'technical knowledge', 'skills',
                    'certifications', 'online courses', 'workforce development',
                    'upskilling', 'reskilling',
                ],
            },
            {
                'name': 'Actitudes y Comportamientos', 'category': 'humano',
                'keywords': [
                    'actitud digital', 'disposicion al cambio', 'motivacion',
                    'participacion', 'compromiso', 'engagement', 'adaptabilidad',
                    'creatividad', 'pensamiento critico', 'resolucion de problemas',
                    'iniciativa', 'proactividad', 'autonomia', 'responsabilidad',
                    'digital attitude', 'openness to change', 'motivation',
                    'participation', 'adaptability', 'creativity', 'critical thinking',
                    'problem solving', 'initiative', 'proactivity', 'autonomy',
                    'responsibility', 'behavior', 'attitude', 'mindset',
                ],
            },
            {
                'name': 'Estrategia Digital', 'category': 'estrategico',
                'keywords': [
                    'estrategia', 'vision digital', 'objetivos estrategicos',
                    'metas', 'plan digital', 'roadmap', 'hoja de ruta',
                    'planificacion estrategica', 'alineacion', 'transformacion digital',
                    'digitalizacion', 'innovacion estrategica', 'ventaja competitiva',
                    'diferenciacion', 'digital strategy', 'digital vision',
                    'strategic objectives', 'goals', 'digital plan', 'strategic planning',
                    'alignment', 'digital transformation', 'digitalization',
                    'strategic innovation', 'competitive advantage', 'differentiation',
                    'strategic management', 'digital agenda',
                ],
            },
            {
                'name': 'Toma de Decisiones Basada en Datos', 'category': 'estrategico',
                'keywords': [
                    'datos', 'informacion', 'analisis de datos', 'data analytics',
                    'metricas', 'indicadores', 'KPIs', 'dashboards', 'reportes',
                    'inteligencia de negocios', 'business intelligence', 'evidencia',
                    'toma de decisiones', 'decision making', 'data-driven',
                    'data', 'information', 'data analysis', 'analytics',
                    'metrics', 'indicators', 'reports', 'evidence-based',
                    'data-driven decision', 'predictive analytics', 'big data analytics',
                ],
            },
            {
                'name': 'Inversion y Presupuesto', 'category': 'financiero',
                'keywords': [
                    'inversion', 'presupuesto', 'financiamiento', 'recursos financieros',
                    'costos', 'gastos', 'ROI', 'retorno de inversion',
                    'recursos economicos', 'fondos', 'capital', 'asignacion de recursos',
                    'gasto tecnologico', 'financiacion',
                    'investment', 'budget', 'funding', 'financial resources',
                    'costs', 'expenditure', 'return on investment', 'economic resources',
                    'funds', 'resource allocation', 'technology spending', 'financing',
                    'financial investment', 'IT budget',
                ],
            },
            {
                'name': 'Sostenibilidad Financiera', 'category': 'financiero',
                'keywords': [
                    'sostenibilidad', 'viabilidad financiera', 'rentabilidad',
                    'eficiencia economica', 'optimizacion de costos', 'ahorro',
                    'reduccion de gastos', 'beneficios economicos', 'valor economico',
                    'modelo de negocio', 'monetizacion', 'ingresos', 'costo-beneficio',
                    'sustainability', 'financial viability', 'profitability',
                    'economic efficiency', 'cost optimization', 'savings',
                    'cost reduction', 'economic benefits', 'economic value',
                    'business model', 'monetization', 'revenue', 'cost-benefit',
                    'financial sustainability', 'long-term investment',
                ],
            },
            {
                'name': 'Metodologias Pedagogicas', 'category': 'pedagogico',
                'keywords': [
                    'pedagogia', 'metodologia', 'ensenanza', 'aprendizaje', 'didactica',
                    'estrategias pedagogicas', 'metodos de ensenanza', 'aula invertida',
                    'aprendizaje activo', 'aprendizaje colaborativo',
                    'educacion personalizada', 'tutoria', 'evaluacion', 'retroalimentacion',
                    'pedagogy', 'methodology', 'teaching', 'learning', 'didactics',
                    'pedagogical strategies', 'teaching methods', 'flipped classroom',
                    'active learning', 'collaborative learning', 'personalized education',
                    'tutoring', 'assessment', 'feedback', 'blended learning',
                    'instructional design', 'curriculum',
                ],
            },
            {
                'name': 'Recursos Educativos Digitales', 'category': 'pedagogico',
                'keywords': [
                    'recursos digitales', 'contenidos digitales', 'materiales educativos',
                    'plataformas educativas', 'LMS', 'aulas virtuales', 'MOOC',
                    'videos educativos', 'simulaciones', 'gamificacion',
                    'recursos interactivos', 'repositorios', 'bibliotecas digitales', 'OER',
                    'digital resources', 'digital content', 'educational materials',
                    'educational platforms', 'virtual classrooms',
                    'educational videos', 'simulations', 'gamification',
                    'interactive resources', 'repositories', 'digital libraries',
                    'open educational resources', 'e-learning platform',
                ],
            },
            {
                'name': 'Infraestructura Tecnologica', 'category': 'infraestructura',
                'keywords': [
                    'infraestructura', 'instalaciones', 'laboratorios', 'aulas',
                    'espacios', 'equipamiento', 'mobiliario', 'red de datos',
                    'cableado', 'electricidad', 'climatizacion', 'accesibilidad',
                    'mantenimiento', 'modernizacion',
                    'technological infrastructure', 'facilities', 'laboratories',
                    'classrooms', 'spaces', 'equipment', 'data network',
                    'cabling', 'electricity', 'accessibility', 'modernization',
                    'campus infrastructure', 'smart campus',
                ],
            },
            {
                'name': 'Soporte Tecnico', 'category': 'infraestructura',
                'keywords': [
                    'soporte', 'asistencia tecnica', 'helpdesk', 'mesa de ayuda',
                    'mantenimiento', 'reparacion', 'actualizaciones', 'backup',
                    'respaldo', 'recuperacion', 'monitoreo', 'supervision',
                    'troubleshooting', 'resolucion de problemas',
                    'technical support', 'maintenance', 'repair', 'updates',
                    'recovery', 'monitoring', 'supervision', 'problem resolution',
                    'IT support', 'user support', 'technical assistance',
                ],
            },
            {
                'name': 'Ciberseguridad', 'category': 'seguridad',
                'keywords': [
                    'seguridad', 'ciberseguridad', 'proteccion', 'encriptacion',
                    'cifrado', 'antivirus', 'firewall', 'autenticacion',
                    'autorizacion', 'control de acceso', 'permisos',
                    'vulnerabilidades', 'amenazas', 'ataques', 'hackers',
                    'security', 'cybersecurity', 'protection', 'encryption',
                    'authentication', 'authorization', 'access control', 'permissions',
                    'vulnerabilities', 'threats', 'cyberattacks', 'information security',
                    'data security', 'cyber threats',
                ],
            },
            {
                'name': 'Privacidad y Proteccion de Datos', 'category': 'seguridad',
                'keywords': [
                    'privacidad', 'proteccion de datos', 'GDPR', 'datos personales',
                    'confidencialidad', 'anonimizacion', 'consentimiento',
                    'politicas de privacidad', 'cumplimiento', 'regulacion',
                    'normativa', 'ley de datos', 'derechos digitales', 'transparencia',
                    'privacy', 'data protection', 'personal data', 'confidentiality',
                    'anonymization', 'consent', 'privacy policy', 'compliance',
                    'regulation', 'data law', 'digital rights', 'transparency',
                    'data governance', 'FERPA',
                ],
            },
        ]

        try:
            if Factor.objects.exists():
                return Response(
                    {'success': True, 'message': 'Los factores ya estaban cargados.', 'count': Factor.objects.count()},
                    status=status.HTTP_200_OK,
                )

            Factor.objects.bulk_create([
                Factor(name=f['name'], category=f['category'], keywords=f['keywords'])
                for f in INITIAL_FACTORS
            ])
            count = Factor.objects.count()
            return Response(
                {'success': True, 'message': f'{count} factores cargados correctamente.', 'count': count},
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            return Response(
                {'success': False, 'error': str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'], url_path='cooccurrence-graph')
    def cooccurrence_graph(self, request):
        """
        Return factor co-occurrence data in graph format for network visualization.

        GET /api/analysis/factors/cooccurrence-graph/

        Response format:
        {
            "nodes": [
                {"id": "factor_1", "label": "Tecnologias Emergentes",
                 "category": "tecnologico", "frequency": 120, "size": 15}
            ],
            "edges": [
                {"source": "factor_1", "target": "factor_2",
                 "weight": 45, "strength": 0.8}
            ]
        }
        """
        use_case = AnalyzeFactorsUseCase()

        # Get factor analysis (from cache if available)
        result = use_case.execute(use_cache=True)

        if not result.get('success'):
            return Response(
                {'success': False, 'error': result.get('error', 'Factor analysis not available')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build nodes from global_statistics
        global_stats = result.get('global_statistics', [])
        co_occurrence = result.get('co_occurrence', [])

        # Determine max frequency for node sizing
        max_freq = max(
            (s['global_frequency'] for s in global_stats), default=1
        )

        nodes = []
        for stat in global_stats:
            fid = stat['factor_id']
            freq = stat['global_frequency']
            # Scale node size between 5 and 30
            size = 5 + (freq / max_freq) * 25 if max_freq > 0 else 10

            nodes.append({
                'id': f"factor_{fid}",
                'label': stat['factor_name'],
                'category': stat['category'],
                'frequency': freq,
                'document_coverage': stat.get('document_coverage', 0),
                'size': round(size, 1),
            })

        # Build edges from co_occurrence
        max_co = max(
            (c['co_occurrence_count'] for c in co_occurrence), default=1
        )

        edges = []
        for co in co_occurrence:
            weight = co['co_occurrence_count']
            strength = weight / max_co if max_co > 0 else 0.0

            edges.append({
                'source': f"factor_{co['factor1_id']}",
                'target': f"factor_{co['factor2_id']}",
                'weight': weight,
                'strength': round(strength, 4),
            })

        return Response({
            'success': True,
            'nodes': nodes,
            'edges': edges,
            'total_nodes': len(nodes),
            'total_edges': len(edges),
        })

    @action(detail=False, methods=['get'], url_path='evaluation')
    def evaluation(self, request):
        """
        Evaluate factor detection quality with proxy metrics.

        GET /api/analysis/factors/evaluation/
        GET /api/analysis/factors/evaluation/?factor_id=1
        """
        from .services.factor_evaluation_service import FactorEvaluationService

        factor_id = request.query_params.get('factor_id')
        factor_id = int(factor_id) if factor_id else None

        service = FactorEvaluationService()
        result = service.evaluate_factor_detection(factor_id=factor_id)

        if result.get('success'):
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class FactorCRUDViewSet(viewsets.ViewSet):
    """
    CRUD for Factor model.

    Endpoints:
    - GET  /api/analysis/factors-catalog/         list
    - POST /api/analysis/factors-catalog/         create
    - GET  /api/analysis/factors-catalog/{id}/    retrieve
    - PATCH /api/analysis/factors-catalog/{id}/   update
    - DELETE /api/analysis/factors-catalog/{id}/  destroy
    """

    def list(self, request):
        """List all factors with their keywords."""
        factors = Factor.objects.all().order_by('category', 'name')
        data = [
            {
                'id': f.id,
                'name': f.name,
                'category': f.category,
                'keywords': f.keywords or [],
                'keyword_count': len(f.keywords) if f.keywords else 0,
                'global_frequency': f.global_frequency,
                'relevance_score': f.relevance_score,
            }
            for f in factors
        ]
        return Response({'success': True, 'factors': data, 'total': len(data)})

    def create(self, request):
        """Create a new factor."""
        name = request.data.get('name', '').strip()
        category = request.data.get('category', '').strip()
        keywords = request.data.get('keywords', [])

        if not name:
            return Response({'success': False, 'error': 'El nombre es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        if not category:
            return Response({'success': False, 'error': 'La categoría es obligatoria.'}, status=status.HTTP_400_BAD_REQUEST)
        valid_cats = [c[0] for c in Factor.CATEGORY_CHOICES]
        if category not in valid_cats:
            return Response({'success': False, 'error': f'Categoría inválida. Opciones: {valid_cats}'}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(keywords, list):
            return Response({'success': False, 'error': 'keywords debe ser una lista.'}, status=status.HTTP_400_BAD_REQUEST)

        factor = Factor.objects.create(name=name, category=category, keywords=keywords)
        return Response({
            'success': True,
            'factor': {
                'id': factor.id,
                'name': factor.name,
                'category': factor.category,
                'keywords': factor.keywords,
            }
        }, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        """Get a single factor."""
        try:
            f = Factor.objects.get(pk=pk)
            return Response({
                'success': True,
                'factor': {
                    'id': f.id,
                    'name': f.name,
                    'category': f.category,
                    'keywords': f.keywords or [],
                }
            })
        except Factor.DoesNotExist:
            return Response({'success': False, 'error': 'Factor no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    def partial_update(self, request, pk=None):
        """Update a factor (PATCH)."""
        try:
            f = Factor.objects.get(pk=pk)
        except Factor.DoesNotExist:
            return Response({'success': False, 'error': 'Factor no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if 'name' in request.data:
            f.name = request.data['name'].strip()
        if 'category' in request.data:
            cat = request.data['category']
            valid_cats = [c[0] for c in Factor.CATEGORY_CHOICES]
            if cat not in valid_cats:
                return Response({'success': False, 'error': f'Categoría inválida.'}, status=status.HTTP_400_BAD_REQUEST)
            f.category = cat
        if 'keywords' in request.data:
            kw = request.data['keywords']
            if not isinstance(kw, list):
                return Response({'success': False, 'error': 'keywords debe ser una lista.'}, status=status.HTTP_400_BAD_REQUEST)
            f.keywords = kw
        f.save()
        return Response({'success': True, 'factor': {'id': f.id, 'name': f.name, 'category': f.category, 'keywords': f.keywords}})

    def destroy(self, request, pk=None):
        """Delete a factor."""
        try:
            f = Factor.objects.get(pk=pk)
            f.delete()
            return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)
        except Factor.DoesNotExist:
            return Response({'success': False, 'error': 'Factor no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


class FactorRunViewSet(viewsets.ViewSet):
    """
    CRUD for FactorAnalysisRun.

    Endpoints:
    - GET  /api/analysis/factor-runs/          list
    - POST /api/analysis/factor-runs/          create + execute
    - GET  /api/analysis/factor-runs/{id}/     retrieve
    - DELETE /api/analysis/factor-runs/{id}/   destroy
    """

    def _serialize_run(self, run):
        return {
            'id': run.id,
            'name': run.name,
            'status': run.status,
            'data_preparation_id': run.data_preparation_id,
            'data_preparation_name': run.data_preparation.name if run.data_preparation else None,
            'dataset_name': run.data_preparation.dataset.name if run.data_preparation and run.data_preparation.dataset else None,
            'document_count': run.document_count,
            'factor_count': run.factor_count,
            'error_message': run.error_message,
            'created_at': run.created_at.isoformat() if run.created_at else None,
            'completed_at': run.completed_at.isoformat() if run.completed_at else None,
        }

    def list(self, request):
        """List all factor analysis runs."""
        runs = FactorAnalysisRun.objects.select_related('data_preparation__dataset').all()
        return Response({'success': True, 'runs': [self._serialize_run(r) for r in runs], 'total': runs.count()})

    def create(self, request):
        """Create a new factor analysis run and execute it."""
        from apps.data_preparation.models import DataPreparation

        name = request.data.get('name', '').strip()
        data_preparation_id = request.data.get('data_preparation_id')

        if not name:
            return Response({'success': False, 'error': 'El nombre es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        data_prep = None
        if data_preparation_id:
            try:
                data_prep = DataPreparation.objects.get(pk=data_preparation_id)
            except DataPreparation.DoesNotExist:
                return Response({'success': False, 'error': 'Preparación de datos no encontrada.'}, status=status.HTTP_400_BAD_REQUEST)

        run = FactorAnalysisRun.objects.create(
            name=name,
            data_preparation=data_prep,
            status='running',
        )

        try:
            use_case = AnalyzeFactorsUseCase()

            # Get document IDs from data preparation if provided
            document_ids = None
            if data_prep and data_prep.processed_file_ids:
                document_ids = data_prep.processed_file_ids

            result = use_case.execute(
                document_ids=document_ids,
                normalize_by_length=True,
                use_cache=False,
            )

            if result.get('success'):
                run.status = 'completed'
                run.document_count = result.get('document_count', 0)
                run.factor_count = result.get('factor_count', 0)
                run.results = {k: v for k, v in result.items() if k not in ('success', 'cached', 'cache_source')}
                run.completed_at = timezone.now()
                run.save()
                return Response({
                    'success': True,
                    'run': self._serialize_run(run),
                    **run.results,
                }, status=status.HTTP_201_CREATED)
            else:
                run.status = 'error'
                run.error_message = result.get('error', 'Error desconocido')
                run.save()
                return Response({'success': False, 'error': run.error_message}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as exc:
            logger.exception(f"Error executing factor run: {exc}")
            run.status = 'error'
            run.error_message = str(exc)
            run.save()
            return Response({'success': False, 'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, pk=None):
        """Get a factor analysis run with its results."""
        try:
            run = FactorAnalysisRun.objects.select_related('data_preparation__dataset').get(pk=pk)
        except FactorAnalysisRun.DoesNotExist:
            return Response({'success': False, 'error': 'Análisis no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        data = self._serialize_run(run)
        if run.results:
            data.update(run.results)
        data['success'] = True
        return Response(data)

    def destroy(self, request, pk=None):
        """Delete a factor analysis run."""
        try:
            run = FactorAnalysisRun.objects.get(pk=pk)
            run.delete()
            return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)
        except FactorAnalysisRun.DoesNotExist:
            return Response({'success': False, 'error': 'Análisis no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


class DatasetFileExportViewSet(viewsets.ViewSet):
    """
    Export endpoint for DatasetFile bibliographic metadata.

    Endpoints:
    - GET /api/analysis/dataset-export/export/
    """

    @action(detail=False, methods=['get'], url_path='export')
    def export_csv(self, request):
        """
        Export dataset files bibliographic metadata as CSV.

        GET /api/analysis/dataset-export/export/?dataset_id=1
        """
        from apps.datasets.models import DatasetFile

        dataset_id = request.query_params.get('dataset_id')
        qs = DatasetFile.objects.select_related('dataset')

        if dataset_id:
            qs = qs.filter(dataset_id=dataset_id)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="dataset_files.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'id', 'title', 'authors', 'year', 'doi',
            'journal', 'source_db', 'inclusion_status', 'dataset_name',
        ])

        for f in qs.iterator():
            writer.writerow([
                f.id,
                f.bib_title or f.filename,
                f.bib_authors or '',
                f.bib_year or '',
                f.bib_doi or '',
                f.bib_journal or '',
                f.bib_source_db or '',
                f.inclusion_status,
                f.dataset.name if f.dataset else '',
            ])

        return response

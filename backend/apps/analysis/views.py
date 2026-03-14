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
from .models import Factor


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

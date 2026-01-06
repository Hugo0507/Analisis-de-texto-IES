"""
NER Analysis Views
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import NerAnalysis
from .serializers import (
    NerAnalysisListSerializer,
    NerAnalysisDetailSerializer,
    NerAnalysisCreateSerializer,
    NerAnalysisUpdateSerializer,
    ProgressSerializer,
    StatsSerializer,
)

logger = logging.getLogger(__name__)


class NerAnalysisViewSet(viewsets.ModelViewSet):
    """
    ViewSet para operaciones CRUD de Análisis NER.

    Endpoints:
    - list: Listar todos los análisis NER del usuario
    - create: Crear nuevo análisis e iniciar procesamiento
    - retrieve: Ver detalle completo de un análisis
    - update: Actualizar nombre/descripción
    - destroy: Eliminar un análisis
    - progress: Obtener progreso en tiempo real
    - stats: Obtener estadísticas generales
    - entity_types: Obtener tipos de entidades disponibles por modelo
    - entity_groups: Obtener grupos predefinidos de entidades
    """

    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination - return plain array
    queryset = NerAnalysis.objects.all().select_related(
        'data_preparation',
        'data_preparation__dataset',
        'dataset',
        'created_by'
    )

    def get_queryset(self):
        """Filtrar análisis por usuario actual."""
        return self.queryset.filter(created_by=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        """Usar serializer apropiado según la acción."""
        if self.action == 'list':
            return NerAnalysisListSerializer
        elif self.action == 'create':
            return NerAnalysisCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return NerAnalysisUpdateSerializer
        elif self.action == 'progress':
            return ProgressSerializer
        elif self.action == 'stats':
            return StatsSerializer
        else:
            return NerAnalysisDetailSerializer

    def create(self, request, *args, **kwargs):
        """
        Crear nuevo análisis NER e iniciar procesamiento en background.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Crear análisis en estado pending
        ner = serializer.save()

        # Iniciar procesamiento en background thread
        from .processor import start_processing_thread
        start_processing_thread(ner.id)

        # Retornar análisis creado
        response_serializer = NerAnalysisDetailSerializer(ner)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Actualizar análisis NER (solo nombre y descripción)."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        response_serializer = NerAnalysisDetailSerializer(instance)
        return Response(response_serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Eliminar análisis NER."""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """
        Obtener progreso en tiempo real de un análisis.

        Endpoint: GET /api/v1/ner-analysis/{id}/progress/
        """
        ner = self.get_object()

        # Obtener etiqueta de la etapa
        stage_labels = dict(NerAnalysis.STAGE_CHOICES)
        current_stage_label = stage_labels.get(ner.current_stage, ner.current_stage)

        data = {
            'status': ner.status,
            'progress_percentage': ner.progress_percentage,
            'current_stage': ner.current_stage,
            'current_stage_label': current_stage_label,
            'error_message': ner.error_message,
        }

        serializer = ProgressSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Obtener estadísticas generales de análisis NER.

        Endpoint: GET /api/v1/ner-analysis/stats/
        """
        queryset = self.get_queryset()

        data = {
            'total_analyses': queryset.count(),
            'processing': queryset.filter(status=NerAnalysis.STATUS_PROCESSING).count(),
            'completed': queryset.filter(status=NerAnalysis.STATUS_COMPLETED).count(),
            'failed': queryset.filter(status=NerAnalysis.STATUS_ERROR).count(),
        }

        serializer = StatsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def entity_types(self, request):
        """
        Obtener tipos de entidades disponibles por modelo spaCy.

        Endpoint: GET /api/v1/ner-analysis/entity_types/
        Query params:
        - model: Modelo spaCy (opcional, default: en_core_web_sm)

        Retorna definiciones de entidades con descripciones en español.
        """
        model = request.query_params.get('model', 'en_core_web_sm')

        # Mapeo de entidades por modelo
        entity_definitions = {
            'en_core_web_sm': [
                {
                    'type': 'PERSON',
                    'label': 'Personas',
                    'description': 'Nombres de personas, incluye nombres reales y ficticios',
                    'examples': 'John Doe, Steve Jobs, Albert Einstein'
                },
                {
                    'type': 'NORP',
                    'label': 'Nacionalidades/Grupos',
                    'description': 'Nacionalidades, grupos religiosos o políticos',
                    'examples': 'American, Republican, Christian'
                },
                {
                    'type': 'FAC',
                    'label': 'Instalaciones',
                    'description': 'Edificios, aeropuertos, carreteras, puentes',
                    'examples': 'Empire State Building, Route 66'
                },
                {
                    'type': 'ORG',
                    'label': 'Organizaciones',
                    'description': 'Empresas, agencias, instituciones',
                    'examples': 'Apple Inc, United Nations, Harvard'
                },
                {
                    'type': 'GPE',
                    'label': 'Ubicaciones Geopolíticas',
                    'description': 'Países, ciudades, estados',
                    'examples': 'United States, Paris, California'
                },
                {
                    'type': 'LOC',
                    'label': 'Ubicaciones',
                    'description': 'Ubicaciones no GPE, cadenas montañosas, cuerpos de agua',
                    'examples': 'Mount Everest, Pacific Ocean'
                },
                {
                    'type': 'PRODUCT',
                    'label': 'Productos',
                    'description': 'Objetos, vehículos, comida (no servicios)',
                    'examples': 'iPhone, Toyota Camry'
                },
                {
                    'type': 'EVENT',
                    'label': 'Eventos',
                    'description': 'Guerras, batallas, deportes, huracanes',
                    'examples': 'World War II, Super Bowl'
                },
                {
                    'type': 'WORK_OF_ART',
                    'label': 'Obras de Arte',
                    'description': 'Títulos de libros, canciones, películas',
                    'examples': 'The Great Gatsby, Mona Lisa'
                },
                {
                    'type': 'LAW',
                    'label': 'Leyes',
                    'description': 'Documentos legales convertidos en leyes',
                    'examples': 'Constitution, GDPR'
                },
                {
                    'type': 'LANGUAGE',
                    'label': 'Idiomas',
                    'description': 'Cualquier idioma nombrado',
                    'examples': 'English, Spanish, French'
                },
                {
                    'type': 'DATE',
                    'label': 'Fechas',
                    'description': 'Fechas absolutas o relativas o períodos',
                    'examples': 'June 2023, last year, tomorrow'
                },
                {
                    'type': 'TIME',
                    'label': 'Tiempos',
                    'description': 'Horas del día menores a un día',
                    'examples': '3:00 PM, morning, afternoon'
                },
                {
                    'type': 'PERCENT',
                    'label': 'Porcentajes',
                    'description': 'Porcentajes, incluido el símbolo %',
                    'examples': '50%, twenty percent'
                },
                {
                    'type': 'MONEY',
                    'label': 'Dinero',
                    'description': 'Valores monetarios, incluye unidad',
                    'examples': '$100, €50, 20 dollars'
                },
                {
                    'type': 'QUANTITY',
                    'label': 'Cantidades',
                    'description': 'Medidas de peso o distancia',
                    'examples': '10 kilometers, 5 pounds'
                },
                {
                    'type': 'ORDINAL',
                    'label': 'Ordinales',
                    'description': 'Primero, segundo, tercero',
                    'examples': 'first, second, third'
                },
                {
                    'type': 'CARDINAL',
                    'label': 'Cardinales',
                    'description': 'Números que no son ordinales',
                    'examples': 'one, two, 100, million'
                },
            ],
            # Modelos medianos y grandes inglés tienen las mismas entidades
            'en_core_web_md': None,  # Usar las mismas de sm
            'en_core_web_lg': None,  # Usar las mismas de sm
            # Para modelos españoles, usar etiquetas diferentes
            'es_core_news_sm': [
                {
                    'type': 'PER',
                    'label': 'Personas',
                    'description': 'Nombres de personas',
                    'examples': 'Juan Pérez, María García'
                },
                {
                    'type': 'ORG',
                    'label': 'Organizaciones',
                    'description': 'Empresas, instituciones',
                    'examples': 'Santander, Universidad de Madrid'
                },
                {
                    'type': 'LOC',
                    'label': 'Ubicaciones',
                    'description': 'Lugares geográficos',
                    'examples': 'España, Barcelona, Río Guadalquivir'
                },
                {
                    'type': 'MISC',
                    'label': 'Miscelánea',
                    'description': 'Otras entidades nombradas',
                    'examples': 'Olimpiadas, Guerra Civil'
                },
            ],
            'es_core_news_md': None,  # Usar las mismas de sm
            'es_core_news_lg': None,  # Usar las mismas de sm
        }

        # Obtener definiciones para el modelo solicitado
        entities = entity_definitions.get(model)

        # Si es None, usar el fallback apropiado
        if entities is None:
            if model.startswith('en_'):
                entities = entity_definitions['en_core_web_sm']
            elif model.startswith('es_'):
                entities = entity_definitions['es_core_news_sm']
            else:
                entities = entity_definitions['en_core_web_sm']  # Default

        return Response({
            'model': model,
            'entities': entities,
            'total': len(entities)
        })

    @action(detail=False, methods=['get'])
    def entity_groups(self, request):
        """
        Obtener grupos predefinidos de entidades.

        Endpoint: GET /api/v1/ner-analysis/entity_groups/

        Retorna grupos para selección rápida en UI.
        """
        groups = [
            {
                'id': 'people_orgs',
                'name': 'Personas y Organizaciones',
                'description': 'Identifica personas, empresas y grupos',
                'entities': ['PERSON', 'ORG', 'NORP'],
                'icon': 'users'
            },
            {
                'id': 'locations',
                'name': 'Lugares',
                'description': 'Ubicaciones geográficas y geopolíticas',
                'entities': ['GPE', 'LOC', 'FAC'],
                'icon': 'map'
            },
            {
                'id': 'temporal',
                'name': 'Temporales',
                'description': 'Fechas, tiempos y eventos',
                'entities': ['DATE', 'TIME', 'EVENT'],
                'icon': 'calendar'
            },
            {
                'id': 'numeric',
                'name': 'Numéricos',
                'description': 'Dinero, porcentajes y cantidades',
                'entities': ['MONEY', 'PERCENT', 'QUANTITY', 'CARDINAL', 'ORDINAL'],
                'icon': 'calculator'
            },
            {
                'id': 'others',
                'name': 'Otros',
                'description': 'Productos, obras de arte, leyes e idiomas',
                'entities': ['PRODUCT', 'WORK_OF_ART', 'LAW', 'LANGUAGE'],
                'icon': 'tag'
            },
            {
                'id': 'all',
                'name': 'Todas las Entidades',
                'description': 'Extraer todas las entidades disponibles',
                'entities': ['PERSON', 'NORP', 'FAC', 'ORG', 'GPE', 'LOC', 'PRODUCT',
                           'EVENT', 'WORK_OF_ART', 'LAW', 'LANGUAGE', 'DATE', 'TIME',
                           'PERCENT', 'MONEY', 'QUANTITY', 'ORDINAL', 'CARDINAL'],
                'icon': 'globe'
            },
        ]

        return Response({
            'groups': groups,
            'total': len(groups)
        })

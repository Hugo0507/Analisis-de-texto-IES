"""
Topic Modeling Serializers

Serializers para la API REST de Topic Modeling.
"""

from rest_framework import serializers
from .models import TopicModeling
from apps.data_preparation.models import DataPreparation
from apps.datasets.models import Dataset


class TopicModelingListSerializer(serializers.ModelSerializer):
    """
    Serializer para listar topic modelings (resumen).
    """
    source_name = serializers.CharField(read_only=True)
    algorithm_display = serializers.CharField(source='get_algorithm_display', read_only=True)
    algorithm_category = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    has_artifact = serializers.SerializerMethodField()

    class Meta:
        model = TopicModeling
        fields = [
            'id', 'name', 'description', 'algorithm', 'algorithm_display',
            'algorithm_category', 'num_topics', 'num_words',
            'source_type', 'source_name', 'status', 'status_display',
            'progress_percentage', 'documents_processed', 'coherence_score',
            'has_artifact', 'created_by_username', 'created_at'
        ]

    def get_has_artifact(self, obj):
        return bool(obj.model_artifact and obj.vectorizer_artifact)


class TopicModelingDetailSerializer(serializers.ModelSerializer):
    """
    Serializer para detalle completo de topic modeling.
    """
    source_name = serializers.CharField(read_only=True)
    algorithm_display = serializers.CharField(source='get_algorithm_display', read_only=True)
    algorithm_category = serializers.CharField(read_only=True)
    is_probabilistic = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    pca_projection = serializers.SerializerMethodField()
    topic_classifications = serializers.SerializerMethodField()

    class Meta:
        model = TopicModeling
        fields = [
            # Información básica
            'id', 'name', 'description', 'created_by', 'created_by_username',

            # Origen de datos
            'source_type', 'source_name', 'data_preparation', 'dataset',

            # Configuración
            'algorithm', 'algorithm_display', 'algorithm_category', 'is_probabilistic',
            'num_topics', 'num_words', 'max_iterations', 'random_seed',

            # Estado y progreso
            'status', 'status_display', 'current_stage', 'current_stage_display',
            'progress_percentage', 'error_message',

            # Resultados generales
            'documents_processed', 'vocabulary_size', 'coherence_score', 'perplexity_score',

            # Resultados detallados
            'topics', 'document_topics', 'topic_distribution',

            # PCA projection
            'pca_projection',

            # BE-6: OE3 classification with confidence
            'topic_classifications',

            # Timestamps
            'created_at', 'updated_at', 'processing_started_at', 'processing_completed_at'
        ]

    def get_pca_projection(self, obj):
        """2D PCA of topic word-weight vectors using pure Python power iteration."""
        import math
        topics = obj.topics or []
        if len(topics) < 2:
            return []

        # Build word vocab
        vocab = {}
        for t in topics:
            for w in (t.get('words') or []):
                word = w.get('word', '')
                if word and word not in vocab:
                    vocab[word] = len(vocab)

        if not vocab:
            return []

        n, d = len(topics), len(vocab)

        # Build matrix rows (topics × words)
        M = []
        for t in topics:
            row = [0.0] * d
            for w in (t.get('words') or []):
                idx = vocab.get(w.get('word', ''))
                if idx is not None:
                    row[idx] = float(w.get('weight', 0))
            M.append(row)

        # Center columns
        means = [sum(M[i][j] for i in range(n)) / n for j in range(d)]
        C = [[M[i][j] - means[j] for j in range(d)] for i in range(n)]

        # Gram matrix n×n (small: 5–30 topics)
        G = [[sum(C[i][k] * C[j][k] for k in range(d)) for j in range(n)] for i in range(n)]

        # Power iteration for 2 principal components
        vecs = []
        for _ in range(2):
            v = [1.0 / math.sqrt(n)] * n
            for __ in range(100):
                v2 = [sum(G[i][j] * v[j] for j in range(n)) for i in range(n)]
                norm = math.sqrt(sum(x * x for x in v2)) or 1e-10
                v = [x / norm for x in v2]
            ev = sum(sum(G[i][j] * v[j] for j in range(n)) * v[i] for i in range(n))
            vecs.append(v)
            G = [[G[i][j] - ev * v[i] * v[j] for j in range(n)] for i in range(n)]

        pc1, pc2 = vecs
        doc_counts = {}
        for doc in (obj.document_topics or []):
            dt = doc.get('dominant_topic')
            if dt is not None:
                doc_counts[dt] = doc_counts.get(dt, 0) + 1

        result = []
        for i, t in enumerate(topics):
            tid = t.get('topic_id', i)
            result.append({
                'topic_id': tid,
                'label': t.get('topic_label') or t.get('label') or f'Tema {i + 1}',
                'x': round(pc1[i], 4),
                'y': round(pc2[i], 4),
                'size': doc_counts.get(tid, 1),
            })
        return result

    # ── BE-6: OE3 Factor Category Classification ──────────────────────────────

    # OE3 keyword lexicon (mirrors GeneralDashboard.tsx FACTOR_CATEGORIES)
    _OE3_CATEGORIES = [
        {
            'id': 'infraestructura',
            'label': 'Infraestructura Tecnológica',
            'keywords': [
                'infrastructure', 'technology', 'digital', 'platform', 'system', 'software',
                'hardware', 'cloud', 'network', 'data', 'iot', 'cybersecurity', 'database',
                'integration', 'interoperability', 'bandwidth', 'connectivity', 'server',
                'infraestructura', 'tecnología', 'plataforma', 'sistema', 'nube', 'red',
                'datos', 'seguridad', 'base de datos', 'integración', 'conectividad',
            ],
        },
        {
            'id': 'gobernanza',
            'label': 'Gobernanza y Estrategia',
            'keywords': [
                'governance', 'strategy', 'policy', 'management', 'leadership', 'institutional',
                'planning', 'regulation', 'compliance', 'framework', 'administration',
                'gobernanza', 'estrategia', 'política', 'gestión', 'liderazgo', 'institucional',
                'planificación', 'regulación', 'marco', 'administración',
            ],
        },
        {
            'id': 'docencia',
            'label': 'Docencia y Formación',
            'keywords': [
                'teaching', 'teacher', 'faculty', 'training', 'professional', 'development',
                'pedagogy', 'instructor', 'professor', 'course', 'curriculum', 'competency',
                'docencia', 'docente', 'formación', 'profesional', 'pedagogía', 'capacitación',
                'instructor', 'curso', 'currículo', 'competencia',
            ],
        },
        {
            'id': 'estudiante',
            'label': 'Experiencia del Estudiante',
            'keywords': [
                'student', 'learning', 'education', 'academic', 'curriculum', 'online',
                'e-learning', 'blended', 'engagement', 'experience', 'skill', 'outcome',
                'estudiante', 'aprendizaje', 'educación', 'académico', 'en línea',
                'aprendizaje combinado', 'experiencia', 'habilidad', 'resultado',
            ],
        },
        {
            'id': 'cultura',
            'label': 'Cultura e Innovación',
            'keywords': [
                'culture', 'change', 'innovation', 'transformation', 'adoption', 'mindset',
                'resistance', 'collaboration', 'agile', 'startup', 'entrepreneurship',
                'cultura', 'cambio', 'innovación', 'transformación', 'adopción', 'mentalidad',
                'resistencia', 'colaboración', 'ágil', 'emprendimiento',
            ],
        },
        {
            'id': 'calidad',
            'label': 'Calidad y Evaluación',
            'keywords': [
                'quality', 'evaluation', 'assessment', 'performance', 'outcome', 'impact',
                'measurement', 'metric', 'indicator', 'benchmark', 'accreditation', 'audit',
                'calidad', 'evaluación', 'rendimiento', 'impacto', 'medición', 'métrica',
                'indicador', 'acreditación', 'auditoría',
            ],
        },
    ]

    def get_topic_classifications(self, obj):
        """
        BE-6: For each topic, compute OE3 factor category classification with confidence.
        Returns list of {topic_id, primary_category, secondary_category, confidence_score, matched_keywords}
        """
        topics = obj.topics or []
        if not topics:
            return []

        result = []
        for i, topic in enumerate(topics):
            words = [w.get('word', '').lower() for w in (topic.get('words') or [])]
            text = ' '.join(words)

            scores = []
            for cat in self._OE3_CATEGORIES:
                matched = [kw for kw in cat['keywords'] if kw in text]
                score = len(matched)
                scores.append({
                    'id': cat['id'],
                    'label': cat['label'],
                    'score': score,
                    'matched': matched,
                })

            scores.sort(key=lambda x: x['score'], reverse=True)
            primary = scores[0]
            secondary = scores[1] if scores[1]['score'] > 0 else None

            total_kw = len(self._OE3_CATEGORIES[0]['keywords'])
            confidence = round(primary['score'] / max(1, total_kw), 3)

            result.append({
                'topic_id': topic.get('topic_id', i),
                'primary_category': primary['id'],
                'primary_category_label': primary['label'],
                'secondary_category': secondary['id'] if secondary else None,
                'confidence_score': confidence,
                'matched_keywords': primary['matched'][:8],
            })

        return result


class TopicModelingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear nuevo topic modeling.
    """

    class Meta:
        model = TopicModeling
        fields = [
            'name', 'description', 'source_type', 'data_preparation', 'dataset',
            'algorithm', 'num_topics', 'num_words', 'max_iterations', 'random_seed'
        ]

    def validate(self, data):
        """Validación personalizada"""
        source_type = data.get('source_type')
        data_preparation = data.get('data_preparation')
        dataset = data.get('dataset')

        # Validar que source_type corresponde con data_preparation o dataset
        if source_type == TopicModeling.SOURCE_DATA_PREPARATION:
            if not data_preparation:
                raise serializers.ValidationError({
                    'data_preparation': 'Se requiere una preparación de datos cuando source_type es data_preparation'
                })
            # Verificar que la preparación esté completada
            if data_preparation.status != 'completed':
                raise serializers.ValidationError({
                    'data_preparation': 'La preparación de datos debe estar completada'
                })
            # Limpiar dataset si existe
            data['dataset'] = None

        elif source_type == TopicModeling.SOURCE_DATASET:
            if not dataset:
                raise serializers.ValidationError({
                    'dataset': 'Se requiere un dataset cuando source_type es dataset'
                })
            # Limpiar data_preparation si existe
            data['data_preparation'] = None

        # Validar número de tópicos
        num_topics = data.get('num_topics', 10)
        if num_topics < 2 or num_topics > 100:
            raise serializers.ValidationError({
                'num_topics': 'El número de temas debe estar entre 2 y 100'
            })

        # Validar número de palabras
        num_words = data.get('num_words', 10)
        if num_words < 5 or num_words > 50:
            raise serializers.ValidationError({
                'num_words': 'El número de palabras debe estar entre 5 y 50'
            })

        return data

    def create(self, validated_data):
        """Crear topic modeling"""
        # Agregar usuario actual
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TopicModelingUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para actualizar topic modeling (solo nombre y descripción).
    """

    class Meta:
        model = TopicModeling
        fields = ['name', 'description']


class ProgressSerializer(serializers.ModelSerializer):
    """
    Serializer para obtener progreso de procesamiento.
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)

    class Meta:
        model = TopicModeling
        fields = [
            'status', 'status_display', 'progress_percentage',
            'current_stage', 'current_stage_display', 'error_message'
        ]


class StatsSerializer(serializers.Serializer):
    """
    Serializer para estadísticas generales de topic modelings.
    """
    total = serializers.IntegerField()
    by_status = serializers.DictField()
    by_algorithm = serializers.DictField()

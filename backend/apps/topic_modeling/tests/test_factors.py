"""
Tests del clasificador de factores del OE3 (apps/topic_modeling/factors.py).

El caso dorado son los diez temas reales del modelo LSA sobre el que se redacto
el trabajo de grado. Deben clasificarse exactamente como la Tabla 12 del
informe. Si alguien cambia una palabra del lexico o la regla de desempate y eso
altera los resultados de la tesis, este test lo detecta.
"""

import pytest

from apps.topic_modeling.factors import OE3_CATEGORIES, classify_topics

# Palabras de los temas del LSA publicado (analisis 6, preparacion "lpm").
TEMAS_LSA_INFORME = [
    {
        "topic_id": 0,
        "words": [
            "teachers",
            "heis",
            "business",
            "pandemic",
            "training",
            "innovation",
            "processes",
            "factors",
            "services",
            "ict",
            "faculty",
            "industry",
            "engineering",
            "courses",
            "distance",
            "virtual",
            "course",
            "online learning",
            "teacher",
            "professional",
            "public",
            "elearning"
        ]
    },
    {
        "topic_id": 1,
        "words": [
            "business",
            "heis",
            "maturity",
            "industry",
            "processes",
            "big",
            "innovation",
            "licensed use",
            "utc ieee",
            "xplore restrictions",
            "authorized licensed",
            "restrictions apply",
            "utc",
            "nacional abierta",
            "november utc",
            "limited nacional",
            "distancia downloaded",
            "downloaded november",
            "use limited",
            "xplore",
            "ieee xplore",
            "abierta"
        ]
    },
    {
        "topic_id": 2,
        "words": [
            "heis",
            "business",
            "hei",
            "entrepreneurial",
            "leaders",
            "innovation",
            "crossref",
            "pandemic",
            "faculty",
            "digitalisation",
            "culture",
            "organisational",
            "institutional",
            "organizational",
            "indian",
            "entrepreneurship",
            "policy",
            "public",
            "literature",
            "leadership",
            "vietnam",
            "strategic"
        ]
    },
    {
        "topic_id": 3,
        "words": [
            "teachers",
            "russian",
            "professional",
            "teacher",
            "educational process",
            "competence",
            "ict",
            "literacy",
            "competencies",
            "digital literacy",
            "digitalization",
            "pedagogical",
            "economy",
            "russia",
            "digital economy",
            "russian federation",
            "specialists",
            "modern",
            "formation",
            "federation",
            "digital competence",
            "innovative"
        ]
    },
    {
        "topic_id": 4,
        "words": [
            "heis",
            "teachers",
            "ict",
            "hei",
            "competence",
            "teacher",
            "xplore restrictions",
            "authorized licensed",
            "utc ieee",
            "licensed use",
            "restrictions apply",
            "utc",
            "vietnam",
            "use limited",
            "pedagogical",
            "november utc",
            "limited nacional",
            "distancia downloaded",
            "nacional abierta",
            "downloaded november",
            "xplore",
            "ieee xplore"
        ]
    },
    {
        "topic_id": 5,
        "words": [
            "crossref",
            "doi org",
            "https doi",
            "perceived",
            "industry",
            "org",
            "acceptance",
            "lean",
            "intention",
            "manufacturing",
            "tam",
            "ease use",
            "factors",
            "int",
            "variables",
            "readiness",
            "factor",
            "perceived usefulness",
            "usefulness",
            "perceived ease",
            "satisfaction",
            "innovation"
        ]
    },
    {
        "topic_id": 6,
        "words": [
            "library",
            "libraries",
            "librarians",
            "literacy",
            "academic libraries",
            "services",
            "maturity",
            "ict",
            "staff",
            "digital literacy",
            "crossref",
            "teachers",
            "culture",
            "team",
            "business intelligence",
            "factors",
            "organizational",
            "reading",
            "users",
            "digital technologies",
            "heis",
            "processes"
        ]
    },
    {
        "topic_id": 7,
        "words": [
            "library",
            "libraries",
            "heis",
            "engineering",
            "lean",
            "literacy",
            "librarians",
            "marketing",
            "industry",
            "engineering education",
            "academic libraries",
            "course",
            "manufacturing",
            "reading",
            "vietnam",
            "digital literacy",
            "doi org",
            "https doi",
            "users",
            "competencies",
            "learners",
            "marketing education"
        ]
    },
    {
        "topic_id": 8,
        "words": [
            "crossref",
            "ict",
            "innovation",
            "libraries",
            "latin",
            "virtual",
            "icts",
            "sustainability",
            "library",
            "educ",
            "articial",
            "mexico",
            "articial intelligence",
            "literacy",
            "industrial",
            "reality",
            "librarians",
            "intelligence",
            "int",
            "professors",
            "res",
            "revolution"
        ]
    },
    {
        "topic_id": 9,
        "words": [
            "teachers",
            "marketing",
            "leaders",
            "leadership",
            "business",
            "teacher",
            "learning activities",
            "culture",
            "marketing analytics",
            "marketing education",
            "beliefs",
            "engagement",
            "education teachers",
            "entrepreneurial",
            "teaching learning",
            "analytics",
            "team",
            "organizational",
            "digital technology",
            "strategy",
            "female",
            "institutional"
        ]
    }
]

# Tabla 12 del informe: factor asignado a cada tema del LSA.
TABLA_12 = ["docencia", "cultura", "gobernanza", "docencia", "docencia", "cultura", "infraestructura", "estudiante", "docencia", "gobernanza"]


def tema(topic_id, *palabras):
    return {'topic_id': topic_id, 'words': [{'word': p} for p in palabras]}


@pytest.mark.unit
class TestClasificadorOE3:

    def test_reproduce_la_tabla_12_del_informe(self):
        temas = [{'topic_id': t['topic_id'], 'words': [{'word': w} for w in t['words']]}
                 for t in TEMAS_LSA_INFORME]
        obtenido = [c['primary_category'] for c in classify_topics(temas)]
        assert obtenido == TABLA_12

    def test_seis_categorias_en_el_orden_del_marco(self):
        assert [c['id'] for c in OE3_CATEGORIES] == [
            'infraestructura', 'gobernanza', 'docencia', 'estudiante', 'cultura', 'calidad']

    def test_nombres_iguales_a_los_del_informe(self):
        assert [c['label'] for c in OE3_CATEGORIES] == [
            'Infraestructura Tecnológica', 'Gobernanza y Estrategia', 'Docencia y Formación',
            'Experiencia del Estudiante', 'Cultura e Innovación', 'Calidad y Evaluación']

    def test_gana_la_categoria_con_mas_coincidencias(self):
        [c] = classify_topics([tema(0, 'teaching', 'teacher', 'faculty', 'cloud')])
        assert c['primary_category'] == 'docencia'
        assert c['secondary_category'] == 'infraestructura'

    def test_el_empate_se_resuelve_por_el_orden_del_marco(self):
        # una coincidencia en Infraestructura y otra en Calidad: gana la primera
        [c] = classify_topics([tema(0, 'cloud', 'audit')])
        assert c['primary_category'] == 'infraestructura'

    def test_sin_coincidencias_cae_en_infraestructura_sin_secundaria(self):
        [c] = classify_topics([tema(0, 'zzz', 'qqq')])
        assert c['primary_category'] == 'infraestructura'
        assert c['secondary_category'] is None
        assert c['confidence_score'] == 0

    def test_omite_el_tema_de_atipicos_de_bertopic(self):
        resultado = classify_topics([tema(-1, 'teaching'), tema(3, 'teaching')])
        assert [c['topic_id'] for c in resultado] == [3]

    def test_la_confianza_usa_el_lexico_de_la_categoria_ganadora(self):
        [c] = classify_topics([tema(0, 'quality', 'evaluation', 'assessment')])
        calidad = next(x for x in OE3_CATEGORIES if x['id'] == 'calidad')
        assert c['primary_category'] == 'calidad'
        assert c['confidence_score'] == round(3 / len(calidad['keywords']), 3)

    def test_tolera_temas_vacios(self):
        assert classify_topics(None) == []
        assert classify_topics([]) == []
        [c] = classify_topics([{'topic_id': 0}])
        assert c['primary_category'] == 'infraestructura'


@pytest.mark.unit
class TestSerializadoresUsanLaFuenteUnica:

    def test_temas_y_bertopic_clasifican_igual(self):
        from apps.bertopic.models import BERTopicAnalysis
        from apps.bertopic.serializers import BERTopicDetailSerializer
        from apps.topic_modeling.models import TopicModeling
        from apps.topic_modeling.serializers import TopicModelingDetailSerializer

        temas = [tema(0, 'library', 'libraries', 'services'), tema(1, 'teachers', 'training')]
        de_temas = TopicModelingDetailSerializer().get_topic_classifications(TopicModeling(topics=temas))
        de_bertopic = BERTopicDetailSerializer().get_topic_classifications(BERTopicAnalysis(topics=temas))

        assert de_temas == de_bertopic == classify_topics(temas)

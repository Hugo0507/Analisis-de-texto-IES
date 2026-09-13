"""
Clasificacion de temas en las seis categorias factoriales del OE3.

Fuente unica del marco de factores de la tesis
----------------------------------------------
Hasta ahora habia dos clasificadores del mismo marco: este lexico, como
atributo del serializador de temas, y otro distinto en el frontend
(`FACTOR_CATEGORIES` de `categories.tsx`), que es el que pintaba el Resumen.
Divergian en palabras clave y en nombres, asi que el mismo modelo daba repartos
de factores distintos segun la pantalla.

Se comprobo cual es el correcto aplicando ambos sobre los temas del LSA con que
se redacto el informe: este lexico reproduce la Tabla 12 tema a tema (10/10) y
las coberturas de la Tabla 13 (4/4); el del frontend, 7/10 y 2/4. Por eso este
es el canonico, y el frontend ahora consume lo que devuelve el API en lugar de
clasificar por su cuenta.

El lexico se conserva EXACTAMENTE, palabra por palabra, y tambien la regla de
decision (coincidencia de subcadenas; gana la categoria con mas coincidencias;
los empates se resuelven por el orden de la lista): cambiar cualquiera de las
dos cosas altera los resultados que cita el trabajo de grado.

Limitacion conocida, declarada en el informe: la coincidencia es por subcadena,
de modo que palabras muy frecuentes y genericas del dominio ("digital", "data")
tiran de muchos temas hacia Infraestructura Tecnologica.
"""

from typing import Any, Dict, List

OE3_CATEGORIES = [
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

# Tema que BERTopic usa para los documentos atipicos: no es un tema real.
TEMA_ATIPICOS = -1


def classify_topics(topics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Clasifica cada tema en una categoria factorial primaria y otra secundaria.

    Args:
        topics: temas con la forma que guardan tanto los modelos de temas como
            BERTopic: {'topic_id': int, 'words': [{'word': str, ...}, ...]}.

    Returns:
        Una entrada por tema (se omite el tema de atipicos de BERTopic) con
        topic_id, primary_category, primary_category_label,
        secondary_category, confidence_score y matched_keywords.
    """
    resultado = []
    for i, tema in enumerate(topics or []):
        topic_id = tema.get('topic_id', i)
        if topic_id == TEMA_ATIPICOS:
            continue

        palabras = [(w.get('word') or '').lower() for w in (tema.get('words') or [])]
        texto = ' '.join(palabras)

        puntuaciones = []
        for cat in OE3_CATEGORIES:
            coincidencias = [kw for kw in cat['keywords'] if kw in texto]
            puntuaciones.append({
                'id': cat['id'],
                'label': cat['label'],
                'score': len(coincidencias),
                'matched': coincidencias,
                'total_keywords': len(cat['keywords']),
            })

        # sort es estable: ante empate conserva el orden de OE3_CATEGORIES.
        puntuaciones.sort(key=lambda p: p['score'], reverse=True)
        primaria = puntuaciones[0]
        secundaria = puntuaciones[1] if puntuaciones[1]['score'] > 0 else None

        resultado.append({
            'topic_id': topic_id,
            'primary_category': primaria['id'],
            'primary_category_label': primaria['label'],
            'secondary_category': secundaria['id'] if secundaria else None,
            # Antes se dividia siempre entre el numero de palabras clave de
            # Infraestructura, fuera cual fuera la categoria ganadora.
            'confidence_score': round(primaria['score'] / max(1, primaria['total_keywords']), 3),
            'matched_keywords': primaria['matched'][:8],
        })
    return resultado

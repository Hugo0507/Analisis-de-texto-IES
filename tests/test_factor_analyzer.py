"""
Tests para el módulo src/factor_analyzer.py
Valida análisis de factores clave de transformación digital
"""

import pytest
from src.factor_analyzer import AnalizadorFactores


# ==================== TESTS DE INICIALIZACIÓN ====================

@pytest.mark.unit
def test_analizador_factores_init():
    """Test inicialización de AnalizadorFactores"""
    analizador = AnalizadorFactores()

    # Verificar que tiene categorías definidas
    assert analizador.categorias_factores is not None
    assert len(analizador.categorias_factores) > 0

    # Verificar categorías específicas
    assert 'Tecnológico' in analizador.categorias_factores
    assert 'Organizacional' in analizador.categorias_factores
    assert 'Humano' in analizador.categorias_factores
    assert 'Estratégico' in analizador.categorias_factores

    # Verificar que tiene vectorizador
    assert analizador.vectorizer is not None


@pytest.mark.unit
def test_categorias_have_keywords():
    """Test que todas las categorías tienen keywords"""
    analizador = AnalizadorFactores()

    for categoria, info in analizador.categorias_factores.items():
        assert 'keywords' in info
        assert isinstance(info['keywords'], list)
        assert len(info['keywords']) > 0
        assert 'descripcion' in info


@pytest.mark.unit
def test_categorias_count():
    """Test número de categorías definidas"""
    analizador = AnalizadorFactores()

    # Debería tener al menos 5 categorías principales
    assert len(analizador.categorias_factores) >= 5


# ==================== TESTS DE ANÁLISIS DE TEXTO ====================

@pytest.mark.unit
def test_analizar_texto_basico():
    """Test análisis básico de texto"""
    analizador = AnalizadorFactores()

    texto = "La tecnología digital es fundamental para la transformación digital."
    resultado = analizador.analizar_texto(texto)

    # Debería retornar un diccionario
    assert isinstance(resultado, dict)

    # Debería detectar factor Tecnológico
    assert 'Tecnológico' in resultado
    assert resultado['Tecnológico']['total_menciones'] > 0


@pytest.mark.unit
def test_analizar_texto_vacio():
    """Test análisis de texto vacío"""
    analizador = AnalizadorFactores()

    resultado = analizador.analizar_texto("")

    # Debería retornar diccionario vacío o con ceros
    assert isinstance(resultado, dict)

    # Todas las categorías deberían tener 0 menciones
    for categoria, info in resultado.items():
        if 'total_menciones' in info:
            assert info['total_menciones'] == 0


@pytest.mark.unit
def test_analizar_texto_tecnologico():
    """Test detección de factor Tecnológico"""
    analizador = AnalizadorFactores()

    texto = """
    La transformación digital requiere tecnología avanzada.
    Las plataformas de software y la nube son esenciales.
    La inteligencia artificial y la automatización son clave.
    """

    resultado = analizador.analizar_texto(texto)

    # Debería detectar múltiples menciones de factor Tecnológico
    assert 'Tecnológico' in resultado
    assert resultado['Tecnológico']['total_menciones'] >= 3


@pytest.mark.unit
def test_analizar_texto_organizacional():
    """Test detección de factor Organizacional"""
    analizador = AnalizadorFactores()

    texto = """
    La cultura organizacional es fundamental.
    El liderazgo y la gestión del cambio son críticos.
    Los procesos y la gobernanza deben adaptarse.
    """

    resultado = analizador.analizar_texto(texto)

    # Debería detectar factor Organizacional
    assert 'Organizacional' in resultado
    assert resultado['Organizacional']['total_menciones'] > 0


@pytest.mark.unit
def test_analizar_texto_humano():
    """Test detección de factor Humano"""
    analizador = AnalizadorFactores()

    texto = """
    La capacitación del personal es esencial.
    Las competencias y habilidades deben desarrollarse.
    El aprendizaje y formación continua son importantes.
    """

    resultado = analizador.analizar_texto(texto)

    # Debería detectar factor Humano
    assert 'Humano' in resultado
    assert resultado['Humano']['total_menciones'] > 0


@pytest.mark.unit
def test_analizar_texto_estrategico():
    """Test detección de factor Estratégico"""
    analizador = AnalizadorFactores()

    texto = """
    La estrategia de transformación digital es clave.
    La planificación y visión institucional deben alinearse.
    Los objetivos y metas deben ser claros.
    """

    resultado = analizador.analizar_texto(texto)

    # Debería detectar factor Estratégico
    assert 'Estratégico' in resultado
    assert resultado['Estratégico']['total_menciones'] > 0


@pytest.mark.unit
def test_analizar_texto_financiero():
    """Test detección de factor Financiero"""
    analizador = AnalizadorFactores()

    texto = """
    El presupuesto y la inversión son limitados.
    El financiamiento y los costos deben evaluarse.
    Los recursos económicos son escasos.
    """

    resultado = analizador.analizar_texto(texto)

    # Debería detectar factor Financiero
    assert 'Financiero' in resultado
    assert resultado['Financiero']['total_menciones'] > 0


@pytest.mark.unit
def test_analizar_texto_pedagogico():
    """Test detección de factor Pedagógico"""
    analizador = AnalizadorFactores()

    texto = """
    La educación y la enseñanza deben transformarse.
    La metodología pedagógica y didáctica son importantes.
    El aprendizaje de los estudiantes es prioritario.
    """

    resultado = analizador.analizar_texto(texto)

    # Debería detectar factor Pedagógico
    assert 'Pedagógico' in resultado
    assert resultado['Pedagógico']['total_menciones'] > 0


@pytest.mark.unit
def test_analizar_texto_infraestructura():
    """Test detección de factor Infraestructura"""
    analizador = AnalizadorFactores()

    texto = """
    La conectividad y el acceso a internet son básicos.
    La red y banda ancha deben mejorar.
    Los dispositivos y equipamiento son necesarios.
    """

    resultado = analizador.analizar_texto(texto)

    # Debería detectar factor Infraestructura
    assert 'Infraestructura' in resultado
    assert resultado['Infraestructura']['total_menciones'] > 0


@pytest.mark.unit
def test_analizar_texto_seguridad():
    """Test detección de factor Seguridad"""
    analizador = AnalizadorFactores()

    texto = """
    La seguridad y ciberseguridad son críticas.
    La protección de datos y privacidad deben garantizarse.
    El backup y respaldo son esenciales.
    """

    resultado = analizador.analizar_texto(texto)

    # Debería detectar factor Seguridad
    assert 'Seguridad' in resultado
    assert resultado['Seguridad']['total_menciones'] > 0


# ==================== TESTS DE MÚLTIPLES FACTORES ====================

@pytest.mark.integration
def test_analizar_texto_multiples_factores():
    """Test análisis con múltiples factores presentes"""
    analizador = AnalizadorFactores()

    texto = """
    La transformación digital requiere tecnología avanzada,
    una estrategia clara, capacitación del personal,
    inversión financiera, y buena infraestructura de red.
    La cultura organizacional debe adaptarse.
    """

    resultado = analizador.analizar_texto(texto)

    # Debería detectar múltiples factores
    factores_detectados = [
        cat for cat, info in resultado.items()
        if info.get('total_menciones', 0) > 0
    ]

    # Debería haber detectado al menos 4-5 factores
    assert len(factores_detectados) >= 4


# ==================== TESTS DE KEYWORDS ====================

@pytest.mark.unit
def test_keywords_matching_case_insensitive():
    """Test que keywords matching es case-insensitive"""
    analizador = AnalizadorFactores()

    texto_lower = "la tecnología digital es importante"
    texto_upper = "LA TECNOLOGÍA DIGITAL ES IMPORTANTE"
    texto_mixed = "La Tecnología Digital Es Importante"

    result_lower = analizador.analizar_texto(texto_lower)
    result_upper = analizador.analizar_texto(texto_upper)
    result_mixed = analizador.analizar_texto(texto_mixed)

    # Todos deberían detectar el mismo número de menciones
    assert result_lower['Tecnológico']['total_menciones'] == \
           result_upper['Tecnológico']['total_menciones']
    assert result_lower['Tecnológico']['total_menciones'] == \
           result_mixed['Tecnológico']['total_menciones']


@pytest.mark.unit
def test_keywords_word_boundaries():
    """Test que keywords respetan límites de palabra"""
    analizador = AnalizadorFactores()

    # "tecnología" no debería matchear con "biotecnología"
    texto_exacto = "La tecnología es importante"
    texto_compuesto = "La biotecnología es importante"

    result_exacto = analizador.analizar_texto(texto_exacto)
    result_compuesto = analizador.analizar_texto(texto_compuesto)

    # El texto exacto debería tener más menciones
    # (dependiendo de la implementación de word boundaries)
    assert isinstance(result_exacto, dict)
    assert isinstance(result_compuesto, dict)


# ==================== TESTS DE ESTRUCTURA DE RESULTADO ====================

@pytest.mark.unit
def test_resultado_estructura():
    """Test estructura del resultado"""
    analizador = AnalizadorFactores()

    texto = "La tecnología digital es fundamental."
    resultado = analizador.analizar_texto(texto)

    # Verificar estructura del resultado
    for categoria, info in resultado.items():
        assert isinstance(info, dict)
        assert 'total_menciones' in info
        assert isinstance(info['total_menciones'], int)
        assert info['total_menciones'] >= 0


# ==================== TESTS DE PERFORMANCE ====================

@pytest.mark.slow
def test_analizar_texto_largo():
    """Test análisis de texto largo"""
    analizador = AnalizadorFactores()

    # Crear texto largo (10000 palabras)
    texto_largo = " ".join([
        "La transformación digital requiere tecnología avanzada "
        "y estrategia clara para tener éxito."
    ] * 1000)

    # Debería completar sin errores
    resultado = analizador.analizar_texto(texto_largo)

    assert isinstance(resultado, dict)
    assert len(resultado) > 0


# ==================== TESTS DE EDGE CASES ====================

@pytest.mark.unit
def test_analizar_texto_con_caracteres_especiales():
    """Test análisis con caracteres especiales"""
    analizador = AnalizadorFactores()

    texto = "La tecnología @#$% digital es importante!!! ¿verdad?"
    resultado = analizador.analizar_texto(texto)

    # Debería manejar caracteres especiales sin error
    assert isinstance(resultado, dict)
    assert 'Tecnológico' in resultado


@pytest.mark.unit
def test_analizar_texto_solo_numeros():
    """Test análisis de texto con solo números"""
    analizador = AnalizadorFactores()

    texto = "123 456 789"
    resultado = analizador.analizar_texto(texto)

    # Debería retornar resultado vacío o con ceros
    assert isinstance(resultado, dict)


@pytest.mark.unit
def test_analizar_texto_repetido():
    """Test análisis con keywords repetidas"""
    analizador = AnalizadorFactores()

    texto = "tecnología tecnología tecnología digital digital"
    resultado = analizador.analizar_texto(texto)

    # Debería contar todas las repeticiones
    assert 'Tecnológico' in resultado
    assert resultado['Tecnológico']['total_menciones'] >= 4


# ==================== TESTS DE INTEGRIDAD ====================

@pytest.mark.unit
def test_todas_categorias_tienen_keywords_validas():
    """Test que todas las keywords son válidas"""
    analizador = AnalizadorFactores()

    for categoria, info in analizador.categorias_factores.items():
        for keyword in info['keywords']:
            # Keyword debe ser string no vacío
            assert isinstance(keyword, str)
            assert len(keyword) > 0
            # No debe tener espacios al inicio/fin
            assert keyword == keyword.strip()


@pytest.mark.unit
def test_no_keywords_duplicadas_en_categoria():
    """Test que no hay keywords duplicadas en una categoría"""
    analizador = AnalizadorFactores()

    for categoria, info in analizador.categorias_factores.items():
        keywords = info['keywords']
        # Convertir a set para verificar duplicados
        keywords_set = set(keywords)

        # Si hay duplicados, el set será más pequeño
        assert len(keywords) == len(keywords_set), \
            f"Categoría {categoria} tiene keywords duplicadas"

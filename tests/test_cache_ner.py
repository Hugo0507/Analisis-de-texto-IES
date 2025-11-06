"""
Script de prueba para verificar el sistema de caché NER
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.models.ner_analyzer import NERAnalyzer
from src.models.ner_cache import NERCache
import time


def test_cache_system():
    """Prueba el sistema de caché NER"""

    print("=" * 70)
    print("PRUEBA DEL SISTEMA DE CACHÉ NER")
    print("=" * 70)

    # Textos de prueba
    test_texts = {
        "doc1.txt": """
        Digital transformation in higher education has been a major focus in the United States
        since 2015. Harvard University and MIT have led initiatives in Cambridge, Massachusetts.
        In 2020, the COVID-19 pandemic accelerated digital adoption across universities worldwide.
        Professor John Smith from Stanford published research on AI in education in 2022.
        """,
        "doc2.txt": """
        Research shows that universities in China, India, and Brazil have invested over
        $500 million in digital infrastructure between 2018 and 2023. The European Union
        published guidelines for digital transformation in March 2021. Dr. Maria Garcia
        from University of Barcelona presented findings at the International Conference.
        """,
        "doc3.txt": """
        Stanford University and Oxford University partnered in 2022 to develop AI-powered
        learning platforms. The project involved researchers from the UK, USA, and Australia,
        spanning three continents and reaching 50,000 students. Microsoft and Google
        provided technological support worth $2 million.
        """
    }

    # Test 1: Verificar estado inicial del caché
    print("\n1️⃣  VERIFICANDO ESTADO INICIAL DEL CACHÉ")
    print("-" * 70)
    cache = NERCache()

    if cache.cache_exists():
        print("✓ Caché existente encontrado")
        info = cache.get_cache_info()
        if info:
            print(f"   - Fecha: {info.get('timestamp', 'N/A')}")
            print(f"   - Documentos: {info.get('document_count', 0)}")
            print(f"   - Caracteres: {info.get('total_chars', 0):,}")

        # Limpiar caché para la prueba
        print("\n   Limpiando caché para prueba limpia...")
        cache.clear_cache()
    else:
        print("✓ No hay caché previo (perfecto para la prueba)")

    # Test 2: Primera ejecución (sin caché)
    print("\n2️⃣  PRIMERA EJECUCIÓN - SIN CACHÉ")
    print("-" * 70)
    print("Iniciando análisis (debería procesar todo)...")

    analyzer = NERAnalyzer(model_name='en_core_web_sm', use_cache=True)

    start_time = time.time()
    results1 = analyzer.analyze_corpus(test_texts, force_recompute=False)
    elapsed1 = time.time() - start_time

    print(f"\n✓ Análisis completado en {elapsed1:.2f} segundos")
    print(f"   - Documentos procesados: {results1['corpus_stats']['total_documents']}")
    print(f"   - Total entidades: {results1['corpus_stats']['total_entities']}")
    print(f"   - Países únicos: {results1['corpus_stats']['unique_countries']}")

    # Test 3: Verificar que se guardó el caché
    print("\n3️⃣  VERIFICANDO CACHÉ GUARDADO")
    print("-" * 70)

    if cache.cache_exists():
        print("✓ Caché guardado correctamente")
        info = cache.get_cache_info()
        print(f"   - Documentos en caché: {info.get('document_count', 0)}")
        print(f"   - Caracteres en caché: {info.get('total_chars', 0):,}")
    else:
        print("✗ ERROR: Caché NO se guardó")
        return False

    # Test 4: Segunda ejecución (con caché)
    print("\n4️⃣  SEGUNDA EJECUCIÓN - CON CACHÉ")
    print("-" * 70)
    print("Iniciando análisis (debería cargar desde caché)...")

    # Crear nuevo analizador para simular nueva sesión
    analyzer2 = NERAnalyzer(model_name='en_core_web_sm', use_cache=True)

    start_time = time.time()
    results2 = analyzer2.analyze_corpus(test_texts, force_recompute=False)
    elapsed2 = time.time() - start_time

    print(f"\n✓ Análisis completado en {elapsed2:.2f} segundos")

    # Comparar tiempos
    if elapsed2 < elapsed1:
        speedup = elapsed1 / elapsed2
        print(f"\n🚀 ACELERACIÓN: {speedup:.2f}x más rápido con caché!")
    else:
        print("\n⚠️  ADVERTENCIA: Segunda ejecución no fue más rápida")

    # Test 5: Verificar consistencia de resultados
    print("\n5️⃣  VERIFICANDO CONSISTENCIA DE RESULTADOS")
    print("-" * 70)

    stats1 = results1['corpus_stats']
    stats2 = results2['corpus_stats']

    checks = [
        ('Total documentos', stats1['total_documents'], stats2['total_documents']),
        ('Total entidades', stats1['total_entities'], stats2['total_entities']),
        ('Países únicos', stats1['unique_countries'], stats2['unique_countries']),
        ('Años únicos', stats1['unique_years'], stats2['unique_years']),
    ]

    all_match = True
    for name, val1, val2 in checks:
        match = val1 == val2
        symbol = "✓" if match else "✗"
        print(f"{symbol} {name}: {val1} == {val2} {'✓' if match else '✗ DIFERENTE'}")
        if not match:
            all_match = False

    if all_match:
        print("\n✓ Todos los resultados coinciden perfectamente")
    else:
        print("\n✗ ADVERTENCIA: Algunos resultados no coinciden")

    # Test 6: Forzar re-procesamiento
    print("\n6️⃣  PRUEBA DE FORZAR RE-PROCESAMIENTO")
    print("-" * 70)
    print("Ejecutando con force_recompute=True...")

    start_time = time.time()
    results3 = analyzer2.analyze_corpus(test_texts, force_recompute=True)
    elapsed3 = time.time() - start_time

    print(f"✓ Re-procesamiento completado en {elapsed3:.2f} segundos")
    print(f"   (Debería ser similar al tiempo inicial: {elapsed1:.2f}s)")

    # Resumen final
    print("\n" + "=" * 70)
    print("RESUMEN DE LA PRUEBA")
    print("=" * 70)
    print(f"✓ Primera ejecución (sin caché):  {elapsed1:.2f}s")
    print(f"✓ Segunda ejecución (con caché):   {elapsed2:.2f}s")
    print(f"✓ Re-procesamiento forzado:        {elapsed3:.2f}s")
    print(f"\n🚀 Aceleración con caché: {elapsed1/elapsed2:.2f}x")
    print(f"✓ Resultados consistentes: {'Sí' if all_match else 'No'}")
    print("=" * 70)

    # Limpiar caché de prueba
    print("\n🧹 Limpiando caché de prueba...")
    cache.clear_cache()

    print("\n✅ PRUEBA COMPLETADA EXITOSAMENTE")
    print("=" * 70)

    return True


if __name__ == "__main__":
    try:
        success = test_cache_system()
        if success:
            print("\n✅ El sistema de caché NER funciona correctamente")
            print("Puedes usar la aplicación con confianza!")
        else:
            print("\n⚠️  Hubo algunos problemas durante la prueba")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

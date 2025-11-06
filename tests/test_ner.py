"""
Script de prueba para verificar el funcionamiento del módulo NER
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.models.ner_analyzer import NERAnalyzer

def test_ner_analyzer():
    """Prueba básica del analizador NER"""

    print("=" * 60)
    print("PRUEBA DEL ANALIZADOR NER")
    print("=" * 60)

    # Inicializar analizador
    print("\n1. Inicializando analizador NER...")
    analyzer = NERAnalyzer(model_name='en_core_web_sm')
    print("   OK - Analizador inicializado")

    # Texto de prueba sobre transformación digital en educación
    test_texts = {
        "doc1.txt": """
        Digital transformation in higher education has been a major focus in the United States
        since 2015. Harvard University and MIT have led initiatives in Cambridge, Massachusetts.
        In 2020, the COVID-19 pandemic accelerated digital adoption across universities worldwide.
        """,
        "doc2.txt": """
        Research shows that universities in China, India, and Brazil have invested over
        $500 million in digital infrastructure between 2018 and 2023. The European Union
        published guidelines for digital transformation in March 2021.
        """,
        "doc3.txt": """
        Stanford University and Oxford University partnered in 2022 to develop AI-powered
        learning platforms. The project involved researchers from the UK, USA, and Australia,
        spanning three continents and reaching 50,000 students.
        """
    }

    # Análisis del corpus
    print("\n2. Analizando corpus de prueba...")
    corpus_analysis = analyzer.analyze_corpus(test_texts)
    print(f"   OK - {corpus_analysis['corpus_stats']['total_documents']} documentos analizados")

    # Insights geográficos
    print("\n3. Generando insights geográficos...")
    geo_insights = analyzer.get_geographical_insights(corpus_analysis)
    print(f"   OK - {geo_insights['total_countries_analyzed']} países identificados")
    print(f"\n   Top 5 países:")
    for country, count in geo_insights['top_countries'][:5]:
        print(f"      - {country}: {count} menciones")

    # Insights temporales
    print("\n4. Generando insights temporales...")
    temp_insights = analyzer.get_temporal_insights(corpus_analysis)
    if 'message' not in temp_insights:
        print(f"   OK - {temp_insights['unique_years']} años únicos identificados")
        print(f"   Rango: {temp_insights['year_range'][0]} - {temp_insights['year_range'][1]}")
        print(f"\n   Top 5 años:")
        for year, count in temp_insights['top_years'][:5]:
            print(f"      - {year}: {count} menciones")
    else:
        print(f"   {temp_insights['message']}")

    # Entidades por categoría
    print("\n5. Analizando entidades por categoría...")
    top_entities = corpus_analysis['top_entities_by_category']
    print(f"   OK - {len(top_entities)} categorías de entidades encontradas")

    for category, entities in sorted(top_entities.items(),
                                     key=lambda x: sum(c for _, c in x[1]),
                                     reverse=True)[:5]:
        total = sum(c for _, c in entities)
        print(f"\n   {category}: {total} menciones totales")
        for entity, count in entities[:3]:
            print(f"      - {entity}: {count}")

    print("\n" + "=" * 60)
    print("PRUEBA COMPLETADA EXITOSAMENTE")
    print("=" * 60)
    print("\nEl módulo NER está funcionando correctamente.")
    print("Puedes ejecutar la aplicación Streamlit con: streamlit run app.py")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_ner_analyzer()
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()

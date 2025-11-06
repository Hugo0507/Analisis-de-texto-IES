"""
Script de prueba para verificar la optimización de NLTK
Comprueba que no se descarguen recursos innecesariamente
"""

import time
import sys
import os

# Agregar src al path
sys.path.insert(0, os.path.dirname(__file__))

from src.text_preprocessor import TextPreprocessor

print("=" * 60)
print("TEST DE OPTIMIZACIÓN NLTK")
print("=" * 60)

# Test 1: Primera instanciación
print("\n1. Primera instanciación de TextPreprocessor...")
start = time.time()
preprocessor1 = TextPreprocessor(language='english')
tiempo1 = time.time() - start
print(f"   Tiempo: {tiempo1:.3f}s")

# Test 2: Segunda instanciación (debería ser MUCHO más rápida)
print("\n2. Segunda instanciación de TextPreprocessor...")
start = time.time()
preprocessor2 = TextPreprocessor(language='english')
tiempo2 = time.time() - start
print(f"   Tiempo: {tiempo2:.3f}s")

# Test 3: Tercera instanciación
print("\n3. Tercera instanciación de TextPreprocessor...")
start = time.time()
preprocessor3 = TextPreprocessor(language='english')
tiempo3 = time.time() - start
print(f"   Tiempo: {tiempo3:.3f}s")

# Análisis
print("\n" + "=" * 60)
print("RESULTADOS:")
print("=" * 60)
print(f"Primera instanciación:  {tiempo1:.3f}s")
print(f"Segunda instanciación:  {tiempo2:.3f}s")
print(f"Tercera instanciación:  {tiempo3:.3f}s")

if tiempo2 < tiempo1 / 2 and tiempo3 < tiempo1 / 2:
    print("\n✅ OPTIMIZACIÓN EXITOSA!")
    print("   Las instanciaciones 2 y 3 son significativamente más rápidas.")
    print("   Los recursos NLTK se están reutilizando correctamente.")
else:
    print("\n⚠️  ADVERTENCIA:")
    print("   No se detectó mejora significativa de performance.")
    print("   Esto puede ser normal si los recursos ya estaban instalados.")

print("\n" + "=" * 60)
print("Verificando recursos NLTK disponibles:")
print("=" * 60)

import nltk

recursos = ['punkt', 'stopwords', 'punkt_tab', 'wordnet', 'omw-1.4']
for recurso in recursos:
    try:
        # Intentar encontrar el recurso
        if recurso == 'punkt':
            nltk.data.find('tokenizers/punkt')
        elif recurso == 'stopwords':
            nltk.data.find('corpora/stopwords')
        elif recurso == 'punkt_tab':
            nltk.data.find('tokenizers/punkt_tab')
        elif recurso == 'wordnet':
            nltk.data.find('corpora/wordnet')
        elif recurso == 'omw-1.4':
            nltk.data.find('corpora/omw-1.4')
        print(f"✓ {recurso:15s} - Instalado")
    except LookupError:
        print(f"✗ {recurso:15s} - NO instalado")

print("\n" + "=" * 60)
print("Test completado!")
print("=" * 60)

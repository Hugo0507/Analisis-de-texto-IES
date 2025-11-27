"""
Script para agregar botones de retorno al Dashboard en todas las páginas
"""
import os
import re

# Páginas que necesitan el botón
pages_to_update = [
    r"components\pages\estadisticas_archivos\estadisticas_archivos_ui.py",
    r"components\pages\deteccion_idiomas\deteccion_idiomas_ui.py",
    r"components\pages\conversion_txt\conversion_txt_ui.py",
    r"components\pages\preprocesamiento\preprocesamiento_ui.py",
    r"components\pages\analisis_factores\analisis_factores_ui.py",
    r"components\pages\consolidacion_factores\consolidacion_factores_ui.py",
    r"components\pages\visualizaciones\visualizaciones_ui.py",
    r"components\pages\nube_palabras\nube_palabras_ui.py",
    r"components\pages\evaluacion_desempeno\evaluacion_desempeno_ui.py",
    r"components\pages\models\topic_modeling\topic_modeling_page_ui.py",
    r"components\pages\models\bertopic\bertopic_page_ui.py",
    r"components\pages\models\dimensionality_reduction\dimensionality_reduction_page_ui.py",
    r"components\pages\models\classification\classification_page_ui.py",
    r"components\pages\models\ngram_analysis\ngram_analysis_page_ui.py",
]

def add_return_button_to_file(filepath):
    """Agrega el botón de retorno a un archivo si no lo tiene"""

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Verificar si ya tiene el botón
    if 'show_return_to_dashboard_button' in content:
        print(f"[OK] {filepath} - Ya tiene el boton")
        return False

    # Verificar si ya importa show_return_to_dashboard_button
    if 'from components.ui.helpers import' in content:
        # Agregar a import existente
        content = re.sub(
            r'from components\.ui\.helpers import ([^\n]+)',
            r'from components.ui.helpers import \1, show_return_to_dashboard_button',
            content
        )
    else:
        # Agregar nuevo import después de otros imports
        insert_pos = content.find('def render():')
        if insert_pos == -1:
            print(f"[ERROR] {filepath} - No se encontro def render()")
            return False

        # Insertar import antes de def render()
        before = content[:insert_pos]
        after = content[insert_pos:]
        content = before + 'from components.ui.helpers import show_return_to_dashboard_button\n\n' + after

    # Agregar llamada al botón al final del archivo (antes del último newline)
    content = content.rstrip()
    content += '\n\n    # Botón de retorno al Dashboard Principal\n'
    content += '    show_return_to_dashboard_button()\n'

    # Guardar archivo
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"[OK] {filepath} - Boton agregado")
    return True

if __name__ == "__main__":
    print("Agregando botones de retorno al Dashboard...\n")

    updated = 0
    for page in pages_to_update:
        if os.path.exists(page):
            if add_return_button_to_file(page):
                updated += 1
        else:
            print(f"[ERROR] {page} - No existe")

    print(f"\n[DONE] Proceso completado: {updated} archivos actualizados")

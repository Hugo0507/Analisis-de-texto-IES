"""
Script para agregar botones de retorno al Dashboard en TODAS las páginas UI
"""
import os
import re

# Páginas que necesitan el botón
pages_to_update = [
    r"components\pages\bolsa_palabras\bolsa_palabras_ui.py",
    r"components\pages\analisis_tfidf\analisis_tfidf_ui.py",
    r"components\pages\analisis_factores\analisis_factores_ui.py",
    r"components\pages\consolidacion_factores\consolidacion_factores_ui.py",
    r"components\pages\visualizaciones\visualizaciones_ui.py",
    r"components\pages\estadisticas_archivos\estadisticas_archivos_ui.py",
    r"components\pages\evaluacion_desempeno\evaluacion_desempeno_ui.py",
    r"components\pages\nube_palabras\nube_palabras_ui.py",
    r"components\pages\models\bertopic\bertopic_page_ui.py",
    r"components\pages\models\classification\classification_page_ui.py",
    r"components\pages\models\dimensionality_reduction\dimensionality_reduction_page_ui.py",
    r"components\pages\models\ngram_analysis\ngram_analysis_page_ui.py",
    r"components\pages\models\topic_modeling\topic_modeling_page_ui.py",
]

def add_return_button_to_file(filepath):
    """Agrega el botón de retorno a un archivo si no lo tiene"""

    if not os.path.exists(filepath):
        print(f"[ERROR] {filepath} - No existe")
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Verificar si ya tiene el botón
    if 'show_return_to_dashboard_button' in content:
        print(f"[OK] {filepath} - Ya tiene el boton")
        return False

    # Verificar si ya importa show_return_to_dashboard_button
    needs_import = 'show_return_to_dashboard_button' not in content

    if needs_import:
        # Buscar línea de import de helpers
        helper_import_pattern = r'from components\.ui\.helpers import (.+)'
        helper_match = re.search(helper_import_pattern, content)

        if helper_match:
            # Agregar a import existente
            current_imports = helper_match.group(1)
            if 'show_return_to_dashboard_button' not in current_imports:
                new_imports = current_imports.strip() + ', show_return_to_dashboard_button'
                content = re.sub(
                    helper_import_pattern,
                    f'from components.ui.helpers import {new_imports}',
                    content
                )
                print(f"  -> Import agregado a linea existente")
        else:
            # Agregar nuevo import después de otros imports
            # Buscar la última línea de import
            import_lines = [i for i, line in enumerate(content.split('\n')) if line.strip().startswith('import ') or line.strip().startswith('from ')]
            if import_lines:
                last_import_idx = max(import_lines)
                lines = content.split('\n')
                lines.insert(last_import_idx + 1, 'from components.ui.helpers import show_return_to_dashboard_button')
                content = '\n'.join(lines)
                print(f"  -> Import agregado como nueva linea")
            else:
                # Insertar al inicio del archivo después del docstring
                lines = content.split('\n')
                insert_idx = 0
                # Saltar docstring inicial si existe
                if lines and ('"""' in lines[0] or "'''" in lines[0]):
                    for i in range(1, len(lines)):
                        if '"""' in lines[i] or "'''" in lines[i]:
                            insert_idx = i + 1
                            break
                lines.insert(insert_idx, '\nfrom components.ui.helpers import show_return_to_dashboard_button')
                content = '\n'.join(lines)
                print(f"  -> Import agregado al inicio")

    # Agregar llamadas al botón en returns tempranos
    # Buscar patrones de return temprano (sin el botón)
    early_return_patterns = [
        (r'(\s+)(st\.info\([^)]+\))\n(\s+)(st\.markdown\([^)]+\))\n(\s+)(return)', r'\1\2\n\3\4\n\5show_return_to_dashboard_button()\n\5return'),
        (r'(\s+)(st\.warning\([^)]+\))\n(\s+)(return)', r'\1\2\n\1show_return_to_dashboard_button()\n\3return'),
        (r'(\s+)(st\.error\([^)]+\))\n(\s+)(return)', r'\1\2\n\1show_return_to_dashboard_button()\n\3return'),
    ]

    for pattern, replacement in early_return_patterns:
        content = re.sub(pattern, replacement, content)

    # Agregar llamada al final del archivo (antes del último newline) si no existe
    if not content.rstrip().endswith('show_return_to_dashboard_button()'):
        # Encontrar la última línea con código (no vacía)
        lines = content.rstrip().split('\n')

        # Si la última línea no es show_return_to_dashboard_button(), agregarla
        if lines and 'show_return_to_dashboard_button' not in lines[-1]:
            # Detectar indentación de la última línea con código
            last_code_line = None
            for line in reversed(lines):
                if line.strip() and not line.strip().startswith('#'):
                    last_code_line = line
                    break

            if last_code_line:
                # Detectar indentación base (usualmente 4 espacios)
                base_indent = len(last_code_line) - len(last_code_line.lstrip())
                indent = ' ' * base_indent
            else:
                indent = '    '  # Default 4 espacios

            # Agregar al final
            content = content.rstrip() + '\n\n' + indent + '# Botón de retorno al Dashboard Principal\n'
            content += indent + 'show_return_to_dashboard_button()\n'
            print(f"  -> Boton agregado al final")

    # Guardar archivo
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"[OK] {filepath} - Boton agregado")
    return True

if __name__ == "__main__":
    print("Agregando botones de retorno al Dashboard...\\n")

    updated = 0
    for page in pages_to_update:
        if os.path.exists(page):
            if add_return_button_to_file(page):
                updated += 1
        else:
            print(f"[ERROR] {page} - No existe")

    print(f"\\n[DONE] Proceso completado: {updated} archivos actualizados")

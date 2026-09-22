"""
Acceso al PDF de un archivo del dataset.
"""

import os
import tempfile
from contextlib import contextmanager


@contextmanager
def pdf_local(archivo):
    """
    Dejar el PDF en disco mientras dura el bloque y devolver su ruta.

    Los archivos que vienen de Google Drive guardan en `file_path` una ruta
    `drive://…` que no existe en el servidor; el contenido real está en
    `file_content` (la copia en la base de datos, que sobrevive a los reinicios
    del Space). Se escribe en un temporal que se borra al salir del bloque.

    Devuelve None si no hay copia en la base de datos ni un fichero local: quien
    llama sigue con lo que no necesita el PDF (título por nombre, CrossRef).
    """
    contenido = archivo.file_content
    if contenido:
        descriptor, ruta = tempfile.mkstemp(suffix='.pdf')
        try:
            with os.fdopen(descriptor, 'wb') as salida:
                salida.write(bytes(contenido))
            yield ruta
        finally:
            try:
                os.remove(ruta)
            except OSError:
                pass
        return

    ruta = archivo.file_path
    if ruta and not ruta.startswith('drive://') and os.path.exists(ruta):
        yield ruta
    else:
        yield None

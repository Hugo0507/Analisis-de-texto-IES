"""
Funciones auxiliares para la interfaz de usuario
"""

import streamlit as st


def show_section_header(title, description):
    """
    Muestra el encabezado estándar de una sección

    Args:
        title (str): Título de la sección
        description (str): Descripción de la sección
    """
    st.markdown(f'<div class="section-title">{title}</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="section-description">{description}</div>', unsafe_allow_html=True)


def get_connector():
    """
    Obtiene el conector de Google Drive desde session_state

    Returns:
        GoogleDriveConnector or None: Conector de Drive o None si no está disponible
    """
    if 'drive_connector' in st.session_state:
        return st.session_state.drive_connector
    return None


def get_or_load_cached_results(folder_name, results_filename,
                               expected_count=None, source_files=None,
                               validate_file_ids=True, config=None):
    """
    Verifica si existen resultados guardados en Drive y los carga
    con validación completa de archivos (cantidad e IDs) y configuración

    Args:
        folder_name: Nombre de la carpeta (ej: "02_Language_Detection")
        results_filename: Nombre del archivo JSON
        expected_count: Número esperado de archivos procesados (opcional)
        source_files: Lista de archivos fuente para validar (opcional)
        validate_file_ids: Si True, valida que los IDs coincidan (default)
        config: Diccionario de configuración para validar (opcional)

    Returns:
        tuple: (results_dict or None, folder_id or None)
        - Si encuentra cache válido: (resultados, folder_id)
        - Si no encuentra o es inválido: (None, folder_id or None)
    """
    if not st.session_state.parent_folder_id:
        return None, None

    connector = get_connector()
    if not connector:
        return None, None

    # Buscar carpeta de persistencia
    folder = connector.get_or_create_folder(
        st.session_state.parent_folder_id, folder_name)

    if not folder:
        return None, None

    # Buscar archivo de resultados
    results_file = connector.find_file_in_folder(folder, results_filename)

    if results_file:
        # Cargar resultados desde JSON
        results = connector.read_json_file(results_file['id'])

        if results:
            # Validar configuración si se especificó
            if config is not None:
                cached_config = results.get('config', {})
                if cached_config:
                    # Comparar parámetros clave
                    config_mismatch = False
                    mismatched_params = []

                    for key, value in config.items():
                        cached_value = cached_config.get(key)
                        if cached_value is not None and cached_value != value:
                            config_mismatch = True
                            mismatched_params.append(f"{key}: {cached_value} → {value}")

                    if config_mismatch:
                        st.warning(
                            f"⚠️ Configuración cambió, recalculando...\n"
                            f"Parámetros diferentes: {', '.join(mismatched_params)}"
                        )
                        return None, folder
            # Validar cantidad de archivos si se especificó
            if expected_count is not None:
                cached_count = results.get('total_files', 0)
                if cached_count != expected_count:
                    st.warning(
                        f"⚠️ Cache invalidado: se esperaban {expected_count} "
                        f"archivos pero el cache tiene {cached_count}"
                    )
                    return None, folder

            # Validar contra archivos fuente si se especificaron
            if source_files is not None:
                cached_count = results.get('total_files', 0)
                if cached_count != len(source_files):
                    st.warning(
                        f"⚠️ Cache invalidado: hay {len(source_files)} "
                        f"archivos fuente pero el cache tiene {cached_count}"
                    )
                    return None, folder

                # Validar IDs de archivos si se solicitó
                if validate_file_ids:
                    # Extraer IDs de los archivos fuente
                    source_ids = {f.get('id') for f in source_files
                                  if 'id' in f}

                    # Extraer IDs de los archivos en cache
                    cached_files = results.get('files', [])
                    cached_ids = {f.get('file_id') for f in cached_files
                                  if 'file_id' in f}

                    # Verificar si hay archivos diferentes
                    if source_ids != cached_ids:
                        missing_in_cache = source_ids - cached_ids
                        extra_in_cache = cached_ids - source_ids

                        warning_msg = "⚠️ Cache invalidado: "
                        if missing_in_cache:
                            warning_msg += (
                                f"{len(missing_in_cache)} archivo(s) "
                                f"nuevo(s) no están en cache"
                            )
                        if extra_in_cache:
                            if missing_in_cache:
                                warning_msg += " y "
                            warning_msg += (
                                f"{len(extra_in_cache)} archivo(s) en "
                                f"cache ya no existen"
                            )

                        st.warning(warning_msg)
                        return None, folder

            return results, folder

    return None, folder


def load_results_from_cache(folder_id, results_filename):
    """
    Carga resultados desde un archivo JSON en Drive (función simplificada)

    Args:
        folder_id: ID de la carpeta desde donde cargar
        results_filename: Nombre del archivo JSON

    Returns:
        dict con resultados o None si no existe
    """
    connector = get_connector()
    if not connector or not folder_id:
        return None

    try:
        # Buscar archivo
        results_file = connector.find_file_in_folder(folder_id, results_filename)

        if results_file:
            # Cargar resultados desde JSON
            results = connector.read_json_file(results_file['id'])
            return results

        return None

    except Exception as e:
        print(f"Error cargando resultados desde cache: {e}")
        return None


def save_results_to_cache(folder_id, results_filename, results_data):
    """
    Guarda resultados en archivo JSON en Drive

    Args:
        folder_id: ID de la carpeta donde guardar
        results_filename: Nombre del archivo JSON
        results_data: Datos a guardar (dict)

    Returns:
        file_id or None
    """
    connector = get_connector()
    if not connector:
        return None

    return connector.create_json_file(folder_id, results_filename, results_data)


def check_folder_has_files(folder_id, expected_count=None,
                           file_extension=None):
    """
    Verifica si una carpeta tiene archivos y opcionalmente valida la cantidad

    Args:
        folder_id: ID de la carpeta a verificar
        expected_count: Número esperado de archivos (opcional)
        file_extension: Extensión de archivos a contar (ej: '.txt', '.pdf')

    Returns:
        dict con:
            - has_files (bool): Si tiene archivos
            - count (int): Cantidad de archivos
            - valid (bool): Si cumple con expected_count (True si no se validó)
            - files (list): Lista de archivos encontrados
    """
    connector = get_connector()
    if not connector or not folder_id:
        return {
            'has_files': False,
            'count': 0,
            'valid': False,
            'files': []
        }

    # Listar archivos en la carpeta
    files = connector.list_files_in_folder(folder_id, recursive=False)

    # Filtrar por extensión si se especificó
    if file_extension:
        files = [f for f in files
                 if f['name'].lower().endswith(file_extension.lower())]

    count = len(files)
    has_files = count > 0

    # Validar cantidad si se especificó
    valid = True
    if expected_count is not None:
        valid = (count == expected_count)

    return {
        'has_files': has_files,
        'count': count,
        'valid': valid,
        'files': files
    }


def save_pickle_to_drive(folder_id, filename, data):
    """
    Guarda datos en formato pickle en Drive

    Args:
        folder_id: ID de la carpeta donde guardar
        filename: Nombre del archivo (sin extensión, se añadirá .pkl)
        data: Datos a guardar (cualquier objeto serializable)

    Returns:
        file_id or None
    """
    import pickle
    import io

    connector = get_connector()
    if not connector:
        return None

    try:
        # Serializar a pickle
        buffer = io.BytesIO()
        pickle.dump(data, buffer)
        buffer.seek(0)

        # Asegurar extensión .pkl
        if not filename.endswith('.pkl'):
            filename += '.pkl'

        # Subir a Drive
        file_id = connector.upload_file(folder_id, filename, buffer.getvalue(), 'application/octet-stream')
        return file_id

    except Exception as e:
        print(f"Error guardando pickle en Drive: {e}")
        return None


def load_pickle_from_drive(folder_id, filename):
    """
    Carga datos en formato pickle desde Drive

    Args:
        folder_id: ID de la carpeta
        filename: Nombre del archivo pickle

    Returns:
        datos deserializados o None
    """
    import pickle
    import io

    connector = get_connector()
    if not connector:
        return None

    try:
        # Buscar archivo
        file_info = connector.find_file_in_folder(folder_id, filename)
        if not file_info:
            return None

        # Descargar contenido
        content = connector.download_file(file_info['id'])
        if not content:
            return None

        # Deserializar
        buffer = io.BytesIO(content)
        data = pickle.load(buffer)
        return data

    except Exception as e:
        print(f"Error cargando pickle desde Drive: {e}")
        return None


def save_csv_to_drive(folder_id, filename, dataframe):
    """
    Guarda DataFrame como CSV en Drive

    Args:
        folder_id: ID de la carpeta donde guardar
        filename: Nombre del archivo (sin extensión, se añadirá .csv)
        dataframe: pandas DataFrame a guardar

    Returns:
        file_id or None
    """
    import io

    connector = get_connector()
    if not connector:
        return None

    try:
        # Asegurar extensión .csv
        if not filename.endswith('.csv'):
            filename += '.csv'

        # Convertir a CSV
        csv_buffer = io.StringIO()
        dataframe.to_csv(csv_buffer, index=False, encoding='utf-8')
        csv_content = csv_buffer.getvalue().encode('utf-8')

        # Subir a Drive
        file_id = connector.upload_file(folder_id, filename, csv_content, 'text/csv')
        return file_id

    except Exception as e:
        print(f"Error guardando CSV en Drive: {e}")
        return None


def load_csv_from_drive(folder_id, filename):
    """
    Carga CSV desde Drive como DataFrame

    Args:
        folder_id: ID de la carpeta
        filename: Nombre del archivo CSV

    Returns:
        pandas DataFrame o None
    """
    import pandas as pd
    import io

    connector = get_connector()
    if not connector:
        return None

    try:
        # Buscar archivo
        file_info = connector.find_file_in_folder(folder_id, filename)
        if not file_info:
            return None

        # Descargar contenido
        content = connector.download_file(file_info['id'])
        if not content:
            return None

        # Leer CSV
        csv_string = content.decode('utf-8')
        df = pd.read_csv(io.StringIO(csv_string))
        return df

    except Exception as e:
        print(f"Error cargando CSV desde Drive: {e}")
        return None


def upload_folder_to_drive(parent_folder_id, local_folder_path, drive_folder_name):
    """
    Sube una carpeta local completa a Drive

    Args:
        parent_folder_id: ID de la carpeta padre en Drive
        local_folder_path: Ruta local de la carpeta a subir
        drive_folder_name: Nombre de la carpeta en Drive

    Returns:
        folder_id or None
    """
    import os
    from pathlib import Path

    connector = get_connector()
    if not connector:
        return None

    try:
        local_path = Path(local_folder_path)
        if not local_path.exists():
            print(f"Carpeta local no existe: {local_folder_path}")
            return None

        # Crear carpeta en Drive
        folder_id = connector.get_or_create_folder(parent_folder_id, drive_folder_name)

        # Subir todos los archivos
        for file_path in local_path.rglob('*'):
            if file_path.is_file():
                with open(file_path, 'rb') as f:
                    content = f.read()

                # Determinar mime type básico
                mime_type = 'application/octet-stream'
                if file_path.suffix == '.json':
                    mime_type = 'application/json'
                elif file_path.suffix in ['.txt', '.csv']:
                    mime_type = 'text/plain'

                connector.upload_file(folder_id, file_path.name, content, mime_type)

        return folder_id

    except Exception as e:
        print(f"Error subiendo carpeta a Drive: {e}")
        return None


def download_folder_from_drive(folder_id, local_folder_path):
    """
    Descarga una carpeta completa desde Drive

    Args:
        folder_id: ID de la carpeta en Drive
        local_folder_path: Ruta local donde guardar

    Returns:
        True si exitoso
    """
    import os
    from pathlib import Path

    connector = get_connector()
    if not connector:
        return False

    try:
        local_path = Path(local_folder_path)
        local_path.mkdir(parents=True, exist_ok=True)

        # Listar archivos en la carpeta de Drive
        files = connector.list_files_in_folder(folder_id, recursive=False)

        # Descargar cada archivo
        for file_info in files:
            content = connector.download_file(file_info['id'])
            if content:
                file_path = local_path / file_info['name']
                with open(file_path, 'wb') as f:
                    f.write(content)

        return True

    except Exception as e:
        print(f"Error descargando carpeta desde Drive: {e}")
        return False

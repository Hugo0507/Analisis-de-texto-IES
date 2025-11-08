"""
Módulo de Lógica - Estadísticas de Archivos
Funciones de procesamiento de datos sin dependencias de Streamlit
"""

import pandas as pd
from typing import Dict, List, Any


def prepare_directory_data(stats: Dict[str, Any]) -> pd.DataFrame:
    """
    Prepara datos de directorios para visualización

    Args:
        stats: Diccionario de estadísticas de archivos

    Returns:
        DataFrame con columnas 'Directorio' y 'Cantidad'
    """
    dir_data = pd.DataFrame([
        {'Directorio': d if d else '/', 'Cantidad': c}
        for d, c in stats['by_directory'].items()
    ]).sort_values('Cantidad', ascending=False)

    return dir_data


def prepare_extension_data(stats: Dict[str, Any]) -> pd.DataFrame:
    """
    Prepara datos de extensiones para visualización

    Args:
        stats: Diccionario de estadísticas de archivos

    Returns:
        DataFrame con columnas 'Extensión' y 'Cantidad'
    """
    ext_data = pd.DataFrame([
        {'Extensión': e, 'Cantidad': c}
        for e, c in stats['by_extension'].items()
    ]).sort_values('Cantidad', ascending=False)

    return ext_data


def filter_files_dataframe(
    df: pd.DataFrame,
    filter_ext: List[str] = None,
    filter_dir: List[str] = None,
    search: str = None
) -> pd.DataFrame:
    """
    Filtra dataframe de archivos según criterios

    Args:
        df: DataFrame de archivos
        filter_ext: Lista de extensiones para filtrar
        filter_dir: Lista de directorios para filtrar
        search: Texto para buscar en nombres

    Returns:
        DataFrame filtrado
    """
    df_filtered = df.copy()

    if filter_ext:
        df_filtered = df_filtered[df_filtered['Extensión'].isin(filter_ext)]

    if filter_dir:
        df_filtered = df_filtered[df_filtered['Directorio'].isin(filter_dir)]

    if search:
        df_filtered = df_filtered[df_filtered['Nombre'].str.contains(search, case=False, na=False)]

    return df_filtered


def get_top_n_extensions(ext_data: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    """
    Obtiene las top N extensiones

    Args:
        ext_data: DataFrame de extensiones
        n: Número de extensiones a retornar

    Returns:
        DataFrame con top N extensiones
    """
    return ext_data.head(n)

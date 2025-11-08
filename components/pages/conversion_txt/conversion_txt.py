"""
Módulo de Lógica - Conversión a TXT
Funciones de procesamiento de datos sin dependencias de Streamlit
"""

import pandas as pd
from typing import Dict, List, Any, Tuple


def filter_successful_conversions(results: List[Dict]) -> List[Dict]:
    """
    Filtra conversiones exitosas

    Args:
        results: Lista de resultados de conversión

    Returns:
        Lista de conversiones exitosas
    """
    return [r for r in results if r.get('success', False)]


def filter_failed_conversions(results: List[Dict]) -> List[Dict]:
    """
    Filtra conversiones fallidas

    Args:
        results: Lista de resultados de conversión

    Returns:
        Lista de conversiones fallidas
    """
    return [r for r in results if not r.get('success', False)]


def calculate_conversion_stats(results: List[Dict]) -> Dict[str, Any]:
    """
    Calcula estadísticas de conversión

    Args:
        results: Lista de resultados de conversión

    Returns:
        Diccionario con estadísticas
    """
    successful = filter_successful_conversions(results)
    failed = filter_failed_conversions(results)

    success_rate = (len(successful) / len(results) * 100) if results else 0

    return {
        'total': len(results),
        'successful': len(successful),
        'failed': len(failed),
        'success_rate': success_rate
    }


def prepare_conversion_distribution_df(stats: Dict[str, Any]) -> pd.DataFrame:
    """
    Prepara DataFrame para gráfico de distribución de conversión

    Args:
        stats: Diccionario de estadísticas

    Returns:
        DataFrame con columnas 'Estado' y 'Cantidad'
    """
    return pd.DataFrame([
        {'Estado': 'Exitosos', 'Cantidad': stats['successful']},
        {'Estado': 'Fallidos', 'Cantidad': stats['failed']}
    ])


def calculate_text_length_stats(successful: List[Dict]) -> Dict[str, Any]:
    """
    Calcula estadísticas de longitud de texto

    Args:
        successful: Lista de conversiones exitosas

    Returns:
        Diccionario con estadísticas de longitud
    """
    if not successful:
        return {
            'average': 0,
            'min': 0,
            'max': 0,
            'total': 0
        }

    lengths = [r.get('text_length', 0) for r in successful]

    return {
        'average': sum(lengths) / len(lengths),
        'min': min(lengths),
        'max': max(lengths),
        'total': sum(lengths)
    }


def prepare_text_stats_df(text_stats: Dict[str, Any]) -> pd.DataFrame:
    """
    Prepara DataFrame de estadísticas de texto

    Args:
        text_stats: Diccionario con estadísticas de longitud

    Returns:
        DataFrame con métricas y caracteres
    """
    return pd.DataFrame({
        'Métrica': ['Promedio', 'Mínimo', 'Máximo', 'Total'],
        'Caracteres': [
            f"{text_stats['average']:,.0f}",
            f"{text_stats['min']:,.0f}",
            f"{text_stats['max']:,.0f}",
            f"{text_stats['total']:,.0f}"
        ]
    })


def prepare_detail_dataframe(results: List[Dict]) -> pd.DataFrame:
    """
    Prepara DataFrame detallado de conversión

    Args:
        results: Lista de resultados de conversión

    Returns:
        DataFrame con detalle por archivo
    """
    return pd.DataFrame([
        {
            'Archivo': r['file'],
            'Estado': '✓ Exitoso' if r['success'] else '✗ Fallido',
            'Longitud Texto': f"{r['text_length']:,}" if r['success'] else '-',
            'Error': r.get('error', '-') if not r['success'] else '-'
        }
        for r in results
    ])


def prepare_failed_dataframe(failed: List[Dict]) -> pd.DataFrame:
    """
    Prepara DataFrame de archivos fallidos

    Args:
        failed: Lista de conversiones fallidas

    Returns:
        DataFrame con archivos y errores
    """
    return pd.DataFrame([
        {
            'Archivo': r['file'],
            'Error': r.get('error', 'Desconocido')
        }
        for r in failed
    ])


def prepare_txt_files_dataframe(txt_files: List[Dict]) -> pd.DataFrame:
    """
    Prepara DataFrame de archivos TXT guardados

    Args:
        txt_files: Lista de archivos TXT guardados

    Returns:
        DataFrame con archivos e IDs
    """
    return pd.DataFrame([
        {
            'Archivo': f['name'],
            'ID en Drive': f['id'][:30] + '...' if len(f['id']) > 30 else f['id']
        }
        for f in txt_files
    ])


def extract_txt_files_from_results(results: List[Dict]) -> List[Dict]:
    """
    Extrae información de archivos TXT desde resultados de conversión

    Args:
        results: Lista de resultados de conversión

    Returns:
        Lista de diccionarios con información de archivos TXT
    """
    txt_files = []
    for result in results:
        if result.get('success'):
            txt_files.append({
                'name': result['file'].replace('.pdf', '.txt'),
                'id': result.get('file_id', ''),
                'length': result.get('text_length', 0)
            })
    return txt_files


def prepare_cache_data(conversion_results: List[Dict]) -> Dict[str, Any]:
    """
    Prepara datos para guardar en cache

    Args:
        conversion_results: Lista de resultados de conversión

    Returns:
        Diccionario con datos de cache
    """
    stats = calculate_conversion_stats(conversion_results)

    return {
        'total_files': stats['total'],
        'successful': stats['successful'],
        'failed': stats['failed'],
        'files': conversion_results
    }

import pandas as pd
from typing import Dict, List, Any


def prepare_directory_data(stats: Dict[str, Any]) -> pd.DataFrame:

    dir_data = pd.DataFrame([
        {'Directorio': d if d else '/', 'Cantidad': c}
        for d, c in stats['by_directory'].items()
    ]).sort_values('Cantidad', ascending=False)

    return dir_data


def prepare_extension_data(stats: Dict[str, Any]) -> pd.DataFrame:
   
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
    
    df_filtered = df.copy()

    if filter_ext:
        df_filtered = df_filtered[df_filtered['Extensión'].isin(filter_ext)]

    if filter_dir:
        df_filtered = df_filtered[df_filtered['Directorio'].isin(filter_dir)]

    if search:
        df_filtered = df_filtered[df_filtered['Nombre'].str.contains(search, case=False, na=False)]

    return df_filtered


def get_top_n_extensions(ext_data: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    
    return ext_data.head(n)

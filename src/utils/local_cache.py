"""
Módulo de Caché Local Genérico
Sistema de caché local para diferentes módulos del análisis
"""

import os
import pickle
import json
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path


class LocalCache:
    """Gestor de caché local genérico"""

    def __init__(self, cache_name: str):
        """
        Inicializa el gestor de caché

        Args:
            cache_name: Nombre identificador del caché (ej: 'preprocessing', 'bow', 'tfidf')
        """
        self.cache_name = cache_name
        self.cache_folder = f"{cache_name}_cache"
        self.metadata_file = f"{cache_name}_metadata.json"
        self.results_file = f"{cache_name}_results.pkl"

    def _get_cache_path(self, filename: str) -> str:
        """Obtiene la ruta local del archivo de caché"""
        cache_dir = Path("cache") / self.cache_folder
        cache_dir.mkdir(parents=True, exist_ok=True)
        return str(cache_dir / filename)

    def _compute_config_hash(self, config: Dict[str, Any]) -> str:
        """
        Calcula un hash de la configuración para validación

        Args:
            config: Diccionario de configuración

        Returns:
            Hash MD5 de la configuración
        """
        # Ordenar claves para consistencia
        config_str = json.dumps(config, sort_keys=True)
        return hashlib.md5(config_str.encode()).hexdigest()

    def save(self,
             results: Any,
             config: Dict[str, Any],
             metadata: Dict[str, Any] = None) -> bool:
        """
        Guarda resultados en caché local

        Args:
            results: Resultados a guardar (cualquier objeto serializable)
            config: Configuración usada para generar los resultados
            metadata: Metadatos adicionales

        Returns:
            True si se guardó correctamente
        """
        try:
            # Preparar metadatos
            meta = {
                'timestamp': datetime.now().isoformat(),
                'config': config,
                'config_hash': self._compute_config_hash(config),
                'cache_name': self.cache_name,
                'version': '1.0'
            }

            if metadata:
                meta.update(metadata)

            # Guardar metadatos
            metadata_path = self._get_cache_path(self.metadata_file)
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(meta, f, indent=2, ensure_ascii=False)

            # Guardar resultados completos
            results_path = self._get_cache_path(self.results_file)
            with open(results_path, 'wb') as f:
                pickle.dump(results, f)

            print(f"✓ {self.cache_name.capitalize()} guardado en caché local")
            print(f"  - Ubicación: {Path(metadata_path).parent}")

            return True

        except Exception as e:
            print(f"✗ Error al guardar caché de {self.cache_name}: {str(e)}")
            return False

    def load(self, config: Dict[str, Any] = None) -> Optional[Any]:
        """
        Carga resultados desde caché local

        Args:
            config: Configuración actual (para validar que coincida)

        Returns:
            Resultados cargados o None si no existe o no coincide
        """
        try:
            metadata_path = self._get_cache_path(self.metadata_file)
            results_path = self._get_cache_path(self.results_file)

            # Verificar que existan los archivos
            if not os.path.exists(metadata_path) or not os.path.exists(results_path):
                return None

            # Cargar metadatos
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)

            # Validar configuración si se proporcionó
            if config is not None:
                cached_config_hash = metadata.get('config_hash')
                current_config_hash = self._compute_config_hash(config)

                if cached_config_hash != current_config_hash:
                    print(f"⚠️ Caché de {self.cache_name} invalidado: configuración diferente")
                    print(f"   Cached config: {metadata.get('config')}")
                    print(f"   Current config: {config}")
                    return None

            # Cargar resultados
            with open(results_path, 'rb') as f:
                results = pickle.load(f)

            print(f"✓ {self.cache_name.capitalize()} cargado desde caché")
            print(f"  - Fecha: {metadata.get('timestamp', 'Desconocida')}")
            if 'document_count' in metadata:
                print(f"  - Documentos: {metadata['document_count']}")

            # Agregar metadatos a los resultados si es un dict
            if isinstance(results, dict):
                results['cache_metadata'] = metadata

            return results

        except Exception as e:
            print(f"✗ Error al cargar caché de {self.cache_name}: {str(e)}")
            return None

    def exists(self, config: Dict[str, Any] = None) -> bool:
        """
        Verifica si existe un caché válido

        Args:
            config: Configuración para validar (opcional)

        Returns:
            True si existe caché válido
        """
        metadata_path = self._get_cache_path(self.metadata_file)
        results_path = self._get_cache_path(self.results_file)

        if not os.path.exists(metadata_path) or not os.path.exists(results_path):
            return False

        try:
            # Verificar que los archivos sean válidos
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)

            # Validar configuración si se proporcionó
            if config is not None:
                cached_config_hash = metadata.get('config_hash')
                current_config_hash = self._compute_config_hash(config)
                if cached_config_hash != current_config_hash:
                    return False

            with open(results_path, 'rb') as f:
                pickle.load(f)

            return True
        except:
            return False

    def get_info(self) -> Optional[Dict[str, Any]]:
        """
        Obtiene información del caché sin cargar los resultados completos

        Returns:
            Diccionario con metadatos o None si no existe
        """
        try:
            metadata_path = self._get_cache_path(self.metadata_file)

            if not os.path.exists(metadata_path):
                return None

            with open(metadata_path, 'r', encoding='utf-8') as f:
                return json.load(f)

        except Exception as e:
            print(f"✗ Error al obtener info de caché de {self.cache_name}: {str(e)}")
            return None

    def clear(self) -> bool:
        """
        Elimina el caché existente

        Returns:
            True si se eliminó correctamente
        """
        try:
            metadata_path = self._get_cache_path(self.metadata_file)
            results_path = self._get_cache_path(self.results_file)

            if os.path.exists(metadata_path):
                os.remove(metadata_path)
            if os.path.exists(results_path):
                os.remove(results_path)

            print(f"✓ Caché de {self.cache_name} eliminado correctamente")
            return True

        except Exception as e:
            print(f"✗ Error al eliminar caché de {self.cache_name}: {str(e)}")
            return False

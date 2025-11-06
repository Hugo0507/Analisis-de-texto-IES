"""
Módulo de Science Mapping y Knowledge Landscape
Genera visualizaciones de red de conocimiento y mapas de relaciones entre factores
"""

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, List, Tuple, Any, Optional
from collections import defaultdict
from src.utils.logger import get_logger

logger = get_logger(__name__)


class ScienceMapper:
    """
    Genera visualizaciones de science mapping:
    - Redes de co-ocurrencia de términos
    - Knowledge landscapes
    - Mapas de relaciones entre factores
    - Análisis de centralidad
    """

    def __init__(self):
        """Inicializa el generador de science mapping"""
        logger.info("Inicializando ScienceMapper")
        self.network_data = None
        self.centrality_scores = None

    def build_cooccurrence_network(
        self,
        cooccurrence_matrix: pd.DataFrame,
        min_cooccurrence: int = 5,
        top_n_nodes: int = 50
    ) -> Dict[str, Any]:
        """
        Construye red de co-ocurrencia de términos

        Args:
            cooccurrence_matrix: Matriz de co-ocurrencia
            min_cooccurrence: Mínimo número de co-ocurrencias para crear edge
            top_n_nodes: Número máximo de nodos

        Returns:
            Diccionario con estructura de red (nodes, edges)
        """
        logger.info("Construyendo red de co-ocurrencia...")

        # Filtrar términos top
        term_importance = cooccurrence_matrix.sum(axis=1).sort_values(ascending=False)
        top_terms = term_importance.head(top_n_nodes).index.tolist()

        # Filtrar matriz
        filtered_matrix = cooccurrence_matrix.loc[top_terms, top_terms]

        # Crear nodos
        nodes = []
        for term in top_terms:
            node = {
                'id': term,
                'label': term,
                'size': float(term_importance[term]),
                'degree': int((filtered_matrix.loc[term] > min_cooccurrence).sum())
            }
            nodes.append(node)

        # Crear edges
        edges = []
        edge_set = set()  # Para evitar duplicados

        for i, term1 in enumerate(top_terms):
            for j, term2 in enumerate(top_terms):
                if i < j:  # Solo mitad superior de la matriz
                    weight = filtered_matrix.loc[term1, term2]
                    if weight >= min_cooccurrence:
                        edge_key = tuple(sorted([term1, term2]))
                        if edge_key not in edge_set:
                            edge = {
                                'source': term1,
                                'target': term2,
                                'weight': float(weight)
                            }
                            edges.append(edge)
                            edge_set.add(edge_key)

        network = {
            'nodes': nodes,
            'edges': edges,
            'n_nodes': len(nodes),
            'n_edges': len(edges)
        }

        logger.info(f"Red construida: {len(nodes)} nodos, {len(edges)} edges")
        return network

    def calculate_network_metrics(self, network: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcula métricas de centralidad de la red

        Args:
            network: Estructura de red (nodes, edges)

        Returns:
            Diccionario con métricas de centralidad
        """
        logger.info("Calculando métricas de red...")

        try:
            import networkx as nx

            # Crear grafo NetworkX
            G = nx.Graph()

            # Agregar nodos
            for node in network['nodes']:
                G.add_node(node['id'], **node)

            # Agregar edges
            for edge in network['edges']:
                G.add_edge(edge['source'], edge['target'], weight=edge['weight'])

            # Calcular centralidades
            degree_centrality = nx.degree_centrality(G)
            betweenness_centrality = nx.betweenness_centrality(G, weight='weight')
            closeness_centrality = nx.closeness_centrality(G, distance='weight')

            try:
                eigenvector_centrality = nx.eigenvector_centrality(G, weight='weight', max_iter=1000)
            except:
                eigenvector_centrality = {node: 0.0 for node in G.nodes()}

            # Detectar comunidades
            try:
                communities = nx.community.greedy_modularity_communities(G, weight='weight')
                community_map = {}
                for i, community in enumerate(communities):
                    for node in community:
                        community_map[node] = i
            except:
                community_map = {node: 0 for node in G.nodes()}

            metrics = {
                'degree_centrality': degree_centrality,
                'betweenness_centrality': betweenness_centrality,
                'closeness_centrality': closeness_centrality,
                'eigenvector_centrality': eigenvector_centrality,
                'communities': community_map,
                'n_communities': len(set(community_map.values())),
                'density': nx.density(G),
                'avg_clustering': nx.average_clustering(G, weight='weight')
            }

            logger.info(f"Métricas calculadas: {metrics['n_communities']} comunidades")
            return metrics

        except ImportError:
            logger.warning("NetworkX no disponible, usando métricas básicas")
            return self._calculate_basic_metrics(network)

    def _calculate_basic_metrics(self, network: Dict[str, Any]) -> Dict[str, Any]:
        """Calcula métricas básicas sin NetworkX"""
        # Calcular degree simple
        degree_count = defaultdict(int)
        for edge in network['edges']:
            degree_count[edge['source']] += 1
            degree_count[edge['target']] += 1

        # Normalizar
        max_degree = max(degree_count.values()) if degree_count else 1
        degree_centrality = {
            node: degree_count[node] / max_degree
            for node in [n['id'] for n in network['nodes']]
        }

        return {
            'degree_centrality': degree_centrality,
            'betweenness_centrality': {},
            'closeness_centrality': {},
            'eigenvector_centrality': {},
            'communities': {},
            'n_communities': 0,
            'density': 0.0,
            'avg_clustering': 0.0
        }

    def create_network_visualization(
        self,
        network: Dict[str, Any],
        metrics: Optional[Dict[str, Any]] = None,
        layout: str = 'force',
        color_by: str = 'community',
        title: str = "Red de Co-ocurrencia de Factores"
    ) -> go.Figure:
        """
        Crea visualización interactiva de la red

        Args:
            network: Estructura de red
            metrics: Métricas de centralidad (opcional)
            layout: Tipo de layout ('force', 'circular', 'spring')
            color_by: Atributo para colorear nodos ('community', 'degree', 'centrality')
            title: Título del gráfico

        Returns:
            Figura Plotly
        """
        logger.info("Creando visualización de red...")

        try:
            import networkx as nx

            # Crear grafo
            G = nx.Graph()
            for node in network['nodes']:
                G.add_node(node['id'], **node)
            for edge in network['edges']:
                G.add_edge(edge['source'], edge['target'], weight=edge['weight'])

            # Calcular layout
            if layout == 'spring':
                pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
            elif layout == 'circular':
                pos = nx.circular_layout(G)
            else:  # force
                pos = nx.kamada_kawai_layout(G)

        except ImportError:
            logger.warning("NetworkX no disponible, usando layout aleatorio")
            pos = self._random_layout(network['nodes'])

        # Preparar datos para plotly
        edge_trace = self._create_edge_trace(network['edges'], pos)
        node_trace = self._create_node_trace(network['nodes'], pos, metrics, color_by)

        # Crear figura
        fig = go.Figure(
            data=[edge_trace, node_trace],
            layout=go.Layout(
                title=title,
                showlegend=False,
                hovermode='closest',
                margin=dict(b=0, l=0, r=0, t=40),
                xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                height=800
            )
        )

        logger.info("Visualización de red creada")
        return fig

    def _random_layout(self, nodes: List[Dict]) -> Dict[str, Tuple[float, float]]:
        """Genera layout aleatorio para nodos"""
        import random
        random.seed(42)
        return {
            node['id']: (random.random(), random.random())
            for node in nodes
        }

    def _create_edge_trace(
        self,
        edges: List[Dict],
        pos: Dict[str, Tuple[float, float]]
    ) -> go.Scatter:
        """Crea trace de edges para plotly"""
        edge_x = []
        edge_y = []

        for edge in edges:
            x0, y0 = pos.get(edge['source'], (0, 0))
            x1, y1 = pos.get(edge['target'], (0, 0))
            edge_x.extend([x0, x1, None])
            edge_y.extend([y0, y1, None])

        return go.Scatter(
            x=edge_x,
            y=edge_y,
            line=dict(width=0.5, color='#888'),
            hoverinfo='none',
            mode='lines'
        )

    def _create_node_trace(
        self,
        nodes: List[Dict],
        pos: Dict[str, Tuple[float, float]],
        metrics: Optional[Dict[str, Any]],
        color_by: str
    ) -> go.Scatter:
        """Crea trace de nodos para plotly"""
        node_x = []
        node_y = []
        node_text = []
        node_size = []
        node_color = []

        for node in nodes:
            x, y = pos.get(node['id'], (0, 0))
            node_x.append(x)
            node_y.append(y)
            node_text.append(node['label'])

            # Tamaño basado en degree
            size = min(50, max(10, node.get('degree', 1) * 5))
            node_size.append(size)

            # Color
            if metrics and color_by == 'community':
                color = metrics['communities'].get(node['id'], 0)
            elif metrics and color_by == 'degree':
                color = metrics['degree_centrality'].get(node['id'], 0)
            else:
                color = node.get('size', 1)

            node_color.append(color)

        return go.Scatter(
            x=node_x,
            y=node_y,
            mode='markers+text',
            text=node_text,
            textposition='top center',
            textfont=dict(size=10),
            marker=dict(
                size=node_size,
                color=node_color,
                colorscale='Viridis',
                showscale=True,
                colorbar=dict(
                    title="Comunidad" if color_by == 'community' else "Centralidad",
                    thickness=15,
                    len=0.7
                ),
                line=dict(width=2, color='white')
            ),
            hoverinfo='text',
            hovertext=node_text
        )

    def create_factor_landscape(
        self,
        factors_df: pd.DataFrame,
        metrics: Optional[Dict[str, Any]] = None,
        top_n: int = 100
    ) -> go.Figure:
        """
        Crea landscape de factores (mapa de conocimiento)

        Args:
            factors_df: DataFrame de factores
            metrics: Métricas de centralidad
            top_n: Número de factores a mostrar

        Returns:
            Figura Plotly con landscape
        """
        logger.info("Creando factor landscape...")

        # Seleccionar top factores
        top_factors = factors_df.head(top_n).copy()

        # Si hay métricas, agregar centralidad
        if metrics and 'degree_centrality' in metrics:
            top_factors['centrality'] = top_factors['term'].map(
                metrics['degree_centrality']
            ).fillna(0)
            top_factors['community'] = top_factors['term'].map(
                metrics.get('communities', {})
            ).fillna(0)
        else:
            top_factors['centrality'] = 0
            top_factors['community'] = 0

        # Crear visualización de burbujas
        fig = px.scatter(
            top_factors,
            x='avg_weight',
            y='frequency',
            size='total_weight',
            color='community' if 'community' in top_factors.columns else 'main_type',
            hover_name='term',
            hover_data={
                'total_weight': ':.2f',
                'avg_weight': ':.2f',
                'frequency': True,
                'source_count': True,
                'centrality': ':.3f' if 'centrality' in top_factors.columns else False
            },
            title="Landscape de Factores Relevantes en Transformación Digital",
            labels={
                'avg_weight': 'Peso Promedio (Relevancia)',
                'frequency': 'Frecuencia de Aparición',
                'total_weight': 'Peso Total',
                'community': 'Comunidad',
                'main_type': 'Tipo de Factor'
            },
            height=700
        )

        fig.update_traces(
            textposition='top center',
            marker=dict(line=dict(width=1, color='white'))
        )

        logger.info("Factor landscape creado")
        return fig

    def create_centrality_comparison(
        self,
        metrics: Dict[str, Any],
        top_n: int = 20
    ) -> go.Figure:
        """
        Crea gráfico comparativo de métricas de centralidad

        Args:
            metrics: Métricas de centralidad
            top_n: Número de términos top a mostrar

        Returns:
            Figura Plotly
        """
        logger.info("Creando comparación de centralidad...")

        # Extraer top términos por degree centrality
        degree_cent = metrics.get('degree_centrality', {})
        top_terms = sorted(degree_cent.items(), key=lambda x: x[1], reverse=True)[:top_n]
        terms = [t[0] for t in top_terms]

        # Preparar datos
        centrality_types = ['degree_centrality', 'betweenness_centrality', 'closeness_centrality']
        data = []

        for cent_type in centrality_types:
            if cent_type in metrics and metrics[cent_type]:
                values = [metrics[cent_type].get(term, 0) for term in terms]
                data.append(go.Bar(
                    name=cent_type.replace('_', ' ').title(),
                    x=terms,
                    y=values
                ))

        fig = go.Figure(data=data)
        fig.update_layout(
            title=f"Comparación de Métricas de Centralidad (Top {top_n})",
            xaxis_title="Factor",
            yaxis_title="Centralidad",
            barmode='group',
            height=600,
            xaxis={'tickangle': -45}
        )

        logger.info("Comparación de centralidad creada")
        return fig

    def create_community_sunburst(
        self,
        factors_df: pd.DataFrame,
        metrics: Dict[str, Any],
        max_factors: int = 50
    ) -> go.Figure:
        """
        Crea diagrama sunburst de comunidades de factores

        Args:
            factors_df: DataFrame de factores
            metrics: Métricas con información de comunidades
            max_factors: Máximo de factores a mostrar

        Returns:
            Figura Plotly sunburst
        """
        logger.info("Creando sunburst de comunidades...")

        if 'communities' not in metrics or not metrics['communities']:
            logger.warning("No hay información de comunidades")
            return go.Figure()

        # Preparar datos
        community_map = metrics['communities']
        factors_subset = factors_df.head(max_factors).copy()
        factors_subset['community'] = factors_subset['term'].map(community_map).fillna(-1)

        # Crear datos jerárquicos
        sunburst_data = []
        for _, row in factors_subset.iterrows():
            sunburst_data.append({
                'labels': row['term'],
                'parents': f"Comunidad {int(row['community'])}",
                'values': row['total_weight']
            })

        # Agregar comunidades como padres
        for comm_id in set(factors_subset['community']):
            if comm_id >= 0:
                sunburst_data.append({
                    'labels': f"Comunidad {int(comm_id)}",
                    'parents': "Factores",
                    'values': factors_subset[factors_subset['community'] == comm_id]['total_weight'].sum()
                })

        # Raíz
        sunburst_data.append({
            'labels': "Factores",
            'parents': "",
            'values': factors_subset['total_weight'].sum()
        })

        df_sunburst = pd.DataFrame(sunburst_data)

        fig = go.Figure(go.Sunburst(
            labels=df_sunburst['labels'],
            parents=df_sunburst['parents'],
            values=df_sunburst['values'],
            branchvalues="total",
        ))

        fig.update_layout(
            title="Comunidades de Factores Relacionados",
            height=700
        )

        logger.info("Sunburst de comunidades creado")
        return fig

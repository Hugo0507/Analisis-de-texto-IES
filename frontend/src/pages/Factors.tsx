/**
 * Factor Analysis Page
 *
 * Displays factor analysis results with 8 categories and network graph.
 */

import React, { useState } from 'react';
import { MetricCard } from '../components/molecules';
import { Button, Badge } from '../components/atoms';
import { BarChartViz, NetworkGraphViz } from '../components/organisms';
import { analysisService } from '../services';

const FACTOR_CATEGORIES = [
  { id: 'tecnologico', name: 'Tecnológico', icon: '💻', color: '#3b82f6' },
  { id: 'organizacional', name: 'Organizacional', icon: '🏢', color: '#10b981' },
  { id: 'humano', name: 'Humano', icon: '👥', color: '#f59e0b' },
  { id: 'estrategico', name: 'Estratégico', icon: '🎯', color: '#ef4444' },
  { id: 'financiero', name: 'Financiero', icon: '💰', color: '#8b5cf6' },
  { id: 'pedagogico', name: 'Pedagógico', icon: '📚', color: '#ec4899' },
  { id: 'infraestructura', name: 'Infraestructura', icon: '🏗️', color: '#06b6d4' },
  { id: 'seguridad', name: 'Seguridad', icon: '🔒', color: '#84cc16' },
];

export const Factors: React.FC = () => {
  const [factorData, setFactorData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleAnalyzeFactors = async () => {
    try {
      setIsLoading(true);
      const response = await analysisService.analyzeFactors({
        normalize_by_length: true,
        use_cache: true,
      });

      setFactorData(response);
    } catch (error) {
      console.error('Error analyzing factors:', error);
      alert('Error al analizar factores');
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare bar chart data
  const getFactorChartData = () => {
    if (!factorData || !factorData.global_statistics) {
      return [];
    }

    return factorData.global_statistics.slice(0, 20).map((factor: any) => ({
      id: factor.factor_name,
      label: factor.factor_name,
      value: factor.relevance_score,
    }));
  };

  // Prepare network graph data
  const getNetworkData = () => {
    if (!factorData || !factorData.co_occurrence) {
      return { nodes: [], links: [] };
    }

    const nodes = factorData.global_statistics.slice(0, 15).map((factor: any) => ({
      id: factor.factor_name,
      size: factor.relevance_score * 20,
      color: FACTOR_CATEGORIES.find((c) => c.id === factor.category)?.color || '#6b7280',
    }));

    const links = factorData.co_occurrence.slice(0, 30).map((cooc: any) => ({
      source: cooc.factor1,
      target: cooc.factor2,
      distance: 100 - cooc.correlation * 50,
    }));

    return { nodes, links };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-navy-900 mb-2">
          Análisis de Factores
        </h1>
        <p className="text-gray-600">
          Identificación y análisis de factores de transformación digital (8 categorías)
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button
          variant="primary"
          size="lg"
          onClick={handleAnalyzeFactors}
          isLoading={isLoading}
        >
          {factorData ? 'Reanalizar Factores' : 'Analizar Factores'}
        </Button>

        <div className="text-sm text-gray-600">
          Normalización por longitud de documento: Sí
        </div>
      </div>

      {/* Category Grid */}
      {factorData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {FACTOR_CATEGORIES.map((category) => {
              const categoryStats = factorData.category_statistics[category.id];

              return (
                <div
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all hover:shadow-lg ${
                    selectedCategory === category.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">{category.icon}</span>
                    {selectedCategory === category.id && (
                      <Badge variant="info" size="sm">Seleccionado</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                  {categoryStats && (
                    <div className="text-sm text-gray-600">
                      <p>{categoryStats.factor_count} factores</p>
                      <p>{categoryStats.total_mentions} menciones</p>
                      <p>Relevancia: {categoryStats.avg_relevance.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overall Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Documentos Analizados"
              value={factorData.document_count}
              icon="📄"
              variant="primary"
            />
            <MetricCard
              title="Total de Factores"
              value={factorData.factor_count}
              icon="🎯"
              variant="success"
            />
            <MetricCard
              title="Categorías"
              value={FACTOR_CATEGORIES.length}
              icon="📊"
              variant="default"
            />
          </div>

          {/* Top Factors Chart */}
          <BarChartViz
            data={getFactorChartData()}
            title="Top 20 Factores por Relevancia"
            height={400}
            layout="horizontal"
            colorScheme="category10"
          />

          {/* Network Graph */}
          <NetworkGraphViz
            data={getNetworkData()}
            title="Red de Co-ocurrencia de Factores"
            height={600}
            linkDistance={100}
            repulsivity={15}
          />

          {/* Consolidated Ranking */}
          {factorData.consolidated_ranking && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Ranking Consolidado de Factores
              </h2>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Factor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score Consolidado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {factorData.consolidated_ranking.slice(0, 20).map((item: any) => (
                      <tr key={item.rank} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{item.rank}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.factor_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.consolidated_score.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Cache Info */}
      {factorData && factorData.cached && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <p className="text-sm font-medium text-green-700">
            ✓ Resultados obtenidos desde caché
          </p>
        </div>
      )}

      {/* Empty State */}
      {!factorData && !isLoading && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No hay análisis de factores disponible
          </h3>
          <p className="text-gray-600 mb-4">
            Haz clic en "Analizar Factores" para identificar factores de transformación digital
          </p>
        </div>
      )}
    </div>
  );
};

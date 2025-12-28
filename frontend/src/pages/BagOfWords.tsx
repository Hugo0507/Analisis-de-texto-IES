/**
 * Bag of Words Analysis Page
 *
 * Displays BoW analysis results with visualizations.
 */

import React, { useState } from 'react';
import { MetricCard } from '../components/molecules';
import { Button } from '../components/atoms';
import { BarChartViz } from '../components/organisms';
import { analysisService } from '../services';

export const BagOfWords: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [topTerms, setTopTerms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateBoW = async () => {
    try {
      setIsLoading(true);
      const response = await analysisService.generateBow({
        max_features: 5000,
        min_df: 2,
        max_df: 0.95,
        use_cache: true,
      });

      setMetrics(response);

      // Fetch top terms
      if (response.success) {
        const vocabStats = await analysisService.getVocabularyStats();
        setTopTerms(vocabStats.top_terms.slice(0, 50));
      }
    } catch (error) {
      console.error('Error generating BoW:', error);
      alert('Error al generar Bag of Words');
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = topTerms.map((term) => ({
    id: term.term,
    label: term.term,
    value: term.frequency,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-navy-900 mb-2">
          Bag of Words (BoW)
        </h1>
        <p className="text-gray-600">
          Análisis de frecuencia de términos y construcción de vocabulario
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button
          variant="primary"
          size="lg"
          onClick={handleGenerateBoW}
          isLoading={isLoading}
        >
          {metrics ? 'Regenerar BoW' : 'Generar Bag of Words'}
        </Button>

        <div className="text-sm text-gray-600">
          Max Features: 5000 | Min DF: 2 | Max DF: 0.95
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Documentos Analizados"
            value={metrics.document_count}
            icon="📄"
            variant="primary"
          />
          <MetricCard
            title="Tamaño del Vocabulario"
            value={metrics.vocabulary_size}
            icon="📚"
            variant="success"
          />
          <MetricCard
            title="Esparsidad"
            value={`${(metrics.sparsity * 100).toFixed(2)}%`}
            icon="📊"
            variant="default"
          />
          <MetricCard
            title="Forma de Matriz"
            value={`${metrics.matrix_shape[0]}x${metrics.matrix_shape[1]}`}
            icon="🔢"
            variant="warning"
          />
        </div>
      )}

      {/* Top Terms Chart */}
      {topTerms.length > 0 && (
        <BarChartViz
          data={chartData}
          title="Top 50 Términos Más Frecuentes"
          height={500}
          layout="horizontal"
          colorScheme="nivo"
        />
      )}

      {/* Cache Info */}
      {metrics && metrics.cached && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <p className="text-sm font-medium text-green-700">
            ✓ Resultados obtenidos desde caché ({metrics.cache_source})
          </p>
        </div>
      )}

      {/* Empty State */}
      {!metrics && !isLoading && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No hay análisis BoW disponible
          </h3>
          <p className="text-gray-600 mb-4">
            Haz clic en "Generar Bag of Words" para iniciar el análisis
          </p>
        </div>
      )}
    </div>
  );
};

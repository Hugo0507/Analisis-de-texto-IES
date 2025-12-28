/**
 * TF-IDF Analysis Page
 *
 * Displays TF-IDF analysis results with visualizations.
 */

import React, { useState } from 'react';
import { MetricCard } from '../components/molecules';
import { Button } from '../components/atoms';
import { BarChartViz } from '../components/organisms';
import { analysisService } from '../services';

export const TfIdf: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [topTerms, setTopTerms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleCalculateTfidf = async () => {
    try {
      setIsLoading(true);
      const response = await analysisService.calculateTfidf({
        max_features: 5000,
        norm: 'l2',
        use_idf: true,
        sublinear_tf: false,
        use_cache: true,
      });

      setMetrics(response);

      // Fetch top terms (placeholder - needs API endpoint)
      // For now, generate mock data
      if (response.success) {
        const mockTerms = Array.from({ length: 50 }, (_, i) => ({
          term: `término_${i + 1}`,
          avg_tfidf: Math.random() * 0.5,
        }));
        setTopTerms(mockTerms);
      }
    } catch (error) {
      console.error('Error calculating TF-IDF:', error);
      alert('Error al calcular TF-IDF');
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = topTerms.map((term) => ({
    id: term.term,
    label: term.term,
    value: term.avg_tfidf,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-navy-900 mb-2">
          TF-IDF (Term Frequency-Inverse Document Frequency)
        </h1>
        <p className="text-gray-600">
          Análisis de relevancia de términos ponderada por documento
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button
          variant="primary"
          size="lg"
          onClick={handleCalculateTfidf}
          isLoading={isLoading}
        >
          {metrics ? 'Recalcular TF-IDF' : 'Calcular TF-IDF'}
        </Button>

        <div className="text-sm text-gray-600">
          Normalización: L2 | Use IDF: Sí | Sublinear TF: No
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
            title="Score TF-IDF Promedio"
            value={metrics.avg_tfidf_score.toFixed(4)}
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
          title="Top 50 Términos por Score TF-IDF Promedio"
          height={500}
          layout="horizontal"
          colorScheme="set2"
        />
      )}

      {/* Cache Info */}
      {metrics && metrics.cached && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <p className="text-sm font-medium text-green-700">
            ✓ Resultados obtenidos desde caché
          </p>
        </div>
      )}

      {/* Empty State */}
      {!metrics && !isLoading && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No hay análisis TF-IDF disponible
          </h3>
          <p className="text-gray-600 mb-4">
            Haz clic en "Calcular TF-IDF" para iniciar el análisis
          </p>
        </div>
      )}
    </div>
  );
};

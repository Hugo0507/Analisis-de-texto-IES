/**
 * Statistics Page
 *
 * Corpus statistics and file statistics.
 */

import React, { useState, useEffect } from 'react';
import { MetricCard } from '../components/molecules';
import { BarChartViz } from '../components/organisms';

export const Statistics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock loading
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  // Mock data for demonstration
  const fileTypeData = [
    { id: 'PDF', value: 45 },
    { id: 'DOCX', value: 28 },
    { id: 'TXT', value: 15 },
    { id: 'HTML', value: 12 },
  ];

  const languageData = [
    { id: 'Español', value: 67 },
    { id: 'Inglés', value: 28 },
    { id: 'Portugués', value: 5 },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-navy-900 mb-2">
          Estadísticas del Corpus
        </h1>
        <p className="text-gray-600">
          Análisis estadístico de los documentos y el vocabulario
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Documentos"
          value={100}
          icon="📄"
          variant="primary"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Palabras"
          value="1.2M"
          icon="📝"
          variant="success"
          isLoading={isLoading}
        />
        <MetricCard
          title="Vocabulario Único"
          value="45.3K"
          icon="📚"
          variant="default"
          isLoading={isLoading}
        />
        <MetricCard
          title="Idiomas Detectados"
          value={3}
          icon="🌍"
          variant="warning"
          isLoading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartViz
          data={fileTypeData}
          title="Distribución por Tipo de Archivo"
          height={300}
          colorScheme="category10"
        />

        <BarChartViz
          data={languageData}
          title="Distribución por Idioma"
          height={300}
          colorScheme="set2"
        />
      </div>

      {/* Additional Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Métricas Adicionales
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Promedio de Palabras por Documento</p>
            <p className="text-2xl font-bold text-gray-900">12,450</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Documento Más Largo</p>
            <p className="text-2xl font-bold text-gray-900">45,230 palabras</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Documento Más Corto</p>
            <p className="text-2xl font-bold text-gray-900">2,105 palabras</p>
          </div>
        </div>
      </div>
    </div>
  );
};

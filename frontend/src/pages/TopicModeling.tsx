/**
 * Topic Modeling Page
 *
 * Displays topic modeling results (LDA, NMF, LSA, pLSA) with tabs and visualizations.
 */

import React, { useState } from 'react';
import { MetricCard } from '../components/molecules';
import { Button, Badge } from '../components/atoms';
import { BarChartViz } from '../components/organisms';
import { analysisService } from '../services';

type ModelType = 'lda' | 'nmf' | 'lsa' | 'plsa';

export const TopicModeling: React.FC = () => {
  const [activeModel, setActiveModel] = useState<ModelType>('lda');
  const [models, setModels] = useState<Record<ModelType, any>>({
    lda: null,
    nmf: null,
    lsa: null,
    plsa: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [nTopics, setNTopics] = useState(10);

  const handleTrainModel = async (modelType: ModelType) => {
    try {
      setIsLoading(true);
      const response = await analysisService.trainTopicModel({
        model_type: modelType,
        n_topics: nTopics,
        use_cache: true,
      });

      setModels((prev) => ({
        ...prev,
        [modelType]: response,
      }));
    } catch (error) {
      console.error(`Error training ${modelType}:`, error);
      alert(`Error al entrenar modelo ${modelType.toUpperCase()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentModel = models[activeModel];

  // Prepare chart data for top words per topic
  const getTopicChartData = (topicIndex: number) => {
    if (!currentModel || !currentModel.topics[topicIndex]) {
      return [];
    }

    return currentModel.topics[topicIndex].top_words.map((word: any) => ({
      id: word.word,
      label: word.word,
      value: word.weight,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-navy-900 mb-2">
          Topic Modeling
        </h1>
        <p className="text-gray-600">
          Análisis de temas latentes con LDA, NMF, LSA y pLSA
        </p>
      </div>

      {/* Model Tabs */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex space-x-2 mb-4">
          {(['lda', 'nmf', 'lsa', 'plsa'] as ModelType[]).map((modelType) => (
            <button
              key={modelType}
              onClick={() => setActiveModel(modelType)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeModel === modelType
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {modelType.toUpperCase()}
              {models[modelType] && (
                <Badge variant="success" size="sm" className="ml-2">
                  ✓
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Training Actions */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">
              Número de Tópicos:
            </label>
            <input
              type="number"
              min="2"
              max="50"
              value={nTopics}
              onChange={(e) => setNTopics(parseInt(e.target.value))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => handleTrainModel(activeModel)}
            isLoading={isLoading}
          >
            {models[activeModel] ? 'Reentrenar' : 'Entrenar'} {activeModel.toUpperCase()}
          </Button>
        </div>
      </div>

      {/* Model Metrics */}
      {currentModel && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Número de Tópicos"
              value={currentModel.n_topics}
              icon="🔍"
              variant="primary"
            />
            <MetricCard
              title="Coherencia"
              value={currentModel.coherence?.toFixed(4) || 'N/A'}
              icon="📊"
              variant="success"
            />
            {currentModel.perplexity && (
              <MetricCard
                title="Perplejidad"
                value={currentModel.perplexity.toFixed(2)}
                icon="📈"
                variant="default"
              />
            )}
            {currentModel.reconstruction_error && (
              <MetricCard
                title="Error de Reconstrucción"
                value={currentModel.reconstruction_error.toFixed(4)}
                icon="⚠️"
                variant="warning"
              />
            )}
          </div>

          {/* Topics Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentModel.topics.slice(0, 6).map((topic: any, index: number) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Tópico {index + 1}
                </h3>

                {/* Top Words as Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {topic.top_words.slice(0, 10).map((word: any, idx: number) => (
                    <Badge
                      key={idx}
                      variant="default"
                      size="md"
                    >
                      {word.word} ({word.weight.toFixed(3)})
                    </Badge>
                  ))}
                </div>

                {/* Mini Bar Chart */}
                <BarChartViz
                  data={getTopicChartData(index)}
                  height={200}
                  layout="horizontal"
                  colorScheme="set3"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cache Info */}
      {currentModel && currentModel.cached && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
          <p className="text-sm font-medium text-green-700">
            ✓ Resultados obtenidos desde caché
          </p>
        </div>
      )}

      {/* Empty State */}
      {!currentModel && !isLoading && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No hay modelo {activeModel.toUpperCase()} entrenado
          </h3>
          <p className="text-gray-600 mb-4">
            Haz clic en "Entrenar {activeModel.toUpperCase()}" para comenzar el modelado de temas
          </p>
        </div>
      )}
    </div>
  );
};

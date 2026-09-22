/**
 * ClasificacionDashboard - Dashboard de la etapa 04: Clasificación
 *
 * Muestra el modelo LSTM que aprende a asignar cada documento a un tema
 * (Modelado) o a un factor OE3, y si aprendió algo más allá de adivinar
 * la clase mayoritaria (la línea base).
 */

import React from 'react';
import { StageHeading } from '../molecules';
import { useFilter } from '../../contexts/FilterContext';
import { useClassificationData } from '../../hooks/useClassificationData';
import {
  MetricsSummary,
  BaselineComparison,
  ConfusionMatrixHeatmap,
  ClassF1Bars,
  LossCurveChart,
  RunsHistoryTable,
} from '../organisms/clasificacion';

export const ClasificacionDashboard: React.FC = () => {
  const { filters, setSelectedLstm } = useFilter();
  const { data, isLoading, error, refetch } = useClassificationData();

  if (!filters.selectedDatasetId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-ink-850/50 flex items-center justify-center">
            <svg className="w-10 h-10 text-fog" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Selecciona un Dataset</h3>
          <p className="text-haze text-sm max-w-md">
            Usa el selector de Dataset en el panel lateral izquierdo para visualizar las clasificaciones LSTM.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-stage-cls/30 border-t-stage-cls rounded-full animate-spin" />
          <p className="text-haze text-sm">Cargando clasificaciones…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-stage-lab/10 border border-stage-lab/25 flex items-center justify-center">
            <svg className="w-7 h-7 text-stage-lab" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-haze mb-4">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm font-medium text-paper bg-ink-850 border border-ink-600 rounded-xl hover:bg-ink-800 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hasAnyData = (data?.analyses?.length || 0) > 0;

  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <StageHeading
          stage="cls"
          title="Clasificación"
          subtitle="El modelo LSTM aprende a asignar cada documento a un tema o a un factor OE3."
        />
        <div className="p-10 rounded-2xl bg-ink-900 border border-ink-700">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl border border-ink-700 bg-ink-850 flex items-center justify-center">
              <svg className="w-7 h-7 text-stage-cls" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold text-paper mb-1.5">Aún no hay clasificaciones completadas</h3>
            <p className="text-mist max-w-md mx-auto">
              Entrena un modelo LSTM sobre este dataset desde Administración para verlo aquí.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selected = data?.selected ?? null;

  return (
    <div className="space-y-6">
      <StageHeading
        stage="cls"
        title="Clasificación"
        subtitle="El modelo LSTM aprende a asignar cada documento a un tema (de Modelado) o a un factor OE3. La partición del conjunto de prueba es por documento — sin fuga entre entrenamiento y prueba — y se compara contra la línea base de responder siempre la clase mayoritaria."
      />

      {selected && (
        <>
          <MetricsSummary selected={selected} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BaselineComparison selected={selected} />
            <LossCurveChart lossHistory={selected.loss_history} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ConfusionMatrixHeatmap confusionMatrix={selected.confusion_matrix} classLabels={selected.class_labels} />
            <ClassF1Bars classificationReport={selected.classification_report} />
          </div>
        </>
      )}

      {(data?.analyses.length ?? 0) > 1 && (
        <RunsHistoryTable
          analyses={data!.analyses}
          selectedId={filters.selectedLstmId}
          onSelect={setSelectedLstm}
        />
      )}
    </div>
  );
};

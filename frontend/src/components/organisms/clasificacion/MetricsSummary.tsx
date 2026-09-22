/**
 * Tarjetas de metricas principales: exactitud y F1 macro (por documento),
 * cada una con el delta frente a la linea base, mas documentos/ejemplos y
 * clases. Si el analisis fragmento documentos, una fila secundaria muestra
 * las metricas por fragmento (dato secundario, no comparable con la linea
 * base por documento).
 */

import React from 'react';
import type { LstmAnalysisDetail } from '../../../services/publicLstmService';
import { CompactMetric } from '../modelado/CompactMetric';
import { formatPercent, formatDecimal, formatEntero, formatDeltaPuntos, formatDeltaDecimal } from './format';
import { deltaBadgeClass } from './badges';

export interface MetricsSummaryProps {
  selected: LstmAnalysisDetail;
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({ selected }) => {
  const {
    accuracy, macro_f1, baseline_accuracy, baseline_macro_f1,
    fragment_accuracy, fragment_macro_f1, fragment_words,
    documents_used, samples_used, num_classes,
  } = selected;

  const tieneLineaBase = baseline_accuracy !== null || baseline_macro_f1 !== null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CompactMetric
          label="Exactitud (documento)"
          value={formatPercent(accuracy)}
          badge={formatDeltaPuntos(accuracy, baseline_accuracy)}
          badgeClass={deltaBadgeClass(accuracy, baseline_accuracy)}
        />
        <CompactMetric
          label="F1 macro (documento)"
          value={formatDecimal(macro_f1)}
          badge={formatDeltaDecimal(macro_f1, baseline_macro_f1)}
          badgeClass={deltaBadgeClass(macro_f1, baseline_macro_f1)}
        />
        <CompactMetric
          label="Documentos usados"
          value={formatEntero(documents_used)}
        />
        <CompactMetric
          label="Ejemplos usados"
          value={formatEntero(samples_used ?? documents_used)}
        />
      </div>

      {!tieneLineaBase && (
        <p className="text-xs text-mist">
          Este análisis se creó antes de registrar la línea base: no hay con qué comparar la exactitud ni el F1 macro.
        </p>
      )}

      {fragment_words > 0 && (fragment_accuracy !== null || fragment_macro_f1 !== null) && (
        <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-4">
          <p className="mb-3 text-xs text-mist">
            Métricas por fragmento (dato secundario) — los documentos se partieron en fragmentos de {formatEntero(fragment_words)} palabras.
            Estas cifras no se comparan con la línea base por documento.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <CompactMetric label="Exactitud (fragmento)" value={formatPercent(fragment_accuracy)} />
            <CompactMetric label="F1 macro (fragmento)" value={formatDecimal(fragment_macro_f1)} />
          </div>
        </div>
      )}

      <p className="text-xs text-mist">
        {formatEntero(num_classes)} clases en total. La exactitud y el F1 macro se calculan sobre el conjunto de prueba, particionado por documento (sin fuga entre entrenamiento y prueba).
      </p>
    </div>
  );
};

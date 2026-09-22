/**
 * Comparacion contra la linea base: barras agrupadas de exactitud y F1
 * macro (modelo vs. responder siempre la clase mayoritaria) con un
 * veredicto en texto.
 */

import React from 'react';
import type { LstmAnalysisDetail } from '../../../services/publicLstmService';
import { ChartCard } from '../../molecules';
import { veredictoBaseline } from '../../../utils/lstmMetrics';
import { VEREDICTO_STYLES } from './badges';
import { formatPercent, formatDecimal } from './format';

export interface BaselineComparisonProps {
  selected: LstmAnalysisDetail;
}

const CompareRow: React.FC<{
  label: string;
  modelo: number | null;
  base: number | null;
  formatear: (v: number | null) => string;
}> = ({ label, modelo, base, formatear }) => {
  if (modelo === null || base === null) {
    return (
      <div>
        <p className="mb-1.5 text-sm text-mist">{label}</p>
        <p className="text-xs text-fog">Sin línea base registrada para este análisis.</p>
      </div>
    );
  }
  const modeloPct = Math.max(0, Math.min(100, modelo * 100));
  const basePct = Math.max(0, Math.min(100, base * 100));
  return (
    <div>
      <p className="mb-1.5 text-sm text-mist">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-paper/90">Modelo</span>
          <div className="h-3 flex-1 rounded-full bg-ink-800/70">
            <div className="h-3 rounded-full bg-stage-cls" style={{ width: `${modeloPct}%` }} />
          </div>
          <span className="num w-16 shrink-0 text-right text-xs text-paper">{formatear(modelo)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-mist">Línea base</span>
          <div className="h-3 flex-1 rounded-full bg-ink-800/70">
            <div className="h-3 rounded-full bg-fog/60" style={{ width: `${basePct}%` }} />
          </div>
          <span className="num w-16 shrink-0 text-right text-xs text-mist">{formatear(base)}</span>
        </div>
      </div>
    </div>
  );
};

export const BaselineComparison: React.FC<BaselineComparisonProps> = ({ selected }) => {
  const { accuracy, macro_f1, baseline_accuracy, baseline_macro_f1 } = selected;
  const veredicto = veredictoBaseline(macro_f1, baseline_macro_f1);
  const estilo = VEREDICTO_STYLES[veredicto.tono];

  return (
    <ChartCard
      title="Modelo vs. línea base"
      subtitle="Exactitud y F1 macro por documento — línea base: responder siempre la clase mayoritaria"
      accentColor="cyan"
      size="md"
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      }
    >
      <div className="space-y-4">
        <CompareRow label="Exactitud" modelo={accuracy} base={baseline_accuracy} formatear={(v) => formatPercent(v)} />
        <CompareRow label="F1 macro" modelo={macro_f1} base={baseline_macro_f1} formatear={(v) => formatDecimal(v)} />

        <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${estilo.bg} ${estilo.border}`}>
          <svg className={`mt-0.5 h-4 w-4 shrink-0 ${estilo.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className={`text-sm ${estilo.text}`}>{veredicto.texto}</p>
        </div>

        <p className="text-xs text-mist">
          El F1 macro pesa igual a cada clase, sin importar cuántos documentos tenga: por eso importa más que la exactitud cuando las clases están desbalanceadas, donde acertar solo la clase mayoritaria ya da una exactitud alta.
        </p>
      </div>
    </ChartCard>
  );
};

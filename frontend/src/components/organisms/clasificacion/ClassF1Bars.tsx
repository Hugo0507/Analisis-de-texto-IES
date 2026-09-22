/**
 * F1 por clase: barras horizontales ordenadas de mayor a menor, con el
 * soporte (documentos de prueba) visible. Una clase sin documentos de
 * prueba se marca como tal en vez de mostrarse como F1 = 0.
 */

import React from 'react';
import type { ClassificationEntry } from '../../../services/publicLstmService';
import { ChartCard } from '../../molecules';

export interface ClassF1BarsProps {
  classificationReport: Record<string, ClassificationEntry>;
}

export const ClassF1Bars: React.FC<ClassF1BarsProps> = ({ classificationReport }) => {
  const entradas = Object.entries(classificationReport)
    .filter(([clave]) => !['accuracy', 'macro avg', 'weighted avg'].includes(clave))
    .sort((a, b) => b[1].f1_score - a[1].f1_score);

  if (entradas.length === 0) {
    return (
      <ChartCard title="F1 por clase" subtitle="Por documento" accentColor="emerald" size="lg">
        <div className="flex h-full items-center justify-center text-sm text-mist">Sin reporte de clasificación disponible.</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="F1 por clase"
      subtitle="Ordenadas de mayor a menor — por documento"
      accentColor="emerald"
      size="lg"
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      }
    >
      <div className="space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: '380px' }}>
        {entradas.map(([clase, m]) => {
          const sinSoporte = m.support === 0;
          const barPct = Math.max(0, Math.min(100, m.f1_score * 100));
          return (
            <div key={clase} className="flex items-center gap-2">
              <span className="w-32 shrink-0 truncate text-sm text-haze" title={clase}>{clase}</span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-ink-800/60">
                {!sinSoporte && (
                  <div className="h-full rounded bg-emerald-500/60" style={{ width: `${barPct}%` }} />
                )}
              </div>
              <span className="num w-14 shrink-0 text-right text-sm text-paper">
                {sinSoporte ? '—' : m.f1_score.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
              </span>
              <span className="w-36 shrink-0 text-right text-xs text-mist">
                {sinSoporte ? 'sin documentos de prueba' : `${m.support.toLocaleString('es-ES')} doc. de prueba`}
              </span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
};

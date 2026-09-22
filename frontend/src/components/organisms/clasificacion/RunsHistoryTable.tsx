/**
 * Historial de ejecuciones LSTM completadas del dataset: fecha, etiquetas,
 * fragmentos, exactitud, F1 macro y linea base. Elegir una fila cambia el
 * analisis mostrado en el resto de la seccion — asi se ve, por ejemplo, que
 * una ejecucion vieja con "80% de exactitud" era solo la clase mayoritaria
 * frente a las ejecuciones nuevas que sí registran línea base.
 */

import React from 'react';
import type { LstmAnalysisListItem } from '../../../services/publicLstmService';
import { ChartCard } from '../../molecules';
import { LABEL_MODE_LABELS } from './badges';
import { formatPercent, formatDecimal } from './format';

export interface RunsHistoryTableProps {
  analyses: LstmAnalysisListItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function formatearFecha(iso: string | null): string {
  if (!iso) return '—';
  const t = Date.parse(iso.replace(' ', 'T'));
  if (Number.isNaN(t)) return '—';
  return new Date(t).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const RunsHistoryTable: React.FC<RunsHistoryTableProps> = ({ analyses, selectedId, onSelect }) => {
  return (
    <ChartCard
      title="Historial de ejecuciones"
      subtitle="Todas las clasificaciones LSTM completadas de este dataset — elige una fila para mostrarla arriba"
      accentColor="blue"
      size="md"
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-700 text-left">
              <th scope="col" className="px-3 py-2 font-medium text-mist">Fecha</th>
              <th scope="col" className="px-3 py-2 font-medium text-mist">Análisis</th>
              <th scope="col" className="px-3 py-2 font-medium text-mist">Etiquetas</th>
              <th scope="col" className="px-3 py-2 font-medium text-mist">Fragmentos</th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-mist">Exactitud</th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-mist">F1 macro</th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-mist">Línea base (F1)</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((a) => {
              const activa = a.id === selectedId;
              return (
                <tr
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={activa}
                  aria-label={`Mostrar el análisis ${a.name}`}
                  onClick={() => onSelect(a.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(a.id);
                    }
                  }}
                  className={`cursor-pointer border-b border-ink-800 last:border-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stage-cls/60 ${
                    activa ? 'bg-stage-cls/10' : 'hover:bg-ink-800/60'
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-haze">{formatearFecha(a.processing_completed_at ?? a.created_at)}</td>
                  <td className={`max-w-[220px] truncate px-3 py-2.5 ${activa ? 'font-medium text-paper' : 'text-paper/90'}`} title={a.name}>
                    {a.name}
                    {a.baseline_macro_f1 === null && (
                      <span className="ml-2 rounded border border-fog/30 bg-ink-800 px-1.5 py-0.5 text-[10px] text-mist">sin línea base</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-haze">{LABEL_MODE_LABELS[a.label_mode] ?? a.label_mode}</td>
                  <td className="px-3 py-2.5 text-haze">
                    {a.fragment_words > 0 ? `${a.fragment_words.toLocaleString('es-ES')} palabras` : 'Documento completo'}
                  </td>
                  <td className="num px-3 py-2.5 text-right text-paper">{formatPercent(a.accuracy)}</td>
                  <td className="num px-3 py-2.5 text-right text-paper">{formatDecimal(a.macro_f1)}</td>
                  <td className="num px-3 py-2.5 text-right text-mist">{formatDecimal(a.baseline_macro_f1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
};

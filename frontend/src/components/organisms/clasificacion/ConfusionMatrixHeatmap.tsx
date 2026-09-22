/**
 * Matriz de confusion por documento: filas = clase real, columnas = clase
 * predicha. Conmutador entre conteo y porcentaje normalizado por fila, mas
 * una tabla accesible equivalente (los nombres de eje se truncan; el nombre
 * completo va en la tabla y en el tooltip de cada celda).
 */

import React, { useMemo, useState } from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { ChartCard } from '../../molecules';
import { normalizarFilaMatriz } from '../../../utils/lstmMetrics';
import { acortarEtiqueta } from './format';

export interface ConfusionMatrixHeatmapProps {
  confusionMatrix: number[][];
  classLabels: string[];
}

export const ConfusionMatrixHeatmap: React.FC<ConfusionMatrixHeatmapProps> = ({ confusionMatrix, classLabels }) => {
  const [normalizado, setNormalizado] = useState(true);
  const [verTabla, setVerTabla] = useState(false);

  const matrizMostrada = useMemo(
    () => (normalizado ? normalizarFilaMatriz(confusionMatrix) : confusionMatrix),
    [confusionMatrix, normalizado],
  );

  const heatmapData = useMemo(
    () => matrizMostrada.map((fila, i) => ({
      id: classLabels[i] ?? `Clase ${i}`,
      data: fila.map((valor, j) => ({ x: classLabels[j] ?? `Clase ${j}`, y: valor })),
    })),
    [matrizMostrada, classLabels],
  );

  if (confusionMatrix.length === 0 || classLabels.length === 0) {
    return (
      <ChartCard title="Matriz de confusión" subtitle="Por documento" accentColor="purple" size="lg">
        <div className="flex h-full items-center justify-center text-sm text-mist">Sin matriz de confusión disponible.</div>
      </ChartCard>
    );
  }

  const alturaPx = Math.max(260, classLabels.length * 46 + 110);

  return (
    <ChartCard
      title="Matriz de confusión"
      subtitle="Filas = clase real · columnas = clase predicha (por documento)"
      accentColor="purple"
      size="lg"
      headerExtra={
        <div role="group" aria-label="Unidad de la matriz" className="flex gap-1 rounded-lg bg-ink-800 p-0.5">
          <button
            type="button"
            onClick={() => setNormalizado(true)}
            aria-pressed={normalizado}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${normalizado ? 'bg-ink-700 text-paper' : 'text-mist hover:text-paper'}`}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => setNormalizado(false)}
            aria-pressed={!normalizado}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${!normalizado ? 'bg-ink-700 text-paper' : 'text-mist hover:text-paper'}`}
          >
            Conteo
          </button>
        </div>
      }
    >
      <div style={{ height: `${alturaPx}px` }}>
        <ResponsiveHeatMap
          data={heatmapData}
          margin={{ top: 8, right: 20, bottom: 70, left: 130 }}
          valueFormat=">-.0f"
          axisTop={null}
          axisBottom={{
            tickSize: 4,
            tickRotation: -40,
            format: (v) => acortarEtiqueta(String(v), 14),
            legend: 'Predicho',
            legendOffset: 58,
            legendPosition: 'middle',
          }}
          axisLeft={{
            tickSize: 4,
            format: (v) => acortarEtiqueta(String(v), 16),
            legend: 'Real',
            legendOffset: -118,
            legendPosition: 'middle',
          }}
          colors={{ type: 'sequential', scheme: 'greens' }}
          emptyColor="#111A2D"
          borderRadius={3}
          borderWidth={1}
          borderColor="#1F2A44"
          labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
          theme={{
            text: { fill: '#97A6BE', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
            axis: {
              ticks: { text: { fill: '#7A89A3' } },
              legend: { text: { fill: '#97A6BE' } },
            },
            tooltip: {
              container: {
                background: '#162038',
                color: '#E6ECF5',
                fontSize: 12,
                borderRadius: '10px',
                border: '1px solid #2A3754',
              },
            },
          }}
          tooltip={({ cell }) => (
            <div className="rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-xs text-paper shadow-xl">
              <p className="font-medium">Real: {cell.serieId}</p>
              <p>Predicho: {cell.data.x}</p>
              <p className="mt-1 font-semibold text-purple-300">
                {normalizado
                  ? `${(cell.value ?? 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })}%`
                  : `${(cell.value ?? 0).toLocaleString('es-ES')} documentos`}
              </p>
            </div>
          )}
        />
      </div>

      <button
        type="button"
        onClick={() => setVerTabla((v) => !v)}
        className="mt-2 text-xs font-medium text-mist underline decoration-dotted hover:text-paper"
      >
        {verTabla ? 'Ocultar tabla' : 'Ver como tabla'}
      </button>

      {verTabla && (
        <div className="mt-2 overflow-x-auto rounded-xl border border-ink-700">
          <table className="w-full text-xs">
            <caption className="sr-only">
              Matriz de confusión por documento, {normalizado ? 'en porcentaje por fila' : 'en número de documentos'}.
            </caption>
            <thead>
              <tr className="border-b border-ink-700 bg-ink-850">
                <th scope="col" className="px-3 py-2 text-left font-medium text-mist">Real \ Predicho</th>
                {classLabels.map((label) => (
                  <th key={label} scope="col" className="px-3 py-2 text-right font-medium text-mist">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrizMostrada.map((fila, i) => (
                <tr key={classLabels[i] ?? i} className="border-b border-ink-800 last:border-0">
                  <th scope="row" className="px-3 py-2 text-left font-medium text-paper">{classLabels[i] ?? `Clase ${i}`}</th>
                  {fila.map((valor, j) => (
                    <td key={j} className={`num px-3 py-2 text-right ${i === j ? 'text-stage-cls font-semibold' : 'text-haze'}`}>
                      {normalizado ? `${valor.toLocaleString('es-ES', { maximumFractionDigits: 1 })}%` : valor.toLocaleString('es-ES')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
};

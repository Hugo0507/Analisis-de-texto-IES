/**
 * FactorCooccurrenceGraph
 *
 * Visualización de la red de co-ocurrencia de factores de transformación digital.
 * Usa @nivo/network para renderizar nodos (factores) conectados por aristas
 * cuyo grosor refleja la intensidad de co-ocurrencia.
 *
 * Props:
 *   nodes  – nodos devueltos por GET /api/v1/analysis/factors/cooccurrence-graph/
 *   edges  – aristas del mismo endpoint
 */

import React, { useMemo } from 'react';
import { ResponsiveNetwork } from '@nivo/network';
import { Share2 } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  category: string;
  frequency: number;
  size: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  strength: number;
}

export interface FactorCooccurrenceGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ── Color por categoría (mismo esquema que Factors.tsx) ───────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  tecnologico:     '#3b82f6', // blue-500
  organizacional:  '#8b5cf6', // violet-500
  humano:          '#10b981', // emerald-500
  estrategico:     '#f59e0b', // amber-500
  financiero:      '#22c55e', // green-500
  pedagogico:      '#f43f5e', // rose-500
  infraestructura: '#64748b', // slate-500
  seguridad:       '#ef4444', // red-500
};

const CATEGORY_LABELS: Record<string, string> = {
  tecnologico:     'Tecnológico',
  organizacional:  'Organizacional',
  humano:          'Humano',
  estrategico:     'Estratégico',
  financiero:      'Financiero',
  pedagogico:      'Pedagógico',
  infraestructura: 'Infraestructura',
  seguridad:       'Seguridad',
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? '#94a3b8';
}

// ── Estado vacío ──────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
      <Share2 className="w-7 h-7 text-slate-300" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-600">Sin datos de co-ocurrencia</p>
      <p className="text-xs text-slate-400 mt-1">
        Ejecuta el análisis de factores para generar la red.
      </p>
    </div>
  </div>
);

// ── Leyenda ───────────────────────────────────────────────────────────────────

const Legend: React.FC<{ categories: string[] }> = ({ categories }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
    {categories.map((cat) => (
      <div key={cat} className="flex items-center gap-1.5">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: categoryColor(cat) }}
        />
        <span className="text-xs text-slate-500">{CATEGORY_LABELS[cat] ?? cat}</span>
      </div>
    ))}
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────

export const FactorCooccurrenceGraph: React.FC<FactorCooccurrenceGraphProps> = ({
  nodes,
  edges,
}) => {
  const hasData = nodes.length > 0 && edges.length > 0;

  // Nivo Network espera: nodes con { id, size, color } y links con { source, target, distance }
  const nivoNodes = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        // El label se muestra como tooltip; el id lo usa nivo internamente
        label: n.label,
        size: Math.max(n.size ?? 12, 8),
        color: categoryColor(n.category),
        category: n.category,
      })),
    [nodes]
  );

  const nivoLinks = useMemo(
    () =>
      edges.map((e) => ({
        source: e.source,
        target: e.target,
        // distance inversa: edges fuertes (strength alta) → nodos más cercanos
        distance: Math.max(60, 200 * (1 - (e.strength ?? 0.5))),
        // Se preserva para usarlo en linkThickness vía link.data.strength
        strength: e.strength ?? 0.5,
      })),
    [edges]
  );

  const presentCategories = useMemo(
    () => [...new Set(nodes.map((n) => n.category))],
    [nodes]
  );

  return (
    <div
      className="bg-white p-5 sm:p-6"
      style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
      role="region"
      aria-label="Red de co-ocurrencia de factores"
    >
      {/* Encabezado */}
      <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-violet-500 shrink-0" aria-hidden="true" />
          Red de Co-ocurrencia de Factores
        </h2>
        <span className="text-xs text-slate-400">
          {nodes.length} nodos · {edges.length} conexiones
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Cada nodo es un factor; su tamaño refleja la frecuencia en el corpus. Las aristas
        conectan factores que aparecen juntos en el mismo documento; la distancia entre
        nodos es inversamente proporcional a la intensidad de co-ocurrencia.
      </p>

      {/* Gráfico o estado vacío */}
      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* El div necesita altura fija para que ResponsiveNetwork funcione */}
          <div className="w-full" style={{ height: 420 }} aria-hidden="true">
            <ResponsiveNetwork
              data={{ nodes: nivoNodes, links: nivoLinks }}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              linkDistance={(link: any) => link.distance}
              centeringStrength={0.3}
              repulsivity={6}
              nodeSize={(node: any) => node.size}
              activeNodeSize={(node: any) => node.size * 1.3}
              nodeColor={(node: any) => node.color}
              nodeBorderWidth={1}
              nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
              linkThickness={(link: any) =>
                Math.max(1, (link.data?.strength ?? 0.5) * 3)
              }
              linkColor={{ from: 'source.color', modifiers: [['opacity', 0.3]] }}
              nodeTooltip={({ node }: any) => (
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-md text-xs">
                  <p className="font-semibold text-slate-800">{node.data.label}</p>
                  <p className="text-slate-500 capitalize">{CATEGORY_LABELS[node.data.category] ?? node.data.category}</p>
                </div>
              )}
            />
          </div>

          {/* Leyenda de categorías presentes */}
          <Legend categories={presentCategories} />
        </>
      )}
    </div>
  );
};

export default FactorCooccurrenceGraph;

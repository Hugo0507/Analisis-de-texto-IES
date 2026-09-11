/**
 * Grafo de co-ocurrencia construido desde bigramas.
 */

import React from 'react';
import { ResponsiveNetwork } from '@nivo/network';

export const CooccurrenceGraph: React.FC<{
  nodes: Array<{ id: string; size: number; color: string }>;
  links: Array<{ source: string; target: string; distance: number; thickness: number }>;
  onNodeClick?: (nodeId: string) => void;
  availableConfigs?: string[];
}> = ({ nodes, links, onNodeClick, availableConfigs = [] }) => {
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[320px] gap-4 p-6">
        <div className="w-14 h-14 rounded-full bg-slate-800/50 flex items-center justify-center">
          <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="text-center max-w-sm">
          <p className="text-slate-300 font-medium mb-1">Sin bigramas disponibles</p>
          <p className="text-slate-500 text-sm leading-relaxed">
            El grafo de co-ocurrencia requiere un análisis de N-gramas con <strong className="text-slate-300">bigramas</strong> (rango [2,2] o [1,2]).
          </p>
          {availableConfigs.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 text-left">
              <p className="text-xs text-slate-400 mb-1.5">Configuraciones actuales:</p>
              <div className="flex flex-wrap gap-1.5">
                {availableConfigs.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-300 text-xs font-mono">{c}</span>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">→ Para habilitar el grafo, crea un nuevo análisis de N-gramas incluyendo la configuración <span className="font-mono text-slate-400">[2,2]</span>.</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div style={{ height: '400px' }}>
      <ResponsiveNetwork
        data={{ nodes, links } as any}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        linkDistance={(e: any) => e.distance}
        centeringStrength={0.3}
        repulsivity={8}
        nodeSize={(n: any) => n.size}
        activeNodeSize={(n: any) => n.size * 1.4}
        nodeColor={(n: any) => n.color}
        nodeBorderWidth={1}
        nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] } as any}
        linkThickness={(l: any) => l.thickness}
        motionConfig="gentle"
        onClick={(node: any) => onNodeClick?.(node.id)}
        theme={{
          tooltip: { container: { background: '#1e293b', color: '#f8fafc', fontSize: 12, borderRadius: '8px', border: '1px solid #334155' } },
        }}
      />
    </div>
  );
};

// ─── ComparacionView ──────────────────────────────────────────────────────────

/**
 * Mapa de ciencia del corpus: burbujas de temas por categoria.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { EnrichedTopic, DocumentTopicItem } from './types';
import { CAT_BY_ID, FACTOR_CATEGORIES } from './categories';
import { downloadBlob } from '../../../utils/download';

export const CANVAS_W = 1400;

export const CANVAS_H = 900;

export const CX = 700;

export const CY = 450;

// Panel dimensions (estimados fijos para clamping sin necesitar medir el DOM)

export const PANEL_W = 276;

export const PANEL_H_HOVER = 210;

export const PANEL_H_SELECTED = 390;

export function zoneBubblePositions(
  zoneX: number,
  zoneY: number,
  count: number,
): Array<{ x: number; y: number }> {
  if (count === 0) return [];
  const HUB_R = 48;       // hub circle radius to clear
  const NODE_DIAM = 52;   // minimum center-to-center spacing (node ⌀ ~38 + 14 gap)
  const positions: Array<{ x: number; y: number }> = [];
  let remaining = count;
  let ringR = HUB_R + NODE_DIAM / 2 + 10; // first ring ≈ 84px from zone center
  while (remaining > 0) {
    const maxInRing = Math.max(1, Math.floor((2 * Math.PI * ringR) / NODE_DIAM));
    const n = Math.min(remaining, maxInRing);
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i / n) - Math.PI / 2;
      positions.push({ x: zoneX + Math.cos(angle) * ringR, y: zoneY + Math.sin(angle) * ringR });
    }
    remaining -= n;
    ringR += NODE_DIAM + 8; // next ring clears the previous one
  }
  return positions;
}

export interface ScienceMapProps {
  topics: EnrichedTopic[];
  docTopics: DocumentTopicItem[];
  highlightCategory?: string | null;
}

// ── TopicPanel: panel flotante sobre el contenedor del mapa ──────────────────

export interface TopicPanelProps {
  topic: EnrichedTopic;
  domPos: { left: number; top: number }; // px relativos al contenedor
  mode: 'hover' | 'selected';
  onClose?: () => void;
  docTopics: DocumentTopicItem[];
  containerW: number;
  containerH: number;
}

export const TopicPanel: React.FC<TopicPanelProps> = ({
  topic, domPos, mode, onClose, docTopics, containerW, containerH,
}) => {
  const cat = CAT_BY_ID[topic.categoryId];

  // Clamp position para que el panel no salga del contenedor
  const panelH = mode === 'hover' ? PANEL_H_HOVER : PANEL_H_SELECTED;
  const rawLeft = domPos.left + 24;
  const rawTop  = domPos.top  - 60;
  const left = Math.max(8, Math.min(rawLeft, containerW - PANEL_W - 8));
  const top  = Math.max(8, Math.min(rawTop,  containerH - panelH  - 8));

  const topDocs = useMemo(() =>
    docTopics
      .filter(d => (d.dominant_topic ?? d.topic_id) === topic.id)
      .sort((a, b) => (b.dominant_topic_weight ?? b.topic_weight ?? 0) - (a.dominant_topic_weight ?? a.topic_weight ?? 0))
      .slice(0, 5),
    [docTopics, topic.id]
  );

  const maxWeight = topic.words[0]?.weight ?? 1;
  const sourceLabel = topic.source === 'lda' ? 'LDA' : 'BERTopic';
  const sourceColor = topic.source === 'lda' ? 'text-emerald-300' : 'text-violet-300';
  const sourceBg    = topic.source === 'lda' ? 'bg-emerald-500/15 border-emerald-400/40' : 'bg-violet-500/15 border-violet-400/40';

  return (
    <div
      className={`absolute z-30 rounded-xl border border-ink-600 bg-ink-900 shadow-2xl p-4 ${mode === 'hover' ? 'pointer-events-none' : ''}`}
      style={{ left, top, width: PANEL_W }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-sm font-bold ${cat.textClass} leading-snug flex-1 min-w-0`}>{topic.label}</p>
        {mode === 'selected' && onClose && (
          <button onClick={onClose} aria-label="Cerrar panel"
            className="shrink-0 w-6 h-6 flex items-center justify-center text-mist hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Badges: categoría + fuente + docs */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cat.badgeClass}`}>{cat.shortLabel}</span>
        <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${sourceBg} ${sourceColor}`}>{sourceLabel}</span>
        {topic.numDocuments > 0 && (
          <span className="text-xs text-haze font-medium">{topic.numDocuments} doc{topic.numDocuments !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Términos con barra de peso */}
      <div className="space-y-1.5 mb-3">
        {topic.words.slice(0, mode === 'selected' ? 8 : 5).map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm text-paper w-[90px] truncate shrink-0">{w.word}</span>
            <div className="flex-1 h-1.5 bg-ink-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(w.weight / maxWeight) * 100}%`, backgroundColor: cat.color }} />
            </div>
            <span className="text-xs text-haze w-8 text-right shrink-0 tabular-nums font-medium">
              {(w.weight * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* Documentos representativos (solo en modo selected) */}
      {mode === 'selected' && topDocs.length > 0 && (
        <div className="border-t border-ink-700 pt-3">
          <p className="text-xs font-semibold text-haze mb-2">Documentos representativos</p>
          <ul className="space-y-1.5">
            {topDocs.map((d, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className={`text-sm ${cat.textClass} font-bold shrink-0`}>{i + 1}.</span>
                <span className="text-sm text-paper truncate flex-1" title={d.document_name}>
                  {d.document_name ?? `Doc ${d.document_id}`}
                </span>
                {(d.dominant_topic_weight ?? d.topic_weight) != null && (
                  <span className="text-xs text-haze shrink-0 tabular-nums font-medium ml-auto">
                    {((d.dominant_topic_weight ?? d.topic_weight ?? 0) * 100).toFixed(0)}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ── ScienceMap: mapa SVG con pan + zoom ──────────────────────────────────────

export const ScienceMap: React.FC<ScienceMapProps> = ({ topics, docTopics, highlightCategory }) => {
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interacción interna
  const [hoveredId, setHoveredId]   = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Pan/zoom via viewBox
  const [vb, setVb] = useState({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H });
  const isDragging    = useRef(false);
  const lastMousePx   = useRef({ x: 0, y: 0 });

  // Posiciones de paneles (px relativas al contenedor)
  const [hoveredPanelPos,  setHoveredPanelPos]  = useState<{ left: number; top: number } | null>(null);
  const [selectedPanelPos, setSelectedPanelPos] = useState<{ left: number; top: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });

  const topicsByCategory = useMemo(() => {
    const map: Record<string, EnrichedTopic[]> = {};
    FACTOR_CATEGORIES.forEach(c => { map[c.id] = []; });
    topics.forEach(t => { (map[t.categoryId] ?? map['infraestructura']).push(t); });
    return map;
  }, [topics]);

  // Posiciones SVG pre-calculadas de cada nodo
  const topicPositions = useMemo(() => {
    const pos: Record<number, { x: number; y: number }> = {};
    FACTOR_CATEGORIES.forEach(cat => {
      const catTopics = topicsByCategory[cat.id] ?? [];
      const positions = zoneBubblePositions(cat.zoneX, cat.zoneY, catTopics.length);
      catTopics.forEach((t, i) => { pos[t.id] = positions[i] ?? { x: cat.zoneX, y: cat.zoneY }; });
    });
    return pos;
  }, [topicsByCategory]);

  const totalDocWeight = Math.max(1, topics.reduce((s, t) => s + t.numDocuments, 0));

  // SVG coord → píxeles del contenedor (usa getScreenCTM que respeta viewBox actual)
  const svgToDomPx = useCallback((svgX: number, svgY: number): { left: number; top: number } => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return { left: 0, top: 0 };
    const pt = svg.createSVGPoint();
    pt.x = svgX; pt.y = svgY;
    const screen = pt.matrixTransform(svg.getScreenCTM()!);
    const rect = container.getBoundingClientRect();
    return { left: screen.x - rect.left, top: screen.y - rect.top };
  }, []);

  // Actualizar posición de paneles cuando cambia hover/selección o viewBox
  useEffect(() => {
    if (hoveredId === null) { setHoveredPanelPos(null); return; }
    const pos = topicPositions[hoveredId];
    if (pos) setHoveredPanelPos(svgToDomPx(pos.x, pos.y));
  }, [hoveredId, topicPositions, vb, svgToDomPx]);

  useEffect(() => {
    if (selectedId === null) { setSelectedPanelPos(null); return; }
    const pos = topicPositions[selectedId];
    if (pos) setSelectedPanelPos(svgToDomPx(pos.x, pos.y));
  }, [selectedId, topicPositions, vb, svgToDomPx]);

  // Medir contenedor para clamping de paneles
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const obs = new ResizeObserver(() => setContainerSize({ w: c.clientWidth, h: c.clientHeight }));
    obs.observe(c);
    setContainerSize({ w: c.clientWidth, h: c.clientHeight });
    return () => obs.disconnect();
  }, []);

  // ── Handlers de pan ──────────────────────────────────────────────────────────

  const onSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const tag = (e.target as SVGElement).tagName;
    if (tag === 'svg' || (e.target as SVGElement).getAttribute('data-pannable') === 'true') {
      isDragging.current = true;
      lastMousePx.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePx.current.x;
    const dy = e.clientY - lastMousePx.current.y;
    lastMousePx.current = { x: e.clientX, y: e.clientY };
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Convierte delta de píxel DOM a unidades SVG según zoom actual
    setVb(v => ({
      ...v,
      x: v.x - dx * (v.w / rect.width),
      y: v.y - dy * (v.h / rect.height),
    }));
  }, []);

  const onSvgMouseUp = () => { isDragging.current = false; };

  const onSvgWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.18 : 1 / 1.18;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Punto del ratón en unidades SVG (pivot del zoom)
    const mx = vb.x + (e.clientX - rect.left) / rect.width  * vb.w;
    const my = vb.y + (e.clientY - rect.top)  / rect.height * vb.h;
    setVb(v => {
      const newW = Math.min(CANVAS_W * 3.5, Math.max(CANVAS_W * 0.22, v.w * factor));
      const newH = newW * (CANVAS_H / CANVAS_W);
      return {
        x: mx - (mx - v.x) * (newW / v.w),
        y: my - (my - v.y) * (newH / v.h),
        w: newW, h: newH,
      };
    });
  };

  const zoomIn  = () => setVb(v => {
    const nw = Math.max(CANVAS_W * 0.22, v.w / 1.35);
    const nh = nw * (CANVAS_H / CANVAS_W);
    return { x: v.x + (v.w - nw) / 2, y: v.y + (v.h - nh) / 2, w: nw, h: nh };
  });
  const zoomOut = () => setVb(v => {
    const nw = Math.min(CANVAS_W * 3.5, v.w * 1.35);
    const nh = nw * (CANVAS_H / CANVAS_W);
    return { x: v.x - (nw - v.w) / 2, y: v.y - (nh - v.h) / 2, w: nw, h: nh };
  });
  const resetView = () => setVb({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H });

  const hoveredTopic  = topics.find(t => t.id === hoveredId)  ?? null;
  const selectedTopic = topics.find(t => t.id === selectedId) ?? null;
  const hasLda      = topics.some(t => t.source === 'lda');
  const hasBertopic = topics.some(t => t.source === 'bertopic');

  // BE-8: Export Science Map as SVG
  const exportSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;

    // Set full-canvas viewBox for export
    clone.setAttribute('viewBox', `0 0 ${CANVAS_W} ${CANVAS_H}`);
    clone.setAttribute('width', String(CANVAS_W));
    clone.setAttribute('height', String(CANVAS_H));
    clone.removeAttribute('class');
    clone.setAttribute('style', 'background:#0f172a;font-family:ui-sans-serif,system-ui,sans-serif;');

    // Add full background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', '0'); bg.setAttribute('y', '0');
    bg.setAttribute('width', String(CANVAS_W)); bg.setAttribute('height', String(CANVAS_H));
    bg.setAttribute('fill', '#0f172a');
    clone.insertBefore(bg, clone.firstChild);

    // Add legend block at bottom-left
    const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const legendY = CANVAS_H - 10;
    const legendX = 20;
    FACTOR_CATEGORIES.forEach((cat, i) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const cx = legendX + i * 205;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(cx)); circle.setAttribute('cy', String(legendY - 5));
      circle.setAttribute('r', '6'); circle.setAttribute('fill', cat.color);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(cx + 10)); text.setAttribute('y', String(legendY - 1));
      text.setAttribute('fill', '#cbd5e1'); text.setAttribute('font-size', '10');
      text.textContent = cat.label;
      g.appendChild(circle); g.appendChild(text);
      legendGroup.appendChild(g);
    });
    clone.appendChild(legendGroup);

    const serializer = new XMLSerializer();
    const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, 'science-map-td-ies.svg');
  };

  return (
    <div ref={containerRef} className="relative select-none" style={{ minHeight: 420 }}>

      {/* ── Barra de estadísticas (arriba izq) ── */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-ink-900/90 backdrop-blur-sm border border-ink-700 rounded-lg px-3 py-1.5 pointer-events-none">
        <span className="text-sm font-semibold text-white">{topics.length} temas</span>
        <span className="text-fog text-xs">·</span>
        {hasLda && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-semibold">LDA</span>
        )}
        {hasBertopic && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-400/40 text-violet-300 font-semibold">BERTopic</span>
        )}
      </div>

      {/* ── Controles de zoom (arriba der) ── */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <button onClick={zoomIn}  title="Acercar"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-ink-850 border border-ink-600 text-paper hover:text-white hover:bg-ink-800 transition-colors font-bold text-lg leading-none">+</button>
        <button onClick={zoomOut} title="Alejar"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-ink-850 border border-ink-600 text-paper hover:text-white hover:bg-ink-800 transition-colors font-bold text-lg leading-none">−</button>
        <button onClick={resetView} title="Restablecer vista"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-ink-850 border border-ink-600 text-haze hover:text-white hover:bg-ink-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button onClick={exportSvg} title="Exportar como SVG"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-ink-850 border border-ink-600 text-haze hover:text-cyan-400 hover:bg-ink-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      {/* ── Hint (abajo centro) ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <span className="text-xs text-mist bg-ink-900/80 border border-ink-700/50 rounded-full px-3 py-1">
          Arrastra para desplazar · Scroll para zoom · Clic en nodo para detalles
        </span>
      </div>

      {/* ── SVG Map ── */}
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="w-full h-auto"
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab', minHeight: 420 }}
        aria-label="Mapa de conocimiento — Transformación Digital en IES"
        onMouseDown={onSvgMouseDown}
        onMouseMove={onSvgMouseMove}
        onMouseUp={onSvgMouseUp}
        onMouseLeave={onSvgMouseUp}
        onWheel={onSvgWheel}
      >
        {/* Fondo paneable */}
        <rect x={-9999} y={-9999} width={29999} height={29999} fill="transparent" data-pannable="true" />

        {/* Spokes centro → zonas */}
        {FACTOR_CATEGORIES.map(cat => (
          <line key={`spoke-${cat.id}`}
            x1={CX} y1={CY} x2={cat.zoneX} y2={cat.zoneY}
            stroke={cat.color} strokeWidth={1.5} strokeOpacity={0.18} strokeDasharray="10 6" />
        ))}

        {/* Elipses de zona (guía visual) */}
        {FACTOR_CATEGORIES.map(cat => (
          <ellipse key={`ring-${cat.id}`}
            cx={cat.zoneX} cy={cat.zoneY} rx={120} ry={100}
            fill={cat.ringColor} stroke={cat.color}
            strokeWidth={1} strokeDasharray="6 5" opacity={0.45} />
        ))}

        {/* Conectores hub → nodo */}
        {FACTOR_CATEGORIES.map(cat => {
          const catTopics = topicsByCategory[cat.id] ?? [];
          const positions = zoneBubblePositions(cat.zoneX, cat.zoneY, catTopics.length);
          return catTopics.map((topic, i) => {
            const pos = positions[i];
            if (!pos) return null;
            const active = hoveredId === topic.id || selectedId === topic.id;
            return (
              <line key={`conn-${topic.id}`}
                x1={cat.zoneX} y1={cat.zoneY} x2={pos.x} y2={pos.y}
                stroke={cat.color} strokeWidth={active ? 2 : 1}
                strokeOpacity={active ? 0.65 : 0.14} />
            );
          });
        })}

        {/* Hub central */}
        <circle cx={CX} cy={CY} r={60} fill="rgba(15,23,42,0.96)" stroke="rgba(148,163,184,0.5)" strokeWidth={2} />
        <circle cx={CX} cy={CY} r={54} fill="rgba(30,41,59,0.92)" />
        <text x={CX} y={CY - 12} textAnchor="middle" fill="white" fontSize={14} fontWeight={700} letterSpacing={0.5}>TD en</text>
        <text x={CX} y={CY + 6}  textAnchor="middle" fill="white" fontSize={14} fontWeight={700} letterSpacing={0.5}>Educación</text>
        <text x={CX} y={CY + 23} textAnchor="middle" fill="rgba(148,163,184,0.9)" fontSize={11}>Superior</text>

        {/* Hubs de categoría */}
        {FACTOR_CATEGORIES.map(cat => {
          const catTopics = topicsByCategory[cat.id] ?? [];
          return (
            <g key={`hub-${cat.id}`}>
              <circle cx={cat.zoneX} cy={cat.zoneY} r={48}
                fill="rgba(15,23,42,0.94)" stroke={cat.color} strokeWidth={2.5} />
              <text x={cat.zoneX} y={cat.zoneY - 7}
                textAnchor="middle" fill={cat.color} fontSize={11} fontWeight={700}>
                {cat.shortLabel.length > 14 ? cat.shortLabel.slice(0, 13) + '…' : cat.shortLabel}
              </text>
              <text x={cat.zoneX} y={cat.zoneY + 9}
                textAnchor="middle" fill="rgba(148,163,184,0.85)" fontSize={9}>
                {catTopics.length} tema{catTopics.length !== 1 ? 's' : ''}
              </text>
            </g>
          );
        })}

        {/* Nodos de temas */}
        {FACTOR_CATEGORIES.map(cat => {
          const catTopics = topicsByCategory[cat.id] ?? [];
          const positions = zoneBubblePositions(cat.zoneX, cat.zoneY, catTopics.length);
          return catTopics.map((topic, i) => {
            const pos = positions[i];
            if (!pos) return null;
            const isHov = hoveredId  === topic.id;
            const isSel = selectedId === topic.id;
            const active = isHov || isSel;
            const isDimmed = highlightCategory != null && topic.categoryId !== highlightCategory;
            // Radio: 17–28px según número de documentos
            const r = Math.max(17, Math.min(28, 17 + (topic.numDocuments / totalDocWeight) * 100));
            // Etiquetas: top 2 palabras del clúster
            const w0 = topic.words[0]?.word ?? topic.label;
            const w1 = topic.words[1]?.word ?? null;
            const lbl1 = w0.length > 9 ? w0.slice(0, 8) + '…' : w0;
            const lbl2 = w1 ? (w1.length > 9 ? w1.slice(0, 8) + '…' : w1) : null;
            // Fuente: L = LDA, B = BERTopic
            const srcLetter = topic.source === 'lda' ? 'L' : 'B';
            const srcColor  = topic.source === 'lda' ? '#10b981' : '#8b5cf6';

            return (
              <g key={`topic-${topic.id}`} style={{ cursor: 'pointer', opacity: isDimmed ? 0.12 : 1, transition: 'opacity 0.2s' }}
                onMouseEnter={() => setHoveredId(topic.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => { e.stopPropagation(); setSelectedId(prev => prev === topic.id ? null : topic.id); }}
              >
                {/* Anillo de selección (punteado) */}
                {isSel && (
                  <circle cx={pos.x} cy={pos.y} r={r + 7}
                    fill="none" stroke={cat.color} strokeWidth={2.5} strokeDasharray="5 3" opacity={0.9} />
                )}
                {/* Halo hover */}
                {isHov && !isSel && (
                  <circle cx={pos.x} cy={pos.y} r={r + 5} fill={cat.color} opacity={0.14} />
                )}
                {/* Círculo principal */}
                <circle cx={pos.x} cy={pos.y} r={r}
                  fill={active ? cat.color : 'rgba(15,23,42,0.9)'}
                  stroke={cat.color}
                  strokeWidth={active ? 2.5 : 1.5}
                  opacity={active ? 1 : 0.9} />
                {/* Etiqueta línea 1 */}
                <text x={pos.x} y={pos.y + (lbl2 ? -2.5 : 4)}
                  textAnchor="middle" fill={active ? 'white' : cat.color}
                  fontSize={9} fontWeight={700}>{lbl1}</text>
                {/* Etiqueta línea 2 */}
                {lbl2 && (
                  <text x={pos.x} y={pos.y + 10}
                    textAnchor="middle" fill={active ? 'rgba(255,255,255,0.82)' : cat.color}
                    fontSize={8} fontWeight={600}>{lbl2}</text>
                )}
                {/* Badge de fuente (esquina superior derecha del nodo) */}
                <circle cx={pos.x + r * 0.66} cy={pos.y - r * 0.66} r={7}
                  fill={srcColor} opacity={0.92} />
                <text x={pos.x + r * 0.66} y={pos.y - r * 0.66 + 3.5}
                  textAnchor="middle" fill="white" fontSize={6.5} fontWeight={700}>{srcLetter}</text>
              </g>
            );
          });
        })}

        {/* Leyenda de categorías (franja inferior) */}
        {FACTOR_CATEGORIES.map((cat, i) => (
          <g key={`leg-${cat.id}`} transform={`translate(${80 + i * 210}, ${CANVAS_H - 28})`}>
            <circle r={7} cx={7} cy={5} fill={cat.color} opacity={0.92} />
            <text x={20} y={9} fill="rgba(203,213,225,0.9)" fontSize={10} fontWeight={500}>{cat.shortLabel}</text>
          </g>
        ))}
        {/* Leyenda de fuentes */}
        <g transform={`translate(${CANVAS_W - 160}, ${CANVAS_H - 28})`}>
          <circle r={6} cx={6} cy={5} fill="#10b981" opacity={0.9} />
          <text x={17} y={9} fill="rgba(203,213,225,0.85)" fontSize={9}>LDA</text>
          <circle r={6} cx={62} cy={5} fill="#8b5cf6" opacity={0.9} />
          <text x={73} y={9} fill="rgba(203,213,225,0.85)" fontSize={9}>BERTopic</text>
        </g>
      </svg>

      {/* ── Paneles flotantes ── */}
      {hoveredTopic && hoveredId !== selectedId && hoveredPanelPos && (
        <TopicPanel
          topic={hoveredTopic} domPos={hoveredPanelPos}
          mode="hover" docTopics={docTopics}
          containerW={containerSize.w} containerH={containerSize.h}
        />
      )}
      {selectedTopic && selectedPanelPos && (
        <TopicPanel
          topic={selectedTopic} domPos={selectedPanelPos}
          mode="selected" onClose={() => setSelectedId(null)} docTopics={docTopics}
          containerW={containerSize.w} containerH={containerSize.h}
        />
      )}
    </div>
  );
};

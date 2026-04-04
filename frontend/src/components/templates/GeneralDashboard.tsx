/**
 * GeneralDashboard — Science Mapping / Knowledge Landscape
 *
 * OE3: Landscape consolidado de la Transformación Digital en Educación Superior.
 * Interactive: click nodes on the map, expandable category cards, cluster detail tabs,
 * per-item downloads, and full export (CSV / JSON / TSV).
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { ResponsiveRadar } from '@nivo/radar';
import { ChartCard } from '../molecules';
import publicTopicModelingService from '../../services/publicTopicModelingService';
import publicBertopicService from '../../services/publicBertopicService';
import publicDataPreparationService from '../../services/publicDataPreparationService';
import { useFilter } from '../../contexts/FilterContext';
import { LANGUAGE_NAMES } from '../../services/dataPreparationService';
import type { TopicModeling, TopicModelingListItem } from '../../services/topicModelingService';
import type { BERTopicAnalysis, BERTopicListItem } from '../../services/bertopicService';
import type { ExecutiveSummary } from '../../services/publicTopicModelingService';

// ─── Factor categories (OE3 framework) ───────────────────────────────────────

interface FactorCategory {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  ringColor: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  keywords: string[];
  description: string;
  icon: React.ReactNode;
  zoneX: number;
  zoneY: number;
}

const FACTOR_CATEGORIES: FactorCategory[] = [
  {
    id: 'infraestructura',
    label: 'Infraestructura Tecnológica',
    shortLabel: 'Infraestructura',
    color: '#06b6d4',
    ringColor: 'rgba(6,182,212,0.18)',
    textClass: 'text-cyan-300',
    bgClass: 'bg-slate-800',
    borderClass: 'border-slate-600 border-l-4 border-l-cyan-400',
    badgeClass: 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/50',
    keywords: ['infrastructure', 'technology', 'digital', 'platform', 'system', 'software',
               'hardware', 'cloud', 'internet', 'network', 'tool', 'resource', 'ict', 'device',
               'infraestructura', 'plataforma', 'sistema', 'herramienta', 'tecnolog'],
    description: 'Herramientas, plataformas y sistemas tecnológicos adoptados en IES',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
    zoneX: 700, zoneY: 120,
  },
  {
    id: 'gobernanza',
    label: 'Gobernanza y Estrategia',
    shortLabel: 'Gobernanza',
    color: '#3b82f6',
    ringColor: 'rgba(59,130,246,0.18)',
    textClass: 'text-blue-300',
    bgClass: 'bg-slate-800',
    borderClass: 'border-slate-600 border-l-4 border-l-blue-400',
    badgeClass: 'bg-blue-400/10 text-blue-300 border border-blue-400/50',
    keywords: ['governance', 'strategy', 'policy', 'management', 'leadership', 'institutional',
               'organization', 'framework', 'model', 'plan', 'implementation', 'initiative',
               'gobernanza', 'estrategia', 'política', 'gestión', 'liderazgo', 'institucion'],
    description: 'Marcos de política institucional y liderazgo para la TD',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    zoneX: 1130, zoneY: 265,
  },
  {
    id: 'docencia',
    label: 'Formación Docente',
    shortLabel: 'Docencia',
    color: '#8b5cf6',
    ringColor: 'rgba(139,92,246,0.18)',
    textClass: 'text-violet-300',
    bgClass: 'bg-slate-800',
    borderClass: 'border-slate-600 border-l-4 border-l-violet-400',
    badgeClass: 'bg-violet-400/10 text-violet-300 border border-violet-400/50',
    keywords: ['teaching', 'teacher', 'faculty', 'training', 'professional', 'development',
               'competency', 'skill', 'pedagogy', 'instruction', 'educator', 'literacy',
               'docente', 'formación', 'capacitación', 'competencia', 'enseñanza'],
    description: 'Capacitación y desarrollo de competencias digitales docentes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    zoneX: 1130, zoneY: 635,
  },
  {
    id: 'estudiante',
    label: 'Experiencia del Estudiante',
    shortLabel: 'Estudiante',
    color: '#10b981',
    ringColor: 'rgba(16,185,129,0.18)',
    textClass: 'text-emerald-300',
    bgClass: 'bg-slate-800',
    borderClass: 'border-slate-600 border-l-4 border-l-emerald-400',
    badgeClass: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/50',
    keywords: ['student', 'learning', 'education', 'academic', 'curriculum', 'online',
               'e-learning', 'engagement', 'experience', 'achievement', 'performance',
               'estudiante', 'aprendizaje', 'educación', 'académico', 'currículo'],
    description: 'Impacto en el proceso de aprendizaje y experiencia estudiantil',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
    zoneX: 700, zoneY: 780,
  },
  {
    id: 'cultura',
    label: 'Cambio Cultural',
    shortLabel: 'Cultura',
    color: '#f59e0b',
    ringColor: 'rgba(245,158,11,0.18)',
    textClass: 'text-amber-300',
    bgClass: 'bg-slate-800',
    borderClass: 'border-slate-600 border-l-4 border-l-amber-400',
    badgeClass: 'bg-amber-400/10 text-amber-300 border border-amber-400/50',
    keywords: ['culture', 'change', 'innovation', 'transformation', 'adoption', 'mindset',
               'resistance', 'readiness', 'attitude', 'perception', 'barrier', 'challenge',
               'cultura', 'cambio', 'innovación', 'transformación', 'adopción', 'barrera'],
    description: 'Transformación cultural, barreras e innovación institucional',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    zoneX: 270, zoneY: 635,
  },
  {
    id: 'calidad',
    label: 'Evaluación y Calidad',
    shortLabel: 'Calidad',
    color: '#ec4899',
    ringColor: 'rgba(236,72,153,0.18)',
    textClass: 'text-pink-300',
    bgClass: 'bg-slate-800',
    borderClass: 'border-slate-600 border-l-4 border-l-pink-400',
    badgeClass: 'bg-pink-400/10 text-pink-300 border border-pink-400/50',
    keywords: ['quality', 'evaluation', 'assessment', 'performance', 'outcome', 'impact',
               'measure', 'indicator', 'effectiveness', 'efficiency', 'improvement', 'accreditation',
               'calidad', 'evaluación', 'rendimiento', 'resultado', 'impacto', 'medición'],
    description: 'Métricas, evaluación y aseguramiento de calidad en la TD',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    zoneX: 270, zoneY: 265,
  },
];

const CAT_BY_ID: Record<string, FactorCategory> = Object.fromEntries(
  FACTOR_CATEGORIES.map(c => [c.id, c])
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedTopic {
  id: number;
  label: string;
  words: Array<{ word: string; weight: number }>;
  numDocuments: number;
  categoryId: string;
  source: 'lda' | 'bertopic';
  svgX: number;
  svgY: number;
}

interface DocumentTopicItem {
  document_id?: number;
  document_name?: string;
  dominant_topic?: number;
  topic_id?: number;
  dominant_topic_weight?: number;
  topic_weight?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyTopic(words: string[]): string {
  const text = words.join(' ').toLowerCase();
  let best = 'infraestructura';
  let bestScore = 0;
  for (const cat of FACTOR_CATEGORIES) {
    const score = cat.keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = cat.id; }
  }
  return best;
}

// zoneBubblePositions — multi-ring layout that prevents node overlap.
// Fills concentric rings outward from the hub, each ring sized so that
// adjacent node centers are at least NODE_DIAM apart.
function zoneBubblePositions(
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

// ─── Export utilities ─────────────────────────────────────────────────────────

function triggerDownload(content: string, filename: string, mimeType: string) {
  const bom = mimeType.includes('csv') ? '\uFEFF' : '';
  const blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCSVRow(cells: (string | number)[]): string {
  return cells.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
}

function buildTopicsCSV(topics: EnrichedTopic[]): string {
  const header = toCSVRow(['ID', 'Etiqueta', 'Categoría', 'Fuente', 'Documentos', 'Términos principales (peso)']);
  const rows = topics.map(t =>
    toCSVRow([
      t.id,
      t.label,
      CAT_BY_ID[t.categoryId]?.label ?? t.categoryId,
      t.source.toUpperCase(),
      t.numDocuments,
      t.words.slice(0, 8).map(w => `${w.word}(${(w.weight * 100).toFixed(1)}%)`).join('; '),
    ])
  );
  return [header, ...rows].join('\n');
}

function buildCategoryCSV(cat: FactorCategory, topics: EnrichedTopic[], docTopics: DocumentTopicItem[]): string {
  const header = toCSVRow(['Categoría', 'Tópico', 'Términos', 'Documentos', 'Top Documentos']);
  const rows = topics.map(t => {
    const topDocs = docTopics
      .filter(d => (d.dominant_topic ?? d.topic_id) === t.id)
      .slice(0, 5)
      .map(d => d.document_name ?? `Doc ${d.document_id}`)
      .join('; ');
    return toCSVRow([
      cat.label,
      t.label,
      t.words.slice(0, 6).map(w => w.word).join('; '),
      t.numDocuments,
      topDocs || 'N/A',
    ]);
  });
  return [header, ...rows].join('\n');
}

function buildClusterCSV(topic: EnrichedTopic, docTopics: DocumentTopicItem[]): string {
  const infoHeader = toCSVRow(['Campo', 'Valor']);
  const infoRows = [
    toCSVRow(['Etiqueta', topic.label]),
    toCSVRow(['Categoría', CAT_BY_ID[topic.categoryId]?.label ?? topic.categoryId]),
    toCSVRow(['Fuente', topic.source.toUpperCase()]),
    toCSVRow(['Documentos', topic.numDocuments]),
    toCSVRow(['', '']),
    toCSVRow(['Término', 'Peso (%)']),
    ...topic.words.map(w => toCSVRow([w.word, (w.weight * 100).toFixed(2)])),
    toCSVRow(['', '']),
    toCSVRow(['Documento', 'Peso del tema']),
    ...docTopics
      .filter(d => (d.dominant_topic ?? d.topic_id) === topic.id)
      .map(d => toCSVRow([d.document_name ?? `Doc ${d.document_id}`, (d.dominant_topic_weight ?? d.topic_weight ?? 0).toFixed(2)])),
  ];
  return [infoHeader, ...infoRows].join('\n');
}

// ─── Science Map — pan/zoom SVG con layout multi-anillo sin solapamiento ──────

const CANVAS_W = 1400;
const CANVAS_H = 900;
const CX = 700;
const CY = 450;

// Panel dimensions (estimados fijos para clamping sin necesitar medir el DOM)
const PANEL_W = 276;
const PANEL_H_HOVER = 210;
const PANEL_H_SELECTED = 390;

interface ScienceMapProps {
  topics: EnrichedTopic[];
  docTopics: DocumentTopicItem[];
  highlightCategory?: string | null;
}

// ── TopicPanel: panel flotante sobre el contenedor del mapa ──────────────────

interface TopicPanelProps {
  topic: EnrichedTopic;
  domPos: { left: number; top: number }; // px relativos al contenedor
  mode: 'hover' | 'selected';
  onClose?: () => void;
  docTopics: DocumentTopicItem[];
  containerW: number;
  containerH: number;
}

const TopicPanel: React.FC<TopicPanelProps> = ({
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
      className={`absolute z-30 rounded-xl border border-slate-600 bg-slate-900 shadow-2xl p-4 ${mode === 'hover' ? 'pointer-events-none' : ''}`}
      style={{ left, top, width: PANEL_W }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-sm font-bold ${cat.textClass} leading-snug flex-1 min-w-0`}>{topic.label}</p>
        {mode === 'selected' && onClose && (
          <button onClick={onClose} aria-label="Cerrar panel"
            className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
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
          <span className="text-xs text-slate-300 font-medium">{topic.numDocuments} doc{topic.numDocuments !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Términos con barra de peso */}
      <div className="space-y-1.5 mb-3">
        {topic.words.slice(0, mode === 'selected' ? 8 : 5).map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm text-slate-200 w-[90px] truncate shrink-0">{w.word}</span>
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(w.weight / maxWeight) * 100}%`, backgroundColor: cat.color }} />
            </div>
            <span className="text-xs text-slate-300 w-8 text-right shrink-0 tabular-nums font-medium">
              {(w.weight * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* Documentos representativos (solo en modo selected) */}
      {mode === 'selected' && topDocs.length > 0 && (
        <div className="border-t border-slate-700 pt-3">
          <p className="text-xs font-semibold text-slate-300 mb-2">Documentos representativos</p>
          <ul className="space-y-1.5">
            {topDocs.map((d, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className={`text-sm ${cat.textClass} font-bold shrink-0`}>{i + 1}.</span>
                <span className="text-sm text-slate-200 truncate flex-1" title={d.document_name}>
                  {d.document_name ?? `Doc ${d.document_id}`}
                </span>
                {(d.dominant_topic_weight ?? d.topic_weight) != null && (
                  <span className="text-xs text-slate-300 shrink-0 tabular-nums font-medium ml-auto">
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

const ScienceMap: React.FC<ScienceMapProps> = ({ topics, docTopics, highlightCategory }) => {
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'science-map-td-ies.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={containerRef} className="relative select-none" style={{ minHeight: 420 }}>

      {/* ── Barra de estadísticas (arriba izq) ── */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5 pointer-events-none">
        <span className="text-sm font-semibold text-white">{topics.length} temas</span>
        <span className="text-slate-500 text-xs">·</span>
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
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-600 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors font-bold text-lg leading-none">+</button>
        <button onClick={zoomOut} title="Alejar"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-600 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors font-bold text-lg leading-none">−</button>
        <button onClick={resetView} title="Restablecer vista"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button onClick={exportSvg} title="Exportar como SVG"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-600 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      {/* ── Hint (abajo centro) ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <span className="text-xs text-slate-400 bg-slate-900/80 border border-slate-700/50 rounded-full px-3 py-1">
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

// ─── Category Card ─────────────────────────────────────────────────────────────

interface CategoryCardProps {
  cat: FactorCategory;
  topics: EnrichedTopic[];
  docTopics: DocumentTopicItem[];
  expanded: boolean;
  onToggle: () => void;
  isFilterActive: boolean;
  onFilterClick: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ cat, topics, docTopics, expanded, onToggle, isFilterActive, onFilterClick }) => {
  const topTerms = Array.from(
    new Set(topics.flatMap(t => t.words.slice(0, 4).map(w => w.word)))
  ).slice(0, 8);

  const topDocs = useMemo(() => {
    const seen = new Set<string>();
    return docTopics
      .filter(d => {
        const topicId = d.dominant_topic ?? d.topic_id;
        return topics.some(t => t.id === topicId);
      })
      .sort((a, b) => (b.dominant_topic_weight ?? b.topic_weight ?? 0) - (a.dominant_topic_weight ?? a.topic_weight ?? 0))
      .filter(d => {
        const name = d.document_name ?? String(d.document_id);
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .slice(0, 8);
  }, [topics, docTopics]);

  const handleDownload = useCallback(() => {
    const csv = buildCategoryCSV(cat, topics, docTopics);
    triggerDownload(csv, `categoria_${cat.id}_${Date.now()}.csv`, 'text/csv');
  }, [cat, topics, docTopics]);

  return (
    // bg-slate-800 sólido — contraste predecible para todos los textos interiores
    <div className={`rounded-xl border ${isFilterActive ? `${cat.borderClass} ring-2 ring-offset-2 ring-offset-slate-900` : cat.borderClass} ${cat.bgClass} transition-all duration-200`}
      style={isFilterActive ? { outlineColor: cat.color } : undefined}>
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          {/* Icono de categoría — 40px, color semántico, border visible + filtro */}
          <button
            onClick={onFilterClick}
            title={isFilterActive ? 'Quitar filtro de categoría' : `Filtrar mapa por: ${cat.label}`}
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cat.badgeClass} hover:opacity-75 transition-opacity cursor-pointer`}
          >
            {isFilterActive ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              cat.icon
            )}
          </button>
          <div className="flex items-center gap-2">
            {isFilterActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white font-semibold border border-white/20 animate-pulse">
                Filtro activo
              </span>
            )}
            {topics.length > 0 && (
              // Badge de conteo — text-sm (14px) + color semántico de categoría
              <span className={`text-sm px-2.5 py-1 rounded-full font-semibold ${cat.badgeClass}`}>
                {topics.length} tema{topics.length !== 1 ? 's' : ''}
              </span>
            )}
            {/* Download button — 32px mínimo, hover con feedback visual */}
            {topics.length > 0 && (
              <button
                onClick={handleDownload}
                title="Descargar CSV de esta categoría"
                aria-label={`Descargar CSV de ${cat.label}`}
                className={`w-8 h-8 flex items-center justify-center rounded-lg ${cat.badgeClass} hover:opacity-75 transition-opacity cursor-pointer`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Título: text-base (16px) + color semántico → ≥ 5.5:1 contraste sobre bg-slate-800 */}
        <h4 className={`text-base font-semibold ${cat.textClass} mb-1.5`}>{cat.label}</h4>
        {/* Descripción: text-sm (14px) + slate-300 → ≈ 7.5:1 contraste */}
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">{cat.description}</p>

        {topTerms.length > 0 ? (
          // Pills de términos — borde sólido slate-600 + texto legible slate-100
          <div className="flex flex-wrap gap-1.5">
            {topTerms.map(term => (
              <span
                key={term}
                className="text-sm px-2.5 py-1 rounded-md border border-slate-600 text-slate-100 bg-slate-700/60"
              >
                {term}
              </span>
            ))}
          </div>
        ) : (
          // text-sm + slate-300 en itálica — legible, no invisible
          <p className="text-sm text-slate-300 italic">Sin temas asignados aún</p>
        )}

        {/* Toggle de documentos — min-h-[44px] (WCAG 2.5.5), text-sm, padding adecuado */}
        {topDocs.length > 0 && (
          <button
            onClick={onToggle}
            className={`mt-4 w-full flex items-center justify-between px-4 min-h-[44px] rounded-lg text-sm font-semibold ${cat.badgeClass} hover:opacity-75 transition-opacity cursor-pointer`}
            aria-expanded={expanded}
          >
            <span>Top documentos ({topDocs.length})</span>
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Listado expandible de documentos */}
      {expanded && topDocs.length > 0 && (
        <div className="border-t border-slate-600 px-5 pb-5 pt-4">
          {/* Título sección: text-sm + slate-300 → contraste ≥ 7.5:1 */}
          <p className="text-sm font-semibold text-slate-300 mb-3">Documentos representativos</p>
          <ul className="space-y-2">
            {topDocs.map((d, i) => (
              <li key={i} className="flex items-start gap-2">
                {/* Número: color semántico de categoría */}
                <span className={`text-sm ${cat.textClass} font-bold shrink-0`}>{i + 1}.</span>
                {/* Nombre doc: text-sm + slate-100 → ≈ 14:1 contraste */}
                <span
                  className="text-sm text-slate-100 break-all leading-relaxed flex-1"
                  title={d.document_name}
                >
                  {d.document_name ?? `Documento ${d.document_id}`}
                </span>
                {(d.dominant_topic_weight ?? d.topic_weight) != null && (
                  // Peso: text-sm + slate-300 → contraste ≥ 7.5:1
                  <span className="text-sm text-slate-300 shrink-0 ml-auto font-medium tabular-nums">
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

// ─── Cluster Card ─────────────────────────────────────────────────────────────

type ClusterTab = 'terms' | 'docs' | 'details';

interface ClusterCardProps {
  topic: EnrichedTopic;
  docTopics: DocumentTopicItem[];
  activeTab: ClusterTab;
  onTabChange: (tab: ClusterTab) => void;
}

const ClusterCard: React.FC<ClusterCardProps> = ({ topic, docTopics, activeTab, onTabChange }) => {
  const cat = CAT_BY_ID[topic.categoryId];
  const maxW = topic.words[0]?.weight || 1;

  const topicDocs = useMemo(() =>
    docTopics
      .filter(d => (d.dominant_topic ?? d.topic_id) === topic.id)
      .sort((a, b) => (b.dominant_topic_weight ?? b.topic_weight ?? 0) - (a.dominant_topic_weight ?? a.topic_weight ?? 0))
      .slice(0, 10),
    [docTopics, topic.id]
  );

  const handleDownload = useCallback(() => {
    const csv = buildClusterCSV(topic, docTopics);
    triggerDownload(csv, `cluster_${topic.id}_${topic.label.replace(/\s+/g, '_').slice(0, 30)}.csv`, 'text/csv');
  }, [topic, docTopics]);

  const tabs: Array<{ id: ClusterTab; label: string }> = [
    { id: 'terms', label: 'Términos' },
    { id: 'docs', label: `Documentos${topicDocs.length > 0 ? ` (${topicDocs.length})` : ''}` },
    { id: 'details', label: 'Detalles' },
  ];

  return (
    // bg-slate-800 sólido + borde izquierdo semántico (via cat.borderClass actualizado)
    <div className={`rounded-xl border ${cat.borderClass} bg-slate-800 flex flex-col`}>
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between mb-3">
          {/* Título: text-sm (14px) + text-white → ≈ 21:1 */}
          <h5 className="text-sm font-semibold text-white leading-snug flex-1 mr-2">{topic.label}</h5>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Badge de categoría: text-xs + color semántico */}
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${cat.badgeClass}`}>{cat.shortLabel}</span>
            {/* Download — 32px, visible, semántico */}
            <button
              onClick={handleDownload}
              title="Descargar CSV de este clúster"
              aria-label={`Descargar CSV del clúster ${topic.label}`}
              className={`w-8 h-8 flex items-center justify-center rounded-md ${cat.badgeClass} hover:opacity-75 transition-opacity cursor-pointer`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs — texto-sm, altura mínima ~36px, estados activo/inactivo con contraste claro */}
        <div className="flex gap-1" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  // Activo: bg+texto semántico + borde visible
                  ? `${cat.badgeClass} border`
                  // Inactivo: slate-300 (≈ 7.5:1) → hover a white (≈ 21:1)
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pb-4 pt-2 flex-1" role="tabpanel">
        {/* Términos tab */}
        {activeTab === 'terms' && (
          <div className="space-y-2">
            {topic.words.slice(0, 8).map((w, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {/* Término: text-sm + slate-200 → ≈ 10:1 */}
                <span className="text-sm text-slate-200 w-28 truncate shrink-0">{w.word}</span>
                {/* Barra de progreso: track sólido, fill con color de categoría */}
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(w.weight / maxW) * 100}%`, backgroundColor: cat.color }}
                  />
                </div>
                {/* Porcentaje: text-sm + slate-300 + tabular-nums → ≈ 7.5:1 */}
                <span className="text-sm text-slate-300 w-9 text-right shrink-0 tabular-nums font-medium">
                  {(w.weight * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Documentos tab */}
        {activeTab === 'docs' && (
          topicDocs.length > 0 ? (
            <ul className="space-y-2">
              {topicDocs.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  {/* Número: color semántico de categoría */}
                  <span className={`text-sm ${cat.textClass} font-bold shrink-0`}>{i + 1}.</span>
                  {/* Nombre: text-sm + slate-100 → ≈ 14:1 */}
                  <span className="text-sm text-slate-100 break-all leading-relaxed flex-1" title={d.document_name}>
                    {d.document_name ?? `Documento ${d.document_id}`}
                  </span>
                  {(d.dominant_topic_weight ?? d.topic_weight) != null && (
                    // Peso: text-sm + slate-300 + tabular-nums
                    <span className="text-sm text-slate-300 shrink-0 font-medium tabular-nums">
                      {((d.dominant_topic_weight ?? d.topic_weight ?? 0) * 100).toFixed(0)}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            // text-sm + slate-300 — legible, no invisible
            <p className="text-sm text-slate-300 italic py-2">
              No hay información de documentos disponible para este clúster.
            </p>
          )
        )}

        {/* Detalles tab */}
        {activeTab === 'details' && (
          <div className="space-y-2.5">
            {[
              { label: 'Fuente del modelo', value: topic.source.toUpperCase() },
              { label: 'Categoría OE3', value: CAT_BY_ID[topic.categoryId]?.label ?? topic.categoryId },
              { label: 'Documentos dominantes', value: topic.numDocuments > 0 ? topic.numDocuments.toLocaleString() : 'N/A' },
              { label: 'Términos en el clúster', value: topic.words.length },
              { label: 'Peso máximo de término', value: `${(topic.words[0]?.weight * 100 ?? 0).toFixed(2)}%` },
              { label: 'Peso mínimo de término', value: `${(topic.words[topic.words.length - 1]?.weight * 100 ?? 0).toFixed(2)}%` },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-start gap-2">
                {/* Etiqueta: text-sm + slate-300 → ≈ 7.5:1 (antes text-xs slate-400 = ≈ 3.5:1, fallaba) */}
                <span className="text-sm text-slate-300">{item.label}</span>
                {/* Valor: color semántico, font-semibold, tabular-nums */}
                <span className={`text-sm ${cat.textClass} font-semibold text-right tabular-nums`}>{String(item.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Export Menu ──────────────────────────────────────────────────────────────

interface ExportMenuProps {
  topics: EnrichedTopic[];
  topicsByCategory: Record<string, EnrichedTopic[]>;
  docTopics: DocumentTopicItem[];
  topicModel: TopicModeling | null;
  bertopic: BERTopicAnalysis | null;
  datasetName: string;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ topics, topicsByCategory, docTopics, topicModel, bertopic, datasetName }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const exportAllCSV = () => {
    setOpen(false);
    // Build multi-section CSV
    const sections: string[] = [];
    sections.push('# RESUMEN — Science Mapping / Knowledge Landscape');
    sections.push(`# Dataset: ${datasetName}`);
    sections.push(`# Fecha: ${new Date().toLocaleDateString('es-CO')}`);
    sections.push('');
    sections.push('## TÓPICOS');
    sections.push(buildTopicsCSV(topics));
    sections.push('');
    sections.push('## POR CATEGORÍA');
    for (const cat of FACTOR_CATEGORIES) {
      const catTopics = topicsByCategory[cat.id] ?? [];
      if (catTopics.length === 0) continue;
      sections.push(`### ${cat.label}`);
      sections.push(buildCategoryCSV(cat, catTopics, docTopics));
      sections.push('');
    }
    triggerDownload(sections.join('\n'), `science_mapping_${datasetName.replace(/\s+/g, '_').slice(0, 30)}_${Date.now()}.csv`, 'text/csv');
  };

  const exportJSON = () => {
    setOpen(false);
    const data = {
      dataset: datasetName,
      exported_at: new Date().toISOString(),
      summary: {
        total_topics: topics.length,
        total_documents: (topicModel?.documents_processed ?? bertopic?.documents_processed ?? 0),
        model_source: topicModel?.algorithm ?? 'bertopic',
        coherence_score: topicModel?.coherence_score ?? bertopic?.coherence_score,
      },
      categories: FACTOR_CATEGORIES.map(cat => ({
        id: cat.id,
        label: cat.label,
        topics: (topicsByCategory[cat.id] ?? []).map(t => ({
          id: t.id,
          label: t.label,
          words: t.words,
          num_documents: t.numDocuments,
        })),
      })),
      all_topics: topics.map(t => ({
        id: t.id,
        label: t.label,
        category: t.categoryId,
        source: t.source,
        num_documents: t.numDocuments,
        words: t.words,
        top_documents: docTopics
          .filter(d => (d.dominant_topic ?? d.topic_id) === t.id)
          .slice(0, 10)
          .map(d => ({ name: d.document_name ?? `Doc ${d.document_id}`, weight: d.dominant_topic_weight ?? d.topic_weight })),
      })),
    };
    triggerDownload(JSON.stringify(data, null, 2), `science_mapping_${datasetName.replace(/\s+/g, '_').slice(0, 30)}_${Date.now()}.json`, 'application/json');
  };

  const exportTSV = () => {
    setOpen(false);
    const header = ['ID', 'Etiqueta', 'Categoría', 'Fuente', 'Documentos', ...Array.from({ length: 10 }, (_, i) => `Término_${i + 1}`)].join('\t');
    const rows = topics.map(t => [
      t.id,
      t.label,
      CAT_BY_ID[t.categoryId]?.label ?? t.categoryId,
      t.source.toUpperCase(),
      t.numDocuments,
      ...t.words.slice(0, 10).map(w => `${w.word}(${(w.weight * 100).toFixed(1)}%)`),
    ].join('\t'));
    triggerDownload([header, ...rows].join('\n'), `science_mapping_${datasetName.replace(/\s+/g, '_').slice(0, 30)}_${Date.now()}.tsv`, 'text/tab-separated-values');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/40 rounded-xl hover:from-cyan-500/30 hover:to-violet-500/30 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Exportar datos
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-sm shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700/40">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Formato de exportación</p>
          </div>
          {[
            { label: 'CSV completo (Excel)', ext: 'csv', desc: 'UTF-8 con BOM — compatible con Excel', action: exportAllCSV, color: 'text-emerald-300' },
            { label: 'TSV (Excel / Calc)', ext: 'tsv', desc: 'Separado por tabulaciones', action: exportTSV, color: 'text-blue-300' },
            { label: 'JSON completo', ext: 'json', desc: 'Ideal para análisis programático', action: exportJSON, color: 'text-violet-300' },
          ].map(opt => (
            <button
              key={opt.ext}
              onClick={opt.action}
              className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-800/60 transition-colors text-left"
            >
              <div className={`mt-0.5 w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center shrink-0`}>
                <span className={`text-xs font-bold ${opt.color}`}>.{opt.ext}</span>
              </div>
              <div>
                <p className="text-sm text-white font-medium">{opt.label}</p>
                <p className="text-xs text-slate-400">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Metrics Strip ────────────────────────────────────────────────────────────

interface PrepSummary {
  files_processed: number;
  files_omitted: number;
  duplicates_removed: number;
  predominant_language: string;
  predominant_language_percentage: number;
}

interface MetricItem {
  id: string;
  icon: React.ReactNode;
  value: string;
  label: string;
  quality: 'good' | 'average' | 'poor' | 'neutral' | 'info';
  tooltip: { title: string; body: string; range?: string; source?: string };
  show: boolean;
}

// Q — paleta de calidad con ratios WCAG AA verificados sobre bg-slate-800/85
// emerald-300 (#6ee7b7) / amber-300 (#fcd34d) / rose-300 (#fda4af) sobre #1e293b → ≥ 5.5:1
// slate-100 (#f1f5f9) sobre #1e293b → ≈ 14:1  |  blue-300 (#93c5fd) → ≈ 7.2:1
const Q = {
  good:    { border: 'border-l-emerald-400', text: 'text-emerald-300', dot: 'bg-emerald-400', chip: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/40' },
  average: { border: 'border-l-amber-400',   text: 'text-amber-300',   dot: 'bg-amber-400',   chip: 'bg-amber-400/10   text-amber-300   border-amber-400/40'   },
  poor:    { border: 'border-l-rose-400',     text: 'text-rose-300',     dot: 'bg-rose-400',    chip: 'bg-rose-400/10    text-rose-300    border-rose-400/40'    },
  neutral: { border: 'border-l-slate-400',    text: 'text-slate-100',    dot: 'bg-slate-300',   chip: 'bg-slate-700      text-slate-200   border-slate-500'      },
  info:    { border: 'border-l-blue-400',     text: 'text-blue-300',     dot: 'bg-blue-400',    chip: 'bg-blue-400/10    text-blue-300    border-blue-400/40'    },
};

const MetricChip: React.FC<{ metric: MetricItem; flipTooltip?: boolean }> = ({ metric, flipTooltip }) => {
  const q = Q[metric.quality];
  return (
    // bg-slate-800/85 ≈ #1a2234 — fondo sólido legible, border visible
    <div className={`group relative flex-1 min-w-[130px] max-w-[210px] rounded-xl bg-slate-800/85 border border-slate-600 border-l-2 ${q.border} px-4 py-3.5 cursor-default select-none`}>

      {/* Icon + calidad badge */}
      <div className="flex items-center justify-between mb-2.5">
        {/* Icono con color semántico del estado */}
        <span className={`${q.text}`}>{metric.icon}</span>
        {/* Badge de calidad: texto legible 12px, contraste ≥ 4.5:1 */}
        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-semibold ${q.chip}`} aria-hidden="true">i</span>
      </div>

      {/* Valor — grande y con color de calidad (contraste ≥ 5.5:1) */}
      <div className={`text-xl font-bold leading-tight ${q.text} mb-1 truncate`} aria-label={metric.label}>
        {metric.value}
      </div>

      {/* Etiqueta — slate-200 (#e2e8f0) sobre #1a2234 → ≈ 10:1 contraste */}
      <div className="text-xs font-medium text-slate-200 leading-snug">{metric.label}</div>

      {/* Tooltip — visible al hacer hover, posición adaptativa */}
      <div
        role="tooltip"
        className={`
          hidden group-hover:block absolute z-50 w-72
          ${flipTooltip ? 'bottom-full mb-2' : 'top-full mt-2'}
          left-0 rounded-xl border border-slate-600 bg-slate-900 shadow-2xl p-4 pointer-events-none
        `}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2.5 h-2.5 rounded-full ${q.dot} shrink-0`} />
          {/* Título tooltip: slate-100 → ≈ 14:1 */}
          <p className={`text-sm font-semibold ${q.text}`}>{metric.tooltip.title}</p>
        </div>
        {/* Cuerpo: slate-300 (#cbd5e1) sobre bg-slate-900 (#0f172a) → ≈ 7.5:1 */}
        <p className="text-sm text-slate-300 leading-relaxed mb-2.5">{metric.tooltip.body}</p>
        {metric.tooltip.range && (
          <div className="text-xs rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 mb-2">
            <span className="text-slate-300 font-medium">Rango: </span>
            <span className="text-white font-semibold">{metric.tooltip.range}</span>
          </div>
        )}
        {metric.tooltip.source && (
          <div className="text-xs text-slate-300 mt-1">
            Fuente: <span className="text-white font-medium">{metric.tooltip.source}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface MetricsStripProps {
  topicModel: TopicModeling | null;
  bertopic: BERTopicAnalysis | null;
  enrichedTopics: EnrichedTopic[];
  prepSummary: PrepSummary | null;
}

const MetricsStrip: React.FC<MetricsStripProps> = ({ topicModel, bertopic, enrichedTopics, prepSummary }) => {
  const coherence = topicModel?.coherence_score ?? bertopic?.coherence_score ?? null;
  const coherenceQ: MetricItem['quality'] =
    coherence == null ? 'neutral' : coherence >= 0.65 ? 'good' : coherence >= 0.40 ? 'average' : 'poor';

  const totalDocs   = topicModel?.documents_processed ?? bertopic?.documents_processed ?? 0;
  const vocabSize   = topicModel?.vocabulary_size ?? bertopic?.vocabulary_size ?? 0;
  const numTopics   = enrichedTopics.length;
  const outliers    = bertopic?.num_outliers ?? 0;
  const perplexity  = topicModel?.perplexity_score ?? null;

  // Cobertura: % docs asignados a un tópico (no outlier)
  const coverage = totalDocs > 0 && bertopic != null
    ? ((totalDocs - outliers) / totalDocs) * 100
    : totalDocs > 0 && topicModel != null ? 100 : null;
  const coverageQ: MetricItem['quality'] =
    coverage == null ? 'neutral' : coverage >= 85 ? 'good' : coverage >= 65 ? 'average' : 'poor';

  // Densidad léxica: términos únicos por documento
  const lexDensity = totalDocs > 0 && vocabSize > 0 ? vocabSize / totalDocs : null;

  // Preprocesamiento
  const langCode = prepSummary?.predominant_language ?? null;
  const langName  = langCode ? (LANGUAGE_NAMES[langCode]?.name ?? langCode.toUpperCase()) : null;
  const langFlag  = langCode ? (LANGUAGE_NAMES[langCode]?.flag ?? '🌐') : null;
  const langPct   = prepSummary?.predominant_language_percentage ?? null;

  const dupRemoved  = prepSummary?.duplicates_removed ?? null;
  const filesProc   = prepSummary?.files_processed ?? null;
  const dupRate     = dupRemoved != null && filesProc != null && (filesProc + dupRemoved) > 0
    ? (dupRemoved / (filesProc + dupRemoved)) * 100
    : null;
  const dupQ: MetricItem['quality'] =
    dupRate == null ? 'neutral' : dupRate < 5 ? 'good' : dupRate < 20 ? 'average' : 'info';

  const modelName = topicModel?.algorithm_display ?? topicModel?.algorithm?.toUpperCase()
    ?? (bertopic ? 'BERTopic' : null);

  const metrics: MetricItem[] = [
    {
      id: 'coherence',
      show: coherence != null,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>,
      value: coherence != null ? coherence.toFixed(2) : '—',
      label: 'Coherencia C_V',
      quality: coherenceQ,
      tooltip: {
        title: 'Coherencia C_V del modelo de temas',
        body: 'Mide qué tan semánticamente relacionadas están las palabras principales de cada tema. Un valor alto indica temas más interpretables y con significado real para el investigador.',
        range: '≥ 0.65 excelente · 0.40–0.64 aceptable · < 0.40 revisar',
        source: modelName ?? undefined,
      },
    },
    {
      id: 'corpus',
      show: totalDocs > 0,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
      value: totalDocs.toLocaleString('es-CO'),
      label: 'Documentos analizados',
      quality: 'neutral',
      tooltip: {
        title: 'Tamaño del corpus analizado',
        body: 'Número total de documentos que el modelo procesó para extraer los temas. Un corpus más grande generalmente produce modelos más robustos y representativos.',
        range: 'Mínimo recomendado: 50 documentos para LDA · 200+ para BERTopic',
        source: modelName ?? undefined,
      },
    },
    {
      id: 'vocab',
      show: vocabSize > 0,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
      value: vocabSize.toLocaleString('es-CO'),
      label: 'Vocabulario único',
      quality: 'neutral',
      tooltip: {
        title: 'Tamaño del vocabulario único',
        body: 'Número de términos distintos que el modelo consideró tras aplicar preprocesamiento (stopwords, stemming, etc.). Refleja la riqueza léxica del corpus.',
        source: 'Preprocesamiento + Vectorización',
      },
    },
    {
      id: 'topics',
      show: numTopics > 0,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v3m0 14v3M4.22 4.22l2.12 2.12m11.32 11.32l2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>,
      value: String(numTopics),
      label: 'Temas identificados',
      quality: 'neutral',
      tooltip: {
        title: 'Número de temas extraídos',
        body: 'Grupos temáticos distintos identificados en el corpus. Cada tema representa un conjunto de términos semánticamente relacionados que co-ocurren en los documentos.',
        range: 'Óptimo: validar con índice de coherencia y revisión experta',
        source: modelName ?? undefined,
      },
    },
    {
      id: 'coverage',
      show: coverage != null && bertopic != null,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      value: coverage != null ? `${coverage.toFixed(1)}%` : '—',
      label: 'Cobertura del corpus',
      quality: coverageQ,
      tooltip: {
        title: 'Cobertura temática del corpus',
        body: 'Porcentaje de documentos que fueron asignados a algún tema (no clasificados como outliers). Un valor bajo puede indicar que el corpus es muy heterogéneo o que el modelo necesita ajuste.',
        range: '≥ 85% excelente · 65–84% aceptable · < 65% revisar parámetros',
        source: 'BERTopic (HDBSCAN clustering)',
      },
    },
    {
      id: 'lex_density',
      show: lexDensity != null,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
      value: lexDensity != null ? `${lexDensity.toFixed(1)}` : '—',
      label: 'Términos únicos/doc',
      quality: 'neutral',
      tooltip: {
        title: 'Densidad léxica del corpus',
        body: 'Promedio de términos únicos por documento tras preprocesamiento. Indica la variedad de vocabulario por documento. Valores muy bajos pueden indicar documentos cortos o un preprocesamiento muy agresivo.',
        source: 'Vectorización',
      },
    },
    {
      id: 'perplexity',
      show: perplexity != null,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
      value: perplexity != null ? perplexity.toFixed(1) : '—',
      label: 'Perplejidad (LDA)',
      quality: 'neutral',
      tooltip: {
        title: 'Perplejidad del modelo LDA',
        body: 'Medida estadística de qué tan bien el modelo predice una muestra. A menor perplejidad, mejor ajuste del modelo a los datos. Comparar entre modelos del mismo corpus.',
        range: 'No hay rango universal — comparar entre iteraciones del mismo corpus',
        source: `LDA · ${topicModel?.num_topics ?? '?'} temas`,
      },
    },
    {
      id: 'outliers',
      show: bertopic != null && outliers > 0,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
      value: `${outliers.toLocaleString('es-CO')}`,
      label: 'Outliers (sin tema)',
      quality: outliers / Math.max(totalDocs, 1) < 0.10 ? 'good' : outliers / Math.max(totalDocs, 1) < 0.25 ? 'average' : 'poor',
      tooltip: {
        title: 'Documentos sin tema asignado (BERTopic)',
        body: 'Documentos que HDBSCAN no pudo asignar a ningún clúster (tema -1). Un número alto puede indicar documentos muy cortos, muy específicos, o que el parámetro min_cluster_size es demasiado grande.',
        range: '< 10% del corpus: aceptable · > 25%: revisar parámetros HDBSCAN',
        source: 'BERTopic · HDBSCAN clustering',
      },
    },
    {
      id: 'language',
      show: langName != null,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>,
      value: `${langFlag ?? ''} ${langName ?? '—'}`,
      label: langPct != null ? `Idioma predominante (${langPct.toFixed(0)}%)` : 'Idioma predominante',
      quality: 'info',
      tooltip: {
        title: 'Idioma predominante del corpus',
        body: 'Idioma detectado en la mayor parte de los documentos tras el análisis de preprocesamiento. Fundamental para elegir el modelo de spaCy correcto en NER y los stopwords en vectorización.',
        source: 'Preprocesamiento (detección automática)',
      },
    },
    {
      id: 'duplicates',
      show: dupRemoved != null && dupRemoved > 0,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
      value: dupRemoved != null ? dupRemoved.toLocaleString('es-CO') : '—',
      label: dupRate != null ? `Duplicados eliminados (${dupRate.toFixed(0)}%)` : 'Duplicados eliminados',
      quality: dupQ,
      tooltip: {
        title: 'Duplicados eliminados en preprocesamiento',
        body: 'Número de documentos detectados como duplicados y removidos del corpus antes del análisis. Eliminar duplicados mejora la calidad del modelo al evitar sobrerepresentación de contenidos.',
        range: '< 5% del corpus: normal · > 20%: revisar fuente de datos',
        source: 'Preprocesamiento',
      },
    },
  ];

  const visibleMetrics = metrics.filter(m => m.show);
  if (visibleMetrics.length === 0) return null;

  return (
    // Contenedor con fondo sólido — sin opacidad para garantizar contraste predecible
    <div className="rounded-2xl border border-slate-600 bg-slate-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-violet-400" aria-hidden="true" />
        {/* Título de sección: slate-200 → contraste ≈ 10:1 sobre bg-slate-900 */}
        <p className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          Indicadores de calidad del análisis
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {visibleMetrics.map((m, i) => (
          <MetricChip
            key={m.id}
            metric={m}
            flipTooltip={i >= visibleMetrics.length - 3}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-32 rounded-2xl bg-slate-800/40" />
    <div className="h-64 rounded-xl bg-slate-800/30" />
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 rounded-xl bg-slate-800/30" />
      ))}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const GeneralDashboard: React.FC = () => {
  const [topicModel, setTopicModel] = useState<TopicModeling | null>(null);
  const [bertopic, setBertopic] = useState<BERTopicAnalysis | null>(null);
  const [prepSummary, setPrepSummary] = useState<PrepSummary | null>(null);
  const [topicList, setTopicList] = useState<TopicModelingListItem[]>([]);
  const [bertopicList, setBertopicList] = useState<BERTopicListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interaction state
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [clusterTabs, setClusterTabs] = useState<Record<number, ClusterTab>>({});
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const { filters, setSelectedTopicModel, setSelectedBertopic } = useFilter();

  useEffect(() => {
    if (!filters.selectedDatasetId) {
      setTopicModel(null);
      setBertopic(null);
      setPrepSummary(null);
      setTopicList([]);
      setBertopicList([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
      try {
        // Sequential calls with delay to avoid 429 on free-tier hosting
        const rawTopicList = await publicTopicModelingService.getTopicModelings(filters.selectedDatasetId!);
        await delay(350);
        const rawBertopicList = await publicBertopicService.getBERTopicAnalyses(filters.selectedDatasetId!);
        await delay(350);
        const prepList = await publicDataPreparationService.getPreparations(filters.selectedDatasetId!);

        // Sort alphabetically for consistent selection order
        const sortedTopics  = [...rawTopicList].sort((a, b) => a.name.localeCompare(b.name));
        const sortedBertopic = [...rawBertopicList].sort((a, b) => a.name.localeCompare(b.name));

        // Resolve which analysis to show: explicit ID from context, or first completed alphabetically
        const topicId   = filters.selectedTopicModelId;
        const bertopicId = filters.selectedBertopicId;
        const ctm = topicId
          ? sortedTopics.find(t => t.id === topicId)
          : sortedTopics.find(t => t.status === 'completed');
        const cbt = bertopicId
          ? sortedBertopic.find(b => b.id === bertopicId)
          : sortedBertopic.find(b => b.status === 'completed');

        // Use first completed preparation (sorted: most recently created from API is typically first)
        const completedPrep = prepList.find(p => p.status === 'completed') ?? null;

        // Sequential detail calls with delay to avoid 429
        const td = ctm ? await publicTopicModelingService.getTopicModelingById(ctm.id) : null;
        if (ctm) await delay(350);
        const bd = cbt ? await publicBertopicService.getBERTopicById(cbt.id) : null;
        if (cbt) await delay(350);
        const prepDetail = completedPrep ? await publicDataPreparationService.getPreparation(completedPrep.id) : null;

        if (!cancelled) {
          setTopicList(sortedTopics);
          setBertopicList(sortedBertopic);
          setTopicModel(td);
          setBertopic(bd);
          setPrepSummary(prepDetail ? {
            files_processed: prepDetail.files_processed ?? 0,
            files_omitted: prepDetail.files_omitted ?? 0,
            duplicates_removed: prepDetail.duplicates_removed ?? 0,
            predominant_language: prepDetail.predominant_language ?? '',
            predominant_language_percentage: prepDetail.predominant_language_percentage ?? 0,
          } : null);

          // Auto-select first completed if no explicit ID was set
          if (!topicId && ctm) setSelectedTopicModel(ctm.id);
          if (!bertopicId && cbt) setSelectedBertopic(cbt.id);
        }
      } catch {
        if (!cancelled) setError('No se pudo cargar el landscape. Verifica la conexión con el backend.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.selectedDatasetId, filters.selectedTopicModelId, filters.selectedBertopicId]);

  // Merge topics from LDA + BERTopic (prefer LDA)
  const enrichedTopics = useMemo((): EnrichedTopic[] => {
    const out: EnrichedTopic[] = [];
    if (topicModel?.topics?.length) {
      topicModel.topics.forEach(t => {
        const dist = topicModel.topic_distribution?.find(d => d.topic_id === t.topic_id);
        out.push({
          id: t.topic_id,
          label: t.topic_label,
          words: t.words,
          numDocuments: dist?.document_count ?? 0,
          categoryId: classifyTopic(t.words.map(w => w.word)),
          source: 'lda',
          svgX: 0,
          svgY: 0,
        });
      });
    } else if (bertopic?.topics?.length) {
      bertopic.topics.forEach(t => {
        out.push({
          id: t.topic_id + 10000,
          label: t.topic_label,
          words: t.words,
          numDocuments: t.num_documents,
          categoryId: classifyTopic(t.words.map(w => w.word)),
          source: 'bertopic',
          svgX: 0,
          svgY: 0,
        });
      });
    }
    return out;
  }, [topicModel, bertopic]);

  const topicsByCategory = useMemo(() => {
    const map: Record<string, EnrichedTopic[]> = {};
    FACTOR_CATEGORIES.forEach(c => { map[c.id] = []; });
    enrichedTopics.forEach(t => { (map[t.categoryId] ?? map['infraestructura']).push(t); });
    return map;
  }, [enrichedTopics]);

  // All document-topic assignments
  const docTopics = useMemo((): DocumentTopicItem[] => {
    if (topicModel?.document_topics?.length) return topicModel.document_topics as DocumentTopicItem[];
    if (bertopic?.document_topics?.length) return bertopic.document_topics as DocumentTopicItem[];
    return [];
  }, [topicModel, bertopic]);

  const totalDocs = topicModel?.documents_processed ?? bertopic?.documents_processed ?? 0;
  const totalTopics = enrichedTopics.length;
  const sourceLabel = topicModel
    ? `${topicModel.algorithm_display ?? topicModel.algorithm?.toUpperCase()} · ${topicModel.source_name}`
    : bertopic
    ? `BERTopic · ${bertopic.source_name}`
    : null;
  const datasetName = filters.selectedDataset?.name ?? 'dataset';

  const handleClusterTabChange = useCallback((topicId: number, tab: ClusterTab) => {
    setClusterTabs(prev => ({ ...prev, [topicId]: tab }));
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!filters.selectedDatasetId) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
          <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Selecciona un Dataset</h3>
        <p className="text-slate-400 text-sm">Usa el selector en el panel lateral izquierdo.</p>
      </div>
    </div>
  );

  if (isLoading) return <LoadingSkeleton />;

  if (error) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-slate-300">{error}</p>
      </div>
    </div>
  );

  if (!topicModel && !bertopic) return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-white">Resumen · Science Mapping</h2></div>
      <div className="p-8 rounded-xl bg-slate-800/30 border border-slate-700/50 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Sin datos para este dataset</h3>
        <p className="text-slate-400 max-w-md mx-auto">
          Aún no hay análisis de Modelado de Temas o BERTopic completados para el dataset seleccionado.
          Crea un análisis desde Administración para visualizar el Science Mapping.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-7">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/8 to-violet-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 tracking-wide uppercase">
                Science Mapping
              </span>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300">
                OE3
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white leading-tight">
              Landscape de la TD en Educación Superior
            </h2>
            <p className="mt-1 text-sm text-slate-300 max-w-xl">
              Mapa de conocimiento consolidado identificado mediante análisis de temas
              sobre el corpus de literatura académica.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {[
              { label: 'Temas', value: totalTopics || '—', color: 'text-cyan-300' },
              { label: 'Documentos', value: totalDocs ? totalDocs.toLocaleString() : '—', color: 'text-violet-300' },
              { label: 'Categorías', value: 6, color: 'text-emerald-300' },
            ].map(s => (
              <div key={s.label}
                className="text-center px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            ))}
            {/* Export button */}
            {enrichedTopics.length > 0 && (
              <ExportMenu
                topics={enrichedTopics}
                topicsByCategory={topicsByCategory}
                docTopics={docTopics}
                topicModel={topicModel}
                bertopic={bertopic}
                datasetName={datasetName}
              />
            )}
            {/* TRANS-2: PDF Report Export */}
            {enrichedTopics.length > 0 && (
              <button
                onClick={async () => {
                  // Ensure executive summary is loaded
                  let summary = executiveSummary;
                  if (!summary && topicModel) {
                    try { summary = await publicTopicModelingService.getExecutiveSummary(topicModel.id); setExecutiveSummary(summary); } catch { /* ok */ }
                  }
                  const date = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
                  const cats = FACTOR_CATEGORIES.map(fc => {
                    const catTopics = enrichedTopics.filter(t => t.categoryId === fc.id);
                    const terms = catTopics.flatMap(t => (t.words || []).slice(0, 3).map(w => w.word || w)).join(', ');
                    return `<tr><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;color:${fc.color};font-weight:600;">${fc.label}</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;">${catTopics.length} tópicos</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${terms}</td></tr>`;
                  }).join('');
                  const topicRows = enrichedTopics.slice(0, 20).map(t => {
                    const wordsStr = (t.words || []).slice(0, 7).map(w => w.word || w).join(', ');
                    const cat = FACTOR_CATEGORIES.find(fc => fc.id === t.categoryId);
                    return `<tr><td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:13px;">${t.label || `Tópico ${t.id}`}</td><td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:${cat?.color || '#94a3b8'};">${cat?.shortLabel || t.categoryId}</td><td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;">${wordsStr}</td><td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:center;">${t.numDocuments}</td></tr>`;
                  }).join('');
                  const summaryHtml = summary
                    ? summary.summary_paragraphs.map(p => `<p style="margin:8px 0;line-height:1.6;font-size:13px;">${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`).join('')
                    : '';
                  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte — ${datasetName}</title><style>
                    body{font-family:system-ui,sans-serif;margin:0;padding:24px;color:#1e293b;background:#fff;}
                    h1{font-size:22px;color:#0f172a;margin:0 0 4px;}
                    h2{font-size:16px;color:#0f172a;margin:20px 0 8px;border-bottom:2px solid #e2e8f0;padding-bottom:6px;}
                    h3{font-size:14px;color:#334155;margin:12px 0 6px;}
                    table{width:100%;border-collapse:collapse;margin:8px 0;}
                    th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:2px solid #e2e8f0;}
                    .header{border-bottom:3px solid #0891b2;padding-bottom:12px;margin-bottom:20px;}
                    .meta{color:#64748b;font-size:13px;margin:4px 0;}
                    .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:12px 0;}
                    .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;}
                    .kpi-val{font-size:20px;font-weight:700;color:#0891b2;}
                    .kpi-lbl{font-size:11px;color:#64748b;margin-top:2px;}
                    .summary-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px;margin:12px 0;}
                    @media print{body{padding:12px;}.no-print{display:none!important;}}
                  </style></head><body>
                    <div class="header">
                      <h1>Reporte de Análisis — ${datasetName}</h1>
                      <p class="meta">Generado: ${date}</p>
                      <p class="meta">Algoritmo: ${topicModel?.algorithm_display ?? topicModel?.algorithm ?? 'BERTopic'} · ${totalTopics} tópicos · ${totalDocs.toLocaleString()} documentos</p>
                    </div>
                    <div class="kpi-grid">
                      <div class="kpi"><div class="kpi-val">${totalTopics}</div><div class="kpi-lbl">Tópicos</div></div>
                      <div class="kpi"><div class="kpi-val">${totalDocs.toLocaleString()}</div><div class="kpi-lbl">Documentos</div></div>
                      <div class="kpi"><div class="kpi-val">${summary?.oe3_coverage ?? '—'}/6</div><div class="kpi-lbl">Cobertura OE3</div></div>
                      <div class="kpi"><div class="kpi-val">${(topicModel?.coherence_score ?? null) != null ? (topicModel!.coherence_score!).toFixed(3) : '—'}</div><div class="kpi-lbl">Coherencia</div></div>
                    </div>
                    ${summaryHtml ? `<h2>Resumen Ejecutivo</h2><div class="summary-box">${summaryHtml}</div>` : ''}
                    <h2>Distribución por Factor OE3</h2>
                    <table><thead><tr><th>Categoría</th><th>Tópicos</th><th>Términos representativos</th></tr></thead><tbody>${cats}</tbody></table>
                    <h2>Tópicos Identificados${enrichedTopics.length > 20 ? ' (primeros 20)' : ''}</h2>
                    <table><thead><tr><th>Tópico</th><th>Categoría</th><th>Palabras clave</th><th>Docs</th></tr></thead><tbody>${topicRows}</tbody></table>
                    <h2>Metodología</h2>
                    <p style="font-size:13px;color:#475569;line-height:1.6;">Los temas se extraen mediante modelos de modelado de temas (LDA / NMF / LSA) y BERTopic aplicados al corpus preprocesado. La clasificación en categorías factoriales se realiza automáticamente por coincidencia semántica con los descriptores del marco OE3.</p>
                  </body></html>`;
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(html);
                    win.document.close();
                    win.focus();
                    setTimeout(() => win.print(), 800);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-sm font-semibold transition-all"
                title="Exportar reporte como PDF"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Analysis Selector Bar ── */}
      {(topicList.length > 1 || bertopicList.length > 1) && (
        // bg-slate-900 sólido + border-slate-600 → fondo predecible para contraste
        <div className="flex flex-wrap gap-4 p-5 rounded-xl bg-slate-900 border border-slate-600">
          {topicList.length > 1 && (
            <div className="flex flex-col gap-1.5 min-w-[220px] flex-1">
              {/* Label visible: 14px (text-sm), slate-200 → ≈ 10:1 contraste */}
              <label
                htmlFor="select-topic-model"
                className="text-sm font-semibold text-slate-200 whitespace-nowrap"
              >
                Modelo de Temas
              </label>
              <select
                id="select-topic-model"
                value={filters.selectedTopicModelId ?? topicModel?.id ?? ''}
                onChange={e => setSelectedTopicModel(Number(e.target.value))}
                // text-sm (14px) + text-white sobre bg-slate-800 → ≈ 13:1 contraste
                // border-slate-500 sólido → visible sin depender de opacidad
                // focus ring 2px cyan con offset — cumple WCAG 2.4.11 (foco visible)
                // min-h-[44px] — cumple touch target WCAG 2.5.5 + Apple HIG
                className="min-h-[44px] bg-slate-800 border border-slate-500 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 focus:border-emerald-400 cursor-pointer transition-colors hover:border-slate-400"
              >
                {topicList.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.algorithm_display})</option>
                ))}
              </select>
            </div>
          )}
          {bertopicList.length > 1 && (
            <div className="flex flex-col gap-1.5 min-w-[220px] flex-1">
              <label
                htmlFor="select-bertopic"
                className="text-sm font-semibold text-slate-200 whitespace-nowrap"
              >
                Modelo BERTopic
              </label>
              <select
                id="select-bertopic"
                value={filters.selectedBertopicId ?? bertopic?.id ?? ''}
                onChange={e => setSelectedBertopic(Number(e.target.value))}
                className="min-h-[44px] bg-slate-800 border border-slate-500 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900 focus:border-amber-400 cursor-pointer transition-colors hover:border-slate-400"
              >
                {bertopicList.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Metrics Strip ── */}
      <MetricsStrip
        topicModel={topicModel}
        bertopic={bertopic}
        enrichedTopics={enrichedTopics}
        prepSummary={prepSummary}
      />

      {/* ── Category Filter Indicator ── */}
      {activeCategoryFilter && (() => {
        const cat = CAT_BY_ID[activeCategoryFilter];
        const catTopics = topicsByCategory[activeCategoryFilter] ?? [];
        const catDocs = catTopics.reduce((s, t) => s + t.numDocuments, 0);
        return cat ? (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border"
            style={{ borderColor: `${cat.color}40`, backgroundColor: `${cat.color}10` }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: cat.color }} />
              <span className="text-sm font-medium text-white">
                Filtro activo: <span style={{ color: cat.color }}>{cat.label}</span>
              </span>
              <span className="text-xs text-slate-400">
                · {catTopics.length} tema{catTopics.length !== 1 ? 's' : ''} · {catDocs} docs
              </span>
            </div>
            <button
              onClick={() => setActiveCategoryFilter(null)}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtro
            </button>
          </div>
        ) : null;
      })()}

      {/* ── Knowledge Map ── */}
      <ChartCard
        title="Mapa de Conocimiento"
        subtitle={
          totalTopics
            ? `${totalTopics} temas — haz clic en un nodo para ver sus términos y documentos`
            : 'Ejecuta un análisis de temas para visualizar el mapa de conocimiento'
        }
        accentColor="cyan"
        size="lg"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        }
      >
        {totalTopics > 0 ? (
          <ScienceMap
            key={`${topicModel?.id ?? 0}-${bertopic?.id ?? 0}`}
            topics={enrichedTopics}
            docTopics={docTopics}
            highlightCategory={activeCategoryFilter}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {/* Ícono de empty state — bg sólido + borde visible */}
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-600 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            {/* Texto empty state: text-sm + slate-300 → contraste ≥ 7.5:1 */}
            <p className="text-slate-300 text-sm max-w-xs leading-relaxed">
              No se encontraron análisis de temas completados. Ejecuta un modelo LDA o BERTopic en la pestaña{' '}
              <span className="text-emerald-400 font-semibold">Modelado</span> para generar el mapa.
            </p>
          </div>
        )}
      </ChartCard>

      {/* ── Factor Categories ── */}
      <div>
        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2.5">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-violet-400" aria-hidden="true" />
          Categorías Factoriales de la TD en IES
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FACTOR_CATEGORIES.map(cat => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              topics={topicsByCategory[cat.id] ?? []}
              docTopics={docTopics}
              expanded={expandedCategoryId === cat.id}
              onToggle={() => setExpandedCategoryId(prev => prev === cat.id ? null : cat.id)}
              isFilterActive={activeCategoryFilter === cat.id}
              onFilterClick={() => setActiveCategoryFilter(prev => prev === cat.id ? null : cat.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Cluster Detail ── */}
      {enrichedTopics.length > 0 && (() => {
        const visibleTopics = activeCategoryFilter
          ? enrichedTopics.filter(t => t.categoryId === activeCategoryFilter)
          : enrichedTopics;
        const clusterSubtitle = activeCategoryFilter
          ? `${visibleTopics.length} clústeres de "${CAT_BY_ID[activeCategoryFilter]?.shortLabel ?? activeCategoryFilter}" — selecciona una pestaña para ver términos, documentos o detalles`
          : `${enrichedTopics.length} clústeres extraídos del corpus — selecciona una pestaña para ver términos, documentos o detalles`;
        return (
        <ChartCard
          title="Clústeres Temáticos Identificados"
          subtitle={clusterSubtitle}
          accentColor="purple"
          size="md"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-1">
            {visibleTopics.map(topic => (
              <ClusterCard
                key={topic.id}
                topic={topic}
                docTopics={docTopics}
                activeTab={clusterTabs[topic.id] ?? 'terms'}
                onTabChange={(tab) => handleClusterTabChange(topic.id, tab)}
              />
            ))}
          </div>
        </ChartCard>
        );
      })()}

      {/* ── VIZ-7: Sankey tópico → categoría ── */}
      {enrichedTopics.length >= 2 && (() => {
        const catNodes = FACTOR_CATEGORIES.map(c => ({ id: `cat:${c.id}` }));
        const topicNodes = enrichedTopics.map(t => ({ id: `t:${t.id}` }));
        const links = enrichedTopics.map(t => ({
          source: `t:${t.id}`,
          target: `cat:${t.categoryId}`,
          value: Math.max(t.numDocuments, 1),
        }));
        // Only include categories that have at least one topic
        const usedCatIds = new Set(enrichedTopics.map(t => t.categoryId));
        const filteredCatNodes = catNodes.filter(n => usedCatIds.has(n.id.replace('cat:', '')));
        const sankeyData = { nodes: [...topicNodes, ...filteredCatNodes], links };
        return (
          <ChartCard
            title="Flujo Tópico → Categoría OE3"
            subtitle="Sankey — cada banda muestra cómo los temas se asignan a las categorías del marco OE3"
            accentColor="purple"
            size="lg"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
          >
            <div style={{ height: Math.max(300, enrichedTopics.length * 28 + 60) }}>
              <ResponsiveSankey
                data={sankeyData as any}
                margin={{ top: 16, right: 160, bottom: 16, left: 160 }}
                align="justify"
                colors={(node: any) => {
                  const id: string = node.id || '';
                  if (id.startsWith('cat:')) {
                    const cat = FACTOR_CATEGORIES.find(c => c.id === id.replace('cat:', ''));
                    return cat?.color || '#64748b';
                  }
                  const tid = Number(id.replace('t:', ''));
                  const topic = enrichedTopics.find(t => t.id === tid);
                  return CAT_BY_ID[topic?.categoryId || '']?.color || '#8b5cf6';
                }}
                nodeOpacity={1}
                nodeHoverOpacity={1}
                nodeThickness={18}
                nodeInnerPadding={3}
                nodeSpacing={12}
                nodeBorderWidth={0}
                linkOpacity={0.4}
                linkHoverOpacity={0.7}
                linkContract={2}
                enableLinkGradient
                labelPosition="outside"
                labelOrientation="horizontal"
                labelPadding={14}
                labelTextColor={{ from: 'color', modifiers: [['brighter', 1]] } as any}
                theme={{
                  text: { fill: '#94a3b8', fontSize: 11 },
                  tooltip: { container: { background: '#1e293b', color: '#f8fafc', fontSize: 12, borderRadius: '8px', border: '1px solid #334155' } },
                }}
              />
            </div>
          </ChartCard>
        );
      })()}

      {/* ── VIZ-8: Radar chart por categoría ── */}
      {enrichedTopics.length >= 2 && (() => {
        const catMetrics = FACTOR_CATEGORIES.map(cat => {
          const catTopics = topicsByCategory[cat.id] ?? [];
          const docCount = catTopics.reduce((s, t) => s + t.numDocuments, 0);
          return {
            category: cat.shortLabel,
            'Nº Tópicos': catTopics.length,
            'Cobertura (docs)': docCount,
          };
        });
        const hasData = catMetrics.some(m => m['Nº Tópicos'] > 0);
        if (!hasData) return null;
        return (
          <ChartCard
            title="Radar de Cobertura por Categoría"
            subtitle="Comparativa de tópicos y documentos cubiertos por cada factor OE3"
            accentColor="cyan"
            size="md"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            }
          >
            <div style={{ height: '340px' }}>
              <ResponsiveRadar
                data={catMetrics as any}
                keys={['Nº Tópicos', 'Cobertura (docs)']}
                indexBy="category"
                maxValue="auto"
                margin={{ top: 50, right: 80, bottom: 50, left: 80 }}
                curve="linearClosed"
                borderWidth={2}
                borderColor={{ from: 'color' } as any}
                gridLevels={4}
                gridShape="circular"
                gridLabelOffset={18}
                enableDots
                dotSize={8}
                dotColor={{ from: 'color' } as any}
                dotBorderWidth={2}
                dotBorderColor={{ from: 'color', modifiers: [['darker', 0.5]] } as any}
                enableDotLabel={false}
                fillOpacity={0.25}
                blendMode="normal"
                animate
                motionConfig="gentle"
                colors={['#06b6d4', '#8b5cf6']}
                theme={{
                  text: { fill: '#94a3b8', fontSize: 11 },
                  grid: { line: { stroke: '#334155' } },
                  tooltip: { container: { background: '#1e293b', color: '#f8fafc', fontSize: 12, borderRadius: '8px', border: '1px solid #334155' } },
                }}
                legends={[{
                  anchor: 'top-left',
                  direction: 'column',
                  translateX: -40,
                  translateY: -30,
                  itemWidth: 90,
                  itemHeight: 18,
                  itemTextColor: '#94a3b8',
                  symbolSize: 10,
                  symbolShape: 'circle',
                  effects: [{ on: 'hover', style: { itemTextColor: '#fff' } }],
                }] as any}
              />
            </div>
          </ChartCard>
        );
      })()}

      {/* ── BE-7: Resumen Ejecutivo ── */}
      {topicModel && (
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/50">
          <button
            onClick={async () => {
              if (!showSummary) {
                setShowSummary(true);
                if (!executiveSummary) {
                  setSummaryLoading(true);
                  try {
                    const s = await publicTopicModelingService.getExecutiveSummary(topicModel.id);
                    setExecutiveSummary(s);
                  } catch { /* silent */ }
                  finally { setSummaryLoading(false); }
                }
              } else {
                setShowSummary(false);
              }
            }}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-semibold text-white">Resumen Ejecutivo</span>
              <span className="text-xs text-slate-400">Generado automáticamente desde el modelo de tópicos</span>
            </div>
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${showSummary ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showSummary && (
            <div className="px-5 pb-5 border-t border-slate-700/40">
              {summaryLoading ? (
                <div className="flex items-center gap-3 py-6 text-slate-400">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Generando resumen ejecutivo...
                </div>
              ) : !executiveSummary ? (
                <p className="py-4 text-slate-500 text-sm">No se pudo generar el resumen.</p>
              ) : (
                <div className="pt-4 space-y-3">
                  {/* Stats bar */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Tópicos', value: executiveSummary.n_topics, color: 'text-cyan-400' },
                      { label: 'Documentos', value: executiveSummary.n_docs.toLocaleString(), color: 'text-emerald-400' },
                      { label: 'Cobertura OE3', value: `${executiveSummary.oe3_coverage}/6`, color: 'text-violet-400' },
                      { label: 'Coherencia', value: executiveSummary.coherence_score != null ? executiveSummary.coherence_score.toFixed(3) : '—', color: (executiveSummary.coherence_score ?? 0) >= 0.5 ? 'text-emerald-400' : (executiveSummary.coherence_score ?? 0) >= 0.3 ? 'text-amber-400' : 'text-rose-400' },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 rounded-lg bg-slate-800/60 border border-slate-700/40">
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Paragraphs */}
                  {executiveSummary.summary_paragraphs.map((p, i) => (
                    <p key={i} className="text-sm text-slate-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: p.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }}
                    />
                  ))}
                  {/* Category distribution */}
                  {executiveSummary.category_distribution.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-700/40">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Distribución por categoría OE3</p>
                      <div className="space-y-1.5">
                        {executiveSummary.category_distribution.map(c => {
                          const pct = Math.round(c.count / executiveSummary.n_topics * 100);
                          const catColor = FACTOR_CATEGORIES.find(fc => fc.id === c.id)?.color || '#94a3b8';
                          return (
                            <div key={c.id} className="flex items-center gap-3">
                              <span className="text-xs text-slate-400 w-40 truncate">{c.label}</span>
                              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: catColor }} />
                              </div>
                              <span className="text-xs font-mono text-slate-300 w-6 text-right">{c.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Methodology Footer — bg sólido, texto legible ── */}
      <div className="p-5 rounded-xl bg-slate-800 border border-slate-600">
        <div className="flex items-start gap-3">
          {/* Icono: slate-300 → contraste ≥ 7.5:1 */}
          <svg className="w-5 h-5 text-slate-300 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            {/* Título: text-sm + text-white → ≈ 21:1 */}
            <p className="text-sm font-semibold text-white mb-1.5">Metodología del Landscape</p>
            {/* Cuerpo: text-sm (14px) + slate-300 → ≈ 7.5:1 (antes text-xs slate-400 = ≈ 3.5:1) */}
            <p className="text-sm text-slate-300 leading-relaxed">
              Los temas se extraen mediante modelos de{' '}
              <span className="text-white font-medium">modelado de temas</span> (LDA / NMF / LSA) y{' '}
              <span className="text-white font-medium">BERTopic</span> aplicados al corpus preprocesado.
              La clasificación en categorías factoriales se realiza automáticamente por coincidencia
              semántica con los descriptores del marco OE3.
              {sourceLabel && (
                <span className="block mt-1.5 text-slate-300">Fuente activa: <span className="text-white font-medium">{sourceLabel}</span></span>
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

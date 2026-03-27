/**
 * GeneralDashboard — Science Mapping / Knowledge Landscape
 *
 * OE3: Landscape consolidado de la Transformación Digital en Educación Superior.
 * Interactive: click nodes on the map, expandable category cards, cluster detail tabs,
 * per-item downloads, and full export (CSV / JSON / TSV).
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChartCard } from '../molecules';
import publicTopicModelingService from '../../services/publicTopicModelingService';
import publicBertopicService from '../../services/publicBertopicService';
import publicDataPreparationService from '../../services/publicDataPreparationService';
import { useFilter } from '../../contexts/FilterContext';
import { LANGUAGE_NAMES } from '../../services/dataPreparationService';
import type { TopicModeling, TopicModelingListItem } from '../../services/topicModelingService';
import type { BERTopicAnalysis, BERTopicListItem } from '../../services/bertopicService';

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
    bgClass: 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10',
    borderClass: 'border-cyan-500/40',
    badgeClass: 'bg-cyan-500/25 text-cyan-200',
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
    zoneX: 400, zoneY: 68,
  },
  {
    id: 'gobernanza',
    label: 'Gobernanza y Estrategia',
    shortLabel: 'Gobernanza',
    color: '#3b82f6',
    ringColor: 'rgba(59,130,246,0.18)',
    textClass: 'text-blue-300',
    bgClass: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10',
    borderClass: 'border-blue-500/40',
    badgeClass: 'bg-blue-500/25 text-blue-200',
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
    zoneX: 670, zoneY: 158,
  },
  {
    id: 'docencia',
    label: 'Formación Docente',
    shortLabel: 'Docencia',
    color: '#8b5cf6',
    ringColor: 'rgba(139,92,246,0.18)',
    textClass: 'text-violet-300',
    bgClass: 'bg-gradient-to-br from-violet-500/20 to-violet-600/10',
    borderClass: 'border-violet-500/40',
    badgeClass: 'bg-violet-500/25 text-violet-200',
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
    zoneX: 670, zoneY: 362,
  },
  {
    id: 'estudiante',
    label: 'Experiencia del Estudiante',
    shortLabel: 'Estudiante',
    color: '#10b981',
    ringColor: 'rgba(16,185,129,0.18)',
    textClass: 'text-emerald-300',
    bgClass: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10',
    borderClass: 'border-emerald-500/40',
    badgeClass: 'bg-emerald-500/25 text-emerald-200',
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
    zoneX: 400, zoneY: 452,
  },
  {
    id: 'cultura',
    label: 'Cambio Cultural',
    shortLabel: 'Cultura',
    color: '#f59e0b',
    ringColor: 'rgba(245,158,11,0.18)',
    textClass: 'text-amber-300',
    bgClass: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10',
    borderClass: 'border-amber-500/40',
    badgeClass: 'bg-amber-500/25 text-amber-200',
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
    zoneX: 130, zoneY: 362,
  },
  {
    id: 'calidad',
    label: 'Evaluación y Calidad',
    shortLabel: 'Calidad',
    color: '#ec4899',
    ringColor: 'rgba(236,72,153,0.18)',
    textClass: 'text-pink-300',
    bgClass: 'bg-gradient-to-br from-pink-500/20 to-pink-600/10',
    borderClass: 'border-pink-500/40',
    badgeClass: 'bg-pink-500/25 text-pink-200',
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
    zoneX: 130, zoneY: 158,
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

function zoneBubblePositions(
  zoneX: number,
  zoneY: number,
  count: number,
): Array<{ x: number; y: number }> {
  if (count === 0) return [];
  if (count === 1) return [{ x: zoneX, y: zoneY }];
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const r = count <= 3 ? 32 : 44;
    return { x: zoneX + Math.cos(angle) * r, y: zoneY + Math.sin(angle) * r };
  });
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

// ─── Science Map SVG ──────────────────────────────────────────────────────────

const MAP_W = 800;
const MAP_H = 520;
const CX = 400;
const CY = 260;

interface ScienceMapProps {
  topics: EnrichedTopic[];
  onTopicHover: (id: number | null) => void;
  onTopicClick: (id: number | null, svgX: number, svgY: number) => void;
  hoveredId: number | null;
  selectedId: number | null;
}

const ScienceMap: React.FC<ScienceMapProps> = ({ topics, onTopicHover, onTopicClick, hoveredId, selectedId }) => {
  const topicsByCategory = useMemo(() => {
    const map: Record<string, EnrichedTopic[]> = {};
    FACTOR_CATEGORIES.forEach(c => { map[c.id] = []; });
    topics.forEach(t => { (map[t.categoryId] ?? map['infraestructura']).push(t); });
    return map;
  }, [topics]);

  const totalDocs = topics.reduce((s, t) => s + t.numDocuments, 0) || 1;

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      className="w-full h-auto"
      aria-label="Mapa de conocimiento — Transformación Digital en IES"
      onClick={(e) => {
        // Click on SVG background deselects
        if ((e.target as SVGElement).tagName === 'svg') onTopicClick(null, 0, 0);
      }}
    >
      {/* ── Soft zone blobs ── */}
      {FACTOR_CATEGORIES.map(cat => (
        <ellipse
          key={`blob-${cat.id}`}
          cx={cat.zoneX} cy={cat.zoneY}
          rx={92} ry={72}
          fill={cat.ringColor}
          stroke={cat.color}
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.7}
        />
      ))}

      {/* ── Spokes from center to each zone ── */}
      {FACTOR_CATEGORIES.map(cat => (
        <line
          key={`spoke-${cat.id}`}
          x1={CX} y1={CY}
          x2={cat.zoneX} y2={cat.zoneY}
          stroke={cat.color}
          strokeWidth={1.2}
          strokeOpacity={0.25}
          strokeDasharray="6 4"
        />
      ))}

      {/* ── Center hub ── */}
      <circle cx={CX} cy={CY} r={46} fill="rgba(15,23,42,0.9)"
        stroke="rgba(148,163,184,0.4)" strokeWidth={1.5} />
      <circle cx={CX} cy={CY} r={40} fill="rgba(30,41,59,0.8)" />
      <text x={CX} y={CY - 9} textAnchor="middle" fill="white"
        fontSize={10} fontWeight={700} letterSpacing={0.5}>TD en</text>
      <text x={CX} y={CY + 5} textAnchor="middle" fill="white"
        fontSize={10} fontWeight={700} letterSpacing={0.5}>Educación</text>
      <text x={CX} y={CY + 18} textAnchor="middle" fill="rgba(148,163,184,0.9)"
        fontSize={8}>Superior</text>

      {/* ── Category hubs ── */}
      {FACTOR_CATEGORIES.map(cat => {
        const catTopics = topicsByCategory[cat.id] ?? [];
        return (
          <g key={`hub-${cat.id}`}>
            <circle cx={cat.zoneX} cy={cat.zoneY} r={28}
              fill="rgba(15,23,42,0.85)"
              stroke={cat.color} strokeWidth={2} />
            <text x={cat.zoneX} y={cat.zoneY + 4}
              textAnchor="middle" fill={cat.color}
              fontSize={9} fontWeight={700}>
              {cat.shortLabel.length > 12 ? cat.shortLabel.slice(0, 11) + '…' : cat.shortLabel}
            </text>
            {catTopics.length > 0 && (
              <text x={cat.zoneX} y={cat.zoneY + 15}
                textAnchor="middle" fill="rgba(148,163,184,0.8)"
                fontSize={7}>
                {catTopics.length} tema{catTopics.length !== 1 ? 's' : ''}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Topic bubbles ── */}
      {FACTOR_CATEGORIES.map(cat => {
        const catTopics = topicsByCategory[cat.id] ?? [];
        const positions = zoneBubblePositions(cat.zoneX, cat.zoneY, catTopics.length);
        return catTopics.map((topic, i) => {
          const pos = positions[i];
          if (!pos) return null;
          const r = Math.max(14, Math.min(24, 14 + (topic.numDocuments / totalDocs) * 80));
          const isHovered = hoveredId === topic.id;
          const isSelected = selectedId === topic.id;
          const topWord = topic.words[0]?.word ?? topic.label;
          const label = topWord.length > 8 ? topWord.slice(0, 7) + '…' : topWord;

          return (
            <g key={`topic-${topic.id}`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onTopicHover(topic.id)}
              onMouseLeave={() => onTopicHover(null)}
              onClick={(e) => { e.stopPropagation(); onTopicClick(topic.id, pos.x, pos.y); }}>
              {/* connector from hub to bubble */}
              <line
                x1={cat.zoneX} y1={cat.zoneY}
                x2={pos.x} y2={pos.y}
                stroke={cat.color} strokeWidth={1}
                strokeOpacity={(isHovered || isSelected) ? 0.7 : 0.2} />
              {/* selection ring */}
              {isSelected && (
                <circle cx={pos.x} cy={pos.y} r={r + 5}
                  fill="none"
                  stroke={cat.color}
                  strokeWidth={2}
                  strokeDasharray="3 2"
                  opacity={0.8} />
              )}
              <circle
                cx={pos.x} cy={pos.y} r={r}
                fill={(isHovered || isSelected) ? cat.color : 'rgba(15,23,42,0.85)'}
                stroke={cat.color}
                strokeWidth={(isHovered || isSelected) ? 2.5 : 1.5}
                opacity={(isHovered || isSelected) ? 1 : 0.85}
              />
              <text x={pos.x} y={pos.y + 3.5}
                textAnchor="middle"
                fill={(isHovered || isSelected) ? 'white' : cat.color}
                fontSize={8} fontWeight={600}>
                {label}
              </text>
            </g>
          );
        });
      })}

      {/* ── Legend strip at bottom ── */}
      {FACTOR_CATEGORIES.map((cat, i) => (
        <g key={`leg-${cat.id}`}
          transform={`translate(${40 + i * 127}, 496)`}>
          <circle r={5} cx={5} cy={4} fill={cat.color} />
          <text x={14} y={8} fill="rgba(148,163,184,0.85)" fontSize={8}>
            {cat.shortLabel}
          </text>
        </g>
      ))}
    </svg>
  );
};

// ─── Positioned Topic Panel (follows node position) ───────────────────────────

interface TopicPanelProps {
  topic: EnrichedTopic | null;
  svgX: number; // 0-800
  svgY: number; // 0-520
  mode: 'hover' | 'selected';
  onClose?: () => void;
  docTopics: DocumentTopicItem[];
}

const TopicPanel: React.FC<TopicPanelProps> = ({ topic, svgX, svgY, mode, onClose, docTopics }) => {
  if (!topic) return null;
  const cat = CAT_BY_ID[topic.categoryId];

  // Convert SVG coords to % — adjust so panel doesn't go offscreen
  const xPct = (svgX / MAP_W) * 100;
  const yPct = (svgY / MAP_H) * 100;
  const showLeft = xPct > 62;
  const showAbove = yPct > 60;

  const topDocs = docTopics
    .filter(d => (d.dominant_topic ?? d.topic_id) === topic.id)
    .slice(0, 5);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: showLeft ? undefined : `${xPct}%`,
    right: showLeft ? `${100 - xPct}%` : undefined,
    top: showAbove ? undefined : `${yPct}%`,
    bottom: showAbove ? `${100 - yPct}%` : undefined,
    transform: 'translate(-50%, 8px)',
    zIndex: 20,
    minWidth: mode === 'selected' ? 220 : 200,
    maxWidth: 260,
  };

  return (
    <div
      className={`rounded-xl border ${cat.borderClass} ${cat.bgClass} p-3 shadow-2xl backdrop-blur-sm pointer-events-${mode === 'hover' ? 'none' : 'auto'}`}
      style={style}
    >
      <div className="flex items-start justify-between mb-1 gap-1">
        <div className={`text-xs font-bold ${cat.textClass} truncate flex-1`}>{topic.label}</div>
        {mode === 'selected' && onClose && (
          <button onClick={onClose} aria-label="Cerrar panel" className="text-slate-400 hover:text-slate-200 shrink-0 ml-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className={`inline-block text-xs px-2 py-0.5 rounded-full ${cat.badgeClass} mb-2`}>{cat.shortLabel}</div>

      {/* Terms */}
      <div className="space-y-1 mb-2">
        {topic.words.slice(0, mode === 'selected' ? 8 : 6).map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 text-xs text-slate-200 truncate">{w.word}</div>
            <div className="w-14 h-1.5 rounded-full bg-slate-700/60">
              <div className="h-1.5 rounded-full" style={{ width: `${Math.round(w.weight * 100)}%`, backgroundColor: cat.color }} />
            </div>
            <span className="text-xs text-slate-400 w-7 text-right">{(w.weight * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      {/* Top docs (only in selected mode) */}
      {mode === 'selected' && topDocs.length > 0 && (
        <div className="border-t border-slate-700/40 pt-2 mt-1">
          <p className="text-xs text-slate-400 mb-1 font-medium">Top documentos</p>
          <ul className="space-y-0.5">
            {topDocs.map((d, i) => (
              <li key={i} className="text-xs text-slate-300 truncate" title={d.document_name}>
                <span className={`${cat.textClass} font-medium`}>{i + 1}.</span> {d.document_name ?? `Doc ${d.document_id}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {topic.numDocuments > 0 && (
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {topic.numDocuments} documento{topic.numDocuments !== 1 ? 's' : ''}
        </div>
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
}

const CategoryCard: React.FC<CategoryCardProps> = ({ cat, topics, docTopics, expanded, onToggle }) => {
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
    <div className={`rounded-xl border ${cat.borderClass} ${cat.bgClass} transition-all duration-200`}>
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cat.badgeClass}`}>
            {cat.icon}
          </div>
          <div className="flex items-center gap-2">
            {topics.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${cat.badgeClass} font-medium`}>
                {topics.length} tema{topics.length !== 1 ? 's' : ''}
              </span>
            )}
            {/* Download button */}
            {topics.length > 0 && (
              <button
                onClick={handleDownload}
                title="Descargar CSV de esta categoría"
                className={`w-7 h-7 flex items-center justify-center rounded-lg ${cat.badgeClass} hover:opacity-80 transition-opacity`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <h4 className={`text-sm font-semibold ${cat.textClass} mb-1`}>{cat.label}</h4>
        <p className="text-xs text-slate-300 mb-3 leading-relaxed">{cat.description}</p>

        {topTerms.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {topTerms.map(term => (
              <span key={term} className={`text-xs px-2 py-0.5 rounded-md border ${cat.borderClass} text-slate-200 bg-slate-800/50`}>
                {term}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Sin temas asignados aún</p>
        )}

        {/* Toggle docs button */}
        {topDocs.length > 0 && (
          <button
            onClick={onToggle}
            className={`mt-3 w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium ${cat.badgeClass} hover:opacity-80 transition-opacity`}
          >
            <span>Top documentos ({topDocs.length})</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Expandable doc list */}
      {expanded && topDocs.length > 0 && (
        <div className={`border-t ${cat.borderClass} px-5 pb-4 pt-3`}>
          <p className="text-xs text-slate-400 font-medium mb-2">Documentos representativos</p>
          <ul className="space-y-1">
            {topDocs.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className={`${cat.textClass} font-bold shrink-0`}>{i + 1}.</span>
                <span className="text-slate-200 break-all leading-relaxed"
                  title={d.document_name}
                >
                  {d.document_name ?? `Documento ${d.document_id}`}
                </span>
                {(d.dominant_topic_weight ?? d.topic_weight) != null && (
                  <span className="text-slate-400 shrink-0 ml-auto">
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
    <div className={`rounded-xl border ${cat.borderClass} bg-slate-800 flex flex-col`}>
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between mb-2">
          <h5 className="text-xs font-semibold text-white truncate flex-1 mr-2">{topic.label}</h5>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full ${cat.badgeClass}`}>{cat.shortLabel}</span>
            <button
              onClick={handleDownload}
              title="Descargar CSV de este clúster"
              className={`w-6 h-6 flex items-center justify-center rounded-md ${cat.badgeClass} hover:opacity-80 transition-opacity`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? `${cat.badgeClass} border ${cat.borderClass}`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pb-4 pt-2 flex-1">
        {/* Terms tab */}
        {activeTab === 'terms' && (
          <div className="space-y-1.5">
            {topic.words.slice(0, 8).map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-slate-300 w-24 truncate shrink-0">{w.word}</span>
                <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(w.weight / maxW) * 100}%`, backgroundColor: cat.color, opacity: 0.85 }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-8 text-right shrink-0">
                  {(w.weight * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Documents tab */}
        {activeTab === 'docs' && (
          topicDocs.length > 0 ? (
            <ul className="space-y-1">
              {topicDocs.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className={`${cat.textClass} font-bold shrink-0`}>{i + 1}.</span>
                  <span className="text-slate-200 break-all leading-relaxed flex-1" title={d.document_name}>
                    {d.document_name ?? `Documento ${d.document_id}`}
                  </span>
                  {(d.dominant_topic_weight ?? d.topic_weight) != null && (
                    <span className="text-slate-400 shrink-0">
                      {((d.dominant_topic_weight ?? d.topic_weight ?? 0) * 100).toFixed(0)}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic py-2">
              No hay información de documentos disponible para este clúster.
            </p>
          )
        )}

        {/* Details tab */}
        {activeTab === 'details' && (
          <div className="space-y-2 text-xs">
            {[
              { label: 'Fuente del modelo', value: topic.source.toUpperCase() },
              { label: 'Categoría OE3', value: CAT_BY_ID[topic.categoryId]?.label ?? topic.categoryId },
              { label: 'Documentos dominantes', value: topic.numDocuments > 0 ? topic.numDocuments.toLocaleString() : 'N/A' },
              { label: 'Términos en el clúster', value: topic.words.length },
              { label: 'Peso máximo de término', value: `${(topic.words[0]?.weight * 100 ?? 0).toFixed(2)}%` },
              { label: 'Peso mínimo de término', value: `${(topic.words[topic.words.length - 1]?.weight * 100 ?? 0).toFixed(2)}%` },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-start gap-2">
                <span className="text-slate-400">{item.label}</span>
                <span className={`${cat.textClass} font-medium text-right`}>{String(item.value)}</span>
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

const Q = {
  good:    { border: 'border-l-emerald-400', text: 'text-emerald-300', dot: 'bg-emerald-400', badge: 'text-emerald-400/80 border-emerald-500/30' },
  average: { border: 'border-l-amber-400',   text: 'text-amber-300',   dot: 'bg-amber-400',   badge: 'text-amber-400/80 border-amber-500/30' },
  poor:    { border: 'border-l-rose-400',     text: 'text-rose-300',     dot: 'bg-rose-400',    badge: 'text-rose-400/80 border-rose-500/30' },
  neutral: { border: 'border-l-slate-500',    text: 'text-slate-200',    dot: 'bg-slate-400',   badge: 'text-slate-400/90 border-slate-500/40' },
  info:    { border: 'border-l-blue-400',     text: 'text-blue-300',     dot: 'bg-blue-400',    badge: 'text-blue-400/80 border-blue-500/30' },
};

const MetricChip: React.FC<{ metric: MetricItem; flipTooltip?: boolean }> = ({ metric, flipTooltip }) => {
  const q = Q[metric.quality];
  return (
    <div className={`group relative flex-1 min-w-[120px] max-w-[200px] rounded-xl bg-slate-800/30 border border-slate-700/40 border-l-2 ${q.border} px-4 py-3 cursor-default select-none`}>
      {/* Icon + info badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400">{metric.icon}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${q.badge}`}>ℹ</span>
      </div>
      {/* Value */}
      <div className={`text-lg font-bold leading-tight ${q.text} mb-0.5 truncate`}>{metric.value}</div>
      {/* Label */}
      <div className="text-xs text-slate-400 leading-snug">{metric.label}</div>

      {/* Tooltip — aparece abajo por defecto, arriba si flipTooltip */}
      <div className={`
        hidden group-hover:block absolute z-50 w-64
        ${flipTooltip ? 'bottom-full mb-2' : 'top-full mt-2'}
        left-0 rounded-xl border border-slate-700/70 bg-slate-900/98 backdrop-blur-sm shadow-2xl p-3.5 pointer-events-none
      `}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${q.dot} shrink-0`} />
          <p className={`text-xs font-semibold ${q.text}`}>{metric.tooltip.title}</p>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-2">{metric.tooltip.body}</p>
        {metric.tooltip.range && (
          <div className="text-xs rounded-lg bg-slate-800/60 border border-slate-700/40 px-2.5 py-1.5 mb-1.5">
            <span className="text-slate-400">Rango ideal: </span>
            <span className="text-slate-200 font-medium">{metric.tooltip.range}</span>
          </div>
        )}
        {metric.tooltip.source && (
          <div className="text-xs text-slate-400 mt-1">
            Fuente: <span className="text-slate-300">{metric.tooltip.source}</span>
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
    <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-3.5 rounded-full bg-gradient-to-b from-cyan-400 to-violet-400" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Indicadores de calidad del análisis</p>
      </div>
      <div className="flex flex-wrap gap-2.5">
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
  const [hoveredTopicId, setHoveredTopicId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedTopicPos, setSelectedTopicPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [clusterTabs, setClusterTabs] = useState<Record<number, ClusterTab>>({});

  const { filters, setSelectedTopicModel, setSelectedBertopic } = useFilter();

  useEffect(() => {
    if (!filters.selectedDatasetId) {
      setTopicModel(null);
      setBertopic(null);
      setPrepSummary(null);
      setTopicList([]);
      setBertopicList([]);
      setIsLoading(false);
      setSelectedTopicId(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      setSelectedTopicId(null);
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

  const hoveredTopic = enrichedTopics.find(t => t.id === hoveredTopicId) ?? null;
  const selectedTopic = enrichedTopics.find(t => t.id === selectedTopicId) ?? null;

  const totalDocs = topicModel?.documents_processed ?? bertopic?.documents_processed ?? 0;
  const totalTopics = enrichedTopics.length;
  const sourceLabel = topicModel
    ? `${topicModel.algorithm_display ?? topicModel.algorithm?.toUpperCase()} · ${topicModel.source_name}`
    : bertopic
    ? `BERTopic · ${bertopic.source_name}`
    : null;
  const datasetName = filters.selectedDataset?.name ?? 'dataset';

  const handleTopicClick = useCallback((id: number | null, svgX: number, svgY: number) => {
    setSelectedTopicId(prev => (prev === id ? null : id));
    if (id !== null) setSelectedTopicPos({ x: svgX, y: svgY });
  }, []);

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
          </div>
        </div>
      </div>

      {/* ── Analysis Selector Bar ── */}
      {(topicList.length > 1 || bertopicList.length > 1) && (
        <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
          {topicList.length > 1 && (
            <div className="flex items-center gap-2 min-w-[220px] flex-1">
              <span className="text-xs text-slate-400 whitespace-nowrap font-medium">Modelo de Tema:</span>
              <select
                value={filters.selectedTopicModelId ?? topicModel?.id ?? ''}
                onChange={e => setSelectedTopicModel(Number(e.target.value))}
                className="flex-1 bg-slate-900/70 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 cursor-pointer"
              >
                {topicList.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.algorithm_display})</option>
                ))}
              </select>
            </div>
          )}
          {bertopicList.length > 1 && (
            <div className="flex items-center gap-2 min-w-[220px] flex-1">
              <span className="text-xs text-slate-400 whitespace-nowrap font-medium">BERTopic:</span>
              <select
                value={filters.selectedBertopicId ?? bertopic?.id ?? ''}
                onChange={e => setSelectedBertopic(Number(e.target.value))}
                className="flex-1 bg-slate-900/70 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 cursor-pointer"
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
          <div className="relative">
            <ScienceMap
              topics={enrichedTopics}
              onTopicHover={setHoveredTopicId}
              onTopicClick={handleTopicClick}
              hoveredId={hoveredTopicId}
              selectedId={selectedTopicId}
            />
            {/* Hover panel (pointer-events-none, no close button) */}
            {hoveredTopic && hoveredTopic.id !== selectedTopicId && (
              <TopicPanel
                topic={hoveredTopic}
                svgX={(() => {
                  // Recompute position for hovered topic
                  const cat = FACTOR_CATEGORIES.find(c => c.id === hoveredTopic.categoryId)!;
                  const catTopics = topicsByCategory[cat.id] ?? [];
                  const idx = catTopics.findIndex(t => t.id === hoveredTopic.id);
                  const positions = zoneBubblePositions(cat.zoneX, cat.zoneY, catTopics.length);
                  return positions[idx]?.x ?? cat.zoneX;
                })()}
                svgY={(() => {
                  const cat = FACTOR_CATEGORIES.find(c => c.id === hoveredTopic.categoryId)!;
                  const catTopics = topicsByCategory[cat.id] ?? [];
                  const idx = catTopics.findIndex(t => t.id === hoveredTopic.id);
                  const positions = zoneBubblePositions(cat.zoneX, cat.zoneY, catTopics.length);
                  return positions[idx]?.y ?? cat.zoneY;
                })()}
                mode="hover"
                docTopics={docTopics}
              />
            )}
            {/* Selected panel (interactive, with close button) */}
            {selectedTopic && (
              <TopicPanel
                topic={selectedTopic}
                svgX={selectedTopicPos.x}
                svgY={selectedTopicPos.y}
                mode="selected"
                onClose={() => setSelectedTopicId(null)}
                docTopics={docTopics}
              />
            )}
            {/* Hint */}
            {!selectedTopicId && (
              <p className="mt-2 text-center text-xs text-slate-400">
                Haz clic en un nodo para fijar el panel de detalle
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm max-w-xs">
              No se encontraron análisis de temas completados. Ejecuta un modelo LDA o BERTopic en la pestaña{' '}
              <span className="text-emerald-400">Modelado</span> para generar el mapa.
            </p>
          </div>
        )}
      </ChartCard>

      {/* ── Factor Categories ── */}
      <div>
        <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-violet-400" />
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
            />
          ))}
        </div>
      </div>

      {/* ── Cluster Detail ── */}
      {enrichedTopics.length > 0 && (
        <ChartCard
          title="Clústeres Temáticos Identificados"
          subtitle={`${enrichedTopics.length} clústeres extraídos del corpus — selecciona una pestaña para ver términos, documentos o detalles`}
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
            {enrichedTopics.map(topic => (
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
      )}

      {/* ── Methodology Footer ── */}
      <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-700/30">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-slate-300 mb-1">Metodología del Landscape</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Los temas se extraen mediante modelos de{' '}
              <span className="text-slate-300">modelado de temas</span> (LDA / NMF / LSA) y{' '}
              <span className="text-slate-300">BERTopic</span> aplicados al corpus preprocesado.
              La clasificación en categorías factoriales se realiza automáticamente por coincidencia
              semántica con los descriptores del marco OE3.
              {sourceLabel && (
                <span className="block mt-1 text-slate-400">Fuente activa: {sourceLabel}</span>
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

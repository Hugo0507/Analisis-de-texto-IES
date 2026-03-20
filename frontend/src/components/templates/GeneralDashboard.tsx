/**
 * GeneralDashboard — Science Mapping / Knowledge Landscape
 *
 * OE3: Landscape consolidado de la Transformación Digital en Educación Superior.
 * Renders a radial science map, factor-category cards, and cluster details
 * sourced from real topic-modelling and BERTopic analyses.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChartCard } from '../molecules';
import publicTopicModelingService from '../../services/publicTopicModelingService';
import publicBertopicService from '../../services/publicBertopicService';
import type { TopicModeling } from '../../services/topicModelingService';
import type { BERTopicAnalysis } from '../../services/bertopicService';

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
  zoneX: number; // SVG zone center X (800×520 viewBox)
  zoneY: number; // SVG zone center Y
}

const FACTOR_CATEGORIES: FactorCategory[] = [
  {
    id: 'infraestructura',
    label: 'Infraestructura Tecnológica',
    shortLabel: 'Infraestructura',
    color: '#06b6d4',
    ringColor: 'rgba(6,182,212,0.18)',
    textClass: 'text-cyan-300',
    bgClass: 'bg-gradient-to-br from-cyan-500/15 to-cyan-600/5',
    borderClass: 'border-cyan-500/35',
    badgeClass: 'bg-cyan-500/20 text-cyan-200',
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
    bgClass: 'bg-gradient-to-br from-blue-500/15 to-blue-600/5',
    borderClass: 'border-blue-500/35',
    badgeClass: 'bg-blue-500/20 text-blue-200',
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
    bgClass: 'bg-gradient-to-br from-violet-500/15 to-violet-600/5',
    borderClass: 'border-violet-500/35',
    badgeClass: 'bg-violet-500/20 text-violet-200',
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
    bgClass: 'bg-gradient-to-br from-emerald-500/15 to-emerald-600/5',
    borderClass: 'border-emerald-500/35',
    badgeClass: 'bg-emerald-500/20 text-emerald-200',
    keywords: ['student', 'learning', 'education', 'academic', 'curriculum', 'online',
               'e-learning', 'engagement', 'experience', 'achievement', 'performance',
               'estudiante', 'aprendizaje', 'educación', 'académico', 'currículo'],
    description: 'Impacto en el proceso de aprendizaje y experiencia estudiantil',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 14l9-5-9-5-9 5 9 5z" />
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
    bgClass: 'bg-gradient-to-br from-amber-500/15 to-amber-600/5',
    borderClass: 'border-amber-500/35',
    badgeClass: 'bg-amber-500/20 text-amber-200',
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
    bgClass: 'bg-gradient-to-br from-pink-500/15 to-pink-600/5',
    borderClass: 'border-pink-500/35',
    badgeClass: 'bg-pink-500/20 text-pink-200',
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

/** Distribute N topics in a circle around a zone center */
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

// ─── Science Map SVG ──────────────────────────────────────────────────────────

const MAP_W = 800;
const MAP_H = 520;
const CX = 400;
const CY = 260;

interface ScienceMapProps {
  topics: EnrichedTopic[];
  onTopicHover: (id: number | null) => void;
  hoveredId: number | null;
}

const ScienceMap: React.FC<ScienceMapProps> = ({ topics, onTopicHover, hoveredId }) => {
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
              {cat.shortLabel.length > 12
                ? cat.shortLabel.slice(0, 11) + '…'
                : cat.shortLabel}
            </text>
            {catTopics.length > 0 && (
              <text x={cat.zoneX} y={cat.zoneY + 15}
                textAnchor="middle" fill="rgba(148,163,184,0.8)"
                fontSize={7}>
                {catTopics.length} tópico{catTopics.length !== 1 ? 's' : ''}
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
          const topWord = topic.words[0]?.word ?? topic.label;
          const label = topWord.length > 8 ? topWord.slice(0, 7) + '…' : topWord;

          return (
            <g key={`topic-${topic.id}`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onTopicHover(topic.id)}
              onMouseLeave={() => onTopicHover(null)}>
              {/* connector from hub to bubble */}
              <line
                x1={cat.zoneX} y1={cat.zoneY}
                x2={pos.x} y2={pos.y}
                stroke={cat.color} strokeWidth={1}
                strokeOpacity={isHovered ? 0.6 : 0.2} />
              <circle
                cx={pos.x} cy={pos.y} r={r}
                fill={isHovered ? cat.color : 'rgba(15,23,42,0.85)'}
                stroke={cat.color}
                strokeWidth={isHovered ? 2.5 : 1.5}
                opacity={isHovered ? 1 : 0.85}
              />
              <text x={pos.x} y={pos.y + 3.5}
                textAnchor="middle"
                fill={isHovered ? 'white' : cat.color}
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

// ─── Topic Hover Panel ────────────────────────────────────────────────────────

interface HoverPanelProps {
  topic: EnrichedTopic | null;
}
const HoverPanel: React.FC<HoverPanelProps> = ({ topic }) => {
  if (!topic) return null;
  const cat = CAT_BY_ID[topic.categoryId];
  return (
    <div className={`absolute bottom-4 right-4 w-56 rounded-xl border ${cat.borderClass} ${cat.bgClass} p-3 shadow-xl backdrop-blur-sm z-10 transition-all`}>
      <div className={`text-xs font-bold ${cat.textClass} mb-1 truncate`}>{topic.label}</div>
      <div className={`inline-block text-xs px-2 py-0.5 rounded-full ${cat.badgeClass} mb-2`}>{cat.shortLabel}</div>
      <div className="space-y-1">
        {topic.words.slice(0, 6).map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 text-xs text-slate-300 truncate">{w.word}</div>
            <div className="w-14 h-1.5 rounded-full bg-slate-700">
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${Math.round(w.weight * 100)}%`, backgroundColor: cat.color }}
              />
            </div>
          </div>
        ))}
      </div>
      {topic.numDocuments > 0 && (
        <div className="mt-2 text-xs text-slate-500">{topic.numDocuments} documentos</div>
      )}
    </div>
  );
};

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-48 rounded-2xl bg-slate-800/40" />
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-28 rounded-xl bg-slate-800/30" />
      ))}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const GeneralDashboard: React.FC = () => {
  const [topicModel, setTopicModel] = useState<TopicModeling | null>(null);
  const [bertopic, setBertopic] = useState<BERTopicAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTopicId, setHoveredTopicId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [topicList, bertopicList] = await Promise.all([
          publicTopicModelingService.getTopicModelings(),
          publicBertopicService.getBERTopicAnalyses(),
        ]);
        const ctm = topicList.find(t => t.status === 'completed');
        const cbt = bertopicList.find(b => b.status === 'completed');
        const [td, bd] = await Promise.all([
          ctm ? publicTopicModelingService.getTopicModelingById(ctm.id) : Promise.resolve(null),
          cbt ? publicBertopicService.getBERTopicById(cbt.id) : Promise.resolve(null),
        ]);
        if (!cancelled) { setTopicModel(td); setBertopic(bd); }
      } catch {
        if (!cancelled) setError('No se pudo cargar el landscape. Verifica la conexión con el backend.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  /** Merge topics from LDA + BERTopic (prefer LDA; use BERTopic only if LDA absent) */
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

  const hoveredTopic = enrichedTopics.find(t => t.id === hoveredTopicId) ?? null;

  const totalDocs = topicModel?.documents_processed ?? bertopic?.documents_processed ?? 0;
  const totalTopics = enrichedTopics.length;
  const sourceLabel = topicModel
    ? `${topicModel.algorithm_display ?? topicModel.algorithm.toUpperCase()} · ${topicModel.source_name}`
    : bertopic
    ? `BERTopic · ${bertopic.source_name}`
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  if (isLoading) return <LoadingSkeleton />;

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
            <p className="mt-1 text-sm text-slate-400 max-w-xl">
              Mapa de conocimiento consolidado identificado mediante análisis de tópicos
              sobre el corpus de literatura académica.
            </p>
          </div>
          {/* Quick stats */}
          <div className="flex flex-wrap gap-3 shrink-0">
            {[
              { label: 'Tópicos', value: totalTopics || '—', color: 'text-cyan-300' },
              { label: 'Documentos', value: totalDocs ? totalDocs.toLocaleString() : '—', color: 'text-violet-300' },
              { label: 'Categorías', value: 6, color: 'text-emerald-300' },
            ].map(s => (
              <div key={s.label}
                className="text-center px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {error && (
          <div className="mt-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* ── Knowledge Map ── */}
      <ChartCard
        title="Mapa de Conocimiento"
        subtitle={
          totalTopics
            ? `${totalTopics} tópicos distribuidos en 6 categorías factoriales — pasa el cursor sobre un nodo para ver sus términos`
            : 'Ejecuta un análisis de tópicos para visualizar el mapa de conocimiento'
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
          <div className="relative min-h-[360px]">
            <ScienceMap
              topics={enrichedTopics}
              onTopicHover={setHoveredTopicId}
              hoveredId={hoveredTopicId}
            />
            <HoverPanel topic={hoveredTopic} />
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
              No se encontraron análisis de tópicos completados. Ejecuta un modelo LDA o BERTopic en la pestaña <span className="text-emerald-400">Modelado</span> para generar el mapa.
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
          {FACTOR_CATEGORIES.map(cat => {
            const catTopics = topicsByCategory[cat.id] ?? [];
            const topTerms = Array.from(
              new Set(catTopics.flatMap(t => t.words.slice(0, 4).map(w => w.word)))
            ).slice(0, 8);
            return (
              <div key={cat.id}
                className={`p-5 rounded-xl border ${cat.borderClass} ${cat.bgClass} transition-all duration-200 hover:scale-[1.01]`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cat.badgeClass}`}>
                    {cat.icon}
                  </div>
                  {catTopics.length > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cat.badgeClass} font-medium`}>
                      {catTopics.length} tópico{catTopics.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <h4 className={`text-sm font-semibold ${cat.textClass} mb-1`}>{cat.label}</h4>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">{cat.description}</p>
                {topTerms.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {topTerms.map(term => (
                      <span key={term}
                        className="text-xs px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-400 border border-slate-700/40">
                        {term}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">Sin tópicos asignados aún</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Topic Cluster Detail ── */}
      {enrichedTopics.length > 0 && (
        <ChartCard
          title="Clústeres Temáticos Identificados"
          subtitle={`${enrichedTopics.length} clústeres extraídos del corpus — términos ordenados por peso`}
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
            {enrichedTopics.map(topic => {
              const cat = CAT_BY_ID[topic.categoryId];
              const maxW = topic.words[0]?.weight || 1;
              return (
                <div key={topic.id}
                  className={`p-4 rounded-xl border ${cat.borderClass} bg-slate-800/25 hover:bg-slate-800/40 transition-colors`}>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-xs font-semibold text-white truncate flex-1 mr-2">
                      {topic.label}
                    </h5>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${cat.badgeClass}`}>
                      {cat.shortLabel}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {topic.words.slice(0, 6).map((w, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-24 truncate shrink-0">{w.word}</span>
                        <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(w.weight / maxW) * 100}%`,
                              backgroundColor: cat.color,
                              opacity: 0.8,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-600 w-8 text-right shrink-0">
                          {(w.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                  {topic.numDocuments > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700/30 text-xs text-slate-600">
                      {topic.numDocuments} doc{topic.numDocuments !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}

      {/* ── Methodology Footer ── */}
      <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-700/30">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-slate-300 mb-1">Metodología del Landscape</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Los tópicos se extraen mediante modelos de{' '}
              <span className="text-slate-300">topic modelling</span> (LDA / NMF / LSA) y{' '}
              <span className="text-slate-300">BERTopic</span> aplicados al corpus preprocesado.
              La clasificación en categorías factoriales se realiza automáticamente por coincidencia
              semántica con los descriptores del marco OE3.
              {sourceLabel && (
                <span className="block mt-1 text-slate-600">Fuente activa: {sourceLabel}</span>
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

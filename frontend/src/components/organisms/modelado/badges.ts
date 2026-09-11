/**
 * Paletas y clases de distintivo por entidad, algoritmo y calidad.
 */


export const ENTITY_BADGE_COLORS: Record<string, string> = {
  PERSON: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  ORG: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  GPE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  LOC: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  DATE: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  MONEY: 'bg-green-500/15 text-green-300 border-green-500/30',
  EVENT: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  PRODUCT: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  default: 'bg-slate-600/30 text-slate-300 border-slate-500/30',
};

export const ALGORITHM_BADGE_COLORS: Record<string, string> = {
  lda: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  nmf: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  lsa: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  plsa: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export const TOPIC_CARD_COLORS: Record<string, { gradient: string; bar: string }> = {
  emerald: { gradient: 'from-emerald-500/15 to-teal-500/15 border-emerald-500/30', bar: 'bg-emerald-400' },
  purple:  { gradient: 'from-purple-500/15 to-violet-500/15 border-purple-500/30', bar: 'bg-purple-400' },
  cyan:    { gradient: 'from-cyan-500/15 to-blue-500/15 border-cyan-500/30',       bar: 'bg-cyan-400' },
  amber:   { gradient: 'from-amber-500/15 to-orange-500/15 border-amber-500/30',   bar: 'bg-amber-400' },
};

export const coherenceBadgeClass = (score: number | null): string => {
  if (score === null) return 'bg-slate-600/30 text-slate-300 border-slate-500/30';
  if (score > 0.5) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (score > 0.3) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
};

export const outliersBadgeClass = (num_outliers: number, docs: number): string => {
  if (docs === 0) return 'bg-slate-600/30 text-slate-300 border-slate-500/30';
  return num_outliers / docs > 0.2
    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    : 'bg-slate-600/30 text-slate-300 border-slate-500/30';
};

// ---------------------------------------------------------------------------
// Compact quality metric card (smaller than MetricCardDark)
// ---------------------------------------------------------------------------

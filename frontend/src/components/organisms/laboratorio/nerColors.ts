/**
 * Paleta por tipo de entidad NER.
 */


export const NER_TYPE_COLORS: Record<string, string> = {
  PERSON:   'rgba(96,165,250,0.85)',   // blue-400
  PER:      'rgba(96,165,250,0.85)',
  ORG:      'rgba(251,146,60,0.85)',   // orange-400
  GPE:      'rgba(74,222,128,0.85)',   // green-400
  DATE:     'rgba(192,132,252,0.85)',  // purple-400
  LOC:      'rgba(45,212,191,0.85)',   // teal-400
  FAC:      'rgba(251,191,36,0.85)',   // amber-400
  NORP:     'rgba(244,114,182,0.85)',  // pink-400
  PRODUCT:  'rgba(56,189,248,0.85)',   // sky-400
  EVENT:    'rgba(245,158,11,0.85)',   // amber-500
  MONEY:    'rgba(163,230,53,0.85)',   // lime-400
  TIME:     'rgba(232,121,249,0.85)',  // fuchsia-400
  PERCENT:  'rgba(52,211,153,0.85)',   // emerald-400
  CARDINAL: 'rgba(148,163,184,0.85)', // slate-400
  ORDINAL:  'rgba(100,116,139,0.85)', // slate-500
  QUANTITY: 'rgba(34,211,238,0.85)',  // cyan-400
  WORK_OF_ART: 'rgba(248,113,113,0.85)', // red-400
  LAW:      'rgba(167,139,250,0.85)', // violet-400
  LANGUAGE: 'rgba(94,234,212,0.85)',  // teal-300
};

export const getNerChartColor = (type: string): string =>
  NER_TYPE_COLORS[type.toUpperCase()] ?? 'rgba(148,163,184,0.85)';

// ── Document Topic Breakdown ─────────────────────────────────────────────────

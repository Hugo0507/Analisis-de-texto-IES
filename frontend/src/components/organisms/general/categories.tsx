/**
 * Catalogo de categorias de transformacion digital y clasificacion de temas.
 */

import type { FactorCategory, TopicClassification } from './types';

export const FACTOR_CATEGORIES: FactorCategory[] = [
  {
    id: 'infraestructura',
    label: 'Infraestructura Tecnológica',
    shortLabel: 'Infraestructura',
    color: '#06b6d4',
    ringColor: 'rgba(6,182,212,0.18)',
    textClass: 'text-cyan-300',
    bgClass: 'bg-ink-850',
    borderClass: 'border-ink-600 border-l-4 border-l-cyan-400',
    badgeClass: 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/50',
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
    bgClass: 'bg-ink-850',
    borderClass: 'border-ink-600 border-l-4 border-l-blue-400',
    badgeClass: 'bg-blue-400/10 text-blue-300 border border-blue-400/50',
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
    label: 'Docencia y Formación',
    shortLabel: 'Docencia',
    color: '#8b5cf6',
    ringColor: 'rgba(139,92,246,0.18)',
    textClass: 'text-violet-300',
    bgClass: 'bg-ink-850',
    borderClass: 'border-ink-600 border-l-4 border-l-violet-400',
    badgeClass: 'bg-violet-400/10 text-violet-300 border border-violet-400/50',
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
    bgClass: 'bg-ink-850',
    borderClass: 'border-ink-600 border-l-4 border-l-emerald-400',
    badgeClass: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/50',
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
    label: 'Cultura e Innovación',
    shortLabel: 'Cultura',
    color: '#f59e0b',
    ringColor: 'rgba(245,158,11,0.18)',
    textClass: 'text-amber-300',
    bgClass: 'bg-ink-850',
    borderClass: 'border-ink-600 border-l-4 border-l-amber-400',
    badgeClass: 'bg-amber-400/10 text-amber-300 border border-amber-400/50',
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
    label: 'Calidad y Evaluación',
    shortLabel: 'Calidad',
    color: '#ec4899',
    ringColor: 'rgba(236,72,153,0.18)',
    textClass: 'text-pink-300',
    bgClass: 'bg-ink-850',
    borderClass: 'border-ink-600 border-l-4 border-l-pink-400',
    badgeClass: 'bg-pink-400/10 text-pink-300 border border-pink-400/50',
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

export const CAT_BY_ID: Record<string, FactorCategory> = Object.fromEntries(
  FACTOR_CATEGORIES.map(c => [c.id, c])
);

/**
 * Categoria factorial de un tema, tomada de la clasificacion del backend.
 *
 * Antes el Resumen clasificaba aqui con un lexico propio que no coincidia con
 * el del backend: el mismo modelo daba repartos de factores distintos segun la
 * pantalla. El lexico canonico es el del backend (reproduce las Tablas 12 y 13
 * del informe) y el frontend solo lo consume.
 *
 * Si el tema no trae clasificacion se usa 'infraestructura', que es tambien lo
 * que decide el backend cuando un tema no coincide con ninguna palabra clave.
 */
export function categoryFromClassification(
  classifications: TopicClassification[] | null | undefined,
  topicId: number,
): string {
  const c = classifications?.find(x => x.topic_id === topicId);
  return c?.primary_category ?? 'infraestructura';
}

// zoneBubblePositions — multi-ring layout that prevents node overlap.
// Fills concentric rings outward from the hub, each ring sized so that
// adjacent node centers are at least NODE_DIAM apart.

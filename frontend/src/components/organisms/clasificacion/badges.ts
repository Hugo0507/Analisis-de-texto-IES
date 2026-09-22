/**
 * Tonos y etiquetas del dashboard de Clasificación (LSTM).
 */

import type { Veredicto } from '../../../utils/lstmMetrics';

export const VEREDICTO_STYLES: Record<Veredicto['tono'], { bg: string; border: string; text: string; icon: string }> = {
  supera: { bg: 'bg-stage-cls/10', border: 'border-stage-cls/30', text: 'text-stage-cls', icon: 'text-stage-cls' },
  no_supera: { bg: 'bg-stage-lab/10', border: 'border-stage-lab/30', text: 'text-stage-lab', icon: 'text-stage-lab' },
  empate: { bg: 'bg-stage-mod/10', border: 'border-stage-mod/30', text: 'text-stage-mod', icon: 'text-stage-mod' },
  sin_datos: { bg: 'bg-ink-800', border: 'border-ink-600', text: 'text-mist', icon: 'text-fog' },
};

export const LABEL_MODE_LABELS: Record<string, string> = {
  topic: 'Tema',
  oe3: 'Factor OE3',
};

export const DELTA_BADGE_CLASS = {
  positivo: 'bg-stage-cls/15 text-stage-cls border-stage-cls/30',
  negativo: 'bg-stage-lab/15 text-stage-lab border-stage-lab/30',
  neutro: 'bg-ink-700/40 text-mist border-fog/30',
};

export function deltaBadgeClass(actual: number | null, base: number | null): string {
  if (actual === null || base === null) return DELTA_BADGE_CLASS.neutro;
  if (actual > base) return DELTA_BADGE_CLASS.positivo;
  if (actual < base) return DELTA_BADGE_CLASS.negativo;
  return DELTA_BADGE_CLASS.neutro;
}

/**
 * Formato de números en español para el dashboard de Clasificación.
 */

export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

export function formatDecimal(value: number | null, decimals = 3): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatEntero(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('es-ES');
}

/** Diferencia en puntos porcentuales, con signo ("+3,2 pp" / "−1,5 pp"). */
export function formatDeltaPuntos(actual: number | null, base: number | null): string | undefined {
  if (actual === null || base === null) return undefined;
  const delta = (actual - base) * 100;
  const signo = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return `${signo}${Math.abs(delta).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pp`;
}

/** Diferencia de F1 (escala 0–1), con signo ("+0,120" / "−0,045"). */
export function formatDeltaDecimal(actual: number | null, base: number | null): string | undefined {
  if (actual === null || base === null) return undefined;
  const delta = actual - base;
  const signo = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return `${signo}${Math.abs(delta).toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

/** Acorta una etiqueta larga para ejes de gráfico; el nombre completo va en el título/tooltip. */
export function acortarEtiqueta(texto: string, maxLen = 14): string {
  if (texto.length <= maxLen) return texto;
  return `${texto.slice(0, maxLen - 1)}…`;
}

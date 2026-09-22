/**
 * Orden de los análisis en los selectores del dashboard.
 *
 * Se muestran del más reciente al más antiguo y, cuando nadie ha elegido uno,
 * el dashboard abre con el más reciente que esté completado. Antes se ordenaban
 * por nombre, así que abría siempre el primero del alfabeto: un análisis viejo
 * podía tapar al que se acababa de ejecutar.
 */

export interface AnalisisListado {
  id: number;
  status: string;
  created_at?: string | null;
}

/** La API devuelve "2026-09-13 17:11:38" (sin zona); Safari no parsea ese formato con espacio. */
function instante(analisis: AnalisisListado): number {
  if (!analisis.created_at) return 0;
  const t = Date.parse(analisis.created_at.replace(' ', 'T'));
  return Number.isNaN(t) ? 0 : t;
}

/** Del más reciente al más antiguo; a igual fecha, primero el id mayor. */
export function porMasReciente<T extends AnalisisListado>(lista: T[]): T[] {
  return [...lista].sort((a, b) => instante(b) - instante(a) || b.id - a.id);
}

/** El análisis completado más reciente, o undefined si no hay ninguno. */
export function masRecienteCompletado<T extends AnalisisListado>(lista: T[]): T | undefined {
  return porMasReciente(lista).find((a) => a.status === 'completed');
}

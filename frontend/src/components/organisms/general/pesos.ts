/**
 * Contribución de un término dentro de su tema.
 *
 * El peso que devuelve el backend no es una proporción y su escala depende del
 * algoritmo: LDA da conteos (p. ej. 1.236,7), NMF ~0,74, LSA ~0,15 y PLSA
 * ~0,0097. Mostrarlo como "peso × 100" daba cifras como "123671%", que además
 * se salían del recuadro. Aquí se normaliza sobre el total del tema, así que la
 * cifra se lee igual en los cuatro algoritmos: cuánto aporta ese término al tema.
 *
 * Se usa el valor absoluto porque en LSA los pesos pueden ser negativos.
 */

export interface TerminoConPeso {
  weight: number;
}

export function totalPesos(words: TerminoConPeso[]): number {
  return words.reduce((suma, w) => suma + Math.abs(w.weight || 0), 0);
}

/** Porcentaje que aporta un término al tema (0 si el tema no tiene pesos). */
export function contribucion(peso: number, total: number): number {
  if (!total) return 0;
  return (Math.abs(peso || 0) / total) * 100;
}

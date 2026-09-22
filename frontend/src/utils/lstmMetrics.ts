/**
 * Funciones puras del dashboard de Clasificación (LSTM).
 *
 * Separadas de los componentes para poder probarlas sin renderizar nada.
 */

export interface Veredicto {
  tono: 'supera' | 'no_supera' | 'empate' | 'sin_datos';
  texto: string;
}

/**
 * Margen bajo el cual dos F1 macro se consideran empatados. Un modelo puede
 * ganar por una diferencia tan pequeña que no sea una ventaja real; 0,005
 * es el mismo margen que usa la vista de Administración.
 */
const EPSILON_F1 = 0.005;

/**
 * Compara el F1 macro del modelo (por documento) contra la línea base de
 * responder siempre la clase mayoritaria.
 *
 * Los análisis creados antes de registrar la línea base llegan con
 * `baselineMacroF1: null`: se devuelve un veredicto neutro en vez de fallar.
 */
export function veredictoBaseline(
  macroF1: number | null,
  baselineMacroF1: number | null,
): Veredicto {
  if (macroF1 === null || baselineMacroF1 === null) {
    return {
      tono: 'sin_datos',
      texto: 'Este análisis no registró una línea base: no se puede comparar.',
    };
  }

  const diferencia = macroF1 - baselineMacroF1;

  if (diferencia > EPSILON_F1) {
    return {
      tono: 'supera',
      texto: `Supera la línea base por ${diferencia.toFixed(3)} de F1 macro: el modelo aprendió más que responder siempre la clase mayoritaria.`,
    };
  }

  if (diferencia < -EPSILON_F1) {
    return {
      tono: 'no_supera',
      texto: 'No supera la línea base: el modelo no aprendió más que responder siempre la clase mayoritaria.',
    };
  }

  return {
    tono: 'empate',
    texto: 'Empata con la línea base: no hay una ventaja clara sobre la clase mayoritaria.',
  };
}

/**
 * Normaliza una matriz de confusión por fila: cada celda pasa a ser el
 * porcentaje que representa dentro de su fila (clase real).
 *
 * Una fila sin documentos de prueba (todos los valores en 0) se queda en
 * 0 en vez de producir `NaN` por dividir entre cero.
 */
export function normalizarFilaMatriz(matriz: number[][]): number[][] {
  return matriz.map((fila) => {
    const total = fila.reduce((suma, valor) => suma + valor, 0);
    if (total === 0) return fila.map(() => 0);
    return fila.map((valor) => (valor / total) * 100);
  });
}

import { veredictoBaseline, normalizarFilaMatriz } from '../lstmMetrics';

describe('veredictoBaseline', () => {
  test('supera la línea base cuando la diferencia es mayor al margen', () => {
    const v = veredictoBaseline(0.75, 0.5);
    expect(v.tono).toBe('supera');
    expect(v.texto).toMatch(/Supera la línea base/);
  });

  test('no supera la línea base cuando el modelo queda por debajo', () => {
    const v = veredictoBaseline(0.4, 0.5);
    expect(v.tono).toBe('no_supera');
  });

  test('empata dentro del margen de 0,005', () => {
    expect(veredictoBaseline(0.503, 0.5).tono).toBe('empate');
    expect(veredictoBaseline(0.497, 0.5).tono).toBe('empate');
  });

  test('justo en el borde del margen ya no es empate', () => {
    expect(veredictoBaseline(0.5061, 0.5).tono).toBe('supera');
    expect(veredictoBaseline(0.4939, 0.5).tono).toBe('no_supera');
  });

  test('sin línea base (análisis antiguos) devuelve tono sin_datos', () => {
    expect(veredictoBaseline(0.8, null).tono).toBe('sin_datos');
    expect(veredictoBaseline(null, 0.8).tono).toBe('sin_datos');
    expect(veredictoBaseline(null, null).tono).toBe('sin_datos');
  });
});

describe('normalizarFilaMatriz', () => {
  test('convierte cada fila a porcentajes que suman 100', () => {
    const resultado = normalizarFilaMatriz([
      [8, 2],
      [1, 9],
    ]);
    expect(resultado[0]).toEqual([80, 20]);
    expect(resultado[1]).toEqual([10, 90]);
  });

  test('una fila sin documentos de prueba queda en ceros, no en NaN', () => {
    const resultado = normalizarFilaMatriz([[0, 0, 0]]);
    expect(resultado[0]).toEqual([0, 0, 0]);
  });

  test('no modifica la matriz original', () => {
    const original = [[4, 4]];
    const copia = JSON.parse(JSON.stringify(original));
    normalizarFilaMatriz(original);
    expect(original).toEqual(copia);
  });

  test('preserva la cantidad de filas y columnas', () => {
    const resultado = normalizarFilaMatriz([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toHaveLength(3);
  });
});

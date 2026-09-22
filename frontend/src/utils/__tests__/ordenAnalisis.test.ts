/**
 * El dashboard abre con el análisis más reciente completado, no con el primero
 * del alfabeto (así un análisis viejo no tapa al que se acaba de ejecutar).
 */

import { masRecienteCompletado, porMasReciente } from '../ordenAnalisis';

const analisis = [
  { id: 12, name: 'bow_ft', status: 'completed', created_at: '2026-03-20 10:36:44' },
  { id: 14, name: 'bow-limpio', status: 'completed', created_at: '2026-09-13 17:11:38' },
  { id: 13, name: 'Bow3', status: 'completed', created_at: '2026-03-20 16:11:17' },
];

describe('porMasReciente', () => {
  test('ordena del más reciente al más antiguo', () => {
    expect(porMasReciente(analisis).map(a => a.id)).toEqual([14, 13, 12]);
  });

  test('no modifica la lista original', () => {
    const copia = [...analisis];
    porMasReciente(analisis);
    expect(analisis).toEqual(copia);
  });

  test('a igual fecha, primero el id mayor', () => {
    const mismaFecha = [
      { id: 3, status: 'completed', created_at: '2026-09-13 15:00:00' },
      { id: 9, status: 'completed', created_at: '2026-09-13 15:00:00' },
    ];
    expect(porMasReciente(mismaFecha).map(a => a.id)).toEqual([9, 3]);
  });

  test('los análisis sin fecha quedan al final', () => {
    const conFaltante = [{ id: 1, status: 'completed' }, ...analisis];
    expect(porMasReciente(conFaltante).map(a => a.id)).toEqual([14, 13, 12, 1]);
  });
});

describe('masRecienteCompletado', () => {
  test('ignora los que no están completados aunque sean más nuevos', () => {
    const conPendiente = [
      { id: 20, status: 'processing', created_at: '2026-09-20 10:00:00' },
      ...analisis,
    ];
    expect(masRecienteCompletado(conPendiente)?.id).toBe(14);
  });

  test('devuelve undefined si ninguno está completado', () => {
    expect(masRecienteCompletado([{ id: 1, status: 'error', created_at: '2026-01-01 00:00:00' }])).toBeUndefined();
  });
});

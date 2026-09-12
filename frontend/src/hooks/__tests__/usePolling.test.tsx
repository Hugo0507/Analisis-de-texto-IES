/**
 * Pruebas del hook de sondeo.
 *
 * Sustituye a diez copias hechas a mano de la misma logica de setInterval. Lo
 * que hay que garantizar es justo lo que variaba entre copias: que el
 * temporizador no exista mientras no haga falta y que se limpie al desmontar.
 */

import { renderHook } from '@testing-library/react';
import { usePolling } from '../usePolling';

describe('usePolling', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('no llama al callback mientras esta inactivo', () => {
    const fn = jest.fn();
    renderHook(() => usePolling(fn, false));
    jest.advanceTimersByTime(10000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('llama al callback en cada intervalo mientras esta activo', () => {
    const fn = jest.fn();
    renderHook(() => usePolling(fn, true));

    jest.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(4000);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respeta el intervalo indicado', () => {
    const fn = jest.fn();
    renderHook(() => usePolling(fn, true, { intervalMs: 5000 }));

    jest.advanceTimersByTime(4999);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('puede ejecutarse una vez de inmediato', () => {
    const fn = jest.fn();
    renderHook(() => usePolling(fn, true, { immediate: true }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('deja de llamar cuando se desactiva', () => {
    const fn = jest.fn();
    const { rerender } = renderHook(
      ({ activo }) => usePolling(fn, activo),
      { initialProps: { activo: true } },
    );

    jest.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(1);

    rerender({ activo: false });
    jest.advanceTimersByTime(10000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('limpia el temporizador al desmontar', () => {
    const fn = jest.fn();
    const { unmount } = renderHook(() => usePolling(fn, true));

    unmount();
    jest.advanceTimersByTime(10000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('usa siempre la ultima version del callback sin reiniciar el intervalo', () => {
    const primera = jest.fn();
    const segunda = jest.fn();
    const { rerender } = renderHook(
      ({ cb }) => usePolling(cb, true),
      { initialProps: { cb: primera } },
    );

    rerender({ cb: segunda });
    jest.advanceTimersByTime(2000);

    expect(primera).not.toHaveBeenCalled();
    expect(segunda).toHaveBeenCalledTimes(1);
  });
});

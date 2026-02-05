import { deepEqual, throttle, debounce, batchUpdates } from '../../../core/utils/performance';

describe('performance utils', () => {
  it('deepEqual compares nested objects', () => {
    expect(deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(true);
    expect(deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } })).toBe(false);
  });

  it('throttle limits calls', () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const t = throttle(fn, 1000);
    t();
    t();
    t();
    expect(fn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    t();
    expect(fn).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('debounce delays calls', () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const d = debounce(fn, 500);
    d();
    d();
    d();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('batchUpdates splits into chunks', () => {
    const arr = Array.from({ length: 7 }, (_, i) => i);
    const batches = batchUpdates(arr, 3);
    expect(batches.length).toBe(3);
    expect(batches[0]).toEqual([0, 1, 2]);
    expect(batches[2]).toEqual([6]);
  });
});

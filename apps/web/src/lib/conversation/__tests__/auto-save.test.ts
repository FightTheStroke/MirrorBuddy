import { describe, expect, it, vi } from 'vitest';
import { createAutoSave } from '../auto-save';

describe('auto-save', () => {
  it('debounces consecutive saves', () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => {});
    const autoSave = createAutoSave(save, 200);
    autoSave('a');
    autoSave('b');
    vi.advanceTimersByTime(250);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('b');
    vi.useRealTimers();
  });
});

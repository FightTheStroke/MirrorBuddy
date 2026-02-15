import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCallingState } from '../use-calling-state';

describe('useCallingState', () => {
  it('transitions idle -> ringing -> error', () => {
    const { result } = renderHook(() => useCallingState());
    expect(result.current.callingState).toBe('idle');

    act(() => result.current.setRinging());
    expect(result.current.callingState).toBe('ringing');

    act(() => result.current.setError('Network down'));
    expect(result.current.callingState).toBe('error');
    expect(result.current.errorMessage).toBe('Network down');
  });

  it('auto-resets to idle after connected', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCallingState());

    act(() => result.current.setConnected());
    expect(result.current.callingState).toBe('connected');

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.callingState).toBe('idle');

    vi.useRealTimers();
  });
});

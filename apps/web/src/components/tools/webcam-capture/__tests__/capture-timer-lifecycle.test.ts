import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCaptureTimer } from '../hooks/use-capture-timer';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('capture timer ownership', () => {
  it('does not schedule duplicate capture while the flash is pending', () => {
    const capture = vi.fn();
    const { result } = renderHook(() =>
      useCaptureTimer({ showTimer: false, onCaptureComplete: capture }),
    );
    act(() => {
      result.current.handleCapture();
      result.current.handleCapture();
    });
    act(() => vi.advanceTimersByTime(150));
    expect(capture).toHaveBeenCalledOnce();
  });
  it.each([false, true])('cleans every timer on close with countdown=%s', (showTimer) => {
    const capture = vi.fn();
    const { result, unmount } = renderHook(() =>
      useCaptureTimer({ showTimer, onCaptureComplete: capture }),
    );
    act(() => result.current.handleCapture());
    if (showTimer) {
      for (let second = 0; second < 3; second++) act(() => vi.advanceTimersByTime(1000));
    }
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(10000));
    expect(capture).not.toHaveBeenCalled();
  });
  it('cancels the countdown including the final flash', () => {
    const capture = vi.fn();
    const { result } = renderHook(() =>
      useCaptureTimer({ showTimer: true, onCaptureComplete: capture }),
    );
    act(() => result.current.handleCapture());
    for (let second = 0; second < 3; second++) act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.handleCancelCountdown());
    act(() => vi.advanceTimersByTime(10000));
    expect(capture).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

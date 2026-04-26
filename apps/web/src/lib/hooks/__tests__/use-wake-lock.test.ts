import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWakeLock } from '../use-wake-lock';

describe('useWakeLock', () => {
  let mockRelease: ReturnType<typeof vi.fn>;
  let mockSentinel: {
    release: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRelease = vi.fn().mockResolvedValue(undefined);
    mockSentinel = {
      release: mockRelease,
      addEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: vi.fn().mockResolvedValue(mockSentinel) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('acquires wake lock when enabled', async () => {
    renderHook(() => useWakeLock(true));
    await act(async () => {});
    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
  });

  it('does not acquire when disabled', async () => {
    renderHook(() => useWakeLock(false));
    await act(async () => {});
    expect(navigator.wakeLock.request).not.toHaveBeenCalled();
  });

  it('releases wake lock on unmount', async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    await act(async () => {});
    unmount();
    await act(async () => {});
    expect(mockRelease).toHaveBeenCalled();
  });

  it('releases wake lock when disabled', async () => {
    const { rerender } = renderHook(({ enabled }) => useWakeLock(enabled), {
      initialProps: { enabled: true },
    });
    await act(async () => {});
    rerender({ enabled: false });
    await act(async () => {});
    expect(mockRelease).toHaveBeenCalled();
  });

  it('handles missing Wake Lock API gracefully', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    expect(() => {
      renderHook(() => useWakeLock(true));
    }).not.toThrow();
  });
});

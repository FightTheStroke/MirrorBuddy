/**
 * Regression test: onboarding is UI-only (no voice).
 *
 * The realtime WebRTC connection can fail after a successful token fetch,
 * stranding a child on a broken voice step. Onboarding must run through the
 * accessible form from first paint: useWebSpeechFallback starts true, Azure is
 * treated as already-checked, and no /api/realtime/token request is made.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVoiceConnection } from '../use-voice-connection';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe('useVoiceConnection — UI-only onboarding', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('defaults to the form path and never fetches a realtime token', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch);

    const { result } = renderHook(() => useVoiceConnection(true));

    // Form is the path from first paint; no Azure wait.
    expect(result.current.useWebSpeechFallback).toBe(true);
    expect(result.current.hasCheckedAzure).toBe(true);
    expect(result.current.connectionInfo).toBeNull();
    // The voice token endpoint must not be called.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

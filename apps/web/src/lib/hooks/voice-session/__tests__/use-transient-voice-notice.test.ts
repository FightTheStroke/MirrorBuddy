/**
 * A filtered voice turn leaves the session usable, so its notice must clear
 * itself instead of lingering as a connection error that disables the
 * "start voice call" controls (PR #1255 review).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { TRANSIENT_VOICE_NOTICE_MS, useTransientVoiceNotice } from '../use-transient-voice-notice';

function useNoticeHarness() {
  const [error, setError] = useState<string | null>(null);
  const showNotice = useTransientVoiceNotice(setError);
  return { error, setError, showNotice };
}

describe('useTransientVoiceNotice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the notice, then clears it so voice can start again', () => {
    const { result } = renderHook(() => useNoticeHarness());

    act(() => result.current.showNotice('filtered'));
    expect(result.current.error).toBe('filtered');

    act(() => vi.advanceTimersByTime(TRANSIENT_VOICE_NOTICE_MS));
    expect(result.current.error).toBeNull();
  });

  it('keeps a real error that replaced the notice', () => {
    const { result } = renderHook(() => useNoticeHarness());

    act(() => result.current.showNotice('filtered'));
    act(() => result.current.setError('connection failed'));
    act(() => vi.advanceTimersByTime(TRANSIENT_VOICE_NOTICE_MS));

    expect(result.current.error).toBe('connection failed');
  });

  it('restarts the countdown when another notice arrives', () => {
    const { result } = renderHook(() => useNoticeHarness());

    act(() => result.current.showNotice('first'));
    act(() => vi.advanceTimersByTime(TRANSIENT_VOICE_NOTICE_MS - 1000));
    act(() => result.current.showNotice('second'));
    act(() => vi.advanceTimersByTime(TRANSIENT_VOICE_NOTICE_MS - 1000));
    expect(result.current.error).toBe('second');

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.error).toBeNull();
  });

  it('cancels the pending clear on unmount', () => {
    const { result, unmount } = renderHook(() => useNoticeHarness());

    act(() => result.current.showNotice('filtered'));
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

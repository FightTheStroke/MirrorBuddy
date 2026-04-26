// ============================================================================
// VOICE SESSION STORE - SAFETY WARNING TESTS
// Tests for safety warning state during voice sessions
// ============================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useVoiceSessionStore } from '../voice-session-store';

describe('VoiceSessionStore - Safety Warning', () => {
  beforeEach(() => {
    // Reset store before each test
    useVoiceSessionStore.getState().reset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should initialize with no safety warning', () => {
    const state = useVoiceSessionStore.getState();
    expect(state.safetyWarning).toBeNull();
  });

  it('should set safety warning with message', () => {
    const { setSafetyWarning } = useVoiceSessionStore.getState();
    setSafetyWarning('Test warning message');

    const state = useVoiceSessionStore.getState();
    expect(state.safetyWarning).toBe('Test warning message');
  });

  it('should clear safety warning', () => {
    const { setSafetyWarning, clearSafetyWarning } = useVoiceSessionStore.getState();

    setSafetyWarning('Warning');
    expect(useVoiceSessionStore.getState().safetyWarning).toBe('Warning');

    clearSafetyWarning();
    expect(useVoiceSessionStore.getState().safetyWarning).toBeNull();
  });

  it('should auto-clear safety warning after timeout', () => {
    vi.useFakeTimers();
    const { setSafetyWarning } = useVoiceSessionStore.getState();

    setSafetyWarning('Auto-clear test', 3000);
    expect(useVoiceSessionStore.getState().safetyWarning).toBe('Auto-clear test');

    vi.advanceTimersByTime(2999);
    expect(useVoiceSessionStore.getState().safetyWarning).toBe('Auto-clear test');

    vi.advanceTimersByTime(1);
    expect(useVoiceSessionStore.getState().safetyWarning).toBeNull();
  });

  it('should use default timeout of 5 seconds', () => {
    vi.useFakeTimers();
    const { setSafetyWarning } = useVoiceSessionStore.getState();

    setSafetyWarning('Default timeout test');
    expect(useVoiceSessionStore.getState().safetyWarning).toBe('Default timeout test');

    vi.advanceTimersByTime(4999);
    expect(useVoiceSessionStore.getState().safetyWarning).toBe('Default timeout test');

    vi.advanceTimersByTime(1);
    expect(useVoiceSessionStore.getState().safetyWarning).toBeNull();
  });

  it('should clear previous timeout when setting new warning', () => {
    vi.useFakeTimers();
    const { setSafetyWarning } = useVoiceSessionStore.getState();

    setSafetyWarning('First warning', 5000);
    vi.advanceTimersByTime(2000);

    setSafetyWarning('Second warning', 5000);
    vi.advanceTimersByTime(4000);

    // First warning's timeout should be cleared, second should still be active
    expect(useVoiceSessionStore.getState().safetyWarning).toBe('Second warning');

    vi.advanceTimersByTime(1000);
    expect(useVoiceSessionStore.getState().safetyWarning).toBeNull();
  });

  it('should clear safety warning on reset', () => {
    const { setSafetyWarning, reset } = useVoiceSessionStore.getState();

    setSafetyWarning('Warning before reset');
    expect(useVoiceSessionStore.getState().safetyWarning).toBe('Warning before reset');

    reset();
    expect(useVoiceSessionStore.getState().safetyWarning).toBeNull();
  });
});

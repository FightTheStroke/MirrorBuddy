import { describe, it, expect, vi } from 'vitest';
import {
  getVoiceErrorMessage,
  isVoiceCapabilityError,
  isVoiceRootCauseError,
  shouldEscalateVoiceError,
} from '../error-classification';
import { logMicrophonePermissionRequest } from '../voice-error-logger';
import { logger } from '@/lib/logger';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

// Sentry MIRRORBUDDY-1K: a refused microphone is the student's choice, not a fault.
describe('microphone permission logging', () => {
  it('records a denied microphone without raising a warning', () => {
    logMicrophonePermissionRequest('denied');

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      '[VoiceSession] Microphone permission denied by user',
      expect.objectContaining({ permissionResult: 'denied' }),
    );
  });
});

describe('voice error classification', () => {
  it('detects root-cause marked errors', () => {
    const error = new Error('Connection failed') as Error & { _voiceRootCause?: boolean };
    error._voiceRootCause = true;

    expect(isVoiceRootCauseError(error)).toBe(true);
    expect(shouldEscalateVoiceError(error)).toBe(false);
  });

  it('classifies NotSupportedError by name', () => {
    const error = new Error('Not supported');
    error.name = 'NotSupportedError';

    expect(isVoiceCapabilityError(error)).toBe(true);
    expect(shouldEscalateVoiceError(error)).toBe(false);
  });

  it('classifies capability errors by message hints', () => {
    const error = new Error('WebRTC non supportato dal browser');

    expect(isVoiceCapabilityError(error)).toBe(true);
    expect(shouldEscalateVoiceError(error)).toBe(false);
  });

  it('classifies microphone permission denied messages as capability errors', () => {
    const error = new Error('Microphone permission denied by user');

    expect(isVoiceCapabilityError(error)).toBe(true);
    expect(shouldEscalateVoiceError(error)).toBe(false);
  });

  it('escalates generic permission denied backend failures', () => {
    const error = new Error('Failed to get ephemeral token: 403 - Permission denied');

    expect(isVoiceCapabilityError(error)).toBe(false);
    expect(shouldEscalateVoiceError(error)).toBe(true);
  });

  it('escalates unexpected errors', () => {
    const error = new Error('Unexpected transport failure');

    expect(isVoiceCapabilityError(error)).toBe(false);
    expect(shouldEscalateVoiceError(error)).toBe(true);
  });

  it('extracts message from unknown values', () => {
    expect(getVoiceErrorMessage('plain-string')).toBe('plain-string');
    expect(getVoiceErrorMessage(42)).toBe('42');
  });
});

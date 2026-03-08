import { describe, it, expect } from 'vitest';
import {
  getVoiceErrorMessage,
  isVoiceCapabilityError,
  isVoiceRootCauseError,
  shouldEscalateVoiceError,
} from '../error-classification';

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

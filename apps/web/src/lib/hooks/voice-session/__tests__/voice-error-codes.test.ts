/**
 * MIRRORBUDDY - Voice Error Codes Tests
 *
 * Ensures the connection layer can throw stable, locale-independent codes that
 * the UI maps to localized child-friendly messages (BUG-04).
 */

import { describe, it, expect } from 'vitest';
import {
  VoiceError,
  getVoiceErrorCode,
  VOICE_ERROR_I18N_KEYS,
  type VoiceErrorCode,
} from '../voice-error-codes';

describe('VoiceError', () => {
  it('carries the code on both .code and .message', () => {
    const err = new VoiceError('VOICE_TOKEN_UNAVAILABLE');
    expect(err.code).toBe('VOICE_TOKEN_UNAVAILABLE');
    expect(err.message).toBe('VOICE_TOKEN_UNAVAILABLE');
    expect(err.name).toBe('VoiceError');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('getVoiceErrorCode', () => {
  it('extracts the code from a VoiceError', () => {
    expect(getVoiceErrorCode(new VoiceError('MIC_UNAVAILABLE'))).toBe('MIC_UNAVAILABLE');
  });

  it('extracts the code from a wrapped error carrying a code field', () => {
    const wrapped = Object.assign(new Error('VOICE_SERVER_TIMEOUT'), {
      code: 'VOICE_SERVER_TIMEOUT',
    });
    expect(getVoiceErrorCode(wrapped)).toBe('VOICE_SERVER_TIMEOUT');
  });

  it('returns null for an unknown code string', () => {
    const wrapped = Object.assign(new Error('boom'), { code: 'SOME_OTHER_ERROR' });
    expect(getVoiceErrorCode(wrapped)).toBeNull();
  });

  it('returns null for a plain error without a code', () => {
    expect(getVoiceErrorCode(new Error('Connection failed'))).toBeNull();
    expect(getVoiceErrorCode('string error')).toBeNull();
    expect(getVoiceErrorCode(null)).toBeNull();
  });
});

describe('VOICE_ERROR_I18N_KEYS', () => {
  it('maps every code to a voice-namespace key', () => {
    const codes: VoiceErrorCode[] = [
      'VOICE_TOKEN_UNAVAILABLE',
      'VOICE_SERVER_TIMEOUT',
      'VOICE_RATE_LIMITED',
      'VOICE_CONFIG_UNAVAILABLE',
      'MIC_UNAVAILABLE',
      'MIC_NOT_ALLOWED',
      'VOICE_CONNECTION_FAILED',
    ];
    for (const code of codes) {
      expect(VOICE_ERROR_I18N_KEYS[code]).toMatch(/^error[A-Z]/);
    }
  });
});

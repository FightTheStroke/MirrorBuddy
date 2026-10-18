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
  isTransientVoiceNotice,
  VOICE_ERROR_I18N_KEYS,
  type VoiceErrorCode,
} from '../voice-error-codes';

describe('isTransientVoiceNotice', () => {
  it('treats a content-filtered turn as a transient notice', () => {
    expect(isTransientVoiceNotice(new VoiceError('VOICE_CONTENT_FILTERED'))).toBe(true);
    expect(isTransientVoiceNotice({ code: 'VOICE_CONTENT_FILTERED' })).toBe(true);
  });

  it('keeps connection and configuration failures persistent', () => {
    expect(isTransientVoiceNotice(new VoiceError('VOICE_CONNECTION_FAILED'))).toBe(false);
    expect(isTransientVoiceNotice(new VoiceError('VOICE_CONFIG_UNAVAILABLE'))).toBe(false);
    expect(isTransientVoiceNotice(new Error('content_filter'))).toBe(false);
    expect(isTransientVoiceNotice(undefined)).toBe(false);
    expect(isTransientVoiceNotice(null)).toBe(false);
  });
});

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

  it('extracts VOICE_CONTENT_FILTERED from a VoiceError', () => {
    expect(getVoiceErrorCode(new VoiceError('VOICE_CONTENT_FILTERED'))).toBe(
      'VOICE_CONTENT_FILTERED',
    );
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
      'VOICE_CONTENT_FILTERED',
    ];
    for (const code of codes) {
      expect(VOICE_ERROR_I18N_KEYS[code]).toMatch(/^error[A-Z]/);
    }
  });
});

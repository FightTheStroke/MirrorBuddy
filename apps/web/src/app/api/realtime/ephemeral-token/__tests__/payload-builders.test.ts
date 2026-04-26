/**
 * Tests for GA protocol payload builders and response parsers
 * Verifies the session.type=realtime format required by Azure GA endpoint
 */

import { describe, it, expect } from 'vitest';
import {
  buildGAPayload,
  buildPreviewPayload,
  parseGAResponse,
  parsePreviewResponse,
} from '../payload-builders';

describe('GA payload builders', () => {
  describe('buildGAPayload', () => {
    it('should wrap config in session object with type=realtime', () => {
      const payload = buildGAPayload('gpt-realtime', {});

      expect(payload).toHaveProperty('session');
      const session = payload.session as Record<string, unknown>;
      expect(session.type).toBe('realtime');
      expect(session.model).toBe('gpt-realtime');
    });

    it('should set voice under session.audio.output.voice', () => {
      const payload = buildGAPayload('gpt-realtime', { voice: 'coral' });

      const session = payload.session as Record<string, unknown>;
      const audio = session.audio as Record<string, Record<string, unknown>>;
      expect(audio.output.voice).toBe('coral');
    });

    it('should default voice to alloy', () => {
      const payload = buildGAPayload('gpt-realtime', {});

      const session = payload.session as Record<string, unknown>;
      const audio = session.audio as Record<string, Record<string, unknown>>;
      expect(audio.output.voice).toBe('alloy');
    });

    it('should include instructions when provided', () => {
      const payload = buildGAPayload('gpt-realtime', {
        instructions: 'You are Euclide, a math teacher.',
      });

      const session = payload.session as Record<string, unknown>;
      expect(session.instructions).toBe('You are Euclide, a math teacher.');
    });

    it('should include turn_detection in audio.input', () => {
      const turnDetection = { type: 'server_vad', threshold: 0.5 };
      const payload = buildGAPayload('gpt-realtime', {
        turn_detection: turnDetection,
      });

      const session = payload.session as Record<string, unknown>;
      const audio = session.audio as Record<string, Record<string, unknown>>;
      expect(audio.input.turn_detection).toEqual(turnDetection);
    });

    it('should NOT have top-level model field (only inside session)', () => {
      const payload = buildGAPayload('gpt-realtime', {});

      expect(payload).not.toHaveProperty('model');
      expect((payload.session as Record<string, unknown>).model).toBe('gpt-realtime');
    });
  });

  describe('buildPreviewPayload', () => {
    it('should use flat format with model at top level', () => {
      const payload = buildPreviewPayload('gpt-realtime');

      expect(payload.model).toBe('gpt-realtime');
      expect(payload).not.toHaveProperty('session');
    });
  });

  describe('GA format compatibility with gpt-realtime-1.5', () => {
    it('should handle gpt-realtime-1.5 deployment name in buildGAPayload', () => {
      const payload = buildGAPayload('gpt-realtime-1.5', { voice: 'shimmer' });

      expect(payload).toHaveProperty('session');
      const session = payload.session as Record<string, unknown>;
      expect(session.type).toBe('realtime');
      expect(session.model).toBe('gpt-realtime-1.5');
    });

    it('should produce identical GA format structure for 1.5 and 1.0', () => {
      const payload1_5 = buildGAPayload('gpt-realtime-1.5', {
        voice: 'echo',
        instructions: 'Be helpful.',
        turn_detection: { type: 'server_vad' },
      });

      const payload1_0 = buildGAPayload('gpt-realtime', {
        voice: 'echo',
        instructions: 'Be helpful.',
        turn_detection: { type: 'server_vad' },
      });

      const session1_5 = payload1_5.session as Record<string, unknown>;
      const session1_0 = payload1_0.session as Record<string, unknown>;

      expect(session1_5.type).toBe(session1_0.type);
      expect(session1_5).toHaveProperty('audio');
      expect(session1_0).toHaveProperty('audio');
      expect(session1_5).toHaveProperty('instructions');
      expect(session1_0).toHaveProperty('instructions');

      const audio1_5 = session1_5.audio as Record<string, unknown>;
      const audio1_0 = session1_0.audio as Record<string, unknown>;
      expect(audio1_5.output).toEqual(audio1_0.output);
      expect(audio1_5.input).toEqual(audio1_0.input);
    });

    it('should parse GA response from gpt-realtime-1.5 correctly', () => {
      const result = parseGAResponse({
        value: 'ek_1_5_token',
        expires_at: 1771200000,
        session: { id: 'sess_v15_123', model: 'gpt-realtime-1.5' },
      });

      expect(result).toEqual({
        token: 'ek_1_5_token',
        expiresAt: 1771200000,
        sessionId: 'sess_v15_123',
      });
    });
  });
});

describe('GA response parsers', () => {
  describe('parseGAResponse', () => {
    it('should parse GA format { value, expires_at, session }', () => {
      const result = parseGAResponse({
        value: 'ek_test_token_123',
        expires_at: 1771184786,
        session: { id: 'sess_abc123', model: 'gpt-realtime' },
      });

      expect(result).toEqual({
        token: 'ek_test_token_123',
        expiresAt: 1771184786,
        sessionId: 'sess_abc123',
      });
    });

    it('should return null for missing value', () => {
      const result = parseGAResponse({
        value: '',
        expires_at: 0,
        session: { id: '', model: '' },
      });

      expect(result).toBeNull();
    });
  });

  describe('parsePreviewResponse', () => {
    it('should parse preview format { client_secret, id }', () => {
      const result = parsePreviewResponse({
        client_secret: {
          value: 'ek_preview_token',
          expires_at: 1771184546,
        },
        id: 'sess_preview_123',
      });

      expect(result).toEqual({
        token: 'ek_preview_token',
        expiresAt: 1771184546,
        sessionId: 'sess_preview_123',
      });
    });

    it('should return null for missing client_secret', () => {
      const result = parsePreviewResponse({
        client_secret: { value: '', expires_at: 0 },
        id: '',
      });

      expect(result).toBeNull();
    });
  });
});

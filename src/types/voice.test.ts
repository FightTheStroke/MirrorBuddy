// ============================================================================
// TYPE TESTS: Voice Session Types for GA Contract
// Tests compile-time type safety for Preview vs GA protocol types
// ============================================================================

import { describe, it, expect } from 'vitest';
import type {
  RealtimeTokenResponse,
  RealtimeEndpoint,
  SessionConfig,
  ClientSecretValue,
} from './voice';

describe('Voice Types - GA Contract', () => {
  describe('ClientSecretValue', () => {
    it('should accept GA client_secret format', () => {
      const clientSecret: ClientSecretValue = {
        value: 'ek_abc123',
        expires_at_unix: 1234567890,
      };

      expect(clientSecret.value).toBe('ek_abc123');
      expect(clientSecret.expires_at_unix).toBe(1234567890);
    });
  });

  describe('RealtimeTokenResponse', () => {
    it('should accept GA token response with client_secret', () => {
      const response: RealtimeTokenResponse = {
        client_secret: {
          value: 'ek_abc123',
          expires_at_unix: 1234567890,
        },
        id: 'session-123',
      };

      expect(response.client_secret.value).toMatch(/^ek_/);
      expect(response.id).toBe('session-123');
    });

    it('should accept optional fields', () => {
      const response: RealtimeTokenResponse = {
        client_secret: {
          value: 'ek_abc123',
          expires_at_unix: 1234567890,
        },
        id: 'session-123',
        object: 'realtime.session',
        model: 'gpt-realtime',
        expires_at: 1234567890,
      };

      expect(response.object).toBe('realtime.session');
      expect(response.model).toBe('gpt-realtime');
    });
  });

  describe('RealtimeEndpoint', () => {
    it('should support GA /openai/v1/realtime/calls format', () => {
      const endpoint: RealtimeEndpoint = {
        clientSecretsUrl: 'https://resource.openai.azure.com/openai/v1/realtime/client_secrets',
        webrtcCallsUrl: 'https://resource.openai.azure.com/openai/v1/realtime/calls',
        websocketUrl: 'wss://resource.openai.azure.com/openai/v1/realtime',
      };

      expect(endpoint.clientSecretsUrl).toContain('/openai/v1/realtime/client_secrets');
      expect(endpoint.webrtcCallsUrl).toContain('/openai/v1/realtime/calls');
      expect(endpoint.websocketUrl).toContain('/openai/v1/realtime');
    });

    it('should accept preview format as well', () => {
      const endpoint: RealtimeEndpoint = {
        clientSecretsUrl:
          'https://resource.openai.azure.com/openai/realtimeapi/sessions?api-version=2025-04-01-preview',
        webrtcCallsUrl: 'https://region.realtimeapi-preview.ai.azure.com/v1/realtimertc',
        websocketUrl:
          'wss://resource.openai.azure.com/openai/realtime?api-version=2025-04-01-preview',
      };

      expect(endpoint.clientSecretsUrl).toContain('realtimeapi/sessions');
      expect(endpoint.webrtcCallsUrl).toContain('realtimeapi-preview');
    });
  });

  describe('SessionConfig', () => {
    it('should accept minimal GA session config', () => {
      const config: SessionConfig = {
        model: 'gpt-realtime',
        voice: 'alloy',
      };

      expect(config.model).toBe('gpt-realtime');
      expect(config.voice).toBe('alloy');
    });

    it('should accept full GA session config with all options', () => {
      const config: SessionConfig = {
        model: 'gpt-realtime',
        voice: 'shimmer',
        instructions: 'You are a helpful assistant.',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        tools: [],
        tool_choice: 'auto',
        temperature: 0.8,
        max_response_output_tokens: 4096,
      };

      expect(config.instructions).toBe('You are a helpful assistant.');
      expect(config.turn_detection?.type).toBe('server_vad');
      expect(config.input_audio_transcription?.model).toBe('whisper-1');
    });

    it('should accept session config with modalities', () => {
      const config: SessionConfig = {
        model: 'gpt-realtime',
        voice: 'alloy',
        modalities: ['text', 'audio'],
      };

      expect(config.modalities).toContain('text');
      expect(config.modalities).toContain('audio');
    });
  });

  describe('Type compilation checks', () => {
    it('should prevent expires_at (old format) from being confused with expires_at_unix', () => {
      // This test ensures we don't accidentally use the old field name
      const clientSecret: ClientSecretValue = {
        value: 'ek_test',
        expires_at_unix: 1234567890,
      };

      // @ts-expect-error - expires_at is deprecated, should be expires_at_unix
      const wrongField = clientSecret.expires_at;

      expect(wrongField).toBeUndefined();
      expect(clientSecret.expires_at_unix).toBe(1234567890);
    });
  });
});

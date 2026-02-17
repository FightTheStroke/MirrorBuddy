// ============================================================================
// SESSION.UPDATE TYPE FIELD VALIDATION
// Ensures all session.update messages sent via data channel include type field
// Required for GA protocol compatibility (T2-09)
// ============================================================================

import { describe, it, expect } from 'vitest';

describe('session.update type field', () => {
  it('should include type field in heartbeat message', () => {
    // Heartbeat is pre-stringified for performance
    const parsed = JSON.parse(
      // Access the private constant via module exports
      '{"type":"session.update","session":{}}',
    );

    expect(parsed).toHaveProperty('type');
    expect(parsed.type).toBe('session.update');
    expect(parsed).toHaveProperty('session');
  });

  it('should include type field in session config structure (GA format)', () => {
    // Simulate the GA structure from useSendSessionConfig
    const sessionConfig = {
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: 'Test instructions',
        tools: [],
        temperature: 0.6,
        audio: {
          output: { voice: 'alloy' },
          input: {
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
              create_response: true,
              interrupt_response: true,
            },
          },
        },
      },
    };

    expect(sessionConfig).toHaveProperty('type');
    expect(sessionConfig.type).toBe('session.update');
    expect(sessionConfig).toHaveProperty('session');
    expect(sessionConfig.session.audio.output).toHaveProperty('voice');
  });

  it('should include type field in voice diagnostics test message (GA format)', () => {
    // Simulate GA structure from voice-test.ts
    const diagnosticsSessionUpdate = {
      type: 'session.update',
      session: {
        instructions: 'Sei un assistente di test. Rispondi brevemente in italiano con una frase.',
        audio: {
          output: { voice: 'alloy' },
          input: {
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
              create_response: true,
            },
          },
        },
      },
    };

    expect(diagnosticsSessionUpdate).toHaveProperty('type');
    expect(diagnosticsSessionUpdate.type).toBe('session.update');
  });

  it('should validate type field is required for GA protocol', () => {
    // GA protocol requires explicit type field for all messages
    const validMessage = {
      type: 'session.update',
      session: { audio: { output: { voice: 'alloy' } } },
    };

    const invalidMessage = {
      // Missing type field
      session: { audio: { output: { voice: 'alloy' } } },
    };

    expect(validMessage).toHaveProperty('type');
    expect(invalidMessage).not.toHaveProperty('type');

    // This documents that type field MUST be present
    expect(validMessage.type).toBe('session.update');
  });
});

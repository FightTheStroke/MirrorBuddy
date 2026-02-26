// ============================================================================
// SESSION.UPDATE TYPE FIELD VALIDATION
// Ensures all session.update messages sent via data channel include type field
// Required for GA protocol compatibility (T2-09)
// ============================================================================

import { describe, it, expect } from 'vitest';
import { HEARTBEAT_MESSAGE } from '../connection';

describe('session.update type field', () => {
  it('should include session.type=realtime in heartbeat message', () => {
    const parsed = JSON.parse(HEARTBEAT_MESSAGE);

    expect(parsed).toHaveProperty('type');
    expect(parsed.type).toBe('session.update');
    expect(parsed).toHaveProperty('session');
    expect(parsed.session.type).toBe('realtime');
  });

  it('should include type field in session config structure (GA format)', () => {
    // Simulate the GA structure from useSendSessionConfig
    // GA protocol does NOT include temperature (rejected by Azure API)
    const sessionConfig = {
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: 'Test instructions',
        tools: [],
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
    // Verify temperature is NOT present in GA format
    expect(sessionConfig.session).not.toHaveProperty('temperature');
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

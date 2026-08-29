import { describe, expect, it } from 'vitest';
import {
  isIgnoredConsoleMessage,
  isIgnoredRequest,
  isIgnoredResourceFailure,
} from '../../e2e/console-audit-routes';

describe('console audit route filters', () => {
  it('ignores realtime voice 503 responses only when voice is deliberately unconfigured', () => {
    const url = 'http://localhost:3000/api/realtime/token';
    const text =
      'Failed to load resource: the server responded with a status of 503 (Service Unavailable)';

    expect(isIgnoredRequest(url, 503, { E2E_VOICE_UNCONFIGURED: 'true' })).toBe(true);
    expect(isIgnoredResourceFailure(text, url, { E2E_VOICE_UNCONFIGURED: 'true' })).toBe(true);
    expect(isIgnoredRequest(url, 503, {})).toBe(false);
  });

  it('ignores the structured voice console error only when voice is deliberately unconfigured', () => {
    const message = JSON.stringify({
      timestamp: '2026-08-29T16:21:31.410Z',
      level: 'error',
      message: 'Voice API error',
      error: { name: 'Unknown', message: 'Azure OpenAI not configured' },
    });

    expect(isIgnoredConsoleMessage(message, { E2E_VOICE_UNCONFIGURED: 'true' })).toBe(true);
    expect(isIgnoredConsoleMessage(message, {})).toBe(false);
  });

  it('does not ignore unrelated console errors when voice is deliberately unconfigured', () => {
    expect(
      isIgnoredConsoleMessage('TypeError: Cannot read properties of undefined', {
        E2E_VOICE_UNCONFIGURED: 'true',
      }),
    ).toBe(false);
  });
});

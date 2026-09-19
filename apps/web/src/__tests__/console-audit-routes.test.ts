import { describe, expect, it } from 'vitest';
import {
  isIgnoredConsoleMessage,
  isIgnoredRequest,
  isIgnoredResourceFailure,
} from '../../e2e/console-audit-routes';

describe('console audit route filters', () => {
  const unconfigured = { E2E_VOICE_UNCONFIGURED: 'true' };
  const resourceFailure = 'Failed to load resource: the server responded with a status of 503';

  it.each(['3000', '3123', '3476'])(
    'accepts the deliberately unconfigured voice route on configured port %s',
    (port) => {
      const env = { ...unconfigured, MIRRORBUDDY_PORT: port };
      const url = `http://localhost:${port}/api/realtime/token`;
      expect(isIgnoredRequest(url, 503, env)).toBe(true);
      expect(isIgnoredResourceFailure(resourceFailure, url, env)).toBe(true);
    },
  );

  it.each([
    'https://example.com/api/realtime/token',
    'http://localhost.example.com:3000/api/realtime/token',
    'http://localhost:3001/api/realtime/token',
    'https://localhost:3000/api/realtime/token',
    'http://fake:fake@localhost:3000/api/realtime/token',
    'http://localhost:3000/api/user?next=/api/realtime/token',
    'http://localhost:3000/api/user#/api/realtime/token',
    '/api/realtime/token',
    '',
  ])('does not suppress voice-like failures outside the configured route: %s', (url) => {
    expect(isIgnoredRequest(url, 503, unconfigured)).toBe(false);
    expect(isIgnoredResourceFailure(resourceFailure, url, unconfigured)).toBe(false);
  });

  it('does not suppress the default port when another port is configured', () => {
    expect(
      isIgnoredRequest('http://localhost:3000/api/realtime/token', 503, {
        ...unconfigured,
        MIRRORBUDDY_PORT: '3123',
      }),
    ).toBe(false);
  });

  it.each([undefined, '', 'false', 'TRUE', '1'])(
    'requires the literal opt-in rather than %s',
    (flag) => {
      expect(
        isIgnoredRequest('http://localhost:3000/api/realtime/token', 503, {
          E2E_VOICE_UNCONFIGURED: flag,
        }),
      ).toBe(false);
    },
  );

  it.each([401, 403, 404, 429, 500, undefined])('does not suppress voice status %s', (status) => {
    expect(isIgnoredRequest('http://localhost:3000/api/realtime/token', status, unconfigured)).toBe(
      false,
    );
  });

  it.each(['Voice API error', 'Azure OpenAI not configured'])(
    'does not suppress a console message containing only %s',
    (message) => {
      expect(isIgnoredConsoleMessage(message, unconfigured)).toBe(false);
    },
  );

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

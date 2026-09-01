/**
 * @file azure-errors.sanitizer.test.ts
 * @brief The upstream error body must not survive the point of read.
 *
 * An Azure error body is not a diagnostic string. It can quote the prompt back,
 * and in this product the prompt is a child's homework. These tests are the
 * contract: whatever else changes, a representative Azure body must not appear
 * in a log line, a client-visible payload, a thrown Error's message, or a
 * stream event.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  sanitizeUpstreamError,
  describeUpstreamError,
  AzureHttpError,
  extractStatusFromError,
  isRetryableAzureError,
} from '../azure-errors';

/** A body shaped exactly like Azure's, carrying something that must never escape. */
const SECRET = 'Marco ha scritto: la capitale della Francia e Parigi';
const AZURE_BODY = JSON.stringify({
  error: {
    code: 'content_filter',
    message: `The response was filtered. Prompt was: ${SECRET}`,
    innererror: {
      content_filter_result: {
        hate: { filtered: false, severity: 'safe' },
        self_harm: { filtered: true, severity: 'medium' },
        violence: { filtered: false, severity: 'safe' },
      },
    },
  },
});

describe('sanitizeUpstreamError', () => {
  it('keeps status, code and the categories that actually fired', () => {
    const sanitized = sanitizeUpstreamError(400, AZURE_BODY);

    expect(sanitized.status).toBe(400);
    expect(sanitized.code).toBe('content_filter');
    expect(sanitized.category).toBe('content_filter');
    expect(sanitized.filteredCategories).toEqual(['self_harm']);
  });

  it('drops the upstream message entirely — no field carries it', () => {
    const sanitized = sanitizeUpstreamError(400, AZURE_BODY);

    expect(JSON.stringify(sanitized)).not.toContain(SECRET);
    expect(JSON.stringify(sanitized)).not.toContain('The response was filtered');
    expect(sanitized).not.toHaveProperty('message');
    expect(sanitized).not.toHaveProperty('errorText');
  });

  it('refuses a code that is a sentence rather than a code', () => {
    const body = JSON.stringify({
      error: { code: `not a code, this is prose about ${SECRET}` },
    });

    const sanitized = sanitizeUpstreamError(400, body);

    expect(sanitized.code).toBeUndefined();
    expect(JSON.stringify(sanitized)).not.toContain(SECRET);
  });

  it('survives a body that is not JSON at all', () => {
    const sanitized = sanitizeUpstreamError(502, `<html>upstream said ${SECRET}</html>`);

    expect(sanitized.status).toBe(502);
    expect(sanitized.category).toBe('server');
    expect(JSON.stringify(sanitized)).not.toContain(SECRET);
  });

  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [429, 'rate_limit'],
    [500, 'server'],
    [503, 'server'],
    [418, 'bad_request'],
  ])('categorises %i as %s', (status, category) => {
    expect(sanitizeUpstreamError(status, '{}').category).toBe(category);
  });

  it('recognises a missing deployment and names it', () => {
    const body = JSON.stringify({ error: { code: 'DeploymentNotFound', message: SECRET } });
    const sanitized = sanitizeUpstreamError(404, body);

    expect(sanitized.category).toBe('deployment_not_found');
    expect(JSON.stringify(sanitized)).not.toContain(SECRET);
  });

  it('recognises an unsupported token parameter and keeps WHICH one', () => {
    const sanitized = sanitizeUpstreamError(400, "Unsupported parameter: 'max_tokens' is invalid");

    expect(sanitized.category).toBe('unsupported_parameter');
    expect(sanitized.tokenParam).toBe('max_tokens');
  });

  it('recognises a refused temperature without quoting the upstream sentence', () => {
    const body = JSON.stringify({
      error: {
        message: `Unsupported value: 'temperature' does not support 0.7 with this model. ${SECRET}`,
        param: 'temperature',
        code: 'unsupported_value',
      },
    });
    const sanitized = sanitizeUpstreamError(400, body);

    expect(sanitized.category).toBe('unsupported_parameter');
    expect(sanitized.unsupportedTemperature).toBe(true);
    expect(sanitized.tokenParam).toBeUndefined();
    expect(JSON.stringify(sanitized)).not.toContain(SECRET);
  });
});

describe('describeUpstreamError', () => {
  it('is the only string form, and it carries no upstream prose', () => {
    const text = describeUpstreamError(sanitizeUpstreamError(400, AZURE_BODY));

    expect(text).toContain('400');
    expect(text).toContain('content_filter');
    expect(text).not.toContain(SECRET);
  });
});

describe('AzureHttpError', () => {
  it('cannot be constructed from a raw body, and never carries one', () => {
    const error = new AzureHttpError(sanitizeUpstreamError(429, AZURE_BODY));

    expect(error.message).not.toContain(SECRET);
    expect(JSON.stringify(error.toMetadata())).not.toContain(SECRET);
    expect(error).not.toHaveProperty('errorText');
    // The whole instance, own properties included — nothing hides the body.
    expect(JSON.stringify({ ...error, message: error.message, stack: '' })).not.toContain(SECRET);
  });

  it('still tells the retry machinery what it needs', () => {
    const rateLimited = new AzureHttpError(sanitizeUpstreamError(429, '{}'));
    const filtered = new AzureHttpError(sanitizeUpstreamError(400, AZURE_BODY));

    expect(extractStatusFromError(rateLimited)).toBe(429);
    expect(isRetryableAzureError(rateLimited)).toBe(true);
    expect(isRetryableAzureError(filtered)).toBe(false);
  });
});

describe('no call site reads an upstream body and then passes it on', () => {
  const SRC = join(__dirname, '..', '..', '..', '..');

  /**
   * Every place that reads an Azure error body. Adding a new one without
   * sanitizing it should fail here, not in production on a child's homework.
   */
  const CALL_SITES = [
    'lib/ai/providers/azure.ts',
    'lib/ai/providers/azure-streaming.ts',
    'lib/rag/embedding-service.ts',
    'app/api/tts/route.ts',
    'app/api/realtime/ephemeral-token/route.ts',
    'app/api/realtime/sdp-exchange/route.ts',
    'app/api/homework/analyze/helpers.ts',
    'lib/tools/handlers/webcam-handler.ts',
    'lib/hooks/voice-session/webrtc-connection.ts',
  ];

  /**
   * The variable an upstream body lands in. `errorText`/`errorData` used
   * anywhere other than the read itself and the sanitizer call is the bug this
   * forbids, as is passing either into a log field.
   *
   * A locally-produced string logged under `errorDetails` is NOT this bug: it
   * never held an upstream body. Widening the rule to the field name instead of
   * the value would make the contract fail on code that is fine, and a contract
   * that cries wolf gets deleted.
   */
  const LEAK = /\b(errorText|errorData)\b/;

  it.each(CALL_SITES)('%s does not let the raw body escape', (relative) => {
    const source = readFileSync(join(SRC, relative), 'utf8');
    const offenders = source
      .split('\n')
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter(({ line }) => LEAK.test(line))
      .filter(({ line }) => !line.startsWith('//') && !line.startsWith('*'))
      // The one legal use: reading it, and handing it straight to the sanitizer.
      .filter(({ line }) => !/^const error(Text|Data) = await .*\.text\(\);$/.test(line))
      .filter(
        ({ line }) =>
          !/^const \w+ = sanitizeUpstreamError\([\w.]+, error(Text|Data)\);$/.test(line),
      )
      .filter(
        ({ line }) => !/^\.\.\.sanitizeUpstreamError\([\w.]+, error(Text|Data)\),$/.test(line),
      )
      .filter(
        ({ line }) =>
          !/sanitizeUpstreamError\((?:response|first|second|fetchResponse)\.status, error(Text|Data)\)/.test(
            line,
          ),
      );

    expect(offenders).toEqual([]);
  });

  it('the sanitizer itself is the only module that parses an upstream body', () => {
    const errors = readFileSync(join(SRC, 'lib/ai/providers/azure-errors.ts'), 'utf8');

    expect(errors).toContain('sanitizeUpstreamError');
    // AzureHttpError must not be able to accept a raw string again.
    expect(errors).not.toMatch(/constructor\(\s*status: number,\s*errorText: string/);
  });
});

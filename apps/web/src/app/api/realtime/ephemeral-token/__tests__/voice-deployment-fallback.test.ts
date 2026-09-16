/**
 * Voice deployment fallback — RED first.
 *
 * The voice stack runs on gpt-realtime-2.1, a preview model whose inference
 * support ends 2026-10-15 (audited 2026-09-16 on `aoai-virtualbpm-prod`). When a
 * preview deployment stops answering, Azure rejects the token request and every
 * student loses voice. A single retry on the GA deployment keeps the tutor
 * talking instead of returning 503.
 */

import { describe, it, expect } from 'vitest';
// eslint-disable-next-line local-rules/enforce-module-boundaries -- the test must use the real sanitizer, not a copy of it
import { sanitizeUpstreamError } from '@/lib/ai/providers/azure-errors';
import { isDeploymentUnavailable, resolveGaFallbackDeployment } from '../voice-deployment-fallback';

const sanitize = (status: number, body: string) => sanitizeUpstreamError(status, body);

describe('isDeploymentUnavailable', () => {
  it('treats a 404 DeploymentNotFound as a deployment that is gone', () => {
    expect(isDeploymentUnavailable(sanitize(404, '{"error":{"code":"DeploymentNotFound"}}'))).toBe(
      true,
    );
  });

  it('treats a 400 DeploymentNotFound as a deployment that is gone', () => {
    expect(isDeploymentUnavailable(sanitize(400, '{"error":{"code":"DeploymentNotFound"}}'))).toBe(
      true,
    );
  });

  it('treats a 400 model_not_found as a deployment that is gone', () => {
    expect(isDeploymentUnavailable(sanitize(400, '{"error":{"code":"model_not_found"}}'))).toBe(
      true,
    );
  });

  it('treats a retired model code as a deployment that is gone', () => {
    expect(isDeploymentUnavailable(sanitize(400, '{"error":{"code":"ModelRetired"}}'))).toBe(true);
  });

  it('does not treat a rate limit as a missing deployment', () => {
    expect(isDeploymentUnavailable(sanitize(429, 'Too many requests'))).toBe(false);
  });

  it('does not treat an auth failure as a missing deployment', () => {
    expect(
      isDeploymentUnavailable(sanitize(401, 'Access denied due to invalid subscription key')),
    ).toBe(false);
  });

  it('does not treat a server error as a missing deployment', () => {
    expect(isDeploymentUnavailable(sanitize(500, 'Internal server error'))).toBe(false);
  });

  it('does not treat an unrelated bad request as a missing deployment', () => {
    expect(isDeploymentUnavailable(sanitize(400, '{"error":{"code":"content_filter"}}'))).toBe(
      false,
    );
  });

  it('handles an empty body without throwing', () => {
    expect(isDeploymentUnavailable(sanitize(400, ''))).toBe(false);
  });
});

describe('resolveGaFallbackDeployment', () => {
  it('returns the first GA deployment that differs from the failing one', () => {
    const fallback = resolveGaFallbackDeployment({
      current: 'gpt-realtime-2.1',
      gaCandidates: ['gpt-realtime-15', 'gpt-realtime'],
    });

    expect(fallback).toBe('gpt-realtime-15');
  });

  it('skips the failing deployment when it also appears among the candidates', () => {
    const fallback = resolveGaFallbackDeployment({
      current: 'gpt-realtime-15',
      gaCandidates: ['gpt-realtime-15', 'gpt-realtime'],
    });

    expect(fallback).toBe('gpt-realtime');
  });

  it('ignores unset and blank candidates', () => {
    const fallback = resolveGaFallbackDeployment({
      current: 'gpt-realtime-2.1',
      gaCandidates: [undefined, '   ', 'gpt-realtime'],
    });

    expect(fallback).toBe('gpt-realtime');
  });

  it('returns undefined when no distinct GA deployment is configured', () => {
    const fallback = resolveGaFallbackDeployment({
      current: 'gpt-realtime',
      gaCandidates: [undefined, 'gpt-realtime'],
    });

    expect(fallback).toBeUndefined();
  });
});

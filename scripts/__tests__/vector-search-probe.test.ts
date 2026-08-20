/**
 * Vector search probe tests
 *
 * The probe exists because a migration can be recorded as applied without its
 * body ever having run. On 20 Aug 2026 production had
 * `20260117183800_pgvector` in `_prisma_migrations`, dated 20 Jan 2026, while
 * `search_similar_embeddings` did not exist at all: every vector search fell
 * back to an unordered JavaScript scan and nothing reported it (finding G-12).
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';
import {
  probeHnswIndex,
  probeVectorSearchFunction,
  type ProbeExecutor,
} from '../lib/vector-search-probe';

function failWith(code: string, message: string): ProbeExecutor {
  return vi.fn(() => {
    const error = new Error(message) as Error & { code?: string };
    error.code = code;
    return Promise.reject(error);
  });
}

describe('probeVectorSearchFunction', () => {
  it('reports the function as callable when the query returns', async () => {
    const executor: ProbeExecutor = vi.fn(() => Promise.resolve([]));

    const outcome = await probeVectorSearchFunction(executor);

    expect(outcome.status).toBe('ok');
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('invokes the function rather than only looking it up in the catalog', async () => {
    const executor: ProbeExecutor = vi.fn(() => Promise.resolve([]));

    await probeVectorSearchFunction(executor);

    const [sql] = (executor as unknown as { mock: { calls: [string][] } }).mock.calls[0];
    expect(sql).toMatch(/SELECT[\s\S]*search_similar_embeddings\s*\(/i);
    expect(sql).not.toMatch(/pg_proc/i);
  });

  it('passes the source id argument so a stale six-argument body is caught', async () => {
    const executor: ProbeExecutor = vi.fn(() => Promise.resolve([]));

    await probeVectorSearchFunction(executor);

    const [sql] = (executor as unknown as { mock: { calls: [string][] } }).mock.calls[0];
    const argumentCount = sql.slice(sql.indexOf('search_similar_embeddings')).split(',').length;
    expect(argumentCount).toBeGreaterThanOrEqual(7);
  });

  it('reports the function as missing on undefined_function (42883)', async () => {
    const executor = failWith('42883', 'function search_similar_embeddings(...) does not exist');

    const outcome = await probeVectorSearchFunction(executor);

    expect(outcome.status).toBe('missing');
  });

  it('does not swallow an unrelated database failure as a missing function', async () => {
    const executor = failWith('28P01', 'password authentication failed');

    const outcome = await probeVectorSearchFunction(executor);

    expect(outcome.status).toBe('error');
    expect(outcome.status === 'error' && outcome.message).toContain('password authentication failed');
  });
});

describe('probeHnswIndex', () => {
  it('reports present when an hnsw index is defined on the vector column', async () => {
    const executor: ProbeExecutor = vi.fn(() =>
      Promise.resolve([{ indexdef: 'CREATE INDEX x ON t USING hnsw ("vectorNative" vector_cosine_ops)' }]),
    );

    await expect(probeHnswIndex(executor)).resolves.toEqual({ status: 'present' });
  });

  it('reports absent when no row comes back', async () => {
    const executor: ProbeExecutor = vi.fn(() => Promise.resolve([]));

    await expect(probeHnswIndex(executor)).resolves.toEqual({ status: 'absent' });
  });
});

/**
 * Unit tests for robust-sync utility (F-14)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock csrfFetch before importing the module
const mockCsrfFetch = vi.fn();
vi.mock('@/lib/auth/csrf-client', () => ({
  csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
}));

import {
  fetchWithBackoff,
  syncWithETag,
  loadWithETag,
  initialSyncState,
} from '../robust-sync';

describe('fetchWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockCsrfFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns success result on 200 response', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'etag': '"abc123"', 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ test: 'data' }),
    };
    mockCsrfFetch.mockResolvedValueOnce(mockResponse);

    const result = await fetchWithBackoff('/api/test', { method: 'GET' });

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(result.etag).toBe('"abc123"');
    expect(result.data).toEqual({ test: 'data' });
  });

  it('returns conflict on 412 response', async () => {
    const mockResponse = {
      ok: false,
      status: 412,
      headers: new Headers(),
    };
    mockCsrfFetch.mockResolvedValueOnce(mockResponse);

    const result = await fetchWithBackoff('/api/test', { method: 'PUT' });

    expect(result.success).toBe(false);
    expect(result.status).toBe(412);
    expect(result.conflict).toBe(true);
  });

  it('does not retry on 4xx errors (except 429)', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      headers: new Headers(),
      text: vi.fn().mockResolvedValue('Bad Request'),
    };
    mockCsrfFetch.mockResolvedValue(mockResponse);

    const result = await fetchWithBackoff('/api/test', { method: 'GET' });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(mockCsrfFetch).toHaveBeenCalledTimes(1); // No retries
  });

  it('retries on 500 errors with exponential backoff', async () => {
    const mockErrorResponse = {
      ok: false,
      status: 500,
      headers: new Headers(),
    };
    const mockSuccessResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ success: true }),
    };

    mockCsrfFetch
      .mockResolvedValueOnce(mockErrorResponse)
      .mockResolvedValueOnce(mockSuccessResponse);

    const resultPromise = fetchWithBackoff('/api/test', { method: 'GET' }, { maxRetries: 3 });

    // Fast-forward through backoff delay
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(mockCsrfFetch).toHaveBeenCalledTimes(2);
  });
});

describe('syncWithETag', () => {
  beforeEach(() => {
    mockCsrfFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds If-Match header when etag is provided', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'etag': '"newetag"', 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ updated: true }),
    };
    mockCsrfFetch.mockResolvedValueOnce(mockResponse);

    await syncWithETag('/api/test', { data: 'test' }, { etag: '"oldetag"' });

    expect(mockCsrfFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'If-Match': '"oldetag"',
        }),
      })
    );
  });

  it('does not add If-Match header when etag is empty', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ updated: true }),
    };
    mockCsrfFetch.mockResolvedValueOnce(mockResponse);

    await syncWithETag('/api/test', { data: 'test' });

    const calledHeaders = (mockCsrfFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(calledHeaders['If-Match']).toBeUndefined();
  });
});

describe('loadWithETag', () => {
  beforeEach(() => {
    mockCsrfFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts ETag from response headers', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'etag': '"version123"', 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ id: 1 }),
    };
    mockCsrfFetch.mockResolvedValueOnce(mockResponse);

    const result = await loadWithETag('/api/test');

    expect(result.success).toBe(true);
    expect(result.etag).toBe('"version123"');
    expect(result.data).toEqual({ id: 1 });
  });
});

describe('initialSyncState', () => {
  it('has correct default values', () => {
    expect(initialSyncState).toEqual({
      etag: null,
      lastSyncedAt: null,
      pendingSync: false,
      syncError: null,
    });
  });
});

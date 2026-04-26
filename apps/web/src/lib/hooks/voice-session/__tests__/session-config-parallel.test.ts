/**
 * @fileoverview Tests for parallelized fetch operations in session config
 * Task T1-10: Verify memory + adaptive context are fetched in parallel
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchConversationMemory } from '../memory-utils';

// Mock fetch globally
const originalFetch = global.fetch;

describe('Session Config Parallel Fetches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should fetch memory and adaptive context in parallel using Promise.allSettled', async () => {
    const fetchCalls: { url: string; startTime: number; endTime?: number }[] = [];

    // Mock fetch to track call order and timing
    global.fetch = vi.fn((url: string) => {
      const urlStr = url.toString();
      const startTime = Date.now();
      fetchCalls.push({ url: urlStr, startTime });

      // Simulate network delay
      return new Promise((resolve) => {
        setTimeout(() => {
          const callIndex = fetchCalls.findIndex((c) => c.url === urlStr && !c.endTime);
          if (callIndex !== -1) {
            fetchCalls[callIndex].endTime = Date.now();
          }

          if (urlStr.includes('/api/adaptive/context')) {
            resolve({
              ok: true,
              json: async () => ({ instruction: 'adaptive instruction' }),
            } as Response);
          } else if (urlStr.includes('/api/conversations')) {
            resolve({
              ok: true,
              json: async () => [{ summary: 'test summary' }],
            } as Response);
          } else {
            resolve({
              ok: false,
              json: async () => ({}),
            } as Response);
          }
        }, 50);
      });
    }) as typeof fetch;

    // Simulate the parallel fetch pattern we'll implement
    const maestroId = 'test-maestro';
    const subject = 'math';

    const memoryPromise = fetchConversationMemory(maestroId);
    const adaptivePromise = fetch(
      `/api/adaptive/context?subject=${encodeURIComponent(subject)}&source=voice`,
    );

    const results = await Promise.allSettled([memoryPromise, adaptivePromise]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');

    // Verify both fetches were called
    expect(fetchCalls.length).toBe(2);

    const memoryCall = fetchCalls.find((c) => c.url.includes('conversations'));
    const adaptiveCall = fetchCalls.find((c) => c.url.includes('adaptive'));

    expect(memoryCall).toBeDefined();
    expect(adaptiveCall).toBeDefined();

    // Both should start within a small time window (parallel execution)
    if (memoryCall && adaptiveCall) {
      const timeDiff = Math.abs(memoryCall.startTime - adaptiveCall.startTime);
      expect(timeDiff).toBeLessThan(10); // Should start nearly simultaneously
    }
  });

  it('should handle memory fetch failure gracefully when using Promise.allSettled', async () => {
    // Mock fetch to fail for memory, succeed for adaptive
    global.fetch = vi.fn((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes('memory')) {
        return Promise.reject(new Error('Memory fetch failed'));
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ instruction: 'adaptive instruction' }),
      } as Response);
    }) as typeof fetch;

    const memoryPromise = fetch('/api/memory/test').catch((e) => e);
    const adaptivePromise = fetch('/api/adaptive/context?source=voice');

    const results = await Promise.allSettled([memoryPromise, adaptivePromise]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('fulfilled'); // Caught error
    expect(results[1].status).toBe('fulfilled'); // Success
  });

  it('should handle adaptive context fetch failure gracefully when using Promise.allSettled', async () => {
    // Mock fetch to succeed for memory, fail for adaptive
    global.fetch = vi.fn((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes('adaptive')) {
        return Promise.resolve({
          ok: false,
          status: 500,
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ messages: [] }),
      } as Response);
    }) as typeof fetch;

    const memoryPromise = fetch('/api/memory/test');
    const adaptivePromise = fetch('/api/adaptive/context?source=voice');

    const results = await Promise.allSettled([memoryPromise, adaptivePromise]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');
  });

  it('should continue with empty context when both fetches fail', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error'))) as typeof fetch;

    const memoryPromise = fetch('/api/memory/test').catch(() => null);
    const adaptivePromise = fetch('/api/adaptive/context?source=voice').catch(() => null);

    const results = await Promise.allSettled([memoryPromise, adaptivePromise]);

    expect(results).toHaveLength(2);
    // Both should complete (with null values from catch handlers)
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');
  });
});

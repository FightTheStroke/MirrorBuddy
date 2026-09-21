import type { APIRequestContext } from '@playwright/test';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

/**
 * The guard exists so acceptance never streams against a deployed environment.
 * It pinned one port instead, which no runner but the author's used, so every
 * run outside that laptop failed on the guard rather than on the behaviour.
 */
export function assertLocalStreamTarget(url: string): void {
  const { hostname } = new URL(url);
  if (!LOOPBACK_HOSTS.has(hostname))
    throw new Error(`Mindmap acceptance must run against the local test server, not ${hostname}`);
}

/** Real streaming HTTP client; no interception of auth, persistence or SSE. */
export async function openMindmapStream(request: APIRequestContext, url: string) {
  assertLocalStreamTarget(url);
  const state = await request.storageState();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { cookie: state.cookies.map(({ name, value }) => `${name}=${value}`).join('; ') },
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  return {
    status: response.status,
    async next(): Promise<{ event: string; data: unknown } | null> {
      if (!reader) throw new Error('Missing response body');
      for (;;) {
        const boundary = buffer.indexOf('\n\n');
        if (boundary >= 0) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          if (frame.startsWith(':')) continue;
          const event =
            frame
              .split('\n')
              .find((line) => line.startsWith('event: '))
              ?.slice(7) ?? 'message';
          const data = frame
            .split('\n')
            .filter((line) => line.startsWith('data: '))
            .map((line) => line.slice(6))
            .join('\n');
          return { event, data: JSON.parse(data) };
        }
        const next = await reader.read();
        if (next.done) return null;
        buffer += decoder.decode(next.value, { stream: true });
      }
    },
    async close() {
      clearTimeout(timer);
      if (reader) await reader.cancel();
      controller.abort();
    },
  };
}

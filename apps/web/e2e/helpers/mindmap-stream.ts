import type { APIRequestContext } from '@playwright/test';

/** Real streaming HTTP client; no interception of auth, persistence or SSE. */
export async function openMindmapStream(request: APIRequestContext, url: string) {
  const target = new URL(url);
  if (target.hostname !== 'localhost' || target.port !== '3476')
    throw new Error('Mindmap acceptance requires the isolated local server on 3476');
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

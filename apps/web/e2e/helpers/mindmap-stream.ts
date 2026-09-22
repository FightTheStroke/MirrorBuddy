import type { APIRequestContext } from '@playwright/test';

/** Hosts the acceptance suite is allowed to stream from; the port comes from the caller. */
const CANONICAL_HOSTS = ['localhost', '127.0.0.1'];
/** The only route this helper is allowed to send the real session to. */
const STREAM_ROUTE = '/api/tools/stream';

function parseLocalOrigin(value: unknown, label: string): URL {
  if (typeof value !== 'string' || value.length === 0)
    throw new Error(`Mindmap acceptance requires an explicit ${label}`);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Mindmap acceptance received a malformed ${label}`);
  }
  if (parsed.protocol !== 'http:') throw new Error(`Mindmap acceptance requires an http ${label}`);
  if (parsed.username !== '' || parsed.password !== '')
    throw new Error(`Mindmap acceptance refuses credentials in the ${label}`);
  if (!CANONICAL_HOSTS.includes(parsed.hostname))
    throw new Error(`Mindmap acceptance requires an owned local host in the ${label}`);
  return parsed;
}

/**
 * Validate the stream target against the origin Playwright is configured with.
 *
 * The origin is never inferred from the url under test, and every rejection happens before
 * any session cookie is read or any request is issued. Passing these checks proves the
 * origin only; ownership of that server is established by the coordinator's private
 * namespace and the real Playwright webServer.
 */
function validateStreamTarget(url: string, expectedOrigin: unknown): void {
  const expected = parseLocalOrigin(expectedOrigin, 'configured origin');
  if (expected.href !== `${expected.origin}/` && expected.href !== expected.origin)
    throw new Error('Mindmap acceptance requires a bare configured origin');
  const target = parseLocalOrigin(url, 'stream target');
  if (target.origin !== expected.origin)
    throw new Error('Mindmap acceptance requires the configured local server origin');
  if (target.pathname !== STREAM_ROUTE)
    throw new Error(`Mindmap acceptance only streams from ${STREAM_ROUTE}`);
}

/** Real streaming HTTP client; no interception of auth, persistence or SSE. */
export async function openMindmapStream(
  request: APIRequestContext,
  url: string,
  expectedOrigin: string | undefined,
) {
  validateStreamTarget(url, expectedOrigin);
  const state = await request.storageState();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { cookie: state.cookies.map(({ name, value }) => `${name}=${value}`).join('; ') },
      redirect: 'error',
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
  if (response.status >= 300 && response.status < 400) {
    clearTimeout(timer);
    throw new Error('Mindmap acceptance refuses to follow a redirect from the stream route');
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIRequestContext } from '@playwright/test';
import { openMindmapStream } from '../../e2e/helpers/mindmap-stream';

/**
 * Guard contract for the mindmap acceptance stream helper.
 *
 * The helper must accept the origin configured by Playwright (passed explicitly by the
 * caller) instead of a hardcoded port, and must reject every unsafe target BEFORE it reads
 * session cookies or issues a request.
 *
 * Most negatives deliberately use the legacy-accepted origin http://localhost:3476 as their
 * control, so the only thing that can refuse them is the property under test rather than the
 * old port precondition. Every negative is paired with a legitimate positive.
 */

type StreamOpener = (
  request: APIRequestContext,
  url: string,
  expectedOrigin: string,
) => Promise<{ status: number; close: () => Promise<void> }>;

const openStream = openMindmapStream as unknown as StreamOpener;

const CONTROL = 'http://localhost:3476';
const STREAM_PATH = '/api/tools/stream';
const QUERY = 'sessionId=s-1&toolId=mindmap';
const controlUrl = `${CONTROL}${STREAM_PATH}?${QUERY}`;

let storageState: ReturnType<typeof vi.fn>;
let fetchSpy: ReturnType<typeof vi.fn>;

function fakeRequest(): APIRequestContext {
  return { storageState } as unknown as APIRequestContext;
}

function emptyStreamResponse() {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    }),
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  );
}

async function expectAccepted(url: string, expectedOrigin: string) {
  const stream = await openStream(fakeRequest(), url, expectedOrigin);
  expect(stream.status).toBe(200);
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  await stream.close();
}

async function expectRejectedBeforeAnyIO(url: string, expectedOrigin: unknown) {
  await expect(openStream(fakeRequest(), url, expectedOrigin as string)).rejects.toThrow();
  expect(
    storageState,
    'session cookies must not be read for a rejected target',
  ).not.toHaveBeenCalled();
  expect(fetchSpy, 'no request may be issued for a rejected target').not.toHaveBeenCalled();
}

beforeEach(() => {
  storageState = vi
    .fn()
    .mockResolvedValue({ cookies: [{ name: 'session', value: 'v' }], origins: [] });
  // A fresh Response per call: a single instance would have its body locked by the second read.
  fetchSpy = vi.fn().mockImplementation(async () => emptyStreamResponse());
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('openMindmapStream accepts the configured owned origin', () => {
  for (const origin of [
    'http://localhost:3000',
    'http://localhost:3123',
    'http://127.0.0.1:3123',
  ]) {
    it(`accepts ${origin} when it is the configured origin`, async () => {
      await expectAccepted(`${origin}${STREAM_PATH}?${QUERY}`, origin);
    });
  }

  it('accepts the legacy 3476 origin, which is the control for the negatives below', async () => {
    await expectAccepted(controlUrl, CONTROL);
  });

  it('reads the session cookies exactly once for an accepted target', async () => {
    const stream = await openStream(fakeRequest(), controlUrl, CONTROL);
    expect(storageState).toHaveBeenCalledTimes(1);
    await stream.close();
  });

  it('accepts a harmless absolute url carried in the query string', async () => {
    await expectAccepted(
      `${CONTROL}${STREAM_PATH}?${QUERY}&next=${encodeURIComponent('http://example.com/')}`,
      CONTROL,
    );
  });
});

describe('openMindmapStream url guards, proven on the accepted control origin', () => {
  it('rejects credentials embedded in the url', async () => {
    await expectRejectedBeforeAnyIO(
      `http://user:secret@localhost:3476${STREAM_PATH}?${QUERY}`,
      CONTROL,
    );
  });

  it('rejects a different scheme on the control host and port', async () => {
    await expectRejectedBeforeAnyIO(`https://localhost:3476${STREAM_PATH}?${QUERY}`, CONTROL);
  });

  it('rejects a path outside the acceptance stream route', async () => {
    await expectRejectedBeforeAnyIO(`${CONTROL}/api/admin/research/stats?${QUERY}`, CONTROL);
  });

  it('accepts the same route once the offending path element is removed', async () => {
    await expectAccepted(controlUrl, CONTROL);
  });

  it('rejects a target on a different owned port than the configured one', async () => {
    await expectRejectedBeforeAnyIO(controlUrl, 'http://localhost:3000');
  });

  it('accepts that same target when the configured origin matches it', async () => {
    await expectAccepted(controlUrl, CONTROL);
  });
});

describe('openMindmapStream configuration guards, proven on a valid target', () => {
  for (const [label, origin] of [
    ['missing', undefined],
    ['null', null],
    ['empty', ''],
    ['malformed', 'localhost:3476'],
    ['path-bearing', 'http://localhost:3476/api'],
  ] as const) {
    it(`rejects a ${label} configured origin even though the target is valid`, async () => {
      await expectRejectedBeforeAnyIO(controlUrl, origin);
    });
  }

  it('rejects a malformed target url', async () => {
    await expectRejectedBeforeAnyIO('not-a-url', CONTROL);
  });
});

describe('openMindmapStream host allowlist, proven independently of origin equality', () => {
  for (const [label, origin] of [
    ['a remote host', 'http://mirrorbuddy.example.com'],
    ['a lookalike hostname', 'http://localhost.example.com:3476'],
    ['a non-canonical loopback address', 'http://127.0.0.2:3476'],
  ] as const) {
    it(`rejects ${label} even when the configured origin matches it exactly`, async () => {
      await expectRejectedBeforeAnyIO(`${origin}${STREAM_PATH}?${QUERY}`, origin);
    });
  }

  it('accepts the two canonical local hosts on the same port', async () => {
    await expectAccepted(`http://localhost:3123${STREAM_PATH}?${QUERY}`, 'http://localhost:3123');
    fetchSpy.mockClear();
    await expectAccepted(`http://127.0.0.1:3123${STREAM_PATH}?${QUERY}`, 'http://127.0.0.1:3123');
  });
});

describe('openMindmapStream redirect contract, reached through the accepted control', () => {
  it('asks the runtime never to follow a redirect', async () => {
    const stream = await openStream(fakeRequest(), controlUrl, CONTROL);

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.redirect).toBe('error');
    await stream.close();
  });

  it('surfaces a real redirect as a failure instead of following it', async () => {
    fetchSpy.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.redirect !== 'error') {
        return new Response(null, { status: 302, headers: { location: 'http://example.com/' } });
      }
      throw new TypeError('fetch failed: unexpected redirect');
    });

    await expect(openStream(fakeRequest(), controlUrl, CONTROL)).rejects.toThrow(/redirect/i);
  });
});

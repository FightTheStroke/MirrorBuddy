// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { warn, error } = vi.hoisted(() => ({ warn: vi.fn(), error: vi.fn() }));

vi.mock('@/lib/logger', () => {
  const logger = {
    info: vi.fn(),
    warn,
    error,
    debug: vi.fn(),
    child: () => logger,
  };
  return { logger, default: logger };
});

vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));

import { useProgressStore } from '../progress-store';

function respondWith(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('loading progress from the server', () => {
  beforeEach(() => {
    warn.mockClear();
    error.mockClear();
  });

  it('stays quiet when the browser drops the request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));

    await useProgressStore.getState().loadFromServer();

    expect(warn).not.toHaveBeenCalled();
  });

  it('stays quiet when the page navigates away mid-flight', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await useProgressStore.getState().loadFromServer();

    expect(warn).not.toHaveBeenCalled();
  });

  it('still reports a genuine failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new SyntaxError('Unexpected token <')));

    await useProgressStore.getState().loadFromServer();

    expect(warn).toHaveBeenCalled();
  });

  it('passes the caller abort signal to both requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respondWith({}));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await useProgressStore.getState().loadFromServer(controller.signal);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const call of fetchMock.mock.calls) {
      expect(call[1]?.signal).toBe(controller.signal);
    }
  });

  it('still loads the data it did receive', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respondWith({ xp: 42, level: 3 })));

    await useProgressStore.getState().loadFromServer();

    expect(useProgressStore.getState().xp).toBe(42);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCSRFToken } from '@/lib/auth';
import { initializeClientMap } from '../initialize-client';

const snapshot = {
  toolId: 'map',
  sessionId: 'saved-source',
  revision: 3,
  content: { title: 'Saved', nodes: [], markdown: '# Saved' },
};
const network = vi.fn<typeof fetch>();
beforeEach(() => {
  clearCSRFToken();
  vi.stubGlobal('fetch', network);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  clearCSRFToken();
});
describe('owned browser initialization over HTTP', () => {
  it('rejects a server account switch before submitting old visible content', async () => {
    network.mockResolvedValue(Response.json({ user: { id: 'new-owner' } }));
    await expect(
      initializeClientMap(
        'map',
        null,
        { title: 'Private old content' },
        new AbortController().signal,
        'old-owner',
      ),
    ).rejects.toThrow('owner changed');
    expect(network).toHaveBeenCalledTimes(1);
  });
  it('reopens the exact saved source instead of rebinding to the current conversation', async () => {
    network.mockImplementation(async (url) => {
      if (url === '/api/auth/me') return Response.json({ user: { id: 'owner' } });
      if (url === '/api/materials/map')
        return Response.json({ material: { mindmapSourceSession: 'saved-source' } });
      if (url === '/api/session') return Response.json({ csrfToken: 'csrf' });
      return Response.json(snapshot);
    });
    expect(
      await initializeClientMap('map', 'different-conversation', {}, new AbortController().signal),
    ).toEqual({ owner: 'owner', snapshot });
    expect(JSON.parse(String(network.mock.lastCall?.[1]?.body))).toMatchObject({
      sessionId: 'saved-source',
    });
  });
  it.each([401, 403])(
    'never falls through rejected authentication (%s) to a trial',
    async (status) => {
      network.mockResolvedValue(Response.json({ code: 'AUTH_REJECTED' }, { status }));
      await expect(
        initializeClientMap('map', null, {}, new AbortController().signal),
      ).rejects.toThrow('authentication');
      expect(network).toHaveBeenCalledTimes(1);
    },
  );
  it('derives trial identity from the server only after AUTH_ABSENT', async () => {
    network.mockImplementation(async (url) => {
      if (url === '/api/auth/me') return Response.json({ code: 'AUTH_ABSENT' }, { status: 401 });
      if (url === '/api/trial/session') return Response.json({ sessionId: 'real-trial' });
      if (url === '/api/session') return Response.json({ csrfToken: 'csrf' });
      return Response.json({ ...snapshot, sessionId: 'real-trial' });
    });
    const result = await initializeClientMap(
      'map',
      'untrusted-source',
      {},
      new AbortController().signal,
    );
    expect(result.owner).toBe('trial:real-trial');
    expect(JSON.parse(String(network.mock.lastCall?.[1]?.body))).toMatchObject({
      sessionId: 'real-trial',
    });
  });
  it('rejects a wrong snapshot identity', async () => {
    network.mockImplementation(async (url) => {
      if (url === '/api/auth/me') return Response.json({ user: { id: 'owner' } });
      if (url === '/api/materials/map') return new Response(null, { status: 404 });
      if (url === '/api/session') return Response.json({ csrfToken: 'csrf' });
      return Response.json(snapshot);
    });
    await expect(
      initializeClientMap('map', 'different', {}, new AbortController().signal),
    ).rejects.toThrow('identity mismatch');
  });
});

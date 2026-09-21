import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleToolCall } from '../tool-handlers';
import { csrfFetch } from '@/lib/auth';
import { resolveVoiceSourceSession } from '../source-session';

vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe('real voice dispatcher at the network boundary', () => {
  it('dispatches modification to the selected map and reports the durable result', async () => {
    vi.mocked(csrfFetch).mockResolvedValue(
      Response.json({ toolId: 'map', operationId: 'call', revision: 2 }),
    );
    const onMindmapResult = vi.fn();
    const updateToolCall = vi.fn();
    await handleToolCall({
      event: { name: 'mindmap_add_node', arguments: '{"concept":"Cell"}', call_id: 'call' },
      maestroRef: { current: null },
      sessionIdRef: { current: 'not-the-map-source' },
      webrtcDataChannelRef: { current: null },
      addToolCall: vi.fn(),
      updateToolCall,
      options: {
        getActiveMindmap: () => ({ toolId: 'map', sessionId: 'source', revision: 1 }),
        onMindmapResult,
      },
    });
    expect(vi.mocked(csrfFetch)).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(vi.mocked(csrfFetch).mock.calls[0][1]?.body))).toMatchObject({
      toolId: 'map',
      sessionId: 'source',
      operationId: 'call',
      baseRevision: 1,
    });
    expect(updateToolCall).toHaveBeenCalledWith('call', { status: 'completed' });
    expect(onMindmapResult).toHaveBeenCalledWith(expect.objectContaining({ revision: 2 }));
  });

  it('reports unavailable selection as an error, not the old generic success', async () => {
    const updateToolCall = vi.fn();
    await handleToolCall({
      event: { name: 'mindmap_delete_node', arguments: '{"node":"root"}', call_id: 'call' },
      maestroRef: { current: null },
      sessionIdRef: { current: 'voice-session' },
      webrtcDataChannelRef: { current: null },
      addToolCall: vi.fn(),
      updateToolCall,
      options: {},
    });
    expect(csrfFetch).not.toHaveBeenCalled();
    expect(updateToolCall).toHaveBeenCalledWith('call', { status: 'error' });
  });

  it('keeps authenticated sources and resolves trial sources from the owned server session', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ authenticated: true }))
      .mockResolvedValueOnce(Response.json({ code: 'AUTH_ABSENT' }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ sessionId: 'trial-source' }));
    vi.stubGlobal('fetch', fetcher);
    expect(await resolveVoiceSourceSession('voice-source')).toBe('voice-source');
    expect(await resolveVoiceSourceSession('voice-source')).toBe('trial-source');
    expect(fetcher).toHaveBeenLastCalledWith('/api/trial/session', { cache: 'no-store' });
  });

  it('never falls back from rejected authentication or an absent trial session', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ code: 'SESSION_REJECTED' }, { status: 401 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(resolveVoiceSourceSession('source')).rejects.toThrow('authentication rejected');
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher
      .mockResolvedValueOnce(Response.json({ code: 'AUTH_ABSENT' }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ hasSession: false }));
    await expect(resolveVoiceSourceSession('source')).rejects.toThrow('owned trial session');
  });
});

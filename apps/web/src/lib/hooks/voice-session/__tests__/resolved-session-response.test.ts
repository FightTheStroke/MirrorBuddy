import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHandleServerEvent } from '../event-handlers';
import { created, done, makeDeps } from './usage-event-fixture';
import { csrfFetch } from '@/lib/auth';
import { executeVoiceTool } from '@/lib/voice';
import * as meditation from '@/lib/meditation/browser';

vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));
vi.mock('@/lib/voice', () => ({
  executeVoiceTool: vi.fn(),
  isToolCreationCommand: (name: string) => name === 'create_mindmap',
  isOnboardingCommand: () => false,
}));

const caption = (part: number, response = 'resp-map') => ({
  type: 'response.output_audio_transcript.done',
  response_id: response,
  item_id: 'item-map',
  output_index: 0,
  content_index: part,
  transcript: part === 0 ? 'Here is the map.' : 'We can explore it together.',
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(csrfFetch).mockImplementation(async () => new Response('{"success":true}'));
  vi.mocked(executeVoiceTool).mockResolvedValue({ success: true });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('trial mindmap persistence identity is not a connection boundary', () => {
  it.each(['response.done', 'response.cancelled'])(
    'retains buffered subtitles and finishes %s after the real async tool changes sessionId',
    async (terminal) => {
      const trial = Promise.withResolvers<Response>();
      const fetchMock = vi.fn(async (url: string) => {
        if (url === '/api/auth/me') return new Response('{"code":"AUTH_ABSENT"}', { status: 401 });
        if (url === '/api/trial/session') return trial.promise;
        throw new Error(`Unexpected fetch: ${url}`);
      });
      vi.stubGlobal('fetch', fetchMock);
      const openingFinished = vi.spyOn(meditation, 'openingFinished');
      const deps = makeDeps();
      deps.voiceConnectStartTimeRef.current = 10;
      const { result } = renderHook(() => useHandleServerEvent(deps));
      result.current(created('resp-map'));
      result.current(caption(1));
      result.current({
        type: 'response.function_call_arguments.done',
        name: 'create_mindmap',
        call_id: 'call-map',
        arguments: JSON.stringify({ title: 'Our map', nodes: [] }),
      });
      await act(async () => {});
      expect(fetchMock).toHaveBeenCalledWith('/api/trial/session', { cache: 'no-store' });
      expect(deps.sessionIdRef.current).toBe('sess-c6');
      await act(async () => {
        trial.resolve(new Response('{"sessionId":"trial-owned"}'));
      });
      expect(deps.sessionIdRef.current).toBe('trial-owned');
      expect(executeVoiceTool).toHaveBeenCalledWith(
        'trial-owned',
        'unknown',
        'create_mindmap',
        { title: 'Our map', nodes: [] },
        { operationId: 'call-map', activeMindmap: undefined },
      );
      result.current(caption(0));
      expect(vi.mocked(deps.addTranscript).mock.calls).toEqual([
        ['assistant', 'Here is the map.'],
        ['assistant', 'We can explore it together.'],
      ]);
      result.current({ ...done('resp-map'), type: terminal });
      expect(deps.hasActiveResponseRef.current).toBe(false);
      expect(openingFinished).toHaveBeenCalledTimes(terminal === 'response.done' ? 1 : 0);
      if (terminal === 'response.cancelled') result.current(done('resp-map'));
      await act(async () => {});
      result.current(done('resp-map'));
      expect(csrfFetch).toHaveBeenCalledTimes(1);
      const original = JSON.parse(String(vi.mocked(csrfFetch).mock.calls[0][1]?.body));
      expect(original).toMatchObject({ sessionId: 'sess-c6', responseId: 'resp-map' });
      result.current(created('resp-next'));
      result.current(done('resp-next'));
      const next = JSON.parse(String(vi.mocked(csrfFetch).mock.calls[1][1]?.body));
      expect(next).toMatchObject({ sessionId: 'trial-owned', responseId: 'resp-next' });
    },
  );

  it('rejects stale responses on reconnect even when the persistence ID stays the same', () => {
    const deps = makeDeps();
    deps.voiceConnectStartTimeRef.current = 10;
    const { result } = renderHook(() => useHandleServerEvent(deps));
    result.current(created('resp-old'));
    result.current(caption(1, 'resp-old'));
    deps.voiceConnectStartTimeRef.current = 20;
    result.current(created('resp-new'));
    result.current(caption(0, 'resp-old'));
    result.current(done('resp-old'));
    expect(deps.addTranscript).not.toHaveBeenCalled();
    expect(csrfFetch).not.toHaveBeenCalled();
    expect(deps.hasActiveResponseRef.current).toBe(true);
    result.current(caption(0, 'resp-new'));
    result.current(done('resp-new'));
    expect(deps.addTranscript).toHaveBeenCalledExactlyOnceWith('assistant', 'Here is the map.');
    expect(csrfFetch).toHaveBeenCalledTimes(1);
    expect(deps.hasActiveResponseRef.current).toBe(false);
  });
});

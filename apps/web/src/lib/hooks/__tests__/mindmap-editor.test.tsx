import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCSRFToken, setClientIdentity } from '@/lib/auth';
import { useMindmapEditor } from '../use-mindmap-editor';
import { executeActiveMapCommand, useActiveMindmapStore } from '@/lib/stores/active-mindmap-store';
import { handleToolCall } from '../voice-session/tool-handlers';
const snapshot = (toolId: string, revision = 0) => ({
  toolId,
  sessionId: `map-${toolId}`,
  revision,
  content: {
    title: toolId,
    nodes: [{ id: 'root', label: 'Root', children: [], color: '#123456' }],
    markdown: `# ${toolId}\n## Root`,
  },
});
const streams = new Map<string, ReadableStreamDefaultController<Uint8Array>>();
const cancel = vi.fn();
const commands = vi.fn<typeof fetch>();
let delayed: ((response: Response) => void) | null = null;
let delayMap: string | null = null;
const emit = (toolId: string, revision = 0) =>
  streams
    .get(toolId)
    ?.enqueue(
      new TextEncoder().encode(
        `event: mindmap:snapshot\ndata: ${JSON.stringify(snapshot(toolId, revision))}\n\n`,
      ),
    );
function mount(toolId: string, focus = vi.fn()) {
  return renderHook(() =>
    useMindmapEditor({
      toolId,
      sessionId: null,
      content: snapshot(toolId).content,
      enabled: true,
      focus,
    }),
  );
}
beforeEach(() => {
  setClientIdentity({
    status: 'authenticated',
    userId: 'owner',
    role: 'USER',
    legacyOrigin: false,
    needsLegacyUpgrade: false,
  });
  clearCSRFToken();
  streams.clear();
  delayed = null;
  delayMap = null;
  useActiveMindmapStore.setState({ active: null, views: [] });
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (url, init) => {
      if (url === '/api/auth/me') return Response.json({ user: { id: 'owner' } });
      if (String(url).startsWith('/api/materials/')) return new Response(null, { status: 404 });
      if (url === '/api/session') return Response.json({ csrfToken: 'csrf' });
      if (url === '/api/tools/mindmap') {
        const { toolId } = JSON.parse(String(init?.body));
        if (toolId === delayMap)
          return new Promise<Response>((resolve) => {
            delayed = resolve;
          });
        return Response.json(snapshot(toolId));
      }
      if (String(url).startsWith('/api/tools/stream?')) {
        const toolId = new URL(String(url), 'http://localhost').searchParams.get('toolId')!;
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              streams.set(toolId, controller);
              emit(toolId);
            },
            cancel() {
              streams.delete(toolId);
              cancel(toolId);
            },
          }),
          { headers: { 'content-type': 'text/event-stream' } },
        );
      }
      return commands(url, init);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  clearCSRFToken();
});
describe('actual editor lifecycle and voice bridge', () => {
  it('releases a closed pending editor when its late server receipt completes', async () => {
    const view = mount('late-receipt');
    await waitFor(() => expect(view.result.current.state?.canMutate).toBe(true));
    const previous = view.result.current.editor!;
    const receipt = Promise.withResolvers<Response>();
    commands.mockReturnValueOnce(receipt.promise);
    let completion: Promise<unknown>;
    act(() => {
      completion = previous.command('mindmap_add_node', { concept: 'Late' }, 'late');
    });
    view.unmount();
    await act(async () => {
      receipt.resolve(Response.json({ toolId: 'late-receipt', operationId: 'late', revision: 1 }));
      await completion;
    });
    const reopened = mount('late-receipt');
    await waitFor(() => expect(reopened.result.current.state?.canMutate).toBe(true));
    expect(reopened.result.current.editor).not.toBe(previous);
    expect(reopened.result.current.state?.pending).toBeNull();
  });
  it.each(['anonymous', 'other-owner'])(
    'hides and stops the previous owner map on %s without initializing it for another account',
    async (next) => {
      const view = mount('private-map');
      await waitFor(() => expect(view.result.current.state?.canMutate).toBe(true));
      act(() =>
        setClientIdentity(
          next === 'anonymous'
            ? { status: 'anonymous' }
            : {
                status: 'authenticated',
                userId: next,
                role: 'USER',
                legacyOrigin: false,
                needsLegacyUpgrade: false,
              },
        ),
      );
      expect(view.result.current.state).toBeUndefined();
      expect(view.result.current.editor).toBeNull();
      await waitFor(() => expect(streams.size).toBe(0));
      expect(
        (await executeActiveMapCommand('mindmap_add_node', { concept: 'Unsafe' }, 'wrong-owner'))
          .success,
      ).toBe(false);
      expect(commands).not.toHaveBeenCalled();
    },
  );
  it('uses the rendered selection in the real voice dispatcher and applies focus without a revision write', async () => {
    const focus = vi.fn();
    const view = mount('voice-selected', focus);
    await waitFor(() => expect(view.result.current.state?.canMutate).toBe(true));
    commands.mockResolvedValueOnce(
      Response.json({
        toolId: 'voice-selected',
        operationId: 'voice-focus',
        revision: 0,
        focus: { nodeId: 'root', label: 'Root' },
      }),
    );
    const updateToolCall = vi.fn();
    await act(async () =>
      handleToolCall({
        event: { name: 'mindmap_focus_node', arguments: '{"node":"root"}', call_id: 'voice-focus' },
        maestroRef: { current: null },
        sessionIdRef: { current: 'different-voice-source' },
        webrtcDataChannelRef: { current: null },
        addToolCall: vi.fn(),
        updateToolCall,
        options: {},
      }),
    );
    expect(JSON.parse(String(commands.mock.calls[0][1]?.body))).toEqual({
      toolId: 'voice-selected',
      sessionId: 'map-voice-selected',
      operationId: 'voice-focus',
      baseRevision: 0,
      command: 'mindmap_focus_node',
      args: { node: 'root' },
    });
    expect(focus).toHaveBeenCalledWith('root');
    expect(updateToolCall).toHaveBeenCalledWith('voice-focus', { status: 'completed' });
    expect(view.result.current.state?.canUndo).toBe(false);
  });
  it('immediately pauses an established stream on browser offline even if its socket stays open', async () => {
    const view = mount('offline-map');
    await waitFor(() => expect(view.result.current.state?.canMutate).toBe(true));
    act(() => window.dispatchEvent(new Event('offline')));
    expect(view.result.current.state?.canMutate).toBe(false);
    await waitFor(() => expect(streams.size).toBe(0));
    expect(view.result.current.recovery.status).toBe('recovering');
  });
  it('does not let slow initialization steal a newer visible map; restores prior selection on close', async () => {
    delayMap = 'slow';
    const first = mount('slow');
    await waitFor(() => expect(delayed).not.toBeNull());
    const second = mount('selected');
    await waitFor(() => expect(second.result.current.state?.canMutate).toBe(true));
    await act(async () => {
      delayed?.(Response.json(snapshot('slow')));
    });
    expect(first.result.current.active).toBe(false);
    expect(streams.size).toBe(1);
    expect(streams.has('selected')).toBe(true);
    second.unmount();
    await waitFor(() => expect(first.result.current.state?.canMutate).toBe(true));
    expect(streams.size).toBe(1);
    expect(streams.has('slow')).toBe(true);
    first.unmount();
    await waitFor(() => expect(streams.size).toBe(0));
  });
  it('retains an ambiguous voice operation on close/reopen and retries the same envelope', async () => {
    const view = mount('pending-map');
    await waitFor(() => expect(view.result.current.state?.canMutate).toBe(true));
    commands.mockRejectedValueOnce(new Error('response lost'));
    await act(async () => {
      expect(
        (await executeActiveMapCommand('mindmap_add_node', { concept: 'Nucleus' }, 'voice-call-1'))
          .success,
      ).toBe(false);
    });
    const original = String(commands.mock.calls[0][1]?.body);
    expect(JSON.parse(original)).toMatchObject({
      toolId: 'pending-map',
      baseRevision: 0,
      operationId: 'voice-call-1',
    });
    view.unmount();
    const reopened = mount('pending-map');
    await waitFor(() => expect(reopened.result.current.recovery.canMutate).toBe(true));
    expect(reopened.result.current.state?.pending?.command.operationId).toBe('voice-call-1');
    commands.mockResolvedValueOnce(
      Response.json({ toolId: 'pending-map', operationId: 'voice-call-1', revision: 1 }),
    );
    await act(async () => {
      reopened.result.current.retry();
    });
    await waitFor(() => expect(commands).toHaveBeenCalledTimes(2));
    expect(String(commands.mock.calls[1][1]?.body)).toBe(original);
    expect(reopened.result.current.state?.canMutate).toBe(false);
    await act(async () => emit('pending-map', 1));
    expect(reopened.result.current.state?.canMutate).toBe(true);
  });
  it('stops the stream and mutations while the document is hidden', async () => {
    const view = mount('visible');
    await waitFor(() => expect(view.result.current.state?.canMutate).toBe(true));
    const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(streams.size).toBe(0));
    expect(
      (await executeActiveMapCommand('mindmap_add_node', { concept: 'Blocked' }, 'hidden')).success,
    ).toBe(false);
    expect(commands).not.toHaveBeenCalled();
    visible.mockRestore();
  });
});

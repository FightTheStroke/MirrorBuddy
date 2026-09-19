import { act, cleanup, renderHook } from '@testing-library/react';
import { createElement, StrictMode, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMindmapModifications } from '../use-mindmap-modifications';

const fetcher = vi.fn<typeof fetch>();
const sources: Array<{
  controller: ReadableStreamDefaultController<Uint8Array>;
  signal: AbortSignal;
}> = [];
const encoder = new TextEncoder();
const snapshot = (toolId: string, revision = 0) => ({
  sessionId: 'source',
  toolId,
  revision,
  content: {
    title: 'Cells',
    nodes: [{ id: 'root', label: 'Cell', color: '#123456', children: [] }],
    markdown: '# Cells\n## Cell',
  },
});
const send = (index: number, toolId: string, revision = 0) =>
  sources[index].controller.enqueue(
    encoder.encode(
      `event: mindmap:snapshot\ndata: ${JSON.stringify(snapshot(toolId, revision))}\n\n`,
    ),
  );
const flush = async () => {
  await act(async () => vi.advanceTimersByTimeAsync(0));
};

beforeEach(() => {
  vi.useFakeTimers();
  sources.length = 0;
  fetcher.mockReset();
  fetcher.mockImplementation(
    async (_url, init) =>
      new Response(
        new ReadableStream({
          start(controller) {
            sources.push({ controller, signal: init!.signal! });
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      ),
  );
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal(
    'EventSource',
    vi.fn(() => {
      throw new Error('Legacy transport used in snapshot mode');
    }),
  );
});
afterEach(async () => {
  cleanup();
  await flush();
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('active-view snapshot hook', () => {
  it('opens only one StrictMode subscription and never routes snapshots to local edit callbacks', async () => {
    const onSnapshot = vi.fn();
    const onAddNode = vi.fn();
    const { result } = renderHook(
      () =>
        useMindmapModifications({
          sessionId: 'source',
          toolId: 'map',
          callbacks: { onAddNode },
          onSnapshot,
        }),
      { wrapper: ({ children }: PropsWithChildren) => createElement(StrictMode, null, children) },
    );
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.recovery.canMutate).toBe(false);
    await act(async () => {
      send(0, 'map');
      send(0, 'map');
    });
    expect(onSnapshot).toHaveBeenCalledExactlyOnceWith(snapshot('map'));
    expect(onAddNode).not.toHaveBeenCalled();
    expect(result.current.snapshot).toEqual(snapshot('map'));
    expect(result.current.isConnected).toBe(true);
    expect(result.current.lastEvent).toBeNull();
  });

  it('closes the previous map on selection change and subscribes only while enabled', async () => {
    const { result, rerender } = renderHook(
      ({ toolId, enabled }) =>
        useMindmapModifications({
          sessionId: 'source',
          toolId,
          enabled,
          callbacks: {},
        }),
      { initialProps: { toolId: 'first', enabled: true } },
    );
    await flush();
    await act(async () => send(0, 'first'));
    rerender({ toolId: 'second', enabled: true });
    expect(result.current.snapshot).toBeNull();
    await flush();
    expect(sources[0].signal.aborted).toBe(true);
    expect(sources.filter((source) => !source.signal.aborted)).toHaveLength(1);
    await act(async () => {
      send(1, 'first', 99);
      send(1, 'second');
    });
    expect(result.current.snapshot).toEqual(snapshot('second'));
    rerender({ toolId: 'second', enabled: false });
    await flush();
    expect(sources.every((source) => source.signal.aborted)).toBe(true);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.recovery.canMutate).toBe(false);
    act(() => result.current.reconnect());
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
    rerender({ toolId: 'second', enabled: true });
    expect(result.current.recovery.canMutate).toBe(false);
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(result.current.recovery.canMutate).toBe(false);
    await act(async () => send(2, 'second'));
    expect(result.current.recovery.canMutate).toBe(true);
  });

  it('keeps the last snapshot visible during recovery and uses current callbacks without reconnecting', async () => {
    const first = vi.fn();
    const next = vi.fn();
    const { result, rerender } = renderHook(
      ({ onSnapshot }) =>
        useMindmapModifications({
          sessionId: 'source',
          toolId: 'map',
          callbacks: {},
          onSnapshot,
        }),
      { initialProps: { onSnapshot: first } },
    );
    await flush();
    await act(async () => send(0, 'map'));
    rerender({ onSnapshot: next });
    await act(async () => send(0, 'map', 1));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledExactlyOnceWith(snapshot('map', 1));
    await act(async () => sources[0].controller.close());
    expect(result.current.snapshot).toEqual(snapshot('map', 1));
    expect(result.current.recovery.canMutate).toBe(false);
  });

  it('cancels deferred subscription when the active view unmounts', async () => {
    const { unmount } = renderHook(() =>
      useMindmapModifications({
        sessionId: 'source',
        toolId: 'map',
        callbacks: {},
      }),
    );
    unmount();
    await flush();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

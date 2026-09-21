import { act, cleanup, renderHook } from '@testing-library/react';
import { createElement, StrictMode, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMindmapModifications } from '../use-mindmap-modifications';
import { useToolStream } from '../use-tool-stream';
import { logger } from '@/lib/logger';
import { addBreadcrumb } from '@/lib/sentry';

vi.mock('@/lib/sentry', () => ({ addBreadcrumb: vi.fn() }));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));
vi.mock('@/lib/logger/client', () => ({
  clientLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  listeners = new Map<string, (event: Event) => void>();
  close = vi.fn();

  constructor(readonly url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, callback: (event: Event) => void) {
    this.listeners.set(type, callback);
  }

  removeEventListener(type: string, callback: (event: Event) => void) {
    if (this.listeners.get(type) === callback) this.listeners.delete(type);
  }

  fail() {
    this.onerror?.(new Event('error'));
    this.listeners.get('error')?.(new Event('error'));
  }
}

describe('SSE subscription lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('closes the failed mindmap source before scheduling its manual retry', () => {
    renderHook(() => useMindmapModifications({ sessionId: 'mindmap', callbacks: {} }));
    const source = MockEventSource.instances[0];

    act(() => source.fail());

    expect(source.close).toHaveBeenCalledTimes(1);
    expect(source.onerror).toBeNull();
    act(() => vi.advanceTimersByTime(3000));
    expect(MockEventSource.instances).toHaveLength(2);
    expect(addBreadcrumb).toHaveBeenCalledWith(
      'mindmap',
      '[MindmapModifications] SSE error, reconnecting...',
      { attempt: 1, delay: 1000 },
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('ignores a queued mindmap error after unmount', () => {
    const { unmount } = renderHook(() =>
      useMindmapModifications({ sessionId: 'mindmap', callbacks: {} }),
    );
    const lateError = MockEventSource.instances[0].onerror;
    unmount();

    act(() => {
      lateError?.(new Event('error'));
      vi.advanceTimersByTime(3000);
    });

    expect(MockEventSource.instances).toHaveLength(1);
  });

  it('cancels a pending mindmap retry when reconnecting manually', () => {
    const { result } = renderHook(() =>
      useMindmapModifications({ sessionId: 'mindmap', callbacks: {} }),
    );
    act(() => MockEventSource.instances[0].fail());
    act(() => result.current.reconnect());
    act(() => vi.advanceTimersByTime(3000));

    expect(MockEventSource.instances).toHaveLength(2);
  });

  it('does not let an old mindmap source disconnect the replacement session', () => {
    const { rerender, result } = renderHook(
      ({ sessionId }) => useMindmapModifications({ sessionId, callbacks: {} }),
      { initialProps: { sessionId: 'old' } },
    );
    const lateError = MockEventSource.instances[0].onerror;
    rerender({ sessionId: 'new' });
    act(() => MockEventSource.instances[1].onopen?.(new Event('open')));
    act(() => lateError?.(new Event('error')));
    act(() => vi.advanceTimersByTime(3000));

    expect(result.current.isConnected).toBe(true);
    expect(MockEventSource.instances).toHaveLength(2);
  });

  it('cancels the tool stream retry when connect is called manually', async () => {
    const { result } = renderHook(() =>
      useToolStream({ sessionId: 'tool', reconnectDelayMs: 1000 }),
    );
    await act(async () => vi.runAllTicks());
    expect(MockEventSource.instances).toHaveLength(1);
    act(() => MockEventSource.instances[0].fail());
    act(() => result.current.connect());
    act(() => vi.advanceTimersByTime(1000));

    expect(MockEventSource.instances).toHaveLength(2);
  });

  it('does not auto-connect after unmount before the deferred connection runs', async () => {
    const { unmount } = renderHook(() => useToolStream({ sessionId: 'tool' }));
    unmount();
    await act(async () => vi.runAllTicks());

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('ignores a queued tool error after disconnect', async () => {
    const { result } = renderHook(() => useToolStream({ sessionId: 'tool' }));
    await act(async () => vi.runAllTicks());
    const lateError = MockEventSource.instances[0].listeners.get('error');
    act(() => result.current.disconnect());
    act(() => lateError?.(new Event('error')));
    act(() => vi.advanceTimersByTime(30000));

    expect(result.current.connectionState).toBe('disconnected');
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it('creates only the current deferred subscription under StrictMode', async () => {
    renderHook(() => useToolStream({ sessionId: 'tool' }), {
      wrapper: ({ children }: PropsWithChildren) => createElement(StrictMode, null, children),
    });
    await act(async () => vi.runAllTicks());

    expect(MockEventSource.instances).toHaveLength(1);
  });

  it('retains bounded retries and reports a genuine exhausted connection', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useToolStream({
        sessionId: 'tool',
        reconnectDelayMs: 1000,
        maxReconnectAttempts: 2,
        onError,
      }),
    );
    await act(async () => vi.runAllTicks());
    for (let attempt = 0; attempt < 3; attempt++) {
      act(() => MockEventSource.instances[attempt].fail());
      act(() => vi.advanceTimersByTime(1000 * 2 ** attempt));
    }

    expect(MockEventSource.instances).toHaveLength(3);
    expect(result.current.connectionState).toBe('error');
    expect(onError).toHaveBeenCalledExactlyOnceWith(new Error('Max reconnect attempts reached'));
  });

  it('does not apply the same mindmap event twice', () => {
    const onAddNode = vi.fn();
    renderHook(() => useMindmapModifications({ sessionId: 'mindmap', callbacks: { onAddNode } }));
    const event = new MessageEvent('message', {
      data: JSON.stringify({
        id: 'operation-1',
        type: 'mindmap:modify',
        sessionId: 'mindmap',
        data: { command: 'mindmap_add_node', args: { concept: 'Fractions' } },
      }),
    });
    act(() => {
      MockEventSource.instances[0].onmessage?.(event);
      MockEventSource.instances[0].onmessage?.(event);
    });
    expect(onAddNode).toHaveBeenCalledTimes(1);
  });

  it('ignores mindmap modifications addressed to another session', () => {
    const onAddNode = vi.fn();
    renderHook(() => useMindmapModifications({ sessionId: 'mindmap', callbacks: { onAddNode } }));
    act(() =>
      MockEventSource.instances[0].onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({
            id: 'operation-other',
            type: 'mindmap:modify',
            sessionId: 'another-session',
            data: { command: 'mindmap_add_node', args: { concept: 'Fractions' } },
          }),
        }),
      ),
    );
    expect(onAddNode).not.toHaveBeenCalled();
  });

  it('bounds automatic mindmap retries after repeated connection failures', () => {
    renderHook(() => useMindmapModifications({ sessionId: 'mindmap', callbacks: {} }));
    for (let attempt = 0; attempt < 10; attempt++) {
      act(() => MockEventSource.instances.at(-1)?.fail());
      act(() => vi.advanceTimersByTime(30_000));
    }
    expect(MockEventSource.instances.length).toBeLessThanOrEqual(6);
    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      '[MindmapModifications] SSE reconnect attempts exhausted',
      { attempts: 5 },
    );
  });
});

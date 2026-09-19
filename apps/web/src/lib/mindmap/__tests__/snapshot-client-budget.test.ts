import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeMindmap } from '../snapshot-client';

const identity = { sessionId: 'source', toolId: 'map' };
let subscription: ReturnType<typeof subscribeMindmap> | undefined;
const fetcher = vi.fn<typeof fetch>();
const onSnapshot = vi.fn();
const onState = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  fetcher.mockReset();
  onSnapshot.mockReset();
  onState.mockReset();
  vi.stubGlobal('fetch', fetcher);
});
afterEach(async () => {
  subscription?.stop();
  await vi.advanceTimersByTimeAsync(0);
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const start = () => {
  subscription = subscribeMindmap(identity, { onState, onSnapshot });
};
const tick = () => vi.advanceTimersByTimeAsync(0);

describe('hard recovery budget and serial cancellation', () => {
  it.each(['headers', 'body'])('ends recovery at exactly 30s when %s stall', async (phase) => {
    const signals: AbortSignal[] = [];
    const requests: number[] = [];
    fetcher.mockImplementation(async (_url, init) => {
      const signal = init!.signal!;
      signals.push(signal);
      requests.push(Date.now());
      if (phase === 'body')
        return new Response(new ReadableStream(), {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        });
      });
    });
    start();
    await tick();
    await vi.advanceTimersByTimeAsync(29_999);
    expect(onState).not.toHaveBeenLastCalledWith(expect.objectContaining({ status: 'exhausted' }));
    await vi.advanceTimersByTimeAsync(1);
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'exhausted' }));
    expect(requests).toEqual([0, 6000, 13000, 22000]);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it('manual retry cancels pending headers before opening a replacement request', async () => {
    let active = 0;
    let maximum = 0;
    fetcher.mockImplementation(async (_url, init) => {
      active++;
      maximum = Math.max(maximum, active);
      return new Promise((_resolve, reject) => {
        init!.signal!.addEventListener(
          'abort',
          () => {
            active--;
            reject(new DOMException('Aborted', 'AbortError'));
          },
          { once: true },
        );
      });
    });
    start();
    await tick();
    subscription!.retry();
    subscription!.retry();
    await tick();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(maximum).toBe(1);
    subscription!.stop();
    await tick();
    expect(active).toBe(0);
  });

  it('online expedites only an already scheduled retry, without parallel requests or new attempts', async () => {
    fetcher.mockResolvedValue(new Response(null, { status: 503 }));
    start();
    await tick();
    for (let retry = 0; retry < 10; retry++) {
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('online'));
      await tick();
    }
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(onState).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'exhausted', attempts: 5 }),
    );
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetcher).toHaveBeenCalledTimes(6);
  });

  it('only a valid snapshot clears the budget; healthy heartbeats keep that stream open', async () => {
    let source: ReadableStreamDefaultController<Uint8Array> | undefined;
    fetcher.mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            source = controller;
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      ),
    );
    start();
    await tick();
    const send = (text: string) => source!.enqueue(new TextEncoder().encode(text));
    send(
      `event: mindmap:snapshot\ndata: ${JSON.stringify({
        ...identity,
        revision: 0,
        content: { title: 'Map', nodes: [], markdown: '# Map' },
      })}\n\n`,
    );
    await tick();
    for (let heartbeat = 0; heartbeat < 10; heartbeat++) {
      await vi.advanceTimersByTimeAsync(4000);
      send(': heartbeat\n\n');
      await tick();
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'connected' }));
    expect(vi.getTimerCount()).toBe(1);
  });
});

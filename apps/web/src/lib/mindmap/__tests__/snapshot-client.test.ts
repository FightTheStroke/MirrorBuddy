import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeMindmap } from '../snapshot-client';

const identity = { sessionId: 'source', toolId: 'map' };
const snapshot = (revision = 0, overrides = {}) => ({
  ...identity,
  revision,
  content: { title: 'Cells', nodes: [], markdown: '# Cells' },
  ...overrides,
});
const frame = (data: unknown, event = 'mindmap:snapshot') =>
  `event: ${event}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`;
const encoder = new TextEncoder();
const connections: Array<{
  stream: ReadableStreamDefaultController<Uint8Array>;
  signal: AbortSignal;
}> = [];
const fetcher = vi.fn<typeof fetch>();
let subscription: ReturnType<typeof subscribeMindmap> | undefined;
const onSnapshot = vi.fn();
const onState = vi.fn();
const flush = async () => {
  await vi.advanceTimersByTimeAsync(0);
};
const send = (data: unknown, event?: string) =>
  connections.at(-1)!.stream.enqueue(encoder.encode(frame(data, event)));
const start = () => {
  subscription = subscribeMindmap(identity, { onSnapshot, onState });
};

beforeEach(() => {
  vi.useFakeTimers();
  connections.length = 0;
  fetcher.mockReset();
  onSnapshot.mockReset();
  onState.mockReset();
  fetcher.mockImplementation(
    async (_url, init) =>
      new Response(
        new ReadableStream({
          start(stream) {
            connections.push({ stream, signal: init!.signal! });
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      ),
  );
  vi.stubGlobal('fetch', fetcher);
});
afterEach(async () => {
  subscription?.stop();
  await flush();
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('authoritative snapshot client', () => {
  it('replaces once per revision, ignores another map/source and retains typed content', async () => {
    start();
    await flush();
    send(snapshot());
    send(snapshot());
    send(snapshot(1));
    send(snapshot(0));
    send(snapshot(8, { sessionId: 'other' }));
    send(snapshot(9, { toolId: 'other' }));
    await flush();
    expect(onSnapshot.mock.calls.map(([value]) => value.revision)).toEqual([0, 1]);
    expect(onState).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'connected', canMutate: true }),
    );
    expect(fetcher.mock.calls[0][0]).toBe('/api/tools/stream?sessionId=source&toolId=map');
  });

  it('handles every byte split, UTF-8, CRLF, comments and multi-line data', async () => {
    start();
    await flush();
    const data = snapshot(0, { content: { title: 'Città', nodes: [], markdown: '# Città' } });
    const text =
      ': heartbeat\r\n\r\nevent: mindmap:snapshot\r\ndata: ' +
      JSON.stringify(data).replace(',"revision"', ',\r\ndata: "revision"') +
      '\r\n\r\n';
    for (const byte of encoder.encode(text)) connections[0].stream.enqueue(new Uint8Array([byte]));
    await flush();
    expect(onSnapshot).toHaveBeenCalledExactlyOnceWith(data);
  });

  it('does not mistake the handshake, heartbeat, or wrong identity for recovery', async () => {
    start();
    await flush();
    connections[0].stream.enqueue(encoder.encode(': heartbeat\n\n'));
    send(snapshot(0, { toolId: 'other' }));
    await flush();
    expect(onState).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'connected' }));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(onState).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'exhausted', canMutate: false }),
    );
    expect(fetcher.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it('uses exactly five retries at 1/2/4/8/8 seconds, never resets on online', async () => {
    fetcher.mockResolvedValue(new Response(null, { status: 503 }));
    start();
    await flush();
    for (const [index, delay] of [1000, 2000, 4000, 8000, 8000].entries()) {
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(fetcher).toHaveBeenCalledTimes(index + 1);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetcher).toHaveBeenCalledTimes(index + 2);
    }
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'exhausted' }));
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetcher).toHaveBeenCalledTimes(6);
    subscription!.retry();
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(7);
  });

  it.each([401, 403])('terminates on HTTP %s and requires manual retry', async (status) => {
    fetcher.mockResolvedValue(new Response(null, { status }));
    start();
    await flush();
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'denied', httpStatus: status }),
    );
    subscription!.retry();
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('terminates on streamed revocation and cancels the reader and all timers', async () => {
    start();
    await flush();
    send(snapshot());
    await flush();
    send({ status: 403, error: 'Map access ended' }, 'mindmap:error');
    await flush();
    expect(onState).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'denied', httpStatus: 403 }),
    );
    expect(connections[0].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects malformed snapshots explicitly and never invokes the content consumer', async () => {
    start();
    await flush();
    send({ ...identity, revision: -1 });
    await flush();
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(onState).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'recovering', error: expect.any(String) }),
    );
    expect(connections[0].signal.aborted).toBe(true);
  });

  it('recovers at an equal revision without replaying content and ignores older revisions', async () => {
    start();
    await flush();
    send(snapshot(2));
    await flush();
    connections[0].stream.close();
    await flush();
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({ canMutate: false }));
    await vi.advanceTimersByTimeAsync(1000);
    send(snapshot(1));
    await flush();
    expect(onState).not.toHaveBeenLastCalledWith(expect.objectContaining({ status: 'connected' }));
    send(snapshot(2));
    await flush();
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'connected' }));
  });

  it('cancels ten consecutive connections with no timer growth or post-stop updates', async () => {
    for (let cycle = 0; cycle < 10; cycle++) {
      start();
      await flush();
      send(snapshot());
      await flush();
      subscription!.stop();
      await flush();
      expect(connections.at(-1)!.signal.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    }
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetcher).toHaveBeenCalledTimes(10);
    expect(onSnapshot).toHaveBeenCalledTimes(10);
  });
});

/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConversationLoader } from '../use-conversation-loader';

const conversation = (over = {}) => ({
  maestroId: 'manzoni',
  messages: [{ id: 'm1', role: 'user', content: 'ciao', createdAt: '2026-11-04T10:00:00Z' }],
  ...over,
});
const response = (body: unknown, ok = true) => ({ ok, json: async () => body });

const deps = () => ({
  maestroId: 'manzoni',
  setMessages: vi.fn(),
  setSessionEnded: vi.fn(),
  stopVoice: vi.fn(),
  invalidateTurn: vi.fn(),
  resetAttachments: vi.fn(),
  adoptConversation: vi.fn(),
  restoreAttachments: vi.fn(),
  onFailure: vi.fn(),
  onLoadingChange: vi.fn(),
});

beforeEach(() => vi.stubGlobal('fetch', vi.fn()));

describe('useConversationLoader', () => {
  it('stops voice and invalidates the pending chat at load start, before any response', () => {
    const d = deps();
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useConversationLoader(d));
    void result.current.load('c1');
    expect(d.stopVoice).toHaveBeenCalled();
    expect(d.invalidateTurn).toHaveBeenCalled();
    expect(d.resetAttachments).toHaveBeenCalled();
    expect(d.onLoadingChange).toHaveBeenLastCalledWith(true);
    expect(d.setMessages).not.toHaveBeenCalled();
  });

  it('loads an owned conversation of this Maestro and adopts it', async () => {
    const d = deps();
    vi.mocked(fetch).mockResolvedValue(response(conversation()) as never);
    const { result } = renderHook(() => useConversationLoader(d));
    await act(async () => void (await result.current.load('c1')));
    expect(d.adoptConversation).toHaveBeenCalledWith('c1');
    expect(d.restoreAttachments).toHaveBeenCalledWith('c1');
    expect(d.onFailure).not.toHaveBeenCalled();
    expect(d.onLoadingChange).toHaveBeenLastCalledWith(false);
  });

  it('keeps interactions blocked until its documents finish restoring', async () => {
    const d = deps();
    let restored!: () => void;
    d.restoreAttachments.mockReturnValue(
      new Promise<void>((resolve) => {
        restored = resolve;
      }),
    );
    vi.mocked(fetch).mockResolvedValue(response(conversation()) as never);
    const { result } = renderHook(() => useConversationLoader(d));
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = result.current.load('c1');
      await Promise.resolve();
    });
    expect(d.adoptConversation).toHaveBeenCalledWith('c1');
    expect(d.onLoadingChange).toHaveBeenLastCalledWith(true);
    await act(async () => {
      restored();
      expect(await pending).toBe(true);
    });
    expect(d.onLoadingChange).toHaveBeenLastCalledWith(false);
  });

  it.each([
    ['not ok', () => response({}, false)],
    ['other Maestro', () => response(conversation({ maestroId: 'dante' }))],
    ['no messages array', () => response({ maestroId: 'manzoni' })],
  ])('reports failure and loads nothing: %s', async (_name, reply) => {
    const d = deps();
    vi.mocked(fetch).mockResolvedValue(reply() as never);
    const { result } = renderHook(() => useConversationLoader(d));
    await act(async () => void (await result.current.load('c1')));
    expect(d.onFailure).toHaveBeenCalledTimes(1);
    expect(d.setMessages).not.toHaveBeenCalled();
    expect(d.adoptConversation).not.toHaveBeenCalled();
  });

  it('reports a network failure instead of swallowing it', async () => {
    const d = deps();
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useConversationLoader(d));
    await act(async () => void (await result.current.load('c1')));
    expect(d.onFailure).toHaveBeenCalledTimes(1);
  });

  it('ignores a late response after cancel (account switch / new chat)', async () => {
    const d = deps();
    let release!: (value: unknown) => void;
    vi.mocked(fetch).mockReturnValue(new Promise((r) => (release = r)) as never);
    const { result } = renderHook(() => useConversationLoader(d));
    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.load('old-account-conversation');
    });
    act(() => result.current.cancel());
    release(response(conversation()));
    await act(async () => void (await pending));
    expect(d.setMessages).not.toHaveBeenCalled();
    expect(d.adoptConversation).not.toHaveBeenCalled();
    expect(d.onFailure).not.toHaveBeenCalled();
    expect(d.onLoadingChange).toHaveBeenLastCalledWith(false);
  });

  it('a newer selection supersedes an older slow one', async () => {
    const d = deps();
    let releaseOld!: (value: unknown) => void;
    vi.mocked(fetch)
      .mockReturnValueOnce(new Promise((r) => (releaseOld = r)) as never)
      .mockResolvedValueOnce(response(conversation()) as never);
    const { result } = renderHook(() => useConversationLoader(d));
    let first!: Promise<boolean>;
    act(() => {
      first = result.current.load('old');
    });
    await act(async () => void (await result.current.load('new')));
    releaseOld(response(conversation()));
    await act(async () => void (await first));
    expect(d.adoptConversation).toHaveBeenCalledTimes(1);
    expect(d.adoptConversation).toHaveBeenCalledWith('new');
  });
});

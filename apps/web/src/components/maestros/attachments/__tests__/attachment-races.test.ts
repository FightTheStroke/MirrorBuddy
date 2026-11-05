/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { AttachmentDocument } from '@/lib/conversation/attachments/types';
import { useConversationAttachments } from '../use-conversation-attachments';
import { useMaestroChatHandlers } from '../../use-maestro-chat-handlers';

const mocks = vi.hoisted(() => ({
  listAttachments: vi.fn(),
  createAttachment: vi.fn(),
  readAttachment: vi.fn(),
  csrfFetch: vi.fn(),
}));

vi.mock('@/lib/conversation/attachments/client-api', () => ({
  createAttachment: mocks.createAttachment,
  deleteAttachment: vi.fn(),
  listAttachments: mocks.listAttachments,
}));
vi.mock('@/lib/conversation/attachments/client-reader', async (original) => ({
  ...(await original<typeof import('@/lib/conversation/attachments/client-reader')>()),
  readAttachment: mocks.readAttachment,
}));
vi.mock('@/lib/auth', () => ({ csrfFetch: mocks.csrfFetch }));
vi.mock('next-intl', () => ({ useLocale: () => 'it', useTranslations: () => (k: string) => k }));

const docOf = (id: string): AttachmentDocument => ({
  id,
  name: `${id}.pdf`,
  mimeType: 'application/pdf',
  size: 1,
  pages: [{ pageNumber: 1, text: 'x' }],
});
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
const setup = () =>
  renderHook(() =>
    useConversationAttachments({
      ensureConversation: async () => 'c',
      getConversationId: () => 'c',
    }),
  );

beforeEach(() => vi.clearAllMocks());

describe('attachment restore races', () => {
  it.each([
    { savedFirst: false, restoredNew: false },
    { savedFirst: true, restoredNew: true },
    { savedFirst: false, restoredNew: true },
  ])(
    'keeps one new PDF when history arrives ($savedFirst, $restoredNew)',
    async ({ savedFirst, restoredNew }) => {
      const restored = deferred<AttachmentDocument[]>();
      const saved = deferred<AttachmentDocument>();
      mocks.listAttachments.mockReturnValueOnce(restored.promise);
      mocks.readAttachment.mockResolvedValueOnce({
        upload: docOf('new'),
        totalPages: 1,
        skippedPages: [],
      });
      mocks.createAttachment.mockReturnValueOnce(saved.promise);
      const { result } = setup();
      let restoring!: Promise<void>;
      act(() => {
        restoring = result.current.restore('c');
        result.current.pickFiles([new File(['pdf'], 'new.pdf', { type: 'application/pdf' })]);
      });
      act(() => result.current.confirmConsent());
      await waitFor(() => expect(result.current.items[0]?.status).toBe('saving'));
      if (savedFirst) {
        await act(async () => {
          saved.resolve(docOf('new'));
        });
      }
      await act(async () => {
        restored.resolve([docOf('old'), ...(restoredNew ? [docOf('new')] : [])]);
        await restoring;
      });
      expect(result.current.items.some((item) => item.localId.startsWith('att-'))).toBe(true);
      await act(async () => {
        saved.resolve(docOf('new'));
      });
      expect(result.current.items.map((item) => item.name)).toEqual(['old.pdf', 'new.pdf']);
      expect(result.current.readyDocs.map((doc) => doc.id)).toEqual(['old', 'new']);
    },
  );

  it('drops a late restore after reset', async () => {
    const late = deferred<AttachmentDocument[]>();
    mocks.listAttachments.mockReturnValueOnce(late.promise);
    const { result } = setup();
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.restore('A');
    });
    expect(result.current.busy).toBe(true);
    act(() => result.current.reset());
    await act(async () => {
      late.resolve([docOf('a1')]);
      await pending;
    });
    expect(result.current.items).toEqual([]);
    expect(result.current.busy).toBe(false);
    expect(result.current.announcement).toBeNull();
  });

  it('lets the newer restore win over an older one', async () => {
    const first = deferred<AttachmentDocument[]>();
    const second = deferred<AttachmentDocument[]>();
    mocks.listAttachments.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = setup();
    let p1!: Promise<void>;
    let p2!: Promise<void>;
    act(() => {
      p1 = result.current.restore('A');
      p2 = result.current.restore('B');
    });
    await act(async () => {
      second.resolve([docOf('b1')]);
      await p2;
      first.resolve([docOf('a1')]);
      await p1;
    });
    expect(result.current.items.map((i) => i.doc?.id)).toEqual(['b1']);
    expect(mocks.listAttachments.mock.calls[0][1]).toBeInstanceOf(AbortSignal);
  });
});

describe('overlapping chat turns', () => {
  it('does not send a question without its PDF while attachment processing is still in progress', async () => {
    const setMessages = vi.fn();
    const ensureConversation = vi.fn().mockResolvedValue('c');
    const { result } = renderHook(() =>
      useMaestroChatHandlers({
        maestro: { id: 'm', systemPrompt: 's' } as never,
        input: 'Explain the attached PDF',
        setInput: vi.fn(),
        isLoading: false,
        setIsLoading: vi.fn(),
        messages: [],
        setMessages,
        setToolCalls: vi.fn(),
        onQuestionAsked: vi.fn(),
        readyDocs: [],
        attachmentsBusy: true,
        ensureConversation,
      }),
    );
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(setMessages).not.toHaveBeenCalled();
    expect(ensureConversation).not.toHaveBeenCalled();
    expect(mocks.csrfFetch).not.toHaveBeenCalled();
  });

  it('ignores the aborted older turn so the newer one keeps loading', async () => {
    const setIsLoading = vi.fn();
    const setMessages = vi.fn();
    const first = deferred<never>();
    mocks.csrfFetch
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: 'ok' }) });
    const { result } = renderHook(() =>
      useMaestroChatHandlers({
        maestro: { id: 'm', systemPrompt: 's' } as never,
        input: 'Ciao',
        setInput: vi.fn(),
        isLoading: false,
        setIsLoading,
        messages: [],
        setMessages,
        setToolCalls: vi.fn(),
        onQuestionAsked: vi.fn(),
        readyDocs: [],
        ensureConversation: async () => null,
        persistMessage: vi.fn(),
      }),
    );
    let p1!: Promise<void>;
    await act(async () => {
      p1 = result.current.handleSubmit();
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    setIsLoading.mockClear();
    setMessages.mockClear();
    await act(async () => {
      first.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      await p1;
    });
    expect(setMessages).not.toHaveBeenCalled();
    expect(setIsLoading).not.toHaveBeenCalled();
  });
});

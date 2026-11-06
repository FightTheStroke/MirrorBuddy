/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { AttachmentDocument } from '@/lib/conversation/attachments/types';
import { useConversationAttachments } from '../use-conversation-attachments';
import { buildAttachmentFields, ConversationUnavailableError } from '../chat-attachment-fields';
import { useMaestroChatHandlers } from '../../use-maestro-chat-handlers';

const mocks = vi.hoisted(() => ({
  readAttachment: vi.fn(),
  createAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  csrfFetch: vi.fn(),
}));

vi.mock('@/lib/conversation/attachments/client-reader', async (orig) => ({
  ...(await orig<typeof import('@/lib/conversation/attachments/client-reader')>()),
  readAttachment: mocks.readAttachment,
}));
vi.mock('@/lib/conversation/attachments/client-api', () => ({
  createAttachment: mocks.createAttachment,
  deleteAttachment: mocks.deleteAttachment,
  listAttachments: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ csrfFetch: mocks.csrfFetch }));
vi.mock('next-intl', () => ({ useLocale: () => 'it', useTranslations: () => (k: string) => k }));

const upload = {
  name: 'verifica.pdf',
  mimeType: 'application/pdf' as const,
  size: 12,
  pages: [{ pageNumber: 1, text: 'Roma' }],
};
const doc: AttachmentDocument = { id: 'att-1', ...upload };
const pdf = () => new File(['x'], 'verifica.pdf', { type: 'application/pdf' });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readAttachment.mockResolvedValue({ upload, totalPages: 1, skippedPages: [] });
  mocks.createAttachment.mockResolvedValue(doc);
  mocks.deleteAttachment.mockResolvedValue(undefined);
});

function setup(conversationId: string | null) {
  return renderHook(() =>
    useConversationAttachments({
      ensureConversation: async () => conversationId,
      getConversationId: () => conversationId,
    }),
  );
}

describe('useConversationAttachments', () => {
  it('asks for consent before reading or sending anything, then processes', async () => {
    mocks.createAttachment
      .mockResolvedValueOnce(doc)
      .mockResolvedValueOnce({ ...doc, id: 'att-2' });
    const { result } = setup('c1');
    act(() => result.current.pickFiles([pdf()]));
    expect(result.current.consentOpen).toBe(true);
    expect(mocks.readAttachment).not.toHaveBeenCalled();
    act(() => result.current.confirmConsent());
    await waitFor(() => expect(result.current.readyDocs).toEqual([doc]));
    expect(mocks.createAttachment).toHaveBeenCalledWith('c1', upload, expect.anything());
    // consent is remembered for the session: no second dialog
    act(() => result.current.pickFiles([pdf()]));
    expect(result.current.consentOpen).toBe(false);
    await waitFor(() => expect(result.current.readyDocs).toHaveLength(2));
  });

  it('declining consent never touches the file', () => {
    const { result } = setup('c1');
    act(() => result.current.pickFiles([pdf()]));
    act(() => result.current.declineConsent());
    expect(result.current.consentOpen).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(mocks.readAttachment).not.toHaveBeenCalled();
  });

  it('keeps visitor files ephemeral (no server call) and exposes only ready docs', async () => {
    const { result } = setup(null);
    act(() => result.current.pickFiles([pdf()]));
    act(() => result.current.confirmConsent());
    await waitFor(() => expect(result.current.readyDocs).toHaveLength(1));
    expect(mocks.createAttachment).not.toHaveBeenCalled();
    expect(result.current.readyDocs[0].id.startsWith('local-')).toBe(true);
  });

  it('shows the error and excludes the file when reading fails, then retries', async () => {
    mocks.readAttachment.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'encrypted' }),
    );
    const { result } = setup('c1');
    act(() => result.current.pickFiles([pdf()]));
    act(() => result.current.confirmConsent());
    await waitFor(() => expect(result.current.items[0]?.status).toBe('error'));
    expect(result.current.readyDocs).toEqual([]);
    act(() => result.current.retry(result.current.items[0].localId));
    await waitFor(() => expect(result.current.readyDocs).toEqual([doc]));
  });

  it('awaits the remote DELETE and keeps the chip when it fails', async () => {
    const { result } = setup('c1');
    act(() => result.current.pickFiles([pdf()]));
    act(() => result.current.confirmConsent());
    await waitFor(() => expect(result.current.readyDocs).toHaveLength(1));
    const id = result.current.items[0].localId;

    mocks.deleteAttachment.mockRejectedValueOnce(new Error('down'));
    let removed = true;
    await act(async () => {
      removed = await result.current.remove(id);
    });
    expect(removed).toBe(false);
    expect(result.current.items[0]).toMatchObject({ status: 'error', errorCode: 'remove_failed' });

    await act(async () => {
      removed = await result.current.remove(id);
    });
    expect(removed).toBe(true);
    expect(mocks.deleteAttachment).toHaveBeenLastCalledWith('c1', 'att-1');
    expect(result.current.items).toEqual([]);
  });

  it('cancel aborts a reading file and drops it', async () => {
    mocks.readAttachment.mockImplementation(
      (_f: File, o: { signal: AbortSignal }) =>
        new Promise((_res, rej) => o.signal.addEventListener('abort', () => rej(new Error('c')))),
    );
    const { result } = setup('c1');
    act(() => result.current.pickFiles([pdf()]));
    act(() => result.current.confirmConsent());
    await waitFor(() => expect(result.current.items[0]?.status).toBe('reading'));
    act(() => result.current.cancel(result.current.items[0].localId));
    await waitFor(() => expect(result.current.items).toEqual([]));
    expect(result.current.announcement?.type).toBe('cancelled');
  });
});

describe('buildAttachmentFields', () => {
  it('sends ids for registered chats and docs for visitors', () => {
    expect(buildAttachmentFields([], 'c1')).toEqual({});
    expect(buildAttachmentFields([doc], 'c1')).toEqual({
      conversationId: 'c1',
      attachmentIds: ['att-1'],
    });
    const local = { ...doc, id: 'local-att-1' };
    expect(buildAttachmentFields([local], null)).toEqual({ attachments: [local] });
  });
});

describe('chat handlers with attachments', () => {
  it('sends the selected docs on every turn and persists both roles once', async () => {
    mocks.csrfFetch.mockResolvedValue({ ok: true, json: async () => ({ content: 'Risposta' }) });
    const persistMessage = vi.fn().mockResolvedValue(undefined);
    const ensureConversation = vi.fn().mockResolvedValue('c1');
    const { result } = renderHook(() =>
      useMaestroChatHandlers({
        maestro: { id: 'manzoni', systemPrompt: 'sp' } as never,
        input: 'Cosa dice?',
        setInput: vi.fn(),
        isLoading: false,
        setIsLoading: vi.fn(),
        messages: [],
        setMessages: vi.fn(),
        setToolCalls: vi.fn(),
        onQuestionAsked: vi.fn(),
        readyDocs: [doc],
        ensureConversation,
        persistMessage,
      }),
    );
    await act(async () => {
      await result.current.handleSubmit();
    });
    const body = JSON.parse(mocks.csrfFetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ conversationId: 'c1', attachmentIds: ['att-1'] });
    expect(persistMessage.mock.calls).toEqual([
      ['c1', 'user', 'Cosa dice?'],
      ['c1', 'assistant', 'Risposta'],
    ]);
  });

  const setupTurn = (ensureConversation: () => Promise<string | null>) => {
    const setMessages = vi.fn();
    const persistMessage = vi.fn().mockResolvedValue(undefined);
    const hook = renderHook(() =>
      useMaestroChatHandlers({
        maestro: { id: 'manzoni', systemPrompt: 'sp' } as never,
        input: 'Cosa dice?',
        setInput: vi.fn(),
        isLoading: false,
        setIsLoading: vi.fn(),
        messages: [],
        setMessages,
        setToolCalls: vi.fn(),
        onQuestionAsked: vi.fn(),
        readyDocs: [doc],
        ensureConversation,
        persistMessage,
      }),
    );
    return { hook, setMessages, persistMessage };
  };
  const lastContent = (setMessages: ReturnType<typeof vi.fn>) =>
    setMessages.mock.calls
      .map(([update]) => (typeof update === 'function' ? update([]) : update))
      .flat()
      .at(-1).content;
  it('tells the student when the files exceed the chat context (413)', async () => {
    mocks.csrfFetch.mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => ({ error: 'x', code: 'ATTACHMENT_CONTEXT_TOO_LARGE' }),
    });
    const { hook, setMessages } = setupTurn(async () => 'c1');
    await act(async () => {
      await hook.result.current.handleSubmit();
    });
    expect(lastContent(setMessages)).toBe('attachments.errors.contextTooLarge');
  });

  it('never falls back to transient files when the conversation cannot be created', async () => {
    const { hook, setMessages } = setupTurn(async () => {
      throw new ConversationUnavailableError();
    });
    await act(async () => {
      await hook.result.current.handleSubmit();
    });
    expect(mocks.csrfFetch).not.toHaveBeenCalled();
    expect(lastContent(setMessages)).toBe('attachments.errors.conversationFailed');
  });

  it('drops a late response from before a reset: no messages, no persistence', async () => {
    let release!: (value: unknown) => void;
    mocks.csrfFetch.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const { hook, setMessages, persistMessage } = setupTurn(async () => 'c-old');
    let turn!: Promise<void>;
    act(() => {
      turn = hook.result.current.handleSubmit();
    });
    await waitFor(() => expect(mocks.csrfFetch).toHaveBeenCalled());
    act(() => hook.result.current.clearChat());
    setMessages.mockClear();
    release({ ok: true, json: async () => ({ content: 'LATE' }) });
    await act(async () => {
      await turn;
    });
    expect(setMessages).not.toHaveBeenCalled();
    expect(persistMessage).not.toHaveBeenCalled();
  });
});

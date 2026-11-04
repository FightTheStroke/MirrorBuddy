import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentDocument } from '@/lib/conversation/attachments/types';
import { resolveChatAttachments } from '../attachment-context';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  allowed: vi.fn(),
  detectJailbreak: vi.fn(),
}));

vi.mock('@/lib/conversation/attachments/server', () => ({
  listConversationAttachments: mocks.list,
  canUseAttachmentTool: mocks.allowed,
  AttachmentError: class extends Error {
    constructor(
      public status: number,
      public code: string,
    ) {
      super(code);
    }
  },
}));
vi.mock('@/lib/safety', () => ({ detectJailbreak: mocks.detectJailbreak }));

const document: AttachmentDocument = {
  id: 'attachment-one',
  name: 'Astronomy.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  pages: [{ pageNumber: 1, text: 'The fictional observatory opened in 1847.' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.allowed.mockResolvedValue(true);
  mocks.detectJailbreak.mockReturnValue({ action: 'allow' });
});

describe('chat document ownership', () => {
  it('does not query stored data without a selected file', async () => {
    expect(await resolveChatAttachments({}, 'user-one')).toEqual([]);
    expect(await resolveChatAttachments({ conversationId: null }, 'user-one')).toEqual([]);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('loads only explicitly selected attachments from the owned conversation', async () => {
    mocks.list.mockResolvedValue([document, { ...document, id: 'unselected-document' }]);

    const result = await resolveChatAttachments(
      { conversationId: 'conversation-one', attachmentIds: [document.id] },
      'user-one',
    );

    expect(mocks.list).toHaveBeenCalledExactlyOnceWith('user-one', 'conversation-one', [
      document.id,
    ]);
    expect(result).toEqual([document]);
  });

  it('rejects the whole request when one attachment belongs elsewhere', async () => {
    mocks.list.mockResolvedValue([document]);
    await expect(
      resolveChatAttachments(
        { conversationId: 'conversation-one', attachmentIds: [document.id, 'foreign-id'] },
        'user-one',
      ),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('does not let a visitor reference stored authenticated attachments', async () => {
    await expect(
      resolveChatAttachments({ conversationId: 'conversation-one', attachmentIds: [document.id] }),
    ).rejects.toMatchObject({ status: 401 });
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('accepts a visitor own transient document without database access', async () => {
    expect(await resolveChatAttachments({ attachments: [document] })).toEqual([document]);
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.allowed).toHaveBeenCalledWith(null, 'pdf');
  });

  it('does not let authenticated requests bypass stored ownership using transient documents', async () => {
    await expect(
      resolveChatAttachments({ attachments: [document] }, 'user-one'),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects invalid transient documents rather than silently ignoring them', async () => {
    await expect(
      resolveChatAttachments({ attachments: [{ name: 'broken.pdf' }] }),
    ).rejects.toMatchObject({
      status: 400,
    });
  });

  it('rejects null selections and mixed persistence channels', async () => {
    for (const input of [
      { attachments: null },
      { attachmentIds: null },
      { attachmentIds: [], attachments: [document] },
      { attachmentIds: [document.id] },
    ]) {
      await expect(resolveChatAttachments(input, 'user-one')).rejects.toMatchObject({
        status: 400,
      });
    }
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('honors feature flags and keeps unsafe embedded instructions out of model context', async () => {
    mocks.allowed.mockResolvedValueOnce(false);
    await expect(resolveChatAttachments({ attachments: [document] })).rejects.toMatchObject({
      status: 403,
    });
    mocks.detectJailbreak.mockReturnValueOnce({ action: 'block' });
    await expect(resolveChatAttachments({ attachments: [document] })).rejects.toMatchObject({
      status: 400,
      code: 'attachment_unsafe',
    });
  });
});

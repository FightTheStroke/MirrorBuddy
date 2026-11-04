import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});
vi.mock('@/lib/tier/server', () => ({
  tierService: { getEffectiveTier: vi.fn(), getUserFeatureConfig: vi.fn() },
}));

import { prisma } from '@/lib/db';
import { tierService } from '@/lib/tier/server';
import {
  AttachmentError,
  createConversationAttachment,
  deleteConversationAttachment,
  listConversationAttachments,
} from '../server';
import { attachmentUploadSchema } from '../validation';

const upload = {
  name: 'notes.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  pages: [{ pageNumber: 1, text: 'hello' }],
};

const db = prisma as unknown as {
  conversation: { findFirst: ReturnType<typeof vi.fn> };
  toolOutput: Record<string, ReturnType<typeof vi.fn>>;
};

beforeEach(() => {
  vi.resetAllMocks();
  db.conversation.findFirst.mockResolvedValue({ id: 'c1' });
  vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
    features: { tools: ['pdf', 'webcam'] },
  } as never);
});

describe('attachmentUploadSchema', () => {
  it.each([
    ['empty pages', { ...upload, pages: [] }],
    [
      'six pages',
      { ...upload, pages: [1, 2, 3, 4, 5, 6].map((n) => ({ pageNumber: n, text: 'x' })) },
    ],
    [
      'duplicate pages',
      {
        ...upload,
        pages: [
          { pageNumber: 1, text: 'a' },
          { pageNumber: 1, text: 'b' },
        ],
      },
    ],
    [
      'unordered pages',
      {
        ...upload,
        pages: [
          { pageNumber: 2, text: 'a' },
          { pageNumber: 1, text: 'b' },
        ],
      },
    ],
    ['blank text', { ...upload, pages: [{ pageNumber: 1, text: '  ' }] }],
    ['long name', { ...upload, name: 'a'.repeat(121) }],
    ['path name', { ...upload, name: '../x.pdf' }],
    ['bad mime', { ...upload, mimeType: 'text/html' }],
    ['too big', { ...upload, size: 10 * 1024 * 1024 + 1 }],
    ['extra key', { ...upload, id: 'x' }],
  ])('rejects %s', (_n, input) => {
    expect(attachmentUploadSchema.safeParse(input).success).toBe(false);
  });

  it('accepts a valid upload', () => {
    expect(attachmentUploadSchema.safeParse(upload).success).toBe(true);
  });
});

describe('conversation attachment server', () => {
  it('creates scoped to the owner and returns the DTO', async () => {
    db.toolOutput.create.mockResolvedValue({ id: 'a1' });
    const result = await createConversationAttachment('u1', 'c1', upload);
    expect(result).toEqual({ id: 'a1', ...upload });
    expect(db.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1', userId: 'u1', markedForDeletion: false },
      }),
    );
    expect(db.toolOutput.create.mock.calls[0][0].data.toolType).toBe('conversation_attachment');
  });

  it('returns 404 for a foreign conversation on every operation', async () => {
    db.conversation.findFirst.mockResolvedValue(null);
    for (const op of [
      () => listConversationAttachments('u2', 'c1'),
      () => createConversationAttachment('u2', 'c1', upload),
      () => deleteConversationAttachment('u2', 'c1', 'a1'),
    ]) {
      await expect(op()).rejects.toMatchObject({ status: 404 });
    }
    expect(db.toolOutput.create).not.toHaveBeenCalled();
  });

  it('rejects invalid input with 400 and null input safely', async () => {
    await expect(createConversationAttachment('u1', 'c1', null)).rejects.toMatchObject({
      status: 400,
    });
    await expect(createConversationAttachment('u1', 'c1', undefined)).rejects.toBeInstanceOf(
      AttachmentError,
    );
  });

  it('gates PDFs and images on their own tier tool', async () => {
    vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
      features: { tools: ['pdf'] },
    } as never);
    await expect(
      createConversationAttachment('u1', 'c1', { ...upload, name: 'p.png', mimeType: 'image/png' }),
    ).rejects.toMatchObject({ status: 403, code: 'attachment_tool_not_allowed' });
  });

  it('per-user feature config overrides the tier tool list', async () => {
    vi.mocked(tierService.getUserFeatureConfig).mockResolvedValue({
      isEnabled: true,
      expiresAt: null,
    } as never);
    vi.mocked(tierService.getEffectiveTier).mockResolvedValue({ features: { tools: [] } } as never);
    db.toolOutput.create.mockResolvedValue({ id: 'a1' });
    await expect(createConversationAttachment('u1', 'c1', upload)).resolves.toMatchObject({
      id: 'a1',
    });

    vi.mocked(tierService.getUserFeatureConfig).mockResolvedValue({
      isEnabled: false,
      expiresAt: null,
    } as never);
    vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
      features: { tools: ['pdf'] },
    } as never);
    await expect(createConversationAttachment('u1', 'c1', upload)).rejects.toMatchObject({
      status: 403,
    });

    vi.mocked(tierService.getUserFeatureConfig).mockResolvedValue({
      isEnabled: false,
      expiresAt: new Date(0),
    } as never);
    await expect(createConversationAttachment('u1', 'c1', upload)).resolves.toMatchObject({
      id: 'a1',
    });
  });

  it('limits the list to selected ids in the DB query, keeping the owner scope', async () => {
    db.toolOutput.findMany.mockResolvedValue([]);
    await listConversationAttachments('u1', 'c1', ['a1', 'a2']);
    expect(db.toolOutput.findMany.mock.calls[0][0].where).toMatchObject({
      id: { in: ['a1', 'a2'] },
      conversationId: 'c1',
      conversation: { userId: 'u1' },
    });
    await listConversationAttachments('u1', 'c1');
    expect(db.toolOutput.findMany.mock.calls[1][0].where).not.toHaveProperty('id');
  });

  it('returns an empty selection without querying outputs, still checking ownership', async () => {
    expect(await listConversationAttachments('u1', 'c1', [])).toEqual([]);
    expect(db.toolOutput.findMany).not.toHaveBeenCalled();
    db.conversation.findFirst.mockResolvedValue(null);
    await expect(listConversationAttachments('u2', 'c1', [])).rejects.toMatchObject({
      status: 404,
    });
  });

  it('lists filtered by conversation, type and owner', async () => {
    db.toolOutput.findMany.mockResolvedValue([{ id: 'a1', data: JSON.stringify(upload) }]);
    expect(await listConversationAttachments('u1', 'c1')).toEqual([{ id: 'a1', ...upload }]);
    expect(db.toolOutput.findMany.mock.calls[0][0].where).toMatchObject({
      conversationId: 'c1',
      toolType: 'conversation_attachment',
      conversation: { userId: 'u1' },
    });
  });

  it('fails loudly on malformed stored data without leaking it', async () => {
    db.toolOutput.findMany.mockResolvedValue([{ id: 'a1', data: '{secret' }]);
    const error = await listConversationAttachments('u1', 'c1').catch((e) => e);
    expect(error).toMatchObject({ status: 500, code: 'attachment_data_invalid' });
    expect(String(error.message)).not.toContain('secret');
  });

  it('delete is 404 when nothing matches and succeeds otherwise', async () => {
    db.toolOutput.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(deleteConversationAttachment('u1', 'c1', 'zz')).rejects.toMatchObject({
      status: 404,
    });
    db.toolOutput.deleteMany.mockResolvedValueOnce({ count: 1 });
    await expect(deleteConversationAttachment('u1', 'c1', 'a1')).resolves.toBeUndefined();
    expect(db.toolOutput.deleteMany.mock.calls[1][0].where).toMatchObject({
      id: 'a1',
      conversationId: 'c1',
      conversation: { userId: 'u1' },
    });
  });
});

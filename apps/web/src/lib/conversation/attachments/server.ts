import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { tierService } from '@/lib/tier/server';
import { CONVERSATION_ATTACHMENT_TOOL_TYPE as TOOL_TYPE, type AttachmentDocument } from './types';
import { attachmentUploadSchema, ephemeralAttachmentSchema } from './validation';

const log = logger.child({ module: 'conversation/attachments' });

export class AttachmentError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = 'AttachmentError';
  }
}

// Per-user feature config wins; otherwise the effective tier's tool list
// (which already carries subscription overrides) decides.
export async function canUseAttachmentTool(
  userId: string | null,
  kind: 'pdf' | 'webcam',
): Promise<boolean> {
  if (userId) {
    const override = await tierService.getUserFeatureConfig(userId, kind);
    const active = override && (!override.expiresAt || override.expiresAt > new Date());
    if (active && override.isEnabled !== null) return override.isEnabled;
  }
  const tier = await tierService.getEffectiveTier(userId);
  const tools = (tier.features as { tools?: unknown }).tools;
  return Array.isArray(tools) && tools.includes(kind);
}

async function assertOwnedConversation(userId: string, conversationId: string) {
  if (!userId || !conversationId) throw new AttachmentError(404, 'conversation_not_found');
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId, markedForDeletion: false },
    select: { id: true },
  });
  if (!conversation) throw new AttachmentError(404, 'conversation_not_found');
}

function parseStored(id: string, data: string): AttachmentDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    log.error('Stored attachment is not valid JSON', { attachmentId: id });
    throw new AttachmentError(500, 'attachment_data_invalid');
  }
  const parsed = attachmentUploadSchema.safeParse(raw);
  if (!parsed.success) {
    log.error('Stored attachment failed validation', { attachmentId: id });
    throw new AttachmentError(500, 'attachment_data_invalid');
  }
  return ephemeralAttachmentSchema.parse({ ...parsed.data, id });
}

export async function listConversationAttachments(
  userId: string,
  conversationId: string,
  selectedIds?: string[],
): Promise<AttachmentDocument[]> {
  if (selectedIds && selectedIds.length === 0) {
    await assertOwnedConversation(userId, conversationId);
    return [];
  }
  await assertOwnedConversation(userId, conversationId);
  const rows = await prisma.toolOutput.findMany({
    where: {
      conversationId,
      toolType: TOOL_TYPE,
      ...(selectedIds ? { id: { in: selectedIds } } : {}),
      conversation: { userId, markedForDeletion: false },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, data: true },
  });
  return rows.map((row) => parseStored(row.id, row.data));
}

export async function createConversationAttachment(
  userId: string,
  conversationId: string,
  input: unknown,
): Promise<AttachmentDocument> {
  const parsed = attachmentUploadSchema.safeParse(input ?? null);
  if (!parsed.success) throw new AttachmentError(400, 'attachment_invalid');
  await assertOwnedConversation(userId, conversationId);
  const kind = parsed.data.mimeType === 'application/pdf' ? 'pdf' : 'webcam';
  if (!(await canUseAttachmentTool(userId, kind))) {
    throw new AttachmentError(403, 'attachment_tool_not_allowed');
  }
  const row = await prisma.toolOutput.create({
    data: {
      conversationId,
      toolType: TOOL_TYPE,
      data: JSON.stringify(parsed.data),
    },
    select: { id: true },
  });
  return { id: row.id, ...parsed.data };
}

export async function deleteConversationAttachment(
  userId: string,
  conversationId: string,
  attachmentId: string,
): Promise<void> {
  await assertOwnedConversation(userId, conversationId);
  if (!attachmentId) throw new AttachmentError(404, 'attachment_not_found');
  const result = await prisma.toolOutput.deleteMany({
    where: {
      id: attachmentId,
      conversationId,
      toolType: TOOL_TYPE,
      conversation: { userId, markedForDeletion: false },
    },
  });
  if (result.count === 0) throw new AttachmentError(404, 'attachment_not_found');
}

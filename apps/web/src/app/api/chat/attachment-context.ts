import { z } from 'zod';
import { detectJailbreak } from '@/lib/safety';
import type { AttachmentDocument } from '@/lib/conversation/attachments/types';
import { ephemeralAttachmentSchema } from '@/lib/conversation/attachments/validation';
import {
  AttachmentError,
  canUseAttachmentTool,
  listConversationAttachments,
} from '@/lib/conversation/attachments/server';

const selectionSchema = z.object({
  conversationId: z.unknown().optional(),
  attachmentIds: z.array(z.string().min(1).max(128)).optional(),
  attachments: z.array(ephemeralAttachmentSchema).optional(),
});

export async function resolveChatAttachments(
  input: unknown,
  userId?: string,
): Promise<AttachmentDocument[]> {
  const parsed = selectionSchema.safeParse(input);
  if (!parsed.success) throw new AttachmentError(400, 'attachment_invalid');
  const { conversationId, attachmentIds, attachments } = parsed.data;
  if (attachmentIds !== undefined && attachments !== undefined) {
    throw new AttachmentError(400, 'attachment_invalid');
  }

  let documents: AttachmentDocument[] = [];
  if (attachmentIds?.length) {
    if (!userId) throw new AttachmentError(401, 'attachment_auth_required');
    if (typeof conversationId !== 'string' || !conversationId || conversationId.length > 128) {
      throw new AttachmentError(400, 'attachment_invalid');
    }
    const stored = await listConversationAttachments(userId, conversationId, attachmentIds);
    documents = [...new Set(attachmentIds)].map((id) => {
      const document = stored.find((candidate) => candidate.id === id);
      if (!document) throw new AttachmentError(404, 'attachment_not_found');
      return document;
    });
  }
  if (attachments?.length) {
    if (userId) throw new AttachmentError(400, 'attachment_invalid');
    documents = attachments;
  }

  const kinds = new Set(
    documents.map((doc) => (doc.mimeType === 'application/pdf' ? 'pdf' : 'webcam')),
  );
  for (const kind of kinds) {
    if (!(await canUseAttachmentTool(userId ?? null, kind))) {
      throw new AttachmentError(403, 'attachment_tool_not_allowed');
    }
  }
  for (const document of documents) {
    for (const page of document.pages) {
      const detection = detectJailbreak(page.text);
      if (detection.action === 'block' || detection.action === 'terminate_session') {
        throw new AttachmentError(400, 'attachment_unsafe');
      }
    }
  }
  return documents;
}

import type { AttachmentDocument } from '@/lib/conversation/attachments/types';

const LOCAL_PREFIX = 'local-';

/**
 * Request fields that keep the selected files in every follow-up turn.
 * Registered chats reference server-owned ids; visitors send their ephemeral docs.
 */
export function buildAttachmentFields(
  docs: AttachmentDocument[],
  conversationId: string | null,
):
  | { conversationId: string; attachmentIds: string[] }
  | { attachments: AttachmentDocument[] }
  | Record<string, never> {
  if (docs.length === 0) return {};
  const remote = docs.filter((d) => !d.id.startsWith(LOCAL_PREFIX));
  if (conversationId && remote.length === docs.length) {
    return { conversationId, attachmentIds: remote.map((d) => d.id) };
  }
  return { attachments: docs };
}

/** Failure of a chat turn that carries files; `code` is the API error code when present. */
export class ChatTurnError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'ChatTurnError';
  }
}

export async function chatTurnError(response: Response): Promise<ChatTurnError> {
  let code = 'REQUEST_FAILED';
  try {
    const body = (await response.json()) as { code?: unknown };
    if (typeof body?.code === 'string') code = body.code;
  } catch {
    // Non-JSON error body: generic failure.
  }
  return new ChatTurnError(code);
}

export class ConversationUnavailableError extends Error {
  readonly code = 'conversation_failed';
  constructor() {
    super('conversation_failed');
    this.name = 'ConversationUnavailableError';
  }
}

/** i18n key under chat.attachments.errors for failures the student must act on, else null. */
export function attachmentErrorKey(error: unknown): string | null {
  if (error instanceof ConversationUnavailableError) return 'conversation_failed';
  if (error instanceof ChatTurnError && error.code === 'ATTACHMENT_CONTEXT_TOO_LARGE') {
    return 'context_too_large';
  }
  return null;
}

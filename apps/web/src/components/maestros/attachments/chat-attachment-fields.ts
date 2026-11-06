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

const ATTACHMENT_ERROR_KEYS: Readonly<Record<string, string>> = {
  unsupported: 'unsupported',
  encrypted: 'encrypted',
  unreadable: 'unreadable',
  too_large: 'tooLarge',
  too_many_pages: 'tooManyPages',
  no_text: 'noText',
  ocr_failed: 'ocrFailed',
  ocr_needs_account: 'ocrNeedsAccount',
  ocr_limit: 'ocrLimit',
  remove_failed: 'removeFailed',
  restore_failed: 'restoreFailed',
  conversation_failed: 'conversationFailed',
  ATTACHMENT_CONTEXT_TOO_LARGE: 'contextTooLarge',
  attachment_not_found: 'notFound',
  attachment_tool_not_allowed: 'notAllowed',
  attachment_unsafe: 'unsafe',
  attachment_invalid: 'invalid',
  attachment_data_invalid: 'invalid',
  conversation_not_found: 'conversationFailed',
  attachment_auth_required: 'sessionExpired',
};

export function attachmentCodeKey(code: string): string | null {
  return Object.hasOwn(ATTACHMENT_ERROR_KEYS, code) ? ATTACHMENT_ERROR_KEYS[code] : null;
}

/** Errors where trying the same file again cannot help: the student must change something. */
const FINAL_ERRORS = new Set([
  'unsupported',
  'encrypted',
  'too_large',
  'too_many_pages',
  'no_text',
  'ocr_needs_account',
  'attachment_tool_not_allowed',
]);

export function isRetryableAttachmentError(code: string | undefined): boolean {
  return !code || !FINAL_ERRORS.has(code);
}

export function attachmentErrorKey(error: unknown): string | null {
  if (error instanceof ConversationUnavailableError || error instanceof ChatTurnError) {
    return attachmentCodeKey(error.code);
  }
  return null;
}

import { csrfFetch } from '@/lib/auth';
import type { AttachmentDocument, AttachmentUpload } from './types';

export class AttachmentApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = 'AttachmentApiError';
  }
}

async function failure(response: Response): Promise<AttachmentApiError> {
  let code = 'REQUEST_FAILED';
  try {
    const body = (await response.json()) as { code?: unknown };
    if (typeof body?.code === 'string') code = body.code;
  } catch {
    // Non-JSON error body: keep the generic code.
  }
  return new AttachmentApiError(response.status, code);
}

export async function listAttachments(
  conversationId: string,
  signal?: AbortSignal,
): Promise<AttachmentDocument[]> {
  const response = await fetch(
    `/api/conversations/${encodeURIComponent(conversationId)}/attachments`,
    { signal },
  );
  if (!response.ok) throw await failure(response);
  const body = (await response.json()) as { attachments?: AttachmentDocument[] };
  return Array.isArray(body.attachments) ? body.attachments : [];
}

export async function createAttachment(
  conversationId: string,
  upload: AttachmentUpload,
  signal?: AbortSignal,
): Promise<AttachmentDocument> {
  const response = await csrfFetch(
    `/api/conversations/${encodeURIComponent(conversationId)}/attachments`,
    { method: 'POST', body: JSON.stringify(upload), signal },
  );
  if (!response.ok) throw await failure(response);
  const body = (await response.json()) as { attachment: AttachmentDocument };
  return body.attachment;
}

export async function deleteAttachment(
  conversationId: string,
  attachmentId: string,
): Promise<void> {
  const response = await csrfFetch(
    `/api/conversations/${encodeURIComponent(conversationId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { method: 'DELETE' },
  );
  if (!response.ok && response.status !== 404) throw await failure(response);
}

export async function analyzeAttachmentImage(
  image: string,
  pageNumber: number,
  signal?: AbortSignal,
  source: 'pdf' | 'image' = 'image',
): Promise<string> {
  const response = await csrfFetch('/api/chat/attachments/analyze', {
    method: 'POST',
    body: JSON.stringify({ image, pageNumber, source }),
    signal,
  });
  if (!response.ok) throw await failure(response);
  const body = (await response.json()) as { text?: unknown };
  return typeof body.text === 'string' ? body.text : '';
}

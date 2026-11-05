import type { AttachmentDocument } from '@/lib/conversation/attachments/types';

export type AttachmentStatus = 'reading' | 'saving' | 'ready' | 'error' | 'removing';

export interface AttachmentItem {
  localId: string;
  name: string;
  status: AttachmentStatus;
  done: number;
  total: number;
  skippedPages: number[];
  errorCode?: string;
  doc?: AttachmentDocument;
  remote: boolean;
}

export type AttachmentAnnouncement =
  | { type: 'reading' | 'ready' | 'removed' | 'cancelled'; name: string }
  | { type: 'error'; name: string; code: string };

/** Reconcile a completed upload with a document already returned by a concurrent restore. */
export function patchAttachmentItems(
  items: AttachmentItem[],
  localId: string,
  changes: Partial<AttachmentItem>,
): AttachmentItem[] {
  const previous = items.find((item) => item.localId === localId);
  if (!previous) return items;
  const updated = { ...previous, ...changes };
  return items.flatMap((item) =>
    item.localId === localId
      ? [updated]
      : updated.doc && item.doc?.id === updated.doc.id
        ? []
        : [item],
  );
}

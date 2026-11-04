import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import {
  createAttachment,
  deleteAttachment,
  listAttachments,
} from '@/lib/conversation/attachments/client-api';
import { AttachmentReadError, readAttachment } from '@/lib/conversation/attachments/client-reader';
import type { AttachmentDocument } from '@/lib/conversation/attachments/types';

export type AttachmentStatus = 'reading' | 'saving' | 'ready' | 'error' | 'removing';

export interface AttachmentItem {
  localId: string;
  name: string;
  status: AttachmentStatus;
  done: number;
  total: number;
  /** Pages with no readable text: the file is only partly covered. */
  skippedPages: number[];
  errorCode?: string;
  doc?: AttachmentDocument;
  /** True when the document lives on the server (registered account). */
  remote: boolean;
}

export type AttachmentAnnouncement =
  | { type: 'reading' | 'ready' | 'removed' | 'cancelled'; name: string }
  | { type: 'error'; name: string; code: string };

interface Options {
  ensureConversation: () => Promise<string | null>;
  getConversationId: () => string | null;
}

export function useConversationAttachments({ ensureConversation, getConversationId }: Options) {
  const [items, setItems] = useState<AttachmentItem[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [announcement, setAnnouncement] = useState<AttachmentAnnouncement | null>(null);
  const consentedRef = useRef(false);
  const counterRef = useRef(0);
  const filesRef = useRef(new Map<string, File>());
  const controllersRef = useRef(new Map<string, AbortController>());

  const patch = useCallback((localId: string, changes: Partial<AttachmentItem>) => {
    setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, ...changes } : i)));
  }, []);

  const drop = useCallback((localId: string) => {
    filesRef.current.delete(localId);
    controllersRef.current.delete(localId);
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  }, []);

  const run = useCallback(
    async (file: File, localId: string) => {
      const controller = new AbortController();
      controllersRef.current.set(localId, controller);
      filesRef.current.set(localId, file);
      setItems((prev) => {
        const fresh: AttachmentItem = {
          localId,
          name: file.name,
          status: 'reading',
          done: 0,
          total: 0,
          skippedPages: [],
          remote: false,
        };
        return prev.some((i) => i.localId === localId)
          ? prev.map((i) => (i.localId === localId ? fresh : i))
          : [...prev, fresh];
      });
      setAnnouncement({ type: 'reading', name: file.name });
      try {
        const result = await readAttachment(file, {
          signal: controller.signal,
          onProgress: (done, total) => patch(localId, { done, total }),
        });
        patch(localId, { status: 'saving' });
        const conversationId = await ensureConversation();
        if (controller.signal.aborted) throw new AttachmentReadError('cancelled');
        const doc = conversationId
          ? await createAttachment(conversationId, result.upload, controller.signal)
          : { id: `local-${localId}`, ...result.upload };
        patch(localId, {
          status: 'ready',
          doc,
          remote: Boolean(conversationId),
          skippedPages: result.skippedPages,
        });
        setAnnouncement({ type: 'ready', name: file.name });
      } catch (error) {
        if (controller.signal.aborted) {
          drop(localId);
          setAnnouncement({ type: 'cancelled', name: file.name });
          return;
        }
        const code =
          error instanceof AttachmentReadError
            ? error.code
            : ((error as { code?: string }).code ?? 'REQUEST_FAILED');
        logger.warn('Attachment processing failed', { code });
        patch(localId, { status: 'error', errorCode: code });
        setAnnouncement({ type: 'error', name: file.name, code });
      }
    },
    [ensureConversation, patch, drop],
  );

  const startFiles = useCallback(
    (files: File[]) => {
      for (const file of files) {
        counterRef.current += 1;
        void run(file, `att-${counterRef.current}`);
      }
    },
    [run],
  );

  const pickFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      if (consentedRef.current) startFiles(files);
      else setPendingFiles(files);
    },
    [startFiles],
  );

  const confirmConsent = useCallback(() => {
    consentedRef.current = true;
    const files = pendingFiles ?? [];
    setPendingFiles(null);
    startFiles(files);
  }, [pendingFiles, startFiles]);

  const declineConsent = useCallback(() => setPendingFiles(null), []);

  const cancel = useCallback((localId: string) => {
    controllersRef.current.get(localId)?.abort();
  }, []);

  const retry = useCallback(
    (localId: string) => {
      const file = filesRef.current.get(localId);
      if (file) void run(file, localId);
    },
    [run],
  );

  /** Resolves true once the item is really gone (the remote DELETE is awaited). */
  const remove = useCallback(
    async (localId: string): Promise<boolean> => {
      const item = items.find((i) => i.localId === localId);
      if (!item) return true;
      const conversationId = getConversationId();
      if (item.remote && item.doc && conversationId) {
        patch(localId, { status: 'removing', errorCode: undefined });
        try {
          await deleteAttachment(conversationId, item.doc.id);
        } catch (error) {
          logger.warn('Attachment removal failed', { error: String(error) });
          patch(localId, { status: 'error', errorCode: 'remove_failed' });
          setAnnouncement({ type: 'error', name: item.name, code: 'remove_failed' });
          return false;
        }
      }
      drop(localId);
      setAnnouncement({ type: 'removed', name: item.name });
      return true;
    },
    [items, getConversationId, patch, drop],
  );

  const restore = useCallback(async (conversationId: string) => {
    try {
      const docs = await listAttachments(conversationId);
      setItems(
        docs.map((doc) => ({
          localId: `srv-${doc.id}`,
          name: doc.name,
          status: 'ready' as const,
          done: doc.pages.length,
          total: doc.pages.length,
          skippedPages: [],
          doc,
          remote: true,
        })),
      );
    } catch (error) {
      logger.warn('Attachment restore failed', { error: String(error) });
      setAnnouncement({ type: 'error', name: '', code: 'restore_failed' });
    }
  }, []);

  const reset = useCallback(() => {
    controllersRef.current.forEach((c) => c.abort());
    controllersRef.current.clear();
    filesRef.current.clear();
    setItems([]);
    setPendingFiles(null);
    setAnnouncement(null);
  }, []);

  useEffect(() => {
    const controllers = controllersRef.current;
    return () => controllers.forEach((c) => c.abort());
  }, []);

  const readyDocs = useMemo(
    () => items.flatMap((i) => (i.status === 'ready' && i.doc ? [i.doc] : [])),
    [items],
  );
  const busy = items.some(
    (i) => i.status === 'reading' || i.status === 'saving' || i.status === 'removing',
  );

  return {
    items,
    readyDocs,
    busy,
    announcement,
    consentOpen: pendingFiles !== null,
    pickFiles,
    confirmConsent,
    declineConsent,
    cancel,
    retry,
    remove,
    restore,
    reset,
  };
}

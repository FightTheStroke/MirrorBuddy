'use client';

import { useRef } from 'react';
import { FileText, Loader2, X, RotateCcw, AlertTriangle, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { AttachmentAnnouncement, AttachmentItem } from './use-conversation-attachments';
import { attachmentCodeKey } from './chat-attachment-fields';

interface AttachmentChipsProps {
  items: AttachmentItem[];
  announcement: AttachmentAnnouncement | null;
  onCancel: (localId: string) => void;
  onRetry: (localId: string) => void;
  onRemove: (localId: string) => Promise<boolean>;
  /** Called with the removed chip's neighbour unavailable: focus must land somewhere safe. */
  onFocusFallback: () => void;
}

export function AttachmentChips({
  items,
  announcement,
  onCancel,
  onRetry,
  onRemove,
  onFocusFallback,
}: AttachmentChipsProps) {
  const t = useTranslations('chat');
  const refs = useRef(new Map<string, HTMLLIElement>());

  const announce = announcement
    ? announcement.type === 'error'
      ? t(`attachments.errors.${attachmentCodeKey(announcement.code) ?? 'generic'}`)
      : t(`attachments.announce.${announcement.type}`, { name: announcement.name })
    : '';

  const handleRemove = async (index: number, localId: string) => {
    const next = items[index + 1] ?? items[index - 1];
    if (!(await onRemove(localId))) return;
    const target = next ? refs.current.get(next.localId) : null;
    if (target) target.focus();
    else onFocusFallback();
  };

  return (
    <div className="mb-2">
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
      {items.length > 0 && (
        <ul aria-label={t('attachments.listLabel')} className="flex flex-wrap gap-2">
          {items.map((item, index) => {
            const working = item.status === 'reading' || item.status === 'saving';
            const failed = item.status === 'error';
            const errorKey = item.errorCode
              ? (attachmentCodeKey(item.errorCode) ?? 'generic')
              : 'generic';
            const retryRemoval = item.errorCode === 'remove_failed';
            return (
              <li
                key={item.localId}
                ref={(node) => {
                  if (node) refs.current.set(item.localId, node);
                  else refs.current.delete(item.localId);
                }}
                tabIndex={-1}
                className="flex max-w-full items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {working || item.status === 'removing' ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 motion-safe:animate-spin"
                  />
                ) : failed ? (
                  <AlertTriangle
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-red-700 dark:text-red-300"
                  />
                ) : item.status === 'ready' ? (
                  <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                ) : (
                  <FileText aria-hidden="true" className="h-4 w-4 shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="block">
                    {failed
                      ? t(`attachments.errors.${errorKey}`)
                      : item.status === 'removing'
                        ? t('attachments.status.removing')
                        : item.status === 'saving'
                          ? t('attachments.status.saving')
                          : working
                            ? item.total > 0
                              ? t('attachments.status.progress', {
                                  done: item.done,
                                  total: item.total,
                                })
                              : t('attachments.status.reading')
                            : item.skippedPages.length > 0
                              ? t('attachments.status.partial', { count: item.skippedPages.length })
                              : t('attachments.status.ready')}
                  </span>
                </span>
                {working && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11 min-w-11"
                    onClick={() => onCancel(item.localId)}
                    aria-label={t('attachments.cancelLabel', { name: item.name })}
                  >
                    {t('attachments.cancel')}
                  </Button>
                )}
                {failed && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11 min-w-11"
                    onClick={() =>
                      retryRemoval ? void handleRemove(index, item.localId) : onRetry(item.localId)
                    }
                    aria-label={t('attachments.retryLabel', { name: item.name })}
                  >
                    <RotateCcw aria-hidden="true" className="h-4 w-4" />
                    <span className="ml-1">{t('attachments.retry')}</span>
                  </Button>
                )}
                {item.status !== 'reading' &&
                  item.status !== 'saving' &&
                  item.status !== 'removing' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-11 w-11"
                      onClick={() => void handleRemove(index, item.localId)}
                      aria-label={t('attachments.removeLabel', { name: item.name })}
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

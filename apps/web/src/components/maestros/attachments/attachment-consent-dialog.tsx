'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ATTACHMENT_LIMIT_PARAMS } from '@/lib/conversation/attachments/limits';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AttachmentConsentDialogProps {
  open: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}

/** Shown before any file content leaves the device. */
export function AttachmentConsentDialog({
  open,
  onConfirm,
  onDecline,
}: AttachmentConsentDialogProps) {
  const t = useTranslations('chat');
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDecline()}>
      <DialogContent closeLabel={t('attachments.consent.decline')}>
        <DialogHeader>
          <DialogTitle>{t('attachments.consent.title')}</DialogTitle>
          <DialogDescription>{t('attachments.consent.body')}</DialogDescription>
        </DialogHeader>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {t('attachments.consent.limits', ATTACHMENT_LIMIT_PARAMS)}
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {t('attachments.consent.storage')}
        </p>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={onDecline}>
            {t('attachments.consent.decline')}
          </Button>
          <Button type="button" className="h-11" onClick={onConfirm}>
            {t('attachments.consent.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

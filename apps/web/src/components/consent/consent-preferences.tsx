'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AccessibilityPanelMobile } from '@/components/settings/accessibility-panel-mobile';

export function ConsentPreferences() {
  const t = useTranslations('settings.accessibility');
  return (
    <Dialog>
      <DialogTrigger className="min-h-11 rounded-md px-3 text-sm underline focus-visible:outline-2">
        {t('panelTitle')}
      </DialogTrigger>
      <DialogContent
        className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto"
        closeLabel={t('closeSettings')}
      >
        <DialogTitle>{t('panelTitle')}</DialogTitle>
        <DialogDescription>{t('mobileSubtitle')}</DialogDescription>
        <AccessibilityPanelMobile />
      </DialogContent>
    </Dialog>
  );
}

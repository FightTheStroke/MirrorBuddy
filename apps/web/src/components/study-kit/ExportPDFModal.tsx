'use client';

/**
 * ExportPDFModal
 * Lets a student export a Study Kit as an accessible, DSA-tuned PDF.
 * Built on the shared Radix Dialog so focus trapping, Escape-to-close, focus
 * return and `aria-modal` semantics come for free (WCAG 2.1 AA).
 */

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Download, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { clientLogger as logger } from '@/lib/logger/client';
import { csrfFetch } from '@/lib/auth';
import toast from '@/components/ui/toast';
import { DSA_PROFILES, type DSAProfile } from './dsa-profiles';
import type { StudyKit } from '@/types/study-kit';

interface ExportPDFModalProps {
  studyKit: StudyKit;
  isOpen: boolean;
  onClose: () => void;
}

type PageFormat = 'A4' | 'Letter';

export function ExportPDFModal({ studyKit, isOpen, onClose }: ExportPDFModalProps) {
  const t = useTranslations('tools.studyKit.exportModal');
  const locale = useLocale();
  const [selectedProfile, setSelectedProfile] = useState<DSAProfile>('dyslexia');
  const [format, setFormat] = useState<PageFormat>('A4');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await csrfFetch('/api/pdf-generator', {
        method: 'POST',
        body: JSON.stringify({
          kitId: studyKit.id,
          profile: selectedProfile,
          format,
          locale,
        }),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error ?? t('error'));
      }

      const disposition = response.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="(.+?)"/);
      const filename = match?.[1] ?? `${studyKit.title}_DSA.pdf`;
      const savedToZaino = response.headers.get('X-Saved-To-Zaino') === 'true';

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success(savedToZaino ? t('success.withZaino') : t('success.default'));
      onClose();
    } catch (error) {
      logger.error('PDF export failed', { error: String(error) });
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl motion-reduce:animate-none motion-reduce:transition-none">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
            <p className="font-medium text-slate-900 dark:text-white">{studyKit.title}</p>
            {studyKit.subject && <p className="text-sm text-slate-500">{studyKit.subject}</p>}
          </div>

          <fieldset>
            <legend className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('profileLabel')}
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DSA_PROFILES.map((profile) => {
                const selected = selectedProfile === profile.value;
                return (
                  <button
                    key={profile.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedProfile(profile.value)}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed focus-visible:ring-offset-2 motion-reduce:transition-none',
                      selected
                        ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold',
                        selected
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                      )}
                    >
                      {profile.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {t(`profiles.${profile.value}.label`)}
                        </span>
                        {selected && (
                          <Check aria-hidden="true" className="h-4 w-4 text-green-600" />
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-400">
                        {t(`profiles.${profile.value}.description`)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('formatLabel')}
            </legend>
            <div className="flex gap-3">
              {(['A4', 'Letter'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={format === option}
                  onClick={() => setFormat(option)}
                  className={cn(
                    'flex-1 rounded-lg border-2 px-4 py-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed focus-visible:ring-offset-2 motion-reduce:transition-none',
                    format === option
                      ? 'border-green-600 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400',
                  )}
                >
                  {option === 'A4' ? 'A4' : t('letterUs')}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {isExporting ? (
              <Loader2
                aria-hidden="true"
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Download aria-hidden="true" className="h-4 w-4" />
            )}
            {isExporting ? t('generating') : t('export')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

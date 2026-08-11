'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PDFPreviewMode } from './use-pdf-preview';

interface PDFPreviewFooterProps {
  selectedCount: number;
  allowMultiSelect: boolean;
  mode?: PDFPreviewMode;
  onClose: () => void;
  onConfirm: () => void;
}

export function PDFPreviewFooter({
  selectedCount,
  allowMultiSelect,
  mode = 'select',
  onClose,
  onConfirm,
}: PDFPreviewFooterProps) {
  const t = useTranslations('tools.pdf.preview');

  // In confirm mode the student is answering "is this the right document?",
  // so a page count would be noise and the CTA must not say "analyse".
  if (mode === 'confirm') {
    return (
      <div className="p-4 border-t border-slate-700 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{t('confirmHint')}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-600">
            {t('chooseAnother')}
          </Button>
          <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
            <Check className="w-4 h-4 mr-2" />
            {t('confirmUpload')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-slate-700 flex items-center justify-between">
      <div className="text-sm text-slate-400">
        {t('selectedCount', { count: selectedCount })}
        {allowMultiSelect && <span className="ml-2">{t('clickToSelect')}</span>}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} className="border-slate-600">
          {t('cancel')}
        </Button>
        <Button
          onClick={onConfirm}
          className="bg-green-600 hover:bg-green-700"
          disabled={selectedCount === 0}
        >
          <Check className="w-4 h-4 mr-2" />
          {t('analyze')} {t('analyzePages', { count: selectedCount })}
        </Button>
      </div>
    </div>
  );
}

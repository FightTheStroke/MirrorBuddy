'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';

// pdfjs is ~800KB before minification and most visitors never open the
// preview, so it must not sit in the Study Kit's initial client bundle.
const PDFPreview = dynamic(
  () => import('@/components/tools/pdf-preview').then((m) => m.PDFPreview),
  { ssr: false }
);

interface StudyKitPdfConfirmProps {
  /** Local PDF only — Google Drive picks are not File objects yet. */
  file: File;
}

/**
 * Lets the student look inside the PDF before uploading it, so a wrong or
 * blank scan is caught by eye rather than by reading a filename.
 */
export function StudyKitPdfConfirm({ file }: StudyKitPdfConfirmProps) {
  const t = useTranslations('tools.pdf.preview');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto"
      >
        <Eye className="w-4 h-4 mr-2" />
        {t('openPreview')}
      </Button>

      {isOpen && (
        <PDFPreview
          file={file}
          mode="confirm"
          onConfirm={() => setIsOpen(false)}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

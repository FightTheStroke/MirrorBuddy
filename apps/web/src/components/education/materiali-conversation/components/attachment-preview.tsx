/**
 * @file attachment-preview.tsx
 * @brief Attachment preview component
 */

import Image from 'next/image';
import { X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { Attachment } from '../types';

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  highContrast: boolean;
}

export function AttachmentPreview({
  attachments,
  onRemove,
  highContrast,
}: AttachmentPreviewProps) {
  const t = useTranslations('education');
  if (attachments.length === 0) return null;

  return (
    <div
      className={cn(
        'border-t px-4 py-2',
        highContrast
          ? 'border-yellow-400 bg-black'
          : 'border-slate-200 dark:border-slate-700'
      )}
    >
      <div className="flex gap-2 overflow-x-auto">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0"
          >
            {att.type === 'image' ? (
              <Image
                src={att.url}
                alt={att.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
            )}
            <button
              onClick={() => onRemove(att.id)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
              aria-label={t("rimuoviAllegato", { name: att.name })}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


"use client";

/**
 * @file attachment-panel.tsx
 * @brief Attachment panel component
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from "next-intl";

interface AttachmentPanelProps {
  show: boolean;
  onCameraClick: () => void;
  onFileClick: () => void;
  highContrast: boolean;
}

export function AttachmentPanel({
  show,
  onCameraClick,
  onFileClick,
  highContrast,
}: AttachmentPanelProps) {
  const t = useTranslations("education");
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={cn(
            'border-t px-4 py-3',
            highContrast
              ? 'border-yellow-400 bg-gray-900'
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
          )}
        >
          <div className="flex gap-4 justify-center">
            <button
              onClick={onCameraClick}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-lg transition-colors',
                highContrast
                  ? 'hover:bg-yellow-400/20'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <Camera className="w-6 h-6" />
              <span className="text-xs">{t("fotocamera")}</span>
            </button>
            <button
              onClick={onFileClick}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-lg transition-colors',
                highContrast
                  ? 'hover:bg-yellow-400/20'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <FileText className="w-6 h-6" />
              <span className="text-xs">{t("file")}</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


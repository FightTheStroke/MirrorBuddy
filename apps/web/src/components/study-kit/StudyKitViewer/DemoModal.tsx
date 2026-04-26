'use client';

/**
 * DemoModal Component
 * Full-screen modal for interactive demo display
 */

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { HTMLPreview } from '@/components/education/html-preview';
import { useTranslations } from "next-intl";

interface DemoData {
  title?: string;
  description?: string;
}

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  demoCode: string;
  demo?: DemoData | null;
}

/**
 * Get demo title from demo data
 */
function getDemoTitle(demo?: DemoData | null): string {
  if (demo && 'title' in demo && typeof demo.title === 'string') {
    return demo.title;
  }
  return 'Demo Interattiva';
}

/**
 * Get demo description from demo data
 */
function getDemoDescription(demo?: DemoData | null): string | undefined {
  if (demo && 'description' in demo && typeof demo.description === 'string') {
    return demo.description;
  }
  return undefined;
}

export function DemoModal({ isOpen, onClose, demoCode, demo }: DemoModalProps) {
  const t = useTranslations("education");
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label={t("chiudiDemo")}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Demo content */}
            <HTMLPreview
              code={demoCode}
              title={getDemoTitle(demo)}
              description={getDemoDescription(demo)}
              onClose={onClose}
              allowSave={false}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

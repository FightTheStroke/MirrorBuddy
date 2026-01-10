'use client';

/**
 * Content Preview Component
 * Modal for previewing different types of educational content
 * Supports: mind maps, quizzes, summaries, flashcards
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, HelpCircle, FileText, Layers, Loader2, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MindMapPreview,
  QuizPreview,
  SummaryPreview,
  FlashcardPreview,
  GenericPreview,
} from './preview-components';
import type { ToolType } from '@/types/tools';

interface ContentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  type: ToolType;
  content: unknown;
  title: string;
}

// Custom hook to manage loading state without synchronous setState in effect
function useDelayedValue<T>(value: T, delay: number): T {
  const [delayedValue, setDelayedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDelayedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return delayedValue;
}

export function ContentPreview({
  isOpen,
  onClose,
  type,
  content,
  title,
}: ContentPreviewProps) {
  // Show loading for first 300ms after opening
  const delayedIsOpen = useDelayedValue(isOpen, 300);
  const isLoading = isOpen && !delayedIsOpen;

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    switch (type) {
      case 'mindmap':
        return <MindMapPreview content={content} />;
      case 'quiz':
        return <QuizPreview content={content} />;
      case 'summary':
        return <SummaryPreview content={content} />;
      case 'flashcard':
        return <FlashcardPreview content={content} />;
      default:
        return <GenericPreview content={content} />;
    }
  };

  const Icon = useMemo((): LucideIcon => {
    switch (type) {
      case 'mindmap': return Brain;
      case 'quiz': return HelpCircle;
      case 'summary': return FileText;
      case 'flashcard': return Layers;
      default: return FileText;
    }
  }, [type]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
                <h2 id="preview-title" className="text-xl font-bold text-slate-900 dark:text-white">
                  {title}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Chiudi anteprima"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderPreview()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={onClose}>
                Chiudi
              </Button>
              <Button>
                Apri
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


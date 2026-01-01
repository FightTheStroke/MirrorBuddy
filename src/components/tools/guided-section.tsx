'use client';

/**
 * GuidedSection Component - Section with guiding question and markdown editor
 * Part of Issue #70: Collaborative summary writing
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Lightbulb, ChevronDown, ChevronUp, Eye, Edit3, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TextWithComments } from './inline-comment';
import type { StudentSummarySection } from '@/types/tools';
import { countWords } from '@/lib/hooks/use-student-summary-sync';

const MDEditor = dynamic(() => import('@uiw/react-md-editor').then((m) => m.default), { ssr: false });

interface GuidedSectionProps {
  section: StudentSummarySection;
  onChange: (content: string) => void;
  onResolveComment?: (commentId: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function GuidedSection({
  section, onChange, onResolveComment, readOnly = false, autoFocus = false, className,
}: GuidedSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus) editorRef.current?.querySelector('textarea')?.focus();
  }, [autoFocus]);

  const wordCount = countWords(section.content);
  const unresolvedCount = section.comments.filter((c) => !c.resolved).length;

  return (
    <div className={cn('border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 hover:from-slate-100 dark:hover:from-slate-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-800 dark:text-white">{section.heading}</h3>
          {unresolvedCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 text-xs font-medium">
              <MessageCircle className="w-3 h-3" />{unresolvedCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{wordCount} {wordCount === 1 ? 'parola' : 'parole'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      <motion.div initial={false} animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }} className="overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800 dark:text-emerald-200">{section.guidingQuestion}</p>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant={viewMode === 'edit' ? 'default' : 'outline'} onClick={() => setViewMode('edit')} className="h-7 text-xs">
                <Edit3 className="w-3 h-3 mr-1" />Scrivi
              </Button>
              <Button size="sm" variant={viewMode === 'preview' ? 'default' : 'outline'} onClick={() => setViewMode('preview')} className="h-7 text-xs">
                <Eye className="w-3 h-3 mr-1" />Anteprima
              </Button>
            </div>
          )}

          <div ref={editorRef} data-color-mode="light">
            {viewMode === 'edit' && !readOnly ? (
              <MDEditor
                value={section.content}
                onChange={(v) => onChange(v || '')}
                preview="edit"
                hideToolbar={false}
                height={200}
                textareaProps={{ placeholder: 'Inizia a scrivere qui...' }}
              />
            ) : (
              <div className="min-h-[200px] p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 prose prose-sm dark:prose-invert max-w-none">
                {section.content ? (
                  <TextWithComments content={section.content} comments={section.comments} onResolveComment={onResolveComment} />
                ) : (
                  <p className="text-slate-400 italic">Nessun contenuto ancora. Inizia a scrivere!</p>
                )}
              </div>
            )}
          </div>

          {section.comments.length > 0 && viewMode === 'edit' && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <MessageCircle className="w-3 h-3" />
              {unresolvedCount > 0 ? `${unresolvedCount} commenti da leggere (vedi anteprima)` : 'Tutti i commenti risolti'}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface SectionOverviewProps {
  section: StudentSummarySection;
  isActive: boolean;
  onClick: () => void;
}

export function SectionOverview({ section, isActive, onClick }: SectionOverviewProps) {
  const wordCount = countWords(section.content);
  const unresolvedComments = section.comments.filter((c) => !c.resolved).length;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all',
        isActive ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300',
        !wordCount && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={cn('font-medium text-sm', isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300')}>
          {section.heading}
        </span>
        {unresolvedComments > 0 && (
          <span className="flex items-center gap-1 text-xs text-yellow-600"><MessageCircle className="w-3 h-3" />{unresolvedComments}</span>
        )}
      </div>
      <div className="text-xs text-slate-500">{wordCount ? `${wordCount} parole` : 'Da completare'}</div>
    </button>
  );
}

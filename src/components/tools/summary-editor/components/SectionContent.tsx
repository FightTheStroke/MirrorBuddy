'use client';

/**
 * Section Content Component
 *
 * Renders the expandable content area with:
 * - Description/content (editable)
 * - Key points list (editable)
 * - Add key point button
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SummarySection } from '@/types/tools';
import type { EditState } from '../types';

interface SectionContentProps {
  section: SummarySection;
  sectionIndex: number;
  isExpanded: boolean;
  editState: EditState | null;
  editValue: string;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  readOnly?: boolean;
  onStartEdit: (state: EditState, value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onAddKeyPoint: () => void;
  onDeleteKeyPoint: (pointIndex: number) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function SectionContent({
  section,
  sectionIndex,
  isExpanded,
  editState,
  editValue,
  inputRef,
  readOnly,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onAddKeyPoint,
  onDeleteKeyPoint,
  onKeyDown,
}: SectionContentProps) {
  const t = useTranslations('tools.summary');
  const isSectionContentEditing =
    editState?.type === 'section-content' && editState.sectionIndex === sectionIndex;

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-3 space-y-3"
        >
          {/* Description */}
          {isSectionContentEditing ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onCancelEdit();
              }}
              onBlur={onSaveEdit}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-primary bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              aria-label="Contenuto della sezione"
            />
          ) : (
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Paragraph used for semantic structure, made interactive for inline editing UX
            <p
              role={!readOnly ? 'button' : undefined}
              tabIndex={!readOnly ? 0 : undefined}
              className={cn(
                'text-slate-600 dark:text-slate-300',
                !readOnly && 'cursor-pointer hover:text-slate-900 dark:hover:text-white',
                !section.content && 'text-slate-400 italic',
              )}
              onClick={() =>
                !readOnly &&
                onStartEdit({ type: 'section-content', sectionIndex }, section.content || '')
              }
              onKeyDown={(e) => {
                if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onStartEdit({ type: 'section-content', sectionIndex }, section.content || '');
                }
              }}
            >
              {section.content || 'Clicca per aggiungere contenuto...'}
            </p>
          )}

          {/* Key Points */}
          {(section.keyPoints?.length ?? 0) > 0 && (
            <ul className="space-y-2">
              {section.keyPoints?.map((point, pointIndex) => (
                <li key={pointIndex} className="flex items-start gap-2 group/point">
                  <span className="w-1.5 h-1.5 mt-2 rounded-full bg-primary shrink-0" />
                  {editState?.type === 'point' &&
                  editState.sectionIndex === sectionIndex &&
                  editState.pointIndex === pointIndex ? (
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="text"
                      value={editValue}
                      onChange={(e) => onEditValueChange(e.target.value)}
                      onKeyDown={onKeyDown}
                      onBlur={onSaveEdit}
                      className="flex-1 px-2 py-1 rounded border border-primary bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      aria-label="Punto chiave"
                    />
                  ) : (
                    <span
                      role={!readOnly ? 'button' : undefined}
                      tabIndex={!readOnly ? 0 : undefined}
                      className={cn(
                        'flex-1 text-sm text-slate-600 dark:text-slate-300',
                        !readOnly && 'cursor-pointer hover:text-slate-900 dark:hover:text-white',
                      )}
                      onClick={() =>
                        !readOnly && onStartEdit({ type: 'point', sectionIndex, pointIndex }, point)
                      }
                      onKeyDown={(e) => {
                        if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onStartEdit({ type: 'point', sectionIndex, pointIndex }, point);
                        }
                      }}
                    >
                      {point}
                    </span>
                  )}
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover/point:opacity-100 transition-opacity"
                      onClick={() => onDeleteKeyPoint(pointIndex)}
                      aria-label={t('deleteKeyPoint')}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add Key Point Button */}
          {!readOnly && (
            <button
              type="button"
              onClick={onAddKeyPoint}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addKeyPoint')}</span>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

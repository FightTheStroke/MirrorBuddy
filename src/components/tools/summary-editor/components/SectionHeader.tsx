'use client';

/**
 * Section Header Component
 *
 * Renders the collapsible header of a section with:
 * - Toggle chevron
 * - Title (editable)
 * - Delete button
 */

import { GripVertical, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EditState } from '../types';

interface SectionHeaderProps {
  sectionIndex: number;
  title: string;
  isExpanded: boolean;
  editState: EditState | null;
  editValue: string;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  readOnly?: boolean;
  onToggle: () => void;
  onStartEdit: (state: EditState, value: string) => void;
  onSaveEdit: () => void;
  onEditValueChange: (value: string) => void;
  onDeleteSection: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function SectionHeader({
  sectionIndex,
  title,
  isExpanded,
  editState,
  editValue,
  inputRef,
  readOnly,
  onToggle,
  onStartEdit,
  onSaveEdit,
  onEditValueChange,
  onDeleteSection,
  onKeyDown,
}: SectionHeaderProps) {
  const isSectionTitleEditing =
    editState?.type === 'section-title' && editState.sectionIndex === sectionIndex;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50',
        'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
      )}
      onClick={onToggle}
    >
      {!readOnly && (
        <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
      )}
      <button
        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
        aria-label={isExpanded ? 'Comprimi sezione' : 'Espandi sezione'}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Section Title Edit/Display */}
      {isSectionTitleEditing ? (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onSaveEdit}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 px-2 py-1 font-semibold rounded border border-primary bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Titolo della sezione"
        />
      ) : (
        <span
          className={cn(
            'flex-1 font-semibold text-slate-900 dark:text-white',
            !readOnly && 'hover:text-primary'
          )}
          onClick={(e) => {
            if (!readOnly) {
              e.stopPropagation();
              onStartEdit({ type: 'section-title', sectionIndex }, title);
            }
          }}
        >
          {title}
        </span>
      )}

      {!readOnly && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSection();
          }}
          aria-label="Elimina sezione"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}

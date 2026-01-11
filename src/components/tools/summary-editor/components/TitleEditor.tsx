'use client';

/**
 * Title Editor Component
 *
 * Renders the summary title with edit capabilities.
 * Shows either static title or editable input.
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Edit2, Check, X } from 'lucide-react';
import type { EditState } from '../types';

interface TitleEditorProps {
  title: string;
  isEditing: boolean;
  editValue: string;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  readOnly?: boolean;
  onStartEdit: (state: EditState, value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function TitleEditor({
  title,
  isEditing,
  editValue,
  inputRef,
  readOnly,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onKeyDown,
}: TitleEditorProps) {
  return (
    <div className="flex items-center gap-2 group">
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onSaveEdit}
            className="flex-1 px-3 py-2 text-xl font-bold rounded-md border border-primary bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Titolo del riassunto"
          />
          <Button variant="ghost" size="icon" onClick={onSaveEdit} aria-label="Salva">
            <Check className="w-4 h-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancelEdit}
            aria-label="Annulla"
          >
            <X className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      ) : (
        <>
          <h2
            className={cn(
              'flex-1 text-xl font-bold text-slate-900 dark:text-white',
              !readOnly && 'cursor-pointer hover:text-primary transition-colors'
            )}
            onClick={() => !readOnly && onStartEdit({ type: 'title' }, title)}
          >
            {title}
          </h2>
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onStartEdit({ type: 'title' }, title)}
              aria-label="Modifica titolo"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

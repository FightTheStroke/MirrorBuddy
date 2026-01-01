'use client';

/**
 * Summary Editor Component
 *
 * Block-based editor for creating and editing structured summaries.
 * Supports sections with titles and key points.
 *
 * Part of Issue #70: Real-time summary tool
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SummarySection } from '@/types/tools';

// ============================================================================
// TYPES
// ============================================================================

export interface SummaryEditorProps {
  /** Summary title */
  title: string;
  /** Summary sections */
  sections: SummarySection[];
  /** Callback when title changes */
  onTitleChange?: (title: string) => void;
  /** Callback when sections change */
  onSectionsChange?: (sections: SummarySection[]) => void;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface EditState {
  type: 'title' | 'section-title' | 'section-content' | 'point';
  sectionIndex?: number;
  pointIndex?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SummaryEditor({
  title,
  sections,
  onTitleChange,
  onSectionsChange,
  readOnly = false,
  className,
}: SummaryEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections.map((_, i) => i))
  );
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Focus input when edit state changes
  useEffect(() => {
    if (editState && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [editState]);

  // Toggle section expansion
  const toggleSection = useCallback((index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Start editing
  const startEdit = useCallback(
    (state: EditState, currentValue: string) => {
      if (readOnly) return;
      setEditState(state);
      setEditValue(currentValue);
    },
    [readOnly]
  );

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditState(null);
    setEditValue('');
  }, []);

  // Save edit
  const saveEdit = useCallback(() => {
    if (!editState || !editValue.trim()) {
      cancelEdit();
      return;
    }

    switch (editState.type) {
      case 'title':
        onTitleChange?.(editValue.trim());
        break;

      case 'section-title':
        if (editState.sectionIndex !== undefined) {
          const updated = sections.map((s, i) =>
            i === editState.sectionIndex ? { ...s, title: editValue.trim() } : s
          );
          onSectionsChange?.(updated);
        }
        break;

      case 'section-content':
        if (editState.sectionIndex !== undefined) {
          const updated = sections.map((s, i) =>
            i === editState.sectionIndex ? { ...s, content: editValue.trim() } : s
          );
          onSectionsChange?.(updated);
        }
        break;

      case 'point':
        if (
          editState.sectionIndex !== undefined &&
          editState.pointIndex !== undefined
        ) {
          const updated = sections.map((s, i) => {
            if (i === editState.sectionIndex) {
              const keyPoints = [...(s.keyPoints || [])];
              keyPoints[editState.pointIndex!] = editValue.trim();
              return { ...s, keyPoints };
            }
            return s;
          });
          onSectionsChange?.(updated);
        }
        break;
    }

    cancelEdit();
  }, [editState, editValue, sections, onTitleChange, onSectionsChange, cancelEdit]);

  // Handle key down in edit mode
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit]
  );

  // Add new section
  const addSection = useCallback(() => {
    const newSection: SummarySection = {
      title: 'Nuova sezione',
      content: '',
      keyPoints: [],
    };
    const updated = [...sections, newSection];
    onSectionsChange?.(updated);
    setExpandedSections((prev) => new Set([...prev, updated.length - 1]));
  }, [sections, onSectionsChange]);

  // Delete section
  const deleteSection = useCallback(
    (index: number) => {
      const updated = sections.filter((_, i) => i !== index);
      onSectionsChange?.(updated);
      setExpandedSections((prev) => {
        const next = new Set<number>();
        prev.forEach((i) => {
          if (i < index) next.add(i);
          else if (i > index) next.add(i - 1);
        });
        return next;
      });
    },
    [sections, onSectionsChange]
  );

  // Add key point to section
  const addKeyPoint = useCallback(
    (sectionIndex: number) => {
      const updated = sections.map((s, i) => {
        if (i === sectionIndex) {
          return {
            ...s,
            keyPoints: [...(s.keyPoints || []), 'Nuovo punto'],
          };
        }
        return s;
      });
      onSectionsChange?.(updated);
    },
    [sections, onSectionsChange]
  );

  // Delete key point
  const deleteKeyPoint = useCallback(
    (sectionIndex: number, pointIndex: number) => {
      const updated = sections.map((s, i) => {
        if (i === sectionIndex) {
          const keyPoints = (s.keyPoints || []).filter((_, pi) => pi !== pointIndex);
          return { ...s, keyPoints };
        }
        return s;
      });
      onSectionsChange?.(updated);
    },
    [sections, onSectionsChange]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Title */}
      <div className="flex items-center gap-2 group">
        {editState?.type === 'title' ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveEdit}
              className="flex-1 px-3 py-2 text-xl font-bold rounded-md border border-primary bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Titolo del riassunto"
            />
            <Button variant="ghost" size="icon" onClick={saveEdit} aria-label="Salva">
              <Check className="w-4 h-4 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={cancelEdit} aria-label="Annulla">
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
              onClick={() => startEdit({ type: 'title' }, title)}
            >
              {title}
            </h2>
            {!readOnly && (
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => startEdit({ type: 'title' }, title)}
                aria-label="Modifica titolo"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Sections */}
      <AnimatePresence mode="popLayout">
        {sections.map((section, sectionIndex) => {
          const isExpanded = expandedSections.has(sectionIndex);

          return (
            <motion.div
              key={sectionIndex}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
            >
              {/* Section Header */}
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50',
                  'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                )}
                onClick={() => toggleSection(sectionIndex)}
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

                {editState?.type === 'section-title' &&
                editState.sectionIndex === sectionIndex ? (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={saveEdit}
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
                        startEdit(
                          { type: 'section-title', sectionIndex },
                          section.title
                        );
                      }
                    }}
                  >
                    {section.title}
                  </span>
                )}

                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSection(sectionIndex);
                    }}
                    aria-label="Elimina sezione"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>

              {/* Section Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 py-3 space-y-3"
                  >
                    {/* Section Description/Content */}
                    {editState?.type === 'section-content' &&
                    editState.sectionIndex === sectionIndex ? (
                      <textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        onBlur={saveEdit}
                        rows={3}
                        className="w-full px-3 py-2 rounded-md border border-primary bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        aria-label="Contenuto della sezione"
                      />
                    ) : (
                      <p
                        className={cn(
                          'text-slate-600 dark:text-slate-300',
                          !readOnly && 'cursor-pointer hover:text-slate-900 dark:hover:text-white',
                          !section.content && 'text-slate-400 italic'
                        )}
                        onClick={() =>
                          !readOnly &&
                          startEdit(
                            { type: 'section-content', sectionIndex },
                            section.content || ''
                          )
                        }
                      >
                        {section.content || 'Clicca per aggiungere contenuto...'}
                      </p>
                    )}

                    {/* Key Points */}
                    {(section.keyPoints?.length ?? 0) > 0 && (
                      <ul className="space-y-2">
                        {section.keyPoints?.map((point, pointIndex) => (
                          <li
                            key={pointIndex}
                            className="flex items-start gap-2 group/point"
                          >
                            <span className="w-1.5 h-1.5 mt-2 rounded-full bg-primary shrink-0" />
                            {editState?.type === 'point' &&
                            editState.sectionIndex === sectionIndex &&
                            editState.pointIndex === pointIndex ? (
                              <input
                                ref={inputRef as React.RefObject<HTMLInputElement>}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={saveEdit}
                                className="flex-1 px-2 py-1 rounded border border-primary bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                aria-label="Punto chiave"
                              />
                            ) : (
                              <span
                                className={cn(
                                  'flex-1 text-sm text-slate-600 dark:text-slate-300',
                                  !readOnly && 'cursor-pointer hover:text-slate-900 dark:hover:text-white'
                                )}
                                onClick={() =>
                                  !readOnly &&
                                  startEdit(
                                    { type: 'point', sectionIndex, pointIndex },
                                    point
                                  )
                                }
                              >
                                {point}
                              </span>
                            )}
                            {!readOnly && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover/point:opacity-100 transition-opacity"
                                onClick={() => deleteKeyPoint(sectionIndex, pointIndex)}
                                aria-label="Elimina punto"
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
                        onClick={() => addKeyPoint(sectionIndex)}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Aggiungi punto</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Add Section Button */}
      {!readOnly && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={addSection}
        >
          <Plus className="w-4 h-4" />
          Nuova sezione
        </Button>
      )}
    </div>
  );
}

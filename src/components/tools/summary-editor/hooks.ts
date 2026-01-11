/**
 * Custom hooks for Summary Editor state management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SummarySection } from '@/types/tools';
import type { EditState } from './types';

/**
 * Manage expanded/collapsed sections state
 */
export function useExpandedSections(sections: SummarySection[]) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections.map((_: SummarySection, i: number) => i))
  );

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

  return { expandedSections, setExpandedSections, toggleSection };
}

/**
 * Manage edit mode state and input focus
 */
export function useEditState() {
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

  const startEdit = useCallback(
    (state: EditState, currentValue: string, readOnly?: boolean) => {
      if (readOnly) return;
      setEditState(state);
      setEditValue(currentValue);
    },
    []
  );

  const cancelEdit = useCallback(() => {
    setEditState(null);
    setEditValue('');
  }, []);

  return {
    editState,
    setEditState,
    editValue,
    setEditValue,
    inputRef,
    startEdit,
    cancelEdit,
  };
}

/**
 * Manage section operations (add, delete, add point, delete point)
 */
export function useSectionOperations(
  sections: SummarySection[],
  onSectionsChange?: (sections: SummarySection[]) => void,
  setExpandedSections?: (fn: (prev: Set<number>) => Set<number>) => void
) {
  const addSection = useCallback(() => {
    const newSection: SummarySection = {
      title: 'Nuova sezione',
      content: '',
      keyPoints: [],
    };
    const updated = [...sections, newSection];
    onSectionsChange?.(updated);
    setExpandedSections?.((prev) => new Set([...prev, updated.length - 1]));
  }, [sections, onSectionsChange, setExpandedSections]);

  const deleteSection = useCallback(
    (index: number) => {
      const updated = sections.filter((_, i) => i !== index);
      onSectionsChange?.(updated);
      setExpandedSections?.((prev) => {
        const next = new Set<number>();
        prev.forEach((i) => {
          if (i < index) next.add(i);
          else if (i > index) next.add(i - 1);
        });
        return next;
      });
    },
    [sections, onSectionsChange, setExpandedSections]
  );

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

  return { addSection, deleteSection, addKeyPoint, deleteKeyPoint };
}

/**
 * Handle edit save operations
 */
export function useSaveEdit(
  sections: SummarySection[],
  onTitleChange?: (title: string) => void,
  onSectionsChange?: (sections: SummarySection[]) => void
) {
  const saveEdit = useCallback(
    (editState: EditState | null, editValue: string, cancelEdit: () => void) => {
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
            const updated = sections.map((s: SummarySection, i: number) =>
              i === editState.sectionIndex ? { ...s, title: editValue.trim() } : s
            );
            onSectionsChange?.(updated);
          }
          break;

        case 'section-content':
          if (editState.sectionIndex !== undefined) {
            const updated = sections.map((s: SummarySection, i: number) =>
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
            const updated = sections.map((s: SummarySection, i: number) => {
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
    },
    [sections, onTitleChange, onSectionsChange]
  );

  return { saveEdit };
}

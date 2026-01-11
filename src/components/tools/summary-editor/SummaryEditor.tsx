'use client';

/**
 * Summary Editor Component
 *
 * Block-based editor for creating and editing structured summaries.
 * Supports sections with titles and key points.
 *
 * Part of Issue #70: Real-time summary tool
 */

import { useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SummaryEditorProps } from './types';
import type { EditState } from './types';
import { TitleEditor } from './components/TitleEditor';
import { SectionItem } from './components/SectionItem';
import {
  useExpandedSections,
  useEditState,
  useSectionOperations,
  useSaveEdit,
} from './hooks';

export type { SummaryEditorProps } from './types';

export function SummaryEditor({
  title,
  sections,
  onTitleChange,
  onSectionsChange,
  readOnly = false,
  className,
}: SummaryEditorProps) {
  // Manage expanded sections
  const { expandedSections, toggleSection, setExpandedSections } =
    useExpandedSections(sections);

  // Manage edit state
  const {
    editState,
    setEditState,
    editValue,
    setEditValue,
    inputRef,
    cancelEdit,
  } = useEditState();

  // Manage section operations
  const { addSection, deleteSection, addKeyPoint, deleteKeyPoint } =
    useSectionOperations(sections, onSectionsChange, setExpandedSections);

  // Handle save edit
  const { saveEdit: saveEditBase } = useSaveEdit(
    sections,
    onTitleChange,
    onSectionsChange
  );

  // Wrapper for startEdit to include readOnly check
  const startEdit = useCallback(
    (state: EditState, currentValue: string) => {
      if (readOnly) return;
      setEditState(state);
      setEditValue(currentValue);
    },
    [readOnly, setEditState, setEditValue]
  );

  // Wrapper for saveEdit
  const saveEdit = useCallback(() => {
    saveEditBase(editState, editValue, cancelEdit);
  }, [editState, editValue, cancelEdit, saveEditBase]);

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

  const isTitleEditing = editState?.type === 'title';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Title */}
      <TitleEditor
        title={title}
        isEditing={isTitleEditing}
        editValue={editValue}
        inputRef={inputRef}
        readOnly={readOnly}
        onStartEdit={startEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEdit}
        onEditValueChange={setEditValue}
        onKeyDown={handleKeyDown}
      />

      {/* Sections */}
      <AnimatePresence mode="popLayout">
        {sections.map((section, sectionIndex) => {
          const isExpanded = expandedSections.has(sectionIndex);

          return (
            <SectionItem
              key={sectionIndex}
              section={section}
              sectionIndex={sectionIndex}
              isExpanded={isExpanded}
              editState={editState}
              editValue={editValue}
              inputRef={inputRef}
              readOnly={readOnly}
              onToggle={() => toggleSection(sectionIndex)}
              onStartEdit={startEdit}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              onEditValueChange={setEditValue}
              onDeleteSection={() => deleteSection(sectionIndex)}
              onAddKeyPoint={() => addKeyPoint(sectionIndex)}
              onDeleteKeyPoint={(pointIndex) =>
                deleteKeyPoint(sectionIndex, pointIndex)
              }
              onKeyDown={handleKeyDown}
            />
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

'use client';

/**
 * Section Item Component
 *
 * Renders a single section with collapsible header and content.
 * Composes SectionHeader and SectionContent components.
 */

import { motion } from 'framer-motion';
import type { SummarySection } from '@/types/tools';
import type { EditState } from '../types';
import { SectionHeader } from './SectionHeader';
import { SectionContent } from './SectionContent';

interface SectionItemProps {
  section: SummarySection;
  sectionIndex: number;
  isExpanded: boolean;
  editState: EditState | null;
  editValue: string;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  readOnly?: boolean;
  onToggle: () => void;
  onStartEdit: (state: EditState, value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onDeleteSection: () => void;
  onAddKeyPoint: () => void;
  onDeleteKeyPoint: (pointIndex: number) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function SectionItem({
  section,
  sectionIndex,
  isExpanded,
  editState,
  editValue,
  inputRef,
  readOnly,
  onToggle,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onDeleteSection,
  onAddKeyPoint,
  onDeleteKeyPoint,
  onKeyDown,
}: SectionItemProps) {
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
      <SectionHeader
        sectionIndex={sectionIndex}
        title={section.title}
        isExpanded={isExpanded}
        editState={editState}
        editValue={editValue}
        inputRef={inputRef}
        readOnly={readOnly}
        onToggle={onToggle}
        onStartEdit={onStartEdit}
        onSaveEdit={onSaveEdit}
        onEditValueChange={onEditValueChange}
        onDeleteSection={onDeleteSection}
        onKeyDown={onKeyDown}
      />

      {/* Section Content */}
      <SectionContent
        section={section}
        sectionIndex={sectionIndex}
        isExpanded={isExpanded}
        editState={editState}
        editValue={editValue}
        inputRef={inputRef}
        readOnly={readOnly}
        onStartEdit={onStartEdit}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onEditValueChange={onEditValueChange}
        onAddKeyPoint={onAddKeyPoint}
        onDeleteKeyPoint={onDeleteKeyPoint}
        onKeyDown={onKeyDown}
      />
    </motion.div>
  );
}

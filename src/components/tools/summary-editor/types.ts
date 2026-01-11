/**
 * Types for Summary Editor
 */

import type { SummarySection } from '@/types/tools';

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

export interface EditState {
  type: 'title' | 'section-title' | 'section-content' | 'point';
  sectionIndex?: number;
  pointIndex?: number;
  value?: string;
}

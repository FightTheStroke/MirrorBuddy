/**
 * Types for Material Card component
 */

import type { ToolType } from '@/types/tools';

export interface Material {
  id: string;
  title: string;
  type: ToolType;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  collectionId?: string | null;
  isFavorite?: boolean;
  isArchived?: boolean;
  thumbnail?: string;
}

export interface MaterialCardProps {
  /** Material data */
  material: Material;
  /** Whether the card is selected */
  isSelected?: boolean;
  /** Callback when selection changes */
  onSelect?: (id: string, selected: boolean) => void;
  /** Callback when favorite is toggled */
  onToggleFavorite?: (id: string) => void;
  /** Callback to open material */
  onOpen?: (id: string) => void;
  /** Callback to delete material */
  onDelete?: (id: string) => void;
  /** Callback to archive material */
  onArchive?: (id: string) => void;
  /** Callback to move material */
  onMove?: (id: string) => void;
  /** Callback to add tags */
  onAddTags?: (id: string) => void;
  /** Callback to find similar materials (Wave 4) */
  onFindSimilar?: (id: string) => void;
  /** Callback to duplicate material */
  onDuplicate?: (id: string) => void;
  /** Drag start callback for reordering */
  onDragStart?: (id: string) => void;
  /** Drag end callback */
  onDragEnd?: () => void;
  /** Keyboard move callback (for accessibility) */
  onKeyboardMove?: (id: string, direction: 'up' | 'down') => void;
  /** Whether drag is enabled */
  isDraggable?: boolean;
  /** Compact view mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

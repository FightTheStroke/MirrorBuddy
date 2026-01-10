/**
 * Type definitions for Archive components
 */

import type { MaterialRecord } from '@/lib/storage/materials-db-utils';

export interface ArchiveItem extends MaterialRecord {
  title?: string;
}

export interface ArchiveItemViewProps {
  items: ArchiveItem[];
  onDelete: (id: string) => void;
  onView: (item: ArchiveItem) => void;
  onBookmark: (id: string, bookmarked: boolean) => void;
  onRate: (id: string, rating: number) => void;
}

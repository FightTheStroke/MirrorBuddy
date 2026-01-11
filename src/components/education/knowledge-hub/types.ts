/**
 * Knowledge Hub Type Definitions
 */

import type { Collection } from './components/sidebar-navigation';
import type { KnowledgeHubMaterial } from './views';

export interface KnowledgeHubPropsInternal {
  /** Initial materials data */
  materials?: KnowledgeHubMaterial[];
  /** Initial collections data */
  collections?: Collection[];
  /** Callback when material is opened */
  onOpenMaterial?: (material: KnowledgeHubMaterial) => void;
  /** Callback when materials are deleted */
  onDeleteMaterials?: (ids: string[]) => Promise<void>;
  /** Callback when materials are moved */
  onMoveMaterials?: (ids: string[], collectionId: string | null) => Promise<void>;
  /** Callback when collection is created */
  onCreateCollection?: (name: string, parentId?: string | null) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

// Re-export external types
export type { ViewMode, ViewOption, KnowledgeHubProps } from './knowledge-hub/types';
export type { Collection } from './components/sidebar-navigation';
export type { KnowledgeHubMaterial } from './views';

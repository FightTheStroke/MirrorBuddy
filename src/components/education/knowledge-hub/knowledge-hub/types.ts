/**
 * Types for Knowledge Hub
 */

export type ViewMode = 'explorer' | 'gallery' | 'timeline' | 'calendar';

export interface ViewOption {
  id: ViewMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}

import type { KnowledgeHubMaterial } from '../views';
import type { Collection } from '../components/sidebar-navigation';

export interface KnowledgeHubProps {
  initialView?: ViewMode;
  initialCollection?: string;
  onMaterialSelect?: (materialId: string) => void;
  materials?: KnowledgeHubMaterial[];
  collections?: Collection[];
  onOpenMaterial?: (material: KnowledgeHubMaterial) => void;
  onDeleteMaterials?: (materialIds: string[]) => Promise<void>;
  onMoveMaterials?: (materialIds: string[], collectionId: string | null) => Promise<void>;
  onCreateCollection?: (name: string, parentId?: string | null) => Promise<void>;
  className?: string;
}

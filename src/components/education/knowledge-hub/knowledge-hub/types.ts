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

export interface KnowledgeHubProps {
  initialView?: ViewMode;
  initialCollection?: string;
  onMaterialSelect?: (materialId: string) => void;
}

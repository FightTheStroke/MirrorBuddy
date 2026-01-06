/**
 * @file types.ts
 * @brief Types for mindmaps view
 */

export interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
  icon?: string;
  color?: string;
}


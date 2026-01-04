// Node structure for programmatic mindmap creation
export interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
  icon?: string;
  color?: string;
}

// Props can accept either markdown string OR structured nodes
export interface MarkMapRendererProps {
  title: string;
  markdown?: string;
  nodes?: MindmapNode[];
  className?: string;
}

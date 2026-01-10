/**
 * Constants for tool canvas
 */

import React from 'react';
import {
  Network,
  Layers,
  HelpCircle,
  FileText,
  Clock,
  GitBranch,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { ToolType } from '@/lib/realtime/tool-events';

// Tool icons mapping
export const toolIcons: Record<ToolType, LucideIcon> = {
  mindmap: Network,
  flashcards: Layers,
  quiz: HelpCircle,
  summary: FileText,
  timeline: Clock,
  diagram: GitBranch,
  demo: Sparkles,
};

// Helper to render icon (must be used in .tsx files)
export function renderToolIcon(toolType: ToolType, className = 'w-5 h-5'): React.ReactElement {
  const Icon = toolIcons[toolType];
  // eslint-disable-next-line react/react-in-jsx-scope
  return React.createElement(Icon, { className });
}

// Tool display names
export const toolNames: Record<ToolType, string> = {
  mindmap: 'Mappa Mentale',
  flashcards: 'Flashcard',
  quiz: 'Quiz',
  summary: 'Riassunto',
  timeline: 'Linea del Tempo',
  diagram: 'Diagramma',
  demo: 'Demo Interattiva',
};

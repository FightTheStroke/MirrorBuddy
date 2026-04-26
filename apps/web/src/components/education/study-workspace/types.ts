/**
 * Study Workspace Types
 */

import type { Character } from '../character-switcher';
import type { Maestro } from '@/types';

// View modes for the workspace
export type ViewMode = 'conversation' | 'split' | 'canvas';

export interface StudyWorkspaceProps {
  sessionId: string;
  maestri?: Maestro[];
  initialCharacter?: Character;
  className?: string;
}

export interface ToolCanvasPlaceholderProps {
  sessionId: string;
  maestroName: string;
  maestroAvatar: string;
  isActive: boolean;
  onToolStart: () => void;
  onToolComplete: () => void;
}

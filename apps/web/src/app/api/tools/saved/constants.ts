/**
 * Saved tools constants
 */

import type { ToolType } from '@/types/tools';

export const VALID_TOOL_TYPES: ToolType[] = [
  'mindmap',
  'quiz',
  'flashcard',
  'demo',
  'search',
  'diagram',
  'timeline',
  'summary',
  'formula',
  'chart',
  'webcam',
  'pdf',
];

export const VALID_PATCH_ACTIONS = ['rate', 'bookmark', 'view'] as const;
export type PatchAction = (typeof VALID_PATCH_ACTIONS)[number];

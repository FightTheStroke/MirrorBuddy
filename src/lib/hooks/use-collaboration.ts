/**
 * Collaboration hook - Backwards compatible re-export
 * Main implementation split into modular files in use-collaboration/ directory
 */

export { useCollaboration } from './use-collaboration/main';
export type {
  CollaborationState,
  CollaborationActions,
  UseCollaborationOptions,
} from './use-collaboration/types';

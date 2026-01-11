/**
 * Character Router - Barrel file
 * Re-exports all public API for backwards compatibility.
 */

// Types
export type { RoutingResult, RoutingContext } from './types';

// Constants
export { DEFAULT_MAESTRO_BY_SUBJECT } from './constants';

// Selection
export {
  getMaestroForSubject,
  getCoachForStudent,
  getBuddyForStudent,
} from './selection';

// Core routing
export { routeToCharacter } from './routing';

// Convenience
export {
  quickRoute,
  getCharacterGreeting,
  getCharacterSystemPrompt,
  suggestCharacterSwitch,
} from './convenience';

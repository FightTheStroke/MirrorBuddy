/**
 * MirrorBuddy Character Router
 *
 * Routes students to the appropriate character based on:
 * 1. Detected intent (academic, method, emotional)
 * 2. Student preferences (preferred coach/buddy gender)
 * 3. Subject matter (for Maestro selection)
 *
 * This is the orchestration layer of the Support Triangle.
 * Related: #24 MirrorBuddy Issue, ManifestoEdu.md
 *
 * NOTE: This file is a re-export barrel for backwards compatibility.
 * Implementation split into character-router/ directory for maintainability.
 * See character-router/index.ts for the actual implementation.
 */

export type { RoutingResult, RoutingContext } from './character-router/index';
export {
  DEFAULT_MAESTRO_BY_SUBJECT,
  getMaestroForSubject,
  getCoachForStudent,
  getBuddyForStudent,
  routeToCharacter,
  quickRoute,
  getCharacterGreeting,
  getCharacterSystemPrompt,
  suggestCharacterSwitch,
} from './character-router/index';

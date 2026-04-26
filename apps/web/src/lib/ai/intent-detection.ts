/**
 * Intent Detection Module
 * Analyzes student messages to determine their intent and route to appropriate character
 *
 * Detects:
 * - Subject-specific questions → Maestro
 * - Study method help → Coach
 * - Tool requests → Maestro or Coach
 * - Emotional support → Buddy
 * - Technical support → Coach
 * - Crisis situations → Buddy (with adult referral)
 *
 * Related: Issue #16, #24
 */

export { detectIntent, getCharacterTypeLabel, shouldSuggestRedirect } from './intent-detection/routing';
export { detectToolType } from './intent-detection/detectors';
export type { DetectedIntent, CharacterType } from './intent-detection/types';

/**
 * STEM Safety Module
 * Reference: Amodei "The Adolescence of Technology" (2026)
 *
 * Implements Professors' Constitution Article V: Responsible Knowledge
 * Blocks dangerous STEM knowledge while allowing educational content.
 *
 * @example
 * import { checkSTEMSafety } from '@/lib/safety/stem-safety';
 *
 * const userMessage = "come fare la TNT";
 * const result = checkSTEMSafety(userMessage, "curie");
 *
 * if (result.blocked) {
 *   // Return safe response instead of processing message
 *   return result.safeResponse;
 * }
 */

// Types
export type {
  STEMSubject,
  DangerousCategory,
  BlocklistEntry,
  STEMCheckResult,
} from "./types";
export { SAFE_RESPONSES } from "./types";

// Main filter function
export {
  checkSTEMSafety,
  isSTEMProfessor,
  getProfessorSubject,
} from "./stem-filter";

// Individual blocklists (for testing/extension)
export { CHEMISTRY_BLOCKLIST } from "./chemistry-blocklist";
export { PHYSICS_BLOCKLIST } from "./physics-blocklist";
export { BIOLOGY_BLOCKLIST } from "./biology-blocklist";

/**
 * Types for Safety Prompts
 */

export interface SafetyInjectionOptions {
  /** Character role: determines additional context */
  role: 'maestro' | 'coach' | 'buddy';
  /** Whether to include anti-cheating guidelines (default: true for maestro/coach) */
  includeAntiCheating?: boolean;
  /** Additional character-specific safety notes */
  additionalNotes?: string;
}

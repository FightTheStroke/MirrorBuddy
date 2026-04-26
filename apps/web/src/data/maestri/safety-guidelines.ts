/**
 * Safety and Inclusivity Guidelines for MirrorBuddy Maestri
 * Combined export from core and teaching modules
 *
 * Based on:
 * - UN Disability-Inclusive Language Guidelines
 * - OWASP LLM Security Top 10 2025
 * - OpenAI Teen Safety Measures 2025
 */

import { SAFETY_GUIDELINES_CORE } from './safety-guidelines-core';
import { SAFETY_GUIDELINES_TEACHING } from './safety-guidelines-teaching';

// Combined full guidelines for backward compatibility
export const SAFETY_GUIDELINES: string =
  SAFETY_GUIDELINES_CORE + '\n\n---\n' + SAFETY_GUIDELINES_TEACHING;

// Re-export individual parts for modular use
export { SAFETY_GUIDELINES_CORE, SAFETY_GUIDELINES_TEACHING };

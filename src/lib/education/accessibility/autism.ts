/**
 * @file autism.ts
 * @brief Autism support functions (AU01-06)
 */

import type { AccessibilityProfile } from './types';
import { Severity } from './types';

/**
 * Check if metaphors should be avoided
 * AU01: Literal language for autism
 */
export function shouldAvoidMetaphors(profile: AccessibilityProfile): boolean {
  return profile.autism && profile.autismSeverity >= Severity.MODERATE;
}

/**
 * Detect if text contains common metaphors
 * AU02: Flag potentially confusing language
 */
export function containsMetaphors(text: string): boolean {
  const metaphorPatterns = [
    /raining cats and dogs/i,
    /piece of cake/i,
    /break the ice/i,
    /spill the beans/i,
    /cost an arm and a leg/i,
    // Italian metaphors
    /in bocca al lupo/i,
    /a occhi chiusi/i,
    /prendere due piccioni con una fava/i,
  ];

  return metaphorPatterns.some(pattern => pattern.test(text));
}

/**
 * Get structure prefix for section type
 * AU03: Clear section markers for predictability
 */
export function getStructurePrefix(sectionType: string): string {
  const prefixes: Record<string, string> = {
    introduction: '📖 Introduzione:',
    explanation: '💡 Spiegazione:',
    example: '✏️ Esempio:',
    exercise: '📝 Esercizio:',
    summary: '📋 Riepilogo:',
    question: '❓ Domanda:',
    answer: '✅ Risposta:',
  };

  return prefixes[sectionType] || `• ${sectionType}:`;
}

/**
 * Generate warning for topic change
 * AU04: Predictability and transition warnings
 */
export function getTopicChangeWarning(oldTopic: string, newTopic: string): string {
  return `⚠️ Cambio di argomento: Ora passiamo da "${oldTopic}" a "${newTopic}".`;
}

/**
 * Check if social pressure should be avoided
 * AU05: No competitive elements for autism
 */
export function shouldAvoidSocialPressure(profile: AccessibilityProfile): boolean {
  return profile.autism && profile.autismSeverity >= Severity.MODERATE;
}

/**
 * Check if motion should be reduced
 * AU06: Reduce animations for sensory sensitivity
 */
export function shouldReduceMotion(profile: AccessibilityProfile): boolean {
  return profile.autism || profile.reduceMotion;
}


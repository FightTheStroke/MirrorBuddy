/**
 * T1.10 (D-10): age-based prompt adaptation for the voice session.
 *
 * Extracted as a pure function (mirrors adaptive-vad.ts's pattern) so the
 * onboarding-age → instruction-text integration point is directly testable,
 * without needing to render the full useSendSessionConfig hook.
 */

import { getAgeGatePrompt } from '@/lib/safety';

/**
 * Build the age-adapted instruction block to append to the voice system
 * prompt. Returns an empty string when there is no age on record (anonymous
 * Trial sessions, or a profile that skipped this field) — never blocks
 * session setup.
 */
export function buildAgeGateInstruction(age: number | undefined | null): string {
  if (!age) return '';
  return `\n${getAgeGatePrompt(age)}\n`;
}

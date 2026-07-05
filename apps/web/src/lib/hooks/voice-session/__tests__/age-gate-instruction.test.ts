/**
 * T1.10 (D-10) — the onboarding-age → voice-instruction integration point.
 * Tests use buildAgeGateInstruction directly, mirroring the pattern in
 * session-config-vad.test.ts: session-config.ts reads
 * useOnboardingStore.getState().data.age and passes it here.
 */

import { describe, it, expect } from 'vitest';
import { buildAgeGateInstruction } from '../age-gate-instruction';

describe('buildAgeGateInstruction', () => {
  it('returns an empty string when there is no age on record (anonymous/Trial)', () => {
    expect(buildAgeGateInstruction(undefined)).toBe('');
    expect(buildAgeGateInstruction(null)).toBe('');
  });

  it('returns age-adapted guidance when a real age is on record', () => {
    const instruction = buildAgeGateInstruction(8);
    expect(instruction).toContain('8 ANNI');
  });

  it('the same call produces different instructions for different ages', () => {
    const childInstruction = buildAgeGateInstruction(7);
    const teenInstruction = buildAgeGateInstruction(17);

    expect(childInstruction).not.toBe(teenInstruction);
    expect(childInstruction).toContain('7 ANNI');
    expect(teenInstruction).toContain('17 ANNI');
  });
});

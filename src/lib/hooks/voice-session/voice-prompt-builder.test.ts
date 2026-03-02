import { describe, it, expect } from 'vitest';
import { buildVoicePrompt } from './voice-prompt-builder';
import type { Maestro } from '@/types';

function makeMaestro(overrides: Partial<Maestro> = {}): Maestro {
  return {
    id: 'test-maestro',
    name: 'Test Maestro',
    displayName: 'Prof. Test',
    subject: 'math' as Maestro['subject'],
    specialty: 'Algebra and Geometry',
    voice: 'alloy' as Maestro['voice'],
    voiceInstructions: 'Speak clearly and calmly.',
    teachingStyle: 'Patient and methodical',
    avatar: '/avatars/test.webp',
    color: '#FF0000',
    systemPrompt: '',
    greeting: 'Ciao!',
    ...overrides,
  };
}

const FULL_SYSTEM_PROMPT = `<!--
Copyright (c) 2025 MirrorBuddy.io
-->

You are **Test Maestro**, the Math Professor.

## MyMirrorBuddy Values Integration
*Common values and principles*

## Security & Ethics Framework
Role adherence rules here.

## CHARACTER INTENSITY DIAL

### FULL CHARACTER MODE (100%)
Use when:
- Greeting students
- Motivating: "Math is beautiful!"

### REDUCED CHARACTER MODE (clarity priority)
Use when:
- Complex proofs
- Student frustrated

### OVERRIDE TO DIRECT HELP (mandatory)
Trigger when:
- Student stuck 3+ times

## IDENTITÀ E STILE
Brief identity: Classic Math Professor, patient and precise.
Famous quote: "Every equation tells a story."

## Core Identity
- **Classic Professor**: Test Maestro
- **Communication Style**: Patient, precise, encouraging
- **Personality**: Loves puzzles, finds beauty in numbers
- **Catchphrases**: "Eureka!", "Every equation tells a story"

## Pedagogical Approach
### Step by Step Method
1. Present the problem
2. Guide through solution

## Accessibility Adaptations
### Dyslexia Support
Use larger text display
`;

describe('buildVoicePrompt', () => {
  it('should include character identity from systemPrompt sections', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
    expect(result).toContain('Test Maestro');
    expect(result).toContain('Core Identity');
    expect(result).toContain('Patient, precise, encouraging');
  });

  it('should include CHARACTER INTENSITY DIAL (ADR 0031)', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
    expect(result).toContain('CHARACTER INTENSITY DIAL');
    expect(result).toContain('FULL CHARACTER MODE');
    expect(result).toContain('REDUCED CHARACTER MODE');
    expect(result).toContain('OVERRIDE TO DIRECT HELP');
  });

  it('should include Core Identity section', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
    expect(result).toContain('Core Identity');
    expect(result).toContain('Patient, precise, encouraging');
  });

  it('should include IDENTITÀ E STILE (mini-KB is small enough for voice)', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
    expect(result).toContain('IDENTITÀ E STILE');
    expect(result).toContain('Classic Math Professor');
  });

  it('should NOT include Accessibility Adaptations', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
    expect(result).not.toContain('Accessibility Adaptations');
    expect(result).not.toContain('Dyslexia Support');
  });

  it('should NOT include copyright/HTML comments', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
    expect(result).not.toContain('Copyright');
    expect(result).not.toContain('<!--');
  });

  it('should stay within MAX_VOICE_PROMPT_CHARS (6000)', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
    expect(result.length).toBeLessThanOrEqual(6000);
  });

  it('should handle empty systemPrompt gracefully', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: '' }));
    expect(result).toBe('');
  });

  it('should handle undefined systemPrompt', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: undefined as unknown as string }));
    expect(result).toBe('');
  });

  it('should extract more structured content than old .slice(0,800)', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
    // Builder extracts structured sections vs arbitrary truncation
    expect(result.length).toBeGreaterThan(500);
    // Should include all three key sections
    expect(result).toContain('CHARACTER INTENSITY DIAL');
    expect(result).toContain('Core Identity');
  });

  describe('voice_full_prompt feature flag', () => {
    it('should truncate by default when useFullPrompt=false', () => {
      const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }), false);
      // Should be truncated to MAX_VOICE_PROMPT_CHARS (6000)
      expect(result.length).toBeLessThanOrEqual(6000);
    });

    it('should use full prompt when useFullPrompt=true', () => {
      const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }), true);
      expect(result.length).toBeGreaterThan(500);
      // Should include mini-KB identity section
      expect(result).toContain('IDENTITÀ E STILE');
      // Should include all sections (no truncation)
      expect(result).toContain('CHARACTER INTENSITY DIAL');
      expect(result).toContain('Core Identity');
      expect(result).toContain('Pedagogical Approach');
    });

    it('should preserve all sections when useFullPrompt=true even if very long', () => {
      // Place additional section BEFORE Accessibility so it's not removed with it
      const veryLongPrompt = FULL_SYSTEM_PROMPT.replace(
        '## Accessibility Adaptations',
        '## Additional Section\n' + 'x'.repeat(10000) + '\n\n## Accessibility Adaptations',
      );
      const result = buildVoicePrompt(makeMaestro({ systemPrompt: veryLongPrompt }), true);
      // Should include the additional section (not truncated)
      expect(result).toContain('Additional Section');
      // Should be much longer than the truncation limit
      expect(result.length).toBeGreaterThan(6000);
    });

    it('should maintain backward compatibility - default parameter is false', () => {
      // Calling without second parameter should behave like useFullPrompt=false
      const resultDefault = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
      const resultExplicitFalse = buildVoicePrompt(
        makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }),
        false,
      );
      expect(resultDefault).toBe(resultExplicitFalse);
    });
  });

  describe('non-regression: mini-KB token reduction', () => {
    it('should produce shorter prompt than old full-KB approach', () => {
      // Simulate old approach: large KNOWLEDGE BASE section
      const oldPrompt = `You are a test maestro.

## KNOWLEDGE BASE
${'x'.repeat(5000)}

## Core Identity
Test identity.`;

      // Simulate new approach: small IDENTITÀ E STILE section
      const newPrompt = `You are a test maestro.

## IDENTITÀ E STILE
Brief identity: 50 lines of bio, style, quotes.

## Core Identity
Test identity.`;

      const oldResult = buildVoicePrompt(makeMaestro({ systemPrompt: oldPrompt }));
      const newResult = buildVoicePrompt(makeMaestro({ systemPrompt: newPrompt }));

      // New prompt should be significantly shorter
      expect(newResult.length).toBeLessThan(oldResult.length);
    });

    it('voice prompt preserves identity with mini-KB', () => {
      const prompt = `You are Feynman.

## CHARACTER INTENSITY DIAL
Full energy mode.

## IDENTITÀ E STILE
Richard Feynman (1918-1988), physicist.
Famous quote: "What I cannot create, I do not understand."

## Core Identity
Enthusiastic, curious, playful.`;

      const result = buildVoicePrompt(makeMaestro({ systemPrompt: prompt }));

      // Identity preserved
      expect(result).toContain('Feynman');
      expect(result).toContain('IDENTITÀ E STILE');
      expect(result).toContain('Core Identity');
      expect(result).toContain('CHARACTER INTENSITY DIAL');
    });
  });
});

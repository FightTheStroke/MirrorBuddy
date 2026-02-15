/**
 * Tests for FULL VOICE INSTRUCTION ASSEMBLY (T2-02 + T2-03)
 *
 * Validates complete voice instruction building from character system prompt
 * including safety guardrails integration when voice_full_prompt flag is enabled.
 *
 * Wave: W2-VoiceSafety (Plan 148)
 */
import { describe, it, expect, vi } from 'vitest';
import { buildVoicePrompt } from '../voice-prompt-builder';
import { injectSafetyGuardrails } from '@/lib/safety';
import type { Maestro } from '@/types';

// Mock feature flags
vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (flag: string) => ({
    enabled: flag === 'voice_full_prompt',
  }),
}));

function makeMaestro(overrides: Partial<Maestro> = {}): Maestro {
  return {
    id: 'socrate',
    name: 'Socrate',
    displayName: 'Socrate',
    subject: 'philosophy' as Maestro['subject'],
    specialty: 'Filosofia',
    voice: 'echo' as Maestro['voice'],
    voiceInstructions: 'Use Socratic method',
    teachingStyle: 'Maieutico',
    avatar: '/avatars/socrate.webp',
    color: '#8B4513',
    systemPrompt: '',
    greeting: 'Ciao, giovane filosofo!',
    ...overrides,
  };
}

const COMPLETE_SYSTEM_PROMPT = `<!--
Copyright (c) 2025 MirrorBuddy.io
-->

You are **Socrate**, the Philosophy Professor.

## MyMirrorBuddy Values Integration
*Common values and principles*

## Security & Ethics Framework
Role adherence rules here.

## CHARACTER INTENSITY DIAL

### FULL CHARACTER MODE (100%)
Use when:
- Greeting students
- Student is curious and engaged

### REDUCED CHARACTER MODE (clarity priority)
Use when:
- Complex concept requiring explanation
- Student shows confusion or frustration

### OVERRIDE TO DIRECT HELP (mandatory)
Trigger when:
- Student stuck 3+ times → GIVE THE ANSWER
- Crisis: "non capisco niente"

## KNOWLEDGE BASE
A very long knowledge base content about philosophy.
${'x'.repeat(8000)}

## Core Identity
- **Historical Figure**: Socrates of Athens (470-399 BCE)
- **Teaching Method**: Maieutics - the art of midwifery for ideas
- **Communication Style**: Questions that provoke reflection
- **Personality**: Humble, curious, persistent

## Pedagogical Approach
### The Socratic Method
1. Elicit the student's current understanding
2. Challenge with counterexamples
3. Guide towards deeper insight

## Accessibility Adaptations
### Dyslexia Support
Use larger text display
### ADHD Support
Break concepts into smaller chunks
`;

describe('Full Voice Instruction Assembly (T2-02)', () => {
  describe('Complete Character System Prompt Assembly', () => {
    it('should include character identity section (name, subject, specialty, style)', () => {
      const maestro = makeMaestro({
        systemPrompt: COMPLETE_SYSTEM_PROMPT,
        name: 'Socrate',
        subject: 'philosophy',
        specialty: 'Filosofia',
        teachingStyle: 'Maieutico',
      });
      const result = buildVoicePrompt(maestro, true);

      // Verify character identity is included
      expect(result).toContain('Socrate');
      expect(result).toContain('Philosophy');
    });

    it('should include COMPLETE core identity section', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const result = buildVoicePrompt(maestro, true);

      // Verify all core identity elements are present
      expect(result).toContain('Core Identity');
      expect(result).toContain('Socrates of Athens');
      expect(result).toContain('Maieutics');
      expect(result).toContain('Questions that provoke reflection');
      expect(result).toContain('Humble, curious, persistent');
    });

    it('should include COMPLETE teaching methodology section', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const result = buildVoicePrompt(maestro, true);

      // Verify pedagogical approach is complete
      expect(result).toContain('Pedagogical Approach');
      expect(result).toContain('Socratic Method');
      expect(result).toContain("Elicit the student's current understanding");
      expect(result).toContain('Challenge with counterexamples');
      expect(result).toContain('Guide towards deeper insight');
    });

    it('should include COMPLETE character intensity dial (ADR 0031)', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const result = buildVoicePrompt(maestro, true);

      // Verify all three intensity modes are present
      expect(result).toContain('CHARACTER INTENSITY DIAL');
      expect(result).toContain('FULL CHARACTER MODE');
      expect(result).toContain('REDUCED CHARACTER MODE');
      expect(result).toContain('OVERRIDE TO DIRECT HELP');

      // Verify specific triggers are included
      expect(result).toContain('Greeting students');
      expect(result).toContain('Student stuck 3+ times');
    });

    it('should exclude KNOWLEDGE BASE section (handled by RAG)', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const result = buildVoicePrompt(maestro, true);

      // Knowledge base should always be removed (too large for voice)
      expect(result).not.toContain('KNOWLEDGE BASE');
      expect(result).not.toContain('xxxxx');
    });

    it('should exclude Accessibility Adaptations (visual-only)', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const result = buildVoicePrompt(maestro, true);

      // Accessibility adaptations are for visual UI, not voice
      expect(result).not.toContain('Accessibility Adaptations');
      expect(result).not.toContain('Dyslexia Support');
      expect(result).not.toContain('ADHD Support');
    });

    it('should NOT truncate when useFullPrompt=true', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const result = buildVoicePrompt(maestro, true);

      // Should include ALL sections (minus KB and Accessibility)
      // No arbitrary truncation at 6000 chars
      expect(result).toContain('Core Identity');
      expect(result).toContain('Pedagogical Approach');
      expect(result).toContain('CHARACTER INTENSITY DIAL');
      expect(result).toContain('MyMirrorBuddy Values');
    });

    it('should sanitize HTML comments for voice', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const result = buildVoicePrompt(maestro, true);

      // HTML comments should be removed
      expect(result).not.toContain('<!--');
      expect(result).not.toContain('Copyright');
    });
  });

  describe('Voice-Optimized Structure', () => {
    it('should be structured for voice (clear, no HTML, no markdown links)', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const result = buildVoicePrompt(maestro, true);

      // Voice should not have markdown links
      expect(result).not.toContain('[CommonValuesAndPrinciples.md]');
      expect(result).not.toContain('](../');
    });

    it('should preserve section structure with ## headers', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const result = buildVoicePrompt(maestro, true);

      // Section headers should be preserved for structure
      expect(result).toMatch(/##\s+Core Identity/);
      expect(result).toMatch(/##\s+CHARACTER INTENSITY DIAL/);
      expect(result).toMatch(/##\s+Pedagogical Approach/);
    });

    it('should remove excessive newlines for voice efficiency', () => {
      const promptWithExcessiveNewlines = COMPLETE_SYSTEM_PROMPT.replace(/\n/g, '\n\n\n');
      const maestro = makeMaestro({ systemPrompt: promptWithExcessiveNewlines });
      const result = buildVoicePrompt(maestro, true);

      // Should collapse 3+ newlines to 2
      expect(result).not.toMatch(/\n\n\n/);
    });
  });
});

describe('Safety Guardrails Integration (T2-03)', () => {
  describe('injectSafetyGuardrails for Voice Context', () => {
    it('should inject safety guardrails into voice prompt', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const voicePrompt = buildVoicePrompt(maestro, true);

      // Apply safety guardrails as would be done in session-config
      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      // Verify safety sections are present
      expect(safePrompt).toContain('REGOLE DI SICUREZZA NON NEGOZIABILI');
      expect(safePrompt).toContain('CONTENUTI PROIBITI');
      expect(safePrompt).toContain('PROTEZIONE PRIVACY');
      expect(safePrompt).toContain('PROMPT INJECTION');
    });

    it('should include anti-influenza guidelines for maestro role', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const voicePrompt = buildVoicePrompt(maestro, true);

      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      // Amodei safety enhancements should be included
      expect(safePrompt).toContain('ANTI-INFLUENZA');
      expect(safePrompt).toContain('HUMAN FIRST');
    });

    it('should include gamification XP system guidelines', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const voicePrompt = buildVoicePrompt(maestro, true);

      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      // Gamification section should be included
      expect(safePrompt).toContain('SISTEMA DI GAMIFICAZIONE');
      expect(safePrompt).toContain('Ottimo! Hai appena guadagnato 10 XP');
    });

    it('should include crisis response guidelines', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const voicePrompt = buildVoicePrompt(maestro, true);

      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      // Crisis handling should be included
      expect(safePrompt).toContain('SUPPORTO EMOTIVO SICURO');
      expect(safePrompt).toContain('Segnali di Disagio');
    });

    it('should preserve character prompt after safety guardrails', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });
      const voicePrompt = buildVoicePrompt(maestro, true);

      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      // Character identity should still be present after injection
      expect(safePrompt).toContain('Socrate');
      expect(safePrompt).toContain('Core Identity');
      expect(safePrompt).toContain('CHARACTER INTENSITY DIAL');
    });

    it('should apply formal address for pre-1900 professors (ADR 0064)', () => {
      // Socrate (470-399 BCE) should get formal address
      const maestro = makeMaestro({
        systemPrompt: COMPLETE_SYSTEM_PROMPT,
        id: 'socrate',
      });
      const voicePrompt = buildVoicePrompt(maestro, true);

      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      // Should include formal address section
      expect(safePrompt).toMatch(/Lei|forma formale|rispetto formale/i);
    });

    it('should apply informal address for modern professors', () => {
      // Feynman (modern professor) should get informal address
      const maestro = makeMaestro({
        systemPrompt: COMPLETE_SYSTEM_PROMPT,
        id: 'feynman',
      });
      const voicePrompt = buildVoicePrompt(maestro, true);

      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'feynman',
      });

      // Should explicitly allow "tu"
      expect(safePrompt).toMatch(/puoi usare "tu"|informale/i);
    });
  });

  describe('Integration with voice_full_prompt Flag', () => {
    it('should combine full prompt + safety when flag is enabled', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });

      // Build full voice prompt (flag enabled)
      const voicePrompt = buildVoicePrompt(maestro, true);

      // Apply safety guardrails
      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      // Final prompt should have both safety AND full character content
      expect(safePrompt).toContain('REGOLE DI SICUREZZA NON NEGOZIABILI');
      expect(safePrompt).toContain('Core Identity');
      expect(safePrompt).toContain('CHARACTER INTENSITY DIAL');
      expect(safePrompt).toContain('Pedagogical Approach');

      // Should NOT have KB or accessibility
      expect(safePrompt).not.toContain('KNOWLEDGE BASE');
      expect(safePrompt).not.toContain('Accessibility Adaptations');
    });

    it('should work with truncated prompt when flag is disabled', () => {
      const maestro = makeMaestro({ systemPrompt: COMPLETE_SYSTEM_PROMPT });

      // Build truncated voice prompt (flag disabled)
      const voicePrompt = buildVoicePrompt(maestro, false);

      // Apply safety guardrails
      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      // Should still have safety guardrails
      expect(safePrompt).toContain('REGOLE DI SICUREZZA NON NEGOZIABILI');

      // Character content may be truncated (backward compatibility)
      expect(voicePrompt.length).toBeLessThanOrEqual(6000);
    });
  });
});

describe('End-to-End Voice Instruction Assembly', () => {
  it('should produce complete voice instructions ready for Azure Realtime API', () => {
    const maestro = makeMaestro({
      systemPrompt: COMPLETE_SYSTEM_PROMPT,
      id: 'socrate',
      voiceInstructions: 'Use Socratic method. Speak with questioning wisdom.',
    });

    // Step 1: Build voice prompt (full, no truncation)
    const voicePrompt = buildVoicePrompt(maestro, true);

    // Step 2: Inject safety guardrails
    const safePrompt = injectSafetyGuardrails(voicePrompt, {
      role: 'maestro',
      characterId: 'socrate',
    });

    // Final verification: all required sections present
    const requiredSections = [
      'REGOLE DI SICUREZZA NON NEGOZIABILI', // Safety
      'CONTENUTI PROIBITI', // Safety
      'CHARACTER INTENSITY DIAL', // Character
      'Core Identity', // Character
      'Pedagogical Approach', // Character
      'ANTI-INFLUENZA', // Safety
      'HUMAN FIRST', // Safety
    ];

    requiredSections.forEach((section) => {
      expect(safePrompt).toContain(section);
    });

    // Verify excluded sections
    const excludedSections = ['KNOWLEDGE BASE', 'Accessibility Adaptations', '<!--', 'Copyright'];

    excludedSections.forEach((section) => {
      expect(safePrompt).not.toContain(section);
    });
  });

  it('should handle edge case: empty systemPrompt', () => {
    const maestro = makeMaestro({ systemPrompt: '' });

    const voicePrompt = buildVoicePrompt(maestro, true);
    const safePrompt = injectSafetyGuardrails(voicePrompt, {
      role: 'maestro',
      characterId: 'socrate',
    });

    // Should still have safety guardrails
    expect(safePrompt).toContain('REGOLE DI SICUREZZA NON NEGOZIABILI');
    expect(safePrompt.length).toBeGreaterThan(0);
  });

  it('should handle edge case: very long systemPrompt', () => {
    const veryLongPrompt =
      COMPLETE_SYSTEM_PROMPT + '\n\n## Additional Section\n' + 'x'.repeat(20000);
    const maestro = makeMaestro({ systemPrompt: veryLongPrompt });

    const voicePrompt = buildVoicePrompt(maestro, true);
    const safePrompt = injectSafetyGuardrails(voicePrompt, {
      role: 'maestro',
      characterId: 'socrate',
    });

    // Should not crash, should have safety + character content
    expect(safePrompt).toContain('REGOLE DI SICUREZZA NON NEGOZIABILI');
    expect(safePrompt).toContain('Core Identity');
  });
});

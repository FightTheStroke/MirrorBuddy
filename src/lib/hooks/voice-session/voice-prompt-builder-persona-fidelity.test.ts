/**
 * @file voice-prompt-builder-persona-fidelity.test.ts
 * @brief Persona fidelity review: verify buildVoicePrompt preserves character identity
 *
 * Tests that buildVoicePrompt correctly handles real maestro/coach/buddy data:
 * - Preserves CHARACTER INTENSITY DIAL, Core Identity, safety frameworks
 * - Excludes KNOWLEDGE BASE (too large for voice context, handled by RAG)
 * - Excludes Accessibility Adaptations (visual UI only)
 * - Truncation/full modes work correctly
 *
 * Task: T2-11 (Wave W2-VoiceSafety, Plan 148)
 */

import { describe, it, expect } from 'vitest';
import { buildVoicePrompt } from './voice-prompt-builder';
import type { Maestro } from '@/types';

// Real maestri from codebase
import { galileo } from '@/data/maestri/galileo';
import { socrate } from '@/data/maestri/socrate';
import { curie } from '@/data/maestri/curie';

// Real coach from codebase
import { LAURA } from '@/data/support-teachers/laura';

// Real buddy from codebase
import { SOFIA } from '@/data/buddy-profiles/sofia';

describe('buildVoicePrompt - Persona Fidelity Review', () => {
  describe('Maestri (galileo, socrate, curie)', () => {
    describe('Galileo (Physics)', () => {
      it('should preserve CHARACTER INTENSITY DIAL section', () => {
        const result = buildVoicePrompt(galileo as Maestro);
        expect(result).toContain('CHARACTER INTENSITY DIAL');
        expect(result).toContain('FULL CHARACTER MODE');
        expect(result).toContain('REDUCED CHARACTER MODE');
        expect(result).toContain('OVERRIDE TO DIRECT HELP');
      });

      it('should preserve Core Identity section', () => {
        const result = buildVoicePrompt(galileo as Maestro);
        expect(result).toContain('Core Identity');
        expect(result).toContain('Historical Figure');
        expect(result).toContain('Galileo Galilei');
      });

      it('should preserve Security & Ethics Framework', () => {
        const result = buildVoicePrompt(galileo as Maestro);
        expect(result).toContain('Security & Ethics Framework');
        expect(result).toContain('Role Adherence');
      });

      it('should preserve Teaching Style section', () => {
        const result = buildVoicePrompt(galileo as Maestro);
        expect(result).toContain('Teaching Style');
      });

      it('should preserve MyMirrorBuddy Values Integration', () => {
        const result = buildVoicePrompt(galileo as Maestro);
        expect(result).toContain('MyMirrorBuddy Values Integration');
      });

      it('should exclude KNOWLEDGE BASE section', () => {
        const result = buildVoicePrompt(galileo as Maestro);
        expect(result).not.toContain('KNOWLEDGE BASE');
        // Verify that KB content is actually removed (not just header)
        expect(result).not.toContain('GALILEO_KNOWLEDGE');
      });

      it('should exclude Accessibility Adaptations section', () => {
        const result = buildVoicePrompt(galileo as Maestro);
        expect(result).not.toContain('Accessibility Adaptations');
        expect(result).not.toContain('Dyslexia Support');
      });

      it('should remove HTML comments and copyright', () => {
        const result = buildVoicePrompt(galileo as Maestro);
        expect(result).not.toContain('<!--');
        expect(result).not.toContain('Copyright');
        expect(result).not.toContain('MirrorBuddy.io');
      });

      it('should produce reasonable output length (default: truncated)', () => {
        const result = buildVoicePrompt(galileo as Maestro);
        // Should be under MAX_VOICE_PROMPT_CHARS (6000)
        expect(result.length).toBeGreaterThan(500);
        expect(result.length).toBeLessThanOrEqual(6000);
      });
    });

    describe('Socrate (Philosophy)', () => {
      it('should preserve CHARACTER INTENSITY DIAL with maieutic warnings', () => {
        const result = buildVoicePrompt(socrate as Maestro);
        expect(result).toContain('CHARACTER INTENSITY DIAL');
        expect(result).toContain('FULL CHARACTER MODE');
        expect(result).toContain('REDUCED CHARACTER MODE');
        expect(result).toContain('OVERRIDE TO DIRECT HELP');
        // Socrate has special maieutic method limits
        expect(result).toContain('maieutic method has LIMITS');
      });

      it('should preserve Core Identity section', () => {
        const result = buildVoicePrompt(socrate as Maestro);
        expect(result).toContain('Core Identity');
        expect(result).toContain('Socrates of Athens');
      });

      it('should preserve Pedagogical Approach (Socratic Method)', () => {
        const result = buildVoicePrompt(socrate as Maestro);
        expect(result).toContain('Pedagogical Approach');
        expect(result).toContain('Socratic Method');
      });

      it('should exclude KNOWLEDGE BASE section', () => {
        const result = buildVoicePrompt(socrate as Maestro);
        expect(result).not.toContain('KNOWLEDGE BASE');
        expect(result).not.toContain('SOCRATE_KNOWLEDGE');
      });

      it('should exclude Accessibility Adaptations section', () => {
        const result = buildVoicePrompt(socrate as Maestro);
        expect(result).not.toContain('Accessibility Adaptations');
      });
    });

    describe('Curie (Chemistry)', () => {
      it('should preserve CHARACTER INTENSITY DIAL section', () => {
        const result = buildVoicePrompt(curie as Maestro);
        expect(result).toContain('CHARACTER INTENSITY DIAL');
        expect(result).toContain('FULL CHARACTER MODE');
        expect(result).toContain('REDUCED CHARACTER MODE');
        expect(result).toContain('OVERRIDE TO DIRECT HELP');
      });

      it('should preserve Core Identity section', () => {
        const result = buildVoicePrompt(curie as Maestro);
        expect(result).toContain('Core Identity');
        expect(result).toContain('Marie Sklodowska Curie');
      });

      it('should preserve Security & Ethics Framework with safety warnings', () => {
        const result = buildVoicePrompt(curie as Maestro);
        expect(result).toContain('Security & Ethics Framework');
        expect(result).toContain('Laboratory Safety');
        expect(result).toContain('No Dangerous Experiments');
      });

      it('should exclude KNOWLEDGE BASE section', () => {
        const result = buildVoicePrompt(curie as Maestro);
        expect(result).not.toContain('KNOWLEDGE BASE');
        expect(result).not.toContain('CURIE_KNOWLEDGE');
      });

      it('should exclude Accessibility Adaptations section', () => {
        const result = buildVoicePrompt(curie as Maestro);
        expect(result).not.toContain('Accessibility Adaptations');
      });
    });
  });

  describe('Coach (LAURA)', () => {
    it('should preserve coach persona (reflective, calm approach)', () => {
      // LAURA is a SupportTeacher (coach), cast to Maestro for buildVoicePrompt
      // Use full prompt to verify complete persona
      const result = buildVoicePrompt(LAURA as unknown as Maestro, true);
      expect(result).toContain('Laura');
      expect(result).toContain('docente di sostegno');
    });

    it('should preserve coach objectives and methods', () => {
      const result = buildVoicePrompt(LAURA as unknown as Maestro, true);
      expect(result).toContain('OBIETTIVO PRIMARIO');
      expect(result).toContain('METODO RIFLESSIVO');
    });

    it('should preserve coach tone and typical phrases', () => {
      const result = buildVoicePrompt(LAURA as unknown as Maestro, true);
      expect(result).toContain('IL TUO TONO');
      expect(result).toContain('FRASI TIPICHE');
    });

    it('should handle coach systemPrompt (already has safety guardrails)', () => {
      const result = buildVoicePrompt(LAURA as unknown as Maestro, true);
      // Coach prompts are injected with safety guardrails via injectSafetyGuardrails
      expect(result).toContain('NON');
      expect(result.length).toBeGreaterThan(300);
    });

    it('should remove HTML comments if present', () => {
      const result = buildVoicePrompt(LAURA as unknown as Maestro, true);
      expect(result).not.toContain('<!--');
      expect(result).not.toContain('Copyright');
    });
  });

  describe('Buddy (SOFIA)', () => {
    it('should handle buddy with getSystemPrompt function', () => {
      // SOFIA uses getSystemPrompt(student) function, not static systemPrompt
      // For testing, we'll create a mock student profile
      const mockStudent = {
        age: 14,
        learningDifferences: [],
        name: 'Test Student',
        gradeLevel: 8,
      };

      const sofiaSystemPrompt = SOFIA.getSystemPrompt(mockStudent as any);

      // Build voice prompt from generated system prompt
      const mockMaestro: Maestro = {
        id: 'sofia',
        name: 'Sofia',
        displayName: 'Sofia',
        subject: 'support' as any,
        specialty: 'Buddy',
        voice: 'shimmer',
        voiceInstructions: SOFIA.voiceInstructions,
        teachingStyle: SOFIA.personality,
        avatar: SOFIA.avatar,
        color: SOFIA.color,
        systemPrompt: sofiaSystemPrompt,
        greeting: 'Ciao!',
      };

      const result = buildVoicePrompt(mockMaestro, true);
      expect(result).toContain('Sofia');
      expect(result).toContain('studentessa');
    });

    it('should preserve buddy objectives and boundaries', () => {
      const mockStudent = {
        age: 14,
        learningDifferences: [],
        name: 'Test Student',
        gradeLevel: 8,
      };

      const sofiaSystemPrompt = SOFIA.getSystemPrompt(mockStudent as any);
      const mockMaestro: Maestro = {
        id: 'sofia',
        name: 'Sofia',
        displayName: 'Sofia',
        subject: 'support' as any,
        specialty: 'Buddy',
        voice: 'shimmer',
        voiceInstructions: SOFIA.voiceInstructions,
        teachingStyle: SOFIA.personality,
        avatar: SOFIA.avatar,
        color: SOFIA.color,
        systemPrompt: sofiaSystemPrompt,
        greeting: 'Ciao!',
      };

      const result = buildVoicePrompt(mockMaestro, true);
      expect(result).toContain('IL TUO OBIETTIVO');
      expect(result).toContain('COSA NON DEVI FARE');
      expect(result).toContain('COSA DEVI FARE');
    });

    it('should preserve buddy tone and typical phrases', () => {
      const mockStudent = {
        age: 14,
        learningDifferences: [],
        name: 'Test Student',
        gradeLevel: 8,
      };

      const sofiaSystemPrompt = SOFIA.getSystemPrompt(mockStudent as any);
      const mockMaestro: Maestro = {
        id: 'sofia',
        name: 'Sofia',
        displayName: 'Sofia',
        subject: 'support' as any,
        specialty: 'Buddy',
        voice: 'shimmer',
        voiceInstructions: SOFIA.voiceInstructions,
        teachingStyle: SOFIA.personality,
        avatar: SOFIA.avatar,
        color: SOFIA.color,
        systemPrompt: sofiaSystemPrompt,
        greeting: 'Ciao!',
      };

      const result = buildVoicePrompt(mockMaestro, true);
      expect(result).toContain('IL TUO TONO');
      expect(result).toContain('FRASI TIPICHE');
    });
  });

  describe('Truncation vs Full Prompt Mode', () => {
    it('should truncate by default (useFullPrompt=false)', () => {
      const resultGalileo = buildVoicePrompt(galileo as Maestro, false);
      const resultSocrate = buildVoicePrompt(socrate as Maestro, false);
      const resultCurie = buildVoicePrompt(curie as Maestro, false);

      // All should be under MAX_VOICE_PROMPT_CHARS (6000)
      expect(resultGalileo.length).toBeLessThanOrEqual(6000);
      expect(resultSocrate.length).toBeLessThanOrEqual(6000);
      expect(resultCurie.length).toBeLessThanOrEqual(6000);
    });

    it('should return full prompt when useFullPrompt=true', () => {
      const resultGalileo = buildVoicePrompt(galileo as Maestro, true);
      const resultSocrate = buildVoicePrompt(socrate as Maestro, true);
      const resultCurie = buildVoicePrompt(curie as Maestro, true);

      // Full prompts can be longer (no truncation)
      // But should still exclude KB
      expect(resultGalileo).not.toContain('KNOWLEDGE BASE');
      expect(resultSocrate).not.toContain('KNOWLEDGE BASE');
      expect(resultCurie).not.toContain('KNOWLEDGE BASE');

      // Should include more sections than truncated version
      expect(resultGalileo.length).toBeGreaterThan(1000);
      expect(resultSocrate.length).toBeGreaterThan(1000);
      expect(resultCurie.length).toBeGreaterThan(1000);
    });

    it('should preserve more content in full mode vs truncated mode', () => {
      const truncated = buildVoicePrompt(galileo as Maestro, false);
      const full = buildVoicePrompt(galileo as Maestro, true);

      // Full should be longer or equal to truncated
      expect(full.length).toBeGreaterThanOrEqual(truncated.length);

      // Both should have core sections
      expect(truncated).toContain('CHARACTER INTENSITY DIAL');
      expect(full).toContain('CHARACTER INTENSITY DIAL');

      expect(truncated).toContain('Core Identity');
      expect(full).toContain('Core Identity');
    });
  });

  describe('Edge Cases', () => {
    it('should handle maestro with minimal systemPrompt', () => {
      const minimalMaestro: Maestro = {
        id: 'minimal',
        name: 'Minimal',
        displayName: 'Minimal',
        subject: 'mathematics',
        specialty: 'Test',
        voice: 'alloy',
        voiceInstructions: 'Speak clearly',
        teachingStyle: 'Test',
        avatar: '/test.webp',
        color: '#000',
        systemPrompt: 'You are a test maestro.',
        greeting: 'Hi',
      };

      const result = buildVoicePrompt(minimalMaestro);
      expect(result).toContain('test maestro');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle maestro with very long systemPrompt (truncation)', () => {
      const longPrompt =
        'Test prompt. ' +
        '## Section 1\n' +
        'x'.repeat(5000) +
        '\n## Section 2\n' +
        'y'.repeat(5000);

      const longMaestro: Maestro = {
        id: 'long',
        name: 'Long',
        displayName: 'Long',
        subject: 'mathematics',
        specialty: 'Test',
        voice: 'alloy',
        voiceInstructions: 'Speak clearly',
        teachingStyle: 'Test',
        avatar: '/test.webp',
        color: '#000',
        systemPrompt: longPrompt,
        greeting: 'Hi',
      };

      const result = buildVoicePrompt(longMaestro, false);
      // Should be truncated at section boundary
      expect(result.length).toBeLessThanOrEqual(6000);
      expect(result).toContain('Section 1');
    });

    it('should handle maestro with Italian knowledge base header', () => {
      const italianKBPrompt = `You are a test maestro.

## BASE DI CONOSCENZA
This should be removed.
${'x'.repeat(1000)}

## Core Identity
This should be preserved.`;

      const italianMaestro: Maestro = {
        id: 'italian',
        name: 'Italian',
        displayName: 'Italian',
        subject: 'mathematics',
        specialty: 'Test',
        voice: 'alloy',
        voiceInstructions: 'Speak clearly',
        teachingStyle: 'Test',
        avatar: '/test.webp',
        color: '#000',
        systemPrompt: italianKBPrompt,
        greeting: 'Ciao',
      };

      const result = buildVoicePrompt(italianMaestro);
      expect(result).not.toContain('BASE DI CONOSCENZA');
      expect(result).not.toContain('This should be removed');
      expect(result).toContain('Core Identity');
      expect(result).toContain('This should be preserved');
    });

    it('should handle maestro with Italian accessibility header', () => {
      const italianA11yPrompt = `You are a test maestro.

## Core Identity
Important content.

## Adattamenti per l'Accessibilità
This should be removed (visual UI only).

## Teaching Style
More important content.`;

      const italianMaestro: Maestro = {
        id: 'italian-a11y',
        name: 'Italian A11y',
        displayName: 'Italian A11y',
        subject: 'mathematics',
        specialty: 'Test',
        voice: 'alloy',
        voiceInstructions: 'Speak clearly',
        teachingStyle: 'Test',
        avatar: '/test.webp',
        color: '#000',
        systemPrompt: italianA11yPrompt,
        greeting: 'Ciao',
      };

      const result = buildVoicePrompt(italianMaestro);
      expect(result).not.toContain("Adattamenti per l'Accessibilità");
      expect(result).not.toContain('This should be removed');
      expect(result).toContain('Core Identity');
      expect(result).toContain('Teaching Style');
      expect(result).toContain('More important content');
    });
  });

  describe('Persona Fidelity Verification Summary', () => {
    it('VERIFICATION: All 3 maestri preserve CHARACTER INTENSITY DIAL', () => {
      const maestri = [galileo, socrate, curie];
      for (const maestro of maestri) {
        const result = buildVoicePrompt(maestro as Maestro);
        expect(result).toContain('CHARACTER INTENSITY DIAL');
      }
    });

    it('VERIFICATION: All 3 maestri preserve Core Identity', () => {
      const maestri = [galileo, socrate, curie];
      for (const maestro of maestri) {
        const result = buildVoicePrompt(maestro as Maestro);
        expect(result).toContain('Core Identity');
      }
    });

    it('VERIFICATION: All 3 maestri exclude KNOWLEDGE BASE', () => {
      const maestri = [galileo, socrate, curie];
      for (const maestro of maestri) {
        const result = buildVoicePrompt(maestro as Maestro);
        expect(result).not.toContain('KNOWLEDGE BASE');
        expect(result).not.toContain('BASE DI CONOSCENZA');
      }
    });

    it('VERIFICATION: All 3 maestri exclude Accessibility Adaptations', () => {
      const maestri = [galileo, socrate, curie];
      for (const maestro of maestri) {
        const result = buildVoicePrompt(maestro as Maestro);
        expect(result).not.toContain('Accessibility Adaptations');
        expect(result).not.toContain("Adattamenti per l'Accessibilità");
      }
    });

    it('VERIFICATION: All character types produce valid output', () => {
      // Maestri
      const resultGalileo = buildVoicePrompt(galileo as Maestro);
      const resultSocrate = buildVoicePrompt(socrate as Maestro);
      const resultCurie = buildVoicePrompt(curie as Maestro);

      // Coach
      const resultLaura = buildVoicePrompt(LAURA as unknown as Maestro);

      // All should produce non-empty output
      expect(resultGalileo.length).toBeGreaterThan(500);
      expect(resultSocrate.length).toBeGreaterThan(500);
      expect(resultCurie.length).toBeGreaterThan(500);
      expect(resultLaura.length).toBeGreaterThan(300);
    });

    it('VERIFICATION: Truncation and full modes work for diverse characters', () => {
      const maestri = [galileo, socrate, curie];
      for (const maestro of maestri) {
        const truncated = buildVoicePrompt(maestro as Maestro, false);
        const full = buildVoicePrompt(maestro as Maestro, true);

        // Truncated should be under limit
        expect(truncated.length).toBeLessThanOrEqual(6000);

        // Full can be longer
        expect(full.length).toBeGreaterThan(0);

        // Both should exclude KB
        expect(truncated).not.toContain('KNOWLEDGE BASE');
        expect(full).not.toContain('KNOWLEDGE BASE');
      }
    });
  });
});

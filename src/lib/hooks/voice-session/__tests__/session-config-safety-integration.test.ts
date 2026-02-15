/**
 * Tests for Safety Guardrails Integration in Session Config (T2-03)
 *
 * Validates that injectSafetyGuardrails is properly integrated into
 * the voice session configuration when voice_full_prompt flag is enabled.
 *
 * Wave: W2-VoiceSafety (Plan 148)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Maestro } from '@/types';

// Mock all dependencies
vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/stores', () => ({
  useSettingsStore: {
    getState: vi.fn(() => ({
      appearance: { language: 'it' },
    })),
  },
}));

vi.mock('@/lib/accessibility', () => ({
  useAccessibilityStore: {
    getState: vi.fn(() => ({
      activeProfile: null,
      settings: { adaptiveVadEnabled: false },
    })),
  },
}));

vi.mock('@/lib/voice', () => ({
  VOICE_TOOLS: [],
  TOOL_USAGE_INSTRUCTIONS: '\n## Tool Usage\nUse tools when appropriate.',
}));

// Mock fetch for memory and adaptive context
global.fetch = vi.fn((url: string) => {
  if (url.includes('/api/memory/')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    } as Response);
  }
  if (url.includes('/api/adaptive/context')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ instruction: '' }),
    } as Response);
  }
  return Promise.reject(new Error('Unexpected fetch'));
}) as unknown as typeof fetch;

let featureFlagEnabled = false;

vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (flag: string) => ({
    enabled: flag === 'voice_full_prompt' && featureFlagEnabled,
  }),
}));

// Import after mocks
const { buildVoicePrompt } = await import('../voice-prompt-builder');
const { injectSafetyGuardrails } = await import('@/lib/safety');

describe('Session Config Safety Integration (T2-03)', () => {
  const mockMaestro: Maestro = {
    id: 'socrate',
    name: 'Socrate',
    displayName: 'Socrate',
    subject: 'philosophy',
    specialty: 'Filosofia',
    voice: 'echo',
    voiceInstructions: 'Use Socratic method',
    teachingStyle: 'Maieutico',
    avatar: '/avatars/socrate.webp',
    color: '#8B4513',
    systemPrompt: `
You are **Socrate**, the Philosophy Professor.

## CHARACTER INTENSITY DIAL
### FULL CHARACTER MODE (100%)
Use when greeting students.

## Core Identity
- **Historical Figure**: Socrates of Athens
- **Teaching Method**: Maieutics

## Pedagogical Approach
Guide students through questioning.

## KNOWLEDGE BASE
Very long knowledge content here.
${'x'.repeat(5000)}
`,
    greeting: 'Ciao!',
  };

  beforeEach(() => {
    featureFlagEnabled = false;
  });

  describe('voice_full_prompt flag disabled (legacy)', () => {
    it('should NOT inject safety guardrails when flag is disabled', () => {
      featureFlagEnabled = false;

      const voicePrompt = buildVoicePrompt(mockMaestro, featureFlagEnabled);

      // Legacy behavior: no safety injection
      expect(voicePrompt).not.toContain('REGOLE DI SICUREZZA NON NEGOZIABILI');
      expect(voicePrompt).not.toContain('CONTENUTI PROIBITI');
    });

    it('should still truncate when flag is disabled', () => {
      featureFlagEnabled = false;

      const voicePrompt = buildVoicePrompt(mockMaestro, featureFlagEnabled);

      // Should be truncated
      expect(voicePrompt.length).toBeLessThanOrEqual(6000);
    });
  });

  describe('voice_full_prompt flag enabled', () => {
    it('should build full voice prompt when flag is enabled', () => {
      featureFlagEnabled = true;

      const voicePrompt = buildVoicePrompt(mockMaestro, featureFlagEnabled);

      // Should include all sections (minus KB)
      expect(voicePrompt).toContain('CHARACTER INTENSITY DIAL');
      expect(voicePrompt).toContain('Core Identity');
      expect(voicePrompt).toContain('Pedagogical Approach');

      // Should exclude KB
      expect(voicePrompt).not.toContain('KNOWLEDGE BASE');
      expect(voicePrompt).not.toContain('xxxxx');
    });

    it('should inject safety guardrails when flag is enabled', () => {
      featureFlagEnabled = true;

      const voicePrompt = buildVoicePrompt(mockMaestro, featureFlagEnabled);
      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      // Safety sections should be present
      expect(safePrompt).toContain('REGOLE DI SICUREZZA NON NEGOZIABILI');
      expect(safePrompt).toContain('CONTENUTI PROIBITI');
      expect(safePrompt).toContain('PROTEZIONE PRIVACY');
      expect(safePrompt).toContain('PROMPT INJECTION');
      expect(safePrompt).toContain('ANTI-INFLUENZA');
      expect(safePrompt).toContain('HUMAN FIRST');
    });

    it('should preserve character content after safety injection', () => {
      featureFlagEnabled = true;

      const voicePrompt = buildVoicePrompt(mockMaestro, featureFlagEnabled);
      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      // Character sections should still be present
      expect(safePrompt).toContain('Socrate');
      expect(safePrompt).toContain('CHARACTER INTENSITY DIAL');
      expect(safePrompt).toContain('Core Identity');
    });

    it('should include gamification XP guidelines in safety injection', () => {
      featureFlagEnabled = true;

      const voicePrompt = buildVoicePrompt(mockMaestro, featureFlagEnabled);
      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      expect(safePrompt).toContain('SISTEMA DI GAMIFICAZIONE');
      expect(safePrompt).toContain('Hai appena guadagnato 10 XP');
    });

    it('should apply formal address for historical professors (Socrates)', () => {
      featureFlagEnabled = true;

      const voicePrompt = buildVoicePrompt(mockMaestro, featureFlagEnabled);
      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate', // Pre-1900 professor
      });

      // Should use formal address (Lei)
      expect(safePrompt).toMatch(/Lei|forma formale/i);
    });

    it('should apply informal address for modern professors', () => {
      featureFlagEnabled = true;

      const modernMaestro = { ...mockMaestro, id: 'feynman' };
      const voicePrompt = buildVoicePrompt(modernMaestro, featureFlagEnabled);
      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'feynman', // Modern professor
      });

      // Should use informal address (tu) - matches INFORMAL_ADDRESS_SECTION template
      expect(safePrompt).toMatch(/REGISTRO INFORMALE|Usa "tu"/i);
    });
  });

  describe('End-to-end voice instruction assembly', () => {
    it('should produce complete instructions for Azure Realtime API', () => {
      featureFlagEnabled = true;

      // Step 1: Build voice prompt
      const voicePrompt = buildVoicePrompt(mockMaestro, featureFlagEnabled);

      // Step 2: Inject safety guardrails
      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      // Verify complete instruction structure
      const requiredComponents = [
        // Safety
        'REGOLE DI SICUREZZA NON NEGOZIABILI',
        'CONTENUTI PROIBITI',
        'PROTEZIONE PRIVACY',
        'ANTI-INFLUENZA',
        'HUMAN FIRST',
        // Character
        'CHARACTER INTENSITY DIAL',
        'Core Identity',
        'Pedagogical Approach',
      ];

      requiredComponents.forEach((component) => {
        expect(safePrompt).toContain(component);
      });

      // Verify exclusions
      expect(safePrompt).not.toContain('KNOWLEDGE BASE');
      expect(safePrompt).not.toContain('xxxxx');
    });

    it('should handle voice personality instructions addition', () => {
      featureFlagEnabled = true;

      const maestroWithVoiceInstructions = {
        ...mockMaestro,
        voiceInstructions: 'Speak with wisdom and ask probing questions.',
      };

      const voicePrompt = buildVoicePrompt(maestroWithVoiceInstructions, featureFlagEnabled);
      const safePrompt = injectSafetyGuardrails(voicePrompt, {
        role: 'maestro',
        characterId: 'socrate',
      });

      // Voice instructions would be added separately in session-config
      // but should not interfere with safety injection
      expect(safePrompt).toContain('REGOLE DI SICUREZZA NON NEGOZIABILI');
      expect(safePrompt).toContain('Core Identity');
    });
  });
});

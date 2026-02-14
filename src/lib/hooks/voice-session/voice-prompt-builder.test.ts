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

## KNOWLEDGE BASE
A very long knowledge base content that goes on and on with lots of details
about math theory, algebra, geometry, calculus, and many other topics.
${'x'.repeat(5000)}

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
  it('should include character header with name, subject, specialty, style', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
    expect(result).toContain('Test Maestro — math');
    expect(result).toContain('Algebra and Geometry');
    expect(result).toContain('Patient and methodical');
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

  it('should NOT include Knowledge Base content', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
    expect(result).not.toContain('KNOWLEDGE BASE');
    expect(result).not.toContain('xxxxx');
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

  it('should stay within MAX_VOICE_PROMPT_CHARS (~2000)', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
    expect(result.length).toBeLessThanOrEqual(2000);
  });

  it('should handle empty systemPrompt gracefully', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: '' }));
    expect(result).toContain('Test Maestro — math');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle undefined systemPrompt', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: undefined as unknown as string }));
    expect(result).toContain('Test Maestro');
  });

  it('should extract more structured content than old .slice(0,800)', () => {
    const result = buildVoicePrompt(makeMaestro({ systemPrompt: FULL_SYSTEM_PROMPT }));
    // Builder extracts structured sections vs arbitrary truncation
    expect(result.length).toBeGreaterThan(500);
    // Should include all three key sections
    expect(result).toContain('CHARACTER INTENSITY DIAL');
    expect(result).toContain('Core Identity');
  });
});

/**
 * Tests for Prompt Enhancer — accessibility stripping
 */

import { describe, it, expect, vi } from 'vitest';
import { stripAccessibilitySection, type DSAProfileName } from './prompt-enhancer';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

const PROMPT_WITH_ACCESSIBILITY = `You are a test maestro.

## Core Identity
Test professor.

## Accessibility Adaptations

### Dyslexia Support
Use larger text, simple fonts.

### ADHD Support
Quick concept chunks, breaks.

### Autism Support
Literal explanations, structure.

### Cerebral Palsy Support
Voice-controlled simulations.

## Curriculum Topics
Math topics here.`;

describe('stripAccessibilitySection', () => {
  it('strips entire section when no DSA profiles active', () => {
    const result = stripAccessibilitySection(PROMPT_WITH_ACCESSIBILITY, null);
    expect(result).not.toContain('Accessibility Adaptations');
    expect(result).not.toContain('Dyslexia Support');
    expect(result).not.toContain('ADHD Support');
    expect(result).toContain('Core Identity');
    expect(result).toContain('Curriculum Topics');
  });

  it('strips entire section for empty profiles array', () => {
    const result = stripAccessibilitySection(PROMPT_WITH_ACCESSIBILITY, []);
    expect(result).not.toContain('Accessibility Adaptations');
    expect(result).toContain('Curriculum Topics');
  });

  it('keeps only dyslexia section when dyslexia profile active', () => {
    const profiles: DSAProfileName[] = ['dyslexia'];
    const result = stripAccessibilitySection(PROMPT_WITH_ACCESSIBILITY, profiles);
    expect(result).toContain('Accessibility Adaptations');
    expect(result).toContain('Dyslexia Support');
    expect(result).not.toContain('ADHD Support');
    expect(result).not.toContain('Autism Support');
    expect(result).toContain('Curriculum Topics');
  });

  it('keeps multiple relevant sections for multiple profiles', () => {
    const profiles: DSAProfileName[] = ['dyslexia', 'adhd'];
    const result = stripAccessibilitySection(PROMPT_WITH_ACCESSIBILITY, profiles);
    expect(result).toContain('Dyslexia Support');
    expect(result).toContain('ADHD Support');
    expect(result).not.toContain('Autism Support');
  });

  it('returns unchanged prompt if no accessibility section found', () => {
    const prompt = 'Simple prompt without accessibility section.';
    const result = stripAccessibilitySection(prompt, null);
    expect(result).toBe(prompt);
  });

  it('handles prompt with accessibility at end (no next section)', () => {
    const prompt = `## Core Identity
Test.

## Accessibility Adaptations

### Dyslexia Support
Large text.`;

    const result = stripAccessibilitySection(prompt, null);
    expect(result).not.toContain('Accessibility');
    expect(result).toContain('Core Identity');
  });

  it('preserves neurotypical user prompts without accessibility overhead', () => {
    const withA11y = PROMPT_WITH_ACCESSIBILITY;
    const stripped = stripAccessibilitySection(withA11y, null);
    expect(stripped.length).toBeLessThan(withA11y.length);
  });
});

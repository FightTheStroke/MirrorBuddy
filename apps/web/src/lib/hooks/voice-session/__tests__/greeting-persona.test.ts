import { describe, it, expect } from 'vitest';
import {
  getRandomGreetingPrompt,
  buildCharacterInstruction,
  GREETING_PERSONA_DIRECTIVE,
} from '../session-constants';

describe('getRandomGreetingPrompt — persona directive', () => {
  it('appends the in-character directive (anonymous student, it)', () => {
    const prompt = getRandomGreetingPrompt(null, 'it');
    expect(prompt).toContain(GREETING_PERSONA_DIRECTIVE.it);
    expect(prompt).toMatch(/compagno di viaggio/i); // forbids the generic intro
    expect(prompt).toMatch(/non avere occhi, mani o un corpo/i);
  });

  it('appends the directive AND uses the student name (personalized, it)', () => {
    const prompt = getRandomGreetingPrompt('Mario', 'it');
    expect(prompt).toContain('Mario');
    expect(prompt).toContain(GREETING_PERSONA_DIRECTIVE.it);
  });

  it('uses the locale-specific directive for each supported locale', () => {
    for (const locale of ['it', 'en', 'es', 'fr', 'de'] as const) {
      const prompt = getRandomGreetingPrompt(null, locale);
      expect(prompt).toContain(GREETING_PERSONA_DIRECTIVE[locale]);
    }
  });

  it('falls back to the it directive for an unknown locale', () => {
    const prompt = getRandomGreetingPrompt(null, 'pt');
    expect(prompt).toContain(GREETING_PERSONA_DIRECTIVE.it);
  });
});

describe('buildCharacterInstruction — greeting guard', () => {
  it('names the character and forbids the generic disembodied intro', () => {
    const instr = buildCharacterInstruction('Richard Feynman');
    expect(instr).toContain('Richard Feynman');
    expect(instr).toMatch(/introduce yourself BY NAME/i);
    expect(instr).toMatch(/travel companion/i);
    expect(instr).toMatch(/lack a body, eyes or hands/i);
  });

  it('gates AI / human-relationship talk to when the student raises it', () => {
    const instr = buildCharacterInstruction('Galileo');
    expect(instr).toMatch(/only when the student\s+explicitly raises them/i);
  });
});

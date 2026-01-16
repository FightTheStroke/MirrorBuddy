/**
 * Tests for i18n frustration pattern detection
 */

import { describe, it, expect } from 'vitest';
import { analyzeText, detectLocale, countFillers } from '../patterns';

describe('frustration patterns', () => {
  describe('detectLocale', () => {
    it('detects Italian', () => {
      expect(detectLocale('Non ho capito, puoi ripetere?')).toBe('it');
      expect(detectLocale('Sono frustrato con questo esercizio')).toBe('it');
    });

    it('detects English', () => {
      expect(detectLocale("I don't understand this at all")).toBe('en');
      expect(detectLocale('Can you repeat that please?')).toBe('en');
    });

    it('detects Spanish', () => {
      expect(detectLocale('No entiendo, es muy difícil')).toBe('es');
      expect(detectLocale('Estoy frustrado con esto')).toBe('es');
    });

    it('detects French', () => {
      expect(detectLocale("Je ne comprends pas, c'est trop dur")).toBe('fr');
      expect(detectLocale('Pouvez-vous répéter?')).toBe('fr');
    });

    it('detects German', () => {
      expect(detectLocale('Ich verstehe das nicht')).toBe('de');
      expect(detectLocale('Das ist zu schwer für mich')).toBe('de');
    });

    it('returns null for ambiguous text', () => {
      expect(detectLocale('123 456')).toBeNull();
      expect(detectLocale('')).toBeNull();
    });
  });

  describe('analyzeText - Italian', () => {
    it('detects explicit frustration', () => {
      const result = analyzeText('Non ce la faccio più!', 'it');
      expect(result.frustrationScore).toBeGreaterThan(0.8);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('detects frustration without accents', () => {
      const result = analyzeText('e troppo difficile', 'it');
      expect(result.frustrationScore).toBeGreaterThan(0.8);
    });

    it('detects repeat requests', () => {
      const result = analyzeText('Non ho capito, puoi spiegare ancora?', 'it');
      expect(result.repeatRequestScore).toBeGreaterThan(0.5);
    });

    it('detects confusion', () => {
      const result = analyzeText('Sono confuso, da dove comincio?', 'it');
      expect(result.confusionScore).toBeGreaterThan(0.4);
    });

    it('handles neutral text', () => {
      const result = analyzeText('La risposta è 42', 'it');
      expect(result.frustrationScore).toBe(0);
      expect(result.repeatRequestScore).toBe(0);
    });
  });

  describe('analyzeText - English', () => {
    it('detects frustration', () => {
      const result = analyzeText("I can't do this anymore!", 'en');
      expect(result.frustrationScore).toBeGreaterThan(0.8);
    });

    it('detects implicit frustration', () => {
      const result = analyzeText("I'm so stupid, I'll never learn", 'en');
      expect(result.frustrationScore).toBeGreaterThan(0.7);
    });

    it('detects repeat requests', () => {
      const result = analyzeText("I didn't understand, can you explain again?", 'en');
      expect(result.repeatRequestScore).toBeGreaterThan(0.5);
    });
  });

  describe('analyzeText - Spanish', () => {
    it('detects frustration', () => {
      const result = analyzeText('No puedo más, me rindo', 'es');
      expect(result.frustrationScore).toBeGreaterThan(0.8);
    });

    it('detects repeat requests', () => {
      const result = analyzeText('No entendí, puedes repetir?', 'es');
      expect(result.repeatRequestScore).toBeGreaterThan(0.5);
    });
  });

  describe('analyzeText - auto detection', () => {
    it('auto-detects language and analyzes', () => {
      const itResult = analyzeText('Non ce la faccio più con questa matematica');
      expect(itResult.detectedLocale).toBe('it');
      expect(itResult.frustrationScore).toBeGreaterThan(0.8);

      const enResult = analyzeText("I can't do this, it's too hard");
      expect(enResult.detectedLocale).toBe('en');
      expect(enResult.frustrationScore).toBeGreaterThan(0.8);
    });
  });

  describe('countFillers', () => {
    it('counts Italian fillers', () => {
      expect(countFillers('Ehm, allora, cioè, tipo...', 'it')).toBe(4);
    });

    it('counts English fillers', () => {
      expect(countFillers('Um, like, you know, basically...', 'en')).toBe(4);
    });

    it('returns 0 for no fillers', () => {
      expect(countFillers('This is a clear sentence', 'en')).toBe(0);
    });
  });
});

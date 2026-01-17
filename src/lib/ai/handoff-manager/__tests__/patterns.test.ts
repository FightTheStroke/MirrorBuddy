/**
 * Tests for Handoff Signal Patterns
 */

import { describe, it, expect } from 'vitest';
import { INTENT_HANDOFF_MAP, HANDOFF_SIGNAL_PATTERNS } from '../patterns';

describe('handoff-patterns', () => {
  describe('INTENT_HANDOFF_MAP', () => {
    it('maps academic_help to maestro', () => {
      expect(INTENT_HANDOFF_MAP.academic_help).toBe('maestro');
    });

    it('maps method_help to coach', () => {
      expect(INTENT_HANDOFF_MAP.method_help).toBe('coach');
    });

    it('maps emotional_support to buddy', () => {
      expect(INTENT_HANDOFF_MAP.emotional_support).toBe('buddy');
    });

    it('maps crisis to buddy', () => {
      expect(INTENT_HANDOFF_MAP.crisis).toBe('buddy');
    });

    it('maps tech_support to coach', () => {
      expect(INTENT_HANDOFF_MAP.tech_support).toBe('coach');
    });

    it('maps tool_request to null (no handoff)', () => {
      expect(INTENT_HANDOFF_MAP.tool_request).toBeNull();
    });

    it('maps general_chat to null (no handoff)', () => {
      expect(INTENT_HANDOFF_MAP.general_chat).toBeNull();
    });
  });

  describe('HANDOFF_SIGNAL_PATTERNS.maestro_suggestion', () => {
    it('matches "ti consiglio Euclide"', () => {
      const text = 'ti consiglio Euclide per la matematica';
      const matches = HANDOFF_SIGNAL_PATTERNS.maestro_suggestion.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('matches "potresti parlare con il professore"', () => {
      const text = 'potresti parlare con il professor Feynman';
      const matches = HANDOFF_SIGNAL_PATTERNS.maestro_suggestion.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('matches maestro names directly', () => {
      const maestroNames = ['Euclide', 'Feynman', 'Manzoni', 'Leonardo', 'Shakespeare', 'Curie', 'Socrate', 'Mozart', 'Erodoto', 'Humboldt', 'Smith'];

      for (const name of maestroNames) {
        const text = `Parla con ${name}`;
        const matches = HANDOFF_SIGNAL_PATTERNS.maestro_suggestion.some(p => p.test(text));
        expect(matches).toBe(true);
      }
    });

    it('matches "per questa materia meglio" suggestions', () => {
      const text = 'per questa materia sarebbe meglio Euclide';
      const matches = HANDOFF_SIGNAL_PATTERNS.maestro_suggestion.some(p => p.test(text));
      expect(matches).toBe(true);
    });
  });

  describe('HANDOFF_SIGNAL_PATTERNS.buddy_suggestion', () => {
    it('matches "capisco che è difficile"', () => {
      const text = 'capisco che questo momento è difficile per te';
      const matches = HANDOFF_SIGNAL_PATTERNS.buddy_suggestion.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('matches "sembra che sia stressante"', () => {
      const text = 'sembra che sia molto stressante per te';
      const matches = HANDOFF_SIGNAL_PATTERNS.buddy_suggestion.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('matches buddy names with support suggestion', () => {
      const text = 'Mario può aiutarti in questo momento';
      const matches = HANDOFF_SIGNAL_PATTERNS.buddy_suggestion.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('matches "vuoi parlare con un amico"', () => {
      const text = 'vuoi parlare con un amico della tua età?';
      const matches = HANDOFF_SIGNAL_PATTERNS.buddy_suggestion.some(p => p.test(text));
      expect(matches).toBe(true);
    });
  });

  describe('HANDOFF_SIGNAL_PATTERNS.coach_suggestion', () => {
    it('matches "Melissa può aiutarti"', () => {
      const text = 'Melissa può aiutarti a organizzarti meglio';
      const matches = HANDOFF_SIGNAL_PATTERNS.coach_suggestion.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('matches "Roberto sa come organizzare"', () => {
      const text = 'Roberto sa come organizzare il tuo tempo';
      const matches = HANDOFF_SIGNAL_PATTERNS.coach_suggestion.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('matches "per organizzarti chiedi a"', () => {
      const text = 'per organizzarti meglio chiedi a Melissa';
      const matches = HANDOFF_SIGNAL_PATTERNS.coach_suggestion.some(p => p.test(text));
      expect(matches).toBe(true);
    });
  });

  describe('HANDOFF_SIGNAL_PATTERNS.crisis_signals', () => {
    it('matches "mi sento solo"', () => {
      const text = 'mi sento molto solo';
      const matches = HANDOFF_SIGNAL_PATTERNS.crisis_signals.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('matches "mi sento triste"', () => {
      const text = 'mi sento triste oggi';
      const matches = HANDOFF_SIGNAL_PATTERNS.crisis_signals.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('matches "sono disperato"', () => {
      const text = 'sono disperato non so cosa fare';
      const matches = HANDOFF_SIGNAL_PATTERNS.crisis_signals.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('matches "non ce la faccio più"', () => {
      const text = 'non ce la faccio più con questi compiti';
      const matches = HANDOFF_SIGNAL_PATTERNS.crisis_signals.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('matches "nessuno mi capisce"', () => {
      const text = 'nessuno mi capisce a scuola';
      const matches = HANDOFF_SIGNAL_PATTERNS.crisis_signals.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('matches "voglio smettere"', () => {
      const text = 'voglio smettere di studiare';
      const matches = HANDOFF_SIGNAL_PATTERNS.crisis_signals.some(p => p.test(text));
      expect(matches).toBe(true);
    });

    it('does not match normal study messages', () => {
      const normalMessages = [
        'mi piace studiare matematica',
        'posso avere aiuto con i compiti?',
        'come funziona la fotosintesi?',
      ];

      for (const text of normalMessages) {
        const matches = HANDOFF_SIGNAL_PATTERNS.crisis_signals.some(p => p.test(text));
        expect(matches).toBe(false);
      }
    });
  });
});

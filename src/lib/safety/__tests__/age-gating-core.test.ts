// ============================================================================
// AGE GATING CORE TESTS
// Unit tests for age-appropriate content filtering
// ============================================================================

import { describe, it, expect, vi } from 'vitest';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  getAgeBracket,
  checkAgeGate,
  detectTopics,
  filterForAge,
  getLanguageGuidance,
  getAgeGatePrompt,
  type AgeBracket as _AgeBracket,
  type ContentTopic as _ContentTopic,
} from '../age-gating-core';

describe('Age Gating Core', () => {
  describe('getAgeBracket', () => {
    it('should return elementary for ages below 6', () => {
      expect(getAgeBracket(4)).toBe('elementary');
      expect(getAgeBracket(5)).toBe('elementary');
    });

    it('should return elementary for ages 6-10', () => {
      expect(getAgeBracket(6)).toBe('elementary');
      expect(getAgeBracket(8)).toBe('elementary');
      expect(getAgeBracket(10)).toBe('elementary');
    });

    it('should return middle for ages 11-13', () => {
      expect(getAgeBracket(11)).toBe('middle');
      expect(getAgeBracket(12)).toBe('middle');
      expect(getAgeBracket(13)).toBe('middle');
    });

    it('should return highschool for ages 14-19', () => {
      expect(getAgeBracket(14)).toBe('highschool');
      expect(getAgeBracket(16)).toBe('highschool');
      expect(getAgeBracket(19)).toBe('highschool');
    });

    it('should return adult for ages 20+', () => {
      expect(getAgeBracket(20)).toBe('adult');
      expect(getAgeBracket(25)).toBe('adult');
      expect(getAgeBracket(50)).toBe('adult');
    });
  });

  describe('checkAgeGate', () => {
    describe('basic_education topic', () => {
      it('should be safe for all ages', () => {
        expect(checkAgeGate('basic_education', 7).sensitivity).toBe('safe');
        expect(checkAgeGate('basic_education', 12).sensitivity).toBe('safe');
        expect(checkAgeGate('basic_education', 16).sensitivity).toBe('safe');
        expect(checkAgeGate('basic_education', 25).sensitivity).toBe('safe');
      });
    });

    describe('social_romance topic', () => {
      it('should be blocked for elementary', () => {
        const result = checkAgeGate('social_romance', 8);

        expect(result.appropriate).toBe(false);
        expect(result.sensitivity).toBe('blocked');
        expect(result.handling).toBe('block');
        expect(result.alternative).toBeDefined();
      });

      it('should be moderate for middle school', () => {
        const result = checkAgeGate('social_romance', 12);

        expect(result.appropriate).toBe(true);
        expect(result.sensitivity).toBe('moderate');
        expect(result.handling).toBe('simplify');
      });

      it('should be safe for highschool and adults', () => {
        expect(checkAgeGate('social_romance', 16).sensitivity).toBe('safe');
        expect(checkAgeGate('social_romance', 22).sensitivity).toBe('safe');
      });
    });

    describe('history_violence topic', () => {
      it('should be restricted for elementary', () => {
        const result = checkAgeGate('history_violence', 9);

        expect(result.appropriate).toBe(false);
        expect(result.sensitivity).toBe('restricted');
        expect(result.handling).toBe('redirect');
        expect(result.alternative).toBeDefined();
      });

      it('should be moderate for middle school', () => {
        const result = checkAgeGate('history_violence', 12);

        expect(result.appropriate).toBe(true);
        expect(result.sensitivity).toBe('moderate');
      });
    });

    describe('literature_mature topic', () => {
      it('should be blocked for elementary', () => {
        const result = checkAgeGate('literature_mature', 8);

        expect(result.sensitivity).toBe('blocked');
        expect(result.appropriate).toBe(false);
      });

      it('should be restricted for middle school', () => {
        const result = checkAgeGate('literature_mature', 12);

        expect(result.sensitivity).toBe('restricted');
        expect(result.appropriate).toBe(false);
      });

      it('should be moderate for highschool', () => {
        const result = checkAgeGate('literature_mature', 16);

        expect(result.sensitivity).toBe('moderate');
        expect(result.appropriate).toBe(true);
      });
    });

    it('should include guidance in result', () => {
      const result = checkAgeGate('basic_education', 10);

      expect(result.guidance).toBeDefined();
      expect(typeof result.guidance).toBe('string');
    });
  });

  describe('detectTopics', () => {
    it('should detect basic_education topics', () => {
      const topics = detectTopics('Impariamo la matematica e la lettura');

      expect(topics).toContain('basic_education');
    });

    it('should detect history_war topics', () => {
      const topics = detectTopics('La seconda guerra mondiale iniziò nel 1939');

      expect(topics).toContain('history_war');
    });

    it('should detect history_violence topics', () => {
      const topics = detectTopics("L'olocausto fu un genocidio terribile");

      expect(topics).toContain('history_violence');
    });

    it('should detect biology_reproduction topics', () => {
      const topics = detectTopics('La riproduzione umana e la pubertà');

      expect(topics).toContain('biology_reproduction');
    });

    it('should detect health_mental topics', () => {
      const topics = detectTopics("L'ansia e la depressione sono disturbi");

      expect(topics).toContain('health_mental');
    });

    it('should detect social_romance topics', () => {
      const topics = detectTopics('Il mio ragazzo mi ha detto che è innamorato');

      expect(topics).toContain('social_romance');
    });

    it('should detect current_events topics', () => {
      const topics = detectTopics('Le notizie di attualità sulla politica');

      expect(topics).toContain('current_events');
    });

    it('should detect philosophy_ethics topics', () => {
      const topics = detectTopics("Un dilemma etico sul giusto o sbagliato");

      expect(topics).toContain('philosophy_ethics');
    });

    it('should detect economics_finance topics', () => {
      const topics = detectTopics('Come funziona il risparmio e gli investimenti');

      expect(topics).toContain('economics_finance');
    });

    it('should return basic_education as default when no topics detected', () => {
      const topics = detectTopics('Testo generico senza argomenti specifici');

      expect(topics).toContain('basic_education');
    });

    it('should detect multiple topics in same text', () => {
      const topics = detectTopics(
        'La guerra e la salute mentale nella storia'
      );

      expect(topics).toContain('history_war');
      expect(topics).toContain('health_mental');
    });
  });

  describe('filterForAge', () => {
    it('should return most restrictive result for multiple topics', () => {
      // Text with both safe and blocked topics
      const result = filterForAge('Parliamo di matematica e di fidanzati', 8);

      // social_romance is blocked for 8-year-olds
      expect(result.sensitivity).toBe('blocked');
      expect(result.appropriate).toBe(false);
    });

    it('should return safe for age-appropriate content', () => {
      const result = filterForAge('Impariamo le tabelline!', 9);

      expect(result.sensitivity).toBe('safe');
      expect(result.appropriate).toBe(true);
    });

    it('should detect and filter multiple sensitive topics', () => {
      // Text with blocked topic for elementary (social_romance)
      const result = filterForAge(
        'La guerra mondiale e il fidanzato',
        8
      );

      // social_romance is blocked for elementary
      expect(result.appropriate).toBe(false);
    });
  });

  describe('getLanguageGuidance', () => {
    it('should return elementary guidance for ages 6-10', () => {
      const guidance = getLanguageGuidance(8);

      expect(guidance).toContain('6-10');
      expect(guidance).toContain('frasi brevi');
      expect(guidance).toContain('semplici');
    });

    it('should return middle school guidance for ages 11-13', () => {
      const guidance = getLanguageGuidance(12);

      expect(guidance).toContain('11-13');
      expect(guidance).toContain('media lunghezza');
    });

    it('should return highschool guidance for ages 14-19', () => {
      const guidance = getLanguageGuidance(16);

      expect(guidance).toContain('14-19');
      expect(guidance).toContain('analisi critica');
    });

    it('should return adult guidance for ages 20+', () => {
      const guidance = getLanguageGuidance(25);

      expect(guidance).toContain('adult');
      expect(guidance).toContain('professionale');
    });
  });

  describe('getAgeGatePrompt', () => {
    it('should include age in prompt', () => {
      const prompt = getAgeGatePrompt(10);

      expect(prompt).toContain('10 ANNI');
    });

    it('should include bracket in prompt', () => {
      const prompt = getAgeGatePrompt(10);

      expect(prompt).toContain('ELEMENTARY');
    });

    it('should include language guidance', () => {
      const prompt = getAgeGatePrompt(8);

      expect(prompt).toContain('ADATTAMENTO LINGUISTICO');
    });

    it('should include topic restrictions', () => {
      const prompt = getAgeGatePrompt(8);

      expect(prompt).toContain('ARGOMENTI SENSIBILI');
    });

    it('should include reminder about age adaptation', () => {
      const prompt = getAgeGatePrompt(12);

      expect(prompt).toContain('Adatta SEMPRE');
    });

    it('should show restricted topics for elementary', () => {
      const prompt = getAgeGatePrompt(8);

      // Should list blocked/restricted topics
      expect(prompt).toMatch(/BLOCKED|RESTRICTED/i);
    });
  });
});

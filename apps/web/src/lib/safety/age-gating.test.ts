/**
 * MirrorBuddy Age Gating Module - Unit Tests
 *
 * Comprehensive test suite covering:
 * - Age bracket determination
 * - Content topic validation
 * - Topic detection from text
 * - Age-appropriate content filtering
 * - Language complexity guidance
 * - Error handling and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getAgeBracket,
  checkAgeGate,
  detectTopics,
  filterForAge,
  getLanguageGuidance,
  getAgeGatePrompt,
  type ContentTopic,
} from "./age-gating";

// Mock logger module
vi.mock("@/lib/logger", () => ({
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

import { logger } from "@/lib/logger";

describe("Age Gating Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAgeBracket", () => {
    it("should return elementary for age < 6", () => {
      expect(getAgeBracket(3)).toBe("elementary");
      expect(getAgeBracket(5)).toBe("elementary");
    });

    it("should return elementary for ages 6-10", () => {
      expect(getAgeBracket(6)).toBe("elementary");
      expect(getAgeBracket(8)).toBe("elementary");
      expect(getAgeBracket(10)).toBe("elementary");
    });

    it("should return middle for ages 11-13", () => {
      expect(getAgeBracket(11)).toBe("middle");
      expect(getAgeBracket(12)).toBe("middle");
      expect(getAgeBracket(13)).toBe("middle");
    });

    it("should return highschool for ages 14-19", () => {
      expect(getAgeBracket(14)).toBe("highschool");
      expect(getAgeBracket(16)).toBe("highschool");
      expect(getAgeBracket(19)).toBe("highschool");
    });

    it("should return adult for age >= 20", () => {
      expect(getAgeBracket(20)).toBe("adult");
      expect(getAgeBracket(25)).toBe("adult");
      expect(getAgeBracket(100)).toBe("adult");
    });

    it("should handle boundary ages correctly", () => {
      expect(getAgeBracket(10)).toBe("elementary"); // Upper bound elementary
      expect(getAgeBracket(11)).toBe("middle"); // Lower bound middle
      expect(getAgeBracket(13)).toBe("middle"); // Upper bound middle
      expect(getAgeBracket(14)).toBe("highschool"); // Lower bound highschool
      expect(getAgeBracket(19)).toBe("highschool"); // Upper bound highschool
      expect(getAgeBracket(20)).toBe("adult"); // Lower bound adult
    });
  });

  describe("checkAgeGate", () => {
    describe("safe content", () => {
      it("should allow basic_education for all ages", () => {
        const ages = [6, 11, 14, 20];
        ages.forEach((age) => {
          const result = checkAgeGate("basic_education", age);
          expect(result.appropriate).toBe(true);
          expect(result.sensitivity).toBe("safe");
          expect(result.handling).toBe("allow");
          expect(result.guidance).toContain("Nessun adattamento");
        });
      });

      it("should allow health_physical for all ages", () => {
        const result = checkAgeGate("health_physical", 8);
        expect(result.appropriate).toBe(true);
        expect(result.sensitivity).toBe("safe");
        expect(result.handling).toBe("allow");
      });

      it("should allow social_relationships for all ages", () => {
        const result = checkAgeGate("social_relationships", 7);
        expect(result.appropriate).toBe(true);
        expect(result.sensitivity).toBe("safe");
        expect(result.handling).toBe("allow");
      });
    });

    describe("moderate content", () => {
      it("should require simplification for history_war with elementary students", () => {
        const result = checkAgeGate("history_war", 8);
        expect(result.appropriate).toBe(true);
        expect(result.sensitivity).toBe("moderate");
        expect(result.handling).toBe("simplify");
        expect(result.guidance).toContain("linguaggio semplificato");
      });

      it("should mark health_mental as moderate for elementary", () => {
        const result = checkAgeGate("health_mental", 9);
        expect(result.appropriate).toBe(true);
        expect(result.sensitivity).toBe("moderate");
        expect(result.handling).toBe("simplify");
      });

      it("should mark social_romance as moderate for middle school", () => {
        const result = checkAgeGate("social_romance", 12);
        expect(result.appropriate).toBe(true);
        expect(result.sensitivity).toBe("moderate");
        expect(result.handling).toBe("simplify");
      });
    });

    describe("restricted content", () => {
      it("should restrict history_violence for elementary students", () => {
        const result = checkAgeGate("history_violence", 8);
        expect(result.appropriate).toBe(false);
        expect(result.sensitivity).toBe("restricted");
        expect(result.handling).toBe("redirect");
        expect(result.guidance).toContain(
          "Tratta l'argomento solo se strettamente necessario",
        );
        expect(result.alternative).toBeDefined();
      });

      it("should restrict biology_reproduction for elementary students", () => {
        const result = checkAgeGate("biology_reproduction", 9);
        expect(result.appropriate).toBe(false);
        expect(result.sensitivity).toBe("restricted");
        expect(result.handling).toBe("redirect");
        // Note: biology_reproduction doesn't have a defined alternative
      });

      it("should restrict current_events for elementary students", () => {
        const result = checkAgeGate("current_events", 7);
        expect(result.appropriate).toBe(false);
        expect(result.sensitivity).toBe("restricted");
        expect(result.handling).toBe("redirect");
      });

      it("should restrict literature_mature for middle school", () => {
        const result = checkAgeGate("literature_mature", 12);
        expect(result.appropriate).toBe(false);
        expect(result.sensitivity).toBe("restricted");
        expect(result.handling).toBe("redirect");
      });
    });

    describe("blocked content", () => {
      it("should block social_romance for elementary students", () => {
        const result = checkAgeGate("social_romance", 8);
        expect(result.appropriate).toBe(false);
        expect(result.sensitivity).toBe("blocked");
        expect(result.handling).toBe("block");
        expect(result.guidance).toContain("non è appropriato");
        expect(result.alternative).toBeDefined();
        expect(result.alternative).toContain("amicizia");
      });

      it("should block literature_mature for elementary students", () => {
        const result = checkAgeGate("literature_mature", 10);
        expect(result.appropriate).toBe(false);
        expect(result.sensitivity).toBe("blocked");
        expect(result.handling).toBe("block");
        expect(result.alternative).toBeDefined();
        expect(result.alternative).toContain("libri avventurosi");
      });
    });

    describe("alternative suggestions", () => {
      it("should provide alternatives for blocked social_romance", () => {
        const result = checkAgeGate("social_romance", 8);
        expect(result.alternative).toContain("amicizia");
      });

      it("should provide alternatives for blocked literature_mature", () => {
        const result = checkAgeGate("literature_mature", 9);
        expect(result.alternative).toContain("libri avventurosi");
      });

      it("should provide alternatives for restricted history_violence", () => {
        const result = checkAgeGate("history_violence", 8);
        expect(result.alternative).toContain("eroi");
      });

      it("should provide alternatives for restricted current_events", () => {
        const result = checkAgeGate("current_events", 7);
        expect(result.alternative).toContain("notizie positive");
      });
    });

    describe("logging", () => {
      it("should log non-safe content checks", () => {
        checkAgeGate("social_romance", 8);
        expect(logger.info).toHaveBeenCalledWith(
          "Age gate check",
          expect.objectContaining({
            topic: "social_romance",
            age: 8,
            bracket: "elementary",
            sensitivity: "blocked",
            appropriate: false,
          }),
        );
      });

      it("should not log safe content checks", () => {
        checkAgeGate("basic_education", 10);
        expect(logger.info).not.toHaveBeenCalled();
      });

      it("should log moderate content", () => {
        checkAgeGate("history_war", 8);
        expect(logger.info).toHaveBeenCalledWith(
          "Age gate check",
          expect.objectContaining({
            sensitivity: "moderate",
          }),
        );
      });
    });

    describe("age progression", () => {
      it("should allow previously blocked content as students age", () => {
        const topic: ContentTopic = "social_romance";

        // Blocked at elementary
        const elementary = checkAgeGate(topic, 8);
        expect(elementary.appropriate).toBe(false);
        expect(elementary.sensitivity).toBe("blocked");

        // Moderate at middle school
        const middle = checkAgeGate(topic, 12);
        expect(middle.appropriate).toBe(true);
        expect(middle.sensitivity).toBe("moderate");

        // Safe at highschool
        const highschool = checkAgeGate(topic, 16);
        expect(highschool.appropriate).toBe(true);
        expect(highschool.sensitivity).toBe("safe");
      });

      it("should allow history_violence with appropriate context as students age", () => {
        const topic: ContentTopic = "history_violence";

        // Restricted at elementary
        const elementary = checkAgeGate(topic, 9);
        expect(elementary.sensitivity).toBe("restricted");

        // Moderate at middle school
        const middle = checkAgeGate(topic, 13);
        expect(middle.sensitivity).toBe("moderate");

        // Safe at highschool
        const highschool = checkAgeGate(topic, 17);
        expect(highschool.sensitivity).toBe("safe");
      });
    });
  });

  describe("detectTopics", () => {
    describe("Italian keywords", () => {
      it("should detect matematica as basic_education", () => {
        const topics = detectTopics("Voglio studiare la matematica");
        expect(topics).toContain("basic_education");
      });

      it("should detect guerra as history_war", () => {
        const topics = detectTopics("La seconda guerra mondiale");
        expect(topics).toContain("history_war");
      });

      it("should detect olocausto as history_violence", () => {
        const topics = detectTopics("Studiamo l'olocausto");
        expect(topics).toContain("history_violence");
      });

      it("should detect pubertà as biology_reproduction", () => {
        const topics = detectTopics("Domande sulla pubertà");
        expect(topics).toContain("biology_reproduction");
      });

      it("should detect ansia as health_mental", () => {
        const topics = detectTopics("Ho ansia per l'esame");
        expect(topics).toContain("health_mental");
      });

      it("should detect amicizia as social_relationships", () => {
        const topics = detectTopics("Problemi di amicizia a scuola");
        expect(topics).toContain("social_relationships");
      });

      it("should detect fidanzato as social_romance", () => {
        const topics = detectTopics("Il mio fidanzato");
        expect(topics).toContain("social_romance");
      });

      it("should detect politica as current_events", () => {
        const topics = detectTopics("Le notizie di politica");
        expect(topics).toContain("current_events");
      });

      it("should detect etica as philosophy_ethics", () => {
        const topics = detectTopics("Un dilemma etico");
        expect(topics).toContain("philosophy_ethics");
      });

      it("should detect economia as economics_finance", () => {
        const topics = detectTopics("Come funziona l'economia?");
        expect(topics).toContain("economics_finance");
      });
    });

    describe("English keywords", () => {
      it('should detect "World War" as history_war', () => {
        const topics = detectTopics("Studying World War II");
        expect(topics).toContain("history_war");
      });

      it('should detect "Holocaust" as history_violence', () => {
        const topics = detectTopics("The Holocaust was terrible");
        expect(topics).toContain("history_violence");
      });

      it('should detect "slavery" as history_violence', () => {
        const topics = detectTopics("Learning about slavery");
        expect(topics).toContain("history_violence");
      });
    });

    describe("case insensitivity", () => {
      it("should detect topics regardless of case", () => {
        expect(detectTopics("MATEMATICA")).toContain("basic_education");
        expect(detectTopics("MaTeMaTiCa")).toContain("basic_education");
        expect(detectTopics("matematica")).toContain("basic_education");
      });
    });

    describe("multiple topics", () => {
      it("should detect multiple topics in the same text", () => {
        const topics = detectTopics(
          "Voglio studiare matematica e anche la guerra mondiale",
        );
        expect(topics).toContain("basic_education");
        expect(topics).toContain("history_war");
        expect(topics.length).toBeGreaterThanOrEqual(2);
      });

      it("should detect all matching topics", () => {
        const topics = detectTopics(
          "Mi sento in ansia per il bullismo a scuola",
        );
        expect(topics).toContain("health_mental");
        expect(topics).toContain("social_relationships");
      });
    });

    describe("default behavior", () => {
      it("should default to basic_education when no topics detected", () => {
        const topics = detectTopics("Ciao, come stai?");
        expect(topics).toEqual(["basic_education"]);
      });

      it("should default to basic_education for empty string", () => {
        const topics = detectTopics("");
        expect(topics).toEqual(["basic_education"]);
      });

      it("should default to basic_education for unrelated text", () => {
        const topics = detectTopics("Il gatto è sul tappeto");
        expect(topics).toEqual(["basic_education"]);
      });
    });

    describe("edge cases", () => {
      it("should handle partial word matches", () => {
        const topics = detectTopics("matematiche"); // plural form
        expect(topics).toContain("basic_education");
      });

      it("should handle text with special characters", () => {
        const topics = detectTopics("La matematica è bella!");
        expect(topics).toContain("basic_education");
      });

      it("should handle very long text", () => {
        const longText = "a ".repeat(1000) + "matematica";
        const topics = detectTopics(longText);
        expect(topics).toContain("basic_education");
      });
    });
  });

  describe("filterForAge", () => {
    it("should return most restrictive result for multiple topics", () => {
      // Text contains both safe and blocked topics
      const text = "Voglio studiare matematica e parlare del mio fidanzato";
      const result = filterForAge(text, 8); // Elementary age

      // Should return blocked (most restrictive)
      expect(result.sensitivity).toBe("blocked");
      expect(result.appropriate).toBe(false);
      expect(result.handling).toBe("block");
    });

    it("should return moderate when combining safe and moderate topics", () => {
      const text = "Studiamo matematica e la guerra mondiale";
      const result = filterForAge(text, 8); // Elementary age

      // history_war is moderate for elementary, math is safe
      expect(result.sensitivity).toBe("moderate");
      expect(result.appropriate).toBe(true);
      expect(result.handling).toBe("simplify");
    });

    it("should return safe for only safe topics", () => {
      const text = "Voglio studiare matematica e scienza";
      const result = filterForAge(text, 8);

      expect(result.sensitivity).toBe("safe");
      expect(result.appropriate).toBe(true);
      expect(result.handling).toBe("allow");
    });

    it("should handle text with no detectable topics (defaults to basic_education)", () => {
      const text = "Ciao, come stai oggi?";
      const result = filterForAge(text, 8);

      expect(result.sensitivity).toBe("safe");
      expect(result.appropriate).toBe(true);
    });

    it("should correctly identify most restrictive among multiple restricted/blocked topics", () => {
      const text = "Parliamo di olocausto e del mio fidanzato";
      const result = filterForAge(text, 8);

      // history_violence (restricted) + social_romance (blocked) = blocked wins
      expect(result.sensitivity).toBe("blocked");
      expect(result.handling).toBe("block");
    });

    it("should handle age-appropriate content differently across age groups", () => {
      const text = "Voglio parlare del mio fidanzato";

      // Blocked for elementary
      const elementary = filterForAge(text, 8);
      expect(elementary.sensitivity).toBe("blocked");

      // Moderate for middle school
      const middle = filterForAge(text, 12);
      expect(middle.sensitivity).toBe("moderate");

      // Safe for highschool
      const highschool = filterForAge(text, 16);
      expect(highschool.sensitivity).toBe("safe");
    });

    it("should prioritize restricted over moderate", () => {
      // Text with moderate (history_war) and restricted (history_violence) topics
      const text = "Studiamo la guerra e l'olocausto";
      const result = filterForAge(text, 8);

      expect(result.sensitivity).toBe("restricted");
      expect(result.handling).toBe("redirect");
    });
  });

  describe("getLanguageGuidance", () => {
    it("should provide elementary-appropriate guidance for ages 6-10", () => {
      const guidance = getLanguageGuidance(8);

      expect(guidance).toContain("6-10 anni");
      expect(guidance).toContain("frasi brevi");
      expect(guidance).toContain("semplici");
      expect(guidance).toContain("max 10-15 parole");
      expect(guidance).toContain("amichevole");
    });

    it("should provide middle school guidance for ages 11-13", () => {
      const guidance = getLanguageGuidance(12);

      expect(guidance).toContain("11-13 anni");
      expect(guidance).toContain("media lunghezza");
      expect(guidance).toContain("vocabolario più avanzato");
      expect(guidance).toContain("analogie");
      expect(guidance).toContain("ragionamento critico");
    });

    it("should provide highschool guidance for ages 14-19", () => {
      const guidance = getLanguageGuidance(16);

      expect(guidance).toContain("14-19 anni");
      expect(guidance).toContain("Linguaggio standard");
      expect(guidance).toContain("vocabolario completo");
      expect(guidance).toContain("analisi critica");
      expect(guidance).toContain("maturità cognitiva");
    });

    it("should provide adult guidance for ages 20+", () => {
      const guidance = getLanguageGuidance(25);

      expect(guidance).toContain("adulti");
      expect(guidance).toContain("professionale");
      expect(guidance).toContain("Nessuna semplificazione");
      expect(guidance).toContain("approfondita");
    });

    it("should handle boundary ages correctly", () => {
      expect(getLanguageGuidance(10)).toContain("6-10 anni");
      expect(getLanguageGuidance(11)).toContain("11-13 anni");
      expect(getLanguageGuidance(13)).toContain("11-13 anni");
      expect(getLanguageGuidance(14)).toContain("14-19 anni");
    });
  });

  describe("getAgeGatePrompt", () => {
    it("should include age and bracket information", () => {
      const prompt = getAgeGatePrompt(8);

      expect(prompt).toContain("8 ANNI");
      expect(prompt).toContain("ELEMENTARY");
    });

    it("should include language guidance", () => {
      const prompt = getAgeGatePrompt(8);

      expect(prompt).toContain("ADATTAMENTO LINGUISTICO");
      expect(prompt).toContain("frasi brevi");
    });

    it("should include topic restrictions for elementary", () => {
      const prompt = getAgeGatePrompt(8);

      expect(prompt).toContain("ARGOMENTI SENSIBILI");
      // Should list some blocked/restricted topics
      expect(prompt.toLowerCase()).toMatch(/social.romance|literature.mature/);
    });

    it("should include fewer restrictions for highschool", () => {
      const elementary = getAgeGatePrompt(8);
      const highschool = getAgeGatePrompt(16);

      // Elementary should have more restrictions listed
      const elementaryRestrictions = (
        elementary.match(/BLOCKED|RESTRICTED/g) || []
      ).length;
      const highschoolRestrictions = (
        highschool.match(/BLOCKED|RESTRICTED/g) || []
      ).length;

      expect(elementaryRestrictions).toBeGreaterThan(highschoolRestrictions);
    });

    it("should include reminder to adapt content", () => {
      const prompt = getAgeGatePrompt(12);

      expect(prompt).toContain("RICORDA");
      expect(prompt).toContain("Adatta SEMPRE");
      expect(prompt).toContain("età dello studente");
    });

    it("should show no special restrictions for adults", () => {
      const prompt = getAgeGatePrompt(25);

      expect(prompt).toContain("Nessuna restrizione speciale");
    });

    it("should format different age brackets correctly", () => {
      const prompts = [
        { age: 8, bracket: "ELEMENTARY" },
        { age: 12, bracket: "MIDDLE" },
        { age: 16, bracket: "HIGHSCHOOL" },
        { age: 25, bracket: "ADULT" },
      ];

      prompts.forEach(({ age, bracket }) => {
        const prompt = getAgeGatePrompt(age);
        expect(prompt).toContain(bracket);
      });
    });
  });

  describe("error handling and edge cases", () => {
    it("should handle negative ages gracefully", () => {
      expect(getAgeBracket(-5)).toBe("elementary");
    });

    it("should handle very large ages", () => {
      expect(getAgeBracket(999)).toBe("adult");
    });

    it("should handle zero age", () => {
      expect(getAgeBracket(0)).toBe("elementary");
    });

    it("should handle decimal ages by truncating/rounding", () => {
      // JavaScript number comparison will handle this naturally
      expect(getAgeBracket(8.9)).toBe("elementary");
      expect(getAgeBracket(11.5)).toBe("middle");
    });

    it("should handle text with only whitespace", () => {
      const topics = detectTopics("   \n\t  ");
      expect(topics).toEqual(["basic_education"]);
    });

    it("should handle special characters in topic detection", () => {
      const topics = detectTopics("M@tem@tic@");
      expect(topics).toEqual(["basic_education"]); // Won't match due to special chars
    });

    it("should handle very long words in topic detection", () => {
      const longWord = "a".repeat(1000);
      const topics = detectTopics(longWord);
      expect(topics).toEqual(["basic_education"]);
    });
  });

  describe("sensitivity to handling mapping", () => {
    it("should map safe to allow", () => {
      const result = checkAgeGate("basic_education", 10);
      expect(result.sensitivity).toBe("safe");
      expect(result.handling).toBe("allow");
    });

    it("should map moderate to simplify", () => {
      const result = checkAgeGate("history_war", 8);
      expect(result.sensitivity).toBe("moderate");
      expect(result.handling).toBe("simplify");
    });

    it("should map restricted to redirect", () => {
      const result = checkAgeGate("history_violence", 8);
      expect(result.sensitivity).toBe("restricted");
      expect(result.handling).toBe("redirect");
    });

    it("should map blocked to block", () => {
      const result = checkAgeGate("social_romance", 8);
      expect(result.sensitivity).toBe("blocked");
      expect(result.handling).toBe("block");
    });
  });

  describe("guidance messages", () => {
    it("should provide appropriate guidance for each sensitivity level", () => {
      const safe = checkAgeGate("basic_education", 10);
      const moderate = checkAgeGate("history_war", 8);
      const restricted = checkAgeGate("history_violence", 8);
      const blocked = checkAgeGate("social_romance", 8);

      expect(safe.guidance).toContain("Nessun adattamento");
      expect(moderate.guidance).toContain("linguaggio semplificato");
      expect(restricted.guidance).toContain("strettamente necessario");
      expect(blocked.guidance).toContain("non è appropriato");
    });

    it("should provide guidance in Italian", () => {
      const result = checkAgeGate("history_war", 8);
      // Check for Italian words in the guidance
      expect(result.guidance).toMatch(/linguaggio|dettagli|tono/i);
    });
  });

  describe("real-world scenarios", () => {
    it("should handle a student asking about homework help", () => {
      const text = "Mi aiuti con i compiti di matematica?";
      const result = filterForAge(text, 10);

      expect(result.appropriate).toBe(true);
      expect(result.handling).toBe("allow");
    });

    it("should handle a student asking about friendship problems", () => {
      const text = "Ho litigato con la mia amica";
      const result = filterForAge(text, 9);

      expect(result.appropriate).toBe(true);
      expect(result.sensitivity).toBe("safe");
    });

    it("should handle inappropriate romantic content for young students", () => {
      const text = "Sono innamorato e voglio un fidanzato";
      const result = filterForAge(text, 8);

      expect(result.appropriate).toBe(false);
      expect(result.sensitivity).toBe("blocked");
      expect(result.alternative).toBeDefined();
    });

    it("should allow romantic content for older students", () => {
      const text = "Sono innamorato e voglio un fidanzato";
      const result = filterForAge(text, 16);

      expect(result.appropriate).toBe(true);
      expect(result.sensitivity).toBe("safe");
    });

    it("should handle complex historical topics appropriately by age", () => {
      const text = "Studiamo l'olocausto e i campi di concentramento";

      const elementary = filterForAge(text, 9);
      expect(elementary.appropriate).toBe(false);
      expect(elementary.sensitivity).toBe("restricted");

      const middle = filterForAge(text, 13);
      expect(middle.appropriate).toBe(true);
      expect(middle.sensitivity).toBe("moderate");

      const highschool = filterForAge(text, 17);
      expect(highschool.appropriate).toBe(true);
      expect(highschool.sensitivity).toBe("safe");
    });

    it("should handle mental health topics sensitively", () => {
      const text = "Mi sento triste e ho ansia";
      const result = filterForAge(text, 9);

      expect(result.appropriate).toBe(true);
      expect(result.sensitivity).toBe("moderate");
      expect(result.handling).toBe("simplify");
    });

    it("should allow current events with appropriate age filtering", () => {
      const text = "Cosa succede nelle notizie di oggi?";

      const elementary = filterForAge(text, 8);
      expect(elementary.sensitivity).toBe("restricted");

      const highschool = filterForAge(text, 16);
      expect(highschool.sensitivity).toBe("safe");
    });
  });
});

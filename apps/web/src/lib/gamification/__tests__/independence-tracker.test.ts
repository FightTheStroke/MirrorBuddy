/**
 * Independence Tracker Tests
 * Reference: Amodei "The Adolescence of Technology" (2026)
 * ADR 0115 - Amodei Safety Enhancements
 */

import { describe, it, expect } from "vitest";
import {
  analyzeIndependence,
  shouldCelebrateIndependence,
} from "../independence-tracker";
import { INDEPENDENCE_XP } from "@/lib/constants/xp-rewards";

describe("independence-tracker", () => {
  describe("analyzeIndependence - human help patterns", () => {
    it("should detect Italian parent help mentions", () => {
      expect(
        analyzeIndependence("ho chiesto a mio padre").mentionedHumanHelp,
      ).toBe(true);
      expect(
        analyzeIndependence("mio padre mi ha aiutato").mentionedHumanHelp,
      ).toBe(true);
      expect(
        analyzeIndependence("mia madre mi ha spiegato").mentionedHumanHelp,
      ).toBe(true);
      expect(
        analyzeIndependence("i miei genitori mi hanno aiutato")
          .mentionedHumanHelp,
      ).toBe(true);
    });

    it("should detect Italian teacher help mentions", () => {
      expect(
        analyzeIndependence("ho chiesto al mio professore").mentionedHumanHelp,
      ).toBe(true);
      expect(
        analyzeIndependence("la professoressa mi ha spiegato")
          .mentionedHumanHelp,
      ).toBe(true);
      expect(
        analyzeIndependence("ho parlato con il professore").mentionedHumanHelp,
      ).toBe(true);
    });

    it("should detect English parent help mentions", () => {
      expect(analyzeIndependence("my dad helped me").mentionedHumanHelp).toBe(
        true,
      );
      expect(analyzeIndependence("i asked my mom").mentionedHumanHelp).toBe(
        true,
      );
      expect(
        analyzeIndependence("my parents explained it").mentionedHumanHelp,
      ).toBe(true);
    });

    it("should detect English teacher help mentions", () => {
      expect(
        analyzeIndependence("my teacher helped me").mentionedHumanHelp,
      ).toBe(true);
      expect(analyzeIndependence("i asked my teacher").mentionedHumanHelp).toBe(
        true,
      );
      expect(
        analyzeIndependence("the teacher explained").mentionedHumanHelp,
      ).toBe(true);
    });

    it("should award correct XP for human help", () => {
      const result = analyzeIndependence("mio padre mi ha aiutato");
      expect(result.xpToAward).toBe(INDEPENDENCE_XP.HUMAN_HELP_MENTION);
    });
  });

  describe("analyzeIndependence - study group patterns", () => {
    it("should detect Italian study group mentions", () => {
      expect(
        analyzeIndependence("ho studiato con un amico").mentionedStudyGroup,
      ).toBe(true);
      expect(
        analyzeIndependence("abbiamo studiato insieme").mentionedStudyGroup,
      ).toBe(true);
      expect(
        analyzeIndependence("il mio compagno mi ha aiutato")
          .mentionedStudyGroup,
      ).toBe(true);
      expect(
        analyzeIndependence("studiando in gruppo").mentionedStudyGroup,
      ).toBe(true);
    });

    it("should detect English study group mentions", () => {
      expect(
        analyzeIndependence("i studied with a friend").mentionedStudyGroup,
      ).toBe(true);
      expect(
        analyzeIndependence("we studied together").mentionedStudyGroup,
      ).toBe(true);
      expect(
        analyzeIndependence("my friend helped me").mentionedStudyGroup,
      ).toBe(true);
      expect(
        analyzeIndependence("studying in a group").mentionedStudyGroup,
      ).toBe(true);
    });

    it("should award correct XP for study group", () => {
      const result = analyzeIndependence("ho studiato con un amico");
      expect(result.xpToAward).toBe(INDEPENDENCE_XP.STUDY_GROUP_MENTION);
    });
  });

  describe("analyzeIndependence - independent solution patterns", () => {
    it("should detect Italian independent solution mentions", () => {
      expect(
        analyzeIndependence("ho risolto da solo").mentionedIndependentSolution,
      ).toBe(true);
      expect(
        analyzeIndependence("ce l'ho fatta da solo")
          .mentionedIndependentSolution,
      ).toBe(true);
      expect(
        analyzeIndependence("ce l'ho fatta da sola")
          .mentionedIndependentSolution,
      ).toBe(true);
      expect(
        analyzeIndependence("sono riuscito da solo")
          .mentionedIndependentSolution,
      ).toBe(true);
      expect(
        analyzeIndependence("ho capito da sola").mentionedIndependentSolution,
      ).toBe(true);
    });

    it("should detect English independent solution mentions", () => {
      expect(
        analyzeIndependence("i solved it by myself")
          .mentionedIndependentSolution,
      ).toBe(true);
      expect(
        analyzeIndependence("i figured it out on my own")
          .mentionedIndependentSolution,
      ).toBe(true);
      expect(
        analyzeIndependence("i did it by myself").mentionedIndependentSolution,
      ).toBe(true);
      expect(
        analyzeIndependence("i managed on my own").mentionedIndependentSolution,
      ).toBe(true);
    });

    it("should award correct XP for independent solution", () => {
      const result = analyzeIndependence("ho risolto da solo");
      expect(result.xpToAward).toBe(INDEPENDENCE_XP.SOLVED_INDEPENDENTLY);
    });
  });

  describe("analyzeIndependence - combined patterns", () => {
    it("should detect multiple patterns and sum XP", () => {
      const result = analyzeIndependence(
        "mio padre mi ha aiutato e poi ho risolto da solo",
      );
      expect(result.mentionedHumanHelp).toBe(true);
      expect(result.mentionedIndependentSolution).toBe(true);
      expect(result.xpToAward).toBe(
        INDEPENDENCE_XP.HUMAN_HELP_MENTION +
          INDEPENDENCE_XP.SOLVED_INDEPENDENTLY,
      );
    });

    it("should return zero XP for neutral messages", () => {
      const result = analyzeIndependence("Aiutami con la matematica");
      expect(result.mentionedHumanHelp).toBe(false);
      expect(result.mentionedStudyGroup).toBe(false);
      expect(result.mentionedIndependentSolution).toBe(false);
      expect(result.xpToAward).toBe(0);
    });

    it("should track detected patterns for logging", () => {
      const result = analyzeIndependence("ho studiato con un amico");
      expect(result.detectedPatterns.length).toBeGreaterThan(0);
      expect(result.detectedPatterns[0]).toContain("study_group:");
    });
  });

  describe("shouldCelebrateIndependence", () => {
    it("should celebrate independent solutions with highest priority", () => {
      const result = shouldCelebrateIndependence(
        "mio padre mi ha aiutato e poi ho risolto da solo",
      );
      expect(result.celebrate).toBe(true);
      expect(result.type).toBe("independent");
    });

    it("should celebrate human help", () => {
      const result = shouldCelebrateIndependence("mio padre mi ha aiutato");
      expect(result.celebrate).toBe(true);
      expect(result.type).toBe("human_help");
    });

    it("should celebrate study groups", () => {
      const result = shouldCelebrateIndependence("ho studiato con un amico");
      expect(result.celebrate).toBe(true);
      expect(result.type).toBe("study_group");
    });

    it("should not celebrate neutral messages", () => {
      const result = shouldCelebrateIndependence("Cos'è la fotosintesi?");
      expect(result.celebrate).toBe(false);
      expect(result.type).toBeNull();
    });
  });
});

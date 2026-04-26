/**
 * Character Router Tests
 *
 * Tests the Support Triangle routing system.
 * Verifies correct character selection based on:
 * - Intent type (academic, method, emotional, crisis)
 * - Student preferences (coach/buddy gender)
 * - Subject matter
 * - Conversation continuity
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  routeToCharacter,
  quickRoute,
  getBuddyForStudent,
  getCharacterGreeting,
  suggestCharacterSwitch,
  type RoutingContext,
} from "../character-router";
import type { ExtendedStudentProfile } from "@/types";

describe("Character Router", () => {
  // Default student profile for tests
  let defaultProfile: ExtendedStudentProfile;

  beforeEach(() => {
    defaultProfile = {
      name: "Test Student",
      age: 14,
      schoolYear: 2,
      schoolLevel: "superiore",
      fontSize: "medium",
      highContrast: false,
      dyslexiaFont: false,
      voiceEnabled: false,
      simplifiedLanguage: false,
      adhdMode: false,
      learningDifferences: ["dyslexia"],
    };
  });

  // =========================================================================
  // ACADEMIC ROUTING
  // =========================================================================

  describe("Academic Help Routing", () => {
    it("should route math questions to math Maestro", () => {
      const context: RoutingContext = {
        message: "Non capisco le equazioni di secondo grado",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("maestro");
      expect(result.intent.subject).toBe("mathematics");
    });

    it("should route physics questions to physics Maestro", () => {
      const context: RoutingContext = {
        message: "Spiegami le leggi di Newton",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("maestro");
      expect(result.intent.subject).toBe("physics");
    });

    it("should route history questions to history Maestro", () => {
      const context: RoutingContext = {
        message: "Parlami del Risorgimento italiano",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("maestro");
      expect(result.intent.subject).toBe("history");
    });

    it("should include alternatives when emotional indicators present", () => {
      const context: RoutingContext = {
        message: "Non capisco la matematica, sono frustrato!",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("maestro");
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives!.length).toBeGreaterThan(0);
    });

    it("should fallback to coach when no subject detected", () => {
      const context: RoutingContext = {
        message: "Mi aiuti con i compiti?",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      // Generic academic help without subject goes to coach
      expect(["coach", "maestro"]).toContain(result.characterType);
    });
  });

  // =========================================================================
  // METHOD HELP ROUTING
  // =========================================================================

  describe("Method Help Routing", () => {
    it("should route study method questions to Coach", () => {
      // Pattern: metodo di studio|come mi organizzo
      const context: RoutingContext = {
        message: "Mi serve un metodo di studio",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("coach");
      expect(result.intent.type).toBe("method_help");
    });

    it("should route concentration questions to Coach", () => {
      const context: RoutingContext = {
        message: "Non riesco a concentrarmi quando studio",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("coach");
    });

    it("should route organization questions to Coach", () => {
      const context: RoutingContext = {
        message: "Come mi organizzo per gli esami?",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("coach");
    });
  });

  // =========================================================================
  // EMOTIONAL SUPPORT ROUTING
  // =========================================================================

  describe("Emotional Support Routing", () => {
    it("should route emotional support needs to Buddy", () => {
      const context: RoutingContext = {
        message: "Mi sento solo e triste",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("buddy");
      expect(result.intent.type).toBe("emotional_support");
    });

    it("should route loneliness to Buddy", () => {
      const context: RoutingContext = {
        message: "Nessuno mi capisce, mi sento escluso",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("buddy");
    });

    it("should include Coach as alternative for emotional support", () => {
      const context: RoutingContext = {
        message: "Sono molto ansioso per la scuola",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("buddy");
      expect(result.alternatives).toBeDefined();
    });
  });

  // =========================================================================
  // CRISIS ROUTING
  // =========================================================================

  describe("Crisis Routing", () => {
    it("should route crisis to Buddy with high priority", () => {
      // Pattern: voglio morire|non voglio vivere (without "più")
      const context: RoutingContext = {
        message: "Voglio morire",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("buddy");
      expect(result.intent.type).toBe("crisis");
      expect(result.intent.confidence).toBe(1.0);
    });

    it("should prioritize crisis over academic content", () => {
      // Pattern: voglio morire|non voglio vivere
      const context: RoutingContext = {
        message: "Non voglio vivere, odio la matematica",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("buddy");
      expect(result.intent.type).toBe("crisis");
    });

    it("should override continuity preference for crisis", () => {
      const context: RoutingContext = {
        message: "Voglio morire",
        studentProfile: defaultProfile,
        currentCharacter: { type: "maestro", id: "euclide" },
        preferContinuity: true,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("buddy");
      expect(result.intent.type).toBe("crisis");
    });
  });

  // =========================================================================
  // TOOL REQUEST ROUTING
  // =========================================================================

  describe("Tool Request Routing", () => {
    it("should route tool requests with subject to Maestro", () => {
      const context: RoutingContext = {
        message: "Creami una mappa mentale sulla storia",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("maestro");
      expect(result.intent.type).toBe("tool_request");
    });

    it("should route tool requests without subject to Coach", () => {
      const context: RoutingContext = {
        message: "Vorrei creare delle flashcard",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      // Without subject, might go to coach
      expect(["coach", "maestro"]).toContain(result.characterType);
    });
  });

  // =========================================================================
  // STUDENT PREFERENCES
  // =========================================================================

  describe("Student Preferences", () => {
    it("should respect preferred Coach", () => {
      const profileWithPreference: ExtendedStudentProfile = {
        ...defaultProfile,
        preferredCoach: "roberto",
      };

      const context: RoutingContext = {
        message: "Come mi organizzo?",
        studentProfile: profileWithPreference,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("coach");
      expect((result.character as { id: string }).id).toBe("roberto");
    });

    it("should respect preferred Buddy", () => {
      const profileWithPreference: ExtendedStudentProfile = {
        ...defaultProfile,
        preferredBuddy: "noemi",
      };

      const context: RoutingContext = {
        message: "Mi sento solo",
        studentProfile: profileWithPreference,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("buddy");
      expect((result.character as { id: string }).id).toBe("noemi");
    });

    it("should use default Coach when no preference", () => {
      const context: RoutingContext = {
        message: "Come studio?",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("coach");
      // Default is Melissa
      expect((result.character as { id: string }).id).toBe("melissa");
    });
  });

  // =========================================================================
  // CONVERSATION CONTINUITY
  // =========================================================================

  describe("Conversation Continuity", () => {
    it("should maintain character when preferContinuity is true and confidence is low", () => {
      const context: RoutingContext = {
        message: "Ok, capisco",
        studentProfile: defaultProfile,
        currentCharacter: { type: "maestro", id: "euclide" },
        preferContinuity: true,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("maestro");
      expect(result.reason).toContain("Continuing");
    });

    it("should switch character for high-confidence new intent", () => {
      const context: RoutingContext = {
        message: "Mi sento molto solo e triste, nessuno mi capisce",
        studentProfile: defaultProfile,
        currentCharacter: { type: "maestro", id: "euclide" },
        preferContinuity: true,
      };

      const result = routeToCharacter(context);
      // Should switch to buddy despite continuity preference
      expect(result.characterType).toBe("buddy");
    });
  });

  // =========================================================================
  // QUICK ROUTE
  // =========================================================================

  describe("Quick Route", () => {
    it("should work with just a message", () => {
      // Pattern: matematica|equazion|algebra|calcol|derivat|integral
      const result = quickRoute("Spiegami la matematica");
      expect(result.characterType).toBe("maestro");
      expect(result.intent.subject).toBe("mathematics");
    });

    it("should route general chat to coach", () => {
      const result = quickRoute("Ciao");
      expect(result.characterType).toBe("coach");
    });
  });

  // =========================================================================
  // BUDDY FOR STUDENT
  // =========================================================================

  describe("getBuddyForStudent", () => {
    it("should return Mario by default", () => {
      const buddy = getBuddyForStudent(defaultProfile);
      expect(buddy.id).toBe("mario");
    });

    it("should return Noemi when preferred", () => {
      const profileWithNoemi: ExtendedStudentProfile = {
        ...defaultProfile,
        preferredBuddy: "noemi",
      };
      const buddy = getBuddyForStudent(profileWithNoemi);
      expect(buddy.id).toBe("noemi");
    });
  });

  // =========================================================================
  // CHARACTER GREETING
  // =========================================================================

  describe("getCharacterGreeting", () => {
    it("should return greeting for Maestro", () => {
      const result = quickRoute("Spiegami la storia");
      const greeting = getCharacterGreeting(result, defaultProfile);
      expect(greeting).toBeDefined();
      expect(greeting.length).toBeGreaterThan(0);
    });

    it("should return greeting for Coach", () => {
      const result = quickRoute("Come studio?");
      const greeting = getCharacterGreeting(result, defaultProfile);
      expect(greeting).toBeDefined();
      expect(greeting.length).toBeGreaterThan(0);
    });

    it("should return personalized greeting for Buddy", () => {
      const result = quickRoute("Mi sento solo");
      const greeting = getCharacterGreeting(result, defaultProfile);
      expect(greeting).toBeDefined();
      // Buddy greetings are personalized based on profile
      expect(greeting.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // SUGGEST CHARACTER SWITCH
  // =========================================================================

  describe("suggestCharacterSwitch", () => {
    it("should suggest Coach with personalized message", () => {
      const suggestion = suggestCharacterSwitch(
        "maestro",
        "coach",
        defaultProfile,
        "Per organizzarti meglio",
      );

      expect(suggestion.character).toBeDefined();
      expect(suggestion.message).toContain("Per organizzarti meglio");
    });

    it("should suggest Buddy with personalized message", () => {
      const suggestion = suggestCharacterSwitch(
        "maestro",
        "buddy",
        defaultProfile,
        "Se vuoi parlare",
      );

      expect(suggestion.character).toBeDefined();
      expect(suggestion.message).toContain("ti capisce");
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe("Edge Cases", () => {
    it("should handle empty message", () => {
      const context: RoutingContext = {
        message: "",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.characterType).toBe("coach");
      expect(result.intent.type).toBe("general_chat");
    });

    it("should handle unknown subject gracefully", () => {
      const context: RoutingContext = {
        message: "Spiegami qualcosa",
        studentProfile: defaultProfile,
      };

      const result = routeToCharacter(context);
      expect(result.character).toBeDefined();
    });

    it("should always return a valid character", () => {
      const messages = ["", "   ", "asdfghjkl", "12345", "Come?", "Perché?"];

      for (const msg of messages) {
        const result = quickRoute(msg);
        expect(result.character).toBeDefined();
        expect(result.characterType).toBeDefined();
      }
    });
  });
});

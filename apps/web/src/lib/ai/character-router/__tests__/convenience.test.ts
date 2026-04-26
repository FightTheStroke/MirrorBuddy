/**
 * Character Router Convenience Functions Tests
 */

import { describe, it, expect, vi } from "vitest";
import {
  quickRoute,
  getCharacterGreeting,
  getCharacterSystemPrompt,
  suggestCharacterSwitch,
} from "../convenience";
import type {
  ExtendedStudentProfile,
  BuddyProfile as _BuddyProfile,
} from "@/types";
import type { RoutingResult } from "../types";
import type { MaestroFull as _MaestroFull } from "@/data/maestri";

// Test helper to create mock RoutingResult without full intent object
const mockRoutingResult = (partial: {
  character: unknown;
  characterType: string;
  confidence: number;
  reason: string;
}) => partial as unknown as RoutingResult;

// Mock dependencies
vi.mock("@/lib/safety", () => ({
  injectSafetyGuardrails: vi.fn((prompt) => `[SAFE] ${prompt}`),
}));

vi.mock("../routing", () => ({
  routeToCharacter: vi.fn(({ message: _message }) => ({
    character: {
      id: "test-maestro",
      name: "Test Maestro",
      subject: "mathematics",
      greeting: "Ciao! Sono il tuo maestro.",
      systemPrompt: "You are a math teacher.",
    },
    characterType: "maestro",
    confidence: 0.9,
    reason: "Math question detected",
  })),
}));

vi.mock("../selection", () => ({
  getMaestroForSubject: vi.fn(() => ({
    id: "math-maestro",
    name: "Euclide",
    subject: "mathematics",
    greeting: "Salve!",
    systemPrompt: "You are Euclide.",
  })),
  getCoachForStudent: vi.fn(() => ({
    id: "coach-1",
    name: "Coach Elena",
    greeting: "Ciao! Sono Coach Elena.",
    systemPrompt: "You are a supportive coach.",
  })),
  getBuddyForStudent: vi.fn(() => ({
    id: "buddy-1",
    name: "Max",
    getGreeting: ({ student }: { student: ExtendedStudentProfile }) =>
      `Ehi ${student.name}!`,
    getSystemPrompt: () => "You are a friendly buddy.",
  })),
}));

const createProfile = (): ExtendedStudentProfile => ({
  name: "Mario",
  age: 14,
  schoolYear: 2,
  schoolLevel: "superiore",
  fontSize: "medium",
  highContrast: false,
  dyslexiaFont: false,
  voiceEnabled: false,
  simplifiedLanguage: false,
  adhdMode: false,
  learningDifferences: [],
});

describe("character router convenience", () => {
  describe("quickRoute", () => {
    it("should route message with default profile", () => {
      const result = quickRoute("Spiegami le equazioni");

      expect(result).toBeDefined();
      expect(result.character).toBeDefined();
    });

    it("should return routing result with character type", () => {
      const result = quickRoute("Ciao");

      expect(result.characterType).toBeDefined();
    });
  });

  describe("getCharacterGreeting", () => {
    it("should return maestro greeting", () => {
      const result = mockRoutingResult({
        character: {
          id: "maestro-1",
          name: "Galileo",
          subject: "physics",
          greeting: "Benvenuto allo studio!",
          systemPrompt: "",
        },
        characterType: "maestro",
        confidence: 0.9,
        reason: "test",
      });

      const greeting = getCharacterGreeting(result, createProfile());

      expect(greeting).toBe("Benvenuto allo studio!");
    });

    it("should return coach greeting", () => {
      const result = mockRoutingResult({
        character: {
          id: "coach-1",
          name: "Coach Elena",
          greeting: "Come posso aiutarti?",
          systemPrompt: "",
        },
        characterType: "coach",
        confidence: 0.9,
        reason: "test",
      });

      const greeting = getCharacterGreeting(result, createProfile());

      expect(greeting).toBe("Come posso aiutarti?");
    });

    it("should return buddy greeting using profile", () => {
      const profile = createProfile();
      const result = mockRoutingResult({
        character: {
          id: "buddy-1",
          name: "Max",
          getGreeting: ({ student }: { student: ExtendedStudentProfile }) =>
            `Ehi ${student.name}! Tutto bene?`,
          getSystemPrompt: () => "",
        },
        characterType: "buddy",
        confidence: 0.9,
        reason: "test",
      });

      const greeting = getCharacterGreeting(result, profile);

      expect(greeting).toBe("Ehi Mario! Tutto bene?");
    });

    it("should return default greeting for unknown type", () => {
      const result = mockRoutingResult({
        character: { id: "unknown", name: "Unknown" },
        characterType: "unknown",
        confidence: 0.5,
        reason: "test",
      });

      const greeting = getCharacterGreeting(result, createProfile());

      expect(greeting).toBe("Ciao! Come posso aiutarti?");
    });
  });

  describe("getCharacterSystemPrompt", () => {
    it("should inject safety into maestro prompt", () => {
      const result = mockRoutingResult({
        character: {
          id: "maestro-1",
          name: "Galileo",
          subject: "physics",
          greeting: "",
          systemPrompt: "You are Galileo.",
        },
        characterType: "maestro",
        confidence: 0.9,
        reason: "test",
      });

      const prompt = getCharacterSystemPrompt(result, createProfile());

      expect(prompt).toContain("[SAFE]");
    });

    it("should return coach system prompt directly", () => {
      const result = mockRoutingResult({
        character: {
          id: "coach-1",
          name: "Coach",
          greeting: "",
          systemPrompt: "You are a coach.",
        },
        characterType: "coach",
        confidence: 0.9,
        reason: "test",
      });

      const prompt = getCharacterSystemPrompt(result, createProfile());

      expect(prompt).toBe("You are a coach.");
    });

    it("should get buddy system prompt using profile", () => {
      const profile = createProfile();
      const result = mockRoutingResult({
        character: {
          id: "buddy-1",
          name: "Max",
          getGreeting: () => "",
          getSystemPrompt: (p: ExtendedStudentProfile) => `Buddy for ${p.name}`,
        },
        characterType: "buddy",
        confidence: 0.9,
        reason: "test",
      });

      const prompt = getCharacterSystemPrompt(result, profile);

      expect(prompt).toBe("Buddy for Mario");
    });

    it("should return empty string for unknown type", () => {
      const result = mockRoutingResult({
        character: { id: "unknown", name: "Unknown" },
        characterType: "unknown",
        confidence: 0.5,
        reason: "test",
      });

      const prompt = getCharacterSystemPrompt(result, createProfile());

      expect(prompt).toBe("");
    });
  });

  describe("suggestCharacterSwitch", () => {
    it("should suggest maestro switch", () => {
      const profile = createProfile();

      const result = suggestCharacterSwitch(
        "buddy",
        "maestro",
        profile,
        "Hai bisogno di aiuto con la matematica.",
      );

      expect(result.character).toBeDefined();
      expect(result.message).toContain(
        "Hai bisogno di aiuto con la matematica.",
      );
      expect(result.message).toContain("Professore");
    });

    it("should suggest coach switch", () => {
      const profile = createProfile();

      const result = suggestCharacterSwitch(
        "maestro",
        "coach",
        profile,
        "Sembra che tu abbia bisogno di supporto.",
      );

      expect(result.character).toBeDefined();
      expect(result.character.name).toBe("Coach Elena");
    });

    it("should suggest buddy switch", () => {
      const profile = createProfile();

      const result = suggestCharacterSwitch(
        "maestro",
        "buddy",
        profile,
        "Vuoi fare una pausa?",
      );

      expect(result.character).toBeDefined();
      expect(result.character.name).toBe("Max");
    });

    it("should default to coach for unknown type", () => {
      const profile = createProfile();

      const result = suggestCharacterSwitch(
        "maestro",
        "unknown" as "coach",
        profile,
        "Test reason",
      );

      expect(result.character).toBeDefined();
      expect(result.message).toBe("Test reason");
    });
  });
});

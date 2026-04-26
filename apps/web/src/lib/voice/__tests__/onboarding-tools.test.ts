/**
 * Tests for onboarding-tools.ts
 * Issue #73, #74: Landing page with returning user support
 *
 * @vitest-environment jsdom
 * @module voice/__tests__/onboarding-tools.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateMelissaOnboardingPrompt,
  executeOnboardingTool,
  isOnboardingTool,
  getOnboardingDataSummary,
  ONBOARDING_TOOLS,
  type ExistingUserDataForPrompt,
} from "../onboarding-tools";

// Mock the onboarding store
const mockStoreState: {
  data: {
    name: string;
    age?: number;
    schoolLevel?: "elementare" | "media" | "superiore";
    learningDifferences: string[];
  };
  updateData: ReturnType<typeof vi.fn>;
  nextStep: ReturnType<typeof vi.fn>;
  prevStep: ReturnType<typeof vi.fn>;
  currentStep: string;
} = {
  data: {
    name: "",
    age: undefined,
    schoolLevel: undefined,
    learningDifferences: [],
  },
  updateData: vi.fn(),
  nextStep: vi.fn(),
  prevStep: vi.fn(),
  currentStep: "welcome",
};

vi.mock("@/lib/stores/onboarding-store", () => ({
  useOnboardingStore: {
    getState: () => mockStoreState,
  },
}));

// Mock logger
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

describe("onboarding-tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.data = {
      name: "",
      age: undefined,
      schoolLevel: undefined,
      learningDifferences: [],
    };
  });

  // ============================================================================
  // generateMelissaOnboardingPrompt
  // ============================================================================
  describe("generateMelissaOnboardingPrompt", () => {
    it("generates new user prompt when no existing data", () => {
      const prompt = generateMelissaOnboardingPrompt(null);

      expect(prompt).toContain("Sei Melissa");
      expect(prompt).toContain("nuovo studente");
      expect(prompt).toContain("Come ti chiami?");
      expect(prompt).not.toContain("UTENTE DI RITORNO");
    });

    it("generates returning user prompt with name", () => {
      const existingData: ExistingUserDataForPrompt = {
        name: "Marco",
      };

      const prompt = generateMelissaOnboardingPrompt(existingData);

      expect(prompt).toContain("Marco");
      expect(prompt).toContain("UTENTE DI RITORNO");
      expect(prompt).toContain("È bello rivederti");
      expect(prompt).toContain("NON chiedere il nome");
    });

    it("includes age in returning user context", () => {
      const existingData: ExistingUserDataForPrompt = {
        name: "Sofia",
        age: 12,
      };

      const prompt = generateMelissaOnboardingPrompt(existingData);

      expect(prompt).toContain("Sofia");
      expect(prompt).toContain("12 anni");
    });

    it("includes school level in returning user context", () => {
      const existingData: ExistingUserDataForPrompt = {
        name: "Luca",
        schoolLevel: "media",
      };

      const prompt = generateMelissaOnboardingPrompt(existingData);

      expect(prompt).toContain("Luca");
      expect(prompt).toContain("scuola media");
    });

    it("includes learning differences in returning user context", () => {
      const existingData: ExistingUserDataForPrompt = {
        name: "Emma",
        learningDifferences: ["dyslexia", "adhd"],
      };

      const prompt = generateMelissaOnboardingPrompt(existingData);

      expect(prompt).toContain("Emma");
      expect(prompt).toContain("dislessia");
      expect(prompt).toContain("ADHD");
    });

    it("includes instructions for next_onboarding_step when returning user confirms", () => {
      const existingData: ExistingUserDataForPrompt = {
        name: "Giovanni",
      };

      const prompt = generateMelissaOnboardingPrompt(existingData);

      expect(prompt).toContain("next_onboarding_step");
      expect(prompt).toContain("Se lo studente dice che va tutto bene");
    });
  });

  // ============================================================================
  // executeOnboardingTool
  // ============================================================================
  describe("executeOnboardingTool", () => {
    it("sets student name successfully", async () => {
      const result = await executeOnboardingTool("set_student_name", {
        name: "Marco",
      });

      expect(result.success).toBe(true);
      expect(mockStoreState.updateData).toHaveBeenCalledWith({ name: "Marco" });
    });

    it("rejects empty name", async () => {
      const result = await executeOnboardingTool("set_student_name", {
        name: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Nome non valido");
    });

    it("rejects name too short", async () => {
      const result = await executeOnboardingTool("set_student_name", {
        name: "A",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("almeno 2 caratteri");
    });

    it("rejects name too long", async () => {
      const longName = "A".repeat(60);
      const result = await executeOnboardingTool("set_student_name", {
        name: longName,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("troppo lungo");
    });

    it("sets student age successfully", async () => {
      const result = await executeOnboardingTool("set_student_age", {
        age: 12,
      });

      expect(result.success).toBe(true);
      expect(mockStoreState.updateData).toHaveBeenCalledWith({ age: 12 });
    });

    it("rejects age below 6", async () => {
      const result = await executeOnboardingTool("set_student_age", { age: 5 });

      expect(result.success).toBe(false);
      expect(result.error).toContain("6 e 19");
    });

    it("rejects age above 19", async () => {
      const result = await executeOnboardingTool("set_student_age", {
        age: 20,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("6 e 19");
    });

    it("sets school level successfully", async () => {
      const result = await executeOnboardingTool("set_school_level", {
        level: "media",
      });

      expect(result.success).toBe(true);
      expect(mockStoreState.updateData).toHaveBeenCalledWith({
        schoolLevel: "media",
      });
    });

    it("rejects invalid school level", async () => {
      const result = await executeOnboardingTool("set_school_level", {
        level: "universita",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("non valido");
    });

    it("sets learning differences successfully", async () => {
      const result = await executeOnboardingTool("set_learning_differences", {
        differences: ["dyslexia", "adhd"],
      });

      expect(result.success).toBe(true);
      expect(mockStoreState.updateData).toHaveBeenCalledWith({
        learningDifferences: ["dyslexia", "adhd"],
      });
    });

    it("filters invalid learning differences", async () => {
      const result = await executeOnboardingTool("set_learning_differences", {
        differences: ["dyslexia", "invalid_diff", "adhd"],
      });

      expect(result.success).toBe(true);
      expect(mockStoreState.updateData).toHaveBeenCalledWith({
        learningDifferences: ["dyslexia", "adhd"],
      });
    });

    it("advances to next step", async () => {
      const result = await executeOnboardingTool("next_onboarding_step", {});

      expect(result.success).toBe(true);
      expect(mockStoreState.nextStep).toHaveBeenCalled();
    });

    it("goes back to previous step", async () => {
      const result = await executeOnboardingTool("prev_onboarding_step", {});

      expect(result.success).toBe(true);
      expect(mockStoreState.prevStep).toHaveBeenCalled();
    });

    it("handles unknown tool", async () => {
      const result = await executeOnboardingTool("unknown_tool", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("sconosciuto");
    });
  });

  // ============================================================================
  // isOnboardingTool
  // ============================================================================
  describe("isOnboardingTool", () => {
    it("returns true for valid onboarding tools", () => {
      expect(isOnboardingTool("set_student_name")).toBe(true);
      expect(isOnboardingTool("set_student_age")).toBe(true);
      expect(isOnboardingTool("set_school_level")).toBe(true);
      expect(isOnboardingTool("set_learning_differences")).toBe(true);
      expect(isOnboardingTool("next_onboarding_step")).toBe(true);
      expect(isOnboardingTool("prev_onboarding_step")).toBe(true);
    });

    it("returns false for non-onboarding tools", () => {
      expect(isOnboardingTool("create_mindmap")).toBe(false);
      expect(isOnboardingTool("generate_quiz")).toBe(false);
      expect(isOnboardingTool("random_tool")).toBe(false);
    });
  });

  // ============================================================================
  // getOnboardingDataSummary
  // ============================================================================
  describe("getOnboardingDataSummary", () => {
    it('returns "nessun dato" when no data collected', () => {
      const summary = getOnboardingDataSummary();
      expect(summary).toBe("nessun dato raccolto ancora");
    });

    it("includes name in summary", () => {
      mockStoreState.data.name = "Marco";
      const summary = getOnboardingDataSummary();
      expect(summary).toContain("nome: Marco");
    });

    it("includes all collected data in summary", () => {
      mockStoreState.data = {
        name: "Sofia",
        age: 14,
        schoolLevel: "superiore",
        learningDifferences: ["dyslexia"],
      };
      const summary = getOnboardingDataSummary();
      expect(summary).toContain("nome: Sofia");
      expect(summary).toContain("età: 14 anni");
      expect(summary).toContain("scuola superiore");
      expect(summary).toContain("dislessia");
    });
  });

  // ============================================================================
  // ONBOARDING_TOOLS constant
  // ============================================================================
  describe("ONBOARDING_TOOLS", () => {
    it("has correct tool definitions", () => {
      expect(ONBOARDING_TOOLS).toHaveLength(8);

      const toolNames = ONBOARDING_TOOLS.map((t) => t.name);
      expect(toolNames).toContain("set_student_name");
      expect(toolNames).toContain("set_student_age");
      expect(toolNames).toContain("set_school_level");
      expect(toolNames).toContain("set_learning_differences");
      expect(toolNames).toContain("set_student_gender");
      expect(toolNames).toContain("confirm_step_data");
      expect(toolNames).toContain("next_onboarding_step");
      expect(toolNames).toContain("prev_onboarding_step");
    });

    it("all tools have required properties", () => {
      for (const tool of ONBOARDING_TOOLS) {
        expect(tool.type).toBe("function");
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeDefined();
      }
    });
  });
});

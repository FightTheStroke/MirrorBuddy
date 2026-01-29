import { describe, it, expect, beforeAll } from "vitest";
import { researchService } from "../research-service";
import { SYNTHETIC_PROFILES } from "../synthetic-students";

/**
 * 🧬 Pedagogical Regression Tests
 * 
 * These tests validate that our AI Maestri maintain high pedagogical quality
 * across different student profiles.
 */
describe("Pedagogical Scaffolding Validation", () => {
  
  // Test Euclide with ADHD profile
  it("Euclid should maintain high scaffolding score with ADHD students", async () => {
    // We skip real LLM calls in standard CI, but this can be run in 'research mode'
    if (!process.env.RUN_SCIENTIFIC_SIMULATIONS) {
      console.log("Skipping real LLM simulation (RUN_SCIENTIFIC_SIMULATIONS not set)");
      return;
    }

    const result = await researchService.runAndRecordSimulation({
      maestroId: "euclide",
      maestroSystemPrompt: "You are Euclid, teaching geometry using the Socratic method.",
      studentProfile: "ADHD",
      turns: 3,
      subject: "Pythagorean Theorem"
    });

    console.log(`Scaffolding Score: ${result.metrics.scaffoldingScore}`);
    
    // Threshold: We expect at least 0.7 for scaffolding
    expect(result.metrics.scaffoldingScore).toBeGreaterThan(0.7);
    expect(result.metrics.engagementRetained).toBeGreaterThan(0.6);
  });

  // Test Feynman with Dyslexia profile
  it("Feynman should provide visual-friendly scaffolding for Dyslexic students", async () => {
    if (!process.env.RUN_SCIENTIFIC_SIMULATIONS) return;

    const result = await researchService.runAndRecordSimulation({
      maestroId: "feynman",
      maestroSystemPrompt: "You are Richard Feynman, explaining complex physics simply.",
      studentProfile: "Dyslexia",
      turns: 3,
      subject: "Quantum Entanglement"
    });

    expect(result.metrics.conciseness).toBeGreaterThan(0.5);
  });
});

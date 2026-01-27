/**
 * Test suite for Molière maestro
 * Verifies structure, exports, and formality settings
 */
import { describe, it, expect } from "vitest";
import { getMaestroById, getAllSubjects, SUBJECT_NAMES } from "../index";
import { isFormalProfessor } from "@/lib/greeting/templates";

describe("Molière Maestro", () => {
  it("should be exported and accessible by ID", () => {
    const moliere = getMaestroById("moliere-french");
    expect(moliere).toBeDefined();
    expect(moliere?.id).toBe("moliere-french");
    expect(moliere?.name).toBe("moliere-french");
  });

  it("should have correct display name", () => {
    const moliere = getMaestroById("moliere-french");
    expect(moliere?.displayName).toBe("Molière");
  });

  it("should have french as subject", () => {
    const moliere = getMaestroById("moliere-french");
    expect(moliere?.subject).toBe("french");
  });

  it("should have french in subjects list", () => {
    const subjects = getAllSubjects();
    expect(subjects).toContain("french");
  });

  it("should have french in SUBJECT_NAMES", () => {
    expect(SUBJECT_NAMES.french).toBeDefined();
    expect(typeof SUBJECT_NAMES.french).toBe("string");
  });

  it("should have tools array", () => {
    const moliere = getMaestroById("moliere-french");
    expect(Array.isArray(moliere?.tools)).toBe(true);
    expect(moliere?.tools.length).toBeGreaterThan(0);
  });

  it("should have systemPrompt", () => {
    const moliere = getMaestroById("moliere-french");
    expect(moliere?.systemPrompt).toBeDefined();
    expect(typeof moliere?.systemPrompt).toBe("string");
    expect(moliere?.systemPrompt.length).toBeGreaterThan(100);
  });

  it("should have avatar path", () => {
    const moliere = getMaestroById("moliere-french");
    expect(moliere?.avatar).toBe("/maestri/moliere.webp");
  });

  it("should have color", () => {
    const moliere = getMaestroById("moliere-french");
    expect(moliere?.color).toBeDefined();
    expect(moliere?.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("should have fallback greeting", () => {
    const moliere = getMaestroById("moliere-french");
    expect(moliere?.greeting).toBeDefined();
    expect(typeof moliere?.greeting).toBe("string");
  });

  it("should have getGreeting function", () => {
    const moliere = getMaestroById("moliere-french");
    expect(typeof moliere?.getGreeting).toBe("function");
  });

  it("should use formal address (17th century historical figure)", () => {
    expect(isFormalProfessor("moliere")).toBe(true);
    expect(isFormalProfessor("moliere-french")).toBe(true);
  });

  it("should not be excluded from gamification", () => {
    const moliere = getMaestroById("moliere-french");
    expect(moliere?.excludeFromGamification).toBeUndefined();
  });
});

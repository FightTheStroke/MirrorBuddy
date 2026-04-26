/**
 * Test suite for Goethe maestro
 * Verifies structure, exports, and formality settings
 */
import { describe, it, expect } from "vitest";
import { getMaestroById, getAllSubjects, SUBJECT_NAMES } from "../index";
import { isFormalProfessor } from "@/lib/greeting/templates";

describe("Goethe Maestro", () => {
  it("should be exported and accessible by ID", () => {
    const goethe = getMaestroById("goethe");
    expect(goethe).toBeDefined();
    expect(goethe?.id).toBe("goethe");
    expect(goethe?.name).toBe("Goethe");
  });

  it("should have correct display name", () => {
    const goethe = getMaestroById("goethe");
    expect(goethe?.displayName).toBe("Goethe");
  });

  it("should have german as subject", () => {
    const goethe = getMaestroById("goethe");
    expect(goethe?.subject).toBe("german");
  });

  it("should have german in subjects list", () => {
    const subjects = getAllSubjects();
    expect(subjects).toContain("german");
  });

  it("should have german in SUBJECT_NAMES", () => {
    expect(SUBJECT_NAMES.german).toBeDefined();
    expect(typeof SUBJECT_NAMES.german).toBe("string");
  });

  it("should have tools array", () => {
    const goethe = getMaestroById("goethe");
    expect(Array.isArray(goethe?.tools)).toBe(true);
    expect(goethe?.tools.length).toBeGreaterThan(0);
  });

  it("should have systemPrompt", () => {
    const goethe = getMaestroById("goethe");
    expect(goethe?.systemPrompt).toBeDefined();
    expect(typeof goethe?.systemPrompt).toBe("string");
    expect(goethe?.systemPrompt.length).toBeGreaterThan(100);
  });

  it("should have avatar path", () => {
    const goethe = getMaestroById("goethe");
    expect(goethe?.avatar).toBe("/maestri/goethe.webp");
  });

  it("should have color", () => {
    const goethe = getMaestroById("goethe");
    expect(goethe?.color).toBeDefined();
    expect(goethe?.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("should have fallback greeting", () => {
    const goethe = getMaestroById("goethe");
    expect(goethe?.greeting).toBeDefined();
    expect(typeof goethe?.greeting).toBe("string");
  });

  it("should have getGreeting function", () => {
    const goethe = getMaestroById("goethe");
    expect(typeof goethe?.getGreeting).toBe("function");
  });

  it("should use formal address (18th century historical figure)", () => {
    expect(isFormalProfessor("goethe")).toBe(true);
    expect(isFormalProfessor("goethe")).toBe(true);
  });

  it("should not be excluded from gamification", () => {
    const goethe = getMaestroById("goethe");
    expect(goethe?.excludeFromGamification).toBeUndefined();
  });
});

/**
 * Test suite for Cervantes maestro
 * Verifies structure, exports, and formality settings
 */
import { describe, it, expect } from "vitest";
import { getMaestroById, getAllSubjects, SUBJECT_NAMES } from "../index";
import { isFormalProfessor } from "@/lib/greeting/templates";

describe("Cervantes Maestro", () => {
  it("should be exported and accessible by ID", () => {
    const cervantes = getMaestroById("cervantes");
    expect(cervantes).toBeDefined();
    expect(cervantes?.id).toBe("cervantes");
    expect(cervantes?.name).toBe("Cervantes");
  });

  it("should have correct display name", () => {
    const cervantes = getMaestroById("cervantes");
    expect(cervantes?.displayName).toBe("Cervantes");
  });

  it("should have spanish as subject", () => {
    const cervantes = getMaestroById("cervantes");
    expect(cervantes?.subject).toBe("spanish");
  });

  it("should have spanish in subjects list", () => {
    const subjects = getAllSubjects();
    expect(subjects).toContain("spanish");
  });

  it("should have spanish in SUBJECT_NAMES", () => {
    expect(SUBJECT_NAMES.spanish).toBeDefined();
    expect(typeof SUBJECT_NAMES.spanish).toBe("string");
  });

  it("should have tools array", () => {
    const cervantes = getMaestroById("cervantes");
    expect(Array.isArray(cervantes?.tools)).toBe(true);
    expect(cervantes?.tools.length).toBeGreaterThan(0);
  });

  it("should have systemPrompt", () => {
    const cervantes = getMaestroById("cervantes");
    expect(cervantes?.systemPrompt).toBeDefined();
    expect(typeof cervantes?.systemPrompt).toBe("string");
    expect(cervantes?.systemPrompt.length).toBeGreaterThan(100);
  });

  it("should have avatar path", () => {
    const cervantes = getMaestroById("cervantes");
    expect(cervantes?.avatar).toBe("/maestri/cervantes.webp");
  });

  it("should have color", () => {
    const cervantes = getMaestroById("cervantes");
    expect(cervantes?.color).toBeDefined();
    expect(cervantes?.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("should have fallback greeting", () => {
    const cervantes = getMaestroById("cervantes");
    expect(cervantes?.greeting).toBeDefined();
    expect(typeof cervantes?.greeting).toBe("string");
  });

  it("should have getGreeting function", () => {
    const cervantes = getMaestroById("cervantes");
    expect(typeof cervantes?.getGreeting).toBe("function");
  });

  it("should use formal address (16th-17th century historical figure)", () => {
    expect(isFormalProfessor("cervantes")).toBe(true);
    expect(isFormalProfessor("cervantes")).toBe(true);
  });

  it("should not be excluded from gamification", () => {
    const cervantes = getMaestroById("cervantes");
    expect(cervantes?.excludeFromGamification).toBeUndefined();
  });
});

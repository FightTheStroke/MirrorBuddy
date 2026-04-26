/**
 * Shared test setup and mocks for locale API tests
 */

import { vi, type Mock } from "vitest";
import { prisma } from "@/lib/db";

export const mockLocaleConfigFindMany = prisma.localeConfig
  .findMany as unknown as Mock;
export const mockLocaleConfigFindUnique = prisma.localeConfig
  .findUnique as unknown as Mock;
export const mockLocaleConfigCreate = prisma.localeConfig
  .create as unknown as Mock;
export const mockLocaleConfigUpdate = prisma.localeConfig
  .update as unknown as Mock;
export const mockLocaleConfigDelete = prisma.localeConfig
  .delete as unknown as Mock;

export const mockValidateAdminAuth = vi.fn();

// Mock dependencies
vi.mock("@/lib/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/server")>();
  return { ...actual, validateAdminAuth: () => mockValidateAdminAuth() };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    localeConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    localeAuditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/locale/locale-audit-service", () => ({
  logLocaleCreate: vi.fn(),
  logLocaleUpdate: vi.fn(),
  logLocaleDelete: vi.fn(),
}));

// Helper to create mock locale
export function createMockLocale(overrides = {}) {
  return {
    id: "IT",
    countryName: "Italia",
    primaryLocale: "it",
    primaryLanguageMaestroId: "manzoni-italiano",
    secondaryLocales: ["en"],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Tier Transformer Utilities
 *
 * Converts Prisma tier objects to TypeScript TierDefinition types.
 * Handles type conversions and data normalization.
 */

import type { TierDefinition } from "./types";

/**
 * Transform Prisma tier to TypeScript TierDefinition
 *
 * Handles:
 * - Prisma Decimal to number conversion for monthlyPriceEur
 * - JSON field type casting
 * - Array field validation and normalization
 *
 * @param prismaTier - Raw tier object from Prisma
 * @returns Normalized TierDefinition
 */
export function transformTier(prismaTier: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  chatLimitDaily: number;
  voiceMinutesDaily: number;
  toolsLimitDaily: number;
  docsLimitTotal: number;
  chatModel: string;
  realtimeModel: string;
  features: unknown;
  availableMaestri: unknown;
  availableCoaches: unknown;
  availableBuddies: unknown;
  availableTools: unknown;
  stripePriceId: string | null;
  monthlyPriceEur: { toNumber?: () => number } | number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TierDefinition {
  // Convert Prisma Decimal to number
  let monthlyPrice: number | null = null;
  if (prismaTier.monthlyPriceEur !== null) {
    if (
      typeof prismaTier.monthlyPriceEur === "object" &&
      "toNumber" in prismaTier.monthlyPriceEur &&
      typeof prismaTier.monthlyPriceEur.toNumber === "function"
    ) {
      monthlyPrice = prismaTier.monthlyPriceEur.toNumber();
    } else if (typeof prismaTier.monthlyPriceEur === "number") {
      monthlyPrice = prismaTier.monthlyPriceEur;
    }
  }

  return {
    ...prismaTier,
    features: prismaTier.features as never,
    availableMaestri: Array.isArray(prismaTier.availableMaestri)
      ? prismaTier.availableMaestri
      : [],
    availableCoaches: Array.isArray(prismaTier.availableCoaches)
      ? prismaTier.availableCoaches
      : [],
    availableBuddies: Array.isArray(prismaTier.availableBuddies)
      ? prismaTier.availableBuddies
      : [],
    availableTools: Array.isArray(prismaTier.availableTools)
      ? prismaTier.availableTools
      : [],
    monthlyPriceEur: monthlyPrice,
  };
}

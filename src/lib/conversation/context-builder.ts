/**
 * Context Builder - Unified Memory Integration
 *
 * Integrates memory components (base memory, hierarchical summaries,
 * cross-maestro learnings) into coherent context with token limits
 * and decay-based prioritization.
 */

import { logger } from "@/lib/logger";
import { tierService } from "@/lib/tier/server";
import { loadEnhancedContext, type ConversationMemory } from "./memory-loader";
import {
  loadCrossMaestroLearnings,
  type CrossMaestroLearning,
} from "./cross-maestro-memory";
import {
  injectLearningsWithDecay,
  formatLearningsSection,
  type WeightedLearning,
} from "./learnings-injector";
import { getTierMemoryLimits } from "./tier-memory-config";
import { estimateContextTokens, truncateContext } from "./context-utils";
import type { TierName } from "@/types/tier-types";

export interface ContextOptions {
  maxContextTokens: number;
  includeHierarchical: boolean;
  includeCrossMaestro: boolean;
}

export interface EnhancedContext {
  tier: TierName;
  memory: ConversationMemory;
  crossMaestroLearnings?: CrossMaestroLearning[];
  decayedLearnings: WeightedLearning[];
  combined: string;
  toString(): string;
}

/**
 * Build enhanced context integrating all memory sources.
 *
 * 1. Determine user's tier
 * 2. Load base memory
 * 3. Load cross-maestro learnings if Pro tier
 * 4. Apply exponential decay
 * 5. Combine into coherent context
 * 6. Truncate if over token limit
 */
export async function buildEnhancedContext(
  userId: string,
  maestroId: string,
  options: ContextOptions,
): Promise<EnhancedContext> {
  try {
    const tier = await tierService.getEffectiveTier(userId);
    const tierName = (tier.code as TierName) || "base";

    logger.debug("Building enhanced context", {
      userId,
      maestroId,
      tier: tierName,
    });

    const baseMemory = await loadEnhancedContext(userId, maestroId, tierName);

    let crossMaestroLearnings: CrossMaestroLearning[] = [];
    if (options.includeCrossMaestro && tierName === "pro") {
      const tierLimits = getTierMemoryLimits(tierName);
      if (tierLimits.crossMaestroEnabled) {
        crossMaestroLearnings = await loadCrossMaestroLearnings(
          userId,
          maestroId,
          { limit: 5 },
        );
      }
    }

    const decayedLearnings = applyDecayToMemory(baseMemory, tierName);
    const combined = buildCombinedContext(
      baseMemory,
      crossMaestroLearnings,
      decayedLearnings,
      options.includeHierarchical,
    );
    const finalCombined = truncateContext(combined, options.maxContextTokens);

    const result: EnhancedContext = {
      tier: tierName,
      memory: baseMemory,
      crossMaestroLearnings:
        crossMaestroLearnings.length > 0 ? crossMaestroLearnings : undefined,
      decayedLearnings,
      combined: finalCombined,
      toString() {
        return finalCombined;
      },
    };

    logger.info("Enhanced context built successfully", {
      userId,
      maestroId,
      tier: tierName,
      memorySize: combined.length,
      truncated: combined.length !== finalCombined.length,
    });

    return result;
  } catch (error) {
    logger.error(
      "Failed to build enhanced context",
      { userId, maestroId },
      error,
    );
    return {
      tier: "base",
      memory: {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      },
      decayedLearnings: [],
      combined: "",
      toString() {
        return "";
      },
    };
  }
}

function applyDecayToMemory(
  memory: ConversationMemory,
  tierName: TierName,
): WeightedLearning[] {
  if (!memory.lastSessionDate || memory.keyFacts.length === 0) {
    return [];
  }

  const learnings = memory.keyFacts.map((fact) => ({
    content: fact,
    createdAt: memory.lastSessionDate!,
  }));

  const tierLimits = getTierMemoryLimits(tierName);
  return injectLearningsWithDecay(learnings, {
    halflifeDays: 30,
    minThreshold: 0.1,
    maxLearnings: tierLimits.maxKeyFacts,
  });
}

function buildCombinedContext(
  memory: ConversationMemory,
  crossMaestroLearnings: CrossMaestroLearning[],
  decayedLearnings: WeightedLearning[],
  includeHierarchical: boolean,
): string {
  const sections: string[] = [];

  if (memory.recentSummary) {
    sections.push("## Contesto Recente\n");
    sections.push(memory.recentSummary);
    sections.push("");
  }

  if (memory.topics.length > 0) {
    sections.push("## Argomenti Affrontati\n");
    sections.push(memory.topics.join(", "));
    sections.push("");
  }

  if (includeHierarchical && memory.hierarchicalContext) {
    if (memory.hierarchicalContext.weeklySummary) {
      sections.push("## Riepilogo Settimanale\n");
      sections.push(memory.hierarchicalContext.weeklySummary);
      sections.push("");
    }
    if (memory.hierarchicalContext.monthlySummary) {
      sections.push("## Riepilogo Mensile\n");
      sections.push(memory.hierarchicalContext.monthlySummary);
      sections.push("");
    }
  }

  const learningsSection = formatLearningsSection(decayedLearnings);
  if (learningsSection) {
    sections.push(learningsSection);
  }

  if (crossMaestroLearnings.length > 0) {
    sections.push("## Apprendimenti da Altri Maestri\n");
    for (const learning of crossMaestroLearnings) {
      sections.push(`### ${learning.maestroName} (${learning.subject})\n`);
      sections.push(learning.learnings.join(", "));
      sections.push("");
    }
  }

  return sections.join("\n").trim();
}

export { estimateContextTokens };

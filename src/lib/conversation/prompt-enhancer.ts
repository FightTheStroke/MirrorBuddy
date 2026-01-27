/**
 * System Prompt Enhancer
 *
 * Enhances AI system prompts with conversation memory context.
 * Integrates with safety guardrails per ADR 0004.
 * Respects subscription tier limits on memory injection.
 *
 * ADR: 0021-conversational-memory-injection.md
 */

import type { ConversationMemory } from "./memory-loader";
import { formatRelativeDate } from "./memory-loader";
import { injectSafetyGuardrails } from "@/lib/safety/safety-prompts";
import type { SafetyInjectionOptions } from "@/lib/safety/safety-prompts";
import type { TierMemoryLimits } from "./tier-memory-config";
import type { CrossMaestroLearning } from "./cross-maestro-memory";

export interface PromptEnhancementOptions {
  /** Base system prompt from the Maestro configuration */
  basePrompt: string;
  /** Loaded conversation memory */
  memory: ConversationMemory;
  /** Safety options for the prompt */
  safetyOptions: SafetyInjectionOptions;
  /** Tier-specific memory limits (optional, defaults to including all memory) */
  tierLimits?: TierMemoryLimits;
  /** Cross-maestro learnings (Pro tier only) */
  crossMaestroLearnings?: CrossMaestroLearning[];
}

/**
 * Enhance a system prompt with conversation memory.
 * ALWAYS applies safety guardrails per ADR 0004.
 * Respects tier-specific memory limits when provided.
 *
 * Tier-aware behavior:
 * - Trial tier (maxKeyFacts === 0): Memory injection is skipped entirely
 * - Base/Pro tiers: Memory is sliced according to maxKeyFacts and maxTopics limits
 * - No tierLimits provided: All memory is included (backward compatible)
 */
export function enhanceSystemPrompt(options: PromptEnhancementOptions): string {
  const {
    basePrompt,
    memory,
    safetyOptions,
    tierLimits,
    crossMaestroLearnings,
  } = options;

  // First, apply safety guardrails to the base prompt
  const safePrompt = injectSafetyGuardrails(basePrompt, safetyOptions);

  // Trial tier users get no memory injection (tier-aware)
  if (tierLimits && tierLimits.maxKeyFacts === 0) {
    return safePrompt;
  }

  // Check if we have any content to inject
  const hasMemory =
    memory.recentSummary ||
    memory.keyFacts.length > 0 ||
    memory.topics.length > 0;
  const hasCrossMaestro =
    tierLimits?.crossMaestroEnabled &&
    crossMaestroLearnings &&
    crossMaestroLearnings.length > 0;

  // If no memory or cross-maestro content, return the safe prompt as-is
  if (!hasMemory && !hasCrossMaestro) {
    return safePrompt;
  }

  const sections: string[] = [];

  // Build memory section with tier limits applied
  if (hasMemory) {
    sections.push(buildMemorySection(memory, tierLimits));
  }

  // Build cross-maestro section for Pro tier
  if (hasCrossMaestro) {
    sections.push(buildCrossMaestroSection(crossMaestroLearnings!));
  }

  // Inject sections before the end of the prompt
  return `${safePrompt}

${sections.join("\n\n")}`;
}

/**
 * Build the memory injection section in Italian.
 * Respects tier-specific limits on number of facts and topics.
 *
 * @param memory The loaded conversation memory
 * @param tierLimits Optional tier configuration limiting memory injection
 */
function buildMemorySection(
  memory: ConversationMemory,
  tierLimits?: TierMemoryLimits,
): string {
  const sections: string[] = [];

  sections.push("## Memoria delle Sessioni Precedenti");
  sections.push("");
  sections.push(
    "ISTRUZIONI MEMORIA: Usa queste informazioni per personalizzare l'interazione.",
  );
  sections.push("Fai riferimento a conversazioni passate quando rilevante.");
  sections.push("Non ripetere concetti già acquisiti dallo studente.");
  sections.push("");

  // Recent summary
  if (memory.recentSummary) {
    const relativeDate = formatRelativeDate(memory.lastSessionDate);
    sections.push(`### Ultimo Incontro (${relativeDate})`);
    sections.push(memory.recentSummary);
    sections.push("");
  }

  // Key facts - respect tier limit (if provided)
  if (memory.keyFacts.length > 0) {
    const maxFacts = tierLimits?.maxKeyFacts ?? memory.keyFacts.length;
    const factsToInclude = memory.keyFacts.slice(0, maxFacts);

    if (factsToInclude.length > 0) {
      sections.push("### Fatti Chiave dello Studente");
      for (const fact of factsToInclude) {
        sections.push(`- ${fact}`);
      }
      sections.push("");
    }
  }

  // Topics discussed - respect tier limit (if provided)
  if (memory.topics.length > 0) {
    const maxTopics = tierLimits?.maxTopics ?? memory.topics.length;
    const topicsToInclude = memory.topics.slice(0, maxTopics);

    if (topicsToInclude.length > 0) {
      sections.push("### Argomenti Già Trattati");
      sections.push(topicsToInclude.join(", "));
      sections.push("");
    }
  }

  return sections.join("\n");
}

/**
 * Check if a prompt has memory context injected.
 */
export function hasMemoryContext(prompt: string): boolean {
  return prompt.includes("## Memoria delle Sessioni Precedenti");
}

/**
 * Extract the base prompt without memory context.
 * Useful for debugging or comparison.
 */
export function extractBasePrompt(enhancedPrompt: string): string {
  const memoryIndex = enhancedPrompt.indexOf(
    "## Memoria delle Sessioni Precedenti",
  );
  if (memoryIndex === -1) {
    return enhancedPrompt;
  }
  return enhancedPrompt.slice(0, memoryIndex).trim();
}

/**
 * Build the cross-maestro knowledge section in Italian.
 * Shows what the student has learned from other maestri (professors).
 *
 * @param learnings Array of cross-maestro learnings
 * @returns Formatted section text
 */
function buildCrossMaestroSection(learnings: CrossMaestroLearning[]): string {
  const sections: string[] = [];

  sections.push("## Conoscenze Interdisciplinari");
  sections.push("");
  sections.push(
    "ISTRUZIONI INTERDISCIPLINARI: Lo studente ha appreso questi concetti da altri professori.",
  );
  sections.push(
    "Puoi fare riferimento a queste conoscenze per creare collegamenti interdisciplinari.",
  );
  sections.push("");

  for (const learning of learnings) {
    sections.push(`### Da ${learning.maestroName} (${learning.subject})`);
    for (const item of learning.learnings) {
      sections.push(`- ${item}`);
    }
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * System Prompt Enhancer
 *
 * Enhances AI system prompts with conversation memory context.
 * Integrates with safety guardrails per ADR 0004.
 *
 * ADR: 0021-conversational-memory-injection.md
 */

import type { ConversationMemory } from './memory-loader';
import { formatRelativeDate } from './memory-loader';
import { injectSafetyGuardrails } from '@/lib/safety/safety-prompts';
import type { SafetyInjectionOptions } from '@/lib/safety/safety-prompts';

export interface PromptEnhancementOptions {
  /** Base system prompt from the Maestro configuration */
  basePrompt: string;
  /** Loaded conversation memory */
  memory: ConversationMemory;
  /** Safety options for the prompt */
  safetyOptions: SafetyInjectionOptions;
}

/**
 * Enhance a system prompt with conversation memory.
 * ALWAYS applies safety guardrails per ADR 0004.
 */
export function enhanceSystemPrompt(options: PromptEnhancementOptions): string {
  const { basePrompt, memory, safetyOptions } = options;

  // First, apply safety guardrails to the base prompt
  const safePrompt = injectSafetyGuardrails(basePrompt, safetyOptions);

  // If no memory, return the safe prompt as-is
  if (!memory.recentSummary && memory.keyFacts.length === 0) {
    return safePrompt;
  }

  // Build memory section
  const memorySection = buildMemorySection(memory);

  // Inject memory section before the end of the prompt
  return `${safePrompt}

${memorySection}`;
}

/**
 * Build the memory injection section in Italian.
 */
function buildMemorySection(memory: ConversationMemory): string {
  const sections: string[] = [];

  sections.push('## Memoria delle Sessioni Precedenti');
  sections.push('');
  sections.push('ISTRUZIONI MEMORIA: Usa queste informazioni per personalizzare l\'interazione.');
  sections.push('Fai riferimento a conversazioni passate quando rilevante.');
  sections.push('Non ripetere concetti già acquisiti dallo studente.');
  sections.push('');

  // Recent summary
  if (memory.recentSummary) {
    const relativeDate = formatRelativeDate(memory.lastSessionDate);
    sections.push(`### Ultimo Incontro (${relativeDate})`);
    sections.push(memory.recentSummary);
    sections.push('');
  }

  // Key facts
  if (memory.keyFacts.length > 0) {
    sections.push('### Fatti Chiave dello Studente');
    for (const fact of memory.keyFacts) {
      sections.push(`- ${fact}`);
    }
    sections.push('');
  }

  // Topics discussed
  if (memory.topics.length > 0) {
    sections.push('### Argomenti Già Trattati');
    sections.push(memory.topics.join(', '));
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Check if a prompt has memory context injected.
 */
export function hasMemoryContext(prompt: string): boolean {
  return prompt.includes('## Memoria delle Sessioni Precedenti');
}

/**
 * Extract the base prompt without memory context.
 * Useful for debugging or comparison.
 */
export function extractBasePrompt(enhancedPrompt: string): string {
  const memoryIndex = enhancedPrompt.indexOf('## Memoria delle Sessioni Precedenti');
  if (memoryIndex === -1) {
    return enhancedPrompt;
  }
  return enhancedPrompt.slice(0, memoryIndex).trim();
}

// ============================================================================
// VOICE PROMPT BUILDER
// Builds voice-optimized prompt from maestro systemPrompt.
// Preserves full personality, pedagogy, safety — removes only KNOWLEDGE BASE.
// ============================================================================

import type { Maestro } from '@/types';
import { sanitizeHtmlComments } from './memory-utils';

const MAX_VOICE_PROMPT_CHARS = 6000;

/**
 * Remove named sections from a markdown prompt.
 * Handles sections whose content contains ## sub-headers (e.g. KNOWLEDGE BASE).
 * Finds section start, then scans forward for next ## header NOT preceded by
 * content from the same section (identified by double-newline paragraph break
 * followed by ## that matches a known post-KB header like "Core Identity").
 */
function removeSections(text: string, sectionNames: string[]): string {
  let result = text;
  for (const name of sectionNames) {
    result = removeSection(result, name);
  }
  return result;
}

function removeSection(text: string, sectionName: string): string {
  // eslint-disable-next-line security/detect-non-literal-regexp -- input is escaped via escapeRegex
  const pattern = new RegExp(`##?\\s*${escapeRegex(sectionName)}`, 'i');
  const match = text.match(pattern);
  if (!match || match.index === undefined) return text;

  const sectionStart = match.index;
  const afterHeader = text.substring(sectionStart + match[0].length);

  // Find next top-level section: ## followed by a known non-sub-header.
  // All maestri use "## Core Identity" after KB; accessibility sections
  // are followed by "## Teaching Style" or similar.
  // Fallback: match any ## preceded by \n\n (paragraph break) and then
  // a capital letter (main sections start with capitals like "Core", "Teaching").
  const nextSection = afterHeader.search(
    /\n##?\s*(?:Core Identity|Teaching Style|Communication Style|Pedagogical|Famous Works)/i,
  );

  if (nextSection >= 0) {
    return text.substring(0, sectionStart) + afterHeader.substring(nextSection);
  }

  // No known next section found — remove to end
  return text.substring(0, sectionStart);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a voice-optimized prompt from maestro data.
 *
 * Includes full systemPrompt MINUS:
 * - KNOWLEDGE BASE section (handled by RAG at query time, too large for voice context)
 * - Accessibility Adaptations (visual UI only, not relevant for voice)
 *
 * When voice_full_prompt flag is enabled, returns the complete prompt.
 * When disabled (default), enforces MAX_VOICE_PROMPT_CHARS truncation.
 *
 * Preserves: personality, pedagogy, safety, formality, intensity dial.
 */
export function buildVoicePrompt(maestro: Maestro, useFullPrompt = false): string {
  const raw = maestro.systemPrompt || '';
  const sanitized = sanitizeHtmlComments(raw);

  // Remove sections by finding boundaries programmatically.
  // KB content contains ## sub-headers, so lazy regex fails — use indexOf approach.
  const withoutKB = removeSections(sanitized, [
    'KNOWLEDGE BASE',
    'BASE DI CONOSCENZA',
    'Accessibility Adaptations',
    "Adattamenti per l'Accessibilità",
  ])
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If voice_full_prompt flag is enabled, return full prompt (no truncation)
  if (useFullPrompt) {
    return withoutKB;
  }

  // Legacy behavior: enforce char limit — truncate at section boundary if too long
  if (withoutKB.length <= MAX_VOICE_PROMPT_CHARS) {
    return withoutKB;
  }

  const truncated = withoutKB.slice(0, MAX_VOICE_PROMPT_CHARS);
  const lastSection = truncated.lastIndexOf('\n## ');
  if (lastSection > MAX_VOICE_PROMPT_CHARS * 0.5) {
    return truncated.slice(0, lastSection).trim();
  }
  return truncated.trim();
}

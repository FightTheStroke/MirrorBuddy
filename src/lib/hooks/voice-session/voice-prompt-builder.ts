// ============================================================================
// VOICE PROMPT BUILDER
// Extracts essential character identity from full systemPrompt into a
// voice-optimized prompt (~2000 chars) per ADR 0031 intensity dial format.
// Replaces the old .slice(0, 800) arbitrary truncation.
// ============================================================================

import type { Maestro } from '@/types';
import { sanitizeHtmlComments } from './memory-utils';

const MAX_VOICE_PROMPT_CHARS = 2000;

/**
 * Extract a named markdown section (## Header ... next ## or end).
 * Returns content without the header line itself.
 */
function extractSection(text: string, sectionName: string): string {
  // Find section header position (avoid dynamic RegExp for security/detect-non-literal-regexp)
  const lines = text.split('\n');
  const lowerName = sectionName.toLowerCase();
  let startIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,2}\s/.test(line) && line.toLowerCase().includes(lowerName)) {
      startIdx = i + 1;
      break;
    }
  }

  if (startIdx < 0) return '';

  // Collect until next ## header or end
  const sectionLines: string[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i])) break;
    sectionLines.push(lines[i]);
  }

  return sectionLines
    .join('\n')
    .replace(/\n{3,}/g, '\n')
    .trim();
}

/**
 * Extract the full CHARACTER INTENSITY DIAL block including sub-headers.
 */
function extractIntensityDial(text: string): string {
  const match = text.match(
    /(?:^|\n)(##?\s*CHARACTER INTENSITY DIAL[\s\S]*?)(?=\n##?\s(?!#)|\n##\s[A-Z]|$)/i,
  );
  if (!match?.[1]) return '';
  return match[1].replace(/\n{3,}/g, '\n').trim();
}

/**
 * Compact a section by removing excessive whitespace and markdown cruft.
 */
function compact(text: string): string {
  return text
    .replace(/\*\*Core Implementation\*\*:[\s\S]*?(?=##|$)/g, '')
    .replace(/\n{3,}/g, '\n')
    .replace(/^\s+/gm, '')
    .trim();
}

/**
 * Build a voice-optimized prompt from maestro data.
 *
 * Extracts essential character identity (name, personality, role, subject,
 * formality, intensity dial, key behavioral rules) into a structured prompt
 * of max ~2000 chars. Replaces the old `.slice(0, 800)` truncation.
 *
 * Sections included:
 * - Character header (name, subject, specialty, style)
 * - CHARACTER INTENSITY DIAL (ADR 0031)
 * - Core Identity (personality traits, catchphrases)
 *
 * Sections excluded (too verbose for voice):
 * - Copyright headers, Values Integration, Security Framework
 * - KNOWLEDGE BASE (huge embedded content)
 * - Pedagogical Approach details
 * - Accessibility Adaptations (handled by accessibility layer)
 */
export function buildVoicePrompt(maestro: Maestro): string {
  const raw = maestro.systemPrompt || '';
  const sanitized = sanitizeHtmlComments(raw);

  // 1. Character header — always present
  const header = [
    `## ${maestro.name} — ${maestro.subject}`,
    `Role: ${maestro.specialty}`,
    `Style: ${maestro.teachingStyle}`,
  ].join('\n');

  // 2. CHARACTER INTENSITY DIAL (ADR 0031)
  const dial = extractIntensityDial(sanitized);
  const dialBlock = dial ? `\n\n${compact(dial)}` : '';

  // 3. Core Identity — personality, catchphrases, communication style
  const identity = extractSection(sanitized, 'Core Identity');
  const identityBlock = identity ? `\n\n## Core Identity\n${compact(identity)}` : '';

  // Assemble and enforce char limit
  let prompt = header + dialBlock + identityBlock;

  if (prompt.length > MAX_VOICE_PROMPT_CHARS) {
    // Prefer cutting identity over intensity dial
    const headAndDial = header + dialBlock;
    if (headAndDial.length < MAX_VOICE_PROMPT_CHARS - 100) {
      const remaining = MAX_VOICE_PROMPT_CHARS - headAndDial.length - 10;
      const trimmedIdentity = identityBlock.slice(0, remaining);
      prompt = headAndDial + trimmedIdentity;
    } else {
      prompt = prompt.slice(0, MAX_VOICE_PROMPT_CHARS);
    }
  }

  return prompt.trim();
}

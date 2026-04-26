/**
 * @file dyslexia.ts
 * @brief Dyslexia support functions (DY01-07)
 */

import type { AccessibilityProfile } from './types';
import { Severity } from './types';

/**
 * Get recommended font for dyslexia support
 * DY01: Use OpenDyslexic or similar dyslexia-friendly fonts
 */
export function a11yGetFont(profile: AccessibilityProfile): string {
  if (!profile.dyslexia) {
    return 'system-ui, -apple-system, sans-serif';
  }

  // OpenDyslexic is ideal, but fallback to readable alternatives
  return "'OpenDyslexic', 'Comic Sans MS', 'Arial', sans-serif";
}

/**
 * Get recommended line spacing for dyslexia
 * DY02: Increase line spacing for easier reading
 */
export function a11yGetLineSpacing(profile: AccessibilityProfile): number {
  if (!profile.dyslexia) {
    return 1.5;
  }

  switch (profile.dyslexiaSeverity) {
    case Severity.SEVERE:
      return 2.0;
    case Severity.MODERATE:
      return 1.8;
    case Severity.MILD:
      return 1.6;
    default:
      return 1.5;
  }
}

/**
 * Get maximum line width in characters
 * DY03: Limit line width to prevent overwhelm (50-70 chars optimal)
 */
export function a11yGetMaxLineWidth(profile: AccessibilityProfile): number {
  if (!profile.dyslexia) {
    return 80;
  }

  switch (profile.dyslexiaSeverity) {
    case Severity.SEVERE:
      return 50;
    case Severity.MODERATE:
      return 60;
    case Severity.MILD:
      return 70;
    default:
      return 80;
  }
}

/**
 * Wrap text to maximum line width
 * DY04: Break long lines into manageable chunks
 */
export function a11yWrapText(text: string, maxWidth: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).length > maxWidth) {
      if (currentLine) {
        lines.push(currentLine.trim());
      }
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }

  if (currentLine) {
    lines.push(currentLine.trim());
  }

  return lines.join('\n');
}

/**
 * Get background color for dyslexia-friendly reading
 * DY05: Use cream/beige instead of pure white (reduces glare)
 */
export function a11yGetBackgroundColor(profile: AccessibilityProfile): string {
  if (!profile.dyslexia) {
    return '#ffffff';
  }

  if (profile.highContrast) {
    return '#000000'; // Black background for high contrast
  }

  // Cream/beige reduces visual stress
  return '#faf8f3';
}

/**
 * Get text color for dyslexia-friendly reading
 */
export function a11yGetTextColor(profile: AccessibilityProfile): string {
  if (profile.highContrast) {
    return '#ffff00'; // Yellow on black for high contrast
  }

  if (profile.dyslexia) {
    return '#2b2b2b'; // Dark gray instead of pure black
  }

  return '#000000';
}

/**
 * Check if TTS highlight should be shown during reading
 * DY06: Highlight words as they're read aloud
 */
export function a11yWantsTtsHighlight(profile: AccessibilityProfile): boolean {
  return profile.dyslexia && profile.ttsEnabled;
}

/**
 * Syllabify a single Italian word for easier reading
 * DY07: Add soft hyphens to show syllable breaks
 *
 * Italian syllabification rules:
 * - CV (consonant + vowel): pa-ne, ca-sa
 * - V-CV: a-mi-co, u-ni-re
 * - VC-CV: par-te, al-to
 * - V-CCV: a-stra, i-scri-ve-re
 */
export function syllabifyWord(word: string): string {
  if (word.length <= 3) {
    return word; // Too short to syllabify
  }

  const vowels = 'aeiouàèéìòù';
  const isVowel = (c: string) => vowels.includes(c.toLowerCase());

  let result = '';
  let i = 0;

  while (i < word.length) {
    result += word[i];

    // Look ahead for syllable breaks
    if (i < word.length - 2) {
      const curr = word[i];
      const next = word[i + 1];
      const nextNext = word[i + 2];

      // V-CV pattern: insert hyphen between vowel and consonant
      if (isVowel(curr) && !isVowel(next) && isVowel(nextNext)) {
        result += '\u00AD'; // Soft hyphen
      }
      // VC-CV pattern: insert hyphen between consonants
      else if (!isVowel(curr) && !isVowel(next) && i > 0 && isVowel(word[i - 1])) {
        result += '\u00AD';
      }
    }

    i++;
  }

  return result;
}

/**
 * Syllabify entire text for dyslexia support
 */
export function syllabifyText(text: string): string {
  return text.split(/\s+/).map(word => {
    // Preserve punctuation
    const match = word.match(/^([^\w]*)(.+?)([^\w]*)$/);
    if (match) {
      const [, prefix, core, suffix] = match;
      return prefix + syllabifyWord(core) + suffix;
    }
    return syllabifyWord(word);
  }).join(' ');
}

/**
 * Format text with dyslexia-friendly styling
 */
export function formatForDyslexia(text: string): string {
  // Add soft hyphens for syllable breaks
  const syllabified = syllabifyText(text);

  // Increase word spacing (done via CSS)
  return syllabified;
}


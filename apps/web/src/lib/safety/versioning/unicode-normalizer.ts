/**
 * Extended Unicode Normalizer
 * Part of Ethical Design Hardening (F-17)
 *
 * Extends unicode normalization to handle Arabic, Greek,
 * Cyrillic, and other scripts used in homoglyph attacks.
 */

import { logger } from '@/lib/logger';

const log = logger.child({ module: 'unicode-normalizer' });

/**
 * Homoglyph mappings: visually similar characters to ASCII
 */
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic lookalikes
  'а': 'a', 'А': 'A',  // Cyrillic a
  'е': 'e', 'Е': 'E',  // Cyrillic e
  'о': 'o', 'О': 'O',  // Cyrillic o
  'р': 'p', 'Р': 'P',  // Cyrillic r (looks like p)
  'с': 'c', 'С': 'C',  // Cyrillic s (looks like c)
  'у': 'y', 'У': 'Y',  // Cyrillic u (looks like y)
  'х': 'x', 'Х': 'X',  // Cyrillic h (looks like x)
  'і': 'i', 'І': 'I',  // Ukrainian i
  'ј': 'j', 'Ј': 'J',  // Serbian j
  'ѕ': 's', 'Ѕ': 'S',  // Cyrillic dze

  // Greek lookalikes
  'Α': 'A', 'α': 'a',  // Alpha
  'Β': 'B', 'β': 'b',  // Beta
  'Ε': 'E', 'ε': 'e',  // Epsilon
  'Η': 'H', 'η': 'n',  // Eta
  'Ι': 'I', 'ι': 'i',  // Iota
  'Κ': 'K', 'κ': 'k',  // Kappa
  'Μ': 'M', 'μ': 'u',  // Mu
  'Ν': 'N', 'ν': 'v',  // Nu
  'Ο': 'O', 'ο': 'o',  // Omicron
  'Ρ': 'P', 'ρ': 'p',  // Rho
  'Τ': 'T', 'τ': 't',  // Tau
  'Υ': 'Y', 'υ': 'u',  // Upsilon
  'Χ': 'X', 'χ': 'x',  // Chi
  'Ζ': 'Z', 'ζ': 'z',  // Zeta

  // Arabic numerals and letters that can look like Latin
  '٠': '0', '۰': '0',  // Arabic-Indic zero
  '١': '1', '۱': '1',  // Arabic-Indic one
  '٢': '2', '۲': '2',  // Arabic-Indic two
  'ا': 'l', 'أ': 'l',  // Alef (can look like l/I)

  // Mathematical and special symbols
  'ℓ': 'l',           // Script small l
  'ℐ': 'I',           // Script capital I
  'ℑ': 'I',           // Black-letter I
  'ℒ': 'L',           // Script capital L
  'ℳ': 'M',           // Script capital M
  'ℛ': 'R',           // Script capital R
  'ℯ': 'e',           // Script small e
  '℮': 'e',           // Estimated symbol

  // Fullwidth characters
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e',
  'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
  'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o',
  'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't',
  'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y',
  'ｚ': 'z',
  'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E',
  'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J',
  'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O',
  'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T',
  'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y',
  'Ｚ': 'Z',

  // Numbers fullwidth
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',

  // Subscript and superscript
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',

  // Other common lookalikes
  'ℹ': 'i',           // Information source
  '∑': 'E',           // Sum (like E)
  '∏': 'P',           // Product (like P)
  '№': 'N',           // Numero sign
  '℠': 'SM',          // Service mark
  '™': 'TM',          // Trademark
  '\u2010': '-', '\u2011': '-', '\u2012': '-', '\u2013': '-', '\u2014': '-',  // Various dashes
  '\u2018': "'", '\u2019': "'", '\u201A': "'", '\u201B': "'",  // Various quotes
  '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u201F': '"',  // Various double quotes
};

/**
 * Zero-width and invisible characters to remove
 */
const INVISIBLE_CHARS = [
  '\u200B', // Zero-width space
  '\u200C', // Zero-width non-joiner
  '\u200D', // Zero-width joiner
  '\u200E', // Left-to-right mark
  '\u200F', // Right-to-left mark
  '\u202A', // Left-to-right embedding
  '\u202B', // Right-to-left embedding
  '\u202C', // Pop directional formatting
  '\u202D', // Left-to-right override
  '\u202E', // Right-to-left override
  '\u2060', // Word joiner
  '\u2061', // Function application
  '\u2062', // Invisible times
  '\u2063', // Invisible separator
  '\u2064', // Invisible plus
  '\uFEFF', // Byte order mark
  '\u00AD', // Soft hyphen
];

/**
 * Normalize text to prevent homoglyph attacks
 */
export function normalizeUnicode(text: string): {
  normalized: string;
  wasModified: boolean;
  changes: NormalizationChange[];
} {
  const changes: NormalizationChange[] = [];
  let normalized = text;

  // Step 1: Unicode NFC normalization
  const nfcNormalized = normalized.normalize('NFC');
  if (nfcNormalized !== normalized) {
    changes.push({
      type: 'nfc_normalization',
      original: normalized.length.toString(),
      replacement: nfcNormalized.length.toString(),
    });
    normalized = nfcNormalized;
  }

  // Step 2: Remove invisible characters
  for (const char of INVISIBLE_CHARS) {
    if (normalized.includes(char)) {
      const count = (normalized.match(new RegExp(char, 'g')) || []).length;
      changes.push({
        type: 'invisible_removed',
        original: `U+${char.charCodeAt(0).toString(16).toUpperCase()}`,
        replacement: '',
        count,
      });
      normalized = normalized.split(char).join('');
    }
  }

  // Step 3: Replace homoglyphs
  let homoglyphText = '';
  for (const char of normalized) {
    if (HOMOGLYPH_MAP[char]) {
      changes.push({
        type: 'homoglyph_replaced',
        original: char,
        replacement: HOMOGLYPH_MAP[char],
      });
      homoglyphText += HOMOGLYPH_MAP[char];
    } else {
      homoglyphText += char;
    }
  }
  normalized = homoglyphText;

  // Step 4: Collapse multiple spaces
  const spacesCollapsed = normalized.replace(/\s+/g, ' ');
  if (spacesCollapsed !== normalized) {
    changes.push({
      type: 'spaces_collapsed',
      original: normalized.length.toString(),
      replacement: spacesCollapsed.length.toString(),
    });
    normalized = spacesCollapsed;
  }

  const wasModified = changes.length > 0;

  if (wasModified) {
    log.debug('Unicode normalization applied', {
      originalLength: text.length,
      normalizedLength: normalized.length,
      changes: changes.length,
    });
  }

  return {
    normalized,
    wasModified,
    changes,
  };
}

/**
 * Check if text contains suspicious unicode
 */
export function containsSuspiciousUnicode(text: string): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Check for homoglyphs
  for (const char of text) {
    if (HOMOGLYPH_MAP[char]) {
      reasons.push(`Contains homoglyph: ${char}`);
      break; // Only report once
    }
  }

  // Check for invisible characters
  for (const char of INVISIBLE_CHARS) {
    if (text.includes(char)) {
      reasons.push('Contains invisible characters');
      break;
    }
  }

  // Check for mixed scripts (potential spoofing)
  const hasLatin = /[a-zA-Z]/.test(text);
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);
  const hasGreek = /[\u0370-\u03FF]/.test(text);
  const hasArabic = /[\u0600-\u06FF]/.test(text);

  const scriptCount = [hasLatin, hasCyrillic, hasGreek, hasArabic].filter(Boolean).length;
  if (scriptCount > 1) {
    reasons.push('Mixed script usage detected');
  }

  // Check for bidirectional text
  if (/[\u200E\u200F\u202A-\u202E]/.test(text)) {
    reasons.push('Contains bidirectional control characters');
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Get statistics about unicode content
 */
export function analyzeUnicodeContent(text: string): {
  length: number;
  scripts: string[];
  hasHomoglyphs: boolean;
  hasInvisible: boolean;
  hasBidirectional: boolean;
  normalizedLength: number;
} {
  const scripts: string[] = [];

  if (/[a-zA-Z]/.test(text)) scripts.push('Latin');
  if (/[\u0400-\u04FF]/.test(text)) scripts.push('Cyrillic');
  if (/[\u0370-\u03FF]/.test(text)) scripts.push('Greek');
  if (/[\u0600-\u06FF]/.test(text)) scripts.push('Arabic');
  if (/[\u4E00-\u9FFF]/.test(text)) scripts.push('CJK');
  if (/[\uFF00-\uFFEF]/.test(text)) scripts.push('Fullwidth');

  const { normalized } = normalizeUnicode(text);

  return {
    length: text.length,
    scripts,
    hasHomoglyphs: Array.from(text).some((c) => HOMOGLYPH_MAP[c]),
    hasInvisible: INVISIBLE_CHARS.some((c) => text.includes(c)),
    hasBidirectional: /[\u200E\u200F\u202A-\u202E]/.test(text),
    normalizedLength: normalized.length,
  };
}

/**
 * Normalization change record
 */
export interface NormalizationChange {
  type:
    | 'nfc_normalization'
    | 'invisible_removed'
    | 'homoglyph_replaced'
    | 'spaces_collapsed';
  original: string;
  replacement: string;
  count?: number;
}

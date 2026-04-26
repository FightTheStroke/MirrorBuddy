/**
 * i18n-ready frustration pattern detection
 * Supports: Italian, English, Spanish, French, German
 */

export * from './types';
export { italianPatterns } from './it';
export { englishPatterns } from './en';
export { spanishPatterns } from './es';
export { frenchPatterns } from './fr';
export { germanPatterns } from './de';

import type {
  SupportedLocale,
  LocalePatterns,
  TextAnalysisResult,
  PatternMatch,
} from './types';
import { italianPatterns } from './it';
import { englishPatterns } from './en';
import { spanishPatterns } from './es';
import { frenchPatterns } from './fr';
import { germanPatterns } from './de';

const ALL_PATTERNS: Record<SupportedLocale, LocalePatterns> = {
  it: italianPatterns,
  en: englishPatterns,
  es: spanishPatterns,
  fr: frenchPatterns,
  de: germanPatterns,
};

/**
 * Simple language detection based on common words
 * Uses multiple markers per language with weighted scoring for disambiguation
 */
const LOCALE_MARKERS: Record<SupportedLocale, { pattern: RegExp; weight: number }[]> = {
  it: [
    { pattern: /\b(sono|non|che|per|una?|il|gli|le)\b/gi, weight: 1 },
    { pattern: /\b(questo|quello|cosa|perché|anche|molto)\b/gi, weight: 1 },
  ],
  en: [
    { pattern: /\b(the|is|are|was|were|have|has|been|being)\b/gi, weight: 1 },
    { pattern: /\b(i'm|don't|can't|won't|you|can|could|would|that|please)\b/gi, weight: 1 },
  ],
  es: [
    { pattern: /\b(estoy|tengo|esto|muy|puedo|puedes|también)\b/gi, weight: 2 }, // Higher weight for distinctive Spanish
    { pattern: /\b(el|la|los|las|es|son|qué|por|como)\b/gi, weight: 1 },
  ],
  fr: [
    { pattern: /\b(je|tu|il|elle|nous|vous|c'est|qu'est)\b/gi, weight: 1 },
    { pattern: /\b(le|la|les|un|une|des|et|ou|mais)\b/gi, weight: 1 },
  ],
  de: [
    { pattern: /\b(der|die|das|ist|sind|ich|du|wir|nicht|kann)\b/gi, weight: 1 },
    { pattern: /\b(ein|eine|und|oder|aber|haben|sein)\b/gi, weight: 1 },
  ],
};

export function detectLocale(text: string): SupportedLocale | null {
  const scores: Record<SupportedLocale, number> = { it: 0, en: 0, es: 0, fr: 0, de: 0 };

  for (const [locale, markers] of Object.entries(LOCALE_MARKERS)) {
    for (const { pattern, weight } of markers) {
      const matches = text.match(pattern);
      if (matches) {
        scores[locale as SupportedLocale] += matches.length * weight;
      }
    }
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return null;

  const detected = Object.entries(scores).find(([, score]) => score === maxScore);
  return detected ? (detected[0] as SupportedLocale) : null;
}

export function getPatterns(locale: SupportedLocale): LocalePatterns {
  return ALL_PATTERNS[locale];
}

export function analyzeText(
  text: string,
  locale?: SupportedLocale
): TextAnalysisResult {
  const detectedLocale = locale || detectLocale(text);
  const matches: PatternMatch[] = [];

  let frustrationScore = 0;
  let repeatRequestScore = 0;
  let confusionScore = 0;

  // If no locale detected, try all patterns
  const localesToCheck = detectedLocale ? [detectedLocale] : Object.keys(ALL_PATTERNS) as SupportedLocale[];

  for (const loc of localesToCheck) {
    const patterns = ALL_PATTERNS[loc];

    // Check frustration patterns
    for (const fp of patterns.frustration) {
      const match = text.match(fp.pattern);
      if (match) {
        frustrationScore = Math.max(frustrationScore, fp.weight);
        matches.push({
          locale: loc,
          category: fp.category,
          weight: fp.weight,
          matchedText: match[0],
        });
      }
    }

    // Check repeat request patterns
    for (const rp of patterns.repeatRequest) {
      const match = text.match(rp.pattern);
      if (match) {
        repeatRequestScore = Math.max(repeatRequestScore, rp.weight);
        matches.push({
          locale: loc,
          category: rp.category,
          weight: rp.weight,
          matchedText: match[0],
        });
      }
    }

    // Check confusion patterns
    for (const cp of patterns.confusion) {
      const match = text.match(cp.pattern);
      if (match) {
        confusionScore = Math.max(confusionScore, cp.weight);
        matches.push({
          locale: loc,
          category: cp.category,
          weight: cp.weight,
          matchedText: match[0],
        });
      }
    }
  }

  return {
    frustrationScore,
    repeatRequestScore,
    confusionScore,
    matches,
    detectedLocale,
  };
}

export function countFillers(text: string, locale?: SupportedLocale): number {
  const detectedLocale = locale || detectLocale(text);
  if (!detectedLocale) return 0;

  const patterns = ALL_PATTERNS[detectedLocale];
  let count = 0;

  // Use word boundary that works with Unicode letters
  // Match filler at start/end of string or surrounded by non-letter characters
  for (const filler of patterns.fillers) {
    const escapedFiller = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match: start of string or non-letter, then filler, then end of string or non-letter
    const regex = new RegExp(`(?:^|[^a-zA-ZÀ-ÿ])${escapedFiller}(?:[^a-zA-ZÀ-ÿ]|$)`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      count += matches.length;
    }
  }

  return count;
}

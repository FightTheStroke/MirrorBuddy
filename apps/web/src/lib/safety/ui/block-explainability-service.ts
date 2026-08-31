/**
 * Block Explainability Service
 * Part of Ethical Design Hardening (F-06)
 *
 * When the safety layer stops an answer, the student deserves to know that
 * something was stopped and what to try instead — without being told the exact
 * trigger, which would double as a manual for evading the filter.
 *
 * This module is intentionally COPY-FREE. It maps the REAL categories the
 * safety layer emits (FilterResult.category from content-filter-core, plus
 * 'bias', 'jailbreak' and 'stem_*' from the chat routes) onto a small, closed
 * set of explanation buckets. The child-facing wording lives in next-intl
 * (messages/<locale>/safetyBlock.json) and is resolved by the UI component, so
 * every bucket is localised in all five locales and none is hardcoded here.
 */

/**
 * Closed set of explanation buckets shown to the student.
 * Deliberately coarser than the internal filter categories: several distinct
 * internal outcomes collapse into one bucket so the wording can never reveal
 * which specific rule fired.
 */
export const BLOCK_EXPLANATION_CATEGORIES = [
  'crisis', // distress / self-harm signal — route to a trusted adult
  'harmful', // could hurt someone (violence, weapons, illegal harm)
  'explicit', // not-for-children content
  'privacy', // personal information should stay private
  'unclear', // request could not be understood safely (incl. jailbreak)
  'fairness', // unfair / biased framing about people
  'language', // unkind or strong language
  'stem', // dangerous scientific detail withheld
  'generic', // anything unmapped — safe, honest fallback
] as const;

export type BlockExplanationCategory = (typeof BLOCK_EXPLANATION_CATEGORIES)[number];

/**
 * Normalised, copy-free description of how to explain a block to the student.
 */
export interface BlockExplanationDescriptor {
  /** Which localised explanation bucket to show. */
  category: BlockExplanationCategory;
  /** Whether to gently point the student towards a trusted adult. */
  suggestAskAdult: boolean;
  /**
   * Whether it is honest and safe to invite the student to rephrase.
   * False for crisis (a distress signal is not a filter to route around) and
   * for privacy (rewording does not make sharing personal data appropriate).
   */
  suggestRephrase: boolean;
}

/**
 * Direct map from an internal filter category to an explanation bucket.
 * Anything not listed here (and anything with the 'stem_' prefix, handled
 * separately) resolves to 'generic'.
 */
const CATEGORY_TO_BUCKET: Record<string, BlockExplanationCategory> = {
  crisis: 'crisis',
  violence: 'harmful',
  explicit: 'explicit',
  pii: 'privacy',
  jailbreak: 'unclear',
  bias: 'fairness',
  profanity: 'language',
  stem: 'stem',
};

/** Buckets that warrant pointing the student to a trusted adult. */
const ASK_ADULT_BUCKETS = new Set<BlockExplanationCategory>(['crisis', 'harmful']);

/** Buckets where inviting a rephrase would be dishonest or unsafe. */
const NO_REPHRASE_BUCKETS = new Set<BlockExplanationCategory>(['crisis', 'privacy']);

/**
 * Resolve the raw internal filter category into a safe, localisable descriptor.
 *
 * Never throws and never echoes the raw internal category back to the caller:
 * an unknown or malformed value degrades to the generic bucket.
 */
export function resolveBlockExplanation(rawCategory?: string | null): BlockExplanationDescriptor {
  const normalized = (rawCategory ?? '').trim().toLowerCase();

  let bucket: BlockExplanationCategory = 'generic';
  if (normalized.startsWith('stem_')) {
    bucket = 'stem';
  } else if (normalized in CATEGORY_TO_BUCKET) {
    bucket = CATEGORY_TO_BUCKET[normalized];
  }

  return {
    category: bucket,
    suggestAskAdult: ASK_ADULT_BUCKETS.has(bucket),
    suggestRephrase: !NO_REPHRASE_BUCKETS.has(bucket),
  };
}

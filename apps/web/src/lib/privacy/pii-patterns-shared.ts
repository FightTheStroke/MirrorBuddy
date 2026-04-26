/**
 * Shared PII Patterns
 * Part of Ethical Design Hardening (F-01)
 *
 * Contains patterns shared across all locales to avoid circular dependencies.
 */

/**
 * Combined Unicode-aware name pattern
 * Supports:
 * - Uppercase letter followed by lowercase letters (\p{Lu}\p{Ll}+)
 * - Hyphenated names (Jean-Pierre, Mary-Anne, Karl-Heinz)
 * - Apostrophe names (O'Brien, D'Angelo) - supports single letter before apostrophe
 * - Diacritics and accented characters (François, José, André)
 * - Multiple word names (at least 2 words)
 *
 * Uses Unicode property escapes for international support.
 */
export const COMBINED_NAME_PATTERN =
  // eslint-disable-next-line security/detect-unsafe-regex -- Intentional PII detection pattern for multi-locale names
  /\b\p{Lu}\p{Ll}+(?:[-\s']\p{Lu}\p{Ll}*)+\b/u;

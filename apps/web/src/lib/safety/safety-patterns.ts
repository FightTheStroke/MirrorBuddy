/**
 * MirrorBuddy Safety Patterns
 * Italian-specific profanity and inappropriate content patterns
 * Used by the content filter to detect input issues
 */

/**
 * Italian-specific profanity and inappropriate content patterns.
 * Used by the content filter to detect input issues.
 */
export const IT_CONTENT_PATTERNS = {
  // Severe - Immediate block
  severe: [
    // Self-harm keywords (in Italian)
    'suicid',
    'ammazzar',
    'tagliar',
    'farmi del male',
    'voglio morire',
    'non voglio vivere',
    // Violence
    'uccidere',
    'ammazzare',
    'sparare',
    'accoltellare',
    // Drugs (explicit)
    'coca',
    'eroina',
    'mdma',
    'ecstasy',
    'fumare erba',
  ],
  // Medium - Requires careful handling
  medium: [
    'droga',
    'alcol',
    'sigarett',
    'fumare',
    'sballo',
  ],
} as const;

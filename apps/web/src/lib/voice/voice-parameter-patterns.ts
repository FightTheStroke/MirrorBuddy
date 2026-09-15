// ============================================================================
// ITALIAN LANGUAGE PATTERNS
// ============================================================================

export const DIFFICULTY_PATTERNS = {
  easy: /\b(facile|semplice|elementare|base)\b/i,
  medium: /\b(medio|normale|standard)\b/i,
  hard: /\b(difficile|complesso|avanzato|impegnativo)\b/i,
};

export const LENGTH_PATTERNS = {
  short: /\b(breve|corto|sintetico|veloce)\b/i,
  medium: /\b(medio|normale)\b/i,
  long: /\b(lungo|dettagliato|approfondito|completo|esteso)\b/i,
};

export const CHART_TYPE_PATTERNS = {
  bar: /\b(grafico a barre|barre|istogramma|colonne)\b/i,
  line: /\b(grafico lineare|lineare|linea|andamento)\b/i,
  pie: /\b(grafico a torta|torta|circolare|pizza)\b/i,
  doughnut: /\b(ciambella|anello)\b/i,
  scatter: /\b(dispersione|scatter|punti)\b/i,
  radar: /\b(radar|ragnatela|spider)\b/i,
  polarArea: /\b(polare|area polare)\b/i,
};

// ============================================================================
// EXTRACTION UTILITIES
// ============================================================================

/**
 * Extract numbers from transcript
 */
export function extractNumbers(transcript: string): number[] {
  const numbers = transcript.match(/\b\d+\b/g);
  return numbers ? numbers.map(Number) : [];
}

/**
 * Extract topic after common prepositions
 */
export function extractTopic(transcript: string): string | null {
  // Try to extract topic after common patterns (order matters - most specific first)
  // Using greedy match to capture full phrases including prepositions like "di", "della", etc.
  // Note: These patterns are safe in this context (input is short voice transcript, max ~200 chars)
  /* eslint-disable security/detect-unsafe-regex */
  const patterns = [
    // "mostrami la formula della forza di gravità", "formula del teorema di pitagora" - MUST BE FIRST
    // Captures everything to end of string, including "di", "della", apostrophes
    /(?:la\s+)?formula\s+(?:della?|dello?)\s+([a-zàèéìòù\s']+)$/i,
    // "scrivi la formula del teorema di pitagora"
    /(?:la\s+)?formula\s+del?\s+([a-zàèéìòù\s']+)$/i,
    // "grafico a torta della composizione dell'aria", "fammi un grafico a torta della..." - BEFORE generic "della"
    /(?:un\s+)?grafico\s+(?:a\s+\w+\s+)?(?:della?|dello?|di)\s+([a-zàèéìòù\s']+)$/i,
    // "quiz difficile sulla seconda guerra mondiale con 10 domande" - NOT for formula/grafico
    /(?<!formula\s)(?<!grafico\s)(?:sulla?|della?)\s+([a-zàèéìòù\s']+)\s+(?:con|di)/i,
    // "crea flashcard sui verbi irregolari inglesi"
    /(?:flashcard|quiz|mappa)\s+(?:su|sui|sulle|sugli|sulla)\s+([a-zàèéìòù\s']+)$/i,
    // "quiz di 5 domande sulla fotosintesi"
    /(?:quiz|mappa|flashcard|riassunto|grafico)\s+.*?(?:sulla?|della?)\s+([a-zàèéìòù\s']+)$/i,
    // "riassunto lungo e dettagliato del genoma umano"
    /(?:riassunto|quiz|mappa).*?(?:del|della|dello|dei|degli|delle)\s+([a-zàèéìòù\s']+)$/i,
    // "sulle tabelline", "sui verbi", "della fotosintesi", "sul rinascimento"
    /(?:sulle?|sulla?|sul|della?|dello?|degli?|delle?|dei|per|riguardo a?)\s+(?:la\s+)?([a-zàèéìòù\s']+)$/i,
    // "compiti di matematica", "esercizio difficile di fisica"
    /(?:compiti?|esercizio(?:\s+\w+)?)\s+di\s+([a-zàèéìòù\s']+)$/i,
    // "argomento: storia"
    /(?:argomento|tema|topic):\s*([a-zàèéìòù\s']+)$/i,
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      return match[1].trim().toLowerCase();
    }
  }
  /* eslint-enable security/detect-unsafe-regex */

  return null;
}

/**
 * Extract difficulty level and convert to numeric scale
 */
export function extractDifficulty(transcript: string): number | undefined {
  if (DIFFICULTY_PATTERNS.easy.test(transcript)) return 2;
  if (DIFFICULTY_PATTERNS.hard.test(transcript)) return 4;
  if (DIFFICULTY_PATTERNS.medium.test(transcript)) return 3;
  return undefined;
}

/**
 * Extract length preference
 */
export function extractLength(transcript: string): 'short' | 'medium' | 'long' | undefined {
  if (LENGTH_PATTERNS.short.test(transcript)) return 'short';
  if (LENGTH_PATTERNS.long.test(transcript)) return 'long';
  if (LENGTH_PATTERNS.medium.test(transcript)) return 'medium';
  return undefined;
}

/**
 * Extract chart type from transcript
 */
export function extractChartType(transcript: string): string {
  for (const [type, pattern] of Object.entries(CHART_TYPE_PATTERNS)) {
    if (pattern.test(transcript)) {
      return type;
    }
  }
  return 'bar'; // Default
}

/**
 * Calculate confidence score based on extracted parameters
 */
export function calculateConfidence(
  paramsExtracted: number,
  totalPossibleParams: number,
  hasExplicitTopic: boolean,
  transcriptEmpty: boolean = false,
): number {
  // Empty transcript = low confidence
  if (transcriptEmpty) {
    return 0.3;
  }

  // No explicit topic = low confidence (max 0.4)
  if (!hasExplicitTopic) {
    const extractionRatio = paramsExtracted / totalPossibleParams;
    return Math.min(0.3 + extractionRatio * 0.1, 0.4);
  }

  let confidence = 0.4; // Base with explicit topic

  // Adjust based on parameter extraction
  const extractionRatio = paramsExtracted / totalPossibleParams;
  confidence += extractionRatio * 0.35;

  // Boost if we have explicit topic
  confidence += 0.2;

  return Math.min(confidence, 1.0);
}

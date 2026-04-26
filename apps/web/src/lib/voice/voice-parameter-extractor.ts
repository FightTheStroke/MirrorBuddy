// ============================================================================
// VOICE PARAMETER EXTRACTOR
// Extracts tool parameters from Italian voice transcripts
// ============================================================================

import { extractParametersWithAI } from "./ai-parameter-extractor";
import { TOOL_SCHEMAS } from "./tool-parameter-schemas";
import { logger } from "@/lib/logger";

/**
 * Extracted parameters from voice transcript
 */
export interface ExtractedParameters {
  toolName: string;
  parameters: Record<string, unknown>;
  confidence: number; // 0-1, how confident we are in extraction
  error?: string; // Optional error message if extraction failed
}

/**
 * Context information to help with parameter extraction
 */
export interface ExtractionContext {
  maestroSubject?: string;
  conversationTopics?: string[];
}

/**
 * Configuration options for parameter extraction
 */
export interface ExtractionOptions {
  /**
   * Enable AI-based fallback when regex confidence < 0.5
   * Default: true
   */
  enableAIFallback?: boolean;

  /**
   * Minimum confidence threshold for triggering AI fallback
   * Default: 0.5
   */
  aiFallbackThreshold?: number;
}

/**
 * Tool-specific parameter schemas
 */
interface ToolParameterSchema {
  extractParams: (
    transcript: string,
    context?: ExtractionContext,
  ) => { params: Record<string, unknown>; confidence: number };
}

// ============================================================================
// ITALIAN LANGUAGE PATTERNS
// ============================================================================

const DIFFICULTY_PATTERNS = {
  easy: /\b(facile|semplice|elementare|base)\b/i,
  medium: /\b(medio|normale|standard)\b/i,
  hard: /\b(difficile|complesso|avanzato|impegnativo)\b/i,
};

const LENGTH_PATTERNS = {
  short: /\b(breve|corto|sintetico|veloce)\b/i,
  medium: /\b(medio|normale)\b/i,
  long: /\b(lungo|dettagliato|approfondito|completo|esteso)\b/i,
};

const CHART_TYPE_PATTERNS = {
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
function extractNumbers(transcript: string): number[] {
  const numbers = transcript.match(/\b\d+\b/g);
  return numbers ? numbers.map(Number) : [];
}

/**
 * Extract topic after common prepositions
 */
function extractTopic(transcript: string): string | null {
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
function extractDifficulty(transcript: string): number | undefined {
  if (DIFFICULTY_PATTERNS.easy.test(transcript)) return 2;
  if (DIFFICULTY_PATTERNS.hard.test(transcript)) return 4;
  if (DIFFICULTY_PATTERNS.medium.test(transcript)) return 3;
  return undefined;
}

/**
 * Extract length preference
 */
function extractLength(
  transcript: string,
): "short" | "medium" | "long" | undefined {
  if (LENGTH_PATTERNS.short.test(transcript)) return "short";
  if (LENGTH_PATTERNS.long.test(transcript)) return "long";
  if (LENGTH_PATTERNS.medium.test(transcript)) return "medium";
  return undefined;
}

/**
 * Extract chart type from transcript
 */
function extractChartType(transcript: string): string {
  for (const [type, pattern] of Object.entries(CHART_TYPE_PATTERNS)) {
    if (pattern.test(transcript)) {
      return type;
    }
  }
  return "bar"; // Default
}

/**
 * Calculate confidence score based on extracted parameters
 */
function calculateConfidence(
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

// ============================================================================
// TOOL-SPECIFIC EXTRACTORS
// ============================================================================

const TOOL_EXTRACTORS: Record<string, ToolParameterSchema> = {
  quiz: {
    extractParams: (transcript, context) => {
      const numbers = extractNumbers(transcript);
      const topic = extractTopic(transcript);
      const difficulty = extractDifficulty(transcript);

      // Question count: look for numbers, default to 5
      let questionCount = 5;
      if (numbers.length > 0) {
        // If multiple numbers, prefer the LAST one that looks like question count
        // "3 quiz con 5 domande" -> we want 5
        const validCounts = numbers.filter((n) => n >= 3 && n <= 20);
        if (validCounts.length > 0) {
          questionCount = validCounts[validCounts.length - 1];
        }
      }

      // Fallback to context if no topic found
      const finalTopic =
        topic || context?.conversationTopics?.[0] || "argomento generale";

      const params: Record<string, unknown> = {
        topic: finalTopic,
        questionCount,
      };

      if (difficulty) {
        params.difficulty = difficulty;
      }

      const hasExplicitTopic = topic !== null;
      const hasContextFallback = !topic && context?.conversationTopics?.[0];
      const paramsCount = Object.keys(params).length;
      const transcriptEmpty = transcript.trim().length === 0;
      let confidence = calculateConfidence(
        paramsCount,
        3,
        hasExplicitTopic,
        transcriptEmpty,
      );

      // Boost confidence if using context successfully
      if (hasContextFallback) {
        confidence = Math.max(confidence, 0.6);
      }

      return { params, confidence };
    },
  },

  flashcard: {
    extractParams: (transcript, context) => {
      const numbers = extractNumbers(transcript);
      const topic = extractTopic(transcript);

      // Card count: default to 8
      const count = numbers.find((n) => n >= 3 && n <= 30) || 8;

      const finalTopic =
        topic || context?.conversationTopics?.[0] || "argomento generale";

      const params: Record<string, unknown> = {
        topic: finalTopic,
        count,
      };

      const hasExplicitTopic = topic !== null;
      const confidence = calculateConfidence(2, 2, hasExplicitTopic);

      return { params, confidence };
    },
  },

  mindmap: {
    extractParams: (transcript, context) => {
      const topic = extractTopic(transcript);

      const finalTopic =
        topic || context?.conversationTopics?.[0] || "concetto centrale";

      const params: Record<string, unknown> = {
        title: finalTopic,
      };

      const hasExplicitTopic = topic !== null;
      const transcriptEmpty = transcript.trim().length === 0;

      // If using context fallback, reduce confidence
      let confidence = calculateConfidence(
        1,
        1,
        hasExplicitTopic,
        transcriptEmpty,
      );
      if (!hasExplicitTopic && context?.conversationTopics?.[0]) {
        confidence = 0.6; // Medium confidence with context fallback
      }

      return { params, confidence };
    },
  },

  formula: {
    extractParams: (transcript, context) => {
      const topic = extractTopic(transcript);

      // Use topic from extractTopic() which already handles full phrases
      const finalDescription =
        topic ||
        context?.conversationTopics?.[0] ||
        context?.maestroSubject ||
        "formula";

      const params: Record<string, unknown> = {
        description: finalDescription,
      };

      const hasExplicitTopic = topic !== null;
      const confidence = calculateConfidence(1, 1, hasExplicitTopic);

      return { params, confidence: Math.max(confidence, 0.5) };
    },
  },

  chart: {
    extractParams: (transcript, context) => {
      const chartType = extractChartType(transcript);
      const topic = extractTopic(transcript);

      // Use topic from extractTopic() which already handles full phrases
      const title = topic || context?.conversationTopics?.[0] || "dati";

      const params: Record<string, unknown> = {
        chartType,
        title,
      };

      const hasExplicitTopic = topic !== null;
      const confidence = calculateConfidence(2, 2, hasExplicitTopic);

      return { params, confidence };
    },
  },

  summary: {
    extractParams: (transcript, context) => {
      const topic = extractTopic(transcript);
      const length = extractLength(transcript);

      const finalTopic =
        topic || context?.conversationTopics?.join(", ") || "argomento";

      const params: Record<string, unknown> = {
        topic: finalTopic,
      };

      if (length) {
        params.length = length;
      }

      const hasExplicitTopic = topic !== null;
      const paramsCount = Object.keys(params).length;
      const confidence = calculateConfidence(paramsCount, 2, hasExplicitTopic);

      return { params, confidence };
    },
  },

  homework: {
    extractParams: (transcript, context) => {
      const topic = extractTopic(transcript);

      // Extract subject from patterns like "compiti di matematica"
      const subjectMatch = transcript.match(/compiti\s+di\s+([a-zàèéìòù\s]+)/i);
      const subject = subjectMatch?.[1]?.trim() || topic;

      const finalTopic =
        subject || context?.maestroSubject || "compiti generali";

      const params: Record<string, unknown> = {
        topic: finalTopic,
      };

      // Check for difficulty
      if (DIFFICULTY_PATTERNS.hard.test(transcript)) {
        params.difficulty = "hard";
      } else if (DIFFICULTY_PATTERNS.easy.test(transcript)) {
        params.difficulty = "easy";
      }

      const hasExplicitTopic = subject !== null;
      const paramsCount = Object.keys(params).length;
      const confidence = calculateConfidence(paramsCount, 2, hasExplicitTopic);

      return { params, confidence: Math.max(confidence, 0.5) };
    },
  },

  // PDF and Webcam tools don't extract parameters from voice
  pdf: {
    extractParams: () => ({ params: {}, confidence: 0.5 }),
  },

  webcam: {
    extractParams: () => ({ params: {}, confidence: 0.5 }),
  },
};

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract tool parameters from voice transcript
 *
 * This function first attempts regex-based extraction. If confidence is below
 * the threshold (default 0.5), it falls back to AI-based extraction.
 *
 * @param toolName - The tool being called (e.g., 'quiz', 'mindmap')
 * @param transcript - Italian voice transcript
 * @param context - Optional context (maestro subject, conversation topics)
 * @param options - Optional configuration for extraction behavior
 * @returns Extracted parameters with confidence score
 *
 * @example
 * extractToolParameters(
 *   'quiz',
 *   'crea un quiz di 5 domande sulla fotosintesi'
 * )
 * // => {
 * //   toolName: 'quiz',
 * //   parameters: { topic: 'fotosintesi', questionCount: 5 },
 * //   confidence: 0.85
 * // }
 *
 * @example
 * // With AI fallback disabled
 * extractToolParameters(
 *   'quiz',
 *   'voglio fare un test',
 *   undefined,
 *   { enableAIFallback: false }
 * )
 */
export async function extractToolParameters(
  toolName: string,
  transcript: string,
  context?: ExtractionContext,
  options?: ExtractionOptions,
): Promise<ExtractedParameters> {
  // Default options
  const enableAIFallback = options?.enableAIFallback ?? true;
  const aiFallbackThreshold = options?.aiFallbackThreshold ?? 0.5;

  // Normalize transcript
  const normalizedTranscript = transcript.trim().toLowerCase();

  // Check if we have an extractor for this tool
  const extractor = TOOL_EXTRACTORS[toolName];

  if (!extractor) {
    // Unknown tool - return empty parameters
    return {
      toolName,
      parameters: {},
      confidence: 0,
    };
  }

  // Extract parameters using regex-based extraction
  const { params, confidence } = extractor.extractParams(
    normalizedTranscript,
    context,
  );

  const regexResult: ExtractedParameters = {
    toolName,
    parameters: params,
    confidence,
  };

  // Check if AI fallback is needed
  if (enableAIFallback && confidence < aiFallbackThreshold) {
    logger.info("[Voice Extractor] Low regex confidence, trying AI fallback", {
      toolName,
      regexConfidence: confidence,
      threshold: aiFallbackThreshold,
    });

    // Get schema for this tool
    const schema = TOOL_SCHEMAS[toolName];
    if (schema) {
      try {
        const aiResult = await extractParametersWithAI(
          toolName,
          transcript,
          schema,
        );

        // Use AI result if it has higher confidence
        if (aiResult.confidence > confidence) {
          logger.info("[Voice Extractor] AI fallback succeeded", {
            toolName,
            regexConfidence: confidence,
            aiConfidence: aiResult.confidence,
            improvement: aiResult.confidence - confidence,
          });
          return aiResult;
        } else {
          logger.info(
            "[Voice Extractor] AI fallback had lower confidence, using regex",
            {
              toolName,
              regexConfidence: confidence,
              aiConfidence: aiResult.confidence,
            },
          );
        }
      } catch (error) {
        logger.warn(
          "[Voice Extractor] AI fallback failed, using regex result",
          {
            toolName,
            error: error instanceof Error ? error.message : String(error),
          },
        );
        // Return regex result if AI fails
      }
    }
  }

  return regexResult;
}

// ============================================================================
// VOICE PARAMETER EXTRACTOR
// Extracts tool parameters from Italian voice transcripts
// ============================================================================

import { extractParametersWithAI } from './ai-parameter-extractor';
import { TOOL_SCHEMAS } from './tool-parameter-schemas';
import { logger } from '@/lib/logger';
import { TOOL_EXTRACTORS } from './voice-parameter-extractors';
import type {
  ExtractedParameters,
  ExtractionContext,
  ExtractionOptions,
} from './voice-parameter-types';
export type {
  ExtractedParameters,
  ExtractionContext,
  ExtractionOptions,
} from './voice-parameter-types';

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
  const { params, confidence } = extractor.extractParams(normalizedTranscript, context);

  const regexResult: ExtractedParameters = {
    toolName,
    parameters: params,
    confidence,
  };

  // Check if AI fallback is needed
  if (enableAIFallback && confidence < aiFallbackThreshold) {
    logger.info('[Voice Extractor] Low regex confidence, trying AI fallback', {
      toolName,
      regexConfidence: confidence,
      threshold: aiFallbackThreshold,
    });

    // Get schema for this tool
    const schema = TOOL_SCHEMAS[toolName];
    if (schema) {
      try {
        const aiResult = await extractParametersWithAI(toolName, transcript, schema);

        // Use AI result if it has higher confidence
        if (aiResult.confidence > confidence) {
          logger.info('[Voice Extractor] AI fallback succeeded', {
            toolName,
            regexConfidence: confidence,
            aiConfidence: aiResult.confidence,
            improvement: aiResult.confidence - confidence,
          });
          return aiResult;
        } else {
          logger.info('[Voice Extractor] AI fallback had lower confidence, using regex', {
            toolName,
            regexConfidence: confidence,
            aiConfidence: aiResult.confidence,
          });
        }
      } catch (error) {
        logger.warn('[Voice Extractor] AI fallback failed, using regex result', {
          toolName,
          error: error instanceof Error ? error.message : String(error),
        });
        // Return regex result if AI fails
      }
    }
  }

  return regexResult;
}

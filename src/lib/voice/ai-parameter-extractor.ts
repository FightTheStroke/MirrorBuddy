// ============================================================================
// AI-BASED PARAMETER EXTRACTOR
// Fallback extraction using AI when regex-based extraction has low confidence
// ============================================================================

import { logger } from "@/lib/logger";
import { chatCompletion } from "@/lib/ai/providers";
import type { ToolParameterSchema } from "./tool-parameter-schemas";
import type { ExtractedParameters } from "./voice-parameter-extractor";

/**
 * Extract tool parameters using AI when regex extraction fails
 *
 * This function is called as a fallback when regex-based extraction
 * returns confidence < 0.5. It uses structured output prompting to
 * extract parameters from Italian voice transcripts.
 *
 * @param toolName - Name of the tool being invoked
 * @param transcript - Italian voice command transcript
 * @param schema - Tool parameter schema with extraction hints
 * @returns Extracted parameters with confidence score
 *
 * @example
 * const result = await extractParametersWithAI(
 *   'quiz',
 *   'vorrei un test sulla rivoluzione francese con otto domande',
 *   TOOL_SCHEMAS.quiz
 * );
 * // => {
 * //   toolName: 'quiz',
 * //   parameters: { topic: 'rivoluzione francese', questionCount: 8 },
 * //   confidence: 0.8
 * // }
 */
export async function extractParametersWithAI(
  toolName: string,
  transcript: string,
  schema: ToolParameterSchema,
): Promise<ExtractedParameters> {
  try {
    logger.debug("[AI Extractor] Starting AI-based parameter extraction", {
      toolName,
      transcript: transcript.substring(0, 100),
    });

    // Build extraction prompt with schema information
    const systemPrompt = buildExtractionPrompt(toolName, schema);

    // Call AI with structured output request
    const response = await chatCompletion(
      [
        {
          role: "user",
          content: transcript,
        },
      ],
      systemPrompt,
      {
        temperature: 0.1, // Low temperature for consistent structured output
        maxTokens: 500,
        model: "gpt-4o-mini", // Fast, cost-effective model for extraction
      },
    );

    // Parse AI response as JSON
    let extractedParams: Record<string, unknown>;
    try {
      extractedParams = JSON.parse(response.content.trim());
    } catch (parseError) {
      logger.warn("[AI Extractor] Failed to parse AI response as JSON", {
        toolName,
        response: response.content,
        error: parseError,
      });
      return {
        toolName,
        parameters: {},
        confidence: 0.3,
        error: "AI response was not valid JSON",
      };
    }

    // Calculate confidence based on parameters extracted
    const confidence = calculateAIConfidence(extractedParams, schema);

    logger.info("[AI Extractor] Successfully extracted parameters", {
      toolName,
      parametersCount: Object.keys(extractedParams).length,
      confidence,
    });

    return {
      toolName,
      parameters: extractedParams,
      confidence,
    };
  } catch (error) {
    logger.error("[AI Extractor] AI extraction failed", {
      toolName,
      transcript,
      error: error instanceof Error ? error.message : String(error),
    });

    // Return empty parameters with zero confidence on error
    return {
      toolName,
      parameters: {},
      confidence: 0,
      error: `AI extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Build the extraction prompt with schema information
 *
 * The prompt instructs the AI to:
 * 1. Extract specific parameters from the Italian transcript
 * 2. Use the schema's extraction hints
 * 3. Return only valid JSON (no markdown, no explanation)
 */
function buildExtractionPrompt(
  toolName: string,
  schema: ToolParameterSchema,
): string {
  // Build parameter list with types and descriptions
  const parameterDescriptions = schema.parameters
    .map((param) => {
      const required = param.required ? "(required)" : "(optional)";
      const enumInfo = param.enumValues
        ? ` - valid values: ${param.enumValues.join(", ")}`
        : "";
      const defaultInfo =
        param.defaultValue !== undefined
          ? ` - default: ${param.defaultValue}`
          : "";

      return `- ${param.name} (${param.type}) ${required}: ${param.description}${enumInfo}${defaultInfo}`;
    })
    .join("\n");

  return `You are a parameter extraction assistant for the MirrorBuddy educational platform.

Your task: Extract tool parameters from an Italian voice command.

Tool: ${toolName}
Parameters to extract:
${parameterDescriptions}

Extraction hints:
${schema.extractionHint}

IMPORTANT RULES:
1. Return ONLY a valid JSON object with the extracted parameters
2. DO NOT include markdown code blocks (\`\`\`json) - just the raw JSON
3. DO NOT add explanations or comments
4. For required parameters: ALWAYS provide a value, even if you need to infer it
5. For optional parameters: Only include if explicitly mentioned in the transcript
6. Use exact parameter names from the schema
7. Convert Italian numbers to digits (e.g., "otto" → 8, "dozzina" → 12)
8. Normalize Italian difficulty words: facile→2, medio→3, difficile→4
9. Normalize length words: breve→short, medio→medium, lungo→long

Example output format:
{"topic": "fotosintesi", "questionCount": 5}

Now extract parameters from the following Italian voice command:`;
}

/**
 * Calculate confidence score based on AI extraction results
 *
 * Confidence is based on:
 * - How many required parameters were extracted
 * - How many optional parameters were extracted
 * - Total coverage of the schema
 */
function calculateAIConfidence(
  extractedParams: Record<string, unknown>,
  schema: ToolParameterSchema,
): number {
  const requiredParams = schema.parameters.filter((p) => p.required);
  const optionalParams = schema.parameters.filter((p) => !p.required);
  const totalParams = schema.parameters.length;

  // Count extracted parameters
  let extractedRequired = 0;
  let extractedOptional = 0;

  for (const param of requiredParams) {
    if (
      extractedParams[param.name] !== undefined &&
      extractedParams[param.name] !== null
    ) {
      extractedRequired++;
    }
  }

  for (const param of optionalParams) {
    if (
      extractedParams[param.name] !== undefined &&
      extractedParams[param.name] !== null
    ) {
      extractedOptional++;
    }
  }

  // If any required parameter is missing, confidence is low
  if (extractedRequired < requiredParams.length) {
    return 0.4;
  }

  // Calculate coverage
  const extractedCount = extractedRequired + extractedOptional;
  const coverage = totalParams > 0 ? extractedCount / totalParams : 0;

  // Base confidence: 0.7 for all required params
  // Additional bonus based on coverage ratio (max +0.2)
  let confidence = 0.7;
  confidence += Math.min(coverage * 0.2, 0.2);

  return Math.min(confidence, 0.9); // Cap at 0.9 (AI can still make mistakes)
}

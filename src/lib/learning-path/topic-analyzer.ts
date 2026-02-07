// ============================================================================
// TOPIC ANALYZER
// Analyze PDF text to identify macro-topics for learning path generation
// Plan 8 MVP - Wave 1: Pedagogical Analysis [F-06, F-07, F-09]
// ============================================================================

import { chatCompletion } from "@/lib/ai/providers";
import { logger } from "@/lib/logger";
import { tierService } from "@/lib/tier";
import { getDeploymentForModel } from "@/lib/ai/providers/deployment-mapping";

/**
 * Represents a topic identified in the document
 */
export interface IdentifiedTopic {
  id: string;
  title: string;
  description: string;
  keyConcepts: string[];
  estimatedDifficulty: "basic" | "intermediate" | "advanced";
  order: number;
  textExcerpt: string; // Representative text from the document
}

/**
 * Result of topic analysis
 */
export interface TopicAnalysisResult {
  documentTitle: string;
  subject?: string;
  topics: IdentifiedTopic[];
  suggestedOrder: string[]; // Topic IDs in pedagogical order
  totalEstimatedMinutes: number;
}

/**
 * Analyze document text to identify 2-5 macro-topics
 * [F-06] Identificare macro-argomenti nel PDF (2-5 argomenti)
 */
export async function analyzeTopics(
  text: string,
  title: string,
  subject?: string,
  userId?: string,
): Promise<TopicAnalysisResult> {
  // Input validation
  if (!text || typeof text !== "string") {
    throw new Error("Invalid input: text is required and must be a string");
  }
  if (!title || typeof title !== "string") {
    throw new Error("Invalid input: title is required and must be a string");
  }
  if (text.trim().length < 100) {
    throw new Error(
      "Invalid input: text is too short for meaningful analysis (minimum 100 characters)",
    );
  }

  logger.info("Starting topic analysis", {
    title,
    subject,
    textLength: text.length,
  });

  // Truncate text for AI processing (max ~12000 chars to leave room for response)
  const truncatedText = text.substring(0, 12000);
  const isTruncated = text.length > 12000;

  const prompt = `Sei un esperto di pedagogia e didattica. Analizza questo documento educativo e identifica i MACRO-ARGOMENTI principali.

TITOLO: ${title}
${subject ? `MATERIA: ${subject}` : ""}

DOCUMENTO:
${truncatedText}${isTruncated ? "\n\n[... documento continua ...]" : ""}

ISTRUZIONI:
1. Identifica da 2 a 5 macro-argomenti distinti nel documento
2. Per ogni argomento, estrai 3-5 concetti chiave
3. Valuta la difficoltà di ogni argomento
4. Suggerisci l'ordine pedagogico migliore (dai prerequisiti ai concetti più avanzati)
5. Stima il tempo di studio per ogni argomento (5-20 minuti)

IMPORTANTE:
- Gli argomenti devono essere DISTINTI e non sovrapposti
- L'ordine deve seguire la logica pedagogica (prima i concetti base, poi quelli che dipendono da essi)
- Le descrizioni devono essere chiare e adatte a studenti con DSA/ADHD

Rispondi SOLO con JSON valido in questo formato:
{
  "documentTitle": "Titolo del documento",
  "topics": [
    {
      "id": "topic-1",
      "title": "Titolo Argomento",
      "description": "Descrizione breve (max 50 parole)",
      "keyConcepts": ["concetto1", "concetto2", "concetto3"],
      "estimatedDifficulty": "basic|intermediate|advanced",
      "order": 1,
      "estimatedMinutes": 10,
      "textExcerpt": "Breve estratto rappresentativo dal testo (max 100 parole)"
    }
  ],
  "suggestedOrder": ["topic-1", "topic-2"],
  "totalEstimatedMinutes": 30
}`;

  // Get AI config from tier (ADR 0073)
  const aiConfig = await tierService.getFeatureAIConfigForUser(
    userId ?? null,
    "chat",
  );
  const deploymentName = getDeploymentForModel(aiConfig.model);

  const result = await chatCompletion(
    [{ role: "user", content: prompt }],
    "Sei un pedagogista esperto in didattica inclusiva. Rispondi SOLO con JSON valido.",
    {
      temperature: aiConfig.temperature,
      maxTokens: aiConfig.maxTokens,
      model: deploymentName,
    },
  );

  // Parse JSON response
  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.error("Failed to parse topic analysis JSON", {
      response: result.content.substring(0, 500),
    });
    throw new Error("Failed to parse topic analysis response");
  }

  try {
    const analysisData = JSON.parse(jsonMatch[0]);

    // Validate and normalize structure
    if (!analysisData.topics || !Array.isArray(analysisData.topics)) {
      throw new Error("Invalid topic analysis structure: missing topics array");
    }

    if (analysisData.topics.length < 2 || analysisData.topics.length > 5) {
      logger.warn("Topic count outside expected range", {
        count: analysisData.topics.length,
      });
    }

    const topics: IdentifiedTopic[] = analysisData.topics.map(
      (
        t: {
          id?: string;
          title: string;
          description: string;
          keyConcepts?: string[];
          estimatedDifficulty?: string;
          order?: number;
          textExcerpt?: string;
        },
        index: number,
      ) => ({
        id: t.id || `topic-${index + 1}`,
        title: String(t.title),
        description: String(t.description),
        keyConcepts: Array.isArray(t.keyConcepts)
          ? t.keyConcepts.map(String)
          : [],
        estimatedDifficulty: validateDifficulty(t.estimatedDifficulty),
        order: typeof t.order === "number" ? t.order : index + 1,
        textExcerpt: t.textExcerpt
          ? String(t.textExcerpt).substring(0, 500)
          : "",
      }),
    );

    const result: TopicAnalysisResult = {
      documentTitle: analysisData.documentTitle || title,
      subject,
      topics,
      suggestedOrder: Array.isArray(analysisData.suggestedOrder)
        ? analysisData.suggestedOrder.map(String)
        : topics.map((t) => t.id),
      totalEstimatedMinutes:
        typeof analysisData.totalEstimatedMinutes === "number"
          ? analysisData.totalEstimatedMinutes
          : topics.length * 10,
    };

    logger.info("Topic analysis complete", {
      topicCount: topics.length,
      topicTitles: topics.map((t) => t.title),
    });

    return result;
  } catch (parseError) {
    const errorMessage =
      parseError instanceof Error ? parseError.message : String(parseError);
    logger.error("JSON parsing failed for topic analysis", {
      errorDetails: errorMessage,
      jsonAttempt: jsonMatch[0].substring(0, 500),
    });
    // Preserve validation errors, wrap JSON parsing errors
    if (errorMessage.startsWith("Invalid topic analysis")) {
      throw parseError;
    }
    throw new Error("Failed to parse topic analysis JSON");
  }
}

/**
 * Validate and normalize difficulty level
 */
function validateDifficulty(
  value: unknown,
): "basic" | "intermediate" | "advanced" {
  const normalized = String(value).toLowerCase();
  if (
    normalized === "basic" ||
    normalized === "base" ||
    normalized === "facile"
  ) {
    return "basic";
  }
  if (
    normalized === "intermediate" ||
    normalized === "intermedio" ||
    normalized === "medio"
  ) {
    return "intermediate";
  }
  if (
    normalized === "advanced" ||
    normalized === "avanzato" ||
    normalized === "difficile"
  ) {
    return "advanced";
  }
  return "intermediate"; // Default
}

/**
 * Reorder topics based on pedagogical analysis
 * [F-09] Suggerire ordine di apprendimento
 */
export function orderTopicsPedagogically(
  topics: IdentifiedTopic[],
): IdentifiedTopic[] {
  // Sort by the order field (AI-suggested pedagogical order)
  return [...topics].sort((a, b) => a.order - b.order);
}

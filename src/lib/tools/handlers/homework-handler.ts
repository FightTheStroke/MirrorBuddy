// ============================================================================
// HOMEWORK HANDLER
// Upload homework exercise and receive maieutic guidance
// F-02: All tools available during conversations
// ============================================================================

import { registerToolHandler } from "../tool-executor";
import { nanoid } from "nanoid";
import { chatCompletion } from "@/lib/ai/providers";
import { logger } from "@/lib/logger";
import { tierService } from "@/lib/tier";
import { getDeploymentForModel } from "@/lib/ai/providers/deployment-mapping";
import type { ToolExecutionResult, ToolContext } from "@/types/tools";
import { extractTextFromPDF } from "./study-kit-handler";

/**
 * Structured homework exercise data for maieutic assistance
 */
export interface HomeworkData {
  type: "homework";
  exerciseType: string; // e.g., 'math', 'physics', 'essay', 'translation'
  problemStatement: string; // The question or task
  givenData?: string[]; // Known values, constraints, context
  topic?: string; // Subject or topic area
  difficulty?: string; // Estimated difficulty level
  hints?: string[]; // Initial guidance hints (maieutic)
  originalText?: string; // Full extracted text
  sourceType: "pdf" | "image" | "text";
}

/**
 * Analyze extracted homework text to structure for maieutic guidance
 */
async function analyzeHomework(
  text: string,
  _sourceType: "pdf" | "image" | "text",
  userId?: string,
): Promise<Omit<HomeworkData, "type" | "sourceType">> {
  const defaultHints = [
    "Cosa ti viene chiesto di trovare o fare?",
    "Quali informazioni hai a disposizione?",
    "Qual è il primo passo che potresti fare?",
  ];

  const prompt = `Analizza questo esercizio e crea JSON con: exerciseType, problemStatement, givenData[], topic, difficulty, hints[] (domande guida maieutiche).

ESERCIZIO:
${text.substring(0, 4000)}

Rispondi SOLO con JSON valido.`;

  try {
    // Get AI config from tier (ADR 0073)
    const aiConfig = await tierService.getFeatureAIConfigForUser(
      userId ?? null,
      "homework",
    );
    const deploymentName = getDeploymentForModel(aiConfig.model);

    const result = await chatCompletion(
      [{ role: "user", content: prompt }],
      "Tutor educativo maieutico. SOLO JSON.",
      {
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
        model: deploymentName,
      },
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("Failed to parse homework analysis JSON");
      return {
        exerciseType: "unknown",
        problemStatement: text.substring(0, 500),
        hints: defaultHints,
        originalText: text,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      exerciseType: String(parsed.exerciseType || "unknown"),
      problemStatement: String(
        parsed.problemStatement || text.substring(0, 500),
      ),
      givenData: Array.isArray(parsed.givenData)
        ? parsed.givenData.map(String)
        : undefined,
      topic: parsed.topic ? String(parsed.topic) : undefined,
      difficulty: parsed.difficulty ? String(parsed.difficulty) : undefined,
      hints: Array.isArray(parsed.hints)
        ? parsed.hints.map(String)
        : defaultHints,
      originalText: text,
    };
  } catch (error) {
    logger.error("Failed to analyze homework", undefined, error);
    return {
      exerciseType: "unknown",
      problemStatement: text.substring(0, 500),
      hints: defaultHints,
      originalText: text,
    };
  }
}

/**
 * Extract text from image using Azure Vision API
 * Uses tier-based AI config (ADR 0073)
 */
async function extractTextFromImage(
  imageData: string,
  userId?: string,
): Promise<string> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment =
    process.env.AZURE_OPENAI_VISION_DEPLOYMENT ||
    process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

  if (!apiKey || !endpoint || !deployment) {
    throw new Error("Azure OpenAI configuration missing for vision analysis");
  }

  // Get AI config from tier - use webcam config for vision tasks (ADR 0073)
  const aiConfig = await tierService.getFeatureAIConfigForUser(
    userId ?? null,
    "webcam",
  );

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  const imageUrl = imageData.startsWith("data:")
    ? imageData
    : `data:image/jpeg;base64,${imageData}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Estrai tutto il testo da questa immagine (esercizio/problema). Mantieni formattazione. Trascrivi formule matematiche in formato leggibile.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Azure Vision API error", {
        status: response.status,
        errorDetails: errorText,
      });
      throw new Error(`Azure Vision API error (${response.status})`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in Azure Vision API response");
    }

    return content.trim();
  } catch (error) {
    logger.error("Failed to extract text from image", undefined, error);
    throw new Error("Impossibile estrarre il testo dall'immagine");
  }
}

/**
 * Register homework_help handler
 * Accepts file upload (PDF or image) and structures for maieutic assistance
 */
registerToolHandler(
  "homework_help",
  async (args, context: ToolContext): Promise<ToolExecutionResult> => {
    const { fileData, fileType, text } = args as {
      fileData?: string | ArrayBuffer;
      fileType?: "pdf" | "image";
      text?: string;
    };
    const userId = context?.userId;

    try {
      let extractedText: string;
      let sourceType: "pdf" | "image" | "text";

      if (text) {
        extractedText = text;
        sourceType = "text";
      } else if (fileType === "pdf" && fileData) {
        const buffer =
          typeof fileData === "string"
            ? Buffer.from(fileData, "base64")
            : Buffer.from(fileData);
        const result = await extractTextFromPDF(buffer);
        extractedText = result.text;
        sourceType = "pdf";
      } else if (fileType === "image" && fileData) {
        const imageDataUrl =
          typeof fileData === "string"
            ? fileData
            : `data:image/jpeg;base64,${Buffer.from(fileData).toString("base64")}`;
        extractedText = await extractTextFromImage(imageDataUrl, userId);
        sourceType = "image";
      } else {
        return {
          success: false,
          toolId: nanoid(),
          toolType: "homework",
          error: "Devi fornire un file PDF, un'immagine, o del testo.",
        };
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return {
          success: false,
          toolId: nanoid(),
          toolType: "homework",
          error: "Nessun testo trovato nel file caricato.",
        };
      }

      const analysis = await analyzeHomework(extractedText, sourceType, userId);
      const homeworkData: HomeworkData = {
        type: "homework",
        sourceType,
        ...analysis,
      };

      logger.info("Homework processed", {
        exerciseType: homeworkData.exerciseType,
        topic: homeworkData.topic,
      });

      return {
        success: true,
        toolId: nanoid(),
        toolType: "homework",
        data: homeworkData,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to process homework", {
        errorDetails: errorMessage,
      });

      return {
        success: false,
        toolId: nanoid(),
        toolType: "homework",
        error: `Errore elaborazione: ${errorMessage}`,
      };
    }
  },
);

export { analyzeHomework, extractTextFromImage };

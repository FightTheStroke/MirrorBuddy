// ============================================================================
// WEBCAM HANDLER
// OCR + Image interpretation using Azure OpenAI Vision
// F-02: All tools available during conversations
// ============================================================================

import { registerToolHandler } from "../tool-executor";
import { nanoid } from "nanoid";
import { logger } from "@/lib/logger";
import { tierService } from "@/lib/tier/server";
import type {
  ToolExecutionResult,
  WebcamData,
  ToolContext,
} from "@/types/tools";

/**
 * Call Azure OpenAI Vision API for multimodal analysis
 * Uses tier-based AI config (ADR 0073)
 */
async function analyzeImageWithVision(
  imageBase64: string,
  userId?: string,
): Promise<{ text: string; description: string }> {
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

  // Get AI config from tier (ADR 0073)
  const aiConfig = await tierService.getFeatureAIConfigForUser(
    userId ?? null,
    "webcam",
  );

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  // Format: data:image/jpeg;base64,{base64_data}
  const imageUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  logger.debug("[Webcam Handler] Calling Azure Vision API", {
    endpoint: endpoint.replace(/api-key=[^&]+/gi, "api-key=***"),
    deployment,
    temperature: aiConfig.temperature,
    maxTokens: aiConfig.maxTokens,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: `You are an AI assistant specialized in analyzing educational images.
Your task is to:
1. Extract ALL text visible in the image (OCR) - include handwritten and printed text
2. Describe the visual content (diagrams, drawings, charts, etc.)

Format your response as JSON with two fields:
- "text": All extracted text (empty string if no text)
- "description": Description of visual content (what's in the image)

Be thorough and accurate. For educational content, note mathematical formulas, diagrams, and key visual elements.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and extract both text and visual description:",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("[Webcam Handler] Azure Vision API error", {
      status: response.status,
      errorDetails: errorText,
    });
    throw new Error(
      `Azure Vision API error (${response.status}): ${errorText}`,
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in Azure Vision API response");
  }

  try {
    const parsed = JSON.parse(content);
    return {
      text: parsed.text || "",
      description: parsed.description || "",
    };
  } catch (error) {
    logger.error(
      "[Webcam Handler] Failed to parse Vision API response",
      { content },
      error,
    );
    throw new Error("Invalid JSON response from Vision API");
  }
}

/**
 * Register the webcam capture handler
 */
registerToolHandler(
  "capture_webcam",
  async (args, context: ToolContext): Promise<ToolExecutionResult> => {
    const { imageBase64 } = args as {
      imageBase64: string;
    };
    const userId = context?.userId;

    // Validate input
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return {
        success: false,
        toolId: nanoid(),
        toolType: "webcam",
        error: "imageBase64 is required and must be a base64 string",
      };
    }

    // Validate base64 format
    if (
      !imageBase64.match(/^data:image\/(jpeg|jpg|png|gif);base64,/) &&
      !imageBase64.match(/^[A-Za-z0-9+/=]+$/)
    ) {
      return {
        success: false,
        toolId: nanoid(),
        toolType: "webcam",
        error: "Invalid base64 image format",
      };
    }

    try {
      logger.info("[Webcam Handler] Starting image analysis");

      // Call Azure OpenAI Vision API
      const analysis = await analyzeImageWithVision(imageBase64, userId);

      const data: WebcamData = {
        imageBase64,
        extractedText: analysis.text,
        imageDescription: analysis.description,
        analysisTimestamp: new Date(),
      };

      logger.info("[Webcam Handler] Analysis complete", {
        hasText: !!analysis.text,
        hasDescription: !!analysis.description,
        textLength: analysis.text.length,
      });

      return {
        success: true,
        toolId: nanoid(),
        toolType: "webcam",
        data,
      };
    } catch (error) {
      logger.error(
        "[Webcam Handler] Error during image analysis",
        undefined,
        error,
      );

      return {
        success: false,
        toolId: nanoid(),
        toolType: "webcam",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during image analysis",
      };
    }
  },
);

export { analyzeImageWithVision };

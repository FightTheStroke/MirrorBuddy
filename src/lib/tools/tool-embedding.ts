/**
 * Tool Embedding Service
 * Wave 4: Generates embeddings for materials to enable semantic search
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isEmbeddingConfigured } from "@/lib/rag/embedding-service";
import { generatePrivacyAwareEmbedding } from "@/lib/rag/privacy-aware-embedding";

/**
 * Generate embedding for a material asynchronously
 * Non-blocking - errors are logged but don't fail the save
 */
export async function generateMaterialEmbeddingAsync(
  materialId: string,
  userId: string,
  content: Record<string, unknown>,
  toolType: string,
): Promise<void> {
  // Skip if embedding not configured
  if (!isEmbeddingConfigured()) {
    return;
  }

  try {
    // Extract searchable text from content
    const text = extractTextForEmbedding(content, toolType);
    if (!text || text.length < 10) {
      return; // Too short for meaningful embedding
    }

    const result = await generatePrivacyAwareEmbedding(text.substring(0, 8000)); // Limit to ~2k tokens

    await prisma.contentEmbedding.upsert({
      where: {
        sourceType_sourceId_chunkIndex: {
          sourceType: "material",
          sourceId: materialId,
          chunkIndex: 0,
        },
      },
      create: {
        userId,
        sourceType: "material",
        sourceId: materialId,
        chunkIndex: 0,
        content: text.substring(0, 1000),
        vector: JSON.stringify(result.vector),
        model: result.model,
        dimensions: result.vector.length,
        tokenCount: result.usage.tokens,
      },
      update: {
        content: text.substring(0, 1000),
        vector: JSON.stringify(result.vector),
        model: result.model,
        tokenCount: result.usage.tokens,
      },
    });
  } catch (error) {
    logger.warn("Failed to generate embedding for material", {
      materialId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Extract searchable text from tool content
 */
export function extractTextForEmbedding(
  content: Record<string, unknown>,
  toolType: string,
): string {
  const parts: string[] = [];

  // Common fields
  if (typeof content.title === "string") parts.push(content.title);
  if (typeof content.topic === "string") parts.push(content.topic);
  if (typeof content.description === "string") parts.push(content.description);

  // Type-specific extraction
  switch (toolType) {
    case "mindmap":
      if (typeof content.centralTopic === "string")
        parts.push(content.centralTopic);
      if (Array.isArray(content.nodes)) {
        content.nodes.forEach((node: unknown) => {
          if (typeof node === "object" && node !== null && "label" in node) {
            parts.push(String((node as { label: unknown }).label));
          }
        });
      }
      break;

    case "flashcards":
      if (Array.isArray(content.cards)) {
        content.cards.forEach((card: unknown) => {
          if (typeof card === "object" && card !== null) {
            const c = card as { front?: unknown; back?: unknown };
            if (typeof c.front === "string") parts.push(c.front);
            if (typeof c.back === "string") parts.push(c.back);
          }
        });
      }
      break;

    case "quiz":
      if (Array.isArray(content.questions)) {
        content.questions.forEach((q: unknown) => {
          if (typeof q === "object" && q !== null) {
            const question = q as { question?: unknown; options?: unknown[] };
            if (typeof question.question === "string")
              parts.push(question.question);
          }
        });
      }
      break;

    case "summary":
      if (Array.isArray(content.sections)) {
        content.sections.forEach((s: unknown) => {
          if (typeof s === "object" && s !== null) {
            const section = s as { title?: unknown; content?: unknown };
            if (typeof section.title === "string") parts.push(section.title);
            if (typeof section.content === "string")
              parts.push(section.content);
          }
        });
      }
      break;

    case "timeline":
      if (Array.isArray(content.events)) {
        content.events.forEach((e: unknown) => {
          if (typeof e === "object" && e !== null) {
            const event = e as { title?: unknown; description?: unknown };
            if (typeof event.title === "string") parts.push(event.title);
            if (typeof event.description === "string")
              parts.push(event.description);
          }
        });
      }
      break;

    default:
      // Try to extract any string values
      Object.values(content).forEach((v) => {
        if (typeof v === "string" && v.length > 10) {
          parts.push(v);
        }
      });
  }

  return parts.join(" ").trim();
}

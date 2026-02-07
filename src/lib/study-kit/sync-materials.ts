/**
 * Study Kit to Material Sync
 *
 * Synchronizes Study Kit generated materials to the Material table
 * so they appear in Supporti/Archives.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateSearchableText } from "@/lib/search/searchable-text";
import { indexMaterial } from "@/lib/rag";
import type { ToolType } from "@/types/tools";

interface StudyKitData {
  id: string;
  title: string;
  subject?: string | null;
  summary?: string | null;
  mindmap?: string | null;
  demo?: string | null;
  quiz?: string | null;
  originalText?: string | null;
}

/**
 * Save Study Kit generated materials to the Material table.
 * This makes them appear in Supporti/Archives.
 */
export async function saveMaterialsFromStudyKit(
  userId: string,
  studyKit: StudyKitData,
): Promise<{ created: number; updated: number }> {
  const materials: Array<{
    userId: string;
    toolId: string;
    toolType: ToolType;
    title: string;
    content: string;
    searchableText: string;
    subject?: string;
    sourceStudyKitId: string;
    preview?: string;
  }> = [];

  // Summary
  if (studyKit.summary) {
    const content = { text: studyKit.summary };
    materials.push({
      userId,
      toolId: `sk-summary-${studyKit.id}`,
      toolType: "summary",
      title: `${studyKit.title} - Riassunto`,
      content: JSON.stringify(content),
      searchableText: generateSearchableText("summary", content),
      subject: studyKit.subject || undefined,
      sourceStudyKitId: studyKit.id,
      preview: studyKit.summary.substring(0, 200),
    });
  }

  // Mindmap
  if (studyKit.mindmap) {
    const parsed = JSON.parse(studyKit.mindmap);
    materials.push({
      userId,
      toolId: `sk-mindmap-${studyKit.id}`,
      toolType: "mindmap",
      title: `${studyKit.title} - Mappa Mentale`,
      content: studyKit.mindmap,
      searchableText: generateSearchableText("mindmap", parsed),
      subject: studyKit.subject || undefined,
      sourceStudyKitId: studyKit.id,
      preview: parsed.title || parsed.topic || "Mappa mentale",
    });
  }

  // Demo
  if (studyKit.demo) {
    const parsed = JSON.parse(studyKit.demo);
    materials.push({
      userId,
      toolId: `sk-demo-${studyKit.id}`,
      toolType: "demo",
      title: `${studyKit.title} - Demo Interattiva`,
      content: studyKit.demo,
      searchableText: generateSearchableText("demo", parsed),
      subject: studyKit.subject || undefined,
      sourceStudyKitId: studyKit.id,
      preview: parsed.title || parsed.description || "Demo interattiva",
    });
  }

  // Quiz
  if (studyKit.quiz) {
    const parsed = JSON.parse(studyKit.quiz);
    const questionCount = parsed.questions?.length || 0;
    materials.push({
      userId,
      toolId: `sk-quiz-${studyKit.id}`,
      toolType: "quiz",
      title: `${studyKit.title} - Quiz`,
      content: studyKit.quiz,
      searchableText: generateSearchableText("quiz", parsed),
      subject: studyKit.subject || undefined,
      sourceStudyKitId: studyKit.id,
      preview: `${questionCount} domande`,
    });
  }

  if (materials.length === 0) {
    return { created: 0, updated: 0 };
  }

  // Get existing toolIds in a single query to track created vs updated
  const toolIdsToCheck = materials.map((m) => m.toolId);
  const existingMaterials = await prisma.material.findMany({
    where: { toolId: { in: toolIdsToCheck } },
    select: { toolId: true },
  });
  const existingToolIds = new Set(
    existingMaterials.map((m: { toolId: string }) => m.toolId),
  );

  // Batch upsert all materials in a single transaction (N+1 fix)
  await prisma.$transaction(
    materials.map((material) =>
      prisma.material.upsert({
        where: { toolId: material.toolId },
        create: material,
        update: {
          title: material.title,
          content: material.content,
          searchableText: material.searchableText,
          preview: material.preview,
          updatedAt: new Date(),
        },
      }),
    ),
  );

  const created = materials.filter(
    (m) => !existingToolIds.has(m.toolId),
  ).length;
  const updated = materials.filter((m) => existingToolIds.has(m.toolId)).length;

  logger.info("Synced Study Kit materials", {
    studyKitId: studyKit.id,
    created,
    updated,
    total: materials.length,
  });

  return { created, updated };
}

/**
 * Delete all materials that originated from a Study Kit.
 * Called when a Study Kit is deleted.
 */
export async function deleteMaterialsFromStudyKit(
  studyKitId: string,
): Promise<number> {
  const result = await prisma.material.deleteMany({
    where: { sourceStudyKitId: studyKitId },
  });

  logger.info("Deleted Study Kit materials", {
    studyKitId,
    count: result.count,
  });

  return result.count;
}

/**
 * Index Study Kit original text for RAG retrieval.
 * This enables AI to access the full document content during conversations.
 */
export async function indexStudyKitContent(
  userId: string,
  studyKit: StudyKitData,
): Promise<{ chunksIndexed: number }> {
  if (!studyKit.originalText) {
    logger.debug("No original text to index", { studyKitId: studyKit.id });
    return { chunksIndexed: 0 };
  }

  try {
    const result = await indexMaterial({
      userId,
      sourceType: "studykit",
      sourceId: studyKit.id,
      content: studyKit.originalText,
      subject: studyKit.subject || undefined,
      tags: ["study-kit", studyKit.title],
    });

    logger.info("Indexed Study Kit content for RAG", {
      studyKitId: studyKit.id,
      chunksIndexed: result.chunksIndexed,
      totalTokens: result.totalTokens,
    });

    return { chunksIndexed: result.chunksIndexed };
  } catch (error) {
    logger.error("Failed to index Study Kit content", {
      studyKitId: studyKit.id,
      error: String(error),
    });
    return { chunksIndexed: 0 };
  }
}

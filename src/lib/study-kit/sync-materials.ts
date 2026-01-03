/**
 * Study Kit to Material Sync
 *
 * Synchronizes Study Kit generated materials to the Material table
 * so they appear in Supporti/Archives.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateSearchableText } from '@/lib/search/searchable-text';
import type { ToolType } from '@/types/tools';

interface StudyKitData {
  id: string;
  title: string;
  subject?: string | null;
  summary?: string | null;
  mindmap?: string | null;
  demo?: string | null;
  quiz?: string | null;
}

/**
 * Save Study Kit generated materials to the Material table.
 * This makes them appear in Supporti/Archives.
 */
export async function saveMaterialsFromStudyKit(
  userId: string,
  studyKit: StudyKitData
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
      toolType: 'summary',
      title: `${studyKit.title} - Riassunto`,
      content: JSON.stringify(content),
      searchableText: generateSearchableText('summary', content),
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
      toolType: 'mindmap',
      title: `${studyKit.title} - Mappa Mentale`,
      content: studyKit.mindmap,
      searchableText: generateSearchableText('mindmap', parsed),
      subject: studyKit.subject || undefined,
      sourceStudyKitId: studyKit.id,
      preview: parsed.title || parsed.topic || 'Mappa mentale',
    });
  }

  // Demo
  if (studyKit.demo) {
    const parsed = JSON.parse(studyKit.demo);
    materials.push({
      userId,
      toolId: `sk-demo-${studyKit.id}`,
      toolType: 'demo',
      title: `${studyKit.title} - Demo Interattiva`,
      content: studyKit.demo,
      searchableText: generateSearchableText('demo', parsed),
      subject: studyKit.subject || undefined,
      sourceStudyKitId: studyKit.id,
      preview: parsed.title || parsed.description || 'Demo interattiva',
    });
  }

  // Quiz
  if (studyKit.quiz) {
    const parsed = JSON.parse(studyKit.quiz);
    const questionCount = parsed.questions?.length || 0;
    materials.push({
      userId,
      toolId: `sk-quiz-${studyKit.id}`,
      toolType: 'quiz',
      title: `${studyKit.title} - Quiz`,
      content: studyKit.quiz,
      searchableText: generateSearchableText('quiz', parsed),
      subject: studyKit.subject || undefined,
      sourceStudyKitId: studyKit.id,
      preview: `${questionCount} domande`,
    });
  }

  if (materials.length === 0) {
    return { created: 0, updated: 0 };
  }

  let created = 0;
  let updated = 0;

  // Upsert each material
  for (const material of materials) {
    const existing = await prisma.material.findUnique({
      where: { toolId: material.toolId },
    });

    if (existing) {
      await prisma.material.update({
        where: { toolId: material.toolId },
        data: {
          title: material.title,
          content: material.content,
          searchableText: material.searchableText,
          preview: material.preview,
          updatedAt: new Date(),
        },
      });
      updated++;
    } else {
      await prisma.material.create({
        data: material,
      });
      created++;
    }
  }

  logger.info('Synced Study Kit materials', {
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
  studyKitId: string
): Promise<number> {
  const result = await prisma.material.deleteMany({
    where: { sourceStudyKitId: studyKitId },
  });

  logger.info('Deleted Study Kit materials', {
    studyKitId,
    count: result.count,
  });

  return result.count;
}

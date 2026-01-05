// ============================================================================
// MATERIAL LINKER
// Find related previous materials for learning path topics (MVP: text matching)
// Plan 8 MVP - Wave 1: Pedagogical Analysis [F-08]
// ============================================================================

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { IdentifiedTopic } from './topic-analyzer';

/**
 * A previously studied material that relates to a topic
 */
export interface RelatedMaterial {
  id: string;
  title: string;
  toolType: string;
  subject?: string;
  createdAt: Date;
  relevanceScore: number; // 0-1 based on keyword matches
  matchedKeywords: string[];
}

/**
 * Topic with related materials attached
 */
export interface TopicWithRelations extends IdentifiedTopic {
  relatedMaterials: RelatedMaterial[];
}

/**
 * Find materials from the same user that relate to the given topics
 * [F-08] Rilevare collegamenti con materiali precedenti
 *
 * MVP Implementation: Simple text matching on title, topic, and searchableText
 * Phase 2 will use vector similarity via pgvector
 */
export async function findRelatedMaterials(
  userId: string,
  topics: IdentifiedTopic[],
  maxPerTopic: number = 5
): Promise<TopicWithRelations[]> {
  logger.info('Finding related materials', { userId, topicCount: topics.length });

  // Get all active materials for this user
  const userMaterials = await prisma.material.findMany({
    where: {
      userId,
      status: 'active',
    },
    select: {
      id: true,
      title: true,
      toolType: true,
      subject: true,
      topic: true,
      searchableText: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100, // Limit to recent materials for performance
  });

  logger.debug('Found user materials', { count: userMaterials.length });

  // For each topic, find related materials
  const topicsWithRelations: TopicWithRelations[] = topics.map((topic) => {
    // Build search keywords from topic
    const keywords = [
      topic.title.toLowerCase(),
      ...topic.keyConcepts.map((c) => c.toLowerCase()),
    ];

    // Score each material by keyword matches
    const scoredMaterials: RelatedMaterial[] = userMaterials
      .map((material) => {
        const searchText = [
          material.title,
          material.topic,
          material.searchableText,
          material.subject,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        // Count keyword matches
        const matchedKeywords = keywords.filter((keyword) => searchText.includes(keyword));

        const relevanceScore = matchedKeywords.length / keywords.length;

        return {
          id: material.id,
          title: material.title,
          toolType: material.toolType,
          subject: material.subject ?? undefined,
          createdAt: material.createdAt,
          relevanceScore,
          matchedKeywords,
        };
      })
      .filter((m) => m.relevanceScore > 0) // Only include matches
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxPerTopic);

    return {
      ...topic,
      relatedMaterials: scoredMaterials,
    };
  });

  // Log summary
  const totalRelations = topicsWithRelations.reduce((sum, t) => sum + t.relatedMaterials.length, 0);
  logger.info('Related materials found', {
    topicCount: topics.length,
    totalRelations,
    topicsWithRelations: topicsWithRelations
      .filter((t) => t.relatedMaterials.length > 0)
      .map((t) => ({
        topic: t.title,
        relatedCount: t.relatedMaterials.length,
      })),
  });

  return topicsWithRelations;
}

/**
 * Format related materials as a user-friendly message
 * Used by the UI to show "Hai già studiato questo argomento in..."
 */
export function formatRelatedMaterialsMessage(
  topic: TopicWithRelations,
  maxToShow: number = 3
): string | null {
  if (topic.relatedMaterials.length === 0) {
    return null;
  }

  const materials = topic.relatedMaterials.slice(0, maxToShow);
  const titles = materials.map((m) => `"${m.title}"`).join(', ');

  if (materials.length === 1) {
    return `Hai già studiato questo argomento in ${titles}`;
  }

  const remaining = topic.relatedMaterials.length - maxToShow;
  const suffix = remaining > 0 ? ` e altri ${remaining} materiali` : '';

  return `Questo si collega a quello che hai studiato in: ${titles}${suffix}`;
}

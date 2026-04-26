/**
 * Summary Export Converters
 * Convert summaries to other formats (mindmap, flashcards)
 */

import { logger } from '@/lib/logger';
import type { SummaryData, MindmapNode, FlashcardItem } from '@/types/tools';

/**
 * Convert summary sections to mindmap nodes
 */
export function convertSummaryToMindmap(data: SummaryData): {
  topic: string;
  nodes: MindmapNode[];
} {
  const nodes: MindmapNode[] = [];
  let nodeId = 1;

  // Root node
  const rootId = `node-${nodeId++}`;
  nodes.push({
    id: rootId,
    label: data.topic,
    parentId: null,
  });

  // Create nodes for each section
  for (const section of data.sections) {
    const sectionId = `node-${nodeId++}`;
    nodes.push({
      id: sectionId,
      label: section.title,
      parentId: rootId,
    });

    // Add key points as child nodes
    if (section.keyPoints && section.keyPoints.length > 0) {
      for (const point of section.keyPoints) {
        nodes.push({
          id: `node-${nodeId++}`,
          label: point,
          parentId: sectionId,
        });
      }
    }
  }

  logger.info('[SummaryExport] Converted to mindmap', {
    topic: data.topic,
    nodesCount: nodes.length,
  });

  return {
    topic: data.topic,
    nodes,
  };
}

/**
 * Generate flashcards from summary key points
 */
export function generateFlashcardsFromSummary(data: SummaryData): {
  topic: string;
  cards: FlashcardItem[];
} {
  const cards: FlashcardItem[] = [];

  for (const section of data.sections) {
    // Create a card for the section itself if it has content
    if (section.content) {
      cards.push({
        front: `Cosa sai su: ${section.title}?`,
        back: section.content,
      });
    }

    // Create cards for each key point
    if (section.keyPoints && section.keyPoints.length > 0) {
      for (const point of section.keyPoints) {
        // Create a question from the point
        cards.push({
          front: `${section.title}: Completa la frase...`,
          back: point,
        });
      }
    }
  }

  logger.info('[SummaryExport] Generated flashcards', {
    topic: data.topic,
    cardsCount: cards.length,
  });

  return {
    topic: data.topic,
    cards,
  };
}

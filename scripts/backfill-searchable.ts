/**
 * Backfill Script: Generate searchableText for Materials
 *
 * Generates pre-computed searchable text for all materials
 * that don't have it yet. Uses the same extraction logic as
 * Fuse.js search to ensure consistency.
 *
 * Usage: npx ts-node scripts/backfill-searchable.ts
 *
 * Part of Knowledge Hub search optimization.
 * ADR: 0022-knowledge-hub-architecture.md
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BackfillStats {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
}

// ToolType kept for documentation; not used in runtime since toolType comes as string from DB
type _ToolType = 'mindmap' | 'quiz' | 'flashcard' | 'demo' | 'summary' | 'diagram' | 'timeline' | 'formula' | 'chart' | 'pdf' | 'homework' | 'webcam' | 'search';

// ============================================================================
// TEXT EXTRACTION FUNCTIONS
// (Duplicated from src/lib/search/searchable-text.ts for script isolation)
// ============================================================================

function generateSearchableText(toolType: string, content: unknown): string {
  if (!content) return '';

  try {
    const data = typeof content === 'string' ? JSON.parse(content) : content;

    switch (toolType) {
      case 'mindmap':
        return extractMindmapText(data);
      case 'quiz':
        return extractQuizText(data);
      case 'flashcard':
        return extractFlashcardText(data);
      case 'summary':
        return extractSummaryText(data);
      case 'demo':
        return extractDemoText(data);
      case 'homework':
        return extractHomeworkText(data);
      default:
        return extractGenericText(data);
    }
  } catch {
    return '';
  }
}

function extractMindmapText(data: unknown): string {
  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  if (obj.title) parts.push(String(obj.title));
  if (obj.topic) parts.push(String(obj.topic));

  if (Array.isArray(obj.nodes)) {
    for (const node of obj.nodes) {
      if (node && typeof node === 'object' && 'label' in node) {
        parts.push(String(node.label));
      }
    }
  }

  if (obj.markdown && typeof obj.markdown === 'string') {
    parts.push(obj.markdown);
  }

  return parts.join(' ').trim();
}

function extractQuizText(data: unknown): string {
  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  if (obj.topic) parts.push(String(obj.topic));

  if (Array.isArray(obj.questions)) {
    for (const q of obj.questions) {
      if (q && typeof q === 'object') {
        if ('question' in q) parts.push(String(q.question));
        if ('options' in q && Array.isArray(q.options)) {
          parts.push(...q.options.map(String));
        }
        if ('explanation' in q) parts.push(String(q.explanation));
      }
    }
  }

  return parts.join(' ').trim();
}

function extractFlashcardText(data: unknown): string {
  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  if (obj.topic) parts.push(String(obj.topic));

  if (Array.isArray(obj.cards)) {
    for (const card of obj.cards) {
      if (card && typeof card === 'object') {
        if ('front' in card) parts.push(String(card.front));
        if ('back' in card) parts.push(String(card.back));
        if ('hint' in card) parts.push(String(card.hint));
      }
    }
  }

  return parts.join(' ').trim();
}

function extractSummaryText(data: unknown): string {
  const obj = data as Record<string, unknown>;

  if (obj.text && typeof obj.text === 'string') {
    return obj.text;
  }
  if (obj.content && typeof obj.content === 'string') {
    return obj.content;
  }
  if (obj.summary && typeof obj.summary === 'string') {
    return obj.summary;
  }

  return extractGenericText(data);
}

function extractDemoText(data: unknown): string {
  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  if (obj.title) parts.push(String(obj.title));
  if (obj.description) parts.push(String(obj.description));

  if (obj.html && typeof obj.html === 'string') {
    const textOnly = obj.html.replace(/<[^>]+>/g, ' ');
    parts.push(textOnly);
  }

  return parts.join(' ').trim();
}

function extractHomeworkText(data: unknown): string {
  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  if (obj.assignment) parts.push(String(obj.assignment));

  if (Array.isArray(obj.steps)) {
    for (const step of obj.steps) {
      if (step && typeof step === 'object' && 'text' in step) {
        parts.push(String(step.text));
      }
    }
  }

  return parts.join(' ').trim();
}

function extractGenericText(data: unknown): string {
  if (typeof data === 'string') return data;
  if (typeof data !== 'object' || data === null) return '';

  const parts: string[] = [];
  const obj = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;

    if (typeof value === 'string') {
      parts.push(value);
    }
  }

  return parts.join(' ').trim();
}

// ============================================================================
// BACKFILL LOGIC
// ============================================================================

const BATCH_SIZE = 100;

async function backfillSearchableText(): Promise<BackfillStats> {
  const stats: BackfillStats = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  console.log('Starting searchableText backfill...\n');

  // Get all materials without searchableText
  const materials = await prisma.material.findMany({
    where: {
      OR: [
        { searchableText: null },
        { searchableText: '' },
      ],
    },
    select: {
      id: true,
      toolType: true,
      title: true,
      content: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  stats.total = materials.length;
  console.log(`Found ${stats.total} materials without searchableText.\n`);

  if (stats.total === 0) {
    console.log('All materials already have searchableText. Exiting.');
    return stats;
  }

  // Process in batches
  for (let i = 0; i < materials.length; i += BATCH_SIZE) {
    const batch = materials.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(materials.length / BATCH_SIZE);

    console.log(`Processing batch ${batchNum}/${totalBatches}...`);

    for (const material of batch) {
      try {
        const searchableText = generateSearchableText(
          material.toolType,
          material.content
        );

        if (!searchableText.trim()) {
          console.log(`  [SKIP] ${material.id} - No extractable text`);
          stats.skipped++;
          continue;
        }

        await prisma.material.update({
          where: { id: material.id },
          data: { searchableText },
        });

        const preview = searchableText.substring(0, 50);
        console.log(`  [OK] ${material.id} (${material.toolType}): ${preview}...`);
        stats.updated++;
      } catch (error) {
        console.error(`  [ERROR] ${material.id}: ${error}`);
        stats.errors++;
      }
    }
  }

  return stats;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Backfill: searchableText for Materials');
  console.log('='.repeat(60));
  console.log();

  try {
    const stats = await backfillSearchableText();

    console.log();
    console.log('='.repeat(60));
    console.log('Backfill Summary');
    console.log('='.repeat(60));
    console.log(`  Total records:  ${stats.total}`);
    console.log(`  Updated:        ${stats.updated}`);
    console.log(`  Skipped:        ${stats.skipped}`);
    console.log(`  Errors:         ${stats.errors}`);
    console.log();

    if (stats.errors > 0) {
      console.log('Some records failed to update. Check logs above.');
      process.exit(1);
    }

    if (stats.updated > 0) {
      console.log('Backfill completed successfully!');
      console.log();
      console.log('searchableText is now populated for Fuse.js search.');
    } else {
      console.log('No records needed updating.');
    }
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

/**
 * Migration Script: Index Conversation Summaries into RAG System
 *
 * This script processes all existing conversation summaries and indexes them
 * into the RAG system for semantic search capabilities.
 *
 * Usage:
 *   npm exec tsx scripts/migrate-summary-embeddings.ts
 *   npm exec tsx scripts/migrate-summary-embeddings.ts --dry-run
 *   npm exec tsx scripts/migrate-summary-embeddings.ts --batch-size=100
 *   npm exec tsx scripts/migrate-summary-embeddings.ts --dry-run --batch-size=50
 *
 * Options:
 *   --dry-run      Count conversations without indexing
 *   --batch-size=N Process in batches of N (default: 50)
 */

import { prisma } from "@/lib/db";
import { indexConversationSummary } from "@/lib/rag/summary-indexer";

interface MigrationOptions {
  dryRun: boolean;
  batchSize: number;
}

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  let batchSize = 50;
  const batchSizeArg = args.find((a) => a.startsWith("--batch-size="));
  if (batchSizeArg) {
    const parsed = parseInt(batchSizeArg.split("=")[1], 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      batchSize = parsed;
    }
  }

  return { dryRun, batchSize };
}

async function getConversationWithSummaries(
  skip: number,
  take: number,
): Promise<
  Array<{
    id: string;
    userId: string;
    summary: string;
    maestroId: string;
    topics: string;
  }>
> {
  return prisma.conversation.findMany({
    where: {
      summary: { not: null },
      markedForDeletion: false,
    },
    select: {
      id: true,
      userId: true,
      summary: true,
      maestroId: true,
      topics: true,
    },
    skip,
    take,
    orderBy: {
      updatedAt: "desc",
    },
  });
}

async function getTotalConversationsWithSummaries(): Promise<number> {
  return prisma.conversation.count({
    where: {
      summary: { not: null },
      markedForDeletion: false,
    },
  });
}

function parseTopics(topicsJson: string): string[] {
  try {
    const parsed = JSON.parse(topicsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function processConversationBatch(
  conversations: Array<{
    id: string;
    userId: string;
    summary: string;
    maestroId: string;
    topics: string;
  }>,
  startIndex: number,
): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  let successful = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    const currentIndex = startIndex + i + 1;

    try {
      const topics = parseTopics(conv.topics);
      const metadata = {
        maestroId: conv.maestroId,
        topics: topics.length > 0 ? topics : undefined,
      };

      await indexConversationSummary(
        conv.id,
        conv.userId,
        conv.summary,
        metadata,
      );
      successful++;
      process.stdout.write(`\r  [${currentIndex}] Indexed: ${conv.id}`);
    } catch (error) {
      failed++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({ id: conv.id, error: errorMessage });
      console.error(
        `\n  [ERROR] Failed to index conversation ${conv.id}: ${errorMessage}`,
      );
    }
  }

  return { successful, failed, errors };
}

async function main(): Promise<void> {
  const options = parseArgs();

  console.log("=".repeat(70));
  console.log("Migration: Index Conversation Summaries into RAG System");
  console.log("=".repeat(70));
  console.log(
    `Mode: ${options.dryRun ? "DRY RUN (counting only)" : "LIVE (indexing)"}`,
  );
  console.log(`Batch Size: ${options.batchSize}`);
  console.log("");

  try {
    // Get total count
    const totalConversations = await getTotalConversationsWithSummaries();
    console.log(
      `Found ${totalConversations} conversation(s) with summaries to process`,
    );
    console.log("");

    if (totalConversations === 0) {
      console.log("No conversations with summaries found. Migration complete.");
      return;
    }

    if (options.dryRun) {
      console.log(
        "DRY RUN: Would process the above conversations. Use without --dry-run to execute.",
      );
      return;
    }

    // Process in batches
    let processedTotal = 0;
    let successfulTotal = 0;
    let failedTotal = 0;
    const allErrors: Array<{ id: string; error: string }> = [];

    const totalBatches = Math.ceil(totalConversations / options.batchSize);

    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const skip = batchNum * options.batchSize;
      const take = options.batchSize;

      console.log(
        `\nBatch ${batchNum + 1}/${totalBatches} (processing ${take} items starting at offset ${skip})`,
      );

      const batch = await getConversationWithSummaries(skip, take);
      const result = await processConversationBatch(batch, processedTotal);

      processedTotal += batch.length;
      successfulTotal += result.successful;
      failedTotal += result.failed;
      allErrors.push(...result.errors);

      console.log("");
      console.log(`  ✓ Successful: ${result.successful}`);
      console.log(`  ✗ Failed: ${result.failed}`);
    }

    // Summary
    console.log("");
    console.log("=".repeat(70));
    console.log("Migration Summary");
    console.log("=".repeat(70));
    console.log(`Total Processed: ${processedTotal}`);
    console.log(`Successful: ${successfulTotal}`);
    console.log(`Failed: ${failedTotal}`);

    if (allErrors.length > 0) {
      console.log(`\nFailed Conversations:`);
      allErrors.forEach((err) => {
        console.log(`  - ${err.id}: ${err.error}`);
      });
    }

    console.log("");
    console.log("Migration complete!");
  } catch (error) {
    console.error("Fatal error during migration:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});

/**
 * ModelCatalog Seed - ADR 0073
 *
 * Populates the ModelCatalog table with available AI models and their metadata.
 * Used by admin UI for model selection per tier/feature.
 */

import { PrismaClient } from '@prisma/client';

import { models } from './model-catalog-data';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ModelCatalog with available AI models...');

  for (const model of models) {
    await prisma.modelCatalog.upsert({
      where: { name: model.name },
      update: {
        displayName: model.displayName,
        provider: model.provider,
        deploymentName: model.deploymentName,
        category: model.category,
        inputCostPer1k: model.inputCostPer1k,
        outputCostPer1k: model.outputCostPer1k,
        maxTokens: model.maxTokens,
        contextWindow: model.contextWindow,
        supportsVision: model.supportsVision,
        supportsTools: model.supportsTools,
        supportsJson: model.supportsJson,
        qualityScore: model.qualityScore,
        speedScore: model.speedScore,
        educationScore: model.educationScore,
        recommendedFor: model.recommendedFor,
        notRecommendedFor: model.notRecommendedFor,
        notes: model.notes,
        isActive: true,
      },
      create: {
        name: model.name,
        displayName: model.displayName,
        provider: model.provider,
        deploymentName: model.deploymentName,
        category: model.category,
        inputCostPer1k: model.inputCostPer1k,
        outputCostPer1k: model.outputCostPer1k,
        maxTokens: model.maxTokens,
        contextWindow: model.contextWindow,
        supportsVision: model.supportsVision,
        supportsTools: model.supportsTools,
        supportsJson: model.supportsJson,
        qualityScore: model.qualityScore,
        speedScore: model.speedScore,
        educationScore: model.educationScore,
        recommendedFor: model.recommendedFor,
        notRecommendedFor: model.notRecommendedFor,
        notes: model.notes,
        isActive: true,
      },
    });
    console.log(`  ✓ ${model.name} (${model.displayName})`);
  }

  const retired = await prisma.modelCatalog.updateMany({
    where: { name: { notIn: models.map((model) => model.name) }, isActive: true },
    data: { isActive: false },
  });
  console.log(
    `\nModelCatalog seed completed: ${models.length} models, ${retired.count} deactivated`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * ModelCatalog Seed - ADR 0073
 *
 * Populates the ModelCatalog table with available AI models and their metadata.
 * Used by admin UI for model selection per tier/feature.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ModelSeedData {
  name: string;
  displayName: string;
  provider: string;
  deploymentName: string;
  category: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  maxTokens: number;
  contextWindow: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsJson: boolean;
  qualityScore: number;
  speedScore: number;
  educationScore: number;
  recommendedFor: string[];
  notRecommendedFor: string[];
  notes: string | null;
}

const models: ModelSeedData[] = [
  // GPT-4o family (legacy — retiring 2026-03-31 Standard, 2026-10-01 Provisioned)
  {
    name: 'gpt-4o',
    displayName: 'GPT-4o (retiring)',
    provider: 'azure',
    deploymentName: 'gpt-4o',
    category: 'chat',
    inputCostPer1k: 0.005,
    outputCostPer1k: 0.015,
    maxTokens: 4096,
    contextWindow: 128000,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
    qualityScore: 4,
    speedScore: 4,
    educationScore: 4,
    recommendedFor: ['chat', 'homework', 'quiz', 'webcam'],
    notRecommendedFor: [],
    notes: 'RETIRING: Standard 2026-03-31, Provisioned 2026-10-01. Migrate to gpt-5-mini.',
  },
  {
    name: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini (retiring)',
    provider: 'azure',
    deploymentName: 'gpt4o-mini-deployment',
    category: 'chat',
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    maxTokens: 4096,
    contextWindow: 128000,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
    qualityScore: 3,
    speedScore: 5,
    educationScore: 3,
    recommendedFor: ['demo', 'summary', 'flashcards'],
    notRecommendedFor: ['homework', 'formula'],
    notes:
      'RETIRING: Standard 2026-03-31, Provisioned 2026-10-01. Migrate to gpt-5-nano or gpt-5-mini.',
  },

  // GPT-5 family (next-gen models)
  {
    name: 'gpt-5-nano',
    displayName: 'GPT-5 Nano',
    provider: 'azure',
    deploymentName: 'gpt-5-nano',
    category: 'chat',
    inputCostPer1k: 0.0001,
    outputCostPer1k: 0.0004,
    maxTokens: 4096,
    contextWindow: 64000,
    supportsVision: false,
    supportsTools: true,
    supportsJson: true,
    qualityScore: 2,
    speedScore: 5,
    educationScore: 2,
    recommendedFor: ['demo'],
    notRecommendedFor: ['chat', 'homework', 'quiz', 'webcam'],
    notes: 'Fastest GPT-5, minimal capabilities',
  },
  {
    name: 'gpt-5-mini',
    displayName: 'GPT-5 Mini',
    provider: 'azure',
    deploymentName: 'gpt-5-edu-mini',
    category: 'chat',
    inputCostPer1k: 0.0003,
    outputCostPer1k: 0.0012,
    maxTokens: 8192,
    contextWindow: 128000,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
    qualityScore: 4,
    speedScore: 4,
    educationScore: 4,
    recommendedFor: ['summary', 'flashcards', 'mindmap', 'chart', 'pdf'],
    notRecommendedFor: [],
    notes: 'Good balance of cost and quality, education-tuned',
  },
  {
    name: 'gpt-5-chat',
    displayName: 'GPT-5 Chat',
    provider: 'azure',
    deploymentName: 'gpt-5-chat',
    category: 'chat',
    inputCostPer1k: 0.001,
    outputCostPer1k: 0.003,
    maxTokens: 16384,
    contextWindow: 256000,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
    qualityScore: 5,
    speedScore: 3,
    educationScore: 4,
    recommendedFor: ['chat', 'homework'],
    notRecommendedFor: [],
    notes: 'High quality conversational model',
  },
  {
    name: 'gpt-5.2-chat',
    displayName: 'GPT-5.2 Chat',
    provider: 'azure',
    deploymentName: 'gpt-5.2-chat',
    category: 'chat',
    inputCostPer1k: 0.002,
    outputCostPer1k: 0.006,
    maxTokens: 16384,
    contextWindow: 256000,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
    qualityScore: 5,
    speedScore: 3,
    educationScore: 5,
    recommendedFor: ['chat', 'homework', 'quiz', 'formula', 'webcam'],
    notRecommendedFor: [],
    notes: 'Latest GPT-5.2, best quality for Pro tier',
  },
  {
    name: 'gpt-5.2-edu',
    displayName: 'GPT-5.2 Education',
    provider: 'azure',
    deploymentName: 'gpt-5.2-edu',
    category: 'chat',
    inputCostPer1k: 0.0015,
    outputCostPer1k: 0.0045,
    maxTokens: 16384,
    contextWindow: 256000,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
    qualityScore: 5,
    speedScore: 3,
    educationScore: 5,
    recommendedFor: ['chat', 'homework', 'quiz', 'formula', 'webcam'],
    notRecommendedFor: [],
    notes: 'Education-optimized, excellent pedagogical awareness',
  },

  // Realtime models (voice)
  {
    name: 'gpt-realtime',
    displayName: 'GPT Realtime',
    provider: 'azure',
    deploymentName: 'gpt-4o-realtime',
    category: 'realtime',
    inputCostPer1k: 0.01,
    outputCostPer1k: 0.03,
    maxTokens: 4096,
    contextWindow: 128000,
    supportsVision: false,
    supportsTools: false,
    supportsJson: false,
    qualityScore: 4,
    speedScore: 5,
    educationScore: 4,
    recommendedFor: ['realtime'],
    notRecommendedFor: ['chat', 'pdf', 'mindmap'],
    notes: 'Voice-optimized, low latency',
  },
  {
    name: 'gpt-realtime-mini',
    displayName: 'GPT Realtime Mini',
    provider: 'azure',
    deploymentName: 'gpt-4o-realtime-mini',
    category: 'realtime',
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.009,
    maxTokens: 4096,
    contextWindow: 64000,
    supportsVision: false,
    supportsTools: false,
    supportsJson: false,
    qualityScore: 3,
    speedScore: 5,
    educationScore: 3,
    recommendedFor: ['realtime'],
    notRecommendedFor: ['chat', 'pdf', 'mindmap'],
    notes: 'Cost-effective voice for trial tier',
  },
];

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

  console.log(`\nModelCatalog seed completed: ${models.length} models`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

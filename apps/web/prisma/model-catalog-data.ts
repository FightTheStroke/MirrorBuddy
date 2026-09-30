/**
 * ModelCatalog data - ADR 0073, ADR 0182
 *
 * The models the admin tier editor may pick. Only GA deployments that exist on
 * the Azure resource belong here: retired GPT-4 names and the preview-backed
 * gpt-5.x-chat/edu deployments (inference ends 2026-10-05) are left out so they
 * cannot be selected by mistake.
 */

export interface ModelSeedData {
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

export const models: ModelSeedData[] = [
  // GPT-4o family (legacy — retiring 2026-03-31 Standard, 2026-10-01 Provisioned)

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
    name: 'gpt-6.1-sol',
    displayName: 'GPT-6.1 Sol',
    provider: 'azure',
    deploymentName: 'mb-gpt-61-sol',
    category: 'chat',
    inputCostPer1k: 0.002,
    outputCostPer1k: 0.01,
    maxTokens: 16384,
    contextWindow: 1050000,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
    qualityScore: 5,
    speedScore: 4,
    educationScore: 5,
    recommendedFor: ['chat', 'homework', 'quiz', 'formula', 'webcam', 'summary'],
    notRecommendedFor: [],
    notes:
      'GA, EU data zone. Default for every tier and feature since 2026-09-30: best tutoring, tool and safety scores in the internal eval, cheaper than Terra.',
  },
  {
    name: 'gpt-5.6-terra',
    displayName: 'GPT-5.6 Terra',
    provider: 'azure',
    deploymentName: 'gpt-5.6-terra',
    category: 'chat',
    inputCostPer1k: 0.0025,
    outputCostPer1k: 0.015,
    maxTokens: 16384,
    contextWindow: 1050000,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
    qualityScore: 5,
    speedScore: 4,
    educationScore: 5,
    recommendedFor: ['chat', 'homework', 'quiz', 'formula', 'webcam', 'summary'],
    notRecommendedFor: [],
    notes: 'GA. Default until 2026-09-30, kept deployed as rollback.',
  },
  {
    name: 'gpt-5.6-sol',
    displayName: 'GPT-5.6 Sol (flagship)',
    provider: 'azure',
    deploymentName: 'gpt-5.6-sol',
    category: 'chat',
    inputCostPer1k: 0.005,
    outputCostPer1k: 0.03,
    maxTokens: 16384,
    contextWindow: 1050000,
    supportsVision: true,
    supportsTools: true,
    supportsJson: true,
    qualityScore: 5,
    speedScore: 3,
    educationScore: 5,
    recommendedFor: ['chat', 'homework', 'quiz', 'formula', 'webcam', 'summary'],
    notRecommendedFor: [],
    notes:
      'GA flagship of the 5.6 line. Served to every tier - tutoring quality is not rationed by plan.',
  },

  // Realtime models (voice)
  {
    name: 'gpt-realtime',
    displayName: 'GPT Realtime',
    provider: 'azure',
    deploymentName: 'gpt-realtime',
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
    deploymentName: 'gpt-realtime-mini',
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

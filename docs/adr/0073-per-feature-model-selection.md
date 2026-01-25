# ADR 0073: Per-Feature Model Selection System

**Status**: Accepted
**Date**: 2026-01-25
**Author**: Claude Code
**Supersedes**: Partial implementation in ADR 0071 (Tier Subscription System)

## Context

MirrorBuddy uses multiple AI-powered features:

- **Chat**: Main conversational AI with Maestri
- **Voice**: Real-time voice conversation
- **Tools**: PDF, mindmaps, quizzes, flashcards, summaries, formulas, charts, homework, webcam analysis
- **Demo**: Demonstration mode

Previously, the tier system only specified two models:

- `chatModel`: Used for all chat interactions
- `realtimeModel`: Used for voice

This was limiting because:

1. Different features have different requirements (cost vs quality tradeoffs)
2. Some tools can use lighter models (summaries) while others need full capability (homework help)
3. No visibility into model costs and capabilities for admins
4. No ability to optimize costs per feature

## Decision

Implement a **per-feature model selection system** with:

### 1. Per-Feature Model Fields in TierDefinition

Each tier now specifies a model for each feature:

```typescript
interface TierDefinition {
  // Main AI
  chatModel: string; // Main conversation
  realtimeModel: string; // Voice/realtime

  // Tool-specific models
  pdfModel: string; // PDF analysis/generation
  mindmapModel: string; // Mind map creation
  quizModel: string; // Quiz generation
  flashcardsModel: string; // Flashcard generation
  summaryModel: string; // Text summarization
  formulaModel: string; // Formula explanation
  chartModel: string; // Chart analysis
  homeworkModel: string; // Homework assistance
  webcamModel: string; // Image/webcam analysis
  demoModel: string; // Demo mode
}
```

### 2. Model Catalog with Metadata

A new `ModelCatalog` table stores model information:

```typescript
interface ModelCatalogEntry {
  name: string; // e.g., "gpt-5.2-edu"
  displayName: string; // e.g., "GPT-5.2 Education"
  provider: string; // azure, ollama
  deploymentName: string; // Azure deployment name
  category: string; // chat, realtime, embedding

  // Pricing (per 1K tokens, USD)
  inputCostPer1k: number;
  outputCostPer1k: number;

  // Capabilities
  maxTokens: number;
  contextWindow: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsJson: boolean;

  // Quality indicators (1-5 scale)
  qualityScore: number;
  speedScore: number;
  educationScore: number;

  // Recommendations
  recommendedFor: string[]; // ["chat", "tools"]
  notRecommendedFor: string[]; // ["realtime"]
}
```

### 3. Deployment Mapping

Maps logical model names to Azure deployment names:

```typescript
// src/lib/ai/providers/deployment-mapping.ts
const DEPLOYMENT_MAP = {
  "gpt-5.2-edu": "gpt-5.2-edu", // Education-optimized
  "gpt-5.2-chat": "gpt-5.2-chat", // Best quality
  "gpt-5-mini": "gpt-5-edu-mini", // Cost-effective
  "gpt-4o-mini": "gpt4o-mini-deployment",
  "gpt-realtime": "gpt-4o-realtime",
};
```

### 4. Admin UI

New admin page at `/admin/tiers/models` for:

- Viewing all available models with costs/capabilities
- Selecting models per feature per tier
- Seeing cost projections
- Quality indicators (education aptitude, speed, etc.)

## Model Recommendations by Feature

| Feature    | Recommended Model    | Rationale                                           |
| ---------- | -------------------- | --------------------------------------------------- |
| chat       | gpt-5.2-edu          | Best for educational dialogue, role-playing Maestri |
| realtime   | gpt-realtime         | Only model supporting voice                         |
| pdf        | gpt-5-mini           | Simpler extraction tasks                            |
| mindmap    | gpt-5-mini           | Structured output, less creativity needed           |
| quiz       | gpt-5.2-edu          | Needs pedagogical awareness                         |
| flashcards | gpt-5-mini           | Simple Q&A generation                               |
| summary    | gpt-5-mini           | Text compression, cost-effective                    |
| formula    | gpt-5.2-edu          | Mathematical reasoning                              |
| chart      | gpt-5-mini           | Data interpretation                                 |
| homework   | gpt-5.2-edu          | Full tutoring capability                            |
| webcam     | gpt-5.2-edu (vision) | Vision + education                                  |
| demo       | gpt-4o-mini          | Cost-effective for demos                            |

## Default Tier Configurations

### Trial (Anonymous Users)

- All features: `gpt-4o-mini` (cost-effective)
- Voice: `gpt-realtime-mini`

### Base (Registered Users)

- Chat, homework, quiz, formula: `gpt-5.2-edu`
- Other tools: `gpt-5-mini`
- Voice: `gpt-realtime`

### Pro (Paying Users)

- All features: `gpt-5.2-chat` (best quality)
- Voice: `gpt-realtime`

## API Changes

### TierService

```typescript
// Get full AI config for specific feature (PREFERRED)
async getFeatureAIConfigForUser(
  userId: string | null,
  feature: FeatureType
): Promise<{ model: string; temperature: number; maxTokens: number }>

// Get model only (legacy, use getFeatureAIConfigForUser instead)
async getModelForUserFeature(
  userId: string | null,
  feature: FeatureType
): Promise<string>
```

### Usage in API Routes and Library Functions

```typescript
// PREFERRED: Use full AI config (model + temperature + maxTokens)
import { tierService } from "@/lib/tier/tier-service";
import { getDeploymentForModel } from "@/lib/ai/providers/deployment-mapping";

const aiConfig = await tierService.getFeatureAIConfigForUser(userId, "summary");
const deploymentName = getDeploymentForModel(aiConfig.model);

const result = await chatCompletion(messages, systemPrompt, {
  temperature: aiConfig.temperature,
  maxTokens: aiConfig.maxTokens,
  model: deploymentName,
});

// LEGACY: Get model only (still works but less flexible)
const tierModel = await tierService.getModelForUserFeature(userId, "mindmap");
const deployment = getDeploymentForModel(tierModel);
```

## Database Migration

```sql
-- Add per-feature model columns
ALTER TABLE "TierDefinition" ADD COLUMN "pdfModel" TEXT DEFAULT 'gpt-4o-mini';
ALTER TABLE "TierDefinition" ADD COLUMN "mindmapModel" TEXT DEFAULT 'gpt-4o-mini';
-- ... (10 total new columns)

-- Create ModelCatalog table
CREATE TABLE "ModelCatalog" (...);
```

## Security Considerations

- Model names are not exposed to clients
- Admin-only access to model configuration
- Audit logging for model changes
- Cost tracking per model per user

## Consequences

### Positive

- Fine-grained cost optimization per feature
- Better quality where it matters (education vs simple tasks)
- Visibility into model costs for admins
- Ability to A/B test models per feature
- Future-proof for new model releases

### Negative

- More complex configuration
- More database columns
- Need to update all feature endpoints
- Admin needs to understand model differences

## Related ADRs

- ADR 0071: Tier Subscription System (base tier architecture)
- ADR 0056: Trial Mode Architecture (anonymous user handling)
- ADR 0065: Service Limits Monitoring (cost tracking)

## Implementation Status

### Core Infrastructure

- [x] Schema changes (TierDefinition, ModelCatalog)
- [x] Type updates (FeatureType, TierDefinition)
- [x] Deployment mapping (`src/lib/ai/providers/deployment-mapping.ts`)
- [x] TierService.getModelForUserFeature() method
- [x] Helper functions (`getModelForFeature()` in tier-helpers.ts)
- [x] Tier fallbacks with all model fields
- [x] Tier transformer updated for new fields
- [x] Seed ModelCatalog with available models (`prisma/seed-model-catalog.ts`)
- [x] Update tier seed with recommended models (`prisma/seed-tiers.ts`)

### API Routes Migrated

- [x] `/api/chat/route.ts` - uses `getModelForUserFeature(userId, "chat")`
- [x] `/api/chat/stream/route.ts` - uses `getModelForUserFeature(userId, "chat")`
- [x] `/api/conversations/[id]/summarize/route.ts` - uses `getModelForUserFeature(userId, "summary")`
- [x] `/api/parent-professor/route.ts` - uses `getModelForUserFeature(userId, "chat")`

### Library Functions Updated (Using getFeatureAIConfigForUser)

- [x] `src/lib/ai/summarize.ts` - All 4 functions use tierService with 'summary' feature
  - `generateConversationSummary(messages, userId?)`
  - `extractKeyFacts(messages, userId?)`
  - `extractTopics(messages, userId?)`
  - `extractLearnings(messages, maestroId, subject?, userId?)`
- [x] `src/lib/conversation/contextual-greeting.ts` - Uses 'chat' feature
  - `generateContextualGreeting(params)` - params includes userId
  - `generateGoodbyeMessage(..., userId?)`
- [x] `src/lib/session/maestro-evaluation.ts` - Uses 'chat' feature
  - `generateMaestroEvaluation(messages, studentProfile?, userId?)`
- [x] `src/lib/session/parent-note-generator.ts` - Uses 'chat' feature
  - `generateParentNote(session, evaluation)` - session includes userId
- [x] `src/lib/learning-path/path-generator.ts` - Uses 'learning_path' feature
- [x] `src/lib/learning-path/topic-analyzer.ts` - Uses 'learning_path' feature
- [x] `src/lib/learning-path/topic-material-generator.ts` - Uses 'learning_path' feature

### Study Kit Generators (Accept model option)

- [x] `src/lib/tools/handlers/study-kit-generators/quiz.ts`
- [x] `src/lib/tools/handlers/study-kit-generators/mindmap.ts`
- [x] `src/lib/tools/handlers/study-kit-generators/summary.ts`
- [x] `src/lib/tools/handlers/study-kit-generators/demo.ts`

### Pending (Progressive Migration)

- [ ] Update study-kit-handler to pass tier model to generators
- [ ] `formula-handler.ts` - needs userId context for tier lookup
- [ ] `homework-handler.ts` - needs userId context for tier lookup
- [ ] Admin UI for model selection per tier

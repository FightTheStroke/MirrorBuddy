# Conversation Memory

> Hierarchical memory system with tier-based limits and exponential decay

## Quick Reference

| Key       | Value                                                              |
| --------- | ------------------------------------------------------------------ |
| Path      | `src/lib/conversation/`                                            |
| ADRs      | 0090 (Total Memory), 0097 (Tier-Specific), 0021 (Memory Injection) |
| DB Tables | `Conversation`, `HierarchicalSummary`, `ContentEmbedding`          |
| Tiers     | Trial (0 memory), Base (3 convs), Pro (5 convs + semantic)         |
| Decay     | Exponential (30-day half-life)                                     |

## Architecture

MirrorBuddy's memory system provides **continuity across sessions** so Maestri remember previous conversations. It uses a **4-layer hierarchical design**:

1. **Session Memory**: Current conversation messages
2. **Conversation Memory**: Summaries of recent closed conversations (tier-gated)
3. **Cross-Maestro Memory**: Learnings shared across Maestri (Pro only)
4. **Long-Term Memory**: Weekly/monthly aggregations (Pro only, future)

Memory is **tier-differentiated** to create upgrade incentives. Trial users get zero memory (performance optimization), Base users get 3 recent conversations with 15-day retention, and Pro users get 5 conversations with unlimited retention plus semantic search.

## Tier Configuration

| Feature              | Trial  | Base    | Pro       |
| -------------------- | ------ | ------- | --------- |
| Recent conversations | 0      | 3       | 5         |
| Retention window     | 0 days | 15 days | Unlimited |
| Key facts stored     | 0      | 10      | 50        |
| Topics stored        | 0      | 15      | 30        |
| Semantic search      | ✗      | ✗       | ✓         |
| Cross-maestro memory | ✗      | ✗       | ✓         |

## Exponential Decay

Learnings fade over time using **exponential decay** with 30-day half-life:

```
score = exp(-ageDays / 30)

Examples:
- Recent (<1 day): score ≈ 1.0 (🟢 fresh)
- 30 days old: score ≈ 0.37 (🟡 medium)
- 90 days old: score ≈ 0.05 (🔴 fading)
- Threshold: 0.1 (dropped if below)
```

## Key Files

| File                         | Purpose                                    |
| ---------------------------- | ------------------------------------------ |
| `tier-memory-config.ts`      | Per-tier limits configuration              |
| `memory-loader.ts`           | Load recent conversations with time window |
| `context-builder.ts`         | Orchestrate all memory sources             |
| `learnings-injector.ts`      | Apply exponential decay scoring            |
| `prompt-enhancer.ts`         | Inject memory into system prompt           |
| `semantic-memory.ts`         | RAG-based vector similarity (Pro)          |
| `cross-maestro-memory.ts`    | Share learnings across Maestri (Pro)       |
| `hierarchical-summarizer.ts` | Weekly/monthly aggregations (Pro, future)  |

## Code Patterns

```typescript
import { loadPreviousContext } from "@/lib/conversation";
import { getTierMemoryConfig } from "@/lib/tier";

// Load memory for current tier
const memory = await loadPreviousContext(userId, maestroId, tierName);
// {
//   recentSummary: "Student studied fractions...",
//   keyFacts: ["Prefers visual examples", "Struggles with division"],
//   topics: ["frazioni", "divisione", "matematica"],
//   lastSessionDate: Date
// }

// Enhance system prompt
import { enhanceSystemPrompt } from "@/lib/conversation";
const enhanced = enhanceSystemPrompt(basePrompt, memory);
```

## Flow

User starts → Load tier config → Load context → Apply decay → Build context → Enhance prompt → Send to AI

## Token Budget

Trial: 0 | Base: ~500 tokens | Pro: ~1500 tokens

## Optimizations

Early return for Trial tier, config caching by tierName, `structuredClone()` for deep copy, time window filtering

## See Also

ADR 0090 (Total Memory), ADR 0097 (Tier-Specific), ADR 0021 (Memory Injection)

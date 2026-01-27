# ADR 0090: Total Memory System

## Status

Accepted

## Date

2026-01-26

## Context

MirrorBuddy's previous memory system used simple hardcoded limits with basic retention. As the platform scales:

1. **Engagement gap**: Users couldn't reference learnings from previous sessions
2. **No tier value**: Trial/Base/Pro users had identical memory capabilities
3. **Scalability concern**: Injecting all facts into every prompt increased token usage
4. **Cross-maestro isolation**: Learning with one maestro didn't benefit other sessions
5. **Decay problem**: Stale learnings received equal weight as recent insights

## Decision

Implement a **hierarchical total memory system** with semantic retrieval and tier-gated features.

### Architecture: 4-Layer Design

```
┌─────────────────────────────────────────────────────┐
│  PROMPT INJECTION LAYER                             │
│  • Enhancer selects facts based on tier             │
│  • Context builder truncates to token limit         │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│  CONTEXT BUILDER (Orchestrator)                      │
│  • Loads base memory (tier-gated)                   │
│  • Applies exponential decay (30-day half-life)     │
│  • Loads cross-maestro learnings (Pro only)         │
│  • Combines into coherent context                   │
└────────────────┬────────────────────────────────────┘
                 │
    ┌────────────┼────────────┬──────────────┐
    │            │            │              │
┌───▼───┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
│Memory │  │Semantic │  │Cross-   │  │Hierarchical
│Loader │  │Memory   │  │Maestro  │  │Summarizer
│       │  │(Pro)    │  │(Pro)    │  │
└───────┘  └─────────┘  └─────────┘  └──────────┘
```

### Components

| Component                   | Purpose                                    | Tier Access |
| --------------------------- | ------------------------------------------ | ----------- |
| **Tier Memory Config**      | Configuration for Trial/Base/Pro limits    | All         |
| **Memory Loader**           | Loads recent conversations with time decay | All         |
| **Context Builder**         | Orchestrates all memory sources            | All         |
| **Learnings Injector**      | Applies 30-day exponential decay scoring   | All         |
| **Semantic Memory**         | RAG-based vector similarity search         | Pro only    |
| **Cross-Maestro Memory**    | Shares learnings across different maestri  | Pro only    |
| **Hierarchical Summarizer** | Weekly/monthly aggregations of learning    | Pro only    |

### Tier Differentiation

| Feature                 | Trial | Base | Pro |
| ----------------------- | ----- | ---- | --- |
| Recent conversations    | 0     | 3    | 5   |
| Retention window (days) | 0     | 15   | ∞   |
| Key facts stored        | 0     | 10   | 50  |
| Topics stored           | 0     | 15   | 30  |
| Semantic search enabled | ✗     | ✗    | ✓   |
| Cross-maestro memory    | ✗     | ✗    | ✓   |

### Decay Mechanism

Uses exponential decay formula: `score = exp(-ageDays / halflifeDays)`

- **Half-life**: 30 days
- **Recent (<1 day)**: score ≈ 1.0 (🟢 fresh)
- **At 30 days**: score ≈ 0.37 (🟡 medium)
- **At 90 days**: score ≈ 0.05 (🔴 fading)
- **Threshold**: Learnings below 0.1 are dropped

## Consequences

### Positive

✅ **Clear value proposition**: Pro users get 5x facts + semantic search + cross-maestro features
✅ **Personalized learning**: Context prioritizes recent insights via decay
✅ **Token efficiency**: Trial users skip memory loading entirely
✅ **Cross-domain learning**: Pro users benefit from knowledge across maestri
✅ **Scalable**: Semantic search enables "find what you learned about X" capability

### Negative

⚠️ **Complexity**: 7 components with dependencies
⚠️ **Vector storage**: Semantic search requires pgvector + embeddings
⚠️ **Migration burden**: Existing conversations need summarization
⚠️ **Decay tuning**: 30-day half-life requires monitoring/adjustment

## Implementation Details

### Database Extension

- `HierarchicalSummary` table (weekly/monthly aggregations)
- `ContentEmbedding` table (semantic search vectors)
- `Conversation` fields: keyFacts (JSON), topics (JSON), summary (text)

### Token Budget

```typescript
// Per-tier context size (tokens)
Trial:  0 (skip memory)
Base:   500 (3 convs × ~150 tokens each)
Pro:    1500 (semantic + cross-maestro + hierarchical)
```

### Fail-Safe Behavior

- Feature unavailable → return empty memory (not error)
- Tier lookup fails → default to Base tier
- Vector search fails → fall back to time-based ordering

## Files Changed

```
src/lib/conversation/
├── tier-memory-config.ts           (NEW - 91 lines)
├── context-builder.ts              (NEW - 200 lines)
├── learnings-injector.ts           (NEW - 119 lines)
├── cross-maestro-memory.ts         (NEW - 206 lines)
├── hierarchical-summarizer.ts      (NEW - 150+ lines)
├── semantic-memory.ts              (NEW - 120+ lines)
├── memory-loader.ts                (MODIFIED - +30 lines)
├── prompt-enhancer.ts              (MODIFIED - +15 lines)
└── __tests__/                      (NEW - 400+ lines tests)
```

## Trade-Offs

**Complexity vs Functionality**: 7-component system vs simple retention
**Resolution**: Modular design allows feature flags to disable Pro features

**Vector storage costs vs UX**: Semantic search increases DB footprint
**Resolution**: Only Pro tier uses embeddings; async background processing

**Decay tuning vs fixed parameters**: Hardcoded 30-day half-life
**Resolution**: Future ADR to move to admin-configurable TierDefinition table

## Future Enhancements

- **Phase 2**: Implement semantic search UI ("Find my math notes")
- **Phase 3**: Cross-session memory federation (multiple devices)
- **Phase 4**: Admin dashboard for decay parameter tuning

## References

- Plan 086: Total Memory System (T6-01 through T6-06)
- ADR 0021: Conversational Memory Injection
- ADR 0082: Tier-Specific Memory System
- docs/adr/0021-conversational-memory-injection.md
- docs/adr/0065-service-limits-monitoring-and-observability.md

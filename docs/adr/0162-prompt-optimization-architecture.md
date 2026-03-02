# ADR 0162: Prompt Optimization — Hybrid Mini-KB + RAG Architecture

**Status**: Accepted  
**Date**: 2026-03-02  
**Deciders**: @roberdan  
**Relates to**: ADR 0033 (RAG), ADR 0149 (Static systemPrompt), ADR 0021 (Memory)

## Context

Maestro system prompts contained full knowledge bases (100-180 lines each) embedded inline. This caused:

- Token waste: ~5000 tokens per maestro on knowledge that's rarely relevant
- Voice prompt builder had to strip KNOWLEDGE BASE entirely (too large)
- No query-relevant filtering — all knowledge sent regardless of question

## Decision

Adopt a **hybrid mini-KB + RAG** architecture:

| Layer                       | Content                          | Injection                                         | Tokens     |
| --------------------------- | -------------------------------- | ------------------------------------------------- | ---------- |
| Mini-KB (static)            | Bio, style, quotes (≤50 lines)   | In systemPrompt as `## IDENTITÀ E STILE`          | ~200       |
| Didactic RAG (dynamic)      | Curriculum, techniques, examples | Via pgvector retrieval per query                  | ~300       |
| Accessibility (conditional) | DSA adaptations                  | Stripped for neurotypical users, filtered for DSA | 0-150      |
| Conversation window         | Message history                  | Sliding window with tier-aware limits             | Tier-based |

### Token Flow: Before vs After

```
BEFORE (per request):
systemPrompt (5000) + memory (500) + RAG (300) + tools (200) = ~6000 tokens

AFTER (per request):
systemPrompt (2000) + miniKB (200) + RAG-KB (300) + memory (500) + RAG (300) + tools (200) = ~3500 tokens
(-42% system prompt tokens)
```

### Context Pipeline Order

Language → Memory → MaestroKB → Tools → RAG → Adaptive

### Tier-Aware Conversation Window

| Tier  | Window       | Behavior               |
| ----- | ------------ | ---------------------- |
| Trial | 4000 tokens  | Aggressive compression |
| Base  | 8000 tokens  | Standard compression   |
| Pro   | 16000 tokens | Generous window        |

### Prompt Caching

Azure OpenAI auto-caches stable prefixes ≥1024 tokens. The static portion (maestro identity + values + security + intensity dial + mini-KB) remains stable across requests, enabling automatic caching.

## Consequences

**Positive**: ~42% token reduction, query-relevant knowledge, voice gets identity, tier-aware costs  
**Negative**: Additional pgvector dependency for didactic content, migration complexity  
**Risks**: RAG latency (mitigated by graceful degradation per ADR 0033)

## Files

| File                                          | Purpose                     |
| --------------------------------------------- | --------------------------- |
| `scripts/extract-mini-kb.ts`                  | Extraction script           |
| `src/data/maestri/mini-kb/*.ts`               | 26 static mini-KB files     |
| `src/lib/rag/maestro-knowledge-retriever.ts`  | RAG retriever with fallback |
| `src/lib/conversation/prompt-enhancer.ts`     | Accessibility stripping     |
| `src/lib/conversation/conversation-window.ts` | Sliding window              |
| `src/lib/conversation/tier-memory-config.ts`  | Tier window config          |
| `src/app/api/chat/context-builders.ts`        | Context pipeline wiring     |

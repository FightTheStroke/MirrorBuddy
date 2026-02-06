# ADR-0130: Multi-Provider AI Router

**Status:** Accepted
**Date:** 2026-02-06
**Context:** Plan 125 W3-AI-Multi

## Decision

Create a class-based `AIProviderInterface` with an `AIProviderRouter` that provides automatic failover across providers.

## Rationale

- Single provider (Azure OpenAI) is a SPOF for the core product
- Claude as fallback adds resilience without requiring infrastructure changes
- Ollama for local development eliminates Azure costs during dev
- Class-based interface cleaner than extending existing function pattern

## Architecture

```
chatCompletion() --> AIProviderRouter.chatWithFailover()
                            |
                   selectProvider() --> priority order:
                   1. Azure OpenAI (primary)
                   2. Claude (fallback)
                   3. Ollama (local dev)
                            |
                   Per-provider CircuitBreaker
                            |
                   AIProviderInterface.chat()
```

## Key Types

```typescript
interface AIProviderInterface {
  readonly name: AIProviderType;
  chat(messages, systemPrompt, options?): Promise<ChatCompletionResult>;
  stream?(messages, systemPrompt, options?): AsyncGenerator<StreamChunk>;
  isAvailable(): Promise<boolean>;
}
```

## Key Patterns

- `AzureOpenAIProvider`: Adapter wrapping existing `azure.ts` functions (no breaking changes)
- `ClaudeProvider`: Uses `@anthropic-ai/sdk` with message/tool call format mapping
- Router: Tries providers in order, skips unavailable, tracks health per-provider
- Metrics: Per-provider success rate, latency, token usage
- Health endpoint: `/api/health/ai-providers`

## Trade-offs

- Claude does NOT support voice/realtime — voice stays Azure-only
- Message format mapping adds latency (~2ms, negligible)
- Different providers may give different quality responses
- Accepted because: availability > consistency for educational Q&A

## References

- Plan 125 W3 tasks T3-01 through T3-05
- Anthropic SDK: @anthropic-ai/sdk ^0.73.0

# ADR 0031: Embedded Knowledge Base for Character-Based Maestri

## Status

Accepted

## Date

2026-01-10

## Context

Some maestri are based on specific fictional or historical characters (e.g., Conte Mascetti from "Amici Miei", Omero from Greek mythology). These characters require accurate knowledge about their source material to respond correctly to user questions.

### Problem

LLMs may hallucinate or provide incorrect facts about specific characters, films, or literary works. For example, when asked "Chi è la Titti?" about the Amici Miei films, the LLM might incorrectly state relationships between characters.

### Options Considered

1. **Web Search Tool**: Give the maestro access to `web_search` tool and instruct it to search before answering
   - Pros: Always up-to-date, no maintenance
   - Cons: Adds latency, LLM may not always search, search results may be inconsistent

2. **RAG (Retrieval Augmented Generation)**: Store facts in a vector database and retrieve relevant chunks
   - Pros: Scalable, can handle large knowledge bases
   - Cons: Complex infrastructure, overkill for focused character knowledge

3. **Embedded Knowledge Base**: Include factual reference directly in the system prompt
   - Pros: Fast, reliable, always available, no external dependencies
   - Cons: Increases prompt size, requires manual curation

## Decision

Use **Embedded Knowledge Base** (Option 3) for character-based maestri.

Create a separate TypeScript file containing the knowledge as a string constant, then import and embed it in the system prompt.

## Implementation Pattern

### 1. Create Knowledge File

```typescript
// src/data/maestri/{character}-knowledge.ts

export const CHARACTER_KNOWLEDGE = `
## Key Facts

### Characters
- Character A: description, relationships
- Character B: description, relationships

### Important Events
- Event 1: what happened, when, who was involved
- Event 2: ...

### Common Questions
- Q: "Who is X?" A: X is...
- Q: "What happened in Y?" A: ...

### Critical Corrections
- X is NOT Y (common misconception)
- The correct answer is Z
`;
```

### 2. Import in Maestro Definition

```typescript
// src/data/maestri/{character}.ts

import { CHARACTER_KNOWLEDGE } from './{character}-knowledge';

export const character: MaestroFull = {
  // ...
  tools: [], // No tools needed - knowledge is embedded
  systemPrompt: `
You are [Character Name]...

## KNOWLEDGE BASE

Use this reference for ALL questions about [source material]:

${CHARACTER_KNOWLEDGE}

## CRITICAL: Answer from Knowledge Base

When asked about [topic], ALWAYS refer to the KNOWLEDGE BASE above.
...
`
};
```

### 3. Knowledge Base Guidelines

- **Factual only**: Include only verifiable facts from official sources
- **Structured**: Use headers, bullet points, tables for easy reference
- **Critical corrections**: Explicitly list common misconceptions
- **Relationships**: Clearly state who is who (spouse vs lover, friend vs enemy)
- **Size limit**: Keep under 150 lines to avoid excessive prompt size
- **Sources**: Document sources in comments (Wikipedia, official materials)

## Consequences

### Positive

- **Reliability**: LLM has authoritative facts in context
- **Speed**: No external API calls for knowledge retrieval
- **Consistency**: Same facts every time
- **Offline**: Works without internet access

### Negative

- **Maintenance**: Manual updates if source material changes
- **Prompt size**: Larger system prompts (mitigated by keeping knowledge focused)
- **Static**: Cannot answer about events after knowledge was written

## Use Cases

| Maestro | Source Material | Knowledge File |
|---------|-----------------|----------------|
| Conte Mascetti | Amici Miei (1975, 1982, 1985) | `amici-miei-knowledge.ts` |
| Omero | Iliad, Odyssey | `omero-knowledge.ts` (future) |
| Dante | Divine Comedy | `dante-knowledge.ts` (future) |

## References

- [Amici Miei - Wikipedia](https://it.wikipedia.org/wiki/Amici_miei)
- [Supercazzola - Wikipedia](https://it.wikipedia.org/wiki/Supercazzola)

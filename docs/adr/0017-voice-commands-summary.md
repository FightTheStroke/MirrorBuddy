# ADR 0017: Voice Commands for Summary Modifications

## Status

Accepted

## Date

2026-01-01

## Context

Following the "conversation-first" approach established in Issue #23 and extended to mindmaps in ADR-0011, Issue #70 required the same pattern for structured summaries.

### Problem

Students should be able to create and modify summaries through natural voice conversation:

- "Devo fare un riassunto sulla fotosintesi"
- "Aggiungi una sezione su dove avviene"
- "Un punto importante è che serve la luce"
- "Ho finito, salva il riassunto"

### Options Considered

Same options as ADR-0011 were applicable. We chose the same three-layer architecture for consistency.

## Decision

Implement parallel architecture to mindmap voice commands:

### 1. SSE Hook: `useSummaryModifications`

```typescript
// src/lib/hooks/use-summary-modifications.ts
export function useSummaryModifications({
  sessionId,
  enabled,
  callbacks,
}: UseSummaryModificationsOptions): UseSummaryModificationsResult {
  // Subscribe to /api/tools/sse?sessionId=X
  // Dispatch to callbacks on summary:modify events
}
```

### 2. Block-Based Editor: `SummaryEditor`

```typescript
// src/components/tools/summary-editor.tsx
// Editable sections with expandable key points
// Click-to-edit inline editing
// Add/remove sections and points
```

### 3. Wrapper Component: `LiveSummary`

```typescript
// src/components/tools/live-summary.tsx
export function LiveSummary({
  sessionId,
  listenForEvents = true,
  onDataChange,
  onFinalize,
  ...
}: LiveSummaryProps) {
  // Combines SummaryEditor with useSummaryModifications
}
```

## Voice Command Flow

```
Student: "Aggiungi una sezione su dove avviene la fotosintesi"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│               Azure OpenAI Realtime API                      │
│  Transcribes and interprets voice command                    │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         POST /api/tools/stream/modify                        │
│  { command: 'summary_add_section',                          │
│    args: { title: 'Dove avviene', content: '...' } }        │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         SSE Broadcast (tool-events.ts)                       │
│  Event: 'summary:modify'                                     │
│  Data: { command, args, sessionId, maestroId }              │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         useSummaryModifications Hook                         │
│  Receives event, calls callbacks.onAddSection(...)          │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         LiveSummary Component                                │
│  Updates state, re-renders SummaryEditor                    │
└─────────────────────────────────────────────────────────────┘
```

## Supported Commands

| Voice Command            | Function                 | Implementation                              |
| ------------------------ | ------------------------ | ------------------------------------------- |
| `summary_set_title`      | Set/update summary title | `onSetTitle(title)`                         |
| `summary_add_section`    | Add new section          | `onAddSection(title, content?, keyPoints?)` |
| `summary_update_section` | Modify section content   | `onUpdateSection(index, updates)`           |
| `summary_delete_section` | Remove section           | `onDeleteSection(index)`                    |
| `summary_add_point`      | Add key point to section | `onAddPoint(sectionIndex, point)`           |
| `summary_delete_point`   | Remove key point         | `onDeletePoint(sectionIndex, pointIndex)`   |
| `summary_finalize`       | Save and complete        | `onFinalize()`                              |

## Export Features

Unlike mindmaps, summaries have conversion capabilities:

| Feature             | Function                          | Output                        |
| ------------------- | --------------------------------- | ----------------------------- |
| PDF Export          | `exportSummaryToPdf()`            | Browser print dialog          |
| Convert to Mindmap  | `convertSummaryToMindmap()`       | MindmapData structure         |
| Generate Flashcards | `generateFlashcardsFromSummary()` | FlashcardDeck from key points |

## Data Structure

```typescript
interface SummarySection {
  title: string;
  content: string;
  keyPoints?: string[];
}

interface SummaryData {
  topic: string;
  sections: SummarySection[];
  length?: "short" | "medium" | "long";
}
```

## Consequences

### Positive

- Consistent with mindmap voice command pattern
- Natural voice interaction for summary creation
- Block-based editor familiar to students
- Export/conversion extends utility of summaries
- Real-time SSE updates for collaborative potential

### Negative

- No collaborative editing conflict resolution yet
- Voice transcription errors can cause misinterpretation
- Section index-based operations may be confusing vocally

## Key Files

| File                                         | Purpose                      |
| -------------------------------------------- | ---------------------------- |
| `src/lib/hooks/use-summary-modifications.ts` | SSE subscription hook        |
| `src/components/tools/summary-editor.tsx`    | Block-based editor           |
| `src/components/tools/summary-renderer.tsx`  | Read-only view               |
| `src/components/tools/live-summary.tsx`      | Combined component           |
| `src/lib/tools/summary-export.ts`            | PDF/mindmap/flashcard export |
| `src/lib/voice/voice-tool-commands.ts`       | Voice command definitions    |
| `/claude/summary-tool.md`                    | Feature documentation        |

## References

- ADR 0005: Real-time SSE Architecture
- ADR 0009: Tool Execution Architecture
- ADR 0011: Voice Commands for Mindmaps
- Issue #70: Real-time Summary Tool
- ManifestoEdu.md: "Forms are a sign we failed"

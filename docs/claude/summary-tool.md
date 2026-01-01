# Summary Tool

Real-time structured summary creation with voice guidance. Issue #70.

## Overview

The Summary tool allows students to create structured summaries during voice conversations with Coach/Maestro. The Maestro guides the student with questions while building the summary in real-time.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AVAILABLE TOOLS                          │
├─────────────────────────────────────────────────────────────┤
│  Mindmap  │  Quiz  │  Demo  │  Flashcard  │  Summary  │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Path | Purpose |
|-----------|------|---------|
| `SummaryEditor` | `src/components/tools/summary-editor.tsx` | Block-based editor with sections and points |
| `SummaryRenderer` | `src/components/tools/summary-renderer.tsx` | Read-only view for saved summaries |
| `SummaryTool` | `src/components/tools/summary-tool.tsx` | Wrapper with edit/view modes and actions |
| `LiveSummary` | `src/components/tools/live-summary.tsx` | Real-time SSE updates during voice |

### Hooks

| Hook | Path | Purpose |
|------|------|---------|
| `useSummaryModifications` | `src/lib/hooks/use-summary-modifications.ts` | SSE listener for real-time modifications |

### Types

```typescript
interface SummarySection {
  title: string;
  content: string;
  keyPoints?: string[];
}

interface SummaryData {
  topic: string;
  sections: SummarySection[];
  length?: 'short' | 'medium' | 'long';
}
```

## Flow

### 1. Trigger

**Voice**: "Devo fare un riassunto"
**Button**: Click summary tool button in toolbar

### 2. Topic

Coach/Maestro asks: "Su che argomento vuoi fare il riassunto?"
Student responds: "La fotosintesi" / "Quello che abbiamo studiato"

### 3. Guided Creation

The Maestro asks guiding questions. As the student responds, the AI organizes responses into structured sections with key points. Updates appear in real-time via SSE.

### 4. Finalize

When complete, the summary can be:
- Saved to materials archive
- Exported as PDF
- Converted to mindmap
- Used to generate flashcards

## Voice Commands

### Creation
- "devo fare un riassunto"
- "riassumimi [argomento]"
- "fai una sintesi di [argomento]"

### Modification (during active summary)

| Command | Voice Example | Action |
|---------|---------------|--------|
| `summary_set_title` | "Il titolo e' la fotosintesi" | Set/update title |
| `summary_add_section` | "Parliamo di dove avviene" | Add new section |
| `summary_add_point` | "Un punto importante e' che..." | Add key point to current section |
| `summary_finalize` | "Ho finito" / "Salva" | Save and close |

## SSE Events

Summary modifications are broadcast via SSE to enable real-time UI updates:

```typescript
type SummaryModifyCommand =
  | 'summary_set_title'
  | 'summary_add_section'
  | 'summary_update_section'
  | 'summary_delete_section'
  | 'summary_add_point'
  | 'summary_delete_point'
  | 'summary_finalize';
```

## Export Functions

Located in `src/lib/tools/summary-export.ts`:

### PDF Export
```typescript
exportSummaryToPdf(data: SummaryData): Promise<void>
```
Opens browser print dialog with formatted HTML.

### Convert to Mindmap
```typescript
convertSummaryToMindmap(data: SummaryData): { topic: string; nodes: MindmapNode[] }
```
Transforms sections into mindmap node hierarchy.

### Generate Flashcards
```typescript
generateFlashcardsFromSummary(data: SummaryData): { topic: string; cards: FlashcardItem[] }
```
Creates flashcards from section content and key points.

## UI Components

### Toolbar Button
Added to `src/components/conversation/tool-buttons.tsx`:
```typescript
{ type: 'summary', icon: FileText, label: 'Riassunto', tooltip: 'Crea riassunto strutturato' }
```

### Archive Filter Tab
Added to `src/components/education/archive/constants.ts`:
```typescript
{ value: 'summary', label: 'Riassunti' }
```

## Storage

Summaries are stored in the `CreatedTool` table with:
- `toolType: 'summary'`
- `content: SummaryData` (JSON)

## Accessibility

- Keyboard navigation for all interactive elements
- ARIA labels on buttons and sections
- Expandable/collapsible sections
- Focus management in edit mode

## Testing

E2E tests in `tests/e2e/summary-tool.spec.ts` cover:
- Creating summary via button
- Adding/editing sections
- Adding key points
- PDF export trigger
- Conversion to mindmap
- Flashcard generation

## Related

- ADR-0011: Voice Commands for Mindmaps
- `src/components/tools/live-mindmap.tsx` - Similar pattern for mindmaps
- `src/lib/tools/handlers/summary-handler.ts` - Validation handler

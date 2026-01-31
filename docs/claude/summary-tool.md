# Summary Tool

> AI-generated structured summaries with PDF/HTML export and cross-tool conversion

## Quick Reference

| Key       | Value                                              |
| --------- | -------------------------------------------------- |
| Path      | `src/lib/tools/handlers/summary-handler.ts`        |
| Exports   | `src/lib/tools/summary-export.ts`                  |
| PDF Gen   | `src/lib/pdf-generator/` (DSA-accessible profiles) |
| Tool Type | `summary` (registered via `registerToolHandler`)   |
| Issue     | #70 (Real-time summary tool)                       |

## Architecture

The summary tool is triggered by AI Maestri during conversations when a student needs a structured summary. The handler validates input (topic + sections with key points), normalizes the data, and returns a `ToolExecutionResult`. Summaries support three modes: **Maestro-generated** (`create_summary`), **student-written** with maieutic guidance (`open_student_summary`), and **inline commenting** (`student_summary_add_comment`).

Export supports HTML (styled, printable), PDF (via browser print dialog), and cross-tool conversion to mindmap nodes or flashcard decks. The PDF generator supports 7 DSA accessibility profiles (dyslexia, dyscalculia, dysgraphia, dysorthography, ADHD, dyspraxia, stuttering) with tailored fonts, colors, and spacing.

## Key Files

| File                                        | Purpose                         |
| ------------------------------------------- | ------------------------------- |
| `src/lib/tools/handlers/summary-handler.ts` | Tool handlers (3 operations)    |
| `src/lib/tools/summary-export.ts`           | Re-exports for HTML/PDF/convert |
| `src/lib/tools/summary-export-utils.ts`     | HTML generation + PDF export    |
| `src/lib/tools/summary-converters.ts`       | Mindmap + flashcard conversion  |
| `src/lib/pdf-generator/generate.ts`         | DSA-accessible PDF generation   |
| `src/lib/pdf-generator/profiles/`           | 7 DSA profile configurations    |
| `src/lib/tools/tool-executor-schemas.ts`    | Validation schemas              |

## Tool Handlers

| Handler                       | Purpose                                      |
| ----------------------------- | -------------------------------------------- |
| `create_summary`              | Maestro creates structured summary           |
| `open_student_summary`        | Student writes own summary (maieutic)        |
| `student_summary_add_comment` | Maestro adds inline comments to student work |

## Export Formats

| Format     | Function                          | Output               |
| ---------- | --------------------------------- | -------------------- |
| HTML       | `generateSummaryHtml()`           | Styled HTML document |
| PDF        | `exportSummaryToPdf()`            | Browser print dialog |
| Mindmap    | `convertSummaryToMindmap()`       | `{ topic, nodes[] }` |
| Flashcards | `generateFlashcardsFromSummary()` | `{ topic, cards[] }` |

## Code Patterns

```typescript
// Create summary (from tool handler result)
import type { SummaryData } from "@/types/tools";
const data: SummaryData = {
  topic: "Le Frazioni",
  sections: [
    {
      title: "Definizione",
      content: "Una frazione...",
      keyPoints: ["numeratore", "denominatore"],
    },
  ],
  length: "medium",
};

// Export to HTML/PDF
import {
  generateSummaryHtml,
  exportSummaryToPdf,
} from "@/lib/tools/summary-export";
const html = generateSummaryHtml(data);
await exportSummaryToPdf(data); // Opens print dialog

// Convert to other tools
import {
  convertSummaryToMindmap,
  generateFlashcardsFromSummary,
} from "@/lib/tools/summary-export";
const mindmap = convertSummaryToMindmap(data); // { topic, nodes: MindmapNode[] }
const flashcards = generateFlashcardsFromSummary(data); // { topic, cards: FlashcardItem[] }
```

## DSA-Accessible PDF

```typescript
import { generateAccessiblePDF, getProfile } from "@/lib/pdf-generator";
const profile = getProfile("dyslexia"); // OpenDyslexic font, extra spacing
const pdf = await generateAccessiblePDF(content, profile);
```

## See Also

- `docs/claude/tools.md` -- Tool system overview and handler registration
- `docs/claude/session-summaries.md` -- Conversation summaries (different from tool summaries)
- `src/lib/pdf-generator/` -- Full PDF generation library with DSA profiles

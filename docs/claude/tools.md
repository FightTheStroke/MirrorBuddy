# Tool Execution System

Maestri can create interactive educational tools during conversations.

## Available Tools

| Tool | Function Name | Purpose |
|------|---------------|---------|
| Mind Map | `create_mindmap` | Visual concept organization (MarkMap) |
| Quiz | `create_quiz` | Multiple choice assessment |
| Flashcards | `create_flashcards` | FSRS-compatible spaced repetition |
| Demo | `create_demo` | Interactive HTML/JS simulations |
| Search | `web_search` | Educational web/YouTube search |
| Student Summary | `open_student_summary` | Student writes summary with maieutic guidance |
| Summary (AI) | `create_summary` | AI-generated summary (legacy) |

## Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Types | `src/types/tools.ts` | Unified types + `CHAT_TOOL_DEFINITIONS` |
| Executor | `src/lib/tools/tool-executor.ts` | Handler registry |
| Handlers | `src/lib/tools/handlers/*.ts` | Tool-specific logic |
| Events | `src/lib/realtime/tool-events.ts` | SSE broadcasting |
| Storage | `src/lib/hooks/use-saved-materials.ts` | Database API (ADR 0015) |
| API | `/api/materials` | REST endpoint for all tools |

## Adding a New Tool

1. Add type to `src/types/tools.ts`
2. Add function definition to `CHAT_TOOL_DEFINITIONS`
3. Create handler in `src/lib/tools/handlers/`
4. Import handler in `handlers/index.ts`

## Security

- **Demo Sandbox**: JS validated against `DANGEROUS_JS_PATTERNS`
- **HTML Sanitization**: Script tags removed
- **Iframe Isolation**: `sandbox="allow-scripts"`

## Voice Commands for Mindmaps (ADR-0011)

| Command | Function | Example |
|---------|----------|---------|
| `mindmap_add_node` | Add child | "Aggiungi Roma sotto Italia" |
| `mindmap_connect_nodes` | Link nodes | "Collega storia con geografia" |
| `mindmap_expand_node` | Add children | "Espandi Liguria" |
| `mindmap_delete_node` | Remove | "Cancella il nodo" |
| `mindmap_focus_node` | Center view | "Zoom su Roma" |
| `mindmap_set_color` | Change color | "Colora Roma di rosso" |

## Voice Commands for Student Summary (#70)

Maieutic method: Student writes, Maestro guides with questions.

| Command | Function | When to Use |
|---------|----------|-------------|
| `open_student_summary` | Open editor | "Devo fare un riassunto" |
| `student_summary_add_comment` | Add inline feedback | Highlight and comment on student text |

### Maieutic Guidance

The Maestro should:
1. Ask guiding questions, not write the content
2. Use inline comments to highlight areas for improvement
3. Encourage the student to express their understanding

Example prompts:
- "Di cosa parla questo argomento?"
- "Quali sono i punti chiave?"
- "Cosa è importante ricordare?"

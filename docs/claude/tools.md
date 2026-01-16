# Tool Execution System

Maestri can create interactive educational tools during conversations.

## Available Tools

| Tool | Function Name | Purpose |
|------|---------------|---------|
| Mind Map | `create_mindmap` | Visual concept organization (MarkMap) |
| Quiz | `create_quiz` | Multiple choice assessment |
| Flashcards | `create_flashcards` | FSRS-compatible spaced repetition |
| Demo | `create_demo` | Interactive HTML/JS simulations |
| Search | `web_search` | Real-time web search (Brave API) + YouTube |
| Student Summary | `open_student_summary` | Student writes summary with maieutic guidance |
| Summary (AI) | `create_summary` | AI-generated summary (legacy) |
| PDF Upload | `upload_pdf` | Extract text from PDFs for analysis |
| Webcam | `capture_webcam` | OCR for text + image interpretation |
| Homework Help | `homework_help` | Maieutic assistance for exercises |
| Formula | `create_formula` | Generate KaTeX/LaTeX formulas |
| Chart | `create_chart` | Generate Chart.js visualizations |

## Web Search (ADR 0043)

Enables maestri to access real-time web information for current events, tech news, sports.

### Search Providers (Priority Order)

1. **Brave Search API** (if `BRAVE_SEARCH_API_KEY` configured)
   - Real-time web results
   - Italian language targeting
   - 5 results per query

2. **Wikipedia** (fallback when Brave not configured)
   - Italian Wikipedia API
   - Static/historical content

3. **Treccani** (always added)
   - Authoritative Italian source link

4. **YouTube** (always added)
   - Educational video search links

### Configuration

```bash
# .env (optional - works without it using Wikipedia fallback)
BRAVE_SEARCH_API_KEY=your-api-key

# Get key at: https://brave.com/search/api/
# Free tier: 2,000 queries/month
```

### Usage

Maestri automatically trigger web search when discussing current topics:
- **Lovelace**: "Cerca le ultime novità su Rust" → Brave Search
- **Cicerone**: "Quali sono le notizie di oggi?" → Brave Search
- **Chris**: "Quando sono le prossime Olimpiadi?" → Brave Search

## Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Types | `src/types/tools.ts` | Unified types + `CHAT_TOOL_DEFINITIONS` |
| Executor | `src/lib/tools/tool-executor.ts` | Handler registry + output persistence |
| Handlers | `src/lib/tools/handlers/*.ts` | Tool-specific logic |
| Plugins | `src/lib/tools/plugins/*.ts` | Plugin definitions with triggers |
| Events | `src/lib/realtime/tool-events.ts` | SSE broadcasting |
| Storage | `src/lib/tools/tool-output-storage.ts` | Persist outputs with conversation FK |
| Context | `src/lib/tools/tool-context-builder.ts` | Inject outputs into AI context |
| RAG | `src/lib/tools/tool-rag-indexer.ts` | Semantic indexing of outputs |
| API | `/api/materials` | REST endpoint for all tools |

## Context Integration

Tool outputs are automatically:
1. **Saved** with conversation ID (`ToolOutput` model in Prisma)
2. **Injected** into AI system prompt via `buildToolContext()`
3. **Indexed** in RAG for semantic retrieval

This allows the AI to reference previously generated content:
- "Come abbiamo visto nella mappa mentale..."
- "Nel quiz che abbiamo fatto prima..."
- "Dal PDF che hai caricato..."

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

# Tools

> Plugin-based tool execution architecture with 15 educational tools

## Quick Reference

| Key        | Value                                        |
| ---------- | -------------------------------------------- |
| Path       | `src/lib/tools/`                             |
| API        | `POST /api/tools/stream` (SSE)               |
| ADR        | 0037                                         |
| Categories | Upload (4), Create (10), Search (1)          |
| i18n       | `messages/{locale}/tools.json` (5 languages) |

## Architecture

Plugin-based architecture (ADR 0037) with three core components:

1. **ToolRegistry**: Central registry with metadata (schema, triggers, permissions)
2. **ToolOrchestrator**: Execution with validation, timeout (30s), event broadcasting
3. **VoiceFeedbackInjector**: Dynamic voice feedback with template variable substitution

Tools integrate with voice sessions via WebRTC DataChannel protocol.

## Tool Categories

| Category   | Tools                                                                              |
| ---------- | ---------------------------------------------------------------------------------- |
| **Upload** | pdf, webcam, homework, studyKit                                                    |
| **Create** | mindmap, quiz, flashcard, demo, summary, diagram, timeline, formula, chart, typing |
| **Search** | search                                                                             |

## Key Files

| File                                     | Purpose                     |
| ---------------------------------------- | --------------------------- |
| `src/lib/tools/tool-configs.ts`          | Tool metadata (15 tools)    |
| `src/lib/tools/tool-executor.ts`         | Main execution orchestrator |
| `src/lib/tools/tool-executor-schemas.ts` | Zod validation schemas      |
| `src/lib/tools/tool-i18n.ts`             | Localization helpers        |
| `src/lib/tools/tool-context-builder.ts`  | Build execution context     |
| `src/lib/tools/tool-embedding.ts`        | Semantic search for tools   |
| `src/app/api/tools/stream/route.ts`      | SSE streaming API           |

## Code Patterns

### Execute Tool (Server-Side SSE)

```typescript
import { executeToolStream } from "@/lib/tools/tool-executor";

const stream = executeToolStream({
  toolId: "mindmap",
  params: { topic: "French Revolution" },
  userId: session.userId,
  locale: "it",
});
// SSE events: tool.start, tool.chunk, tool.complete, tool.error
```

### Add New Tool Plugin

1. Add translations to `messages/{locale}/tools.json`
2. Create schema in `tool-executor-schemas.ts`
3. Create handler in `tool-executor.ts`
4. Register in ToolRegistry
5. Test: `npm run test:unit -- tools`

## Security Features

- **Execution timeout**: 30s default prevents indefinite hangs
- **Input validation**: Zod schemas on all tool parameters
- **Permission checking**: Tier-based access control
- **Event broadcasting**: Real-time monitoring via DataChannel (max 64KB)
- **DoS prevention**: Transcript truncation at 10KB

## See Also

- `docs/adr/0037-tool-plugin-architecture.md` — Plugin architecture details
- `.claude/rules/tier.md` — Tier-based tool access
- `src/lib/tools/README-i18n.md` — Localization guide

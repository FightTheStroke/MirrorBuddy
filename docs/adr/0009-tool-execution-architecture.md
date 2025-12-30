# ADR 0009: Tool Execution Architecture

## Status
Accepted

## Context
I Maestri AI devono poter creare strumenti interattivi (mind maps, quiz, demo, flashcard) durante le conversazioni. Attualmente il chat API NON ha function calling - i Maestri scrivono solo testo come "Usa lo strumento create_mindmap..." senza eseguire nulla.

### Problemi Attuali
1. **Chat API non supporta OpenAI function calling** - Issue #39
2. **Nessun tool panel** per visualizzare i tool creati - Issue #36
3. **Nessun storage** per salvare i tool - Issue #22
4. **Nessun archivio** per rivedere tool passati - Issue #37

### Opzioni Considerate
1. **Client-side parsing del testo** - Fragile, non affidabile
2. **Streaming custom** - Complesso, non standard
3. **OpenAI function calling** - Standard, supportato, affidabile

## Decision
Implementiamo OpenAI function calling nel chat API con:

1. **Tool Types** (`src/types/tools.ts`)
   - Definizioni TypeScript per tutti i tool
   - `CHAT_TOOL_DEFINITIONS` per OpenAI function calling format

2. **Tool Executor Framework** (`src/lib/tools/tool-executor.ts`)
   - Handler registry pattern
   - `registerToolHandler(name, handler)` per registrare handler
   - `executeToolCall(name, args, context)` per eseguire

3. **Tool Handlers** (`src/lib/tools/handlers/`)
   - Un handler per ogni tipo di tool
   - mindmap, quiz, demo, search, flashcard

4. **Real-time Events** (`src/lib/realtime/tool-events.ts`)
   - `broadcastToolEvent()` per SSE updates
   - Eventi: `tool_started`, `tool_progress`, `tool_completed`, `tool_error`

5. **Storage**
   - **IndexedDB** (`src/lib/storage/materials-db.ts`) per file binari (images, PDFs)
   - **Prisma** (`CreatedTool` model) per metadata e query

## Tool Definitions

```typescript
type ToolType =
  | 'mindmap'      // Mappa mentale interattiva
  | 'quiz'         // Quiz con domande multiple
  | 'flashcard'    // Set di flashcard FSRS
  | 'demo'         // Simulazione HTML/JS
  | 'search'       // Ricerca web/YouTube
  | 'diagram'      // Diagramma (futuro)
  | 'timeline'     // Linea temporale (futuro)
  | 'formula'      // Formula matematica (futuro)
  | 'chart'        // Grafico (futuro)
  | 'webcam'       // Foto da webcam
  | 'pdf';         // PDF caricato
```

## Execution Flow

```
User clicks tool button OR Maestro decides
        |
        v
Chat API receives request with tool hint
        |
        v
Azure OpenAI with `tools` parameter
        |
        v
Response contains `tool_calls` array
        |
        v
Tool executor routes to registered handler
        |
        v
Handler generates content
        |
        v
SSE broadcasts tool_completed event
        |
        v
Tool Panel renders result
        |
        v
User can save to Archive (Prisma + IndexedDB)
```

## API Changes

### Chat Request
```typescript
interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
  maestroId: string;
  toolRequest?: ToolType;  // NEW: Explicit tool request from button
  sessionId?: string;      // NEW: For context
}
```

### Chat Response
```typescript
interface ChatResponse {
  content: string;
  provider: string;
  model: string;
  toolCalls?: ToolExecutionResult[];  // NEW: Tool results
}
```

## Consequences

### Positive
- **Standard OpenAI API** - Ben documentato e mantenuto
- **Affidabile** - Il modello decide quando chiamare i tool basandosi sul contesto
- **Estensibile** - Nuovi tool = nuovi handler, nessuna modifica al core
- **Real-time** - SSE per progress updates durante l'esecuzione
- **Type-safe** - TypeScript strict per tutti i tipi

### Negative
- **Richiede Azure OpenAI** - Ollama non supporta function calling
- **Complessità frontend** - Tool Panel richiede stato aggiuntivo
- **Storage duale** - IndexedDB + Prisma = due sistemi da sincronizzare

## Security Considerations

### Demo Sandbox
Le demo HTML/JS vengono eseguite in iframe con:
- `sandbox="allow-scripts"` - Solo JavaScript, no DOM access
- CSP header: `default-src 'self' 'unsafe-inline'`
- Pattern blocklist: localStorage, fetch, XMLHttpRequest, eval

### Input Validation
- Tutti i tool arguments vengono validati prima dell'esecuzione
- Content filtering esistente (Issue #30) rimane attivo

## References
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- Issue #39: Chat API missing function calling
- Issue #23: Conversation-First Architecture
- Issue #36: Tool Panel
- Issue #22: Materials Storage
- Issue #37: Unified Archive
- ADR 0005: Realtime SSE Architecture

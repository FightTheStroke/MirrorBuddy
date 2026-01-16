# T2-02 Verification: Context Injection

**Task**: Context injection - passare tool output al prompt AI come contesto

## F-xx Requirements

| F-xx | Requirement | Status | Evidence |
|------|-------------|--------|----------|
| F-03 | Generated content in context | ✓ PASS | buildToolContext retrieves all tools |
| F-06 | Quiz content in context | ✓ PASS | formatQuiz shows Q&A |
| F-07 | Mindmap content in context | ✓ PASS | formatMindmap shows structure |
| F-08 | Other tool outputs in context | ✓ PASS | All types supported |

## Implementation

### 1. Tool Context Builder (`src/lib/tools/tool-context-builder.ts`)

Created module with:
- `getToolOutputs(userId, conversationId)` - retrieves all tools for conversation
- `formatToolOutput(output)` - formats each tool type for AI readability
- `buildToolContext(userId, conversationId)` - builds complete context string

**Supported tool types**:
- Quiz: Questions + correct answers
- Flashcards: Front → back (first 5 cards)
- Mindmap: Root concept + connected nodes
- Summary: Text preview (200 chars)
- Demo: Step-by-step instructions
- PDF: Text preview (150 chars)
- Study Kit: Section titles

**Output format**:
```
## Contenuti generati in questa sessione:

**Quiz: Math Quiz**
1. What is 2+2?
   Risposta: 4

**Mappa mentale: Biology**
Concetto centrale: Cell
Concetti collegati: Nucleus, Mitochondria
```

### 2. Chat API Integration (`src/app/api/chat/route.ts`)

Changes:
1. Added `conversationId` to ChatRequest interface
2. Import buildToolContext
3. Inject tool context after memory, before RAG (lines 183-205)
4. Pass conversationId to executeToolCall and saveTool
5. Return hasToolContext in response metadata

**Injection point**:
- After: Tool context injection (requestedTool)
- After: Conversation memory
- Before: RAG context
- Before: Adaptive difficulty

### 3. Tests (`src/lib/tools/__tests__/tool-context-builder.test.ts`)

Test coverage:
- ✓ getToolOutputs retrieves by conversationId
- ✓ formatToolOutput for quiz, mindmap, flashcard
- ✓ buildToolContext builds full context string
- ✓ Error handling returns empty array
- ✓ Empty tools returns empty context

**All tests pass**: 7/7 ✓

## Verification Steps

1. **TypeScript**: No new type errors introduced
2. **Linting**: No new lint errors
3. **Tests**: All 7 unit tests pass
4. **Line counts**: tool-context-builder.ts = 225 lines (under 250)

## How It Works

1. User has conversation with conversationId
2. Maestro creates tools (quiz, mindmap, etc.) via tool calls
3. Tools saved to Material table with conversationId
4. Next message in conversation:
   - buildToolContext fetches all tools for this conversation
   - Formats each tool output for AI readability
   - Injects into system prompt: "## Contenuti generati in questa sessione:"
5. AI can now "see" and reference previously generated content

## Example Flow

```
User: "Create a quiz on photosynthesis"
AI: [creates quiz tool, saves to Material with conversationId]

User: "What questions did you ask about chloroplasts?"
AI: [buildToolContext injects quiz into prompt]
    [AI sees: "Quiz: Photosynthesis - Q1: What is chloroplast role?"]
    "I asked: 'What is the role of chloroplasts in photosynthesis?'"
```

## VERDICT: PASS

All F-xx requirements met. AI can now reference:
- Previously generated quizzes (F-06)
- Previously generated mindmaps (F-07)
- All other tool outputs (F-08)

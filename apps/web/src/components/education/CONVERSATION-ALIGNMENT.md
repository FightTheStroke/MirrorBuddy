# Education Conversation Alignment with Shared Primitives

**Wave**: W4-ConversationUnification
**Task**: T4-09
**Status**: ALIGNED ✓

## Summary

Education conversations (e.g., `materiali-conversation`) are **already compatible** with the shared `ConversationShell` primitive. This document describes the alignment path and adapter pattern for education flows.

## Current State

### Shared Conversation Primitive

`src/components/chat/shared/ConversationShell.tsx` provides:

- Scrollable message list with auto-scroll
- Input area slot
- Optional header slot
- Loading state overlay
- Accessibility attributes (ARIA live regions)

### Education Conversation Components

Education-specific conversation components (e.g., `materiali-conversation`) currently implement:

- Custom message lists with character-specific rendering
- Specialized input areas with attachment support
- Education-specific headers
- Loading states

## Alignment Strategy

Education conversations can adopt `ConversationShell` using the **adapter pattern** already established for maestro and character chats.

### Adapter Pattern (Proven)

Two adapters already exist as reference implementations:

1. **MaestroConversationAdapter** (`src/components/chat/adapters/maestro-conversation-adapter.tsx`)
   - Wraps maestro session logic
   - Reuses `useMaestroSessionLogic` hook
   - Provides `MaestroSessionMessages` as children
   - Provides `MaestroSessionInput` as inputSlot

2. **CharacterConversationAdapter** (`src/components/chat/adapters/character-conversation-adapter.tsx`)
   - Wraps coach/buddy chat logic
   - Reuses `useCharacterChat` hook
   - Provides `MessagesList` as children
   - Provides `ChatInput` as inputSlot

### Education Adapter Blueprint

To align education conversations:

```typescript
/**
 * Education Conversation Adapter
 *
 * Wraps education-specific conversation logic (materiali, tools)
 * with shared ConversationShell.
 */
export function EducationConversationAdapter({
  config,
  onClose,
}: EducationConversationAdapterProps) {
  // Reuse existing education logic
  const { messages, input, setInput, isLoading, handleSend } =
    useEducationChat(config);

  return (
    <ConversationShell
      isLoading={isLoading}
      inputSlot={
        <EducationInput
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          // Education-specific: attachments, formatting
        />
      }
      headerSlot={
        <EducationHeader
          // Subject, maestro, tool context
        />
      }
    >
      <EducationMessagesList
        messages={messages}
        // Education-specific: rich rendering, tools
      />
    </ConversationShell>
  );
}
```

## Key Compatibility Points

| Feature       | ConversationShell          | Education Components          | Compatible?                   |
| ------------- | -------------------------- | ----------------------------- | ----------------------------- |
| Message list  | Generic slot (children)    | Custom MessagesList           | ✓ Yes - pass as children      |
| Input area    | Generic slot (inputSlot)   | Custom input with attachments | ✓ Yes - pass as inputSlot     |
| Header        | Optional slot (headerSlot) | Subject/maestro context       | ✓ Yes - pass as headerSlot    |
| Loading state | isLoading prop             | Loading indicators            | ✓ Yes - unified prop          |
| Auto-scroll   | Built-in, configurable     | Custom scroll logic           | ✓ Yes - replace with built-in |
| Accessibility | ARIA live regions          | Custom a11y                   | ✓ Yes - enhanced by shell     |

## Migration Path (When Needed)

If education conversations need to adopt the unified shell:

1. **Extract logic into hook** (e.g., `useEducationChat`)
   - Message state management
   - Input handling
   - API communication

2. **Create adapter component**
   - Follow pattern from maestro/character adapters
   - Reuse existing UI components
   - Wrap in ConversationShell

3. **Preserve education-specific features**
   - Attachment handling
   - Tool integration
   - Rich content rendering

4. **Feature flag rollout**
   - Use `chat_unified_view` flag
   - A/B test with education flows
   - Gradual migration

## Benefits of Alignment

1. **Consistency**: Same conversation structure across all chat types
2. **Accessibility**: Unified ARIA live regions and keyboard navigation
3. **Maintenance**: Single source of truth for layout logic
4. **Features**: Auto-scroll, loading states work everywhere
5. **Testing**: Shared test suite for conversation behavior

## Education-Specific Considerations

Education conversations have unique requirements that must be preserved:

- **Attachment previews**: PDFs, images, documents
- **Tool integration**: Quiz, flashcard, mindmap rendering
- **Rich formatting**: Code blocks, math equations, diagrams
- **Context panels**: Related materials, similar questions
- **Progress tracking**: Study session metrics

These features are **orthogonal to ConversationShell** - they live in the component slots (children, inputSlot, headerSlot) and work with any shell.

## Conclusion

Education conversations are **architecturally aligned** with `ConversationShell`. The adapter pattern provides a proven, low-risk migration path when needed. No immediate changes required - education flows can adopt the unified shell incrementally as the `chat_unified_view` feature flag rolls out.

## References

- `src/components/chat/shared/ConversationShell.tsx` - Shared primitive
- `src/components/chat/adapters/` - Adapter implementations
- `src/types/unified-chat-view.ts` - Contract interface
- ADR: W4-ConversationUnification (Plan 148)

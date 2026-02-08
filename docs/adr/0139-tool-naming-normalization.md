# ADR 0139: Centralized Tool Naming Normalization

**Status**: Accepted
**Date**: 2026-02-08
**Context**: 6 production bugs revealed systemic issues in tool naming, definition filtering, and fallback handling

## Problem

Three independent naming conventions existed for tools with no central mapping:

| Layer                                    | Convention | Example                                       |
| ---------------------------------------- | ---------- | --------------------------------------------- |
| Character data (maestri/coaches/buddies) | PascalCase | `MindMap`, `WebSearch`, `HtmlInteractive`     |
| Internal ToolType (`TOOL_CONFIG` keys)   | lowercase  | `mindmap`, `search`, `demo`                   |
| OpenAI function names                    | snake_case | `create_mindmap`, `web_search`, `create_demo` |

Ad-hoc mappings were scattered across `tool-handler.ts`, `proposal-injector.ts`, and other files. Each mapping was incomplete and independently maintained, causing silent failures when tools weren't recognized.

### Specific production bugs caused by this

1. **Bug 4**: Chat API passed ALL 13 AI tool definitions to every character regardless of their allowed tools. Coaches/buddies with 5 frontend-only tools received AI tool definitions they couldn't use.
2. **ProposalInjector**: PascalCase lookups against lowercase `TOOL_CONFIG` keys silently returned `undefined`, generating no proposals for valid tools.

## Decision

### Single source of truth: `src/lib/tools/constants.ts`

Two exported functions centralize all character-tool-name-to-ToolType resolution:

```typescript
normalizeCharacterToolName(name: string): ToolType | undefined
normalizeCharacterTools(tools: string[]): ToolType[]
```

These handle:

- Direct `TOOL_CONFIG` key match (already lowercase)
- Case-insensitive lookup via `CHARACTER_TOOL_ALIASES` map
- Known aliases: `flashcards` -> `flashcard`, `websearch` -> `search`, `htmlinteractive` -> `demo`

### Tool definition filtering

`filterToolDefinitions()` in `tool-handler.ts` uses `normalizeCharacterTools()` + `functionNameToToolType()` to filter `CHAT_TOOL_DEFINITIONS` down to only the tools a character is allowed to use.

### Key insight: coach/buddy tools are frontend-only

Coach/buddy tools (`pdf`, `webcam`, `homework`, `formula`, `chart`) have `TOOL_CONFIG` entries but NO `CHAT_TOOL_DEFINITIONS`. They are UI-triggered, not AI-invoked. Filtering correctly returns 0 AI definitions for these characters, which is correct behavior.

## Consequences

### Positive

- Adding a new tool alias requires ONE change in `CHARACTER_TOOL_ALIASES`
- `filterToolDefinitions()` prevents AI from attempting unavailable tools
- `ProposalInjector` correctly resolves PascalCase tool names
- 4 regression tests prevent recurrence

### Negative

- Character data files still use PascalCase names (migration deferred to reduce blast radius)

### Future

- Migrate all 26 maestri data files to use `ToolType` values directly, eliminating the need for aliases

## Regression Tests

| Test file                                                  | Validates                                          |
| ---------------------------------------------------------- | -------------------------------------------------- |
| `src/app/api/chat/__tests__/tool-filter.test.ts`           | filterToolDefinitions + normalizeCharacterToolName |
| `src/lib/tools/plugin/__tests__/proposal-injector.test.ts` | ProposalInjector uses normalized lookups           |

## Related

- ADR 0138: Vercel env var sync (same production incident batch)
- `src/lib/tools/constants.ts`: TOOL_CONFIG, normalizeCharacterToolName, normalizeCharacterTools
- `src/types/tools/tool-types.ts`: functionNameToToolType (snake_case -> ToolType)

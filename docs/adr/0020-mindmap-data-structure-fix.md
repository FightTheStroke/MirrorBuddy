# ADR 0020: Mindmap Data Structure and Rendering Fix

## Status
Accepted (Implemented 2026-01-02)

## Date
2026-01-01

## Context

### Problem Statement

The mindmap feature has three critical bugs that break the user experience:

1. **Central Node Shows "undefined"**: When a mindmap is rendered, the central node displays "undefined" instead of the actual subject (e.g., "La Liguria")

2. **Flat Structure (No Hierarchy)**: All nodes appear at the same level instead of showing proper topic/subtopic hierarchy

3. **Coach Says "Mi dispiace, non ho capito"**: When the user responds to a topic selection prompt (e.g., "geografia"), the coach fails to understand and shows a fallback error message

### Root Cause Analysis

#### Bug 1: "undefined" Title

**Data flow mismatch:**
- `mindmap-handler.ts:90` saves data as `{ topic: title, nodes, markdown }`
- `use-saved-materials.ts` loads from database with field `topic`
- `mindmaps-view.tsx:547` passes `title={selectedMindmap.title}` to renderer
- **Problem**: Field is `topic` in DB, but code expects `title`

**Files involved:**
- `src/lib/tools/handlers/mindmap-handler.ts:90`
- `src/lib/hooks/use-saved-materials.ts`
- `src/components/education/mindmaps-view.tsx:547`
- `src/components/tools/markmap-renderer.tsx:47`

#### Bug 2: Flat Structure

**Data structure mismatch:**
- `mindmap-handler.ts:91-95` saves nodes with `parentId` property:
  ```typescript
  nodes: nodes.map((n) => ({
    id: n.id,
    label: n.label,
    parentId: n.parentId || null,  // <-- parentId format
  })),
  ```

- `markmap-renderer.tsx:33-53` `nodesToMarkdown()` expects `children` property:
  ```typescript
  if (node.children && node.children.length > 0) {  // <-- children format
    for (const child of node.children) { ... }
  }
  ```

- `mindmaps-view.tsx:547` does NOT pass the pre-generated `markdown`:
  ```tsx
  <MindmapRenderer title={...} nodes={...} />  // missing markdown!
  ```

**The handler generates correct markdown with hierarchy but it's never used.**

**Files involved:**
- `src/lib/tools/handlers/mindmap-handler.ts:14-56, 91-95`
- `src/components/tools/markmap-renderer.tsx:33-53`
- `src/components/education/mindmaps-view.tsx:547`

#### Bug 3: Coach "Non ho capito"

**Missing response content:**
- `character-chat-view.tsx:347` uses fallback when no content:
  ```typescript
  content: data.content || data.message || 'Mi dispiace, non ho capito.'
  ```

- When AI makes a tool call without generating text content, the fallback triggers

**Root cause**: The AI is making tool calls but not generating accompanying text explanation.

**Files involved:**
- `src/components/conversation/character-chat-view.tsx:347`
- `src/app/api/chat/route.ts:200+`

#### Bug 4: Missing Hierarchical Structure Instructions

**Prompt gap:**
- `voice-tool-commands.ts:276-311` tool definition lacks clear instructions on how to structure nodes hierarchically
- `TOOL_USAGE_INSTRUCTIONS` (line 1244) says "struttura chiara e gerarchica" but provides no example

**Files involved:**
- `src/lib/voice/voice-tool-commands.ts:276-311, 1244-1357`

### Options Considered

#### Option 1: Patch Each Bug Individually (Quick Fix)
Fix each issue separately without architectural changes.

**Pros:**
- Fast to implement
- Minimal risk

**Cons:**
- Technical debt
- Doesn't address root cause (data structure mismatch)
- Future bugs likely

#### Option 2: Unify Data Structure (Chosen)
Standardize on a single node format and ensure consistency across all components.

**Pros:**
- Clean architecture
- Prevents future mismatches
- Clear data contracts

**Cons:**
- More changes required
- Need to update tests

#### Option 3: Dual Format Support
Support both `parentId` and `children` formats throughout the codebase.

**Pros:**
- Backward compatible

**Cons:**
- Code complexity
- Maintenance burden
- Confusing for developers

## Decision

Implement Option 2: Unify Data Structure with these changes:

### 1. Standardize Node Format

Use `parentId` as the storage format (flat, database-friendly) and convert to `children` format only for rendering.

**New utility function** in `src/lib/tools/mindmap-utils.ts`:
```typescript
export function convertParentIdToChildren(
  nodes: Array<{ id: string; label: string; parentId?: string | null }>
): Array<MindmapNode> {
  // Build tree from flat parentId structure
}

export function convertChildrenToParentId(
  nodes: MindmapNode[]
): Array<{ id: string; label: string; parentId: string | null }> {
  // Flatten tree to parentId structure
}
```

### 2. Fix Title/Topic Field

Standardize on `title` field throughout:
- Handler: Save as `title` (not `topic`)
- Database: Store as `title`
- UI: Read `title` directly

### 3. Use Pre-generated Markdown

When loading saved mindmaps, prefer the pre-generated `markdown` field if available:
```tsx
<MindmapRenderer
  title={mindmap.title}
  markdown={mindmap.markdown}  // <-- prefer this
  nodes={mindmap.nodes}        // <-- fallback conversion
/>
```

### 4. Enhance AI Instructions

Add explicit examples to `TOOL_USAGE_INSTRUCTIONS`:
```typescript
QUANDO USI create_mindmap:
- title: Il soggetto principale (es. "La Liguria")
- nodes: Array di nodi con struttura gerarchica usando parentId

ESEMPIO CORRETTO:
{
  "title": "La Liguria",
  "nodes": [
    { "id": "1", "label": "Geografia", "parentId": null },
    { "id": "2", "label": "Posizione", "parentId": "1" },
    { "id": "3", "label": "Nord-Ovest Italia", "parentId": "2" },
    { "id": "4", "label": "Città principali", "parentId": "1" },
    { "id": "5", "label": "Genova", "parentId": "4" },
    ...
  ]
}
```

### 5. Ensure AI Generates Text with Tool Calls

Update prompts to require text response alongside tool calls:
```
IMPORTANTE: Quando chiami un tool, DEVI anche rispondere con un messaggio
che conferma l'azione (es. "Perfetto! Ti creo una mappa sulla Liguria
concentrandoci sulla geografia...")
```

## Implementation Plan

See: `/docs/plans/in-progress/MindmapDataStructureFix-2026-01-01.md`

## Consequences

### Positive
- Single source of truth for node format
- Clear data contracts between components
- Pre-generated markdown ensures correct hierarchy
- Better AI instructions produce correct output
- Users always get proper subject name and hierarchy

### Negative
- Requires migration of existing saved mindmaps (if any use old format)
- Multiple files need updates
- Tests need updates

### Risks
- Regression in mindmap rendering
- Data format incompatibility with existing saves

### Mitigations
- Comprehensive test coverage before/after
- Backward-compatible conversion functions
- Thor quality review before merge

## Key Files

| File | Change |
|------|--------|
| `src/lib/tools/mindmap-utils.ts` | **NEW** - Conversion utilities |
| `src/lib/tools/handlers/mindmap-handler.ts` | Use `title` field, ensure markdown generated |
| `src/components/tools/markmap-renderer.tsx` | Use markdown prop if available, conversion fallback |
| `src/components/education/mindmaps-view.tsx` | Pass `markdown` prop, use `title` |
| `src/lib/hooks/use-saved-materials.ts` | Map `topic` to `title` for backward compat |
| `src/lib/voice/voice-tool-commands.ts` | Add hierarchical examples to instructions |
| `src/components/conversation/character-chat-view.tsx` | Better fallback handling |
| `src/app/api/chat/route.ts` | Ensure content returned with tool calls |

## Testing Requirements

### Unit Tests
- `mindmap-utils.test.ts`: Conversion functions
- `mindmap-handler.test.ts`: Title field, markdown generation

### Integration Tests
- API creates mindmap with correct structure
- Saved mindmap loads with correct title
- Hierarchy renders correctly

### E2E Tests
- Full flow: User asks for mindmap -> AI creates -> Renders with subject and hierarchy
- Voice flow: User selects topic -> Mindmap updates

### Manual Verification
- Create mindmap via voice
- Verify central node shows subject name
- Verify hierarchy (topics > subtopics)
- Verify coach confirms action (no "non ho capito")

## References
- ADR 0002: MarkMap for Mind Maps
- ADR 0009: Tool Execution Architecture
- ADR 0011: Voice Commands for Mindmap Modifications
- Issue #44: Phase 7-9 Mindmap Features

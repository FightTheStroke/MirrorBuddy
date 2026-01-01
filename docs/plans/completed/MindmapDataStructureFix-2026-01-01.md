# MindmapDataStructureFix - Fix Mindmap Rendering Bugs

**Data**: 2026-01-01
**Target**: Fix 4 critical mindmap bugs (undefined title, flat structure, coach confusion, missing instructions)
**ADR**: 0020-mindmap-data-structure-fix.md
**Branch**: `fix/mindmap-data-structure`
**Worktree**: `/Users/roberdan/GitHub/ConvergioEdu-mindmap-fix`

---

## EXECUTIVE SUMMARY

### The Problem (Screenshot Evidence)

A user asked Melissa (coach) to create a mind map about "La Liguria". Result:
1. Central node shows **"undefined"** instead of "La Liguria"
2. All nodes are **flat** (no hierarchy) - Geografia, Genova, Mare all at same level
3. When user says "geografia", coach responds **"Mi dispiace, non ho capito"**

### The Fix

4 targeted changes to fix data structure mismatch and AI prompt gaps.

---

## QUICK START

### Setup Worktree (BEFORE starting)

```bash
cd /Users/roberdan/GitHub/ConvergioEdu

# Create branch and worktree
git checkout main
git pull origin main
git checkout -b fix/mindmap-data-structure
git worktree add ../ConvergioEdu-mindmap-fix fix/mindmap-data-structure

# Verify
git worktree list
```

### After All Tasks Complete

```bash
cd /Users/roberdan/GitHub/ConvergioEdu-mindmap-fix

# Verify everything passes
npm run lint && npm run typecheck && npm run build && npm run test

# Commit
git add .
git commit -m "fix(mindmap): correct title field, hierarchy rendering, and AI prompts

- Fix undefined title by standardizing on 'title' field
- Add parentId->children conversion for proper hierarchy
- Update AI instructions with explicit hierarchy examples
- Ensure AI generates text alongside tool calls

Fixes: undefined central node, flat structure, coach confusion

ADR: 0020-mindmap-data-structure-fix.md

Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# Push and create PR
git push -u origin fix/mindmap-data-structure
gh pr create --title "fix(mindmap): correct title field, hierarchy rendering, and AI prompts" \
  --body "$(cat <<'EOF'
## Summary

Fixes 4 critical mindmap bugs:

1. **Central node "undefined"** - Standardized on `title` field throughout data flow
2. **Flat structure** - Added `parentId` to `children` conversion utility
3. **Coach "non ho capito"** - Updated prompts to require text with tool calls
4. **Missing hierarchy instructions** - Added explicit examples in AI prompts

## ADR

- [ADR 0020: Mindmap Data Structure Fix](docs/adr/0020-mindmap-data-structure-fix.md)

## Files Changed

- `src/lib/tools/mindmap-utils.ts` (NEW)
- `src/lib/tools/handlers/mindmap-handler.ts`
- `src/components/tools/markmap-renderer.tsx`
- `src/components/education/mindmaps-view.tsx`
- `src/lib/hooks/use-saved-materials.ts`
- `src/lib/voice/voice-tool-commands.ts`
- `src/app/api/chat/route.ts`

## Test Plan

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Unit tests for mindmap-utils.ts pass
- [ ] Manual test: Create mindmap via voice, verify title shows correctly
- [ ] Manual test: Verify nodes show hierarchy (topics > subtopics)
- [ ] Manual test: Verify coach confirms topic selection (no "non ho capito")

## Screenshots

[Add before/after screenshots here]

Generated with Claude Code
EOF
)" --base main
```

### Cleanup (After PR Merged)

```bash
cd /Users/roberdan/GitHub/ConvergioEdu
git worktree remove ../ConvergioEdu-mindmap-fix
git branch -d fix/mindmap-data-structure
```

---

## ROOT CAUSE ANALYSIS

### Bug 1: Central Node "undefined"

```
                    PROBLEM FLOW
                    ============

mindmap-handler.ts:90
  data: { topic: title, ... }   <-- saves as 'topic'
              |
              v
Database (Prisma/API)
  stores 'topic' field
              |
              v
use-saved-materials.ts
  loads mindmap with 'topic'
              |
              v
mindmaps-view.tsx:547
  <MindmapRenderer title={selectedMindmap.title} />
                                          ^^^^^
                                          UNDEFINED!
                                          (field is 'topic' not 'title')
```

### Bug 2: Flat Structure

```
                    PROBLEM FLOW
                    ============

mindmap-handler.ts:91-95
  nodes: [
    { id: "1", label: "Geografia", parentId: null },
    { id: "2", label: "Posizione", parentId: "1" },
    ...
  ]                                      ^^^^^^^^^
                                         parentId format
              |
              v
mindmaps-view.tsx:547
  <MindmapRenderer nodes={mindmap.nodes} />
              |
              v
markmap-renderer.tsx:33-53 nodesToMarkdown()
  if (node.children && node.children.length > 0) {
            ^^^^^^^^
            NEVER TRUE! Nodes have parentId, not children
  }
              |
              v
All nodes rendered at same level (##)
```

### Bug 3: Coach "Non ho capito"

```
                    PROBLEM FLOW
                    ============

User: "geografia"
              |
              v
AI calls create_mindmap tool
  BUT returns: { tool_calls: [...], content: null }
                                    ^^^^^^^^^^^^
                                    No text!
              |
              v
character-chat-view.tsx:347
  content: data.content || 'Mi dispiace, non ho capito.'
                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                           FALLBACK TRIGGERED
```

---

## EXECUTION TRACKER

### Phase 1: Core Fixes (Single Claude)

| Status | ID | Task | Files | Est. Time |
|:------:|:---|:-----|:------|:----------|
| ⬜ | T-01 | Create mindmap-utils.ts with conversion functions | `src/lib/tools/mindmap-utils.ts` | 30m |
| ⬜ | T-02 | Fix mindmap-handler.ts: use 'title' field, generate markdown | `src/lib/tools/handlers/mindmap-handler.ts` | 20m |
| ⬜ | T-03 | Fix markmap-renderer.tsx: use markdown or convert nodes | `src/components/tools/markmap-renderer.tsx` | 30m |
| ⬜ | T-04 | Fix mindmaps-view.tsx: pass markdown, use title | `src/components/education/mindmaps-view.tsx` | 20m |
| ⬜ | T-05 | Fix use-saved-materials.ts: map topic->title | `src/lib/hooks/use-saved-materials.ts` | 15m |
| ⬜ | T-06 | Update voice-tool-commands.ts: add hierarchy examples | `src/lib/voice/voice-tool-commands.ts` | 30m |
| ⬜ | T-07 | Update chat route: ensure content with tool calls | `src/app/api/chat/route.ts` | 20m |

### Phase 2: Tests

| Status | ID | Task | Files | Est. Time |
|:------:|:---|:-----|:------|:----------|
| ⬜ | T-08 | Unit tests for mindmap-utils.ts | `src/lib/tools/__tests__/mindmap-utils.test.ts` | 30m |
| ⬜ | T-09 | Update mindmap-handler.test.ts | `src/lib/tools/handlers/__tests__/mindmap-handler.test.ts` | 20m |
| ⬜ | T-10 | Integration test: full mindmap flow | `e2e/mindmap-hierarchy.spec.ts` | 30m |

### Phase 3: Verification & Review

| Status | ID | Task | Owner | Est. Time |
|:------:|:---|:-----|:------|:----------|
| ⬜ | T-11 | Run full verification suite | Developer | 15m |
| ⬜ | T-12 | Manual test: voice mindmap flow | Developer | 15m |
| ⬜ | T-13 | Thor Quality Review | Thor Agent | 30m |
| ⬜ | T-14 | Create PR with screenshots | Developer | 15m |

---

## TASK DETAILS

### T-01: Create mindmap-utils.ts

Create `src/lib/tools/mindmap-utils.ts`:

```typescript
/**
 * Mindmap Data Structure Utilities
 *
 * Converts between flat parentId format (storage) and
 * nested children format (rendering).
 *
 * ADR: 0020-mindmap-data-structure-fix.md
 */

export interface FlatNode {
  id: string;
  label: string;
  parentId?: string | null;
  color?: string;
  icon?: string;
}

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  color?: string;
  icon?: string;
}

/**
 * Convert flat parentId nodes to nested children tree.
 * Used when rendering mindmaps that were stored with parentId format.
 */
export function convertParentIdToChildren(nodes: FlatNode[]): TreeNode[] {
  if (!nodes || nodes.length === 0) return [];

  // Build lookup map
  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // First pass: create all TreeNodes without children
  for (const node of nodes) {
    nodeMap.set(node.id, {
      id: node.id,
      label: node.label,
      color: node.color,
      icon: node.icon,
      children: [],
    });
  }

  // Second pass: link children to parents
  for (const node of nodes) {
    const treeNode = nodeMap.get(node.id)!;

    if (!node.parentId || node.parentId === 'null' || node.parentId === '') {
      // Root node
      rootNodes.push(treeNode);
    } else {
      // Find parent and add as child
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(treeNode);
      } else {
        // Parent not found, treat as root
        rootNodes.push(treeNode);
      }
    }
  }

  // Clean up empty children arrays
  const cleanChildren = (node: TreeNode): TreeNode => {
    if (node.children && node.children.length === 0) {
      delete node.children;
    } else if (node.children) {
      node.children = node.children.map(cleanChildren);
    }
    return node;
  };

  return rootNodes.map(cleanChildren);
}

/**
 * Convert nested children tree to flat parentId format.
 * Used when saving mindmaps to database.
 */
export function convertChildrenToParentId(
  nodes: TreeNode[],
  parentId: string | null = null
): FlatNode[] {
  const result: FlatNode[] = [];

  for (const node of nodes) {
    result.push({
      id: node.id,
      label: node.label,
      parentId,
      color: node.color,
      icon: node.icon,
    });

    if (node.children && node.children.length > 0) {
      result.push(...convertChildrenToParentId(node.children, node.id));
    }
  }

  return result;
}

/**
 * Generate markdown from flat parentId nodes.
 * Uses proper heading levels for hierarchy.
 */
export function generateMarkdownFromFlatNodes(
  title: string,
  nodes: FlatNode[]
): string {
  const tree = convertParentIdToChildren(nodes);
  return generateMarkdownFromTree(title, tree);
}

/**
 * Generate markdown from nested tree structure.
 */
export function generateMarkdownFromTree(
  title: string,
  nodes: TreeNode[]
): string {
  let markdown = `# ${title}\n\n`;

  const buildLevel = (node: TreeNode, depth: number): string => {
    const prefix = '#'.repeat(Math.min(depth + 1, 6)); // Max h6
    let result = `${prefix} ${node.label}\n`;

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        result += buildLevel(child, depth + 1);
      }
    }

    return result;
  };

  for (const node of nodes) {
    markdown += buildLevel(node, 1);
  }

  return markdown;
}

/**
 * Detect if nodes are in parentId or children format.
 */
export function detectNodeFormat(nodes: unknown[]): 'parentId' | 'children' | 'unknown' {
  if (!nodes || nodes.length === 0) return 'unknown';

  const first = nodes[0] as Record<string, unknown>;

  if ('parentId' in first) return 'parentId';
  if ('children' in first) return 'children';

  return 'unknown';
}
```

**Verification:**
```bash
# After creating file
npm run typecheck
```

---

### T-02: Fix mindmap-handler.ts

Modify `src/lib/tools/handlers/mindmap-handler.ts`:

**Changes:**
1. Use `title` field consistently (not `topic`)
2. Ensure markdown is always generated
3. Better validation

```typescript
// Line 62: Change args destructuring
const { title, nodes } = args as {
  title: string;  // <-- Changed from topic
  nodes: Array<{ id: string; label: string; parentId?: string }>;
};

// Line 89-97: Update data object
const data: MindmapData = {
  title,  // <-- Changed from topic: title
  nodes: nodes.map((n) => ({
    id: n.id,
    label: n.label,
    parentId: n.parentId || null,
  })),
  markdown,  // Already generated correctly
};
```

**Full diff:**
```diff
- const { title, nodes } = args as {
-   title: string;
+ const { title, nodes } = args as {
+   title: string;
    nodes: Array<{ id: string; label: string; parentId?: string }>;
  };

  const data: MindmapData = {
-   topic: title,
+   title,
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label,
      parentId: n.parentId || null,
    })),
    markdown,
  };
```

**Also update types in `src/types/tools.ts`:**
```typescript
export interface MindmapData {
  title: string;  // <-- Ensure this is 'title' not 'topic'
  nodes: MindmapNode[];
  markdown: string;
}
```

**Verification:**
```bash
npm run typecheck
npm run test -- mindmap-handler
```

---

### T-03: Fix markmap-renderer.tsx

Modify `src/components/tools/markmap-renderer.tsx`:

**Changes:**
1. Prefer `markdown` prop if available
2. Add conversion from parentId to children format
3. Handle both formats gracefully

```typescript
// Add import at top
import { convertParentIdToChildren, detectNodeFormat, type TreeNode } from '@/lib/tools/mindmap-utils';

// Update getMarkdownContent (around line 68)
const getMarkdownContent = useCallback((): string => {
  // Prefer pre-generated markdown
  if (markdown) {
    return markdown;
  }

  // Convert nodes if needed
  if (nodes && nodes.length > 0) {
    const format = detectNodeFormat(nodes);

    if (format === 'parentId') {
      // Convert parentId to children, then generate markdown
      const treeNodes = convertParentIdToChildren(nodes as FlatNode[]);
      return nodesToMarkdown(treeNodes, title);
    }

    // Already in children format
    return nodesToMarkdown(nodes as TreeNode[], title);
  }

  return `# ${title}\n## No content`;
}, [markdown, nodes, title]);
```

**Verification:**
```bash
npm run typecheck
npm run build
```

---

### T-04: Fix mindmaps-view.tsx

Modify `src/components/education/mindmaps-view.tsx`:

**Changes:**
1. Pass `markdown` prop to renderer
2. Use `title` field

```typescript
// Around line 547 - view modal
<MindmapRenderer
  title={selectedMindmap.title}
  markdown={selectedMindmap.markdown}  // <-- ADD THIS
  nodes={selectedMindmap.nodes}
/>

// Around line 588 - example modal
<MindmapRenderer
  title={selectedExample.title}
  nodes={selectedExample.nodes}
/>
```

**Also update type SavedMindmap in use-saved-materials.ts to include markdown field.**

**Verification:**
```bash
npm run typecheck
```

---

### T-05: Fix use-saved-materials.ts

Modify `src/lib/hooks/use-saved-materials.ts`:

**Changes:**
1. Map `topic` to `title` when loading from API (backward compat)
2. Ensure `markdown` field is included

Find the mindmap loading/mapping code and update:

```typescript
// When mapping API response to SavedMindmap
const mindmap: SavedMindmap = {
  id: apiMindmap.id,
  title: apiMindmap.title || apiMindmap.topic,  // <-- Backward compat
  nodes: apiMindmap.nodes,
  markdown: apiMindmap.markdown,  // <-- Include markdown
  subject: apiMindmap.subject,
  createdAt: new Date(apiMindmap.createdAt),
};
```

**Also update SavedMindmap interface:**
```typescript
export interface SavedMindmap {
  id: string;
  title: string;
  nodes: MindmapNode[];
  markdown?: string;  // <-- ADD THIS
  subject: Subject;
  createdAt: Date;
}
```

**Verification:**
```bash
npm run typecheck
```

---

### T-06: Update voice-tool-commands.ts

Modify `src/lib/voice/voice-tool-commands.ts`:

**Changes:**
1. Add explicit hierarchy example to tool description
2. Update TOOL_USAGE_INSTRUCTIONS with examples

**Update tool definition (around line 276):**

```typescript
{
  type: 'function',
  name: 'create_mindmap',
  description: `Crea una mappa mentale interattiva per visualizzare concetti.

STRUTTURA RICHIESTA:
- title: Il soggetto principale della mappa (es. "La Liguria", "La Cellula")
- nodes: Array di nodi CON GERARCHIA usando parentId

ESEMPIO DI STRUTTURA CORRETTA:
{
  "title": "La Liguria",
  "nodes": [
    { "id": "1", "label": "Geografia", "parentId": null },
    { "id": "2", "label": "Posizione", "parentId": "1" },
    { "id": "3", "label": "Nord-Ovest Italia", "parentId": "2" },
    { "id": "4", "label": "Caratteristiche", "parentId": "1" },
    { "id": "5", "label": "Costa frastagliata", "parentId": "4" },
    { "id": "6", "label": "Monti vicini al mare", "parentId": "4" }
  ]
}

IMPORTANTE:
- parentId: null = nodo di primo livello
- parentId: "1" = figlio del nodo con id "1"
- Crea SEMPRE almeno 2 livelli di gerarchia`,
  parameters: {
    // ... keep existing
  },
},
```

**Update TOOL_USAGE_INSTRUCTIONS (around line 1244):**

Add after "### Quando usare create_mindmap:":

```typescript
QUANDO CHIAMI create_mindmap:

1. USA SEMPRE il campo "title" per il soggetto principale (es. "La Liguria")
2. CREA GERARCHIA con parentId:
   - parentId: null = argomento principale
   - parentId: "1" = sottoargomento del nodo 1

ESEMPIO:
Studente chiede: "Crea una mappa sulla Liguria, concentrati sulla geografia"

Tu rispondi: "Perfetto! Ti creo una mappa mentale sulla Liguria con focus sulla geografia."

Poi chiami create_mindmap con:
{
  "title": "La Liguria",
  "nodes": [
    { "id": "1", "label": "Geografia", "parentId": null },
    { "id": "2", "label": "Posizione", "parentId": "1" },
    { "id": "3", "label": "Nord-Ovest Italia", "parentId": "2" },
    { "id": "4", "label": "Confini", "parentId": "1" },
    { "id": "5", "label": "Francia", "parentId": "4" },
    { "id": "6", "label": "Piemonte", "parentId": "4" },
    { "id": "7", "label": "Emilia-Romagna", "parentId": "4" },
    { "id": "8", "label": "Toscana", "parentId": "4" },
    { "id": "9", "label": "Morfologia", "parentId": "1" },
    { "id": "10", "label": "Costa frastagliata", "parentId": "9" },
    { "id": "11", "label": "Monti Appennini", "parentId": "9" },
    { "id": "12", "label": "Riviere", "parentId": "9" }
  ]
}

REGOLA CRITICA: RISPONDI SEMPRE con un messaggio testuale PRIMA di chiamare il tool.
Non chiamare mai create_mindmap senza prima confermare vocalmente cosa stai facendo.
```

**Verification:**
```bash
npm run typecheck
```

---

### T-07: Update chat route

Modify `src/app/api/chat/route.ts`:

**Changes:**
1. Ensure content is always returned alongside tool calls
2. Generate fallback content if AI didn't provide any

Find the tool call handling section (around line 154+) and update:

```typescript
// After processing tool calls
if (result.tool_calls && result.tool_calls.length > 0) {
  const toolResults = [];

  for (const toolCall of result.tool_calls) {
    // ... existing tool execution code
  }

  // Ensure we have content for the user
  let responseContent = result.content;

  // If AI made tool calls but didn't generate content, create a fallback
  if (!responseContent || responseContent.trim() === '') {
    const toolNames = result.tool_calls.map(tc => tc.function.name);
    if (toolNames.includes('create_mindmap')) {
      responseContent = 'Ti sto creando la mappa mentale...';
    } else if (toolNames.includes('create_quiz')) {
      responseContent = 'Ti sto preparando il quiz...';
    } else if (toolNames.includes('create_flashcards')) {
      responseContent = 'Ti sto creando le flashcard...';
    } else {
      responseContent = 'Sto elaborando la tua richiesta...';
    }
  }

  return NextResponse.json({
    content: responseContent,  // <-- Now always has value
    toolCalls: toolResults,
    provider: providerConfig.name,
    model: providerConfig.model,
  });
}
```

**Verification:**
```bash
npm run typecheck
npm run build
```

---

### T-08: Unit tests for mindmap-utils.ts

Create `src/lib/tools/__tests__/mindmap-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  convertParentIdToChildren,
  convertChildrenToParentId,
  generateMarkdownFromFlatNodes,
  detectNodeFormat,
} from '../mindmap-utils';

describe('mindmap-utils', () => {
  describe('convertParentIdToChildren', () => {
    it('should convert flat nodes to tree structure', () => {
      const flat = [
        { id: '1', label: 'Root', parentId: null },
        { id: '2', label: 'Child 1', parentId: '1' },
        { id: '3', label: 'Child 2', parentId: '1' },
        { id: '4', label: 'Grandchild', parentId: '2' },
      ];

      const tree = convertParentIdToChildren(flat);

      expect(tree).toHaveLength(1);
      expect(tree[0].label).toBe('Root');
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children![0].label).toBe('Child 1');
      expect(tree[0].children![0].children).toHaveLength(1);
      expect(tree[0].children![0].children![0].label).toBe('Grandchild');
    });

    it('should handle multiple root nodes', () => {
      const flat = [
        { id: '1', label: 'Root 1', parentId: null },
        { id: '2', label: 'Root 2', parentId: null },
      ];

      const tree = convertParentIdToChildren(flat);

      expect(tree).toHaveLength(2);
    });

    it('should handle empty input', () => {
      expect(convertParentIdToChildren([])).toEqual([]);
    });

    it('should treat orphan nodes as roots', () => {
      const flat = [
        { id: '1', label: 'Orphan', parentId: 'nonexistent' },
      ];

      const tree = convertParentIdToChildren(flat);

      expect(tree).toHaveLength(1);
      expect(tree[0].label).toBe('Orphan');
    });
  });

  describe('convertChildrenToParentId', () => {
    it('should flatten tree to parentId format', () => {
      const tree = [
        {
          id: '1',
          label: 'Root',
          children: [
            { id: '2', label: 'Child' },
          ],
        },
      ];

      const flat = convertChildrenToParentId(tree);

      expect(flat).toHaveLength(2);
      expect(flat[0]).toEqual({ id: '1', label: 'Root', parentId: null });
      expect(flat[1]).toEqual({ id: '2', label: 'Child', parentId: '1' });
    });
  });

  describe('generateMarkdownFromFlatNodes', () => {
    it('should generate proper markdown hierarchy', () => {
      const flat = [
        { id: '1', label: 'Geografia', parentId: null },
        { id: '2', label: 'Posizione', parentId: '1' },
        { id: '3', label: 'Nord-Ovest', parentId: '2' },
      ];

      const md = generateMarkdownFromFlatNodes('La Liguria', flat);

      expect(md).toContain('# La Liguria');
      expect(md).toContain('## Geografia');
      expect(md).toContain('### Posizione');
      expect(md).toContain('#### Nord-Ovest');
    });
  });

  describe('detectNodeFormat', () => {
    it('should detect parentId format', () => {
      const nodes = [{ id: '1', label: 'Test', parentId: null }];
      expect(detectNodeFormat(nodes)).toBe('parentId');
    });

    it('should detect children format', () => {
      const nodes = [{ id: '1', label: 'Test', children: [] }];
      expect(detectNodeFormat(nodes)).toBe('children');
    });

    it('should return unknown for empty array', () => {
      expect(detectNodeFormat([])).toBe('unknown');
    });
  });
});
```

**Run:**
```bash
npm run test -- mindmap-utils
```

---

### T-09: Update mindmap-handler.test.ts

Update `src/lib/tools/handlers/__tests__/mindmap-handler.test.ts`:

Add/update these tests:

```typescript
describe('mindmap-handler', () => {
  it('should use title field in output data', async () => {
    const result = await executeToolCall('create_mindmap', {
      title: 'La Liguria',
      nodes: [
        { id: '1', label: 'Geografia', parentId: null },
      ],
    }, {});

    expect(result.success).toBe(true);
    expect(result.data.title).toBe('La Liguria');
    expect(result.data.topic).toBeUndefined(); // Old field should not exist
  });

  it('should generate markdown with proper hierarchy', async () => {
    const result = await executeToolCall('create_mindmap', {
      title: 'La Liguria',
      nodes: [
        { id: '1', label: 'Geografia', parentId: null },
        { id: '2', label: 'Posizione', parentId: '1' },
        { id: '3', label: 'Nord-Ovest', parentId: '2' },
      ],
    }, {});

    expect(result.data.markdown).toContain('# La Liguria');
    expect(result.data.markdown).toContain('## Geografia');
    expect(result.data.markdown).toContain('### Posizione');
  });
});
```

**Run:**
```bash
npm run test -- mindmap-handler
```

---

### T-10: E2E test

Create `e2e/mindmap-hierarchy.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Mindmap Hierarchy', () => {
  test('should render mindmap with correct title and hierarchy', async ({ page }) => {
    // Navigate to mindmaps page
    await page.goto('/materiali');

    // Open example mindmap or create one via button
    await page.click('text=Esempi');

    // Select an example
    await page.click('text=Matematica');

    // Verify title is NOT "undefined"
    const title = await page.locator('h3').first().textContent();
    expect(title).not.toContain('undefined');
    expect(title).toBeTruthy();

    // Verify hierarchy exists (markmap should have nested nodes)
    // The SVG should have multiple g elements at different depths
    const svgElement = await page.locator('svg.markmap');
    expect(await svgElement.isVisible()).toBe(true);

    // Check that nodes exist at different levels
    // (Markmap creates g.markmap-node elements)
    const nodes = await page.locator('g.markmap-node').count();
    expect(nodes).toBeGreaterThan(3); // At least root + some children
  });
});
```

**Run:**
```bash
npx playwright test mindmap-hierarchy
```

---

### T-11: Full Verification Suite

```bash
cd /Users/roberdan/GitHub/ConvergioEdu-mindmap-fix

# Lint
npm run lint
# Expected: 0 errors, 0 warnings

# Typecheck
npm run typecheck
# Expected: 0 errors

# Build
npm run build
# Expected: success

# Unit tests
npm run test
# Expected: all pass

# E2E tests (if configured)
npx playwright test mindmap-hierarchy
# Expected: pass
```

---

### T-12: Manual Test Checklist

**Test in browser at localhost:3000:**

| # | Test | Expected Result | Actual | Pass? |
|---|------|-----------------|--------|-------|
| 1 | Go to /materiali, click "Crea con un Professore" | Dialog opens | | ⬜ |
| 2 | Select geography maestro, start voice session | Voice session starts | | ⬜ |
| 3 | Say "Crea una mappa mentale sulla Liguria" | Maestro confirms, creates mindmap | | ⬜ |
| 4 | Check central node | Shows "La Liguria" (NOT "undefined") | | ⬜ |
| 5 | Check hierarchy | Nodes show topics > subtopics | | ⬜ |
| 6 | Say "geografia" when prompted for topics | Maestro understands and updates map | | ⬜ |
| 7 | Save mindmap, reload page, open it | Title and hierarchy preserved | | ⬜ |

**Take screenshots for PR!**

---

### T-13: Thor Quality Review

**After all tasks complete, invoke Thor:**

```
Use thor-quality-assurance-guardian agent to review the mindmap fix implementation.

Review scope:
1. All files changed in fix/mindmap-data-structure branch
2. Verify ADR 0020 is complete
3. Check test coverage
4. Verify no console.log, TODO, or commented code
5. Ensure types are strict
6. Check for potential regressions

Reject if ANY issues found.
```

**Thor must approve before PR can be merged.**

---

### T-14: Create PR

See "After All Tasks Complete" section at top of this document.

---

## VERIFICATION CHECKLIST

### Code Quality

| Check | Command | Expected | Status |
|-------|---------|----------|--------|
| Lint | `npm run lint` | 0 errors, 0 warnings | ⬜ |
| Types | `npm run typecheck` | 0 errors | ⬜ |
| Build | `npm run build` | success | ⬜ |
| Tests | `npm run test` | all pass | ⬜ |

### Functional

| Check | Method | Expected | Status |
|-------|--------|----------|--------|
| Title not undefined | Manual test | Shows actual subject | ⬜ |
| Hierarchy works | Manual test | Topics > Subtopics visible | ⬜ |
| Coach understands | Manual test | Confirms topic selection | ⬜ |
| Saved map loads | Manual test | Title/hierarchy preserved | ⬜ |

### Documentation

| Check | File | Status |
|-------|------|--------|
| ADR created | `docs/adr/0020-mindmap-data-structure-fix.md` | ⬜ |
| Plan in progress | `docs/plans/in-progress/MindmapDataStructureFix-2026-01-01.md` | ⬜ |
| PR has screenshots | GitHub PR | ⬜ |

---

## PROGRESS SUMMARY

| Phase | Done | Total | Status |
|-------|:----:|:-----:|--------|
| Phase 1: Core Fixes | 0 | 7 | ⬜ NOT STARTED |
| Phase 2: Tests | 0 | 3 | ⬜ NOT STARTED |
| Phase 3: Review | 0 | 4 | ⬜ NOT STARTED |
| **TOTAL** | **0** | **14** | **0%** |

---

## AFTER COMPLETION

### Move Plan to Completed

```bash
mv docs/plans/in-progress/MindmapDataStructureFix-2026-01-01.md \
   docs/plans/completed/MindmapDataStructureFix-2026-01-01.md
```

### Update ADR Status

Change `docs/adr/0020-mindmap-data-structure-fix.md`:
```diff
- ## Status
- Proposed
+ ## Status
+ Accepted
```

---

**Version**: 1.0
**Created**: 2026-01-01
**Author**: Claude Code
**ADR**: 0020

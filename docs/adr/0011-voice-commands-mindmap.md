# ADR 0011: Voice Commands for Mindmap Modifications

## Status

Accepted

## Date

2025-12-31

## Durable command foundation (2026-09-18, #939)

The server-side protocol in `apps/web/src/lib/mindmap/` requires
`{sessionId, toolId, operationId, baseRevision, command, args}`. The same operation
and payload return their original receipt; reusing an ID for different input or
writing from a stale revision is an explicit conflict. An evicted receipt never
allows an old command to bypass the revision check. Tree operations preserve node
IDs, colors, icons and hierarchy. Ambiguous labels, orphaned parents and cycles
are rejected; expansion requires supplied suggestions rather than fabricated text.

Initialization migrates a specific owned Material or unambiguous owned ToolOutput
once, never overwriting it with browser content. Legacy content writers cannot
overwrite a versioned map. `mindmap_replace` supports local edit/undo
integration; focus remains a visual operation, not a persisted tree mutation.

Voice creation now sends the stable tool-call ID as `toolId`; the real dispatcher
resolves the owned trial source when necessary and sends modifications through
`/api/tools/stream/modify` using the caller's explicit active-map identity.
Missing selection is an error, never a newest-map lookup or generic success.
`getActiveMindmap` and `onMindmapResult` are the view integration contract.
Focus returns an owned node identity without changing content or revision.

The rendered view registers a selection lease with `active-mindmap-store`; delayed
initialization cannot take over a newer selection. The voice dispatcher shares
`editor-session` with local edits and undo. Only an acknowledged receipt resolves
pending intent; retry preserves the original operation ID and base revision.
Snapshots never enter undo history, and unrelated later revisions invalidate undo
rather than overwriting another writer. Focus targets the stable rendered node ID.
Pending envelopes survive view close/reopen in owner-scoped memory, not browser
storage. Full-page unload warns while pending; unacknowledged intent is not durable
across a forced reload. The UI exposes localized recovery/errors and explicit retry.
Identity transitions immediately hide the previous owner's editor and stop its
subscription; initialization checks the expected principal before sending content.
Late acknowledgements release closed completed editors. Unresolved current-owner
intents remain in memory. Browser tests cover trial/authenticated conversation
creation and reopen, accepted-response loss and conflict. Actual selected voice
dispatch/focus is covered through the real hook/dispatcher at the network boundary;
paid live WebRTC/inference end-to-end remains the separate C6 acceptance lane.

## Context

MirrorBuddy implements a "conversation-first" approach where students interact with AI Maestri through natural dialogue rather than forms. Issue #23 established this principle, and Issue #44 extended it to mindmaps with real-time voice commands.

### Problem

When students build mindmaps with Maestri, they should be able to modify the map through voice:

- "Aggiungi un nodo su Roma" (Add a node about Rome)
- "Collega geografia con storia" (Connect geography to history)
- "Espandi il nodo sulla Liguria" (Expand the Liguria node)
- "Cancella il nodo sbagliato" (Delete the wrong node)

The existing SSE infrastructure (ADR-0005) supports real-time events, but there was no:

1. Hook for components to receive modification events
2. Imperative API for the mindmap renderer to apply modifications
3. Wrapper component combining these capabilities

### Options Considered

#### Option 1: State-based Updates

Pass modification commands as props to the renderer.

**Cons:**

- React re-render on every modification
- Complex state reconciliation
- No animation control

#### Option 2: Imperative Handle API (Chosen)

Expose methods via `useImperativeHandle` for direct DOM manipulation.

**Pros:**

- Direct control over markmap-view library
- Smooth animations with D3
- No unnecessary re-renders
- Consistent with React patterns for library integration

#### Option 3: Custom Events

Use DOM CustomEvents for communication.

**Cons:**

- Non-React pattern
- Harder to type-check
- Global event pollution

## Decision

Implement a three-layer architecture:

### 1. SSE Hook: `useMindmapModifications`

```typescript
// src/lib/hooks/use-mindmap-modifications.ts
export function useMindmapModifications({
  sessionId,
  enabled,
  callbacks,
}: UseMindmapModificationsOptions): UseMindmapModificationsResult {
  // Subscribe to /api/tools/sse?sessionId=X
  // Dispatch to callbacks on mindmap:modify events
}
```

Listens for SSE events of type `mindmap:modify` and routes to appropriate callbacks.

### 2. Interactive Renderer: `InteractiveMarkMapRenderer`

```typescript
// src/components/tools/interactive-markmap-renderer.tsx
export interface InteractiveMarkMapHandle {
  addNode: (concept: string, parentNode?: string) => void;
  expandNode: (node: string, suggestions?: string[]) => void;
  deleteNode: (node: string) => void;
  focusNode: (node: string) => void;
  setNodeColor: (node: string, color: string) => void;
  connectNodes: (nodeA: string, nodeB: string) => void;
  getNodes: () => MindmapNode[];
  undo: () => void;
}
```

Extends the base MarkMapRenderer with:

- Imperative modification methods
- Node state management
- Undo history
- D3 animations for focus/highlight

### 3. Wrapper Component: `LiveMindmap`

```typescript
// src/components/tools/live-mindmap.tsx
export function LiveMindmap({
  sessionId,
  listenForEvents = true,
  onNodesChange,
  onModification,
  ...rendererProps
}: LiveMindmapProps) {
  // Combines InteractiveMarkMapRenderer with useMindmapModifications
}
```

## Voice Command Flow

```
Student: "Aggiungi Roma come sottocategoria di Italia"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│               Azure OpenAI Realtime API                      │
│  Transcribes and interprets voice command                    │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         POST /api/tools/stream/modify                        │
│  { command: 'mindmap_add_node',                             │
│    args: { concept: 'Roma', parentNode: 'Italia' } }        │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         SSE Broadcast (tool-events.ts)                       │
│  Event: 'mindmap:modify'                                     │
│  Data: { command, args, sessionId, maestroId }              │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         useMindmapModifications Hook                         │
│  Receives event, calls callbacks.onAddNode('Roma', 'Italia')│
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│         InteractiveMarkMapRenderer                           │
│  rendererRef.current.addNode('Roma', 'Italia')              │
│  - Finds parent node 'Italia' by fuzzy match               │
│  - Creates new child node                                    │
│  - Re-renders with D3 transition                            │
└─────────────────────────────────────────────────────────────┘
```

## Supported Commands

| Voice Command           | Function                  | Implementation                   |
| ----------------------- | ------------------------- | -------------------------------- |
| `mindmap_add_node`      | Add concept as child node | `addNode(concept, parentNode?)`  |
| `mindmap_connect_nodes` | Create link between nodes | `connectNodes(nodeA, nodeB)`     |
| `mindmap_expand_node`   | Add multiple children     | `expandNode(node, suggestions?)` |
| `mindmap_delete_node`   | Remove node and children  | `deleteNode(node)`               |
| `mindmap_focus_node`    | Center view on node       | `focusNode(node)`                |
| `mindmap_set_color`     | Change node color         | `setNodeColor(node, color)`      |

## Node Matching

Commands reference nodes by label text. The renderer uses fuzzy matching:

```typescript
private findNodeByLabel(label: string): SVGGElement | null {
  const normalizedLabel = label.toLowerCase().trim();
  // First try exact match, then includes, then Levenshtein
}
```

## Consequences

### Positive

- Natural voice interaction for mindmap building
- Real-time updates visible to all session participants
- Smooth D3 animations for professional feel
- Undo support for mistake recovery
- Extensible to other tool types

### Negative

- Fuzzy matching may select wrong node
- No conflict resolution for multi-user edits (see Phase 8)
- Voice transcription errors can cause wrong commands

## Key Files

| File                                                    | Purpose                   |
| ------------------------------------------------------- | ------------------------- |
| `src/lib/hooks/use-mindmap-modifications.ts`            | SSE subscription hook     |
| `src/components/tools/interactive-markmap-renderer.tsx` | Imperative renderer       |
| `src/components/tools/live-mindmap.tsx`                 | Combined component        |
| `src/lib/voice/voice-tool-commands.ts`                  | Voice command definitions |
| `src/app/api/tools/stream/modify/route.ts`              | Modification API endpoint |

## References

- ADR 0005: Real-time SSE Architecture
- ADR 0009: Tool Execution Architecture
- Issue #23: Conversation-First Architecture
- Issue #44: Phase 7-9 Mindmap Features
- ManifestoEdu.md: "Forms are a sign we failed"

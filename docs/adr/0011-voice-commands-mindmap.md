# ADR 0011: Voice Commands for Mindmap Modifications

## Status
Accepted

## Date
2025-12-31

## Context

ConvergioEdu implements a "conversation-first" approach where students interact with AI Maestri through natural dialogue rather than forms. Issue #23 established this principle, and Issue #44 extended it to mindmaps with real-time voice commands.

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

| Voice Command | Function | Implementation |
|--------------|----------|----------------|
| `mindmap_add_node` | Add concept as child node | `addNode(concept, parentNode?)` |
| `mindmap_connect_nodes` | Create link between nodes | `connectNodes(nodeA, nodeB)` |
| `mindmap_expand_node` | Add multiple children | `expandNode(node, suggestions?)` |
| `mindmap_delete_node` | Remove node and children | `deleteNode(node)` |
| `mindmap_focus_node` | Center view on node | `focusNode(node)` |
| `mindmap_set_color` | Change node color | `setNodeColor(node, color)` |

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

| File | Purpose |
|------|---------|
| `src/lib/hooks/use-mindmap-modifications.ts` | SSE subscription hook |
| `src/components/tools/interactive-markmap-renderer.tsx` | Imperative renderer |
| `src/components/tools/live-mindmap.tsx` | Combined component |
| `src/lib/voice/voice-tool-commands.ts` | Voice command definitions |
| `src/app/api/tools/stream/modify/route.ts` | Modification API endpoint |

## References
- ADR 0005: Real-time SSE Architecture
- ADR 0009: Tool Execution Architecture
- Issue #23: Conversation-First Architecture
- Issue #44: Phase 7-9 Mindmap Features
- ManifestoEdu.md: "Forms are a sign we failed"

# ADR 0022: Knowledge Hub Architecture

## Status
Proposed

## Date
2026-01-01

## Context

The current Archive View (`archive-view.tsx`) provides basic functionality for browsing saved materials, but has critical limitations:

1. **Material Viewer shows JSON dump**: When viewing a mindmap, quiz, flashcard, or summary, users see raw JSON instead of rendered content. This makes the archive effectively unusable for content review.

2. **No quick actions**: Users cannot study flashcards, take quizzes, or view demos directly from the archive. They must navigate to dedicated views.

3. **Limited search**: Search only matches field values (title, subject, maestroId), not the actual content of materials. Finding a specific flashcard or quiz question is impossible.

4. **No organization system**: Materials can only be filtered by type, subject, or date. There are no user-defined folders or tags.

5. **Missing context**: No timeline view, no study statistics, no way to see learning progress over time.

These limitations prevent the archive from being the "single source of truth" for student materials that ADR 0015 (Database-First) intended.

## Decision

Evolve the Archive into a **Knowledge Hub** - a file-manager-like interface for all educational materials with rich previews, full-text search, and flexible organization.

### Core Principles

1. **Render, don't dump**: Every material type has a dedicated renderer that shows actual content
2. **Act in context**: Quick actions allow studying/viewing without leaving the hub
3. **Find anything**: Full-text search indexes actual content, not just metadata
4. **Organize freely**: Collections (folders) and Tags provide flexible organization
5. **Track progress**: Timeline and stats provide learning context

### Architecture

#### 1. Material Renderers

Create a renderer registry pattern:

```typescript
// src/components/education/knowledge-hub/renderers/index.ts
export const MATERIAL_RENDERERS: Record<ToolType, React.FC<RendererProps>> = {
  mindmap: MindmapRenderer,   // Uses existing MarkMap component
  quiz: QuizRenderer,         // Embeds quiz-player
  flashcard: FlashcardRenderer, // Study mode with FSRS
  summary: SummaryRenderer,   // Markdown renderer
  demo: DemoRenderer,         // Sandboxed iframe
  diagram: DiagramRenderer,   // Mermaid
  timeline: TimelineRenderer, // Visual timeline
  formula: FormulaRenderer,   // KaTeX
  chart: ChartRenderer,       // Chart.js
  webcam: ImageRenderer,      // Image viewer
  pdf: PdfRenderer,           // PDF viewer
  homework: HomeworkRenderer, // Homework steps
};
```

Each renderer implements:
- `content: unknown` - The material content
- `title: string` - Display title
- `onAction: (action: string) => void` - Quick action callback
- `isEmbedded?: boolean` - Compact mode for previews

#### 2. Full-Text Search

Pre-compute searchable text on save:

```typescript
// On material save in /api/materials
const searchableText = generateSearchableText(toolType, content);
await prisma.material.create({
  data: { ...materialData, searchableText }
});

// Client-side fuzzy search with Fuse.js
const fuse = new Fuse(materials, {
  keys: ['title', 'subject', 'searchableText', 'maestroId'],
  threshold: 0.3,
  includeMatches: true,
});
```

#### 3. Collections & Tags

New database models:

```prisma
model Collection {
  id          String       @id @default(cuid())
  userId      String
  name        String
  description String?
  color       String?
  icon        String?
  parentId    String?      // Nested folders
  parent      Collection?  @relation("CollectionTree", fields: [parentId], references: [id])
  children    Collection[] @relation("CollectionTree")
  materials   Material[]
  sortOrder   Int          @default(0)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@unique([userId, name, parentId])
  @@index([userId])
  @@index([parentId])
}

model Tag {
  id        String        @id @default(cuid())
  userId    String
  name      String
  color     String?
  materials MaterialTag[]

  @@unique([userId, name])
  @@index([userId])
}

model MaterialTag {
  id         String   @id @default(cuid())
  materialId String
  tagId      String
  material   Material @relation(fields: [materialId], references: [id], onDelete: Cascade)
  tag        Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([materialId, tagId])
}
```

Smart Collections (virtual, computed):
- "Da ripassare" - Flashcards with `nextReview <= now`
- "Recenti" - Created in last 7 days
- "Preferiti" - `isBookmarked = true`
- "Per Maestro" - Group by `maestroId`

#### 4. View Modes

| View | Purpose | Key Features |
|------|---------|--------------|
| Explorer | Default, file-manager style | Sidebar + grid, split-pane |
| Gallery | Large previews | Big cards, infinite scroll |
| Timeline | Chronological | Vertical axis, date grouping |
| Calendar | Study planning | Monthly calendar, due dates |

#### 5. Component Structure

```
src/components/education/knowledge-hub/
  index.ts
  knowledge-hub.tsx           # Main orchestrator
  hooks/
    use-materials-search.ts   # Fuse.js integration
    use-collections.ts        # CRUD for collections
    use-bulk-actions.ts       # Multi-select operations
  views/
    explorer-view.tsx         # Sidebar + content
    gallery-view.tsx          # Large grid
    timeline-view.tsx         # Chronological
    calendar-view.tsx         # Calendar
  components/
    material-card.tsx         # Card with rich preview
    material-detail.tsx       # Full renderer modal
    sidebar-navigation.tsx    # Folders, tags, filters
    search-bar.tsx            # Search with suggestions
    bulk-toolbar.tsx          # Bulk action bar
    quick-actions.tsx         # Per-type actions
    stats-panel.tsx           # Statistics
  renderers/
    *.tsx                     # Per-type renderers
```

### API Changes

```
GET  /api/materials
  + ?search=text       # Full-text search
  + ?collectionId=id   # Filter by collection
  + ?tags[]=id         # Filter by tags

PATCH /api/materials/:id
  + collectionId       # Move to collection
  + tags[]             # Update tags

GET/POST/PATCH/DELETE /api/collections
  - Standard CRUD

GET/POST/PATCH/DELETE /api/tags
  - Standard CRUD
```

## Consequences

### Positive
- **Usable archive**: Materials render properly, can be studied in-place
- **Findable content**: Full-text search finds anything
- **Organized materials**: Folders and tags for personal organization
- **Learning context**: Timeline and stats show progress
- **Single entry point**: One place for all study materials

### Negative
- **Increased complexity**: ~25 new files, new DB models
- **Storage overhead**: `searchableText` duplicates content
- **Migration needed**: Schema changes require `prisma db push`
- **Bundle size**: Fuse.js and renderers add ~30KB

### Mitigations
- Lazy-load renderers (dynamic imports)
- Compute `searchableText` async on save
- Phased rollout: renderers first, then collections, then views

## Implementation Phases

| Phase | Scope | Priority |
|-------|-------|----------|
| 1. Renderers | Replace JSON dump with proper renderers | P0 |
| 2. Search | Full-text with Fuse.js | P1 |
| 3. Collections | Folders + Tags + Smart Collections | P1 |
| 4. Views | Explorer, Timeline, Calendar | P2 |
| 5. Bulk | Multi-select, Stats, Export | P2 |

## References

- Plan: `docs/plans/in-progress/UnifiedArchive-2026-01-01.md`
- ADR 0015: Database-First Architecture
- ADR 0009: Tool Execution Architecture
- Issue #37: Unified Archive page
- Current implementation: `src/components/education/archive-view.tsx`

# Knowledge Hub

File-manager-like interface for all educational materials with rich previews, full-text search, and flexible organization.

## Key Files

| Area | Files |
|------|-------|
| ADR | `docs/adr/0022-knowledge-hub-architecture.md` |
| Main Component | `src/components/education/knowledge-hub/knowledge-hub.tsx` |
| Components | `src/components/education/knowledge-hub/components/*.tsx` |
| Hooks | `src/components/education/knowledge-hub/hooks/*.ts` |
| Renderers | `src/components/education/knowledge-hub/renderers/*.tsx` |
| Views | `src/components/education/knowledge-hub/views/*.tsx` |
| API | `src/app/api/collections/`, `src/app/api/tags/`, `src/app/api/materials/bulk/` |

## Architecture

### Components

| Component | File | Purpose |
|-----------|------|---------|
| SearchBar | `components/search-bar.tsx` | Debounced search with type filter |
| SidebarNavigation | `components/sidebar-navigation.tsx` | Collections, tags, quick filters |
| MaterialCard | `components/material-card.tsx` | Card with drag & drop, context menu |
| BulkToolbar | `components/bulk-toolbar.tsx` | Multi-select operations |
| StatsPanel | `components/stats-panel.tsx` | Material counts and activity |
| QuickActions | `components/quick-actions.tsx` | New material, upload, create folder |

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| useMaterialsSearch | `hooks/use-materials-search.ts` | Fuse.js fuzzy search |
| useCollections | `hooks/use-collections.ts` | Folder CRUD operations |
| useTags | `hooks/use-tags.ts` | Tag CRUD operations |
| useSmartCollections | `hooks/use-smart-collections.ts` | Dynamic collections |
| useBulkActions | `hooks/use-bulk-actions.ts` | Multi-select actions |

### Views

| View | Purpose |
|------|---------|
| ExplorerView | Sidebar + grid, split-pane layout |
| GalleryView | Large card previews, infinite scroll |
| TimelineView | Chronological with date grouping |
| CalendarView | Monthly calendar with due dates |

### Renderers (12 types)

```typescript
MATERIAL_RENDERERS: Record<ToolType, React.FC> = {
  mindmap: MindmapRenderer,
  quiz: QuizRenderer,
  flashcard: FlashcardRenderer,
  summary: SummaryRenderer,
  demo: DemoRenderer,
  diagram: DiagramRenderer,
  timeline: TimelineRenderer,
  formula: FormulaRenderer,
  chart: ChartRenderer,
  webcam: ImageRenderer,
  pdf: PdfRenderer,
  homework: HomeworkRenderer,
};
```

## Full-Text Search

```typescript
// Pre-computed on material save
const searchableText = generateSearchableText(toolType, content);

// Client-side fuzzy search
const fuse = new Fuse(materials, {
  keys: ['title', 'subject', 'searchableText'],
  threshold: 0.3,
  includeMatches: true,
});

const results = fuse.search(query);
```

## Smart Collections

| Collection | Filter |
|------------|--------|
| Da ripassare | Flashcards with nextReview <= now |
| Recenti | Created in last 7 days |
| Preferiti | isBookmarked = true |
| Per Maestro | Group by maestroId |
| Oggi | Created today |
| Questa settimana | Created this week |

## API Endpoints

```
GET  /api/materials?search=&collectionId=&tags[]=
POST /api/materials/bulk (move, archive, delete, addTags)

GET/POST /api/collections
GET/PUT/DELETE /api/collections/[id]

GET/POST /api/tags
GET/PUT/DELETE /api/tags/[id]
```

## Database Models

```prisma
model Collection {
  id          String       @id @default(cuid())
  userId      String
  name        String
  parentId    String?      // Nested folders
  materials   Material[]
}

model Tag {
  id        String        @id @default(cuid())
  userId    String
  name      String
  color     String?
  materials MaterialTag[]
}

model MaterialTag {
  materialId String
  tagId      String
}
```

## Dependencies

```bash
npm install fuse.js react-resizable-panels
```

## Test Coverage

- **Components**: 177 tests
- **Hooks**: 129 tests
- **Renderers**: 126 tests
- **E2E**: `e2e/knowledge-hub.spec.ts`, `e2e/accessibility-knowledge-hub.spec.ts`

# Knowledge Hub

> File-manager-like interface for student materials with rich previews, search, and organization

## Quick Reference

| Key       | Value                                             |
| --------- | ------------------------------------------------- |
| Path      | `src/components/education/knowledge-hub/`         |
| ADRs      | 0022 (Knowledge Hub), 0001 (Materials Storage)    |
| DB Models | `Material`, `Collection`, `Tag`, `MaterialTag`    |
| Storage   | Azure Blob (prod) / Local filesystem (dev)        |
| API       | `/api/materials`, `/api/collections`, `/api/tags` |

## Architecture

The Knowledge Hub evolved from a basic archive that showed JSON dumps into a full-featured material management system. It provides **render, don't dump** - every material type (mindmap, quiz, flashcard, summary, PDF, etc.) has a dedicated renderer that displays actual content.

Materials can be organized with Collections (nested folders) and Tags (flexible labels). Smart Collections provide virtual views like "Da ripassare" (flashcards due), "Recenti" (last 7 days), and "Preferiti" (bookmarked). Full-text search uses Fuse.js for fuzzy matching across title, subject, `searchableText`, and maestroId.

## View Modes

| View     | Purpose               | Features                     |
| -------- | --------------------- | ---------------------------- |
| Explorer | Default, file-manager | Sidebar + grid, split-pane   |
| Gallery  | Large previews        | Big cards, infinite scroll   |
| Timeline | Chronological         | Vertical axis, date grouping |
| Calendar | Study planning        | Monthly view, due dates      |

## Key Files

| File                                | Purpose                                  |
| ----------------------------------- | ---------------------------------------- |
| `knowledge-hub.tsx`                 | Main orchestrator component              |
| `hooks/use-materials-search.ts`     | Fuse.js fuzzy search integration         |
| `hooks/use-collections.ts`          | Collection CRUD operations               |
| `hooks/use-bulk-actions.ts`         | Multi-select operations                  |
| `renderers/*.tsx`                   | Per-type renderers (mindmap, quiz, etc.) |
| `views/explorer-view.tsx`           | Sidebar + content layout                 |
| `components/material-card.tsx`      | Card with rich preview                   |
| `components/sidebar-navigation.tsx` | Folders, tags, filters                   |

## Material Renderers

```typescript
// Registry pattern for type-specific rendering
export const MATERIAL_RENDERERS: Record<ToolType, React.FC<RendererProps>> = {
  mindmap: MindmapRenderer, // Uses MarkMap
  quiz: QuizRenderer, // Embeds quiz-player
  flashcard: FlashcardRenderer, // Study mode with FSRS
  summary: SummaryRenderer, // Markdown renderer
  demo: DemoRenderer, // Sandboxed iframe
  pdf: PdfRenderer, // PDF viewer
  // ... 12 total types
};
```

## Collections & Tags

```typescript
// Create nested collection
const collection = await prisma.collection.create({
  data: {
    userId,
    name: "Matematica",
    color: "#3B82F6",
    icon: "calculator",
    parentId: null, // Top-level
  },
});

// Add material to collection
await prisma.material.update({
  where: { id: materialId },
  data: { collectionId: collection.id },
});
```

## Full-Text Search

```typescript
// Pre-compute searchable text on save
const searchableText = generateSearchableText(toolType, content);
await prisma.material.create({
  data: { ...materialData, searchableText },
});

// Client-side fuzzy search
const fuse = new Fuse(materials, {
  keys: ["title", "subject", "searchableText", "maestroId"],
  threshold: 0.3,
  includeMatches: true,
});
const results = fuse.search(query);
```

## See Also

ADR 0022 (Knowledge Hub), ADR 0001 (Materials Storage), ADR 0015 (Database-First)

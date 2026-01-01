# Piano: Knowledge Hub (Archivio Unificato Intelligente)

**Data**: 2026-01-01
**Issue**: TBD (da creare)
**ADR**: [0020-knowledge-hub-architecture](../../adr/0020-knowledge-hub-architecture.md)
**Branch**: `feature/knowledge-hub`
**Worktree**: `~/worktrees/convergioedu-knowledge-hub`
**Autore**: Roberto + Claude

---

## Workflow

### Setup Worktree

```bash
# Creare worktree dedicato
cd /Users/roberdan/GitHub/ConvergioEdu
git worktree add ~/worktrees/convergioedu-knowledge-hub -b feature/knowledge-hub

# Lavorare nel worktree
cd ~/worktrees/convergioedu-knowledge-hub
npm install
npm run dev
```

### Branch Strategy

- Branch principale: `feature/knowledge-hub`
- Sub-branch per fasi (opzionale): `feature/knowledge-hub/phase-1-renderers`
- Merge alla fine di ogni fase con PR review

### Quality Gates (per ogni fase)

1. `npm run lint` - Zero errors
2. `npm run typecheck` - Zero errors
3. `npm run build` - Build success
4. `npm run test` - All tests pass
5. Thor quality review pass
6. PR approved and merged

---

## Gap Analysis - Stato Attuale

### Gia Implementato
| Componente | File | Status |
|------------|------|--------|
| Archive View base | `archive-view.tsx` | Funzionante |
| Grid/List view | `archive/grid-view.tsx`, `list-view.tsx` | Funzionante |
| Thumbnail preview | `archive/thumbnail-preview.tsx` | Basic |
| Material viewer | `archive/material-viewer.tsx` | **Solo JSON dump** |
| Rating & Bookmark | `archive/star-rating.tsx` | Funzionante |
| Filtri tipo/materia/data | `archive-view.tsx` | Funzionante |
| Ricerca base | `archive-view.tsx` | Solo campi, no contenuto |

### Gap Critici

| Gap | Impatto | Priorita |
|-----|---------|----------|
| Material Viewer non renderizza contenuti | Non puoi visualizzare mindmap/quiz/flashcard | P0 |
| Nessuna azione rapida (studia, quiz, demo) | UX povera, devi uscire dall'archivio | P0 |
| Ricerca solo su campi, non contenuto | Non trovi cosa cerchi | P1 |
| Nessun sistema cartelle/tag | Organizzazione impossibile | P1 |
| Nessuna vista timeline/calendario | Manca contesto temporale | P2 |
| Nessun bulk actions | Gestione multipla impossibile | P2 |
| Nessuna statistica/insight | Manca visibilita progresso | P2 |

---

## Architettura

Vedere [ADR 0020](../../adr/0020-knowledge-hub-architecture.md) per dettagli architetturali.

### Struttura File

```
src/components/education/knowledge-hub/
  index.ts                    # Barrel export
  knowledge-hub.tsx           # Main component
  hooks/
    use-materials-search.ts   # Ricerca full-text con Fuse.js
    use-collections.ts        # Gestione cartelle/tag
    use-bulk-actions.ts       # Multi-select operations
  views/
    explorer-view.tsx         # Vista file-system con sidebar
    gallery-view.tsx          # Grid con preview grandi
    timeline-view.tsx         # Vista cronologica
    calendar-view.tsx         # Calendario studio
  components/
    material-card.tsx         # Card unificata con preview ricca
    material-detail.tsx       # Detail view con renderer completo
    sidebar-navigation.tsx    # Sidebar con cartelle/tag/filtri
    search-bar.tsx            # Ricerca avanzata con suggestions
    bulk-toolbar.tsx          # Toolbar azioni multiple
    quick-actions.tsx         # Azioni rapide per tipo
    stats-panel.tsx           # Statistiche e insights
  renderers/
    index.ts                  # Registry pattern
    mindmap-renderer.tsx      # MarkMap inline
    quiz-renderer.tsx         # Quiz interattivo
    flashcard-renderer.tsx    # Flashcard study mode
    summary-renderer.tsx      # Markdown formattato
    demo-renderer.tsx         # Iframe sandbox
    diagram-renderer.tsx      # Mermaid
    timeline-renderer.tsx     # Timeline visual
    formula-renderer.tsx      # KaTeX
    chart-renderer.tsx        # Chart.js
    image-renderer.tsx        # Webcam photos
    pdf-renderer.tsx          # PDF viewer
    homework-renderer.tsx     # Homework steps
```

---

## Fasi Implementazione

### Fase 1: Material Renderers (P0)

**Obiettivo**: Ogni tipo di materiale renderizza correttamente nell'archivio.

#### Tasks

| ID | Task | File | Test |
|----|------|------|------|
| 1.1 | Creare renderer registry | `renderers/index.ts` | Unit test registry |
| 1.2 | MindmapRenderer | `renderers/mindmap-renderer.tsx` | Render MarkMap |
| 1.3 | QuizRenderer | `renderers/quiz-renderer.tsx` | Show questions |
| 1.4 | FlashcardRenderer | `renderers/flashcard-renderer.tsx` | Study mode |
| 1.5 | SummaryRenderer | `renderers/summary-renderer.tsx` | Markdown render |
| 1.6 | DemoRenderer | `renderers/demo-renderer.tsx` | Sandbox iframe |
| 1.7 | DiagramRenderer | `renderers/diagram-renderer.tsx` | Mermaid |
| 1.8 | TimelineRenderer | `renderers/timeline-renderer.tsx` | Visual timeline |
| 1.9 | FormulaRenderer | `renderers/formula-renderer.tsx` | KaTeX |
| 1.10 | ChartRenderer | `renderers/chart-renderer.tsx` | Chart.js |
| 1.11 | ImageRenderer | `renderers/image-renderer.tsx` | Image zoom |
| 1.12 | PdfRenderer | `renderers/pdf-renderer.tsx` | PDF embed |
| 1.13 | HomeworkRenderer | `renderers/homework-renderer.tsx` | Steps view |
| 1.14 | Aggiornare MaterialViewer | `archive/material-viewer.tsx` | Use renderers |
| 1.15 | Quick Actions component | `components/quick-actions.tsx` | Per-type actions |

#### Test Strategy - Fase 1

```typescript
// tests/knowledge-hub/renderers.test.ts
describe('Material Renderers', () => {
  describe('MindmapRenderer', () => {
    it('renders MarkMap from markdown content', () => {});
    it('handles empty content gracefully', () => {});
    it('supports fullscreen mode', () => {});
  });

  describe('QuizRenderer', () => {
    it('renders all questions', () => {});
    it('tracks answer selection', () => {});
    it('shows results on completion', () => {});
  });

  describe('FlashcardRenderer', () => {
    it('shows front/back on flip', () => {});
    it('integrates with FSRS rating', () => {});
    it('tracks study progress', () => {});
  });

  // ... per ogni renderer
});
```

#### Criteri Completamento Fase 1

- [ ] Tutti i 12 renderers creati e funzionanti
- [ ] MaterialViewer usa registry invece di JSON dump
- [ ] Quick actions funzionano per ogni tipo
- [ ] Tests renderers: 100% coverage
- [ ] `npm run lint && npm run typecheck && npm run build` passa
- [ ] Thor review: renderers corretti, accessibili, performanti

---

### Fase 2: Ricerca Full-Text (P1)

**Obiettivo**: Cercare nel contenuto dei materiali, non solo nei metadati.

#### Tasks

| ID | Task | File | Test |
|----|------|------|------|
| 2.1 | Install fuse.js | `package.json` | - |
| 2.2 | Searchable text generator | `lib/search/searchable-text.ts` | Extract text tests |
| 2.3 | Update Material API | `api/materials/route.ts` | Save searchableText |
| 2.4 | Add searchableText to schema | `prisma/schema.prisma` | Migration |
| 2.5 | useMaterialsSearch hook | `hooks/use-materials-search.ts` | Fuse.js integration |
| 2.6 | SearchBar component | `components/search-bar.tsx` | Suggestions UI |
| 2.7 | Update archive search | `archive-view.tsx` | Use new hook |
| 2.8 | Backfill existing materials | `scripts/backfill-searchable.ts` | Migration script |

#### Test Strategy - Fase 2

```typescript
// tests/knowledge-hub/search.test.ts
describe('Full-Text Search', () => {
  describe('generateSearchableText', () => {
    it('extracts all mindmap node labels', () => {});
    it('extracts quiz questions, options, explanations', () => {});
    it('extracts flashcard fronts and backs', () => {});
    it('extracts summary sections and key points', () => {});
  });

  describe('useMaterialsSearch', () => {
    it('finds materials by content text', () => {});
    it('handles typos with fuzzy matching', () => {});
    it('ranks results by relevance', () => {});
    it('highlights matched terms', () => {});
  });
});
```

#### Criteri Completamento Fase 2

- [ ] `searchableText` field in schema
- [ ] All material saves populate searchableText
- [ ] Backfill script run on existing data
- [ ] Search finds content inside materials
- [ ] Fuzzy matching works for typos
- [ ] Tests search: 100% coverage
- [ ] Thor review: search accurate, fast, no false positives

---

### Fase 3: Collections & Tags (P1)

**Obiettivo**: Organizzare materiali in cartelle e con tag.

#### Tasks

| ID | Task | File | Test |
|----|------|------|------|
| 3.1 | Add Collection model | `prisma/schema.prisma` | Migration |
| 3.2 | Add Tag, MaterialTag models | `prisma/schema.prisma` | Migration |
| 3.3 | Collections API | `api/collections/route.ts` | CRUD endpoints |
| 3.4 | Tags API | `api/tags/route.ts` | CRUD endpoints |
| 3.5 | Update Materials API | `api/materials/route.ts` | Filter by collection/tags |
| 3.6 | useCollections hook | `hooks/use-collections.ts` | Collection CRUD |
| 3.7 | useTags hook | `hooks/use-tags.ts` | Tag CRUD |
| 3.8 | SidebarNavigation | `components/sidebar-navigation.tsx` | Tree view |
| 3.9 | Smart Collections | `hooks/use-smart-collections.ts` | Virtual collections |
| 3.10 | Drag & Drop | `components/material-card.tsx` | Move to collection |

#### Test Strategy - Fase 3

```typescript
// tests/knowledge-hub/collections.test.ts
describe('Collections & Tags', () => {
  describe('Collections API', () => {
    it('creates nested collections', () => {});
    it('moves materials between collections', () => {});
    it('deletes collection and unassigns materials', () => {});
  });

  describe('Tags API', () => {
    it('creates tags with colors', () => {});
    it('assigns multiple tags to material', () => {});
    it('filters by multiple tags (AND/OR)', () => {});
  });

  describe('Smart Collections', () => {
    it('shows due flashcards in "Da ripassare"', () => {});
    it('shows recent materials in "Recenti"', () => {});
    it('groups by maestro correctly', () => {});
  });
});
```

#### Criteri Completamento Fase 3

- [ ] Collection and Tag models in schema
- [ ] APIs per CRUD collections e tags
- [ ] Sidebar con tree view cartelle
- [ ] Tag cloud con filtro multiplo
- [ ] Smart collections funzionanti
- [ ] Drag & drop per spostare materiali
- [ ] Tests collections/tags: 100% coverage
- [ ] Thor review: UX intuitiva, no data loss

---

### Fase 4: Viste Alternative (P2)

**Obiettivo**: Visualizzare materiali in modi diversi.

#### Tasks

| ID | Task | File | Test |
|----|------|------|------|
| 4.1 | Install react-resizable-panels | `package.json` | - |
| 4.2 | ExplorerView | `views/explorer-view.tsx` | Split pane |
| 4.3 | GalleryView | `views/gallery-view.tsx` | Large cards |
| 4.4 | TimelineView | `views/timeline-view.tsx` | Chronological |
| 4.5 | CalendarView | `views/calendar-view.tsx` | Monthly |
| 4.6 | View switcher | `knowledge-hub.tsx` | Toggle views |
| 4.7 | Quick preview on hover | `components/material-card.tsx` | Tooltip preview |

#### Test Strategy - Fase 4

```typescript
// tests/knowledge-hub/views.test.ts
describe('View Modes', () => {
  describe('ExplorerView', () => {
    it('renders sidebar and content pane', () => {});
    it('resizes panes correctly', () => {});
    it('persists pane sizes', () => {});
  });

  describe('TimelineView', () => {
    it('groups materials by date', () => {});
    it('shows activity indicators', () => {});
  });

  describe('CalendarView', () => {
    it('shows materials on creation date', () => {});
    it('shows flashcard due dates', () => {});
  });
});
```

#### Criteri Completamento Fase 4

- [ ] 4 view modes funzionanti
- [ ] View switcher in toolbar
- [ ] Split pane resizable e persistente
- [ ] Timeline raggruppa per data
- [ ] Calendar mostra due dates
- [ ] Tests views: 100% coverage
- [ ] Thor review: views performanti, accessibili

---

### Fase 5: Bulk Actions & Stats (P2)

**Obiettivo**: Operazioni multiple e statistiche.

#### Tasks

| ID | Task | File | Test |
|----|------|------|------|
| 5.1 | useBulkActions hook | `hooks/use-bulk-actions.ts` | Multi-select |
| 5.2 | BulkToolbar | `components/bulk-toolbar.tsx` | Action bar |
| 5.3 | StatsPanel | `components/stats-panel.tsx` | Charts |
| 5.4 | Export functionality | `lib/export/material-export.ts` | PDF/ZIP |
| 5.5 | Bulk move to collection | `api/materials/bulk/route.ts` | Batch update |
| 5.6 | Bulk delete | `api/materials/bulk/route.ts` | Batch delete |

#### Test Strategy - Fase 5

```typescript
// tests/knowledge-hub/bulk.test.ts
describe('Bulk Actions', () => {
  it('selects multiple materials', () => {});
  it('moves selected to collection', () => {});
  it('deletes selected with confirmation', () => {});
  it('exports selected as ZIP', () => {});
});

describe('Stats Panel', () => {
  it('shows materials by type chart', () => {});
  it('shows weekly activity', () => {});
  it('calculates total study time', () => {});
});
```

#### Criteri Completamento Fase 5

- [ ] Multi-select con checkbox
- [ ] Bulk actions: move, delete, tag, export
- [ ] Stats con grafici Chart.js
- [ ] Export PDF singolo
- [ ] Export ZIP multiplo
- [ ] Tests bulk/stats: 100% coverage
- [ ] Thor review: bulk safe, stats accurate

---

## Thor Review Checkpoints

Thor deve essere invocato alla fine di ogni fase per validare:

```bash
# Alla fine di ogni fase
/thor-review knowledge-hub phase-N
```

### Checklist Thor (per fase)

1. **Code Quality**
   - [ ] No code smells
   - [ ] No unused code
   - [ ] No console.logs
   - [ ] Types complete

2. **Performance**
   - [ ] No unnecessary re-renders
   - [ ] Lazy loading where appropriate
   - [ ] Bundle size acceptable

3. **Accessibility**
   - [ ] Keyboard navigable
   - [ ] Screen reader friendly
   - [ ] WCAG 2.1 AA compliant

4. **Security**
   - [ ] No XSS vectors
   - [ ] Inputs sanitized
   - [ ] No exposed secrets

5. **Test Coverage**
   - [ ] Unit tests complete
   - [ ] Integration tests pass
   - [ ] Edge cases covered

---

## Dipendenze

```bash
npm install fuse.js react-resizable-panels
# Gia presenti: framer-motion, lucide-react, chart.js, react-markdown
```

---

## Migration

### Schema Changes

```bash
# Fase 2
npx prisma db push  # Adds searchableText

# Fase 3
npx prisma db push  # Adds Collection, Tag, MaterialTag
```

### Backfill Scripts

```bash
# Fase 2 - Populate searchableText for existing materials
npx ts-node scripts/backfill-searchable.ts

# Fase 3 - Create default collections from subjects
npx ts-node scripts/create-default-collections.ts
```

---

## Definition of Done

Il piano e completo quando:

- [ ] **Fase 1**: Tutti i renderers funzionano, MaterialViewer usa registry
- [ ] **Fase 2**: Ricerca trova contenuto, non solo metadati
- [ ] **Fase 3**: Cartelle e tag funzionanti con drag & drop
- [ ] **Fase 4**: Tutte le viste disponibili e switchabili
- [ ] **Fase 5**: Bulk actions e stats completi
- [ ] **Quality**: `npm run lint && npm run typecheck && npm run build` OK
- [ ] **Tests**: Coverage > 80% per nuovi file
- [ ] **Thor**: Review passata per ogni fase
- [ ] **PR**: Merged to main
- [ ] **Docs**: CHANGELOG aggiornato, ADR 0020 in status "Accepted"

---

## Issue GitHub

Creare issue con:
- Title: `feat: Knowledge Hub - Unified Material Archive Evolution`
- Labels: `enhancement`, `education`, `P0`
- Milestone: v1.1
- Body: Link a questo piano e ADR 0020

---

## Changelog Entry (da aggiungere alla fine)

```markdown
## [Unreleased]

### Added
- **Knowledge Hub**: Evolved archive with rich material renderers
- Full-text search across all material content (Fuse.js)
- Collections (folders) and Tags for organization
- Smart Collections: "Da ripassare", "Recenti", "Preferiti"
- Timeline and Calendar views
- Bulk actions: multi-select, move, delete, export
- Study statistics panel

### Changed
- Material Viewer now renders actual content instead of JSON
- Search indexes material content, not just metadata
```

---

## Prossimi Passi Immediati

1. [ ] Creare worktree: `git worktree add ~/worktrees/convergioedu-knowledge-hub -b feature/knowledge-hub`
2. [ ] Creare issue GitHub
3. [ ] Iniziare Fase 1: Renderer registry + MindmapRenderer
4. [ ] Thor review dopo Fase 1
5. [ ] Continuare con Fase 2-5

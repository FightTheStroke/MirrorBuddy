# Knowledge Hub

Evolution of Archive View into a file-manager-like interface for all educational materials.

## Key Files

| Area | Files |
|------|-------|
| Plan | `docs/plans/in-progress/UnifiedArchive-2026-01-01.md` |
| ADR | `docs/adr/0020-knowledge-hub-architecture.md` |
| Current Archive | `src/components/education/archive-view.tsx` |
| Archive Components | `src/components/education/archive/*.tsx` |
| New Location | `src/components/education/knowledge-hub/` (TBD) |

## Architecture

- **Renderers**: Per-type content renderers (mindmap, quiz, flashcard, etc.)
- **Collections**: User-defined folders with nesting
- **Tags**: Multi-tag per material with colors
- **Smart Collections**: Virtual folders (Due, Recent, Bookmarked)
- **Full-Text Search**: Fuse.js with pre-computed searchable text

## Phases

1. **P0 - Renderers**: Replace JSON dump with actual content rendering
2. **P1 - Search**: Full-text search with Fuse.js
3. **P1 - Collections**: Folders and tags
4. **P2 - Views**: Explorer, Timeline, Calendar, Gallery
5. **P2 - Bulk**: Multi-select, stats, export

## Worktree

```bash
git worktree add ~/worktrees/convergioedu-knowledge-hub -b feature/knowledge-hub
cd ~/worktrees/convergioedu-knowledge-hub
```

## Thor Review

After each phase:
```bash
/thor-review knowledge-hub phase-N
```

## Dependencies

```bash
npm install fuse.js react-resizable-panels
```

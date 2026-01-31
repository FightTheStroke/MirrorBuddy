# Codex Tasks — Tech Debt Cleanup

Work on THIS branch (`plan/112-techdebt-codex-cleanup`). Do ALL tasks below. Run `npm run ci:summary` at the end to verify everything passes.

---

## Task 1: Add CSRF to user API endpoints

Add `requireCSRF(request)` as the FIRST check in each handler, BEFORE auth/rate-limiting.

**Import** (add if not already present):

```typescript
import { requireCSRF } from "@/lib/security/csrf";
```

**Pattern** (insert as first lines inside each handler function):

```typescript
if (!requireCSRF(request)) {
  return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
}
```

**Files → handlers to modify:**

| File                                     | Handlers      |
| ---------------------------------------- | ------------- |
| `src/app/api/concepts/route.ts`          | POST          |
| `src/app/api/user/profile/route.ts`      | PUT           |
| `src/app/api/progress/route.ts`          | PUT           |
| `src/app/api/typing/route.ts`            | POST, PATCH   |
| `src/app/api/learnings/extract/route.ts` | POST          |
| `src/app/api/parent-notes/route.ts`      | PATCH, DELETE |
| `src/app/api/user/consent/route.ts`      | POST          |

Do NOT touch GET handlers. Do NOT change any other logic.

---

## Task 2: Add CSRF to admin API endpoints

Same pattern as Task 1.

| File                                         | Handlers    |
| -------------------------------------------- | ----------- |
| `src/app/api/admin/reset-stats/route.ts`     | POST        |
| `src/app/api/admin/locales/route.ts`         | POST        |
| `src/app/api/admin/locales/[id]/route.ts`    | PUT, DELETE |
| `src/app/api/admin/users/[id]/tier/route.ts` | POST        |

---

## Task 3: Migrate materials imports and delete old files

**Step A** — In these files, change import paths (keep named imports as-is):

- `from "@/lib/storage/materials-db-crud"` → `from "@/lib/storage/materials-db"`
- `from "@/lib/storage/materials-db-utils"` → `from "@/lib/storage/materials-db"`
- `from "@/lib/storage/materials-db-schema"` → `from "@/lib/storage/materials-db"`

Files to update:

1. `src/components/education/archive/use-archive-view.ts`
2. `src/components/education/archive/types.ts`
3. `src/app/supporti/components/hooks/use-zaino-view.ts`

**Step B** — Delete these 3 old files:

- `src/lib/storage/materials-db-crud.ts`
- `src/lib/storage/materials-db-schema.ts`
- `src/lib/storage/materials-db-utils.ts`

---

## Task 4: Delete tool-executor-deprecated.ts

1. Delete `src/lib/tools/tool-executor-deprecated.ts`
2. In `src/lib/tools/tool-executor.ts`, delete the re-export line (~line 29):
   ```typescript
   export {
     getRegisteredHandlers,
     clearHandlers,
     hasToolHandler,
     getRegisteredToolNames,
   } from "./tool-executor-deprecated";
   ```

---

## Task 5: Delete scheduler-service.ts

Delete `src/lib/scheduler/scheduler-service.ts` (marked DEPRECATED, 0 callers).

Do NOT touch other files in `src/lib/scheduler/`.

---

## Task 6: Remove deprecated function

In `src/data/knowledge-base-functions.ts`, delete ONLY the `generateKnowledgeBasePrompt` function and its JSDoc (around line 96):

```typescript
/**
 * @deprecated Use generateCompactIndexPrompt() + getRelevantKnowledge() instead.
 * Kept for backward compatibility during transition.
 */
export function generateKnowledgeBasePrompt(): string {
  return generateCompactIndexPrompt();
}
```

Keep all other functions intact.

---

## Task 7: Migrate mindmap wrapper consumers and delete wrappers

**Step A** — Replace import paths in all these files (keep named imports as-is):

- `from '@/lib/tools/mindmap-export'` → `from '@/lib/tools/mindmap-export/index'`
- `from "@/lib/tools/mindmap-export"` → `from "@/lib/tools/mindmap-export/index"`
- `from '@/lib/tools/mindmap-import'` → `from '@/lib/tools/mindmap-import/index'`
- `from "@/lib/tools/mindmap-import"` → `from "@/lib/tools/mindmap-import/index"`

Files:

1. `src/components/education/mindmaps-view/hooks/use-mindmaps-view.ts`
2. `src/lib/hooks/use-collaboration/utils.ts`
3. `src/lib/hooks/use-collaboration/room-operations.ts`
4. `src/lib/hooks/use-collaboration/main.ts`
5. `src/lib/hooks/use-collaboration/node-operations.ts`
6. `src/components/education/mindmaps-view/components/view-mindmap-modal.tsx`
7. `src/lib/hooks/use-collaboration/event-handler.ts`
8. `src/lib/hooks/use-collaboration/types.ts`
9. `src/app/api/collab/rooms/route.ts`
10. `src/app/api/collab/rooms/[roomId]/helpers.ts`
11. `src/lib/collab/mindmap-room/room-manager.ts`
12. `src/lib/collab/mindmap-room/node-converter.ts`
13. `src/lib/collab/collab-websocket/node-handlers.ts`
14. `src/lib/collab/collab-websocket/room-handlers.ts`
15. `src/lib/collab/collab-websocket/message-handler.ts`

**Step B** — Delete these 2 wrapper files:

- `src/lib/tools/mindmap-import.ts`
- `src/lib/tools/mindmap-export.ts`

---

## Task 8: Fix broken README link

In `README.md`, find (~line 258):

```markdown
**→ See detailed tier comparison: [TIERS.md](TIERS.md)**
```

Replace with:

```markdown
**→ See detailed tier comparison: [Tier Rules](.claude/rules/tier.md)**
```

---

## Final verification

After ALL tasks, run:

```bash
npm run ci:summary
```

It must pass with 0 errors.

# Phase 1: Data Integration (Critical Path)

**Parent**: [Main Tracker](./StudyKitSupportiIntegration-Main.md)
**Focus**: Bridge Study Kit materials to Material table for archive visibility

---

## CONTEXT

Study Kit stores materials embedded in `StudyKit` record:
```prisma
model StudyKit {
  summary   String?  // Plain text
  mindmap   String?  // MindmapData JSON
  demo      String?  // DemoData JSON
  quiz      String?  // QuizData JSON
}
```

Archives query `Material` table via `getActiveMaterials()`.
**Solution**: After SK generation, create Material records.

---

## EXECUTION TRACKER

| Status | ID | Task | Assignee | Files |
|:------:|-----|------|----------|-------|
| ⬜ | T-01 | Create saveMaterialsFromStudyKit() in materials-db.ts | CLAUDE 2 | `src/lib/storage/materials-db.ts` |
| ⬜ | T-02 | Update SK API to call saveMaterialsFromStudyKit on success | CLAUDE 2 | `src/app/api/study-kit/route.ts` |
| ⬜ | T-03 | Handle SK deletion: also delete related Materials | CLAUDE 2 | `src/app/api/study-kit/[id]/route.ts` |
| ⬜ | T-04 | Add sourceStudyKitId to Material model (optional FK) | CLAUDE 2 | `prisma/schema.prisma` |
| ⬜ | T-05 | Run prisma db push and generate | CLAUDE 2 | CLI |
| ⬜ | T-06 | Test: create SK, verify materials in /supporti | CLAUDE 2 | Manual |

---

## DETAILED SPECIFICATIONS

### T-01: saveMaterialsFromStudyKit()

```typescript
// In src/lib/storage/materials-db.ts
export async function saveMaterialsFromStudyKit(
  userId: string,
  studyKit: {
    id: string;
    title: string;
    subject?: string;
    summary?: string;
    mindmap?: string;
    demo?: string;
    quiz?: string;
  }
): Promise<void> {
  const materials: Prisma.MaterialCreateInput[] = [];

  if (studyKit.summary) {
    materials.push({
      userId,
      toolId: `sk-summary-${studyKit.id}`,
      toolType: 'summary',
      title: `${studyKit.title} - Riassunto`,
      content: JSON.stringify({ text: studyKit.summary }),
      subject: studyKit.subject,
      sourceStudyKitId: studyKit.id,
    });
  }

  if (studyKit.mindmap) {
    materials.push({
      userId,
      toolId: `sk-mindmap-${studyKit.id}`,
      toolType: 'mindmap',
      title: `${studyKit.title} - Mappa Mentale`,
      content: studyKit.mindmap, // Already JSON
      subject: studyKit.subject,
      sourceStudyKitId: studyKit.id,
    });
  }

  // Similar for demo, quiz...

  await prisma.material.createMany({ data: materials, skipDuplicates: true });
}
```

### T-02: API Integration

In POST handler after successful SK creation:
```typescript
// After studyKit.status = 'ready'
await saveMaterialsFromStudyKit(userId, studyKit);
```

### T-03: Cascade Delete

In DELETE handler:
```typescript
// Delete related materials first
await prisma.material.deleteMany({
  where: { sourceStudyKitId: id }
});
// Then delete study kit
await prisma.studyKit.delete({ where: { id } });
```

### T-04: Schema Update

```prisma
model Material {
  // ... existing fields
  sourceStudyKitId String?  // Links back to originating SK

  @@index([sourceStudyKitId])
}
```

---

## CHECKPOINT LOG

| Timestamp | Agent | Task | Status | Notes |
|-----------|-------|------|--------|-------|
| - | - | - | - | Awaiting execution |

---

## VERIFICATION

After Phase 1:
1. Create new Study Kit from PDF
2. Navigate to /supporti
3. Verify mindmap, summary, quiz appear in list
4. Delete SK, verify materials also deleted

**Command**: `npm run lint && npm run typecheck && npm run build`

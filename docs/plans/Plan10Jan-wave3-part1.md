# Wave 3: Knowledge Graph (Parte 1)

**Obiettivo**: Abilitare relazioni tra materiali e concetti
**Effort**: 3-4 giorni
**Branch**: `feature/wave3-knowledge-graph`
**Dipende da**: Wave 2 completata

> Vedi anche: [Wave 3 Parte 2](./Plan10Jan-wave3-part2.md)

---

## T3-01: Aggiungi modelli MaterialEdge e Concept

**File**: `prisma/schema.prisma`
**Priorità**: P1
**Effort**: 2h

```prisma
// Relazioni tra materiali
model MaterialEdge {
  id           String   @id @default(cuid())
  fromId       String
  toId         String
  relationType String   // "derived_from" | "related_to" | "prerequisite" | "extends"
  weight       Float    @default(1.0)
  metadata     Json?    // Info aggiuntive sulla relazione
  createdAt    DateTime @default(now())

  from         Material @relation("MaterialEdgeFrom", fields: [fromId], references: [id], onDelete: Cascade)
  to           Material @relation("MaterialEdgeTo", fields: [toId], references: [id], onDelete: Cascade)

  @@unique([fromId, toId, relationType])
  @@index([fromId])
  @@index([toId])
  @@index([relationType])
}

// Concetti astratti
model Concept {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  subject     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  materials   MaterialConcept[]

  @@unique([userId, name])
  @@index([subject])
}

// Link Material <-> Concept
model MaterialConcept {
  materialId String
  conceptId  String
  relevance  Float    @default(1.0)
  createdAt  DateTime @default(now())

  material   Material @relation(fields: [materialId], references: [id], onDelete: Cascade)
  concept    Concept  @relation(fields: [conceptId], references: [id], onDelete: Cascade)

  @@id([materialId, conceptId])
}
```

**Acceptance Criteria**:
- [ ] Migration generata e applicata
- [ ] Indici creati per query performance
- [ ] Cascade delete configurato
- [ ] Prisma Client rigenerato

**Thor Verification**:
```bash
npx prisma migrate dev --name add_knowledge_graph
npx prisma generate
npm run typecheck
```

---

## T3-02: API CRUD per graph

**File nuovi**:
- `src/app/api/materials/[id]/edges/route.ts`
- `src/app/api/materials/[id]/concepts/route.ts`
- `src/app/api/concepts/route.ts`

**Priorità**: P1
**Effort**: 4h

```typescript
// GET /api/materials/[id]/edges
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const edges = await prisma.materialEdge.findMany({
    where: {
      OR: [
        { fromId: params.id },
        { toId: params.id },
      ],
    },
    include: {
      from: { select: { id: true, title: true, toolType: true } },
      to: { select: { id: true, title: true, toolType: true } },
    },
  });

  return Response.json({ edges });
}

// POST /api/materials/[id]/edges
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { toId, relationType, weight } = await request.json();

  const edge = await prisma.materialEdge.create({
    data: {
      fromId: params.id,
      toId,
      relationType,
      weight: weight ?? 1.0,
    },
  });

  return Response.json({ edge }, { status: 201 });
}
```

**Acceptance Criteria**:
- [ ] CRUD completo per edges
- [ ] CRUD completo per concepts
- [ ] Link material <-> concept
- [ ] Query "related materials" funziona
- [ ] Auth check su tutte le route

**Thor Verification**:
```bash
npm run typecheck
curl -X POST http://localhost:3000/api/materials/abc/edges \
  -H "Content-Type: application/json" \
  -d '{"toId":"def","relationType":"derived_from"}'
```

# Wave 3: Knowledge Graph (Parte 2)

**Branch**: `feature/wave3-knowledge-graph`
**Dipende da**: Wave 2 completata

> Vedi anche: [Wave 3 Parte 1](./Plan10Jan-wave3-part1.md)

---

## T3-03: Auto-link materiali derivati

**File**: `src/lib/tools/tool-persistence.ts`
**Priorità**: P2
**Effort**: 3h

Quando un tool viene creato da un altro (es. quiz da summary), crea automaticamente l'edge.

```typescript
// In saveMaterial()
async function saveMaterial(
  material: MaterialInput,
  sourceId?: string // ID del materiale sorgente
): Promise<Material> {
  const saved = await prisma.material.create({ data: material });

  // Auto-link se derivato
  if (sourceId) {
    await prisma.materialEdge.create({
      data: {
        fromId: sourceId,
        toId: saved.id,
        relationType: 'derived_from',
        weight: 1.0,
      },
    });
  }

  return saved;
}
```

**Acceptance Criteria**:
- [ ] Quiz creato da summary ha edge "derived_from"
- [ ] Flashcard da mindmap ha edge
- [ ] UI mostra "Creato da: [link]"

**Thor Verification**:
```sql
SELECT e.*, m1.title as from_title, m2.title as to_title
FROM "MaterialEdge" e
JOIN "Material" m1 ON e."fromId" = m1.id
JOIN "Material" m2 ON e."toId" = m2.id
WHERE e."relationType" = 'derived_from';
```

---

## T3-04: UI "Materiali Correlati"

**File**: `src/components/education/knowledge-hub/components/related-materials.tsx`
**Priorità**: P2
**Effort**: 4h

```typescript
interface RelatedMaterialsProps {
  materialId: string;
}

export function RelatedMaterials({ materialId }: RelatedMaterialsProps) {
  const { data: edges } = useSWR(`/api/materials/${materialId}/edges`);

  if (!edges?.length) return null;

  const grouped = groupBy(edges, 'relationType');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Materiali Correlati</h3>

      {grouped.derived_from && (
        <Section title="Derivato da" materials={grouped.derived_from} />
      )}

      {grouped.related_to && (
        <Section title="Correlati" materials={grouped.related_to} />
      )}

      {grouped.prerequisite && (
        <Section title="Prerequisiti" materials={grouped.prerequisite} />
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Sezione visibile in Material detail view
- [ ] Click naviga al materiale correlato
- [ ] Mostra tipo di relazione
- [ ] Empty state se no correlati

**Thor Verification**:
```bash
npm run typecheck
npm run build
# Test manuale: aprire materiale, verificare sezione correlati
```

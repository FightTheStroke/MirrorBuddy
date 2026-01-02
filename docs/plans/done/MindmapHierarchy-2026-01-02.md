# Piano: Mappe Mentali Gerarchiche

**Data**: 2026-01-02
**Problema**: Le mappe sono PIATTE - tutti i nodi allo stesso livello invece di gerarchia
**Priorita**: ALTA
**Status**: [x] COMPLETED 2026-01-02 18:55

---

## ROOT CAUSE

Le istruzioni all'AI nel **Chat API** sono VAGHE e non spiegano come usare `parentId`.

| File | Qualita Istruzioni |
|------|-------------------|
| `/api/chat/route.ts` (linee 40-55) | VAGO - dice "gerarchicamente" ma non spiega COME |
| `/types/tools.ts` (linee 28-69) | MEDIO - menziona parentId ma niente esempio |
| `/lib/voice/voice-tool-commands.ts` (linee 279-301) | PERFETTO - esempio JSON completo |

**Risultato**: L'AI genera tutti i nodi con `parentId: null` = mappa piatta.

---

## COME DOVREBBE ESSERE

**SBAGLIATO (attuale)**:
```json
{
  "title": "Equazioni Semplici",
  "nodes": [
    { "id": "1", "label": "Tipi di Equazioni", "parentId": null },
    { "id": "2", "label": "Equazioni Lineari", "parentId": null },
    { "id": "3", "label": "Equazioni Quadratiche", "parentId": null },
    { "id": "4", "label": "Operazioni Fondamentali", "parentId": null }
  ]
}
```

**CORRETTO (target)**:
```json
{
  "title": "Equazioni Semplici",
  "nodes": [
    { "id": "1", "label": "Tipi di Equazioni", "parentId": null },
    { "id": "2", "label": "Equazioni Lineari", "parentId": "1" },
    { "id": "3", "label": "Equazioni Quadratiche", "parentId": "1" },
    { "id": "4", "label": "Operazioni Fondamentali", "parentId": null },
    { "id": "5", "label": "Addizione e Sottrazione", "parentId": "4" },
    { "id": "6", "label": "Moltiplicazione e Divisione", "parentId": "4" }
  ]
}
```

---

## PIANO DI ESECUZIONE

### FASE 1: Fix Chat API Tool Context

**File**: `src/app/api/chat/route.ts`
**Linee**: 40-55 (TOOL_CONTEXT["mindmap"])

**Azione**: Sostituire le istruzioni vaghe con quelle esplicite della Voice API

**DA**:
```typescript
mindmap: `
Struttura della mappa (3-5 rami principali, 2-3 sottolivelli):
- title: Il tema centrale
- nodes: Almeno 8-12 nodi organizzati gerarchicamente
`
```

**A**:
```typescript
mindmap: `
STRUTTURA GERARCHICA OBBLIGATORIA:
- title: Il tema centrale della mappa
- nodes: Array di nodi con gerarchia padre-figlio

ESEMPIO DI STRUTTURA CORRETTA:
{
  "title": "La Fotosintesi",
  "nodes": [
    { "id": "1", "label": "Fase Luminosa", "parentId": null },
    { "id": "2", "label": "Clorofilla", "parentId": "1" },
    { "id": "3", "label": "Assorbimento Luce", "parentId": "1" },
    { "id": "4", "label": "Fase Oscura", "parentId": null },
    { "id": "5", "label": "Ciclo di Calvin", "parentId": "4" },
    { "id": "6", "label": "Fissazione CO2", "parentId": "5" }
  ]
}

REGOLE IMPERATIVE:
1. parentId: null = nodo di PRIMO livello (ramo dal centro)
2. parentId: "X" = figlio del nodo con id "X"
3. DEVI creare ALMENO 3 livelli di profondita
4. Ogni nodo di primo livello DEVE avere 2-4 figli
5. NON mettere MAI tutti i nodi con parentId: null

Se generi una mappa piatta (tutti parentId: null), HAI SBAGLIATO.
`
```

### FASE 2: Allineare Tool Definition

**File**: `src/types/tools.ts`
**Linee**: 28-69

**Azione**: Aggiungere esempio JSON e regole piu chiare nella definizione del tool

### FASE 3: Aggiungere Validazione nel Handler

**File**: `src/lib/tools/handlers/mindmap-handler.ts`

**Azione**: Aggiungere warning/log se la mappa generata e' piatta

```typescript
// Dopo aver ricevuto i nodi
const rootNodes = nodes.filter(n => !n.parentId || n.parentId === 'null');
const childNodes = nodes.filter(n => n.parentId && n.parentId !== 'null');

if (childNodes.length === 0) {
  logger.warn('Mindmap generata PIATTA - nessun nodo con parentId', {
    title,
    nodeCount: nodes.length,
    allRoots: true
  });
}
```

### FASE 4: Test

| # | Test | Comando |
|---|------|---------|
| 4.1 | Unit test | `npm run test:unit -- mindmap` |
| 4.2 | Manual test | Creare mappa via chat, verificare gerarchia |
| 4.3 | Typecheck | `npm run typecheck` |

---

## FILE DA MODIFICARE

| File | Modifica |
|------|----------|
| `src/app/api/chat/route.ts` | TOOL_CONTEXT["mindmap"] |
| `src/types/tools.ts` | CHAT_TOOL_DEFINITIONS mindmap |
| `src/lib/tools/handlers/mindmap-handler.ts` | Aggiungere validazione/warning |

---

## VERIFICA SUCCESSO

La mappa "Equazioni Semplici" deve avere:
- "Tipi di Equazioni" come nodo padre
  - "Equazioni Lineari" come figlio
  - "Equazioni Quadratiche" come figlio
- "Operazioni Fondamentali" come nodo padre
  - "Addizione e Sottrazione" come figlio
  - etc.

NON piu' tutto allo stesso livello.

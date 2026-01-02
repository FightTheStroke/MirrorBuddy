# Piano: Conversation Memory - Continuita tra Sessioni

**Data**: 2026-01-02
**Problema**: Nuova conversazione NON riprende da dove si era fermata
**Priorita**: ALTA
**Status**: [x] COMPLETED 2026-01-02 18:58 (FASE 1, 2, 4 - FASE 3 UI feedback optional)

---

## PROBLEMI IDENTIFICATI

### PROBLEMA 1: Summary non generato per conversazioni brevi
**File**: `src/lib/conversation/summary-generator.ts` (linea 67-85)
```typescript
if (messages.length < 2) {
  // SKIP! Nessun summary generato
}
```
**Impatto**: Conversazioni con 1 messaggio vengono DIMENTICATE

### PROBLEMA 2: Frontend non mostra feedback del memory caricato
**File**: `src/app/api/chat/route.ts` (linea 313)
- Server ritorna `hasMemory: true/false`
- Frontend NON lo usa per mostrare nulla all'utente
**Impatto**: Utente non sa se il context e' stato caricato

### PROBLEMA 3: Frontend non pre-carica memory prima di chattare
**File**: `src/lib/stores/app-store.ts` (linea 753)
- `createConversation(maestroId)` crea la conversazione
- NON chiama `/api/conversations/memory` per precaricare
**Impatto**: Memory viene caricato solo al primo messaggio, non prima

### PROBLEMA 4: keyFacts JSON invalido ignorato silenziosamente
**File**: `src/lib/conversation/memory-loader.ts` (linea 98-110)
```typescript
try {
  const facts = JSON.parse(conv.keyFacts);
} catch {
  // SKIP SILENTLY - nessun log
}
```
**Impatto**: Dati corrotti vengono persi senza traccia

### PROBLEMA 5: Nessun log quando memory non trovato
**File**: `src/app/api/chat/route.ts`
- Se `enableMemory: true` ma nessun memory trovato, nessun warning
**Impatto**: Difficile debuggare perche' la memoria non funziona

---

## FLUSSO ATTUALE VS TARGET

**ATTUALE (rotto)**:
```
Conversazione 1 finisce
  ├── Se < 2 messaggi → NESSUN summary ❌
  └── Se >= 2 messaggi → summary salvato ✓

Conversazione 2 inizia
  ├── Frontend NON chiama /api/conversations/memory ❌
  ├── Utente scrive primo messaggio
  ├── Backend carica memory nel system prompt ✓
  └── Ma utente non vede feedback ❌
```

**TARGET (corretto)**:
```
Conversazione 1 finisce
  └── SEMPRE genera summary (anche 1 messaggio) ✓

Conversazione 2 inizia
  ├── Frontend chiama /api/conversations/memory ✓
  ├── Mostra "Riprendiamo da dove eravamo..." ✓
  ├── Utente scrive primo messaggio
  └── Backend carica memory nel system prompt ✓
```

---

## PIANO DI ESECUZIONE

### FASE 1: Fix Summary Generator

**File**: `src/lib/conversation/summary-generator.ts`

**DA** (linea 67):
```typescript
if (messages.length < 2) {
  // Skip - not enough messages
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { isActive: false },
  });
  return null;
}
```

**A**:
```typescript
if (messages.length === 0) {
  // Nessun messaggio - skip
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { isActive: false },
  });
  return null;
}

if (messages.length === 1) {
  // Solo 1 messaggio - genera summary semplice senza chiamare AI
  const singleMessage = messages[0];
  const simpleSummary = `Lo studente ha chiesto: "${singleMessage.content.substring(0, 200)}"`;

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      isActive: false,
      summary: simpleSummary,
      keyFacts: JSON.stringify([singleMessage.content.substring(0, 100)]),
      topics: JSON.stringify([]),
    },
  });
  return { summary: simpleSummary };
}

// >= 2 messaggi - genera summary con AI (come prima)
```

### FASE 2: Aggiungere Logging nel Memory Loader

**File**: `src/lib/conversation/memory-loader.ts`

**Aggiungere** dopo la query (linea 48):
```typescript
if (conversations.length === 0) {
  logger.info('No previous conversations found for memory', {
    userId,
    maestroId,
  });
}

// Nel catch di JSON.parse (linea 108):
} catch (e) {
  logger.warn('Invalid JSON in keyFacts, skipping', {
    conversationId: conv.id,
    keyFacts: conv.keyFacts?.substring(0, 100),
  });
}
```

### FASE 3: Aggiungere Feedback UI

**File**: `src/components/education/conversation-flow.tsx` (o simile)

**Aggiungere** dopo createConversation:
```typescript
// Dopo aver creato la conversazione
const memoryResponse = await fetch(`/api/conversations/memory?maestroId=${maestroId}`);
const memory = await memoryResponse.json();

if (memory.recentSummary) {
  // Mostra toast/banner
  toast.info('Riprendiamo da dove eravamo rimasti!', {
    description: memory.recentSummary.substring(0, 100) + '...'
  });
}
```

### FASE 4: Aggiungere Warning nel Chat API

**File**: `src/app/api/chat/route.ts`

**Aggiungere** dopo loadPreviousContext (linea 205):
```typescript
const memory = enableMemory ? await loadPreviousContext(userId, maestroId) : null;

if (enableMemory && (!memory || !memory.recentSummary)) {
  logger.warn('Memory enabled but no previous context found', {
    userId,
    maestroId,
    enableMemory,
  });
}
```

### FASE 5: Test

| # | Test | Verifica |
|---|------|----------|
| 5.1 | Crea conversazione con 1 messaggio, chiudi, riapri | Summary presente |
| 5.2 | Nuova sessione mostra "Riprendiamo..." | Feedback visibile |
| 5.3 | Check logs per warning su memory mancante | Logs presenti |
| 5.4 | `npm run typecheck` | Passa |
| 5.5 | `npm run test:unit -- conversation` | Passa |

---

## FILE DA MODIFICARE

| File | Modifica |
|------|----------|
| `src/lib/conversation/summary-generator.ts` | Generare summary per 1 messaggio |
| `src/lib/conversation/memory-loader.ts` | Aggiungere logging |
| `src/app/api/chat/route.ts` | Aggiungere warning |
| `src/components/education/conversation-flow.tsx` | Feedback UI |

---

## VERIFICA SUCCESSO

1. **Test conversazione breve**:
   - Apri conversazione con Euclide
   - Scrivi "Ciao, voglio studiare le equazioni"
   - Chiudi
   - Riapri conversazione con Euclide
   - DEVE mostrare "Riprendiamo da dove eravamo..."
   - Il maestro DEVE ricordare che volevi studiare equazioni

2. **Test logs**:
   - Se memory non trovato, deve apparire warning nei logs
   - Se keyFacts corrotto, deve apparire warning

# Wave 1: Stabilizzazione Base (Parte 1)

**Obiettivo**: Eliminare bug random e rendere il codice estendibile
**Effort**: 3-4 giorni
**Branch**: `feature/wave1-stabilization`

> Vedi anche: [Wave 1 Parte 2](./Plan10Jan-wave1-part2.md)

---

## T1-01: Unifica stato Astuccio con useReducer

**File**: `src/app/astuccio/components/astuccio-view.tsx`
**Priorità**: P1
**Effort**: 4h

**Problema attuale**:
```typescript
// 4+ useState separati - difficile da estendere
const [selectedTool, setSelectedTool] = useState<string | null>(null);
const [isMaestroDialogOpen, setIsMaestroDialogOpen] = useState(false);
const [pendingToolType, setPendingToolType] = useState<ToolType | null>(null);
const [pendingToolRoute, setPendingToolRoute] = useState<string | null>(null);
```

**Soluzione**:
```typescript
// Reducer pattern - singolo stato, azioni chiare
type AstuccioState = {
  selectedTool: string | null;
  pendingToolType: ToolType | null;
  pendingToolRoute: string | null;
  dialogState: 'closed' | 'selecting_maestro' | 'loading';
};

type AstuccioAction =
  | { type: 'SELECT_TOOL'; tool: string; toolType: ToolType; route: string }
  | { type: 'OPEN_MAESTRO_DIALOG' }
  | { type: 'CLOSE_DIALOG' }
  | { type: 'CONFIRM_MAESTRO'; maestroId: string }
  | { type: 'RESET' };

const [state, dispatch] = useReducer(astuccioReducer, initialState);
```

**Acceptance Criteria**:
- [ ] Reducer implementato con tutti gli action types
- [ ] Nessun useState per flow selection
- [ ] Test: aggiungere nuovo tool richiede solo modifica a constants
- [ ] Zero regressioni UI

**Thor Verification**:
```bash
npm run typecheck
npm run lint
npm run test -- --grep "astuccio"
```

---

## T1-02: Centralizza route tools in constants

**File nuovo**: `src/lib/tools/constants.ts`
**File da modificare**: `astuccio-view.tsx`, `tool-result-display.tsx`
**Priorità**: P1
**Effort**: 2h

**Problema attuale**:
Routes duplicate in 3+ posti:
- `astuccio-view.tsx`: hardcoded `'/mindmap'`, `'/quiz'`
- `tool-result-display.tsx`: mapping function name → route
- URL routing in Next.js

**Soluzione**:
```typescript
// src/lib/tools/constants.ts
export const TOOL_CONFIG = {
  mindmap: {
    type: 'mindmap' as const,
    route: '/mindmap',
    functionName: 'create_mindmap',
    label: 'Mappa Mentale',
    icon: 'Brain',
    category: 'create',
    requiresMaestro: true,
  },
  quiz: {
    type: 'quiz' as const,
    route: '/quiz',
    functionName: 'create_quiz',
    label: 'Quiz',
    icon: 'HelpCircle',
    category: 'create',
    requiresMaestro: true,
  },
  // ... tutti i tool
} as const;

export type ToolKey = keyof typeof TOOL_CONFIG;
export const getToolByFunctionName = (fn: string) =>
  Object.values(TOOL_CONFIG).find(t => t.functionName === fn);
export const getToolRoute = (key: ToolKey) => TOOL_CONFIG[key].route;
```

**Acceptance Criteria**:
- [ ] Tutte le route in un solo file
- [ ] Astuccio usa `TOOL_CONFIG`
- [ ] `tool-result-display.tsx` usa `getToolByFunctionName`
- [ ] Aggiungere nuovo tool = 1 entry in constants

**Thor Verification**:
```bash
grep -r "'/mindmap'" src/ --include="*.tsx" | grep -v constants
grep -r "'/quiz'" src/ --include="*.tsx" | grep -v constants
npm run typecheck
```

---

## T1-03: Aggiungi timeout WebSocket

**File**: `src/server/realtime-proxy.ts`
**Priorità**: P1
**Effort**: 2h

**Problema attuale**:
```typescript
// Nessun timeout - connessioni zombie possibili
const ws = new WebSocket(wsUrl, { headers });
```

**Soluzione**:
```typescript
const CONNECTION_TIMEOUT_MS = 30000;
const PING_INTERVAL_MS = 15000;

// Timeout su connessione iniziale
const connectionTimeout = setTimeout(() => {
  if (ws.readyState !== WebSocket.OPEN) {
    logger.warn('Connection timeout', { wsUrl });
    ws.close(4000, 'Connection timeout');
  }
}, CONNECTION_TIMEOUT_MS);

ws.on('open', () => {
  clearTimeout(connectionTimeout);

  // Ping periodico per detect stale connections
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, PING_INTERVAL_MS);

  ws.on('close', () => clearInterval(pingInterval));
});

// Pong timeout
let pongReceived = true;
ws.on('pong', () => { pongReceived = true; });

setInterval(() => {
  if (!pongReceived) {
    logger.warn('Pong not received, closing stale connection');
    ws.close(4001, 'Stale connection');
  }
  pongReceived = false;
}, PING_INTERVAL_MS * 2);
```

**Acceptance Criteria**:
- [ ] Timeout 30s su connessione iniziale
- [ ] Ping ogni 15s
- [ ] Close automatico se no pong per 30s
- [ ] Log warning su timeout

**Thor Verification**:
```bash
npm run typecheck
# Test manuale: avviare sessione voce, verificare log ping/pong
```

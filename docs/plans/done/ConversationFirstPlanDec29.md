# ConversationFirstPlanDec29 - ConvergioEdu v2.0 Architecture Overhaul

**Data**: 2025-12-29
**Target**: Trasformare ConvergioEdu da Form-First a Conversation-First
**Epic Reference**: GitHub Issue #23
**ManifestoEdu**: La stella polare di questo progetto

**Metodo**: VERIFICA BRUTALE - ogni task testato prima di dichiararlo fatto

---

## 📊 DEPENDENCY GRAPH

```
                    ┌─────────────────────────────────────────┐
                    │         PHASE 0: FOUNDATION             │
                    │                                         │
                    │  #22 Storage      #20 Webcam            │
                    │  Architecture     Quick Win             │
                    │       │               │                 │
                    └───────┼───────────────┼─────────────────┘
                            │               │
            ┌───────────────┼───────────────┼───────────────────┐
            │               ▼               ▼                   │
            │  ┌─────────────────────────────────────────────┐  │
            │  │         PHASE 1: INFRASTRUCTURE             │  │
            │  │                                             │  │
            │  │  #26 WebSocket     #21 PDF     #24 Melissa  │  │
            │  │  Real-time         Processing  Character    │  │
            │  │       │               │            │        │  │
            │  └───────┼───────────────┼────────────┼────────┘  │
            │          │               │            │           │
            │          ▼               ▼            ▼           │
            │  ┌─────────────────────────────────────────────┐  │
            │  │         PHASE 2: CORE FEATURES              │  │
            │  │                                             │  │
            │  │  #25 Voice-First   #19 Materiali   #28 Metrics│ │
            │  │  Tool Creation     Redesign       Tracking   │  │
            │  │       │               │               │      │  │
            │  └───────┼───────────────┼───────────────┼──────┘  │
            │          │               │               │         │
            │          ▼               ▼               ▼         │
            │  ┌─────────────────────────────────────────────┐  │
            │  │         PHASE 3: INTEGRATION                │  │
            │  │                                             │  │
            │  │  #27 Scheduler    Tool Canvas    E2E Tests  │  │
            │  │  & Notifications  Full UI                   │  │
            │  │                                             │  │
            │  └─────────────────────────────────────────────┘  │
            │                                                   │
            └───────────────────────────────────────────────────┘
```

---

## 🎭 RUOLI CLAUDE

| Claude | Ruolo | Stream | Focus |
|--------|-------|--------|-------|
| **CLAUDE 1** | 🎯 COORDINATORE | Orchestration | Monitora piano, verifica coerenza, aggrega risultati |
| **CLAUDE 2** | 💾 STORAGE ENGINEER | Stream A | Storage, Webcam, PDF (#22, #20, #21) |
| **CLAUDE 3** | 🔌 INFRA ENGINEER | Stream B | WebSocket, Real-time (#26) |
| **CLAUDE 4** | 🤖 AI ENGINEER | Stream C | Melissa, Voice-First, Intent (#24, #25) |

> **MAX 4 CLAUDE** - Stream D (UI/Tracking #19, #27, #28) sarà fatto in Phase 2-3 dopo le fondamenta

---

## ⚠️ REGOLE OBBLIGATORIE PER TUTTI I CLAUDE

```
1. PRIMA di iniziare: leggi TUTTO questo file + ManifestoEdu.md
2. Trova i task assegnati a te (cerca "CLAUDE X" dove X è il tuo numero)
3. Per OGNI task:
   a. Leggi i file indicati
   b. Implementa la fix
   c. Esegui TUTTI i comandi di verifica
   d. Solo se TUTTI passano, aggiorna questo file marcando ✅ DONE

4. VERIFICA OBBLIGATORIA dopo ogni task:
   npm run lint        # DEVE essere 0 errors, 0 warnings
   npm run typecheck   # DEVE compilare senza errori
   npm run build       # DEVE buildare senza errori

5. NON DIRE MAI "FATTO" SE:
   - Non hai eseguito i 3 comandi sopra
   - Anche UN SOLO warning appare
   - Non hai aggiornato questo file

6. Se trovi problemi/blocchi: CHIEDI invece di inventare soluzioni

7. Dopo aver completato: aggiorna la sezione EXECUTION TRACKER con ✅

8. CONFLITTI GIT: Se ci sono conflitti, risolvi mantenendo ENTRAMBE le modifiche
```

---

## 🎯 EXECUTION TRACKER

### Phase 0: Foundation — 0/4

| Status | ID | Task | Assignee | GitHub | Files | Est |
|:------:|-----|------|----------|--------|-------|-----|
| ⬜ | T-01 | Storage ADR Decision | **CLAUDE 2** | #22 | `docs/adr/` | 1h |
| ⬜ | T-02 | Webcam Quick Win | **CLAUDE 2** | #20 | `src/components/tools/webcam-capture.tsx` | 2h |
| ⬜ | T-03 | WebSocket Server Setup | **CLAUDE 3** | #26 | `src/server/`, `src/lib/websocket/` | 3h |
| ⬜ | T-04 | Melissa Character Design | **CLAUDE 4** | #24 | `src/data/support-teachers.ts` | 2h |

### Phase 1: Infrastructure — 0/6

| Status | ID | Task | Assignee | GitHub | Files | Est |
|:------:|-----|------|----------|--------|-------|-----|
| ⬜ | T-05 | PDF Processing API | **CLAUDE 2** | #21 | `src/app/api/materials/`, `src/lib/pdf/` | 3h |
| ⬜ | T-06 | Storage Service Impl | **CLAUDE 2** | #22 | `src/lib/storage/` | 2h |
| ⬜ | T-07 | Real-time Tool State | **CLAUDE 3** | #26 | `src/lib/websocket/tool-state.ts` | 3h |
| ⬜ | T-08 | Tool Canvas Component | **CLAUDE 3** | #26 | `src/components/tools/tool-canvas.tsx` | 4h |
| ⬜ | T-09 | Melissa System Prompt | **CLAUDE 4** | #24 | `src/data/support-teachers.ts` | 2h |
| ⬜ | T-10 | Intent Detection System | **CLAUDE 4** | #24 | `src/lib/ai/intent-detection.ts` | 3h |

### Phase 2: Core Features — 0/6

| Status | ID | Task | Assignee | GitHub | Files | Est |
|:------:|-----|------|----------|--------|-------|-----|
| ⬜ | T-11 | Voice Tool Commands | **CLAUDE 4** | #25 | `src/lib/voice/tool-commands.ts` | 3h |
| ⬜ | T-12 | Materiali Conversation UI | **CLAUDE 3** | #19 | `src/components/education/materials-view.tsx` | 4h |
| ⬜ | T-13 | Method Progress Store | **CLAUDE 2** | #28 | `src/lib/stores/method-store.ts` | 2h |
| ⬜ | T-14 | Autonomy Metrics API | **CLAUDE 2** | #28 | `src/app/api/progress/autonomy/` | 2h |
| ⬜ | T-15 | Maestro Routing | **CLAUDE 4** | #24 | `src/lib/ai/maestro-routing.ts` | 2h |
| ⬜ | T-16 | Mind Map Real-time | **CLAUDE 3** | #26 | `src/components/tools/mind-map-live.tsx` | 4h |

### Phase 3: Integration — 0/5

| Status | ID | Task | Assignee | GitHub | Files | Est |
|:------:|-----|------|----------|--------|-------|-----|
| ⬜ | T-17 | Scheduler Service | **CLAUDE 2** | #27 | `src/lib/scheduler/` | 3h |
| ⬜ | T-18 | Notification System | **CLAUDE 2** | #27 | `src/lib/notifications/` | 2h |
| ⬜ | T-19 | Full Conversation Flow | **CLAUDE 4** | #23 | Integration | 3h |
| ⬜ | T-20 | E2E Tests | **CLAUDE 3** | All | `e2e/conversation-first.spec.ts` | 3h |
| ⬜ | T-21 | Documentation Update | **CLAUDE 1** | All | `README.md`, `CLAUDE.md` | 2h |

---

## 📋 TASK DETTAGLIATI PER CLAUDE

---

## CLAUDE 1: COORDINATORE

### Responsabilità
1. **Monitoraggio Piano**: Controlla periodicamente questo file per aggiornamenti
2. **Verifica Coerenza**: Assicurati che lint/typecheck/build passino sempre
3. **Review Integrazioni**: Quando stream si incontrano, verifica compatibilità
4. **Aggregazione**: Quando tutti i task sono ✅, prepara merge/PR
5. **T-21**: Aggiornamento documentazione finale

### Comandi di Monitoraggio
```bash
# Check build status
npm run lint && npm run typecheck && npm run build

# Check git status
git status
git fetch && git log HEAD..origin/main --oneline

# Monitor file changes across streams
git diff --stat
```

### Checkpoints di Coordinamento
- [ ] Fine Phase 0: Verifica che tutti e 4 task foundation siano ✅
- [ ] Fine Phase 1: Verifica integrazione WebSocket + Storage
- [ ] Fine Phase 2: Test end-to-end del conversation flow
- [ ] Fine Phase 3: Full regression test

---

## CLAUDE 2: STORAGE ENGINEER

### Stream A: Storage, Webcam, PDF, Scheduler

### T-01: Storage ADR Decision

#### Obiettivo
Creare Architecture Decision Record per strategia storage materiali

#### File da creare
```bash
mkdir -p docs/adr
touch docs/adr/0001-materials-storage-strategy.md
```

#### Decisione da documentare
Opzioni:
1. **Local File System** (MVP) - Semplicissimo, no cloud needed
2. **Azure Blob Storage** - Già abbiamo Azure per OpenAI
3. **S3-compatible** - Più flessibile, può essere locale (MinIO)

**Recommendation**: Start with local + abstract interface, add cloud later.

#### Template ADR
```markdown
# ADR 0001: Materials Storage Strategy

## Status
Accepted

## Context
ConvergioEdu needs to store student materials (photos, PDFs, generated tools).
Current: No storage strategy. Files are base64 in memory only.

## Decision
[Document chosen approach]

## Consequences
[Positive and negative implications]
```

#### Verifica
```bash
cat docs/adr/0001-materials-storage-strategy.md
npm run lint && npm run typecheck
```

---

### T-02: Webcam Quick Win (Issue #20)

#### Obiettivo
Migliorare webcam module: Continuity Camera, mirror mode, better fallbacks

#### File da leggere
```bash
cat src/components/tools/webcam-capture.tsx
```

#### Azioni richieste
1. Add `facingMode` support for front/back camera switching
2. Add mirror mode toggle (default ON for front camera)
3. Improve Continuity Camera detection (check for "iPhone" in device label)
4. Add camera resolution options (720p, 1080p, auto)
5. Better error messages in Italian

#### Esempio implementazione
```typescript
// Add to WebcamCaptureProps
interface WebcamCaptureProps {
  // ... existing
  mirrorMode?: boolean;
  preferredResolution?: '720p' | '1080p' | 'auto';
}

// Continuity Camera detection
const isContinuityCamera = (device: MediaDeviceInfo) =>
  device.label.toLowerCase().includes('iphone') ||
  device.label.toLowerCase().includes('continuity');
```

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-05: PDF Processing API (Issue #21)

#### Obiettivo
API per upload e processing PDF con estrazione testo

#### File da creare
```
src/app/api/materials/upload/route.ts
src/app/api/materials/process/route.ts
src/lib/pdf/extractor.ts
```

#### Dipendenze
```bash
npm install pdf-parse
```

#### Implementazione
```typescript
// src/lib/pdf/extractor.ts
import pdf from 'pdf-parse';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text;
}

export async function extractPagesFromPDF(buffer: Buffer): Promise<string[]> {
  const data = await pdf(buffer);
  // Split by page markers or use numpages
  return splitIntoPages(data.text, data.numpages);
}
```

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-06: Storage Service Implementation

#### Obiettivo
Implementare storage service astratto (basato su ADR T-01)

#### File da creare
```
src/lib/storage/index.ts
src/lib/storage/local-storage.ts
src/lib/storage/types.ts
```

#### Interface
```typescript
// src/lib/storage/types.ts
export interface StorageService {
  save(key: string, data: Buffer, metadata?: Record<string, string>): Promise<string>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
}

export interface MaterialMetadata {
  type: 'photo' | 'pdf' | 'tool';
  createdAt: Date;
  studentId?: string;
  subject?: string;
}
```

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-13: Method Progress Store (Issue #28)

#### Obiettivo
Zustand store per tracking autonomia studente

#### File da creare
```
src/lib/stores/method-store.ts
```

#### Metriche da tracciare
```typescript
interface MethodProgress {
  // Autonomia
  sessionsInitiatedAlone: number;
  toolsCreatedWithoutHelp: number;
  correctMaestroChoices: number;

  // Metodo
  studyTechniquesUsed: string[];
  techniqueEffectiveness: Record<string, number>;

  // Melissa/Davide dependency
  melissaInteractions: number;
  melissaDependencyTrend: number[]; // Should decrease over time

  // Timestamps
  lastStudySession: Date;
  studyStreak: number;
}
```

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-14: Autonomy Metrics API

#### File da creare
```
src/app/api/progress/autonomy/route.ts
```

#### Endpoints
- `GET /api/progress/autonomy` - Get current autonomy metrics
- `POST /api/progress/autonomy/event` - Record autonomy event

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-17 & T-18: Scheduler & Notifications (Issue #27)

#### File da creare
```
src/lib/scheduler/index.ts
src/lib/scheduler/study-planner.ts
src/lib/notifications/index.ts
src/lib/notifications/push-service.ts
```

#### Funzionalità
- Smart study reminders based on FSRS review schedule
- Break reminders (Pomodoro-style, configurable)
- Streak preservation alerts
- Weekly progress summaries

---

## CLAUDE 3: INFRA ENGINEER

### Stream B: WebSocket, Real-time, Tool Canvas

### T-03: WebSocket Server Setup (Issue #26)

#### Obiettivo
WebSocket server per real-time tool building

#### Approccio
Next.js 14+ non supporta WebSocket nativamente. Opzioni:
1. **Socket.io con custom server** - Più setup ma più potente
2. **Pusher/Ably** - Managed service, simpler
3. **Server-Sent Events (SSE)** - Simpler, one-way only

**Recommendation**: SSE per MVP (unidirezionale è sufficiente per tool updates)

#### File da creare
```
src/app/api/tools/stream/route.ts  # SSE endpoint
src/lib/realtime/tool-stream.ts    # Client-side consumer
```

#### SSE Implementation
```typescript
// src/app/api/tools/stream/route.ts
export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send tool updates as SSE events
      const sendUpdate = (data: ToolUpdate) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Subscribe to tool updates for this session
      // ...
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-07: Real-time Tool State

#### Obiettivo
State management per tool che si costruisce in tempo reale

#### File da creare
```
src/lib/realtime/tool-state.ts
src/lib/realtime/types.ts
```

#### State Structure
```typescript
// src/lib/realtime/types.ts
export type ToolType = 'mindmap' | 'quiz' | 'flashcards' | 'timeline';

export interface ToolNode {
  id: string;
  type: 'root' | 'branch' | 'leaf';
  content: string;
  children?: ToolNode[];
  metadata?: Record<string, unknown>;
}

export interface LiveTool {
  id: string;
  type: ToolType;
  nodes: ToolNode[];
  createdAt: Date;
  updatedAt: Date;
  conversationId: string;
  maestroId?: string;
}

export interface ToolUpdate {
  toolId: string;
  action: 'add' | 'update' | 'delete' | 'move';
  nodeId?: string;
  data: Partial<ToolNode>;
  timestamp: Date;
}
```

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-08: Tool Canvas Component

#### Obiettivo
Canvas React component che renderizza tool in tempo reale

#### File da creare
```
src/components/tools/tool-canvas.tsx
src/components/tools/canvas/mind-map-renderer.tsx
src/components/tools/canvas/quiz-renderer.tsx
```

#### Layout (from ManifestoEdu)
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│               TOOL CANVAS (80%)                      │
│               Growing in real-time                   │
│                                                      │
│                                             ┌──────┐ │
│                                             │ 👨‍🏫 │ │
│                                             │ PiP  │ │
│                                             └──────┘ │
└──────────────────────────────────────────────────────┘
```

#### Component Structure
```typescript
interface ToolCanvasProps {
  tool: LiveTool;
  maestro?: Maestro;
  onNodeClick?: (nodeId: string) => void;
  onAddNode?: (parentId: string, content: string) => void;
}

export function ToolCanvas({ tool, maestro, onNodeClick, onAddNode }: ToolCanvasProps) {
  return (
    <div className="relative w-full h-full">
      {/* Tool visualization - 80% of screen */}
      <div className="absolute inset-0 pr-24">
        {tool.type === 'mindmap' && <MindMapRenderer nodes={tool.nodes} />}
        {tool.type === 'quiz' && <QuizRenderer nodes={tool.nodes} />}
        {/* ... other renderers */}
      </div>

      {/* Maestro PiP - bottom right corner */}
      {maestro && (
        <div className="absolute bottom-4 right-4 w-20 h-20 rounded-full overflow-hidden shadow-lg">
          <MaestroPiP maestro={maestro} />
        </div>
      )}
    </div>
  );
}
```

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-12: Materiali Conversation UI (Issue #19)

#### Obiettivo
Nuova view Materiali conversation-first

#### File da modificare
```
src/components/education/homework-help-view.tsx → materials-view.tsx
```

#### Approccio
Invece di form "Carica foto" → "Analizza" → "Steps":

1. Conversazione aperta con Melissa
2. "Ho una foto di un esercizio" → Melissa apre webcam
3. "Mi serve una mappa sulla Liguria" → Melissa detecta Geography → Marco Polo
4. Tool si costruisce mentre parlano

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-16: Mind Map Real-time

#### Obiettivo
Mind map che cresce in tempo reale durante conversazione

#### File da creare
```
src/components/tools/mind-map-live.tsx
```

#### Libreria consigliata
`react-flow` o custom SVG implementation

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-20: E2E Tests

#### File da creare
```
e2e/conversation-first.spec.ts
```

#### Test scenarios
1. Start conversation with Melissa
2. Ask for help with geography
3. Verify Maestro routing to Marco Polo
4. Create mind map via voice command
5. Verify tool updates in real-time

---

## CLAUDE 4: AI ENGINEER

### Stream C: Melissa/Davide, Voice-First, Intent Detection

### T-04: Melissa Character Design (Issue #24)

#### Obiettivo
Design Melissa e Davide come Learning Coach characters

#### File da creare
```
src/data/support-teachers.ts
```

#### Character Structure
```typescript
export interface SupportTeacher {
  id: 'melissa' | 'davide';
  name: string;
  gender: 'female' | 'male';
  personality: string;
  voiceInstructions: string;
  systemPrompt: string;
  greeting: string;
  avatar: string;
}

export const MELISSA: SupportTeacher = {
  id: 'melissa',
  name: 'Melissa',
  gender: 'female',
  personality: 'Giovane, intelligente, allegra, paziente, incoraggiante',
  voiceInstructions: `
    Parla come una giovane insegnante di sostegno entusiasta.
    Tono: amichevole, mai dall'alto in basso.
    Usa "noi" invece di "tu devi".
    Celebra ogni progresso, anche piccolo.
    Fai domande invece di dare risposte.
  `,
  systemPrompt: `
    Sei Melissa, docente di sostegno virtuale per ConvergioEdu.

    IL TUO OBIETTIVO PRIMARIO: Sviluppare l'AUTONOMIA dello studente.

    NON fare le cose per lo studente. INSEGNA IL METODO.

    Quando lo studente chiede aiuto:
    1. Capisci cosa sta cercando di fare
    2. Identifica la materia e suggerisci il Maestro appropriato
    3. Guida lo studente a creare LUI/LEI lo strumento
    4. Celebra i progressi

    Fai domande maieutiche:
    - "Come pensi di organizzare queste informazioni?"
    - "Quale Maestro potrebbe aiutarti con questo argomento?"
    - "La prossima volta, prova a partire da qui..."

    SEI un coach, NON un servitore.
  `,
  greeting: 'Ciao! Sono Melissa, la tua insegnante di sostegno. Come posso aiutarti oggi a imparare qualcosa di nuovo?',
  avatar: '/avatars/melissa.png'
};

export const DAVIDE: SupportTeacher = {
  id: 'davide',
  name: 'Davide',
  gender: 'male',
  personality: 'Calmo, rassicurante, strutturato, supportivo',
  // ... similar structure
};
```

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-09: Melissa System Prompt Enhancement

#### Obiettivo
System prompt completo con routing e autonomy focus

#### Aggiungere al system prompt
```typescript
const MELISSA_ROUTING_PROMPT = `
ROUTING AI MAESTRI:

Quando lo studente menziona un argomento, identifica la materia:

| Trigger Keywords | Materia | Maestro |
|-----------------|---------|---------|
| numeri, calcolo, equazioni, geometria | Matematica | Archimede o Pitagora |
| regioni, capitali, mappe, paesi | Geografia | Marco Polo |
| storia, guerre, civiltà, date | Storia | Cleopatra |
| italiano, grammatica, poesia, letteratura | Italiano | Dante Alighieri |
| fisica, forze, movimento, energia | Fisica | Galileo o Einstein |
| arte, pittura, scultura, disegno | Arte | Leonardo o Frida Kahlo |
| musica, note, strumenti, composizione | Musica | Mozart |
| inglese, english, traduzione | Inglese | Ada Lovelace |
| biologia, animali, piante, corpo | Scienze | Darwin o Marie Curie |
| informatica, coding, computer, algoritmi | Informatica | Turing o Ada Lovelace |
| filosofia, pensiero, etica | Filosofia | Socrate |
| metodo di studio, organizzazione | Metodo | Maria Montessori |

PRIMA di passare al Maestro, chiedi allo studente:
"Per questo argomento potrebbe aiutarti [MAESTRO]. Vuoi che lo chiami?"

OBIETTIVO: Far scegliere LO STUDENTE, non decidere tu.
`;
```

---

### T-10: Intent Detection System

#### Obiettivo
Sistema per riconoscere intent dallo speech/text dello studente

#### File da creare
```
src/lib/ai/intent-detection.ts
```

#### Intent Types
```typescript
export type IntentType =
  | 'create_tool'      // "Fammi una mappa mentale"
  | 'ask_help'         // "Non capisco questo problema"
  | 'request_maestro'  // "Posso parlare con Leonardo?"
  | 'upload_material'  // "Ho una foto da farti vedere"
  | 'review_flashcards' // "Voglio ripassare"
  | 'take_quiz'        // "Fammi delle domande"
  | 'general_chat'     // Conversazione generica
  | 'technical_support'; // "Non funziona..."

export interface DetectedIntent {
  type: IntentType;
  confidence: number;
  entities: {
    subject?: string;
    maestro?: string;
    toolType?: ToolType;
    materialType?: 'photo' | 'pdf';
  };
  suggestedAction: string;
}

export async function detectIntent(
  message: string,
  conversationContext?: Message[]
): Promise<DetectedIntent> {
  // Use AI to classify intent
  // Return structured intent with confidence
}
```

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-11: Voice Tool Commands (Issue #25)

#### Obiettivo
Comandi vocali per costruire tool

#### File da creare
```
src/lib/voice/tool-commands.ts
```

#### Comandi supportati
```typescript
export const VOICE_COMMANDS = {
  // Mind Map
  'aggiungi ramo': (content: string) => addBranch(content),
  'nuovo nodo': (content: string) => addNode(content),
  'collega': (from: string, to: string) => connectNodes(from, to),
  'elimina': (nodeId: string) => deleteNode(nodeId),

  // Quiz
  'nuova domanda': (question: string) => addQuestion(question),
  'risposta giusta': (answer: string) => setCorrectAnswer(answer),
  'risposta sbagliata': (answer: string) => addWrongAnswer(answer),

  // Flashcard
  'nuova carta': () => createFlashcard(),
  'fronte': (content: string) => setFront(content),
  'retro': (content: string) => setBack(content),

  // Navigation
  'annulla': () => undo(),
  'conferma': () => confirm(),
  'fatto': () => finishTool(),
};
```

#### Verifica
```bash
npm run lint && npm run typecheck && npm run build
```

---

### T-15: Maestro Routing

#### Obiettivo
Implementare routing automatico studente → Maestro appropriato

#### File da creare
```
src/lib/ai/maestro-routing.ts
```

#### Implementation
```typescript
import { MAESTRI } from '@/data/maestri-full';
import { detectIntent } from './intent-detection';

export interface RoutingResult {
  suggestedMaestro: Maestro | null;
  confidence: number;
  reason: string;
  alternativeMaestri: Maestro[];
}

export async function routeToMaestro(
  studentMessage: string,
  context?: ConversationContext
): Promise<RoutingResult> {
  const intent = await detectIntent(studentMessage, context?.messages);

  if (!intent.entities.subject) {
    return {
      suggestedMaestro: null,
      confidence: 0,
      reason: 'Non ho capito la materia. Di cosa vorresti parlare?',
      alternativeMaestri: []
    };
  }

  const maestro = findMaestroBySubject(intent.entities.subject);
  const alternatives = findAlternativeMaestri(intent.entities.subject);

  return {
    suggestedMaestro: maestro,
    confidence: intent.confidence,
    reason: `Per ${intent.entities.subject}, ti consiglio ${maestro.name}!`,
    alternativeMaestri: alternatives
  };
}
```

---

### T-19: Full Conversation Flow Integration

#### Obiettivo
Integrare tutti i componenti in un flow completo

#### Sequence
```
1. Student opens app → Melissa greets
2. Student: "Ho bisogno di aiuto con la geografia"
3. Melissa detects: subject=geography, intent=ask_help
4. Melissa: "Per la geografia, Marco Polo è perfetto! Lo chiamo?"
5. Student: "Sì"
6. Marco Polo joins, Melissa steps back
7. Student: "Devo fare una mappa sulla Liguria"
8. Marco Polo: "Ottimo! Partiamo dal centro: cosa metti come nodo principale?"
9. Tool canvas shows mind map growing in real-time
10. Student builds map with voice commands
11. Marco Polo celebrates completion
12. Melissa returns: "Bravo! La prossima volta prova a iniziare tu!"
```

---

## 📊 PROGRESS SUMMARY

| Phase | Done | Total | Status | Dependencies |
|-------|:----:|:-----:|--------|--------------|
| Phase 0: Foundation | 0 | 4 | ⬜ | None |
| Phase 1: Infrastructure | 0 | 6 | ⬜ | Phase 0 |
| Phase 2: Core Features | 0 | 6 | ⬜ | Phase 1 |
| Phase 3: Integration | 0 | 5 | ⬜ | Phase 2 |
| **TOTAL** | **0** | **21** | **0%** | |

---

## 🔀 PARALLELIZATION MATRIX

```
Phase 0:
  CLAUDE 2: T-01, T-02          ←── Can run parallel
  CLAUDE 3: T-03                ←── Can run parallel
  CLAUDE 4: T-04                ←── Can run parallel

Phase 1:
  CLAUDE 2: T-05, T-06          ←── After T-01
  CLAUDE 3: T-07, T-08          ←── After T-03
  CLAUDE 4: T-09, T-10          ←── After T-04

Phase 2:
  CLAUDE 2: T-13, T-14          ←── After T-06
  CLAUDE 3: T-12, T-16          ←── After T-08
  CLAUDE 4: T-11, T-15          ←── After T-10

Phase 3:
  CLAUDE 2: T-17, T-18          ←── After Phase 2
  CLAUDE 3: T-20                ←── After all features
  CLAUDE 4: T-19                ←── After all features
  CLAUDE 1: T-21                ←── Final
```

**Maximum Parallelism**: 3 Claude lavorano contemporaneamente (Claude 1 coordina)

---

## VERIFICATION CHECKLIST (Prima del merge finale)

```bash
# Build verification
npm run lint        # 0 errors, 0 warnings
npm run typecheck   # no errors
npm run build       # success

# E2E tests
npm run test        # All pass

# Manual verification
# - [ ] Conversation flow works end-to-end
# - [ ] Voice commands recognized
# - [ ] Tool canvas updates in real-time
# - [ ] Melissa/Davide selection works
# - [ ] Maestro routing is accurate
# - [ ] Accessibility maintained (keyboard, screen reader)
```

---

## GITHUB ISSUES CROSS-REFERENCE

| Issue | Tasks | Status |
|-------|-------|--------|
| #19 - Materiali Redesign | T-12 | ⬜ |
| #20 - Webcam Module | T-02 | ⬜ |
| #21 - PDF Processing | T-05 | ⬜ |
| #22 - Storage Architecture | T-01, T-06 | ⬜ |
| #23 - Conversation-First (Epic) | T-19 | ⬜ |
| #24 - Melissa/Davide | T-04, T-09, T-10, T-15 | ⬜ |
| #25 - Voice-First Tools | T-11 | ⬜ |
| #26 - Real-time WebSocket | T-03, T-07, T-08, T-16 | ⬜ |
| #27 - Scheduler & Notifications | T-17, T-18 | ⬜ |
| #28 - Method Progress | T-13, T-14 | ⬜ |

---

**Versione**: 1.0
**Creato**: 2025-12-29
**Ultimo aggiornamento**: 2025-12-29

# LandingShowcasePlanDec30 - Modalità Showcase Offline per Convergio Edu

**Data**: 2024-12-30
**Target**: Creare una modalità showcase che funzioni COMPLETAMENTE OFFLINE senza LLM
**Branch**: feature/demo-mode (worktree: /Users/roberdan/GitHub/ConvergioEdu-Demo)
**Metodo**: VERIFICA BRUTALE - ogni task testato prima di dichiararlo fatto

---

## 🎯 OBIETTIVO

Quando l'utente avvia Convergio Edu SENZA provider LLM configurato (né Azure OpenAI né Ollama):
1. Mostra una **Landing Page** che spiega il prodotto
2. Offre **Wizard Configurazione** per Azure/Ollama
3. Permette accesso a **Showcase Offline** con contenuti statici ma impressionanti

### Struttura URL

| Route | Descrizione |
|-------|-------------|
| `/landing` | Landing page (redirect automatico se no provider) |
| `/showcase` | Home showcase con menu navigazione |
| `/showcase/maestri` | Galleria 17 Maestri |
| `/showcase/mindmaps` | Mappe mentali pre-costruite |
| `/showcase/quiz` | Quiz di esempio |
| `/showcase/flashcards` | Flashcards di esempio |
| `/showcase/solar-system` | Demo interattiva sistema solare |
| `/showcase/chat` | Simulazione chat Coach/Buddy |

---

## 🎭 RUOLI CLAUDE

| Claude | Ruolo | Task Assegnati |
|--------|-------|----------------|
| **CLAUDE 1** | 🎯 COORDINATORE | Monitora piano, verifica coerenza, merge finale |
| **CLAUDE 2** | 👨‍💻 INFRASTRUCTURE | T-01, T-02, T-03, T-04 |
| **CLAUDE 3** | 👨‍💻 STATIC CONTENT | T-05, T-06, T-07, T-08 |
| **CLAUDE 4** | 👨‍💻 INTERACTIVE | T-09, T-10, T-11, T-12 |

---

## ⚠️ REGOLE OBBLIGATORIE PER TUTTI I CLAUDE

```
1. PRIMA di iniziare: leggi TUTTO questo file
2. Lavori nel worktree: /Users/roberdan/GitHub/ConvergioEdu-Demo
3. Trova i task assegnati a te (cerca "CLAUDE X" dove X è il tuo numero)
4. Per OGNI task:
   a. Leggi i file indicati
   b. Implementa la feature
   c. Esegui TUTTI i comandi di verifica
   d. Solo se TUTTI passano, aggiorna questo file marcando ✅ DONE

5. VERIFICA OBBLIGATORIA dopo ogni task:
   npm run lint        # DEVE essere 0 errors, 0 warnings
   npm run typecheck   # DEVE compilare senza errori
   npm run build       # DEVE buildare senza errori

6. NON DIRE MAI "FATTO" SE:
   - Non hai eseguito i 3 comandi sopra
   - Anche UN SOLO warning appare
   - Non hai aggiornato questo file

7. Se trovi problemi/blocchi: CHIEDI invece di inventare soluzioni

8. Dopo aver completato: aggiorna la sezione EXECUTION TRACKER con ✅

9. CONFLITTI GIT: Se ci sono conflitti, risolvi mantenendo ENTRAMBE le modifiche
```

---

## 🚦 PHASE GATES

| Gate | Blocking Phase | Waiting Phases | Status | Unlocked By |
|------|----------------|----------------|--------|-------------|
| GATE-1 | Phase 0 (Infrastructure) | Phase 1A, 1B, 1C | 🟢 UNLOCKED | CLAUDE 2 |

### Gate Instructions

**CLAUDE 2 (completing Phase 0)**:
Dopo che T-01, T-02, T-03, T-04 sono tutti ✅, aggiorna GATE-1 a 🟢 UNLOCKED e notifica:
```bash
kitty @ send-text --match title:Claude-3 "🟢 GATE-1 UNLOCKED! Start Phase 1B tasks now." && kitty @ send-key --match title:Claude-3 Return
kitty @ send-text --match title:Claude-4 "🟢 GATE-1 UNLOCKED! Start Phase 1C tasks now." && kitty @ send-key --match title:Claude-4 Return
```

**CLAUDE 3 e CLAUDE 4** (waiting for GATE-1):
Attendi notifica o poll ogni 5 min:
```bash
grep "GATE-1" /Users/roberdan/GitHub/ConvergioEdu-Demo/docs/plans/LandingShowcasePlanDec30.md | grep -q "🟢 UNLOCKED"
```

---

## 🎯 EXECUTION TRACKER

### Phase 0: Infrastructure — 4/4 ✅ COMPLETE

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ✅ | T-01 | Creare utility `hasAnyProvider()` | **CLAUDE 2** | `src/lib/ai/provider-check.ts` | Export function per client |
| ✅ | T-02 | Creare middleware redirect | **CLAUDE 2** | `src/middleware.ts` | Redirect a /landing se no provider |
| ✅ | T-03 | Creare layout showcase | **CLAUDE 2** | `src/app/showcase/layout.tsx` | Con banner "Showcase Mode" |
| ✅ | T-04 | Creare landing page base | **CLAUDE 2** | `src/app/landing/page.tsx` | Hero + links |

### Phase 1A: Landing Page — 2/2 ✅ COMPLETE

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ✅ | T-05 | Wizard configurazione Azure | **CLAUDE 2** | `src/app/landing/page.tsx` | Incluso in T-04 |
| ✅ | T-06 | Wizard configurazione Ollama | **CLAUDE 2** | `src/app/landing/page.tsx` | Incluso in T-04 |

### Phase 1B: Static Showcase Content — 4/4 ✅ COMPLETE

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ✅ | T-07 | Showcase home page | **CLAUDE 3** | `src/app/showcase/page.tsx` | Menu navigazione |
| ✅ | T-08 | Galleria Maestri showcase | **CLAUDE 3** | `src/app/showcase/maestri/page.tsx` | 17 maestri, no interazione |
| ✅ | T-09 | Mappe mentali pre-costruite | **CLAUDE 3** | `src/app/showcase/mindmaps/page.tsx` | 2-3 mappe statiche belle |
| ✅ | T-10 | Quiz di esempio | **CLAUDE 3** | `src/app/showcase/quiz/page.tsx` | 10 domande statiche |

### Phase 1C: Interactive Showcases — 4/4 ✅ COMPLETE

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ✅ | T-11 | Flashcards esempio | **CLAUDE 4** | `src/app/showcase/flashcards/page.tsx` | 10 cards FSRS simulate |
| ✅ | T-12 | Sistema Solare interattivo | **CLAUDE 4** | `src/app/showcase/solar-system/page.tsx` | Canvas/SVG animato BELLO |
| ✅ | T-13 | Chat simulata Coach/Buddy | **CLAUDE 4** | `src/app/showcase/chat/page.tsx` | Messaggi pre-scritti animati |
| ✅ | T-14 | Componente ShowcaseBanner | **CLAUDE 4** | `src/components/showcase/banner.tsx` | Banner sticky top |

### Phase 2: Integration — 2/2 ✅ COMPLETE

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ✅ | T-15 | Test e2e showcase | **CLAUDE 1** | `e2e/showcase.spec.ts` | Verifica navigazione |
| ✅ | T-16 | Final build & PR | **CLAUDE 1** | commit 881e7fb | Build verified, commit done |

---

## 📋 TASK DETTAGLIATI PER CLAUDE

## CLAUDE 1: COORDINATORE

### Responsabilità
1. **Monitoraggio Piano**: Controlla questo file ogni 10 minuti
2. **Verifica Build**: Dopo ogni fase, esegui `npm run build`
3. **Gate Management**: Se CLAUDE 2 dimentica di sbloccare GATE-1, fallo tu
4. **Final Integration**: Task T-15, T-16

### Comandi di Monitoraggio
```bash
cd /Users/roberdan/GitHub/ConvergioEdu-Demo
npm run lint && npm run typecheck
git status
```

---

## CLAUDE 2: INFRASTRUCTURE + LANDING

### Task T-01: Creare utility `hasAnyProvider()`

#### Obiettivo
Creare una funzione che rileva se c'è ALMENO UN provider configurato (Azure O Ollama).
Deve funzionare sia server-side che client-side.

#### File da leggere PRIMA
```bash
cat /Users/roberdan/GitHub/ConvergioEdu-Demo/src/lib/ai/providers.ts
```

#### Azioni richieste
1. Creare `/src/lib/ai/provider-check.ts`
2. Esportare:
   - `hasAnyProvider()`: boolean - true se Azure O Ollama configurato
   - `getProviderStatus()`: { azure: boolean, ollama: boolean, any: boolean }
3. Per Azure: check `AZURE_OPENAI_ENDPOINT` e `AZURE_OPENAI_API_KEY`
4. Per Ollama: check `OLLAMA_URL` (default localhost:11434) - assumiamo sempre disponibile se URL impostato

#### Codice suggerito
```typescript
// src/lib/ai/provider-check.ts
export function hasAnyProvider(): boolean {
  const hasAzure = !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY);
  const hasOllama = !!process.env.OLLAMA_URL || process.env.NEXT_PUBLIC_OLLAMA_ENABLED === 'true';
  return hasAzure || hasOllama;
}

export function getProviderStatus() {
  const azure = !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY);
  const ollama = !!process.env.OLLAMA_URL || process.env.NEXT_PUBLIC_OLLAMA_ENABLED === 'true';
  return { azure, ollama, any: azure || ollama };
}
```

#### Verifica
```bash
npm run typecheck
```

---

### Task T-02: Creare middleware redirect

#### Obiettivo
Se utente accede a `/` senza provider configurato, redirect a `/landing`.
Le route `/landing`, `/showcase/*`, `/api/*`, `/_next/*` devono essere SEMPRE accessibili.

#### File da creare
`/src/middleware.ts`

#### Logica
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes che non richiedono provider
const PUBLIC_ROUTES = ['/landing', '/showcase', '/api', '/_next', '/favicon', '/icon', '/apple-icon'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check provider (via env vars - middleware runs edge, limited access)
  const hasAzure = !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY);
  const hasOllama = !!process.env.OLLAMA_URL;

  if (!hasAzure && !hasOllama) {
    return NextResponse.redirect(new URL('/landing', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

#### Verifica
```bash
npm run typecheck && npm run build
```

---

### Task T-03: Creare layout showcase

#### Obiettivo
Layout per tutte le pagine `/showcase/*` con:
- Header con logo e "Showcase Mode" badge
- Sidebar navigazione showcase
- Banner sticky "Configura un LLM per funzionalità complete"

#### File da creare
`/src/app/showcase/layout.tsx`

#### Design
- Usare stesso stile dell'app principale
- Colori: sfondo leggermente diverso (es. gradient viola/blu)
- Badge "SHOWCASE" in alto a destra
- Link "Configura LLM" sempre visibile

---

### Task T-04: Creare landing page base

#### Obiettivo
Landing page `/landing` con:
- Hero section con logo e tagline
- Sezione "Cos'è Convergio Edu" con features
- Sezione "Configura il tuo LLM"
- Link "Esplora Showcase"

#### File da creare
`/src/app/landing/page.tsx`

#### Design
- Hero: grande, impattante, animato (Framer Motion)
- Features: cards con icone dei Maestri
- CTA buttons: "Configura Azure" / "Configura Ollama" / "Esplora Showcase"

---

### Task T-05 & T-06: Wizard configurazione

#### Obiettivo
Aggiungere alla landing page due sezioni espandibili:
1. **Azure OpenAI Setup**: istruzioni passo-passo + form per testare
2. **Ollama Setup**: istruzioni installazione locale + test connessione

#### Contenuto Azure
```
1. Crea account Azure (link)
2. Crea risorsa Azure OpenAI (link)
3. Deploy modello gpt-4o
4. Copia endpoint e API key
5. Crea file .env.local con:
   AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com
   AZURE_OPENAI_API_KEY=xxx
   AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
```

#### Contenuto Ollama
```
1. Scarica Ollama (link ollama.ai)
2. Installa e avvia
3. Esegui: ollama pull llama3.2
4. Crea file .env.local con:
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2
```

---

## CLAUDE 3: STATIC SHOWCASE CONTENT

### Task T-07: Showcase home page

#### Obiettivo
Home page `/showcase` con:
- Titolo "Esplora Convergio Edu"
- Grid di cards per navigare alle varie sezioni
- Ogni card ha icona, titolo, descrizione

#### Sezioni
1. 🎓 Incontra i Maestri (17 AI tutors)
2. 🧠 Mappe Mentali (organizza le idee)
3. 📝 Quiz Interattivi (testa le conoscenze)
4. 🃏 Flashcards (memorizza con FSRS)
5. 🌍 Sistema Solare (esplora l'universo)
6. 💬 Chat Simulata (prova coach e buddy)

---

### Task T-08: Galleria Maestri showcase

#### Obiettivo
Pagina `/showcase/maestri` che mostra tutti i 17 Maestri.

#### File da leggere
```bash
cat /Users/roberdan/GitHub/ConvergioEdu-Demo/src/data/maestri-full.ts | head -200
```

#### Implementazione
- Riutilizzare `MaestroCard` esistente se possibile
- Grid responsive 4 colonne
- Click su maestro → modal con bio completa
- NO voice session (mostra messaggio "Richiede LLM")

---

### Task T-09: Mappe mentali pre-costruite

#### Obiettivo
Pagina `/showcase/mindmaps` con 2-3 mappe mentali statiche ma interattive.

#### Mappe suggerite
1. **Sistema Solare** - Sole al centro, pianeti, lune
2. **Rivoluzione Francese** - Cause, eventi, conseguenze
3. **Fotosintesi** - Processo, input, output

#### Implementazione
- Usare componente mind-map esistente se c'è
- Altrimenti: SVG/Canvas con nodi draggabili
- Zoom in/out con mouse wheel
- Design colorato e accattivante

---

### Task T-10: Quiz di esempio

#### Obiettivo
Pagina `/showcase/quiz` con quiz funzionante (domande statiche).

#### Domande (10 miste)
- 3 Storia
- 3 Scienze
- 2 Matematica
- 2 Geografia

#### Implementazione
- Riutilizzare componente Quiz esistente
- Domande hardcoded in array
- Mostra punteggio finale
- Animazioni feedback corretto/sbagliato

---

## CLAUDE 4: INTERACTIVE SHOWCASES

### Task T-11: Flashcards esempio

#### Obiettivo
Pagina `/showcase/flashcards` con 10 flashcards funzionanti.

#### Implementazione
- Riutilizzare componente Flashcard esistente
- 10 cards hardcoded (vocabolario inglese o capitali)
- Simulare algoritmo FSRS (senza persistenza)
- Flip animation, buttons Easy/Hard/Again

---

### Task T-12: Sistema Solare interattivo

#### Obiettivo
Pagina `/showcase/solar-system` con simulazione BELLISSIMA del sistema solare.

#### Requisiti
- Canvas o Three.js per rendering
- Sole al centro, luminoso, pulsante
- 8 pianeti con orbite ellittiche
- Animazione rotazione realistica (velocità scalate)
- Hover su pianeta → tooltip con info
- Click su pianeta → zoom + dettagli
- Stelle sfondo animate
- Controlli: play/pause, velocità, zoom

#### Reference design
- Stile: dark space background, glow effects
- Pianeti con texture/colori realistici
- Orbite visibili con linee tratteggiate

---

### Task T-13: Chat simulata Coach/Buddy

#### Obiettivo
Pagina `/showcase/chat` che simula una conversazione con Melissa (coach) e Mario (buddy).

#### Implementazione
- Due tab: "Coach Melissa" / "Buddy Mario"
- Messaggi pre-scritti che appaiono con animazione typing
- Utente può cliccare risposte predefinite
- Conversazione ramificata (2-3 scelte per messaggio)
- Mostra personalità dei personaggi

#### Conversazione Coach Melissa (esempio)
```
Melissa: Ciao! Sono Melissa, il tuo coach. Come posso aiutarti oggi?
[Opzioni utente]:
- "Non riesco a concentrarmi"
- "Come organizzo lo studio?"
- "Mi sento sopraffatto"

[Se "Non riesco a concentrarmi"]:
Melissa: Capisco! La concentrazione è una sfida comune. Proviamo insieme la tecnica Pomodoro: 25 minuti di studio intenso, poi 5 di pausa. Vuoi provare?
...
```

#### Conversazione Buddy Mario (esempio)
```
Mario: Ehi! Sono Mario, ho 15 anni e anche io ho la dislessia. Che succede?
[Opzioni utente]:
- "Mi sento solo a scuola"
- "I compiti mi stressano"
- "Non capisco matematica"

[Se "Mi sento solo"]:
Mario: Ti capisco, è dura... Anch'io mi sentivo così. Ma sai cosa? Abbiamo tutti qualcosa di speciale. Tu cosa ti piace fare?
...
```

---

### Task T-14: Componente ShowcaseBanner

#### Obiettivo
Banner riutilizzabile che appare in tutte le pagine showcase.

#### Design
- Sticky top, sotto header
- Background gradient (amber/yellow)
- Testo: "🎭 Modalità Showcase - Configura un LLM per le funzionalità complete"
- Button: "Configura ora" → link a /landing
- Dismissable (con X) ma riappare su ogni pagina

#### File da creare
`/src/components/showcase/banner.tsx`

---

## 📊 PROGRESS SUMMARY

| Phase | Done | Total | Status |
|-------|:----:|:-----:|--------|
| Phase 0: Infrastructure | 4 | 4 | ✅ COMPLETE |
| Phase 1A: Landing | 2 | 2 | ✅ COMPLETE |
| Phase 1B: Static Content | 4 | 4 | ✅ COMPLETE |
| Phase 1C: Interactive | 4 | 4 | ✅ COMPLETE |
| Phase 2: Integration | 2 | 2 | ✅ COMPLETE |
| **TOTAL** | **16** | **16** | **100%** 🎉 |

---

## GIT WORKFLOW

### Worktrees (CLAUDE 1 crea all'inizio)

```bash
cd /Users/roberdan/GitHub/ConvergioEdu-Demo

# Tutti lavorano nello stesso worktree per semplicità
# MA su file DIVERSI per evitare conflitti!
```

### Mapping File → Claude

| Claude | Files Esclusivi |
|--------|-----------------|
| CLAUDE 2 | `src/middleware.ts`, `src/lib/ai/provider-check.ts`, `src/app/landing/*`, `src/app/showcase/layout.tsx` |
| CLAUDE 3 | `src/app/showcase/page.tsx`, `src/app/showcase/maestri/*`, `src/app/showcase/mindmaps/*`, `src/app/showcase/quiz/*` |
| CLAUDE 4 | `src/app/showcase/flashcards/*`, `src/app/showcase/solar-system/*`, `src/app/showcase/chat/*`, `src/components/showcase/*` |

### Commit Convention
```bash
git add [tuoi file]
git commit -m "feat(showcase): T-XX - [descrizione]

🤖 Generated with Claude Code"
```

---

## VERIFICATION CHECKLIST (Prima del merge)

```bash
cd /Users/roberdan/GitHub/ConvergioEdu-Demo
npm run lint        # 0 errors, 0 warnings
npm run typecheck   # no errors
npm run build       # success
```

---

**Versione**: 1.0
**Ultimo aggiornamento**: 2024-12-30

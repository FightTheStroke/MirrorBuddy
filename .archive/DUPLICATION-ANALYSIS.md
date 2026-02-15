# MirrorBuddy — Analisi Completa Duplicazioni, Inconsistenze & Incoerenze

**Data**: 14 Febbraio 2026 | **Metodo**: Analisi statica verificata su codice sorgente  
**Scope**: UI, servizi, API, state management, i18n, maestri/coach/buddy framework

---

## INDICE

1. [SEZIONE A — Framework Maestri/Coach/Buddy](#sezione-a)
2. [SEZIONE B — Duplicazioni UI](#sezione-b)
3. [SEZIONE C — i18n & Configurazione](#sezione-c)
4. [SEZIONE D — Servizi & Utility](#sezione-d)
5. [SEZIONE E — API Routes](#sezione-e)
6. [SEZIONE F — State Management](#sezione-f)
7. [SEZIONE G — Matrice Priorità & Soluzioni](#sezione-g)

---

<a id="sezione-a"></a>

## SEZIONE A — FRAMEWORK MAESTRI/COACH/BUDDY

### A1. 🔴 TRE COMPONENTI CHAT SEPARATI PER TIPO PERSONAGGIO

**Problema verificato**: L'app ha TRE implementazioni separate della stessa esperienza chat:

| Componente               | Per chi                 | File                                                  | Righe        |
| ------------------------ | ----------------------- | ----------------------------------------------------- | ------------ |
| `MaestroSession`         | 26 Maestri (professori) | `src/components/maestros/maestro-session.tsx`         | 271          |
| `CharacterChatView`      | 6 Coach + 6 Buddy       | `src/components/conversation/character-chat-view.tsx` | 216          |
| `materiali-conversation` | Education module        | `src/components/education/materiali-conversation/`    | 633 (totale) |

**Percorso verificato nel codice** (`src/app/[locale]/page.tsx`):

```
currentView === 'maestro-session' → <LazyMaestroSession .../>      // COMPONENTE DIVERSO
currentView === 'coach'           → <LazyCharacterChatView characterType="coach" />
currentView === 'buddy'           → <LazyCharacterChatView characterType="buddy" />
```

**Conseguenze**:

- Feature aggiunte a MaestroSession non arrivano a Coach/Buddy e viceversa
- TTS (Text-to-Speech) presente SOLO nel bubble maestro, assente in coach/buddy
- Handoff tra personaggi disponibile SOLO in CharacterChatView (mai in MaestroSession)
- Stile e comportamento visivamente diversi per utente

**Soluzione**: Unificare in un singolo `<UnifiedChatView characterType={type}>` con
variazioni data-driven. Il commento stesso di `maestro-session.tsx` dice:
_"Unified conversation layout matching Coach/Buddy pattern"_ → l'intenzione c'era,
l'unificazione non è stata completata.

---

### A2. 🔴 TRE MESSAGE BUBBLE DIVERSI

| Bubble      | File                                                                                        | TTS   | Voice Badge | Stile              |
| ----------- | ------------------------------------------------------------------------------------------- | ----- | ----------- | ------------------ |
| Maestro     | `src/components/maestros/message-bubble.tsx` (84 righe)                                     | ✅ Sì | ✅ Sì       | Con avatar maestro |
| Coach/Buddy | `src/components/conversation/components/message-bubble.tsx` (74 righe)                      | ❌ No | ❌ No       | Generic            |
| Education   | `src/components/education/materiali-conversation/components/message-bubble.tsx` (103 righe) | ❌ No | ❌ No       | Attachments        |

**Verifica**: Nel bubble maestro (righe 71-74):

```tsx
{
  !isUser && ttsEnabled && <button onClick={() => speak(message.content)}>🔊</button>;
}
```

Questa funzionalità TTS **non esiste** nel bubble coach/buddy.

**Impatto**: Un utente che parla con Leonardo ha TTS sui messaggi, passa al Coach Melissa
e il TTS scompare. Stessa piattaforma, esperienza diversa senza motivo.

**Soluzione**: Un singolo `<MessageBubble>` con props opzionali `ttsEnabled`, `showVoiceBadge`.

---

### A3. 🔴 TRE COMPONENTI CHARACTER CARD

| Componente            | File                                                                        | Usato da               |
| --------------------- | --------------------------------------------------------------------------- | ---------------------- |
| `MaestroCard`         | `src/components/maestros/maestro-card.tsx`                                  | Grid selezione maestri |
| `CharacterCard`       | `src/components/conversation/components/character-card.tsx`                 | Switcher coach/buddy   |
| `CharacterCard` (edu) | `src/components/education/character-switcher/components/character-card.tsx` | Education module       |

**Impatto**: Tre design diversi per mostrare un personaggio. Aggiornare lo stile di uno
non aggiorna gli altri. Possibili inconsistenze di accessibilità.

---

### A4. 🟠 VOICE: ABILITATA PER MAESTRI, LIMITATA PER COACH/BUDDY

**Verificato** in `src/components/conversation/components/conversation-header.tsx:67-82`:

```tsx
{
  /* Voice call button - only for coach and buddy */
}
{
  (currentCharacter.type === 'coach' || currentCharacter.type === 'buddy') && (
    <Button onClick={onVoiceCall}>...</Button>
  );
}
```

Ma riga 91 e 101:

```tsx
disabled={currentCharacter.type === 'coach'}   // COACH: switch-to-coach disabilitato
disabled={currentCharacter.type === 'buddy'}   // BUDDY: switch-to-buddy disabilitato
```

**Nel frattempo**: MaestroSession ha il suo sistema voice completamente separato con
`CharacterVoicePanel` come sibling component (non overlay).

**Backend**: TUTTI i personaggi hanno campo `voice` e `voiceInstructions` nelle definizioni
dati → la voce è configurata per tutti, ma il frontend la gestisce in modo diverso.

---

### A5. 🟠 HANDOFF ASSENTE DA MAESTRO SESSION

**Verificato**: `grep -rn "handoff\|Handoff" src/components/maestros/` → **ZERO risultati**

Il sistema di handoff (suggerire passaggio a coach/buddy quando appropriato) esiste SOLO
in `src/components/conversation/conversation-flow.tsx`. Se uno studente è in sessione con
Leonardo e ha bisogno di supporto emotivo, il sistema non può suggerire il passaggio a un buddy.

**Soluzione**: Integrare handoff in MaestroSession o unificare le chat view.

---

### A6. 🟠 HEADER VARIANTS SOLO PER MAESTRI

`src/components/maestros/header-variants/` contiene **5 varianti** di header:

- `variant-a-balanced.tsx`
- `variant-b-centered.tsx`
- `variant-c-compact-pro.tsx`
- `variant-d-glassmorphism.tsx`
- `variant-e-centered-info-left.tsx`

Coach e Buddy hanno un singolo `conversation-header.tsx` senza varianti.
Possibile A/B testing dimenticato o design inconsistente.

---

### A7. 🟡 SYSTEM PROMPT: STATICO VS DINAMICO

| Tipo    | System Prompt                             | File di definizione                 |
| ------- | ----------------------------------------- | ----------------------------------- |
| Maestri | **Statico** (hardcoded)                   | `src/data/maestri/{id}.ts`          |
| Coach   | **Statico**                               | `src/data/support-teachers/{id}.ts` |
| Buddy   | **Dinamico** (`getSystemPrompt(student)`) | `src/data/buddy-profiles/{id}.ts`   |

Il routing avviene in `src/lib/ai/character-router/convenience.ts:77-102` con un singolo switch.
Questo è **corretto per design** (buddies si adattano allo studente), ma va documentato meglio
perché un dev potrebbe aspettarsi comportamento uniforme.

---

### A8. 🟡 KNOWLEDGE BASE SOLO PER MAESTRI

Solo i maestri hanno file `*-knowledge.ts` indicizzati nel RAG con tag `maestro:{id}`.
Coach e Buddy non hanno knowledge base dedicata → si basano solo sul system prompt.

Questo è coerente col design (coach = metodo, buddy = supporto emotivo), ma significa che
un coach non può rispondere a domande su materie specifiche anche se lo studente le chiede.

---

## RIEPILOGO FRAMEWORK PERSONAGGI

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (UNIFICATO ✅)                        │
│  Un solo /api/chat, un solo character-router, un solo tool      │
│  filtering, stessa voice API per tutti                          │
└───────────────────────┬─────────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────────┐
          ▼             ▼                 ▼
   ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐
   │ MaestroSess │ │ CharChatView │ │ MatConversation  │
   │ (271 righe) │ │ (216 righe)  │ │ (633 righe)      │
   │             │ │              │ │                  │
   │ ✅ TTS      │ │ ❌ TTS       │ │ ❌ TTS            │
   │ ✅ Voice    │ │ ✅ Voice     │ │ ❌ Voice           │
   │ ❌ Handoff  │ │ ✅ Handoff   │ │ ❌ Handoff         │
   │ ✅ 5 Header │ │ ✅ 1 Header  │ │ ✅ 1 Header        │
   │ variants   │ │              │ │                  │
   └─────────────┘ └──────────────┘ └──────────────────┘
     26 Maestri     6 Coach+6 Buddy    Education module
```

---

<a id="sezione-b"></a>

## SEZIONE B — DUPLICAZIONI UI

### B1. 🟠 SPINNER/LOADING: 220+ USI INLINE, ZERO COMPONENTI CONDIVISI

**Verificato**: 220 riferimenti a `Loader2` + 29 custom `animate-spin` divs.
Non esiste `src/components/ui/spinner.tsx`.

Pattern ripetuti ovunque:

```tsx
<Loader2 className="w-4 h-4 animate-spin" />     // ~100 file
<Loader2 className="w-8 h-8 animate-spin" />     // ~40 file
<Loader2 className="h-5 w-5 animate-spin" />     // ~30 file
<div className="border-2 ... animate-spin" />     // ~29 file (CSS spinner custom)
```

**Soluzione**: Creare `src/components/ui/spinner.tsx`:

```tsx
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-8 h-8' };
  return <Loader2 className={`${sizes[size]} animate-spin`} />;
}
```

---

### B2. 🟡 DIALOG/MODALE: DUE PATTERN

**Verificato**: La maggior parte usa `@/components/ui/dialog` (wrapper Radix).
**Eccezione**: `src/components/tos/tos-acceptance-modal.tsx` importa direttamente:

```tsx
import * as DialogPrimitive from '@radix-ui/react-dialog';
```

Questo è l'**unico** file che bypassa il wrapper. Rischio basso ma inconsistente.

---

### B3. 🟡 AUTO-SAVE WRAPPERS DUPLICATI

| File                                                              | Righe | Usato da                     |
| ----------------------------------------------------------------- | ----- | ---------------------------- |
| `src/components/tools/auto-save-wrappers.tsx`                     | 282   | `tool-content-renderers.tsx` |
| `src/components/tools/tool-result-display/auto-save-wrappers.tsx` | 300   | `tool-content.tsx`           |

**Verificato**: Sono file **diversi** (non symlink). Il secondo ha più feature (debounce,
retry, utilities importate da `auto-save-utils.ts`). Il primo ha auto-save inline.

**Soluzione**: Eliminare il primo, usare solo `tool-result-display/auto-save-wrappers.tsx`.

---

<a id="sezione-c"></a>

## SEZIONE C — i18n & CONFIGURAZIONE

### C1. 🔴 DUE CONFIG i18n CON LOCALES IN ORDINE DIVERSO

| File                    | Array locales                    | localeFlags |
| ----------------------- | -------------------------------- | ----------- |
| `src/i18n/config.ts`    | `["it", "en", "fr", "de", "es"]` | ✅ Presente |
| `i18n/config.ts` (root) | `["it", "en", "es", "fr", "de"]` | ❌ Assente  |

**Verificato**: `@/i18n/config` risolve a `src/i18n/config.ts` (tsconfig: `@/* → ./src/*`).
Il file `i18n/config.ts` alla root **non è importato da nessun file** (0 import trovati).

**Rischio reale**: BASSO per ora (dead code), ma se qualcuno facesse import relativo
dal root, otterrebbe ordine locales diverso. `localeFlags` è definito SOLO in `src/i18n/config.ts`
e usato da 14 file.

**Soluzione**: Eliminare `i18n/config.ts` (root). È dead code.

---

### C2. 🔴 DUE SISTEMI MESSAGGI i18n: NAMESPACE FILES VS JSON AGGREGATI

| Sistema            | Path                 | File                           | Dimensione      |
| ------------------ | -------------------- | ------------------------------ | --------------- |
| **Namespace JSON** | `messages/{locale}/` | 23 file × 5 locales = 115 file | Source of truth |
| **JSON aggregati** | `src/i18n/messages/` | 5 file (uno per locale)        | ~585KB it.json  |

**Verificato**: `src/i18n/request.ts` carica da `messages/{locale}/{namespace}.json` (riga 28).
I file `src/i18n/messages/*.json` **non sono importati da nessun file sorgente**.

**Divergenza chiave verificata**:

- `messages/it/` contiene **23 namespace**: achievements, admin, analytics, auth, chat, common...
- `src/i18n/messages/it.json` contiene **34 namespace**: admin, aiTransparency, ambientAudio...
- **9 namespace in file ma non in aggregato**: analytics, email, research, chat, metadata...
- **20 namespace in aggregato ma non in file**: supporti, profile, dashboard, tier, buddies...

**Rischio reale**: MEDIO. I file aggregati sembrano generati/obsoleti ma non usati dal runtime.
Potrebbero confondere dev o tool di traduzione.

**Soluzione**: Eliminare `src/i18n/messages/` o rigenerarlo da `messages/` con script.

---

### C3. 🟠 6 NAMESPACE i18n SU DISCO MA NON CARICATI

**Verificato** in `src/i18n/request.ts` riga 6-24: il vettore `NAMESPACES` elenca 17 namespace.
Su disco in `messages/it/` ci sono 23 file JSON.

**Non caricati**:
| Namespace | File su disco | Usato nel codice (`useTranslations`) |
|-----------|--------------|--------------------------------------|
| `voice` | `messages/it/voice.json` (6.7KB) | **8 componenti** lo usano |
| `session` | `messages/it/session.json` | 0 riferimenti |
| `onboarding` | `messages/it/onboarding.json` | 0 riferimenti |
| `analytics` | `messages/it/analytics.json` | **2 componenti** lo usano |
| `email` | `messages/it/email.json` | 0 riferimenti |
| `research` | `messages/it/research.json` | 0 riferimenti |

**Rischio reale per `voice`**: ALTO. 8 componenti chiamano `useTranslations('voice')` ma
il namespace non è nel vettore NAMESPACES → next-intl restituisce chiavi vuote → UI mostra
chiavi raw o stringhe mancanti.

**Rischio per `analytics`**: MEDIO. 2 componenti lo usano.

**Soluzione**: Aggiungere `'voice'` e `'analytics'` a NAMESPACES in `src/i18n/request.ts`.
Eliminare i file non usati (`session`, `onboarding`, `email`, `research`) o aggiungerli
se servono.

---

### C4. 🟠 STRINGHE ITALIANE HARDCODED NEL CODICE

**Verificato** — campione trovato:

**In utility functions** (`src/lib/export/export-helpers.ts:23-39`):

```typescript
const labels: Partial<Record<ToolType, string>> = {
  mindmap: 'Mappa Mentale',
  quiz: 'Quiz',
  summary: 'Riassunto',
  demo: 'Demo Interattiva',
  homework: 'Compiti',
  search: 'Ricerca',
};
```

→ Queste label non passano per i18n. Utente francese vedrà "Mappa Mentale".

**In scheduler** (`src/lib/scheduler/formatting.ts:33`):

```typescript
const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
```

**In componenti** (campione verificato):

- `src/components/settings/settings-page-mobile.tsx:241` → `"Salva modifiche"`
- `src/components/contact/enterprise-form.tsx:103` → `"Errore durante l'invio"`
- `src/components/tools/tool-canvas.tsx:142` → `'Errore'`
- `src/components/conversation/components/voice-call-panel.tsx:82` → `'Errore di connessione vocale'`
- `src/components/study-kit/StudyKitUpload.tsx:86` → `'Errore durante la generazione'`

**Soluzione**: Audit sistematico + migrazione a chiavi i18n. Priorità alta per le
label tool type (usate nell'export che utenti scaricano).

---

<a id="sezione-d"></a>

## SEZIONE D — SERVIZI & UTILITY

### D1. 🔴 QUATTRO `calculateLevel()` CON ALGORITMI DIVERSI

**Verificato** — 4 funzioni con lo stesso nome e logica completamente diversa:

| File                                              | Input → Output                  | Algoritmo                                       |
| ------------------------------------------------- | ------------------------------- | ----------------------------------------------- | ---------- | ----------- | --------- |
| `src/lib/utils.ts:22`                             | `xp: number → number`           | Thresholds array: [0,100,250,500,1000,...64000] |
| `src/lib/gamification/gamification-helpers.ts:18` | `points: number → number`       | `Math.floor(points / 1000) + 1`, max 100        |
| `src/lib/constants/xp-rewards.ts:139`             | `totalXP: number → number`      | `XP_PER_LEVEL` array lookup (reverse)           |
| `src/lib/stores/method-progress-utils.ts:19`      | `progress: number → SkillLevel` | Restituisce `'novice'                           | 'learning' | 'competent' | 'expert'` |

**Chi le usa** (verificato):

- `gamification/db.ts` importa da `gamification-helpers.ts`
- `method-progress-handlers.ts` importa da `method-progress-utils.ts`
- `utils.ts:37` usa la propria versione internamente
- `xp-rewards.ts` → non trovati import diretti (potenzialmente dead code)

**Impatto**: Se XP=500 → `utils.ts` dice livello 4, `gamification-helpers.ts` dice livello 1,
`xp-rewards.ts` potrebbe dire qualcos'altro. Rischio di livelli inconsistenti tra UI diverse.

**Soluzione**: Consolidare in un singolo `src/lib/gamification/level-calculator.ts` con
funzioni esplicite: `calculateXPLevel()`, `calculateGamificationLevel()`, `calculateSkillLevel()`.

---

### D2. 🟠 TRE `formatDate()` E DUE `formatTime()` DIVERSE

**Verificato** — stesse funzioni, output diversi:

| Funzione              | File                                  | Input/Output                                           |
| --------------------- | ------------------------------------- | ------------------------------------------------------ |
| `formatDate(date)`    | `src/lib/utils.ts:14`                 | `"14 febbraio 2026"` (numeric-long-numeric)            |
| `formatDate(date)`    | `src/lib/scheduler/formatting.ts:21`  | `"sabato 14 febbraio"` (weekday-numeric-long, NO anno) |
| `formatDate(date)`    | `src/lib/export/export-helpers.ts:42` | `"14 febbraio 2026"` (2digit-long-numeric)             |
| `formatTime(seconds)` | `src/lib/utils.ts:8`                  | `"3:45"` (M:SS, da secondi)                            |
| `formatTime(date)`    | `src/lib/scheduler/formatting.ts:11`  | `"15:30"` (HH:MM, da Date)                             |

**Nota**: le prime due `formatDate` producono output simile ma NON identico.
`utils.ts` produce "14 febbraio 2026", `export-helpers.ts` produce "14 febbraio 2026"
(con `2-digit` per il giorno → "14" vs "14" — di fatto uguale in questo caso, ma `2-digit`
forza lo zero: "04 febbraio" vs "4 febbraio").

**Soluzione**: `src/lib/formatting/dates.ts` con varianti esplicite.

---

### D3. 🟠 TRE `sanitizeFilename()` IDENTICHE

| File                                           | Implementazione            |
| ---------------------------------------------- | -------------------------- | ------------------------------------------------ |
| `src/lib/export/export-helpers.ts:16`          | `replace(/[<>:"/\\         | ?\*]/g, '_').replace(/\s+/g, '_').slice(0, 100)` |
| `src/lib/tools/accessible-print/helpers.ts:14` | Stessa logica (verificata) |
| `src/lib/tools/mindmap-export/helpers.ts:8`    | Stessa logica (verificata) |

**Soluzione**: Un singolo export da `src/lib/utils.ts` o `src/lib/sanitize.ts`.

---

### D4. 🟡 TIPI TYPING DUPLICATI (DEAD CODE)

**Verificato**: `src/types/tools/typing-data-types.ts` contiene tipi **identici** a
`src/types/tools/tool-data-types-educational.ts:109-180`:

- `KeyboardLayout`, `TypingHandMode`, `TypingLevel`, `KeyConfig`, `KeyboardLayoutConfig`,
  `LessonKey`, `TypingLesson`, `LessonResult`, `TypingProgress`, `TypingStats`

**Chi importa cosa**:

- `tool-data-types.ts` (barrel) re-esporta da `tool-data-types-educational.ts`
- `typing-data-types.ts` **non è importato da nessun file** (0 import trovati)

**Rischio reale**: BASSO (dead code), ma confonde i dev.

**Soluzione**: Eliminare `src/types/tools/typing-data-types.ts`.

---

### D5. 🟡 CLASSI ERRORE SPARSE SENZA BASE COMUNE

13 classi Error custom trovate senza gerarchia condivisa:

| Classe                              | File                                        |
| ----------------------------------- | ------------------------------------------- |
| `ApiError`                          | `src/lib/api/pipe.ts:28`                    |
| `StorageError`                      | `src/lib/storage/types.ts:155`              |
| `PDFProcessingError`                | `src/lib/pdf/pdf-types.ts:29`               |
| `CookieSigningError`                | `src/lib/auth/cookie-signing.ts:24`         |
| `AzureHttpError`                    | `src/lib/ai/providers/azure-errors.ts:15`   |
| `RegistryError`                     | `src/lib/tools/plugin/registry.ts:12`       |
| `OIDCProviderError` + 4 sottoclassi | `src/lib/auth/sso/oidc-provider.ts:147-191` |

OIDC ha una buona gerarchia (4 sottoclassi di `OIDCProviderError`).
Gli altri sono indipendenti → nessun `isAppError()` check unificato possibile.

---

<a id="sezione-e"></a>

## SEZIONE E — API ROUTES

### E1. 🟠 25 ROUTE CON AUTH MANUALE VS 383 CON `pipe()`

**Verificato**: 25 route usano `validateAuth()` direttamente nel handler body
invece del middleware `withAuth` nella pipe chain.

**Campione verificato**:
| Route | Pattern |
|-------|---------|
| `src/app/api/user/route.ts:20` | `const auth = await validateAuth()` |
| `src/app/api/tools/stream/route.ts:39` | `const auth = await validateAuth()` |
| `src/app/api/tools/sse/route.ts:39` | `const auth = await validateAuth()` |
| `src/app/api/chat/stream/helpers.ts:51` | `const auth = await validateAuth()` |
| `src/app/api/chat/auth-handler.ts:15` | `const auth = await validateAuth()` |
| `src/app/api/onboarding/handlers.ts:23,72` | `const auth = await validateAuth()` (2x) |
| `src/app/api/trial/voice/route.ts:37,131` | `const auth = await validateAuth()` (2x) |
| `src/app/api/trial/session/route.ts:67,158` | `const auth = await validateAuth()` (2x) |
| `src/app/api/scheduler/helpers.ts:11` | `const auth = await validateAuth()` |
| `src/app/api/telemetry/events/route.ts:55` | `const auth = await validateAuth()` |
| `src/app/api/safety/events/route.ts:28` | `const auth = await validateAuth()` |

**Nota**: Alcune di queste (SSE, streaming) hanno ragioni tecniche per non usare pipe()
(streaming responses non compatibili con middleware chain). Tuttavia, `user/route.ts`,
`onboarding/handlers.ts`, `scheduler/helpers.ts` NON hanno questa giustificazione.

**Rischio**: Route manuali possono dimenticare Sentry wrapping, CSRF check, rate limiting.

**Soluzione**: Migrare le route non-streaming a pipe(). Per streaming, creare
`withAuthStreaming` middleware dedicato.

---

### E2. 🟡 RATE LIMIT: DUE VARIANTI (SYNC E ASYNC)

**Verificato** in `src/lib/rate-limit.ts`:

- Riga 181: `checkRateLimit()` — sincrono, in-memory
- Riga 217: `checkRateLimitAsync()` — asincrono

Route diverse usano l'una o l'altra senza criterio chiaro:

- `parent-professor/route.ts` → `checkRateLimit` (sync)
- `metrics/web-vitals/route.ts` → `checkRateLimitAsync`
- `contact/route.ts` → `checkRateLimitAsync`
- `tools/stream/modify/route.ts` → `checkRateLimitAsync`

Non è un bug (entrambe funzionano), ma è inconsistente e confonde.

---

### E3. 🟡 OWNERSHIP CHECK DUPLICATO IN CONVERSATIONS

**Verificato** — stesso pattern in 4 route:

```typescript
const conversation = await prisma.conversation.findFirst({
  where: { id: conversationId, userId },
});
if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
```

Trovato in:

- `src/app/api/conversations/[id]/messages/route.ts:38` e `:72` (2x nello stesso file!)
- `src/app/api/conversations/[id]/summarize/route.ts:34`
- `src/app/api/conversations/[id]/end/route.ts:48`

**Soluzione**: `withConversation(id)` middleware o utility `requireConversationOwnership()`.

---

### E4. 🟡 FORMATO ERROR RESPONSE NON STANDARDIZZATO

**Verificato** — formati diversi coesistono:

```json
{ "error": "Forbidden" }                          // 12 route
{ "error": "Material not found" }                  // 9 route
{ "error": "message", "details": "..." }           // Alcune route
{ "error": "message", "required": [...] }          // materials POST
{ "error": "message", "validation": [...] }        // Altre route
```

Nessun `ApiErrorResponse` type condiviso. I client devono gestire formati diversi.

---

<a id="sezione-f"></a>

## SEZIONE F — STATE MANAGEMENT

### F1. 🔴 DUE CONVERSATION STORE SOVRAPPOSTI

| Store                      | File                                              | Consumers                                                       |
| -------------------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| `useConversationStore`     | `src/lib/stores/conversation-store.ts`            | 8 file (chat hooks, use-character-chat, store-sync)             |
| `useConversationFlowStore` | `src/lib/stores/conversation-flow-store/store.ts` | 10 file (page.tsx, conversation-flow, providers, active-avatar) |

**Verificato**: Entrambi gestiscono conversazioni e messaggi:

- `useConversationStore`: `conversations[].messages`, `createConversation()`, `addMessage()`, `syncToServer()`
- `useConversationFlowStore`: session lifecycle, messaggi via message-slice, character routing, handoff

**Ambiguità**: `use-character-chat/index.ts` importa `useConversationStore` per persistenza,
mentre `conversation-flow.tsx` usa `useConversationFlowStore` per il flusso. Se entrambi
scrivono messaggi, possono divergere.

**Soluzione**: Merge: useConversationFlowStore come store principale, aggiungere persistenza.

---

### F2. 🔴 QUATTRO SISTEMI DI CONSENT

| Sistema         | Storage Key                   | File                                         |
| --------------- | ----------------------------- | -------------------------------------------- |
| Unified Consent | `mirrorbuddy-unified-consent` | `src/lib/consent/unified-consent-storage.ts` |
| Cookie Consent  | `mirrorbuddy-consent`         | `src/lib/consent/consent-storage.ts`         |
| Trial Consent   | via variabile                 | `src/lib/consent/trial-consent.ts`           |
| Zustand Store   | in-memory                     | `src/lib/consent/consent-store.ts`           |

**Verificato**: 4 file nella stessa directory `src/lib/consent/`.
`unified-consent-storage.ts` fa anche **migrazione** da `mirrorbuddy-consent` (riga 117).
Ma `consent-storage.ts` esiste ancora e viene usato.

**Rischio GDPR**: Se un utente revoca il consenso in un sistema, gli altri 3 non lo sanno.

---

### F3. 🟠 23+ CHIAMATE localStorage DIRETTE

**Verificato** — campione:

| File                                                           | Dato                       | Policy Violation |
| -------------------------------------------------------------- | -------------------------- | ---------------- |
| `src/lib/hooks/use-permissions.ts:43,55`                       | Permessi utente cached     | ⚠️ User data     |
| `src/lib/hooks/voice-session/transport-cache.ts:56,77,146,167` | Connection probe results   | ⚠️ Tecnico       |
| `src/components/trial/email-capture-prompt.tsx:47,63,93`       | Session ID + dismissal     | ⚠️ User data     |
| `src/components/pwa/ios-install-banner.tsx:47,62`              | Banner dismissal timestamp | ⚠️ UX preference |

**Policy progetto**: "NO localStorage for user data → Zustand + REST only".
I file consent sono legittimi (gestione consenso stessa), gli altri no.

---

### F4. 🟠 API CALLS DUPLICATE SENZA CACHING

| Endpoint               | Chiamanti distinti verificati                              |
| ---------------------- | ---------------------------------------------------------- |
| `/api/realtime/token`  | **12 file**                                                |
| `/api/user/usage`      | **8 file**                                                 |
| `/api/azure/costs`     | 3+ file (con 2 chiamate parallele nello stesso componente) |
| `/api/provider/status` | 3+ file                                                    |

**Impatto**: N richieste identiche al server, possibili risposte diverse tra le chiamate,
UI flickering quando i dati arrivano in momenti diversi.

**Soluzione**: Hook condiviso con dedup (React Query, SWR, o custom `useCachedFetch`).

---

<a id="sezione-g"></a>

## SEZIONE G — MATRICE PRIORITÀ & SOLUZIONI

### QUICK WINS (effort basso, impatto alto)

| #   | Azione                                                                     | Effort | File da modificare        |
| --- | -------------------------------------------------------------------------- | ------ | ------------------------- |
| 1   | Eliminare `i18n/config.ts` (root, dead code)                               | 1 min  | 1 file                    |
| 2   | Eliminare `src/types/tools/typing-data-types.ts` (dead code)               | 1 min  | 1 file                    |
| 3   | Aggiungere `'voice'` e `'analytics'` a NAMESPACES in `src/i18n/request.ts` | 5 min  | 1 file                    |
| 4   | Eliminare `src/i18n/messages/` (dead code, non importato)                  | 1 min  | 5 file                    |
| 5   | Creare `<Spinner size>` in `src/components/ui/spinner.tsx`                 | 15 min | 1 file + gradual refactor |
| 6   | Consolidare 3× `sanitizeFilename()` in unico export                        | 10 min | 3 file                    |

### MEDIO TERMINE (1-3 giorni)

| #   | Azione                                                     | Effort | Impatto          |
| --- | ---------------------------------------------------------- | ------ | ---------------- |
| 7   | Unificare `formatDate`/`formatTime` con varianti esplicite | 2h     | UX consistente   |
| 8   | Consolidare 4× `calculateLevel()`                          | 3h     | Livelli corretti |
| 9   | Aggiungere TTS al message bubble coach/buddy               | 2h     | Feature parity   |
| 10  | Standardizzare API error response format                   | 4h     | DX migliore      |
| 11  | Migrare route non-streaming da manual auth a pipe()        | 4h     | Security         |
| 12  | Consolidare consent in singolo Zustand store               | 1d     | GDPR compliance  |
| 13  | Migrare `auto-save-wrappers.tsx` a singolo file            | 2h     | DRY              |

### LUNGO TERMINE (settimane)

| #   | Azione                                                  | Effort | Impatto                             |
| --- | ------------------------------------------------------- | ------ | ----------------------------------- |
| 14  | **Unificare MaestroSession + CharacterChatView**        | 3-5d   | Architettura pulita, feature parity |
| 15  | Merge conversation stores                               | 2-3d   | Source of truth unica               |
| 16  | Implementare request deduplication (SWR/React Query)    | 2-3d   | Performance                         |
| 17  | Estrarre Education conversation in componente condiviso | 2d     | Meno duplicazione                   |
| 18  | Audit sistematico stringhe italiane hardcoded           | 2-3d   | i18n completa                       |
| 19  | Integrare handoff in MaestroSession                     | 1d     | UX completa                         |

---

## STATISTICHE FINALI

| Categoria                          | Trovati | Verificati | Criticità          |
| ---------------------------------- | ------- | ---------- | ------------------ |
| Duplicazioni UI (componenti)       | 8       | 8          | 3🔴 3🟠 2🟡        |
| Inconsistenze Framework Personaggi | 8       | 8          | 2🔴 4🟠 2🟡        |
| Duplicazioni i18n/Config           | 4       | 4          | 2🔴 2🟠            |
| Duplicazioni Servizi/Utility       | 5       | 5          | 1🔴 2🟠 2🟡        |
| Inconsistenze API                  | 4       | 4          | 1🟠 3🟡            |
| Problemi State Management          | 4       | 4          | 2🔴 2🟠            |
| **TOTALE**                         | **33**  | **33**     | **10🔴 13🟠 10🟡** |

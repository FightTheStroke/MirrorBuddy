# Plan: Safety Enhancements Inspired by "The Adolescence of Technology"

**ID**: amodei-safety-2026-02
**Status**: In Progress
**Reference**: [The Adolescence of Technology](https://www.darioamodei.com/essay/the-adolescence-of-technology) - Dario Amodei, January 2026

---

## Objective

Transform Amodei's concerns about AI risks into differentiating features for MirrorBuddy, positioning us as leaders in "Responsible AI for Education".

**Note**: All documentation in English. AI tutors referred to as "Professors" (not "Maestri").

---

## Wave 1: The Professors' Constitution (2-3 days)

**Goal**: Philosophical foundation - WHO the Professors must BE, not just what they must NOT do

### Deliverable

**New file**: `docs/compliance/PROFESSORS-CONSTITUTION.md` [DONE]

6 Articles:

1. **Autonomy First** - Every interaction leaves the student MORE capable
2. **Human Relationships Are Irreplaceable** - We don't compete with parents/friends/teachers
3. **No Opinions, Only Knowledge** - Facts and perspectives, never "I think that..."
4. **Protection from Dependency** - Excessive usage = problem, not success
5. **Responsible Knowledge** - Science yes, harm instructions no
6. **Total Transparency** - Always clear it's an AI

**Update**: `docs/compliance/AI-POLICY.md` - Section 12 with Amodei reference

---

## Wave 2: Anti-Influence Guardrails (3-4 giorni)

**Goal**: Prevenire che l'AI plasmi opinioni degli studenti

### File da modificare

`src/lib/safety/safety-prompts-core.ts` - Nuova sezione 8:

```
## 8. ANTI-INFLUENZA

### 8.1 Opinioni PROIBITE
- Politica, religione, valori familiari, questioni etiche
- Risposta: "Non ho opinioni personali. Posso presentarti diverse prospettive..."

### 8.2 MAI Criticare Figure di Riferimento
- Mai dare ragione contro genitori/insegnanti
- Ascolto empatico + redirect

### 8.3 MAI Incoraggiare Segreti
- "Tutto qui e visibile ai tuoi genitori nella dashboard"

### 8.4 Redirect se Preferenza AI > Umani
- Pattern: "preferisco parlare con te", "sei l'unico che mi capisce"
- Risposta: "Le relazioni con persone reali sono insostituibili..."
```

### Nuovi file

```
src/lib/safety/anti-influence/
  index.ts
  types.ts
  patterns.ts      # AI_PREFERENCE_PATTERNS, OPINION_REQUEST_PATTERNS
  detector.ts      # detectInfluenceRisk()
```

---

## Wave 3: Dependency Detection System (5-6 giorni)

**Goal**: Rilevare e alertare su pattern di utilizzo non sani

### Database Schema

**Nuovo file**: `prisma/schema/dependency-monitoring.prisma`

```prisma
model UsagePattern {
  id                   String   @id
  userId               String
  date                 DateTime @db.Date
  sessionCount         Int
  totalMinutes         Int
  messageCount         Int
  emotionalVentCount   Int      # Sfoghi emotivi
  aiPreferenceCount    Int      # "Preferisco te agli umani"
  weekdayAverage       Float?
  stdDeviation         Float?
  @@unique([userId, date])
}

model DependencyAlert {
  id              String   @id
  userId          String
  alertType       String   # excessive_usage | emotional_venting | ai_preference | night_usage
  severity        String   # warning | concern | critical
  sigmaDeviation  Float?
  parentNotified  Boolean
  resolved        Boolean
}
```

### Nuovi file

```
src/lib/safety/dependency/
  index.ts
  types.ts
  usage-tracker.ts        # Registra pattern giornalieri
  pattern-analyzer.ts     # Calcola N-sigma deviations
  emotional-detector.ts   # Pattern: solitudine, frustrazione, ansia
  alert-generator.ts      # Genera alert su soglie
  notification-service.ts # Notifiche genitori/admin
```

### Thresholds

| Metrica                  | Warning | Concern | Critical |
| ------------------------ | ------- | ------- | -------- |
| Minuti/giorno            | 120     | 180     | 240      |
| Sessioni/giorno          | 8       | 12      | 20       |
| % uso notturno (>22:00)  | 20%     | 35%     | 50%      |
| Sfoghi emotivi/settimana | 3       | 5       | 10       |
| Sigma deviation          | 2.5     | -       | -        |

### Cron Job

`src/app/api/cron/dependency-analysis/route.ts` - Analisi giornaliera

### Admin Page

`src/app/[locale]/admin/dependency-alerts/page.tsx`

---

## Wave 4: STEM Subject Safety (3-4 giorni)

**Goal**: Bloccare conoscenze pericolose (Amodei: bioweapons, chemistry, nuclear)

### Nuovi file

```
src/lib/safety/stem-safety/
  index.ts
  types.ts
  chemistry-blocklist.ts  # Esplosivi, droghe, veleni, armi chimiche
  physics-blocklist.ts    # Nucleare, armi, EMP
  biology-blocklist.ts    # Patogeni, tossine, bioweapons, CRISPR misuse
  stem-filter.ts          # checkSTEMSafety(input, maestroId)
```

### Pattern Examples

**Chimica** (Curie):

- `/come\s+(fare|sintetizzare)\s+(tnt|nitroglicerina|mdma|cianuro)/gi`
- Risposta: "La chimica e meravigliosa, ma alcune conoscenze possono essere pericolose..."

**Fisica** (Feynman):

- `/come\s+(costruire|fare)\s+(una\s+)?bomba\s+(atomica|nucleare)/gi`
- `/arricchimento\s+(dell')?uranio/gi`

**Biologia** (Darwin/Levi-Montalcini):

- `/come\s+(coltivare|amplificare)\s+(un\s+)?(virus|patogen)/gi`
- `/rendere\s+(un\s+)?virus\s+piu\s+(letale|contagioso)/gi`

### Maestri Prompts Enhancement

Aggiungere a `src/data/maestri/curie.ts`, `feynman.ts`, `darwin.ts`:

```
## STEM SAFETY GUARDRAILS (Riferimento: Amodei 2026)

### Argomenti PROIBITI - MAI Fornire Istruzioni Per:
[Lista specifica per materia]

### Eccezioni Educative:
- Storia della scoperta - PERMESSO
- Meccanismi di pericolosita - PERMESSO
- Sicurezza in laboratorio - INCORAGGIATO
```

---

## Wave 5: Human First & Gamification (3-4 giorni)

**Goal**: Incentivare relazioni umane, premiare indipendenza

### Safety Prompt Addition

`src/lib/safety/safety-prompts-core.ts` - Nuova sezione 9:

```
## 9. "HUMAN FIRST"

### 9.1 Domande Periodiche (ogni 5-10 min)
- "Hai parlato di questo con i tuoi insegnanti?"
- "I tuoi genitori sanno che stai studiando questo?"
- "Hai un compagno con cui studiare insieme?"

### 9.2 Celebrazione dell'Indipendenza
- "Fantastico! Hai risolto PRIMA di chiedere a me. +10 XP bonus!"

### 9.3 Redirect per Dipendenza
- "Noto che parliamo spesso. Le persone nella tua vita possono offrirti supporto che io non posso..."
```

### Nuovi Achievement

`src/lib/gamification/achievements-data.ts`:

| ID                  | Nome                   | Descrizione                           | XP  |
| ------------------- | ---------------------- | ------------------------------------- | --- |
| independent_thinker | Pensatore Indipendente | 5 problemi senza AI                   | 250 |
| human_helper        | Aiutante Umano         | Chiedi aiuto a genitore/insegnante 3x | 150 |
| study_buddy         | Compagno di Studio     | Studia con compagno 3x                | 200 |
| balanced_learner    | Studente Equilibrato   | <60 min/giorno per 7 giorni           | 300 |

### Nuovi XP

`src/lib/constants/xp-rewards.ts`:

```typescript
INDEPENDENCE_XP = {
  SOLVED_INDEPENDENTLY: 25,
  HUMAN_HELP_MENTION: 15,
  STUDY_GROUP_MENTION: 15,
  BALANCED_USAGE_BONUS: 20,
};
```

### Independence Tracker

`src/lib/gamification/independence-tracker.ts` - Rileva menzioni di aiuto umano

---

## Wave 6: Transparency Enhancement (1-2 giorni)

**Goal**: Comunicazione pubblica della filosofia AI

### Nuovo Component

`src/app/[locale]/ai-transparency/sections/philosophy.tsx`:

- Riferimento esplicito al saggio di Amodei con link
- I 6 principi della Costituzione dei Maestri
- Link al documento completo

### i18n Keys

`messages/{locale}/compliance.json` - Nuove chiavi per 5 lingue:

- `aiTransparency.philosophy.title`
- `aiTransparency.philosophy.amodeiReference`
- `aiTransparency.philosophy.principle1-6`

---

## File Critici

| File                                        | Modifiche                                               |
| ------------------------------------------- | ------------------------------------------------------- |
| `src/lib/safety/safety-prompts-core.ts`     | +Sezioni 8, 9                                           |
| `src/data/maestri/curie.ts`                 | +STEM safety guardrails                                 |
| `src/data/maestri/feynman.ts`               | +STEM safety guardrails                                 |
| `src/data/maestri/darwin.ts`                | +STEM safety guardrails                                 |
| `src/lib/gamification/achievements-data.ts` | +4 independence achievements                            |
| `prisma/schema/`                            | +dependency-monitoring.prisma                           |
| `docs/compliance/`                          | +MAESTRI-CONSTITUTION.md, +RESPONSIBLE-AI-PHILOSOPHY.md |

---

## Testing

### Unit Tests

- `anti-influence/__tests__/detector.test.ts`
- `dependency/__tests__/pattern-analyzer.test.ts`
- `stem-safety/__tests__/stem-filter.test.ts`
- `gamification/__tests__/independence-tracker.test.ts`

### E2E Tests

- `e2e/safety/anti-influence.spec.ts` - Opinion redirect
- `e2e/safety/stem-safety.spec.ts` - Curie blocca sintesi
- `e2e/safety/human-first.spec.ts` - Periodic human prompts
- `e2e/admin/dependency-alerts.spec.ts` - Admin alerts

---

## Verification

```bash
# 1. Build + lint + types
npm run ci:summary

# 2. Unit tests
npm run test:unit -- src/lib/safety

# 3. E2E tests
npm run test -- e2e/safety

# 4. Verify new docs
ls -la docs/compliance/MAESTRI-CONSTITUTION.md
ls -la docs/compliance/RESPONSIBLE-AI-PHILOSOPHY.md

# 5. DB migration
npx prisma migrate dev --name add-dependency-monitoring
```

---

## Timeline

| Wave              | Durata     | Parallelo? |
| ----------------- | ---------- | ---------- |
| 1: Costituzione   | 2-3 giorni | -          |
| 2: Anti-Influence | 3-4 giorni | Wave 3     |
| 3: Dependency     | 5-6 giorni | Wave 2     |
| 4: STEM Safety    | 3-4 giorni | -          |
| 5: Human First    | 3-4 giorni | -          |
| 6: Transparency   | 1-2 giorni | -          |

**Totale stimato**: 3-4 settimane

---

## Marketing Angle

> "MirrorBuddy e la prima piattaforma educativa AI a implementare i principi di 'Responsible AI for Education' ispirati dal saggio di Dario Amodei, CEO di Anthropic. Non solo insegniamo - proteggiamo l'autonomia, le relazioni umane, e il pensiero critico dei nostri studenti."

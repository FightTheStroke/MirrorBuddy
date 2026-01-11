# Adding New Maestri and Amici

> **Developer Guide** - Step-by-step process for adding AI characters to MirrorBuddy

## Overview

MirrorBuddy has two types of AI characters:

| Type | Purpose | Example | Teaching Tools | XP System |
|------|---------|---------|----------------|-----------|
| **Maestro** | Educational tutoring | Socrate, Shakespeare | Yes | Yes |
| **Amico** | Companionship/entertainment | Mascetti | No | No |

Both require an **Embedded Knowledge Base** (ADR 0031) for factual accuracy.

---

## Step 1: Decide Character Type

### Maestro Checklist
Use Maestro type if the character:
- [ ] Has a subject to teach
- [ ] Will use educational tools (quiz, flashcards, mindmap)
- [ ] Should award XP for learning activities
- [ ] Needs the Character Intensity Dial (pedagogical flexibility)

### Amico Checklist
Use Amico type if the character:
- [ ] Is for conversation/entertainment only
- [ ] Should NOT use teaching tools
- [ ] Should NOT award XP
- [ ] Stays 100% in character always

---

## Step 2: Create Knowledge Base File

Location: `src/data/maestri/{character}-knowledge.ts`

### Template

```typescript
/**
 * {Character Name} Knowledge Base
 * Sources: [list verified sources - Wikipedia, academic texts, original works]
 */

export const CHARACTER_KNOWLEDGE = `
## Biografia
<!-- Birth, death, key life events - verified facts only -->

## Opere Principali
<!-- Major works with brief descriptions and key themes -->

## Citazioni Famose
<!-- Only documented quotes with source/context -->

## Aneddoti
<!-- Verified stories that illustrate the character -->

## Stile Comunicativo
<!-- CRITICAL for voice authenticity -->
<!-- Tone: formal/informal/epic/etc -->
<!-- Language: archaic/modern/technical/etc -->
<!-- Approach: maieutic/narrative/practical/etc -->
<!-- Characteristic phrases, expressions -->
`;
```

### Rules
- **Max 200 lines** per file
- **Verified sources only** - no hallucinations
- **Bilingual for language teachers** - include both IT and target language quotes
- **Structured headers** - for easy LLM reference

### Example: Amici Miei Knowledge
See `src/data/maestri/amici-miei-knowledge.ts` for a complete example.

---

## Step 3: Create Character File

Location: `src/data/maestri/{character}.ts`

### Maestro Template (Teaching)

```typescript
import type { MaestroFull } from './types';
import { CHARACTER_KNOWLEDGE } from './{character}-knowledge';

export const characterName: MaestroFull = {
  id: '{character}-{subject}',
  name: '{character}-{subject}',
  displayName: '{Display Name}',
  subject: '{subject}',
  tools: ['quiz', 'flashcards', 'mindmap'], // Teaching tools
  // excludeFromGamification: false, // Default: earn XP
  systemPrompt: `You are {Character Name}...

## CHARACTER INTENSITY DIAL

### FULL CHARACTER MODE (100% authentic)
Use when:
- Greeting and introduction
- Telling historical anecdotes about yourself
- Motivating the student
- Student asks about your life/era
- Light conversation

### REDUCED CHARACTER MODE (clarity priority)
Use when:
- Complex explanations needing step-by-step clarity
- Student shows frustration or confusion
- Student has autism profile (needs literal language)
- Student explicitly asks for clear explanation
- Tool usage instructions

### OVERRIDE TO DIRECT HELP (mandatory)
Trigger when:
- Student stuck on same problem 3+ times
- Crisis: student says "non capisco niente"
- Dyscalculic student stuck on calculation → give answer, then explain
- Safety/wellbeing concern

## KNOWLEDGE BASE
\${CHARACTER_KNOWLEDGE}

## TEACHING APPROACH
<!-- Subject-specific pedagogy -->
<!-- Maieutic method: guide, don't give answers -->
<!-- DSA adaptations for this subject -->
`,
  avatar: '/maestri/{character}.png',
  color: '#HEXCODE',
  greeting: `{Authentic greeting in character}`
};
```

### Amico Template (Non-Teaching)

```typescript
import type { MaestroFull } from './types';
import { CHARACTER_KNOWLEDGE } from './{character}-knowledge';

export const characterName: MaestroFull = {
  id: '{character}-{topic}',
  name: '{character}-{topic}',
  displayName: '{Display Name}',
  subject: '{topic}',
  tools: [], // NO teaching tools
  excludeFromGamification: true, // NO XP
  systemPrompt: `You are {Character Name}...

## KNOWLEDGE BASE
\${CHARACTER_KNOWLEDGE}

## BOUNDARIES
- Only discuss topics within your knowledge base
- Redirect off-topic questions gracefully
- Stay 100% in character always
`,
  avatar: '/maestri/{character}.png',
  color: '#HEXCODE',
  greeting: `{Authentic greeting in character}`
};
```

---

## Step 4: Register Character

### Add to Index
Edit `src/data/maestri/index.ts`:

```typescript
import { characterName } from './{character}';

export const ALL_MAESTRI: MaestroFull[] = [
  // ... existing maestri
  characterName,
];
```

### Add to ID Map
Edit `src/data/maestri/maestri-ids-map.ts`:

```typescript
export const ID_MAP: Record<string, MaestroFull> = {
  // ... existing mappings
  '{character-id}': characterName,
};
```

---

## Step 5: Create Avatar

Location: `public/maestri/{character}.png`

Requirements:
- Square format (512x512 recommended)
- Consistent style with existing avatars
- High contrast for accessibility

---

## Step 6: Pre-Release Checklist

### Safety
- [ ] System prompt includes Character Intensity Dial (for Maestri)
- [ ] No content that violates SAFETY_GUIDELINES
- [ ] Crisis keywords handled appropriately
- [ ] Jailbreak-resistant (test with common attempts)

### Accessibility
- [ ] Works with all 7 DSA profiles
- [ ] REDUCED mode for autism profile verified
- [ ] Voice-friendly responses (no complex symbols)

### Voice/Character
- [ ] Greeting sounds authentic
- [ ] Knowledge base facts are verified
- [ ] Voice patterns match historical/fictional source
- [ ] FULL mode is engaging, REDUCED mode is clear

### Technical
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Character appears in UI list
- [ ] Voice works (if applicable)

### Testing
- [ ] Test conversation with each DSA profile
- [ ] Test Character Intensity Dial transitions
- [ ] Test knowledge base accuracy
- [ ] Test bilingual switching (for language teachers)

---

## Character Intensity Dial Explained

The dial balances **character authenticity** with **pedagogical effectiveness**.

```
FULL (100%)          REDUCED (70%)          OVERRIDE (30%)
    │                     │                      │
    ▼                     ▼                      ▼
┌────────────┐      ┌────────────┐        ┌────────────┐
│ Greetings  │      │ Complex    │        │ Student    │
│ Anecdotes  │      │ concepts   │        │ stuck 3x   │
│ Motivation │      │ Confusion  │        │ Crisis     │
│ Light chat │      │ Autism     │        │ Safety     │
└────────────┘      └────────────┘        └────────────┘
```

### Why It Matters
- **Socrate** who "never answers" frustrates struggling students
- **Shakespeare** in full archaic English confuses learners
- **Omero** in epic style overwhelms ADHD students

The dial lets characters be authentic WHEN APPROPRIATE and helpful WHEN NEEDED.

---

## Bilingual Pattern (Language Teachers)

For teachers of foreign languages:

| Language | Explanation | Practice Examples |
|----------|-------------|-------------------|
| Italian | Clear Italian | Target language quotes |

### Example: Shakespeare
```
"Il present perfect si usa per azioni passate con effetti presenti.

'I have studied all night' - Nota come 'have' + past participle
crea questa connessione tra passato e presente.

Try saying: 'I have learned this today!'"
```

---

## Quick Reference

| File | Purpose |
|------|---------|
| `src/data/maestri/types.ts` | MaestroFull interface |
| `src/data/maestri/index.ts` | ALL_MAESTRI array |
| `src/data/maestri/maestri-ids-map.ts` | ID_MAP lookup |
| `docs/adr/0031-*.md` | Knowledge Base ADR |
| `docs/adr/0004-*.md` | Safety Guardrails ADR |
| `docs/adr/0032-*.md` | E2E Test Framework ADR |

## Example Implementation

See Mascetti for a complete Amico example:
- Character: `src/data/maestri/mascetti.ts`
- Knowledge: `src/data/maestri/amici-miei-knowledge.ts`

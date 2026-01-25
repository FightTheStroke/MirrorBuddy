# Formality Rules System

**ADR 0064: Formal/Informal Address for Professors**

Comprehensive formality system for all 5 languages in MirrorBuddy.

## Overview

MirrorBuddy uses appropriate formal or informal address based on:
- **Character type** (maestro/coach/buddy)
- **Historical era** (pre-1900 = formal, modern = informal)
- **Language** (each language has specific formal/informal pronouns)

## Language-Specific Formality

| Language | Formal Pronoun | Informal Pronoun | Notes |
|----------|---------------|------------------|-------|
| Italian (it) | Lei | tu | Classic Italian formal address |
| French (fr) | Vous | tu | French vouvoiement/tutoiement |
| German (de) | Sie | du | German Sie/du distinction |
| Spanish (es) | Usted | tú | Spanish formal/informal |
| English (en) | Formal tone | Casual tone | Tone-based (no pronoun change) |

## Character Formality Classification

### Historical Maestri (FORMAL)

These characters use formal address (Lei/Sie/Vous/Usted) across ALL languages:

- **manzoni** - 19th century Italian literary giant
- **shakespeare** - Elizabethan playwright
- **galileo** - Renaissance scientist
- **darwin** - Victorian era naturalist
- **curie** - Victorian/Edwardian era scientist
- **leonardo** - Renaissance polymath
- **euclide** - Ancient Greek mathematician
- **socrate** - Ancient Greek philosopher
- **cicerone** - Roman orator and statesman
- **erodoto** - Ancient Greek historian
- **mozart** - Classical composer (formal court environment)
- **smith** - 18th century economist
- **humboldt** - 19th century explorer/naturalist
- **ippocrate** - Ancient Greek physician
- **lovelace** - Victorian era mathematician
- **cassese** - Distinguished international jurist
- **omero** - Ancient Greek epic poet

### Modern Maestri (INFORMAL)

These characters use informal address (tu/du/tu/tú) across ALL languages:

- **feynman** - 20th century physicist
- **chris** - Modern PE teacher
- **simone** - Modern sports expert
- **alex-pina** - Contemporary Spanish teacher

### Coaches (ALWAYS INFORMAL)

All coaches use informal address regardless of their persona:
- melissa, roberto, chiara, andrea, favij, laura

### Buddies (ALWAYS INFORMAL)

All buddies use informal address:
- mario, noemi, enea, bruno, sofia, marta

## Usage

### Check Character Formality

```typescript
import { isFormalCharacter } from "@/lib/i18n/formality-rules";

// Check if character uses formal address
const isFormal = isFormalCharacter("manzoni", "maestro"); // true
const isInformal = isFormalCharacter("feynman", "maestro"); // false

// Coaches always informal
isFormalCharacter("any-coach", "coach"); // false

// Buddies always informal
isFormalCharacter("any-buddy", "buddy"); // false
```

### Get System Prompt Section

```typescript
import { getFormalitySection } from "@/lib/i18n/formality-rules";

// Get appropriate formality section for system prompt
const section = getFormalitySection(
  "galileo",    // characterId
  "maestro",    // characterType
  "it"          // language
);
// Returns FORMAL_ADDRESS_SECTIONS.it with Lei instructions

const informalSection = getFormalitySection(
  "feynman",
  "maestro",
  "fr"
);
// Returns INFORMAL_ADDRESS_SECTIONS.fr with tu instructions
```

### Get Language-Specific Terms

```typescript
import { getFormalityTerms, getExamplePhrases } from "@/lib/i18n/formality-rules";

// Get formality terms for a language
const italianTerms = getFormalityTerms("it");
console.log(italianTerms.formal.pronoun);    // "Lei"
console.log(italianTerms.informal.pronoun);  // "tu"

// Get example phrases
const formalExamples = getExamplePhrases("it", true);
// ["Come posso esserLe utile?", "Lei cosa ne pensa?", ...]

const informalExamples = getExamplePhrases("it", false);
// ["Come ti posso aiutare?", "Tu cosa ne pensi?", ...]
```

## System Prompt Integration

The formality sections are designed to be injected into character system prompts:

```typescript
const systemPrompt = `
You are Galileo Galilei, Renaissance scientist...

${getFormalitySection("galileo", "maestro", userLanguage)}

## TEACHING APPROACH
...
`;
```

### Formal Section Structure (Example: Italian)

```
## REGISTRO FORMALE (Lei) - ADR 0064
IMPORTANTE: Come personaggio storico rispettabile, usi il registro FORMALE con lo studente.

**Il tuo modo di rivolgerti allo studente**:
- Usa "Lei" NON "tu": "Come posso esserLe utile?", "Lei cosa ne pensa?"
- Usa forme verbali formali: "Mi dica", "Prego, continui"
- Titoli di cortesia quando appropriato

**Cosa ti aspetti dallo studente**:
- Accetta sia "Lei" che "tu" dallo studente (sono giovani, possono non saperlo)
- Se lo studente usa "tu", NON correggerlo bruscamente
- Puoi occasionalmente ricordare gentilmente: "Si ricordi che ai miei tempi ci si dava del Lei..."

**Esempi di frasi formali**:
- "Buongiorno! Come posso esserLe utile oggi?"
- "Interessante osservazione. Mi permetta di spiegarLe..."
- "Lei ha ragione a porsi questa domanda."
- "Si concentri su questo passaggio..."

**NON**:
- NON usare "tu" o forme informali
- NON essere freddo o distaccato - formale ma accogliente
- NON essere rigido - la formalità è rispettosa, non intimidatoria
```

### Informal Section Structure (Example: Italian)

```
## REGISTRO INFORMALE (Tu)
Sei un personaggio moderno e accessibile. Usi il "tu" con lo studente.

**Il tuo modo di rivolgerti allo studente**:
- Usa "tu" in modo naturale: "Come ti posso aiutare?", "Tu cosa ne pensi?"
- Mantieni un tono amichevole ma rispettoso del tuo ruolo
- Puoi usare espressioni colloquiali appropriate all'età dello studente

**Esempi**:
- "Ciao! Come posso aiutarti oggi?"
- "Interessante! Dimmi di più..."
- "Hai ragione a farti questa domanda."
```

## Formality Terms Reference

### Italian (it)

**Formal (Lei)**:
- "Come posso esserLe utile?"
- "Lei cosa ne pensa?"
- "Mi permetta di spiegarLe..."
- "Lei ha ragione a porsi questa domanda."

**Informal (tu)**:
- "Come ti posso aiutare?"
- "Tu cosa ne pensi?"
- "Dimmi di più..."
- "Hai ragione a farti questa domanda."

### French (fr)

**Formal (Vous)**:
- "Comment puis-je vous aider?"
- "Que pensez-vous?"
- "Permettez-moi de vous expliquer..."
- "Vous avez raison de poser cette question."

**Informal (tu)**:
- "Comment puis-je t'aider?"
- "Qu'en penses-tu?"
- "Dis-moi plus..."
- "Tu as raison de te poser cette question."

### German (de)

**Formal (Sie)**:
- "Wie kann ich Ihnen helfen?"
- "Was denken Sie?"
- "Erlauben Sie mir zu erklären..."
- "Sie haben recht, diese Frage zu stellen."

**Informal (du)**:
- "Wie kann ich dir helfen?"
- "Was denkst du?"
- "Sag mir mehr..."
- "Du hast recht, diese Frage zu stellen."

### Spanish (es)

**Formal (Usted)**:
- "¿Cómo puedo servirle?"
- "¿Qué piensa usted?"
- "Permítame explicarle..."
- "Usted tiene razón al hacer esta pregunta."

**Informal (tú)**:
- "¿Cómo te puedo ayudar?"
- "¿Qué piensas?"
- "Dime más..."
- "Tienes razón al hacer esta pregunta."

### English (en)

**Formal tone**:
- "How may I assist you?"
- "What are your thoughts?"
- "Allow me to explain..."
- "You are quite right to ask this question."

**Casual tone**:
- "How can I help you?"
- "What do you think?"
- "Tell me more..."
- "You're right to ask that."

## Implementation Files

| File | Purpose |
|------|---------|
| `src/lib/i18n/formality-rules.ts` | Main module with all formality logic |
| `src/lib/i18n/__tests__/formality-rules.test.ts` | Comprehensive tests (35 tests) |
| `src/lib/greeting/templates/index.ts` | Greeting templates using formality |
| `src/lib/safety/formality-templates.ts` | Legacy Italian-only (deprecated) |

## Adding New Languages

When adding a new language:

1. Add to `SupportedLanguage` type in `@/app/api/chat/types`
2. Add entry to `FORMALITY_TERMS` with pronouns and examples
3. Add formal section to `FORMAL_ADDRESS_SECTIONS`
4. Add informal section to `INFORMAL_ADDRESS_SECTIONS`
5. Run tests: `npm run test:unit -- formality-rules`
6. Run typecheck: `npm run typecheck`

## Adding New Characters

When adding a new maestro:

1. **Historical figure (pre-1900)**: Add to `FORMAL_PROFESSORS` array
2. **Modern figure**: Add to `INFORMAL_PROFESSORS` array (or leave implicit)
3. **Coach or Buddy**: No action needed (always informal by type)
4. Run tests to verify: `npm run test:unit -- formality-rules`

## Design Principles

1. **Respect historical context**: Historical figures use formal address as they would have in their time
2. **Modern accessibility**: Contemporary characters are approachable and informal
3. **Student-friendly**: Formal characters accept informal address from students (they're young)
4. **Culturally appropriate**: Each language uses its natural formal/informal distinction
5. **Type-based override**: Coaches and buddies are ALWAYS informal regardless of persona

## Related Documentation

- **ADR 0064**: Formal/Informal Address for Professors (rationale)
- **Greeting System**: `src/lib/greeting/` (uses formality rules)
- **Character Data**: `src/data/maestri/`, `src/data/support-teachers/`, `src/data/buddy-profiles/`

## Testing

Run comprehensive formality tests:

```bash
npm run test:unit -- formality-rules
```

Test coverage includes:
- Character classification (formal/informal)
- All 5 languages (it/fr/de/es/en)
- System prompt sections
- Utility functions
- Cross-language consistency
- Edge cases (case sensitivity, suffixes, type overrides)

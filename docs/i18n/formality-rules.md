# Formality Rules for Translators - MirrorBuddy

## Overview

MirrorBuddy characters use **formal** or **informal** address based on their historical era and persona. This distinction is critical for authentic translation.

**ADR 0064**: Formal/Informal Address for Professors

## Language-Specific Forms

| Language    | Formal      | Informal    | Examples                                                    |
| ----------- | ----------- | ----------- | ----------------------------------------------------------- |
| **Italian** | Lei         | tu          | "Come posso esserLe utile?" vs "Come posso aiutarti?"       |
| **German**  | Sie         | du          | "Wie kann ich Ihnen helfen?" vs "Wie kann ich dir helfen?"  |
| **French**  | Vous        | tu          | "Comment puis-je vous aider?" vs "Comment puis-je t'aider?" |
| **Spanish** | Usted       | tú          | "¿En qué puedo servirle?" vs "¿Cómo puedo ayudarte?"        |
| **English** | Formal tone | Casual tone | "May I assist you?" vs "How can I help you?"                |

## Formality Rules by Character Type

### Formal Professors (Lei/Sie/Vous)

Use formal address. Historical context: **pre-1900 era or distinguished scholars**.

**17 Formal Professors:**

- **Ancient/Classical**: Euclide, Ippocrate, Erodoto, Socrate, Omero, Cicerone
- **Renaissance**: Leonardo, Galileo
- **18th century**: Smith
- **19th century**: Manzoni, Darwin, Humboldt, Curie, Lovelace
- **Elizabethan**: Shakespeare
- **Classical music**: Mozart
- **Modern scholar**: Cassese

### Informal Professors (tu/du/tú)

Use informal/casual address. Modern, accessible personas.

**4 Informal Professors:**

- Feynman (20th-century physicist, known for casual style)
- Chris (Sports/PE coach)
- Simone (Sports coach)
- Alex Pina (Contemporary TV creator)

### Always Informal

- **Coaches** (6): Melissa, Roberto, Chiara, Andrea, Favij, Laura → "tu"
- **Buddies** (6): Mario, Noemi, Enea, Bruno, Sofia, Marta → "tu"
- **Amici** (Non-teaching): Mascetti → "tu"

## Formal Greeting Templates

```typescript
// Italian (Lei)
"Buongiorno! Sono {name}. Come posso esserLe utile oggi?";

// German (Sie)
"Guten Tag! Ich bin {name}. Wie kann ich Ihnen heute helfen?";

// French (Vous)
"Bonjour! Je suis {name}. Comment puis-je vous aider aujourd'hui?";

// Spanish (Usted)
"¡Buenos días! Soy {name}. ¿En qué puedo servirle hoy?";

// English
"Good day! I am {name}. How may I assist you today?";
```

## Informal Greeting Templates

```typescript
// Italian (tu)
"Ciao! Sono {name}. Come posso aiutarti oggi?";

// German (du)
"Hallo! Ich bin {name}. Wie kann ich dir heute helfen?";

// French (tu)
"Bonjour! Je suis {name}. Comment puis-je t'aider aujourd'hui?";

// Spanish (tú)
"¡Hola! Soy {name}. ¿Cómo puedo ayudarte hoy?";
```

## System Prompt Injections

### For Formal Professors

Injected section FORMAL_ADDRESS_SECTION includes:

- Instruction to use Lei/Sie/Vous consistently
- Acceptable to receive "tu" from students (without harsh correction)
- Gentle reminders only: "Si ricordi che ai miei tempi ci si dava del Lei..."
- Formal but welcoming tone (not cold/distant)

### For Informal Professors

Injected section INFORMAL_ADDRESS_SECTION includes:

- Use "tu" naturally
- Maintain friendly but professional tone
- Colloquial language appropriate to character

## Adding New Formal Professor

1. Update `src/lib/greeting/templates/index.ts`:

```typescript
export const FORMAL_PROFESSORS = [
  "manzoni",
  // ... existing professors ...
  "newprofessor", // ADD HERE
] as const;
```

2. Create greetings in target language with Lei/Sie/Vous

3. Update `isFormalProfessor()` - no code change needed (automatic)

4. Add to formality test in `src/lib/greeting/__tests__/formality.test.ts`

5. Verify: `npm run test:unit -- formality`

## Translation Checklist

- [ ] Identify character era (pre-1900 = formal)
- [ ] Check FORMAL_PROFESSORS list
- [ ] Apply correct register (Lei/Sie/Vous or tu/du/tú)
- [ ] Verify verb conjugations match register
- [ ] Test in context with system prompt injection
- [ ] Run formality tests: `npm run test:unit -- formality`

## Examples

**Formal (Manzoni in Italian):**

> "Buongiorno! Sono Alessandro Manzoni. Come posso esserLe utile oggi? Lei desidererebbe discutere della letteratura italiana?"

**Informal (Feynman in Italian):**

> "Ciao! Sono Richard Feynman. Come posso aiutarti oggi? Che cosa vorresti imparare sulla fisica?"

## References

- **ADR 0064**: docs/adr/0064-formal-informal-professor-address.md
- **Safety Injection**: src/lib/safety/formality-templates.ts
- **Detection Logic**: src/lib/greeting/templates/index.ts
- **Tests**: src/lib/greeting/**tests**/formality.test.ts

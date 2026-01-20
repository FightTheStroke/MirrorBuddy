# ADR 0064: Formal/Informal Address for Professors

**Status**: Accepted
**Date**: 2026-01-20
**Decision Makers**: Roberto (Product Owner)

## Context

MirrorBuddy's AI tutors represent historical figures from different eras. Italian language (and other Romance languages) distinguish between formal address (Lei/Sie/Vous) and informal address (tu/du/tú). This distinction is culturally significant and affects:

1. **Authenticity**: A 19th-century Italian literary figure like Manzoni would naturally use "Lei"
2. **Educational value**: Students learn appropriate register through interaction
3. **Character consistency**: Modern sports coaches should feel approachable with "tu"

## Decision

We implement automatic formality detection based on character classification:

### Formal Professors (Lei/Sie/Vous)

These characters use formal address based on their historical context:

| Professor   | Rationale                            |
| ----------- | ------------------------------------ |
| Manzoni     | 19th century Italian literary figure |
| Shakespeare | Elizabethan era playwright           |
| Erodoto     | Ancient Greek historian              |
| Cicerone    | Roman orator and statesman           |
| Socrate     | Ancient Greek philosopher            |
| Mozart      | Classical composer (formal court)    |
| Galileo     | Renaissance scientist                |
| Darwin      | Victorian era naturalist             |
| Curie       | Victorian/Edwardian scientist        |
| Leonardo    | Renaissance polymath                 |
| Euclide     | Ancient Greek mathematician          |
| Smith       | 18th century economist               |
| Humboldt    | 19th century explorer                |
| Ippocrate   | Ancient Greek physician              |
| Lovelace    | Victorian mathematician              |
| Cassese     | Distinguished international jurist   |
| Omero       | Ancient Greek epic poet              |

### Informal Professors (tu/du/tú)

These characters use informal address for accessibility:

| Professor | Rationale                               |
| --------- | --------------------------------------- |
| Feynman   | Modern physicist known for casual style |
| Chris     | Sports/PE coach                         |
| Simone    | Sports coach                            |
| Alex Pina | Contemporary TV creator                 |

### Always Informal

- **Coaches**: All 6 learning coaches (Melissa, Roberto, etc.) use "tu"
- **Buddies**: All 6 peer buddies (Mario, Noemi, etc.) use "tu"
- **Amici**: Non-teaching characters (Mascetti) use "tu"

## Implementation

### Greeting Templates

```typescript
// Formal greeting (Lei)
"Buongiorno! Sono {name}. Come posso esserLe utile oggi?";

// Informal greeting (tu)
"Ciao! Sono {name}. Come posso aiutarti oggi?";
```

### System Prompt Injection

The `injectSafetyGuardrails()` function in `safety-prompts-core.ts` automatically:

1. Detects formality based on `characterId`
2. Injects appropriate register section (REGISTRO FORMALE or REGISTRO INFORMALE)
3. Provides examples and behavioral guidelines

### Detection Logic

```typescript
// In src/lib/greeting/templates/index.ts
export const FORMAL_PROFESSORS = [
  "manzoni",
  "shakespeare",
  "erodoto",
  "cicerone",
  "socrate",
  "mozart",
  "galileo",
  "darwin",
  "curie",
  "leonardo",
  "euclide",
  "smith",
  "humboldt",
  "ippocrate",
  "lovelace",
  "cassese",
  "omero",
] as const;

export function isFormalProfessor(characterId: string): boolean {
  const normalized = characterId.toLowerCase().split("-")[0];
  return FORMAL_PROFESSORS.some(
    (p) => normalized.includes(p) || p.includes(normalized),
  );
}
```

## Behavioral Guidelines for Formal Professors

From the system prompt injection:

1. **Use Lei consistently**: "Come posso esserLe utile?", "Lei cosa ne pensa?"
2. **Accept student's tu gracefully**: Students may not know formal address
3. **Gentle reminders only**: "Si ricordi che ai miei tempi ci si dava del Lei..."
4. **Warm formality**: Formal but welcoming, not cold or intimidating

## Consequences

### Positive

- More authentic character representation
- Cultural and linguistic educational value
- Consistent experience across languages (Lei/Sie/Vous)
- Clear behavioral guidelines for AI

### Negative

- Increased complexity in character system
- Potential confusion for younger students unfamiliar with formal address

### Mitigations

- Professors accept "tu" from students without correction
- Gentle educational moments about register

## Compliance

This feature:

- **No PII collection**: Only uses character ID, not student data
- **Safety guardrails intact**: Additive feature, doesn't bypass safety
- **WCAG compliant**: Text-only change, no accessibility impact
- **GDPR compliant**: No personal data processing changes

## Files Changed

- `src/lib/greeting/templates/index.ts` - FORMAL_GREETINGS, FORMAL_PROFESSORS, isFormalProfessor()
- `src/lib/safety/safety-prompts-core.ts` - characterId in SafetyInjectionOptions, formality injection
- `src/lib/safety/formality-templates.ts` - FORMAL_ADDRESS_SECTION, INFORMAL_ADDRESS_SECTION
- `src/lib/ai/character-router/convenience.ts` - Pass characterId to safety injection
- `src/app/api/chat/context-builders.ts` - Pass characterId to safety injection
- `src/app/api/chat/stream/helpers.ts` - Pass characterId to safety injection

## Related ADRs

- ADR 0004: Safety Guardrails
- ADR 0031: Embedded Knowledge Base for Character Maestri

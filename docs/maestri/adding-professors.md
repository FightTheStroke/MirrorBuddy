# Adding New Professors - i18n & Language Support

MirrorBuddy supports standard, language-specific, and bilingual professors with automatic i18n handling.

## Step-by-Step Process

### 1. Create Knowledge File

`src/data/maestri/{name}-knowledge.ts` (max 200 lines)

- Subject expertise, teaching methodology, curriculum topics
- Examples and resources
- Safety guidelines and accessibility adaptations

### 2. Create Maestro Profile

`src/data/maestri/{name}.ts`

```typescript
import { generateMaestroGreeting } from "@/lib/greeting";
import { {NAME_UPPER}_KNOWLEDGE } from "./{name}-knowledge";

export const {name}: MaestroFull = {
  id: "{name}-{subject}",           // e.g., "moliere-francese"
  name: "{name}-{subject}",
  displayName: "{Display Name}",
  subject: "{subject}",              // e.g., "french"
  tools: [...],                      // Task, Quiz, Flashcards, etc.
  systemPrompt: `...${{{NAME_UPPER}_KNOWLEDGE}}\n...`,
  avatar: "/maestri/{name}.webp",    // 512x512 WebP
  color: "#hexcolor",
  greeting: "Fallback Italian greeting",
  getGreeting: (ctx) => generateMaestroGreeting("{name}", "{Display Name}", ctx.language),
};
```

### 3. Export in Index

`src/data/maestri/index.ts` - add to `getAllMaestri()` and `getMaestroById()`

### 4. Add Formality Rules (Historical Figures)

`src/lib/greeting/templates/index.ts` - add to `FORMAL_PROFESSORS` for pre-1900 figures:

```typescript
export const FORMAL_PROFESSORS = [
  // ... existing ...
  "moliere", // 17th century = formal Lei/Sie/Vous
] as const;
```

### 5. Avatar

Create: `public/maestri/{name}.webp`

- Format: WebP (512x512px)
- License: Original, CC-BY-SA, or AI-generated (disclose source)

## Language-Specific Example: Molière (French)

**Use case:** One-language professor

Add to `FORMAL_GREETINGS` in `src/lib/greeting/templates/index.ts`:

```typescript
export const FORMAL_GREETINGS: Record<SupportedLanguage, string> = {
  fr: "Bonjour! Je suis {name}. Comment puis-je vous aider aujourd'hui?",
  // ...
};
```

System prompt: _"You are Molière, 17th-century French playwright. Teach French through classical theater..."_

## Bilingual Example: Goethe (German & Italian)

**Use case:** Language teacher or multilingual support

1. Add to `BILINGUAL_GREETINGS` in templates:

```typescript
export const BILINGUAL_GREETINGS: Record<
  string,
  Record<SupportedLanguage, string>
> = {
  goethe: {
    it: "Grüße! Sono Goethe. Parliamo insieme di tedesco?",
    en: "Greetings! I'm Goethe. Shall we explore German together?",
    es: "¡Saludos! Soy Goethe. ¿Hablamos de alemán juntos?",
    fr: "Greetings! Je suis Goethe. Parlons allemand ensemble?",
    de: "Grüße! Ich bin Goethe. Lernen wir zusammen Deutsch?",
  },
};
```

2. Add to `LANGUAGE_TEACHERS` in `src/lib/greeting/greeting-generator.ts`:

```typescript
const LANGUAGE_TEACHERS = ["shakespeare", "alex-pina", "goethe"] as const;
```

3. System prompt: _"Teach German through literature and philosophy. Maintain German as primary, use Italian for clarity."_

## Formality Reference

| Era       | Register | Examples                                             |
| --------- | -------- | ---------------------------------------------------- |
| Pre-1800  | Lei/Sie  | Molière, Goethe, Cervantes, Euclide, Socrate, Mozart |
| 1800-1900 | Lei/Sie  | Darwin, Curie, Manzoni, Lovelace, Cassese            |
| Post-1950 | tu/du    | Feynman, Alex Pina, Chris, Simone                    |

**Auto-detection:** `isFormalProfessor()` in `src/lib/greeting/greeting-generator.ts` checks character ID against `FORMAL_PROFESSORS`.

## Verification Checklist

- [ ] Knowledge file: `{name}-knowledge.ts` (≤200 lines)
- [ ] Maestro profile: `{name}.ts` with `getGreeting()`
- [ ] Exported in `index.ts`
- [ ] Greeting templates added to `templates/index.ts`
- [ ] Formality rules updated (if historical)
- [ ] Avatar: WebP, 512x512px
- [ ] System prompt includes CHARACTER INTENSITY DIAL
- [ ] Tests pass: `npm run test:unit && npm run typecheck`

## Reference Implementations

**Standard + Language Teacher:**

- **Shakespeare** (English, formal, bilingual greetings)
- **Alex Pina** (Spanish, informal, bilingual greetings)

**Non-Teaching Amico:**

- **Mascetti** (100% character, excludeFromGamification: true)

## Testing

```bash
npm run test:unit -- greeting    # Verify greeting generator
npm run typecheck                # Type safety
npm run lint && npm run build    # Full verification
```

## References

- **ADR 0064:** `docs/adr/0064-formal-informal-professor-address.md`
- **ADR 0031:** Embedded Knowledge Base for Maestri
- **Formality Rules:** `docs/i18n/formality-rules.md`
- **Greeting Generator:** `src/lib/greeting/greeting-generator.ts`

# Greeting System - I18n Structure

This module provides locale-aware greeting templates for all characters (maestri, coaches, buddies) in MirrorBuddy.

## Architecture

The greeting system supports two modes:

1. **Generic mode** (default): Uses formal/informal templates with name placeholders
2. **Personalized mode** (optional): Uses character-specific greetings with cultural context

## Files

```
src/lib/greeting/
├── index.ts                  # Public API
├── greeting-generator.ts      # Main greeting logic
├── templates/
│   └── index.ts              # Legacy templates (still used)
├── i18n-templates.ts         # NEW: I18n-aware template system
└── __tests__/
    ├── formality.test.ts     # ADR 0064 formal/informal tests
    └── i18n-templates.test.ts # I18n template tests
```

## Usage

### Basic Usage (Generic Mode)

```typescript
import { generateMaestroGreeting } from "@/lib/greeting";

// Respects formal/informal address (ADR 0064)
const greeting = generateMaestroGreeting(
  "euclide-matematica",
  "Euclide",
  "it", // language
);
// Output: "Ciao! Sono Euclide. Come posso aiutarti oggi?"

// Formal professors use formal address
const formalGreeting = generateMaestroGreeting(
  "manzoni-italiano",
  "Alessandro Manzoni",
  "it",
);
// Output: "Buongiorno! Sono Alessandro Manzoni. Come posso esserLe utile oggi?"
```

### Personalized Mode (Future Enhancement)

```typescript
import { generateMaestroGreeting } from "@/lib/greeting";

// Enable personalized greetings
const greeting = generateMaestroGreeting(
  "euclide-matematica",
  "Euclide",
  "it",
  undefined, // fallback
  true, // usePersonalized
);
// Output: "Χαῖρε! Sono Euclide. Costruiamo insieme le basi della matematica?"
```

### Coach Greetings

```typescript
import { generateCoachGreeting } from "@/lib/greeting";

const greeting = generateCoachGreeting("Melissa", "it");
// Output: "Ciao! Sono Melissa. Come posso aiutarti a imparare qualcosa di nuovo oggi?"
```

## I18n Template Structure

Templates are organized by language in `MAESTRI_GREETING_TEMPLATES`:

```typescript
{
  it: {
    generic: "Ciao! Sono {name}. Come posso aiutarti oggi?",
    formal: "Buongiorno! Sono {name}. Come posso esserLe utile oggi?",
    coach: "Ciao! Sono {name}. Come posso aiutarti a imparare qualcosa di nuovo oggi?",
    maestri: {
      euclide: "Χαῖρε! Sono Euclide. Costruiamo insieme le basi della matematica?",
      shakespeare: "Good morrow! Sono Shakespeare. Parliamo insieme di inglese?",
      // ... 22 maestri total
    }
  },
  en: { /* ... */ },
  es: { /* ... */ },
  fr: { /* ... */ },
  de: { /* ... */ }
}
```

## Supported Languages

- `it` - Italian (default)
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German

## Formal/Informal Distinction (ADR 0064)

The system automatically applies formal address (Lei/Sie/Vous) for historical professors:

**Formal professors**: Manzoni, Shakespeare, Galileo, Darwin, Curie, Leonardo, Euclide, Mozart, Socrate, Cicerone, Erodoto, Smith, Humboldt, Ippocrate, Lovelace, Cassese, Omero

**Informal professors**: Feynman, Chris, Simone, Alex Pina

See `src/lib/greeting/templates/index.ts` for the complete `FORMAL_PROFESSORS` list.

## API Reference

### `generateMaestroGreeting()`

```typescript
function generateMaestroGreeting(
  characterId: string,
  displayName: string,
  language: SupportedLanguage,
  fallbackGreeting?: string,
  usePersonalized?: boolean,
): string;
```

**Parameters:**

- `characterId` - Maestro ID (e.g., "euclide-matematica")
- `displayName` - Human-readable name (e.g., "Euclide")
- `language` - User's preferred language
- `fallbackGreeting` - Optional fallback if no template found
- `usePersonalized` - Use personalized greetings (default: false)

### `getMaestroGreetingTemplate()`

```typescript
function getMaestroGreetingTemplate(
  maestroKey: string,
  language: SupportedLanguage,
  isFormal?: boolean,
  usePersonalized?: boolean,
): string;
```

**Parameters:**

- `maestroKey` - Normalized key (e.g., "euclide")
- `language` - User's preferred language
- `isFormal` - Use formal address (default: false)
- `usePersonalized` - Use personalized template (default: false)

### `normalizeMaestroKey()`

```typescript
function normalizeMaestroKey(maestroId: string): string;
```

Extracts the maestro key from a full ID:

- `"euclide-matematica"` → `"euclide"`
- `"shakespeare-inglese"` → `"shakespeare"`

## Adding New Languages

To add a new language (e.g., Portuguese `pt`):

1. Add to `SupportedLanguage` type in `src/app/api/chat/types.ts`
2. Add language entry to `MAESTRI_GREETING_TEMPLATES` in `i18n-templates.ts`:

```typescript
export const MAESTRI_GREETING_TEMPLATES: Record<SupportedLanguage, ...> = {
  // ... existing languages
  pt: {
    generic: "Olá! Sou {name}. Como posso te ajudar hoje?",
    formal: "Bom dia! Sou {name}. Como posso lhe ajudar hoje?",
    coach: "Olá! Sou {name}. Como posso te ajudar a aprender algo novo hoje?",
    maestri: {
      euclide: "Χαῖρε! Sou Euclides. Vamos construir as bases da matemática juntos?",
      // ... all 22 maestri
    }
  }
}
```

3. Add tests for the new language in `__tests__/i18n-templates.test.ts`

## Adding New Maestri

To add a new maestro greeting:

1. Add entry to `maestri` object for each language in `MAESTRI_GREETING_TEMPLATES`
2. Add the maestro to the test in `i18n-templates.test.ts`:

```typescript
const expectedMaestri = [
  // ... existing maestri
  "newMaestro",
];
```

3. Verify formality setting in `src/lib/greeting/templates/index.ts` (`FORMAL_PROFESSORS` array)

## Migration Path

Currently, the system defaults to **generic mode** for backward compatibility with ADR 0064.

Future enhancement: Enable personalized mode globally once all maestri have culturally-appropriate personalized greetings in all 5 languages.

## Tests

```bash
# Run all greeting tests
npm run test:unit -- src/lib/greeting/__tests__/

# Run formality tests only
npm run test:unit -- src/lib/greeting/__tests__/formality.test.ts

# Run i18n template tests only
npm run test:unit -- src/lib/greeting/__tests__/i18n-templates.test.ts
```

## Related ADRs

- **ADR 0064**: Formal/Informal Professor Address
- **ADR 0031**: Embedded Knowledge Base for Character Maestri

## Future Enhancements

1. **Dynamic Personalization**: Use student profile data to customize greetings
2. **Time-based Greetings**: "Good morning" vs "Good evening" based on user timezone
3. **Context-aware Greetings**: Different greetings for first visit vs returning users
4. **Message File Integration**: Load templates from `messages/{locale}.json` instead of hardcoding

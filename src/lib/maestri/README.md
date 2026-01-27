# Maestri Locale Wrapper

Utilities for creating locale-aware systemPrompts for maestri.

## Overview

The locale wrapper adds language and formality instructions to maestro systemPrompts, ensuring they respond in the user's preferred language with appropriate formal/informal address.

## Usage

### Basic Usage

```typescript
import { getLocalizedSystemPrompt } from "@/lib/maestri";
import { getMaestroById } from "@/data/maestri";

// Get a maestro
const euclide = getMaestroById("euclide-matematica");

// Get localized systemPrompt for English
const englishPrompt = getLocalizedSystemPrompt(euclide, "en");

// Use in chat API
const chatRequest = {
  messages: [...],
  systemPrompt: englishPrompt,
  maestroId: euclide.id,
  language: "en",
};
```

### Checking Formality Level

```typescript
import { getMaestroFormalityLevel } from "@/lib/maestri";

// Historical professors use formal address
const euclideFormalityLevel = getMaestroFormalityLevel("euclide-matematica");
// Returns: "formal" (uses Lei/Sie/Vous/Usted)

// Modern professors use informal address
const feynmanFormalityLevel = getMaestroFormalityLevel("feynman-physics");
// Returns: "informal" (uses tu/du/tú)
```

### Language Validation

```typescript
import { isSupportedLanguage } from "@/lib/maestri";

if (isSupportedLanguage(userLanguage)) {
  const prompt = getLocalizedSystemPrompt(maestro, userLanguage);
} else {
  // Fallback to Italian
  const prompt = getLocalizedSystemPrompt(maestro, "it");
}
```

## Supported Languages

- `it` - Italian
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German

## How It Works

The wrapper prepends locale-specific instructions to the base systemPrompt:

```
## LOCALIZATION SETTINGS
LANGUAGE: ALWAYS respond in English.
REGISTER: Use FORMAL address with the student. You are a respected historical figure.

---

[Original systemPrompt content...]
```

### Formality Rules

**Formal professors** (historical figures):
- Use Lei (Italian), Sie (German), Vous (French), Usted (Spanish)
- Examples: Euclide, Galileo, Socrate, Mozart, Darwin, Curie

**Informal professors** (modern characters):
- Use tu (Italian/French), du (German), tú (Spanish)
- Examples: Feynman, Chris, Alex Pina

See `src/lib/greeting/templates/index.ts` for the full list of formal professors.

## Integration Points

### Chat API

Update `/api/chat/route.ts` to use locale-aware prompts:

```typescript
import { getLocalizedSystemPrompt } from "@/lib/maestri";

const { language = "it" } = await request.json();
const maestro = getMaestroById(maestroId);
const systemPrompt = getLocalizedSystemPrompt(maestro, language);
```

### Conversation Service

Update conversation creation to store language preference:

```typescript
const conversation = await prisma.conversation.create({
  data: {
    userId,
    maestroId,
    language, // Store user's language preference
  },
});
```

## Testing

Run tests:

```bash
npm run test:unit -- src/lib/maestri/__tests__/locale-wrapper.test.ts
```

## Type Safety

All functions are fully typed with TypeScript:

- `getLocalizedSystemPrompt(maestro: MaestroFull, locale: SupportedLanguage): string`
- `getMaestroFormalityLevel(maestroId: string): "formal" | "informal"`
- `isSupportedLanguage(lang: string): lang is SupportedLanguage`

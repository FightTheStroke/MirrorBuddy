# Tool Localization Guide

This document explains how to use the localized tool configurations in MirrorBuddy.

## Overview

All tool names and descriptions have been extracted from `tool-configs.ts` into the i18n system. This allows tools to display their labels and descriptions in the user's preferred language (Italian, English, French, German, or Spanish).

## Available Tools and Translations

### Categories
- **upload**: Caricamento / Upload / Téléchargement / Hochladen / Cargar
- **create**: Creazione / Create / Création / Erstellen / Crear
- **search**: Ricerca / Search / Recherche / Suchen / Buscar

### Tools (15 total)

**Upload Tools:**
- `pdf` - Upload PDF
- `webcam` - Take Photo
- `homework` - Homework Help
- `studyKit` - Study Kit

**Create Tools:**
- `mindmap` - Mind Map
- `quiz` - Quiz
- `flashcard` - Flashcards
- `demo` - Interactive Demo
- `summary` - Summary
- `diagram` - Diagram
- `timeline` - Timeline
- `formula` - Formula
- `chart` - Chart
- `typing` - Learn to Type

**Search Tools:**
- `search` - Web Search

## Usage Patterns

### Server Components (Recommended)

For server components, use the async helper functions:

```typescript
import { getToolLabel, getToolDescription, getToolConfig } from '@/lib/tools/tool-i18n';
import type { Locale } from '@/i18n/config';

export async function ToolCard({ locale }: { locale: Locale }) {
  // Get individual fields
  const label = await getToolLabel('mindmap', locale);
  const description = await getToolDescription('mindmap', locale);

  // Or get both at once
  const config = await getToolConfig('mindmap', locale);

  return (
    <div>
      <h3>{config.label}</h3>
      <p>{config.description}</p>
    </div>
  );
}
```

### Accessing Category Labels

```typescript
import { getToolCategory } from '@/lib/tools/tool-i18n';

const categoryLabel = await getToolCategory('create', locale);
// Returns: "Creazione" (it), "Create" (en), "Création" (fr), etc.
```

### Direct Translation Access

For more complex scenarios, use `next-intl` directly:

```typescript
import { getTranslations } from 'next-intl/server';

const t = await getTranslations({ locale, namespace: 'tools' });

// Access any tool translation
const pdfLabel = t('pdf.label');
const pdfDesc = t('pdf.description');

// Access categories
const uploadCategory = t('categories.upload');
```

### Client Components (Future)

The `useToolTranslations` hook is provided for future client-side usage. It will be implemented when tool components are converted to client components:

```typescript
// Coming soon
import { useToolTranslations } from '@/lib/tools/tool-i18n';

function MyClientComponent() {
  const { getLabel, getDescription } = useToolTranslations();

  const label = getLabel('mindmap');
  const description = getDescription('mindmap');

  return <div>{label}: {description}</div>;
}
```

## Translation Files

All translations are stored in:
- `/src/i18n/messages/it.json` (Italian - default)
- `/src/i18n/messages/en.json` (English)
- `/src/i18n/messages/fr.json` (French)
- `/src/i18n/messages/de.json` (German)
- `/src/i18n/messages/es.json` (Spanish)

Each file contains a `tools` namespace with the structure:

```json
{
  "tools": {
    "categories": {
      "upload": "...",
      "create": "...",
      "search": "..."
    },
    "pdf": {
      "label": "...",
      "description": "..."
    },
    // ... other tools
  }
}
```

## Type Safety

All tool types are strongly typed via TypeScript:

```typescript
type TranslatableToolType =
  | 'pdf'
  | 'webcam'
  | 'homework'
  | 'studyKit'
  | 'mindmap'
  | 'quiz'
  | 'flashcard'
  | 'demo'
  | 'summary'
  | 'diagram'
  | 'timeline'
  | 'formula'
  | 'chart'
  | 'typing'
  | 'search';

type ToolCategory = 'upload' | 'create' | 'search';
```

The `Messages` interface in `/src/i18n/types.ts` ensures type safety for all translation keys.

## Migration from tool-configs.ts

**Before:**
```typescript
import { UPLOAD_TOOLS } from '@/lib/tools/tool-configs';

const pdfTool = UPLOAD_TOOLS.pdf;
console.log(pdfTool.label); // "Carica PDF" (hardcoded Italian)
```

**After:**
```typescript
import { getToolLabel } from '@/lib/tools/tool-i18n';

const label = await getToolLabel('pdf', locale);
console.log(label); // Language-aware: "Upload PDF" (en), "Carica PDF" (it), etc.
```

## Total String Count

- **Categories**: 3 strings
- **Tools**: 15 tools × 2 fields (label + description) = 30 strings
- **Languages**: 5 (it, en, fr, de, es)
- **Total translations**: 33 keys × 5 languages = **165 total strings**

## Adding New Tools

When adding a new tool:

1. Add translations to all 5 language files under `tools` namespace
2. Update the `TranslatableToolType` type in `tool-i18n.ts`
3. Update the `Messages['tools']` interface in `/src/i18n/types.ts`
4. Run `npm run typecheck` to ensure type safety

## Related Files

- `/src/lib/tools/tool-configs.ts` - Original tool configuration (now source of truth for structure)
- `/src/lib/tools/tool-i18n.ts` - Localization helper functions
- `/src/i18n/types.ts` - TypeScript type definitions
- `/src/i18n/messages/*.json` - Translation files

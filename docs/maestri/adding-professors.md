# Adding New Professors with Language-Specific or Bilingual Support

Complete guide to creating new maestri (professors) for MirrorBuddy with full i18n support, language-specific pedagogy, and multilingual functionality.

## Overview

MirrorBuddy supports two types of professors:

| Type        | Purpose                 | Tools | XP  | Character               | Examples                                          |
| ----------- | ----------------------- | ----- | --- | ----------------------- | ------------------------------------------------- |
| **Maestro** | Teaching subject matter | Yes   | Yes | Variable intensity dial | Euclide (math), Molière (French), Goethe (German) |
| **Amico**   | Companion/non-teaching  | No    | No  | 100% full character     | Mascetti (supercazzola)                           |

**Language-specific maestri** are standard Maestri with subject = language (e.g., "french", "german", "spanish") and complete pedagogy for language learners.

---

## Step 1: Plan Your Professor

### Basic Information

| Field                 | Description                                | Example                          |
| --------------------- | ------------------------------------------ | -------------------------------- |
| **Display Name**      | Human-readable (used in UI, greetings)     | "Molière"                        |
| **File ID**           | Lowercase with subject: `{name}-{subject}` | "moliere-french"                 |
| **Historical Era**    | Birth-death years (determines formality)   | 1622-1673                        |
| **Subject**           | Domain of expertise                        | "french", "german", "spanish"    |
| **Color Theme**       | Hex color for UI cards                     | "#D946EF"                        |
| **Voice Profile**     | Azure TTS voice ID                         | "echo", "nova", "onyx"           |
| **Supported Locales** | Regions where available                    | FR, BE, CH (Romand), CA (Quebec) |

### Language-Specific Planning (For Language Teachers)

**Teaching Specialties** (for documentation):

- Grammar approach (theatrical, literature-based, philosophical, etc.)
- Pronunciation guides (IPA, accent, challenging sounds)
- Vocabulary curriculum (thematic or literature-based)
- Cultural context (history, society, regional variations)
- Learning metaphor (adventure, theater, wisdom, etc.)

**Voice Personality**:

- Tone (warm, reflective, dramatic, measured, etc.)
- Pattern (pauses, intonation, key phrases)
- Accessibility profile (dyslexia, ADHD, autism, motor, etc.)

**Example - Molière (French)**:

- Grammar: Through theatrical context and comedic situations
- Pronunciation: Nasal vowels, French 'r', silent letters
- Tone: Warm, theatrical, witty, engaging
- Key phrases: "Ah, mon ami!", "C'est une belle observation!"
- Accessibility: Audio-first learning, phonetic spelling, visual vocab

---

## Step 2: Create Knowledge Base

**File**: `src/data/maestri/{name}-knowledge.ts`

**Max 250 lines** (enforced by hook). Use **sourced curriculum**, not invented.

### Knowledge Structure

```typescript
export const MOLIERE_KNOWLEDGE = `
## French Language Curriculum

### Grammar Foundations
- Present tense conjugations (être, avoir, -er verbs)
- Object pronouns (me, te, lui, nous, vous, leur)
- Negation (ne...pas, ne...jamais, ne...rien)

### Pronunciation Guide
- Nasal vowels: on, an, in, un (similar to 🎤 pronunciation guide)
- French 'r': Guttural, from back of throat
- Silent letters: Final consonants rarely pronounced
- Liaison: Linking sounds between words (les amis)

### Vocabulary by Theme
- Theater terminology: scène, acte, rôle, réplique
- Social situations: salutations, politesse, émotions
- Everyday objects: maison, voiture, nourriture

### Cultural Context
- French theater tradition (17th century salons)
- Molière's comedies: L'Avare, Le Misanthrope, Les Femmes Savantes
- French society: courtiers, bourgeoisie, servants

### Pedagogical Approach
- Learn through comedy and theatrical scenes
- Mistakes are "part of performing" (reduces shame)
- Emphasis on communication over perfection
- Cultural insights woven into grammar lessons
`;
```

**Quality Checklist**:

- [ ] Curriculum verified from 2+ sources (not AI-generated)
- [ ] Grammar rules are accurate
- [ ] Pronunciation guides use phonetic descriptions
- [ ] Cultural content is factually correct
- [ ] Pedagogy aligns with maestro's character (theater, wisdom, etc.)
- [ ] File under 250 lines

---

## Step 3: Create Maestro File

**File**: `src/data/maestri/{name}.ts`

**Must include `getGreeting()` for locale-aware greetings** (ADR 0064).

### Full Template

```typescript
import type { MaestroFull } from "./types";
import { MOLIERE_KNOWLEDGE } from "./moliere-knowledge";
import { generateMaestroGreeting } from "@/lib/greeting";

export const moliere: MaestroFull = {
  // Identity
  id: "moliere-french",
  name: "moliere-french",
  displayName: "Molière",
  subject: "french",

  // Tools available for this maestro
  tools: [
    "quiz",
    "flashcards",
    "mindmap",
    "pdf",
    "webcam",
    "summary",
    "formula",
  ],

  // System prompt (full instructions + embedded knowledge)
  systemPrompt: `Sei Jean-Baptiste Poquelin, meglio noto come Molière, il grande dramatico francese (1622-1673).

## Character
You are Molière, master of French comedy and social observation. You teach French language and culture through theatrical context, using humor and drama as pedagogical tools. You view language learning as an art form, not a mechanical task.

## Teaching Philosophy
- Communicate over perfection: "Mistakes are part of the performance!"
- Use theatrical metaphors: scenes, roles, dramatic pauses
- Emphasize social situations where French is actually used
- Celebrate cultural context: French theater, salons, society
- Create a safe space for experimentation (actors must fail to improve)

## Character Intensity Dial
- FULL: Greetings, anecdotes, theatrical expressions, humor
- REDUCED: When student is confused 2+ times, reduce character intensity, prioritize clarity
- OVERRIDE: If student stuck on same concept 3+ times, drop character entirely, teach directly

## Knowledge Base
${MOLIERE_KNOWLEDGE}

## Safety & Ethics
- Age-appropriate content always (no mature themes)
- No stereotyping of French culture or people
- Celebrate regional variations (Quebec French, Belgian French, etc.)
- Encourage pride in language learning (not shame for mistakes)

## Accessibility Adaptations
- Dyslexia: Phonetic spelling guide, clear letter spacing
- ADHD: Short lessons, interactive games, rewards
- Autism: Explicit grammar rules, predictable lesson structure
- Visual Impairment: Audio-first learning, TTS enabled
- Motor Impairment: Keyboard navigation for all tools
`,

  // Visual presentation
  avatar: "/maestri/moliere.png",
  color: "#D946EF",

  // Static greeting (fallback if dynamic fails)
  greeting:
    "Buongiorno! Sono Molière, il grande maestro del teatro francese. Oggi insegnerò a voi l'arte della lingua francese.",

  // Dynamic greeting respecting user locale (REQUIRED for language maestri)
  getGreeting: (ctx) =>
    generateMaestroGreeting("moliere", "Molière", ctx.language),
};
```

### Key Requirements for Language Maestri

1. **Subject** must be language name: "french", "german", "spanish", etc.
2. **`getGreeting()`** must be implemented:
   ```typescript
   getGreeting: (ctx) =>
     generateMaestroGreeting("moliere", "Molière", ctx.language),
   ```
3. **System prompt** includes full teaching philosophy, character intensity dial, accessibility notes
4. **Tools** include language-specific: quiz, flashcards, mindmap (+ optional: pdf, webcam, summary, formula)

---

## Step 4: Define Formality Rules (ADR 0064)

**If maestro is historical (pre-1900)**: Add to `FORMAL_PROFESSORS` for formal address (Lei, Sie, Vous).

**File**: `src/lib/greeting/templates/index.ts`

```typescript
// Historical professors use formal address (Lei, Sie, Vous)
export const FORMAL_PROFESSORS = new Set([
  "moliere", // 1622-1673
  "goethe", // 1749-1832
  "cervantes", // 1547-1616
  // ... other historical figures
]);

// Modern professors use informal (tu, du, tú)
// (No action needed - defaults to informal)
```

**If adding modern professor** (e.g., born 1950+): No action needed, defaults to informal address.

---

## Step 5: Add Avatar Image

**File**: `public/maestri/{name}.png` (or .webp for optimized)

**Requirements**:

- Square format (1:1 aspect ratio)
- 256x256 px minimum (will be scaled by UI)
- PNG or WebP format (WebP preferred for performance)
- Transparent background recommended
- Professional, recognizable character representation

**Guidelines**:

- Style should match existing maestri (consistent art direction)
- Include character-identifying features (Molière's period costume, Goethe's philosophical expression, etc.)
- Test readability at small sizes (48x48 px in UI)

---

## Step 6: Register Maestro

### File 1: `src/data/maestri/index.ts`

**Add import**:

```typescript
import { moliere } from "./moliere";
```

**Add to exports**:

```typescript
export const MAESTRI: Record<string, MaestroFull> = {
  // ... existing maestri
  "moliere-french": moliere,
};
```

**Add to subject mapping** (if new subject):

```typescript
export const SUBJECT_NAMES: Record<string, string> = {
  // ... existing
  french: "Francese",
  german: "Tedesco",
  spanish: "Spagnolo",
};
```

### File 2: Export Functions

```typescript
export function getMaestroById(id: string): MaestroFull | undefined {
  return MAESTRI[id];
}

export function getAllMaestri(): MaestroFull[] {
  return Object.values(MAESTRI);
}

export function getMaestriBySubject(subject: string): MaestroFull[] {
  return Object.values(MAESTRI).filter((m) => m.subject === subject);
}

export function getAllSubjects(): string[] {
  return [...new Set(Object.values(MAESTRI).map((m) => m.subject))];
}
```

---

## Step 7: Configure Voice Profile

**For language maestri**: Use Azure TTS voices that match character accent/tone.

**File**: `src/lib/voice/voice-profiles.ts`

```typescript
export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  // ... existing
  moliere: {
    voiceId: "echo", // Azure TTS voice
    accent: "French",
    tone: "theatrical, warm, expressive",
    pattern:
      "Expressive pauses for emphasis; rising intonation for questions; playful cadence",
    instructions: `You are Molière teaching French.
      - Use theatrical expressions
      - Emphasize pronunciation of nasal vowels
      - Tell anecdotes about French theater
      - Use pause and dramatic timing in speech`,
  },
};
```

**Azure TTS Voice Mapping** (for non-Italian languages):

| Voice     | Accent                  | Use For             |
| --------- | ----------------------- | ------------------- |
| `echo`    | Refined, expressive     | French (Molière)    |
| `nova`    | Warm, enthusiastic      | Spanish (Cervantes) |
| `onyx`    | Distinguished, measured | German (Goethe)     |
| `sage`    | Thoughtful, balanced    | Science/philosophy  |
| `shimmer` | Clear, bright           | Math/logic          |

---

## Step 8: Configure Locale Mapping

**File**: Prisma schema (LocaleConfig model) or admin configuration

**For language maestri**, configure:

```typescript
{
  locale: "fr",          // France, Belgium, Switzerland, Canada
  countryCode: "FR",
  primaryLanguage: "french",
  primaryMaestro: "moliere-french",  // Molière teaches French
  secondaryMaestri: ["leonardo", "darwin"],  // Optional
  voiceLocale: "fr-FR",  // For TTS
}
```

**Supported Locales per Maestro**:

- **Molière (French)**: France (FR), Belgium Wallonia (BE), Switzerland Romand (CH), Canada Quebec (CA)
- **Goethe (German)**: Germany (DE), Austria (AT), Switzerland German (CH), Liechtenstein (LI)
- **Cervantes (Spanish)**: Spain Castilian (ES), Mexico (MX), Argentina (AR), Colombia (CO), Chile (CL), Peru (PE)

---

## Step 9: Add Unit Tests

**File**: `src/data/__tests__/maestri.test.ts`

```typescript
import {
  getMaestroById,
  getAllMaestri,
  getMaestriBySubject,
} from "@/data/maestri";

describe("Molière Maestro", () => {
  it("should be registered and retrievable", () => {
    const moliere = getMaestroById("moliere-french");
    expect(moliere).toBeDefined();
    expect(moliere?.displayName).toBe("Molière");
  });

  it("should have dynamic greeting via getGreeting()", () => {
    const moliere = getMaestroById("moliere-french");
    const greeting = moliere?.getGreeting?.({ language: "it" });
    expect(greeting).toBeTruthy();
    expect(greeting?.length).toBeGreaterThan(0);
  });

  it("should be available by subject 'french'", () => {
    const french = getMaestriBySubject("french");
    expect(french).toContainEqual(
      expect.objectContaining({ subject: "french" }),
    );
  });

  it("should be in formal professors set (pre-1900)", () => {
    // Molière (1622-1673) should use formal address
    const { FORMAL_PROFESSORS } = require("@/lib/greeting/templates");
    expect(FORMAL_PROFESSORS).toContain("moliere");
  });

  it("should have voice profile configured", () => {
    const { VOICE_PROFILES } = require("@/lib/voice/voice-profiles");
    expect(VOICE_PROFILES["moliere"]).toBeDefined();
    expect(VOICE_PROFILES["moliere"].voiceId).toBe("echo");
  });
});
```

**Run tests**:

```bash
npm run test:unit -- maestri.test.ts
npm run typecheck
```

---

## Step 10: Create E2E Tests

**File**: `e2e/maestri-language.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Language Maestri - Molière (French)", () => {
  test("should display in French locale", async ({ page }) => {
    await page.goto("/fr/chat");
    const selector = page.getByText("Molière");
    await expect(selector).toBeVisible();
  });

  test("should have dynamic greeting in French", async ({ page }) => {
    await page.goto("/fr/chat");
    // Select Molière from maestri list
    await page.click('[data-maestro-id="moliere-french"]');
    const greeting = page.getByText(/Molière|Francese|français/i);
    await expect(greeting).toBeVisible();
  });

  test("should use formal address (Lei) in Italian locale", async ({
    page,
  }) => {
    await page.goto("/it/chat");
    // System prompt should use formal address
    // (Verify through API or UI element)
    const content = await page.content();
    expect(content).toContain("Lei");
  });

  test("should have avatar loading", async ({ page }) => {
    await page.goto("/fr/chat");
    const avatar = page.locator('img[alt*="Molière"]');
    await expect(avatar).toHaveAttribute("src", /moliere/);
  });
});
```

**Run tests**:

```bash
npm run test -- e2e/maestri-language.spec.ts --headed
```

---

## Step 11: Verify & Document

**Pre-commit checklist**:

```bash
# TypeScript & ESLint
npm run typecheck && npm run lint

# Unit tests
npm run test:unit -- maestri.test.ts

# Build (catches any registration issues)
npm run build

# E2E (requires app running)
npm run test -- e2e/maestri-language.spec.ts
```

**Documentation**:

- [ ] Add maestro to `docs/maestri/language-maestri.md` (section per maestro)
- [ ] Add voice profile to `docs/voice/PROFILES.md`
- [ ] Update `CHANGELOG.md` with "New maestro: Molière"
- [ ] Add to project README: "Supported languages section"

---

## Special Cases: Bilingual Maestri

**For maestri supporting 2+ languages simultaneously**:

```typescript
export const cosmopolitan: MaestroFull = {
  id: "cosmopolitan-polyglot",
  displayName: "Cosmopolitan Scholar",
  subject: "polyglot", // Special subject type

  // Support multiple languages in greeting
  getGreeting: (ctx) => {
    // Return greeting in user's locale
    return generateMaestroGreeting(
      "cosmopolitan",
      "Cosmopolitan",
      ctx.language,
    );
  },

  // System prompt mentions bilingual approach
  systemPrompt: `You teach multiple languages: Italian, English, French...

  Each student chooses 2 languages to learn together.
  Use comparative approach: contrast grammar, cultural concepts...
  `,
};
```

**Locale configuration** (multiple entries):

```typescript
[
  {
    locale: "it",
    primaryMaestro: "cosmopolitan-polyglot",
    bilingual: true,
    languagePair: ["it", "en"], // Italian ↔ English
  },
  {
    locale: "fr",
    primaryMaestro: "cosmopolitan-polyglot",
    bilingual: true,
    languagePair: ["fr", "en"], // French ↔ English
  },
];
```

---

## Testing Checklist (Before Merge)

- [ ] Unit tests pass: `npm run test:unit`
- [ ] TypeScript passes: `npm run typecheck`
- [ ] Linter passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] E2E tests pass in all 5 locales: `/it/`, `/en/`, `/fr/`, `/de/`, `/es/`
- [ ] Avatar image displays correctly (multiple sizes)
- [ ] Dynamic greeting works in all languages (no fallback)
- [ ] Formal/informal address rules respected (ADR 0064)
- [ ] Voice profile is configured and consistent
- [ ] No console errors in browser
- [ ] Accessible: keyboard navigation, TTS working

---

## Reference Documents

- **ADR 0031**: Embedded Knowledge Base for Character Maestri
- **ADR 0064**: Formal vs Informal Address Rules Per Language
- **ADR 0066**: i18n Multi-Language Architecture
- **`.claude/rules/maestri.md`**: Maestri system overview
- **`.claude/rules/i18n-development.md`**: i18n feature development workflow
- **`docs/maestri/language-maestri.md`**: Specific language maestri (Molière, Goethe, Cervantes)

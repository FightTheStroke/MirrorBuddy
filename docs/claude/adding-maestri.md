# Adding Maestri

> 7-step process for creating new subject matter experts

## Quick Reference

| Key           | Value                                               |
| ------------- | --------------------------------------------------- |
| Types         | Maestro (teaching + XP) or Amico (companion, no XP) |
| Path          | `src/data/maestri/`                                 |
| Knowledge Max | 200 lines per knowledge file                        |
| ADR           | 0031 (character intensity), 0064 (formality)        |

## Two Character Types

| Type        | Purpose        | Tools | Teaching | XP  | Character Immersion       |
| ----------- | -------------- | ----- | -------- | --- | ------------------------- |
| **Maestro** | Subject expert | Yes   | Yes      | Yes | Variable (intensity dial) |
| **Amico**   | Companion      | No    | No       | No  | 100% always               |

## 7-Step Process

**1. Knowledge File** (`src/data/maestri/{name}-knowledge.ts`, max 200 lines)

```typescript
export const MOLIERE_KNOWLEDGE = `## French Language Curriculum...`;
```

**2. Maestro File** (`src/data/maestri/{name}.ts`) - MUST include `getGreeting()`

```typescript
export const moliere: MaestroFull = {
  id: "moliere-french",
  displayName: "Molière",
  subject: "french",
  tools: ["quiz", "flashcards", "mindmap", "pdf"],
  systemPrompt: `${MOLIERE_KNOWLEDGE}...`,
  getGreeting: (ctx) =>
    generateMaestroGreeting("moliere", "Molière", ctx.language),
};
```

**3. Index** (`src/data/maestri/index.ts`)

```typescript
import { moliere } from "./moliere";
export const maestri: MaestroFull[] = [..., moliere];
```

**4. Subject Mapping** (if new)

```typescript
export const SUBJECT_NAMES: Record<string, string> = { french: "Francese" };
```

**5. Formality** (`src/lib/greeting/templates/index.ts`) - If pre-1900, add to `FORMAL_PROFESSORS`

**6. Avatar** (`public/maestri/{name}.webp`) - Square 256x256px min

**7. Test** `npm run test:unit -- maestri.test.ts && npm run typecheck && npm run build`

## Character Intensity Dial (ADR 0031)

| Mode        | When                             | Behavior                         |
| ----------- | -------------------------------- | -------------------------------- |
| FULL (100%) | Greetings, anecdotes, motivation | Authentic character voice        |
| REDUCED     | Student confused, autism profile | Clarity priority, less character |
| OVERRIDE    | Stuck 3+ times, crisis           | Direct help, drop character      |

## See Also

- `docs/maestri/adding-professors.md` - Detailed guide
- `.claude/rules/maestri.md` - Maestri overview
- ADR 0031 - Embedded Knowledge Base
- ADR 0064 - Formal vs Informal Address

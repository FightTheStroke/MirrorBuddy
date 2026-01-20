# Maestri Rules - MirrorBuddy

## 22 AI Maestros (20 Maestri + 2 Amici)

Educational AI tutors with embedded knowledge in `src/data/maestri/`:

| Maestro     | Subject            | Type      | Knowledge File             |
| ----------- | ------------------ | --------- | -------------------------- |
| Leonardo    | Art                | Maestro   | `leonardo-knowledge.ts`    |
| Galileo     | Physics/Astronomy  | Maestro   | `galileo-knowledge.ts`     |
| Curie       | Chemistry          | Maestro   | `curie-knowledge.ts`       |
| Cicerone    | Civic Education    | Maestro   | `cicerone-knowledge.ts`    |
| Lovelace    | Computer Science   | Maestro   | `lovelace-knowledge.ts`    |
| Smith       | Economics          | Maestro   | `smith-knowledge.ts`       |
| Shakespeare | English            | Maestro   | `shakespeare-knowledge.ts` |
| Humboldt    | Geography          | Maestro   | `humboldt-knowledge.ts`    |
| Erodoto     | History            | Maestro   | `erodoto-knowledge.ts`     |
| Manzoni     | Italian            | Maestro   | `manzoni-knowledge.ts`     |
| Euclide     | Mathematics        | Maestro   | `euclide-knowledge.ts`     |
| Mozart      | Music              | Maestro   | `mozart-knowledge.ts`      |
| Socrate     | Philosophy         | Maestro   | `socrate-knowledge.ts`     |
| Ippocrate   | Health             | Maestro   | `ippocrate-knowledge.ts`   |
| Feynman     | Physics            | Maestro   | `feynman-knowledge.ts`     |
| Darwin      | Biology            | Maestro   | `darwin-knowledge.ts`      |
| Chris       | Physical Education | Maestro   | `chris-knowledge.ts`       |
| Omero       | Storytelling       | Maestro   | `omero-knowledge.ts`       |
| Alex Pina   | Spanish            | Maestro   | `alex-pina-knowledge.ts`   |
| Simone      | Sport              | Maestro   | `simone-knowledge.ts`      |
| Cassese     | International Law  | Maestro   | `cassese-knowledge.ts`     |
| Mascetti    | Supercazzola       | **Amico** | `amici-miei-knowledge.ts`  |

## Two Character Types

| Type        | Tools | Teaching | XP                              | Character Immersion |
| ----------- | ----- | -------- | ------------------------------- | ------------------- |
| **Maestro** | Yes   | Yes      | Earns XP                        | Variable (dial)     |
| **Amico**   | None  | No       | `excludeFromGamification: true` | 100% always         |

## Data Structure

```typescript
// src/data/maestri/types.ts
interface MaestroFull {
  id: string; // e.g., "euclide-matematica"
  name: string; // filename-based identifier
  displayName: string; // Human readable, e.g., "Euclide"
  subject: string; // e.g., "mathematics", "history"
  tools: string[]; // Available tools for this maestro
  systemPrompt: string; // Full prompt including embedded knowledge
  avatar: string; // `/maestri/${id}.png`
  color: string; // Subject-based color
  greeting: string; // Static fallback greeting
  getGreeting?: (ctx: GreetingContext) => string; // Dynamic language-aware greeting (ADR 0064)
  excludeFromGamification?: boolean; // true for Amici
}
```

## Formal vs Informal Address (ADR 0064)

Professors use formal (Lei) or informal (tu) based on historical era:

| Register          | Professors                                                                                                                                                | Era                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **Formal (Lei)**  | Manzoni, Shakespeare, Galileo, Darwin, Curie, Leonardo, Euclide, Mozart, Socrate, Cicerone, Erodoto, Smith, Humboldt, Ippocrate, Lovelace, Cassese, Omero | Pre-20th century    |
| **Informal (tu)** | Feynman, Chris, Simone, Alex Pina                                                                                                                         | Modern/Contemporary |

When adding a new maestro:

- **Historical figure (pre-1900)**: Add to `FORMAL_PROFESSORS` in `src/lib/greeting/templates/index.ts`
- **Modern figure**: No action needed (defaults to informal)

## Usage Pattern

```typescript
import {
  getMaestroById,
  getAllMaestri,
  getMaestriBySubject,
  getAllSubjects,
  SUBJECT_NAMES,
} from "@/data/maestri";

// Get single maestro
const maestro = getMaestroById("galileo");

// Get all maestri
const all = getAllMaestri();

// Get by subject
const physicists = getMaestriBySubject("physics");

// Get all subjects
const subjects = getAllSubjects();

// Subject display name
const name = SUBJECT_NAMES["mathematics"]; // "Matematica"
```

## Adding New Maestro

1. **Create knowledge file**: `src/data/maestri/{name}-knowledge.ts`
   - Use template: `cp templates/knowledge-template.ts {name}-knowledge.ts`
   - Max 200 lines, verified sources only
2. **Create maestro file**: `src/data/maestri/{name}.ts`
   - Include `getGreeting()` for dynamic language-aware greeting
3. **Export from index**: Add to `src/data/maestri/index.ts`
4. **Add avatar**: `public/maestri/{name}.png`
5. **Add subject mapping**: If new subject, add to `SUBJECT_NAMES`
6. **Set formality (ADR 0064)**:
   - Historical figure → Add to `FORMAL_PROFESSORS` in `src/lib/greeting/templates/index.ts`
   - Modern figure → No action (defaults to informal)
7. **Run tests**: `npm run test:unit -- formality && npm run test`

### Maestro Example (Teaching)

```typescript
// src/data/maestri/newton.ts
import type { MaestroFull } from "./types";
import { NEWTON_KNOWLEDGE } from "./newton-knowledge";
import { generateMaestroGreeting } from "@/lib/greeting";

export const newton: MaestroFull = {
  id: "newton-physics",
  name: "newton-physics",
  displayName: "Isaac Newton",
  subject: "physics",
  tools: ["quiz", "flashcards", "mindmap"],
  systemPrompt: `Sei Isaac Newton...

## CHARACTER INTENSITY DIAL
[When to be fully in character vs reduce for clarity]

## KNOWLEDGE BASE
${NEWTON_KNOWLEDGE}

## TEACHING APPROACH
[Subject-specific pedagogy]`,
  avatar: "/maestri/newton.png",
  color: "#4B5563",
  greeting: "Buongiorno! Sono Isaac Newton...", // Fallback
  getGreeting: (ctx) =>
    generateMaestroGreeting("newton", "Isaac Newton", ctx.language),
};

// IMPORTANT: Newton is historical (17th century) → Add to FORMAL_PROFESSORS
// in src/lib/greeting/templates/index.ts for Lei address
```

### Amico Example (Non-Teaching)

```typescript
// src/data/maestri/character.ts
export const character: MaestroFull = {
  id: "character-topic",
  name: "character-topic",
  displayName: "Character Name",
  subject: "topic",
  tools: [], // NO tools
  excludeFromGamification: true, // NO XP
  systemPrompt: `...`,
  avatar: "/maestri/character.png",
  color: "#722F37",
  greeting: "...",
};
```

## Character Intensity Dial (ADR 0031)

Maestri adjust character intensity based on context:

| Mode               | When                                        | Behavior                |
| ------------------ | ------------------------------------------- | ----------------------- |
| **Full Character** | Greetings, anecdotes, motivation            | 100% authentic voice    |
| **Reduced**        | Complex concepts, confusion, autism profile | Clarity priority        |
| **Override**       | Student stuck 3+ times, crisis              | Direct help immediately |

## Safety Guidelines

- Combined: `import { SAFETY_GUIDELINES } from './safety-guidelines'`
- Modular: `SAFETY_GUIDELINES_CORE`, `SAFETY_GUIDELINES_TEACHING`

## Documentation

- Full reference: `docs/adr/0031-embedded-knowledge-base-for-character-maestri.md`
- Knowledge template: `src/data/maestri/templates/knowledge-template.ts`

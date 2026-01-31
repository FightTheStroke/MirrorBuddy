# Peer Buddies

> Horizontal relationship characters providing emotional support through shared experience

## Quick Reference

| Key          | Value                                  |
| ------------ | -------------------------------------- |
| Count        | 6 buddies                              |
| Path         | `src/data/buddy-profiles/`             |
| Role         | `peer_buddy`                           |
| Tools        | pdf, webcam, homework, formula, chart  |
| Formality    | Always informal (tu)                   |
| Gamification | **No** (excludeFromGamification: true) |
| Age          | Student age + 1 year                   |

## 6 Peer Buddies

| Name      | Gender | Age Offset | Voice   | Color   | Personality                                |
| --------- | ------ | ---------- | ------- | ------- | ------------------------------------------ |
| **Mario** | Male   | +1         | ash     | #10B981 | Default buddy, friendly, ironic, relatable |
| **Noemi** | Female | +1         | shimmer | #EC4899 | Default female, empathetic, supportive     |
| **Enea**  | Male   | +1         | onyx    | #3B82F6 | Alternative male, thoughtful               |
| **Bruno** | Male   | +1         | echo    | #F59E0B | Alternative male, energetic                |
| **Sofia** | Female | +1         | nova    | #8B5CF6 | Alternative female, creative               |
| **Marta** | Female | +1         | sage    | #EF4444 | Alternative female, practical              |

## Architecture

**MirrorBuddy Concept**: Same learning differences as student, one year older. Share struggles as PEER, not authority. Make student feel LESS ALONE.

**Support Triangle**: Maestri (subject experts) | Coaches (method experts) | Buddies (peer support)

## Key Files

| File                                        | Purpose                                          |
| ------------------------------------------- | ------------------------------------------------ |
| `src/data/buddy-profiles/buddy-profiles.ts` | Main exports, type definitions, getter functions |
| `src/data/buddy-profiles/mario.ts`          | Mario buddy definition (default male)            |
| `src/data/buddy-profiles/noemi.ts`          | Noemi buddy definition (default female)          |
| `src/data/buddy-profiles/shared.ts`         | Shared learning differences descriptions, tips   |
| `public/avatars/{name}.webp`                | Buddy avatar images                              |

## Code Patterns

### Basic Buddy Structure

```typescript
import type { BuddyProfile } from "@/types";
import { injectSafetyGuardrails } from "@/lib/safety/safety-prompts";

export const MARIO: BuddyProfile = {
  id: "mario",
  name: "Mario",
  gender: "male",
  ageOffset: 1,
  personality: "Amichevole, ironico, comprensivo, alla mano",
  role: "peer_buddy",
  voice: "ash",
  tools: ["pdf", "webcam", "homework", "formula", "chart"],
  getSystemPrompt: getMarioSystemPrompt, // Dynamic based on student
  getGreeting: getMarioGreeting,
  avatar: "/avatars/mario.webp",
  color: "#10B981",
};
```

### Dynamic Prompts & Access

```typescript
// Prompt generation (dynamic based on student profile)
function getMarioSystemPrompt(student: ExtendedStudentProfile): string {
  return injectSafetyGuardrails(prompt, {
    role: "buddy",
    includeAntiCheating: false,
  });
}

// Access buddies
const mario = getBuddyById("mario");
const allBuddies = getAllBuddies();
```

## See Also

- `.claude/rules/coaches-buddies.md` - Adding new buddies (8 locations)
- `@docs/claude/coaches.md` - Learning method coaches
- `@docs/claude/adding-maestri.md` - Subject matter maestri
- ADR 0064 - Formal vs Informal Address

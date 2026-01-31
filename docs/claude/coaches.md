# Learning Coaches

> Vertical relationship characters that develop student autonomy through metacognitive coaching

## Quick Reference

| Key          | Value                                 |
| ------------ | ------------------------------------- |
| Count        | 6 coaches                             |
| Path         | `src/data/support-teachers/`          |
| Role         | `learning_coach`                      |
| Tools        | pdf, webcam, homework, formula, chart |
| Formality    | Always informal (tu)                  |
| Gamification | Yes (earns XP)                        |
| ADR          | 0064 (formality)                      |

## 6 Learning Coaches

| Name        | Gender | Age | Voice   | Color   | Focus                                |
| ----------- | ------ | --- | ------- | ------- | ------------------------------------ |
| **Melissa** | Female | 27  | shimmer | #EC4899 | Default coach, method & organization |
| **Roberto** | Male   | 28  | ash     | #3B82F6 | Male option, autonomy building       |
| **Chiara**  | Female | 26  | shimmer | #F59E0B | Alternative female coach             |
| **Andrea**  | Male   | 29  | onyx    | #8B5CF6 | Alternative male coach               |
| **Favij**   | Male   | 25  | echo    | #10B981 | Gaming/tech-oriented approach        |
| **Laura**   | Female | 30  | nova    | #EF4444 | Experienced, maternal approach       |

## Architecture

**Support Triangle** - Three relationship types:

- **Maestri**: Subject experts (vertical, content-focused)
- **Coaches** (this): Method experts (vertical, autonomy-focused)
- **Buddies**: Peer support (horizontal, emotional support)

**Philosophy**: "Your success is when the student NO LONGER NEEDS YOU." Coaches develop metacognitive skills, study methods, and self-directed learning capabilities.

**Maieutic Method**: Coaches ask questions that lead students to find their own answers rather than providing direct solutions.

## Key Files

| File                                            | Purpose                                          |
| ----------------------------------------------- | ------------------------------------------------ |
| `src/data/support-teachers/support-teachers.ts` | Main exports, type definitions, getter functions |
| `src/data/support-teachers/melissa.ts`          | Melissa coach definition (default)               |
| `src/data/support-teachers/roberto.ts`          | Roberto coach definition (male default)          |
| `src/data/support-teachers/shared.ts`           | Common tools section, DOs/DONTs, professor table |
| `src/data/support-teachers/types.ts`            | TypeScript type definitions                      |
| `public/avatars/{name}.webp`                    | Coach avatar images                              |

## Code Patterns

### Basic Coach Structure

```typescript
import type { SupportTeacher } from "@/types";
import { injectSafetyGuardrails } from "@/lib/safety/safety-prompts";

export const MELISSA: SupportTeacher = {
  id: "melissa",
  name: "Melissa",
  gender: "female",
  age: 27,
  personality: "Giovane, intelligente, allegra, paziente, entusiasta",
  role: "learning_coach",
  voice: "shimmer",
  tools: ["pdf", "webcam", "homework", "formula", "chart"],
  systemPrompt: injectSafetyGuardrails(melissaCorePrompt, {
    role: "coach",
    additionalNotes: "Focus su metodo, organizzazione, autonomia.",
  }),
  getGreeting: (ctx: GreetingContext) =>
    generateCoachGreeting("Melissa", ctx.language),
  avatar: "/avatars/melissa.webp",
  color: "#EC4899",
};
```

### Accessing Coaches

```typescript
import {
  getSupportTeacherById,
  getAllSupportTeachers,
} from "@/data/support-teachers";

const melissa = getSupportTeacherById("melissa");
const allCoaches = getAllSupportTeachers();
```

## See Also

- `.claude/rules/coaches-buddies.md` - Adding new coaches (8 locations)
- `@docs/claude/buddies.md` - Peer support characters
- `@docs/claude/adding-maestri.md` - Subject matter maestri
- ADR 0064 - Formal vs Informal Address
